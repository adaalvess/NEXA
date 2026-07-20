import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ComercialModule } from '../src/modules/comercial/comercial.module';
import { STRIPE_CLIENT } from '../src/modules/comercial/stripe-client.provider';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * `FakeStripeClient` — mesma disciplina do `FakeAdapter` (Passo 15): zero
 * chamada de rede real, duck-type só da assinatura mínima usada
 * (`checkout.sessions.create`), nunca reexporta tipos do SDK Stripe fora
 * deste ficheiro de teste.
 */
class FakeStripeClient {
  chamadas: Array<Record<string, unknown>> = [];

  checkout = {
    sessions: {
      create: async (params: Record<string, unknown>) => {
        this.chamadas.push(params);
        return { id: 'cs_test_fake', url: 'https://checkout.stripe.com/fake-session' };
      },
    },
  };
}

/**
 * Stripe Checkout — `POST /subscricao/checkout` (Especificação Técnica do
 * Passo 21). `STRIPE_CLIENT` substituído por `FakeStripeClient`, mesma
 * disciplina do `AI_ADAPTER`/`FakeAdapter` (Passo 15) — zero dependência de
 * rede/credenciais reais.
 */
describe('Comercial — Stripe Checkout (Passo 21)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let fakeStripe: FakeStripeClient;
  let passwordHash: string;

  beforeAll(async () => {
    process.env.STRIPE_PRICE_ID_STARTER = 'price_test_starter';
    process.env.STRIPE_PRICE_ID_PROFESSIONAL = 'price_test_professional';
    process.env.WEB_APP_URL = 'http://localhost:3000';

    const argon2 = await import('argon2');
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    fakeStripe = new FakeStripeClient();
    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ComercialModule] })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(fakeStripe)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    delete process.env.STRIPE_PRICE_ID_STARTER;
    delete process.env.STRIPE_PRICE_ID_PROFESSIONAL;
    await adminClient.$disconnect();
    await app.close();
  });

  beforeEach(() => {
    fakeStripe.chamadas = [];
  });

  async function registarELogin(sufixo: string) {
    const email = `checkout-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Checkout ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string, empresaId: login.body.empresaId as string };
  }

  it('T1 — admin_empresa inicia checkout para Professional, sessão criada com metadata.empresaId correto', async () => {
    const { cookie, empresaId } = await registarELogin('t1');

    const res = await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'professional' }).expect(201);

    expect(res.body).toEqual({ url: 'https://checkout.stripe.com/fake-session' });
    expect(fakeStripe.chamadas).toHaveLength(1);
    expect(fakeStripe.chamadas[0].metadata).toEqual({ empresaId });

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — sessão criada com o Price ID correspondente ao plano escolhido', async () => {
    const { cookie, empresaId } = await registarELogin('t2');

    await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'professional' }).expect(201);

    expect(fakeStripe.chamadas[0].line_items).toEqual([{ price: 'price_test_professional', quantity: 1 }]);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — plano "enterprise" devolve 400', async () => {
    const { cookie, empresaId } = await registarELogin('t3');

    await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'enterprise' }).expect(400);

    expect(fakeStripe.chamadas).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — subscrição já "ativa" devolve 409, nenhuma sessão Stripe criada', async () => {
    const { cookie, empresaId } = await registarELogin('t4');
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { estado: 'ativa' } });

    await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'professional' }).expect(409);

    expect(fakeStripe.chamadas).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — gestor/colaborador/convidado recebem 403', async () => {
    const { empresaId } = await registarELogin('t5');

    for (const papel of [Papel.gestor, Papel.colaborador, Papel.convidado]) {
      const utilizador = await adminClient.utilizador.create({
        data: { empresaId, nome: papel, email: `${papel}-t5-${Date.now()}-${Math.random()}@teste.pt`, passwordHash, papel },
      });
      const login = await request(app.getHttpServer()).post('/auth/login').send({ email: utilizador.email, password: SENHA }).expect(200);
      await request(app.getHttpServer())
        .post('/subscricao/checkout')
        .set('Cookie', login.headers['set-cookie'][0])
        .send({ plano: 'professional' })
        .expect(403);
    }

    expect(fakeStripe.chamadas).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — stripeCustomerId já existente é reaproveitado, nunca undefined', async () => {
    const { cookie, empresaId } = await registarELogin('t6');
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { stripeCustomerId: 'cus_existente_123' } });

    await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'starter' }).expect(201);

    expect(fakeStripe.chamadas[0].customer).toBe('cus_existente_123');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — subscrição "limitada" (trial expirado) consegue iniciar checkout com sucesso — nunca a via de escape bloqueada', async () => {
    const { cookie, empresaId } = await registarELogin('t7');
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { estado: 'limitada' } });

    await request(app.getHttpServer()).post('/subscricao/checkout').set('Cookie', cookie).send({ plano: 'starter' }).expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ComercialModule } from '../src/modules/comercial/comercial.module';
import { IaModule } from '../src/modules/ia/ia.module';
import { AI_ADAPTER } from '../src/modules/ia/gateway/adapters/ai-adapter.interface';
import { FakeAdapter } from '../src/modules/ia/gateway/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

function anoMesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * `GET /subscricao` (Especificação Técnica do Passo 23, 3.2) — resumo de
 * subscrição para o ecrã de subscrição. Verifica que todos os valores
 * derivados (`usoIAPercentagem`, `avisoLimiteIAProximo`, `diasRestantesTrial`)
 * são calculados no backend, nunca deixados para o frontend calcular.
 */
describe('Comercial — GET /subscricao (Passo 23)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ComercialModule, IaModule] })
      .overrideProvider(AI_ADAPTER)
      .useValue(new FakeAdapter())
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await adminClient.$disconnect();
    await app.close();
  });

  async function registarELogin(sufixo: string) {
    const email = `subresumo-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `SubResumo ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string, empresaId: login.body.empresaId as string };
  }

  async function criarUtilizador(empresaId: string, papel: Papel, sufixo: string) {
    const utilizador = await adminClient.utilizador.create({
      data: { empresaId, nome: `${papel} ${sufixo}`, email: `${papel}-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`, passwordHash, papel },
    });
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: utilizador.email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string };
  }

  it('T1 — admin_empresa vê o resumo correto de uma subscrição em trial, com diasRestantesTrial calculado', async () => {
    const { cookie, empresaId } = await registarELogin('t1');

    const res = await request(app.getHttpServer()).get('/subscricao').set('Cookie', cookie).expect(200);

    expect(res.body.plano).toBe('professional');
    expect(res.body.estado).toBe('trial');
    expect(res.body.estadoEfetivo).toBe('trial');
    expect(res.body.limiteUsoIA).toBe(200);
    expect(res.body.usoIAMensalAtual).toBe(0);
    expect(res.body.usoIAPercentagem).toBe(0);
    expect(res.body.avisoLimiteIAProximo).toBe(false);
    expect(res.body.diasRestantesTrial).toBe(14);
    expect(res.body.stripeCustomerId).toBeUndefined();
    expect(res.body.stripeSubscriptionId).toBeUndefined();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — gestor/colaborador/convidado recebem 403 em GET /subscricao', async () => {
    const { empresaId } = await registarELogin('t2');

    for (const papel of [Papel.gestor, Papel.colaborador, Papel.convidado]) {
      const utilizador = await criarUtilizador(empresaId, papel, 't2');
      await request(app.getHttpServer()).get('/subscricao').set('Cookie', utilizador.cookie).expect(403);
    }

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — usoIAPercentagem/avisoLimiteIAProximo refletem o uso real (>=90% ativa o aviso)', async () => {
    const { cookie, empresaId } = await registarELogin('t3');
    await adminClient.subscricaoPlano.update({
      where: { empresaId },
      data: { estado: 'ativa', plano: 'starter', limiteUtilizadores: 5, limiteArmazenamentoMb: 1024, limiteUsoIA: 10 },
    });
    await adminClient.usoIAMensal.create({ data: { empresaId, anoMes: anoMesAtual(), contagem: 9 } });

    const res = await request(app.getHttpServer()).get('/subscricao').set('Cookie', cookie).expect(200);

    expect(res.body.usoIAMensalAtual).toBe(9);
    expect(res.body.usoIAPercentagem).toBe(90);
    expect(res.body.avisoLimiteIAProximo).toBe(true);
    expect(res.body.diasRestantesTrial).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — plano Enterprise (limiteUsoIA null) nunca aciona aviso, usoIAPercentagem é null', async () => {
    const { cookie, empresaId } = await registarELogin('t4');
    await adminClient.subscricaoPlano.update({
      where: { empresaId },
      data: { estado: 'ativa', plano: 'enterprise', limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null },
    });
    await adminClient.usoIAMensal.create({ data: { empresaId, anoMes: anoMesAtual(), contagem: 500 } });

    const res = await request(app.getHttpServer()).get('/subscricao').set('Cookie', cookie).expect(200);

    expect(res.body.limiteUsoIA).toBeNull();
    expect(res.body.usoIAMensalAtual).toBe(500);
    expect(res.body.usoIAPercentagem).toBeNull();
    expect(res.body.avisoLimiteIAProximo).toBe(false);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — trial expirado (>14 dias) devolve estadoEfetivo limitada com diasRestantesTrial null', async () => {
    const { cookie, empresaId } = await registarELogin('t5');
    const dataAntiga = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { trialIniciadoEm: dataAntiga } });

    const res = await request(app.getHttpServer()).get('/subscricao').set('Cookie', cookie).expect(200);

    expect(res.body.estado).toBe('trial');
    expect(res.body.estadoEfetivo).toBe('limitada');
    expect(res.body.diasRestantesTrial).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

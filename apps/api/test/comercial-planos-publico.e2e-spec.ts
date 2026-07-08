import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
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

/**
 * `GET /planos/publico` (Especificação Técnica do Passo 24, 3.1) — primeiro
 * endpoint sem sessão desde o webhook Stripe (Passo 22). Reaproveita
 * `listarPlanos()` literalmente — resposta tem de ser byte-idêntica à de
 * `GET /planos` (autenticado).
 */
describe('Comercial — GET /planos/publico (Passo 24)', () => {
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
    const email = `planospublico-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `PlanosPublico ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string, empresaId: login.body.empresaId as string };
  }

  it('T1 — GET /planos/publico sem cookie de sessão devolve os 3 planos com os limites aprovados', async () => {
    const res = await request(app.getHttpServer()).get('/planos/publico').expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ plano: 'starter', limiteUtilizadores: 5, limiteArmazenamentoMb: 1024, limiteUsoIA: 50 }),
        expect.objectContaining({ plano: 'professional', limiteUtilizadores: 20, limiteArmazenamentoMb: 10240, limiteUsoIA: 200 }),
        expect.objectContaining({ plano: 'enterprise', limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null }),
      ]),
    );
  });

  it('T2 — resposta de GET /planos/publico é byte-idêntica à de GET /planos (autenticado)', async () => {
    const { cookie, empresaId } = await registarELogin('t2');

    const autenticado = await request(app.getHttpServer()).get('/planos').set('Cookie', cookie).expect(200);
    const publico = await request(app.getHttpServer()).get('/planos/publico').expect(200);

    expect(JSON.stringify(publico.body)).toBe(JSON.stringify(autenticado.body));

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

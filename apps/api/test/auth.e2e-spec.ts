import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * POST /auth/logout — adicionado na validação da Sub-entrega 1 do Passo 14
 * (lacuna real do Passo 3: nunca existiu logout, só registo/login/eu).
 * Invalida a Sessao no servidor, nunca apenas o cookie no browser.
 */
describe('Auth — POST /auth/logout', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let empresaId: string;
  let cookieAdmin: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule] }).compile();
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

  beforeEach(async () => {
    const email = `logout-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'Logout Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA } })
      .expect(201);

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    cookieAdmin = login.headers['set-cookie'][0];
    empresaId = login.body.empresaId;
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T1 — logout invalida a Sessao na BD (não apenas o cookie)', async () => {
    const sessaoId = cookieAdmin.split(';')[0].split('=')[1];
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookieAdmin).expect(200);

    const sessao = await adminClient.sessao.findUnique({ where: { id: sessaoId } });
    expect(sessao).toBeNull();
  });

  it('T2 — depois de logout, o mesmo cookie já não autentica (GET /auth/eu → 401)', async () => {
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookieAdmin).expect(200);
    await request(app.getHttpServer()).get('/auth/eu').set('Cookie', cookieAdmin).expect(401);
  });

  it('T3 — a resposta de logout limpa o cookie (Set-Cookie com expiração no passado)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookieAdmin).expect(200);
    const setCookie = res.headers['set-cookie'][0];
    expect(setCookie).toMatch(/nexa_session=;/);
  });
});

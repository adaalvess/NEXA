import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { VERSAO_PRIVACIDADE, VERSAO_TERMOS } from '../src/modules/fundacao/auth/legal.constants';
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
      .send({ empresa: { nome: 'Logout Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA }, aceiteTermos: true })
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

/**
 * POST /auth/registar — consentimento RGPD (Especificação Técnica do Passo
 * 47, Decisão D). Enforcement estrutural: o backend rejeita qualquer registo
 * sem `aceiteTermos: true` literal, mesmo contornando a UI diretamente via
 * API — nunca só uma proteção visual do checkbox no frontend.
 */
describe('Auth — POST /auth/registar (consentimento RGPD)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let empresaId: string | undefined;

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

  afterEach(async () => {
    if (empresaId) {
      await limparEmpresasDeTeste(adminClient, [empresaId]);
      empresaId = undefined;
    }
  });

  it('T4 — registo sem aceiteTermos é rejeitado (400), mesmo contornando a UI', async () => {
    const email = `rgpd-sem-consentimento-${Date.now()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'RGPD Sem Consentimento', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA } })
      .expect(400);

    const utilizador = await adminClient.utilizador.findFirst({ where: { email } });
    expect(utilizador).toBeNull();
  });

  it('T5 — registo com aceiteTermos: false é rejeitado (400)', async () => {
    const email = `rgpd-false-${Date.now()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({
        empresa: { nome: 'RGPD Falso', pais: 'PT' },
        utilizador: { nome: 'Admin', email, password: SENHA },
        aceiteTermos: false,
      })
      .expect(400);
  });

  it('T6 — registo com aceiteTermos: true cria um ConsentimentoRegisto com a versão e timestamp corretos', async () => {
    const email = `rgpd-com-consentimento-${Date.now()}@teste.pt`;
    const antes = new Date();
    const res = await request(app.getHttpServer())
      .post('/auth/registar')
      .send({
        empresa: { nome: 'RGPD Com Consentimento', pais: 'PT' },
        utilizador: { nome: 'Admin', email, password: SENHA },
        aceiteTermos: true,
      })
      .expect(201);
    empresaId = res.body.empresaId;

    const consentimento = await adminClient.consentimentoRegisto.findFirst({ where: { empresaId } });
    expect(consentimento).not.toBeNull();
    expect(consentimento?.versaoTermos).toBe(VERSAO_TERMOS);
    expect(consentimento?.versaoPrivacidade).toBe(VERSAO_PRIVACIDADE);
    expect(consentimento?.aceiteEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
  });

  it('T7 — ConsentimentoRegisto é imutável (UPDATE e DELETE diretos rejeitados pelo trigger)', async () => {
    const email = `rgpd-imutavel-${Date.now()}@teste.pt`;
    const res = await request(app.getHttpServer())
      .post('/auth/registar')
      .send({
        empresa: { nome: 'RGPD Imutavel', pais: 'PT' },
        utilizador: { nome: 'Admin', email, password: SENHA },
        aceiteTermos: true,
      })
      .expect(201);
    empresaId = res.body.empresaId;

    const consentimento = await adminClient.consentimentoRegisto.findFirstOrThrow({ where: { empresaId } });

    await expect(
      adminClient.consentimentoRegisto.update({ where: { id: consentimento.id }, data: { versaoTermos: '2.0' } }),
    ).rejects.toThrow();

    await expect(adminClient.consentimentoRegisto.delete({ where: { id: consentimento.id } })).rejects.toThrow();
  });
});

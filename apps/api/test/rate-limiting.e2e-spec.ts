import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';
const SENHA_ERRADA = 'senha-errada';

/**
 * Rate limiting de login por IP+conta (ADR-007 §3.6; Especificação Técnica
 * do Passo 39) — substitui o `@Throttle` genérico anterior. IPs simulados
 * via `X-Forwarded-For` (`app.set('trust proxy', 1)`, mesma configuração de
 * produção em `main.ts`), nunca o IP real do processo de teste.
 *
 * Modelo: cada camada de bloqueio (5/15min, 10/30min, 15/60min) usa a sua
 * própria duração como janela de contagem — a 5ª tentativa falhada dentro
 * de 15 min já é a que devolve 429 (não a 6ª).
 */
describe('Auth — Rate Limiting de Login (ADR-007 §3.6)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let empresaId: string;
  let email: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule] }).compile();
    app = moduleRef.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
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
    email = `rate-limit-${Date.now()}-${Math.random()}@teste.pt`;
    const res = await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'Rate Limit Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA } })
      .expect(201);
    empresaId = res.body.empresaId;
  });

  afterEach(async () => {
    await adminClient.tentativaLoginFalhada.deleteMany({ where: { email } });
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  const loginComIp = (ip: string, password = SENHA_ERRADA) =>
    request(app.getHttpServer()).post('/auth/login').set('X-Forwarded-For', ip).send({ email, password });

  it('T1 — 4 tentativas falhadas seguidas (mesmo IP+conta) → todas 401, sem bloqueio', async () => {
    for (let i = 0; i < 4; i++) {
      await loginComIp('10.0.0.1').expect(401);
    }
  });

  it('T2 — a 5ª tentativa falhada (mesmo IP+conta) já devolve 429, mensagem genérica', async () => {
    for (let i = 0; i < 4; i++) {
      await loginComIp('10.0.0.2').expect(401);
    }
    const res = await loginComIp('10.0.0.2').expect(429);
    expect(res.body.message).toBe('Demasiadas tentativas. Tenta novamente mais tarde.');
  });

  it('T3 — email inexistente sofre exatamente o mesmo bloqueio na 5ª tentativa (nunca revela existência da conta)', async () => {
    const inexistente = `nunca-existiu-${Date.now()}@teste.pt`;
    const loginInexistente = (ip: string) =>
      request(app.getHttpServer()).post('/auth/login').set('X-Forwarded-For', ip).send({ email: inexistente, password: SENHA_ERRADA });

    for (let i = 0; i < 4; i++) {
      await loginInexistente('10.0.0.3').expect(401);
    }
    const res = await loginInexistente('10.0.0.3').expect(429);
    expect(res.body.message).toBe('Demasiadas tentativas. Tenta novamente mais tarde.');

    await adminClient.tentativaLoginFalhada.deleteMany({ where: { email: inexistente } });
  });

  it('T4 — combinação de IP diferente, mesma conta → não herda o bloqueio (chave é IP+conta, não só conta)', async () => {
    for (let i = 0; i < 4; i++) {
      await loginComIp('10.0.0.4').expect(401);
    }
    await loginComIp('10.0.0.4').expect(429);

    // Mesmo email, IP diferente — nunca bloqueado pelas tentativas do IP anterior.
    await loginComIp('10.0.0.5').expect(401);
  });

  it('T5 — login bem-sucedido depois de tentativas falhadas (abaixo do limiar) reseta o contador na BD', async () => {
    await loginComIp('10.0.0.6').expect(401);
    await loginComIp('10.0.0.6').expect(401);

    const antesDoSucesso = await adminClient.tentativaLoginFalhada.count({ where: { email, ip: '10.0.0.6' } });
    expect(antesDoSucesso).toBe(2);

    await loginComIp('10.0.0.6', SENHA).expect(200);

    const depoisDoSucesso = await adminClient.tentativaLoginFalhada.count({ where: { email, ip: '10.0.0.6' } });
    expect(depoisDoSucesso).toBe(0);
  });

  it('T6 — bloqueio progressivo: 10 falhas com mais de 15min mas menos de 30min continuam bloqueadas (camada de 30min ativa mesmo com a de 15min já expirada)', async () => {
    const ip = '10.0.0.7';
    const hMais20min = new Date(Date.now() - 20 * 60 * 1000);

    // 10 tentativas "antigas" (20 min atrás) — fora da janela de 15min da
    // primeira camada, mas dentro da janela de 30min da segunda.
    await adminClient.tentativaLoginFalhada.createMany({
      data: Array.from({ length: 10 }, () => ({ email, ip, criadoEm: hMais20min })),
    });

    const res = await loginComIp(ip).expect(429);
    expect(res.body.message).toBe('Demasiadas tentativas. Tenta novamente mais tarde.');
  });

  it('T7 — sem tentativas falhadas na janela de 15min nem na de 30min, mas 15 na de 60min → ainda bloqueado pela camada de 60min', async () => {
    const ip = '10.0.0.8';
    const hMais40min = new Date(Date.now() - 40 * 60 * 1000);

    await adminClient.tentativaLoginFalhada.createMany({
      data: Array.from({ length: 15 }, () => ({ email, ip, criadoEm: hMais40min })),
    });

    await loginComIp(ip).expect(429);
  });

  it('T8 — bloqueio expira sozinho depois de todas as tentativas saírem de todas as janelas', async () => {
    const ip = '10.0.0.9';
    const hMais70min = new Date(Date.now() - 70 * 60 * 1000);

    // 20 tentativas há 70 minutos — fora de todas as janelas (a maior é 60min).
    await adminClient.tentativaLoginFalhada.createMany({
      data: Array.from({ length: 20 }, () => ({ email, ip, criadoEm: hMais70min })),
    });

    await loginComIp(ip).expect(401);
  });

  it('T9 — fluxo normal de autenticação sem tentativas falhadas nunca é afetado', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', '10.0.0.10')
      .send({ email, password: SENHA })
      .expect(200);
  });
});

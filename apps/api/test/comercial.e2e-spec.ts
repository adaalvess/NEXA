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
import { QuotaService } from '../src/modules/ia/gateway/quota.service';
import { SubscricaoListener } from '../src/modules/comercial/subscricao.listener';
import { EventoAuditoria } from '../src/modules/fundacao/auditoria/eventos-auditoria';
import { tenantContext } from '../src/modules/fundacao/tenant/tenant-context';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

function anoMesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Comercial — Subscrição real, `GET /planos` (Especificação Técnica do
 * Passo 19, primeiro passo do M4). `SubscricaoListener` reage ao mesmo
 * `EVENTO_AUDITORIA` já emitido por `AuthService.registar()` — por isso
 * `FundacaoModule` (que contém `AuthService`) e `ComercialModule` têm de
 * estar ambos no mesmo módulo de teste para o fluxo real acontecer.
 */
describe('Comercial — Subscrição (Passo 19)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let quotaService: QuotaService;
  let subscricaoListener: SubscricaoListener;
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

    quotaService = moduleRef.get(QuotaService);
    subscricaoListener = moduleRef.get(SubscricaoListener);

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await adminClient.$disconnect();
    await app.close();
  });

  async function registarELogin(sufixo: string) {
    const email = `comercial-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Comercial ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
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

  it('T1 — registo cria SubscricaoPlano automaticamente com trial no plano Professional', async () => {
    const { empresaId } = await registarELogin('t1');

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('trial');
    expect(subscricao.plano).toBe('professional');
    expect(subscricao.limiteUtilizadores).toBe(20);
    expect(subscricao.limiteArmazenamentoMb).toBe(10240);
    expect(subscricao.limiteUsoIA).toBe(200);
    expect(subscricao.trialIniciadoEm.getTime()).toBeGreaterThan(Date.now() - 60_000);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — GET /planos devolve os 3 planos com os limites aprovados, Enterprise com os campos null', async () => {
    const { cookie, empresaId } = await registarELogin('t2');

    const res = await request(app.getHttpServer()).get('/planos').set('Cookie', cookie).expect(200);

    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ plano: 'starter', limiteUtilizadores: 5, limiteArmazenamentoMb: 1024, limiteUsoIA: 50 }),
        expect.objectContaining({ plano: 'professional', limiteUtilizadores: 20, limiteArmazenamentoMb: 10240, limiteUsoIA: 200 }),
        expect.objectContaining({ plano: 'enterprise', limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null }),
      ]),
    );

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — gestor/colaborador/convidado recebem 403 em GET /planos', async () => {
    const { empresaId } = await registarELogin('t3');

    for (const papel of [Papel.gestor, Papel.colaborador, Papel.convidado]) {
      const utilizador = await criarUtilizador(empresaId, papel, 't3');
      await request(app.getHttpServer()).get('/planos').set('Cookie', utilizador.cookie).expect(403);
    }

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — QuotaService nunca bloqueia uma Empresa com plano Enterprise (limiteUsoIA null)', async () => {
    const { empresaId } = await registarELogin('t4');
    await adminClient.subscricaoPlano.update({
      where: { empresaId },
      data: { plano: 'enterprise', limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null },
    });
    await adminClient.usoIAMensal.create({ data: { empresaId, anoMes: anoMesAtual(), contagem: 999 } });

    await expect(
      tenantContext.run({ utilizadorId: 'u', empresaId, papel: Papel.admin_empresa }, () => quotaService.verificarEConsumir()),
    ).resolves.not.toThrow();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — QuotaService continua a bloquear Starter/Professional ao atingir o limite numérico', async () => {
    const { empresaId } = await registarELogin('t5');
    await adminClient.subscricaoPlano.update({
      where: { empresaId },
      data: { plano: 'starter', limiteUtilizadores: 5, limiteArmazenamentoMb: 1024, limiteUsoIA: 2 },
    });
    await adminClient.usoIAMensal.create({ data: { empresaId, anoMes: anoMesAtual(), contagem: 2 } });

    await expect(
      tenantContext.run({ utilizadorId: 'u', empresaId, papel: Papel.admin_empresa }, () => quotaService.verificarEConsumir()),
    ).rejects.toThrow();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — SubscricaoListener é idempotente: o mesmo evento nunca cria uma segunda subscrição nem reverte estado avançado', async () => {
    const { empresaId } = await registarELogin('t6');

    // Simula um estado já avançado (ex: convertida para paga por um webhook futuro) antes do replay.
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { estado: 'ativa', plano: 'enterprise' } });

    const payload: EventoAuditoria = { empresaId, ator: 'utilizador-teste', acao: 'criar', entidade: 'Empresa', entidadeId: empresaId };
    await subscricaoListener.aoRegistarEvento(payload);
    await subscricaoListener.aoRegistarEvento(payload);

    const total = await adminClient.subscricaoPlano.count({ where: { empresaId } });
    expect(total).toBe(1);

    const subscricao = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricao.estado).toBe('ativa');
    expect(subscricao.plano).toBe('enterprise');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

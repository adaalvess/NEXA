import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * Registo de Auditoria (Passo 6) — mecanismo orientado a eventos (emitAsync),
 * campo `detalhe`, trigger de imutabilidade, e consulta cross-tenant do
 * Super Admin via `nexa_auditoria_interna` (Especificação Técnica do
 * Passo 6).
 */
describe('Registo de Auditoria', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

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

  async function registarELogin(sufixo: string) {
    const email = `aud-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Aud ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Aud ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return {
      cookie: login.headers['set-cookie'][0] as string,
      empresaId: login.body.empresaId as string,
      utilizadorId: login.body.utilizadorId as string,
    };
  }

  it('T1 — registo gera entradas de auditoria para Empresa e Utilizador criados', async () => {
    const { empresaId } = await registarELogin('t1');

    const entradas = await adminClient.registoAuditoria.findMany({ where: { empresaId }, orderBy: { timestamp: 'asc' } });
    const acoesEntidades = entradas.map((e) => `${e.acao}:${e.entidade}`);

    expect(acoesEntidades).toContain('criar:Empresa');
    expect(acoesEntidades).toContain('criar:Utilizador');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — login gera uma entrada de auditoria (login/Sessao)', async () => {
    const { empresaId } = await registarELogin('t2');

    const loginEntradas = await adminClient.registoAuditoria.findMany({ where: { empresaId, acao: 'login' } });
    expect(loginEntradas).toHaveLength(1);
    expect(loginEntradas[0].entidade).toBe('Sessao');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — PATCH /utilizadores/:id/papel gera entrada com detalhe.papelAnterior/papelNovo', async () => {
    const { empresaId, cookie } = await registarELogin('t3');
    const colaborador = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Colab T3',
        email: `colab-t3-${Date.now()}@teste.pt`,
        passwordHash,
        papel: Papel.colaborador,
      },
    });

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/papel`)
      .set('Cookie', cookie)
      .send({ papel: 'gestor' })
      .expect(200);

    const entrada = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'atribuir_papel', entidadeId: colaborador.id },
    });
    expect(entrada.detalhe).toEqual({ papelAnterior: 'colaborador', papelNovo: 'gestor' });

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — UPDATE/DELETE direto em RegistoAuditoria é sempre rejeitado (trigger)', async () => {
    const { empresaId } = await registarELogin('t4');
    const entrada = await adminClient.registoAuditoria.findFirstOrThrow({ where: { empresaId } });

    await expect(adminClient.registoAuditoria.update({ where: { id: entrada.id }, data: { acao: 'alterado' } })).rejects.toThrow();
    await expect(adminClient.registoAuditoria.delete({ where: { id: entrada.id } })).rejects.toThrow();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — Admin da Empresa só vê auditoria da sua própria Empresa', async () => {
    const empresaA = await registarELogin('t5a');
    const empresaB = await registarELogin('t5b');

    const resposta = await request(app.getHttpServer()).get('/auditoria').set('Cookie', empresaA.cookie).expect(200);

    expect(resposta.body.every((e: { empresaId: string }) => e.empresaId === empresaA.empresaId)).toBe(true);
    expect(resposta.body.some((e: { empresaId: string }) => e.empresaId === empresaB.empresaId)).toBe(false);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T6/T7 — Super Admin vê auditoria de múltiplas Empresas, e a própria consulta é auditada', async () => {
    const empresaA = await registarELogin('t6a');
    const empresaB = await registarELogin('t6b');

    // Super Admin não é atribuível via fluxo normal (RN-04) — criado
    // diretamente, tal como já feito para Gestor/Colaborador nos testes do
    // Passo 5.
    const empresaSuperAdmin = await adminClient.empresa.create({ data: { nome: 'NEXA Interno', pais: 'PT' } });
    const superAdmin = await adminClient.utilizador.create({
      data: {
        empresaId: empresaSuperAdmin.id,
        nome: 'Super Admin',
        email: `super-${Date.now()}@teste.pt`,
        passwordHash,
        papel: Papel.super_admin,
      },
    });
    const loginSuperAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdmin.email, password: SENHA })
      .expect(200);
    const cookieSuperAdmin = loginSuperAdmin.headers['set-cookie'][0];

    const resposta = await request(app.getHttpServer()).get('/auditoria').set('Cookie', cookieSuperAdmin).expect(200);

    const empresasNaResposta = new Set(resposta.body.map((e: { empresaId: string }) => e.empresaId));
    expect(empresasNaResposta.has(empresaA.empresaId)).toBe(true);
    expect(empresasNaResposta.has(empresaB.empresaId)).toBe(true);

    // T7 — a própria consulta cross-tenant gera uma entrada, na Empresa do Super Admin.
    const entradaConsulta = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId: empresaSuperAdmin.id, acao: 'consultar_auditoria_interna' },
    });
    expect(entradaConsulta.ator).toBe(superAdmin.id);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId, empresaSuperAdmin.id]);
  });

  it('T8 — Gestor/Colaborador/Convidado não conseguem consultar auditoria', async () => {
    const { empresaId } = await registarELogin('t8');
    const colaborador = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Colab T8',
        email: `colab-t8-${Date.now()}@teste.pt`,
        passwordHash,
        papel: Papel.colaborador,
      },
    });
    const loginColaborador = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: colaborador.email, password: SENHA })
      .expect(200);

    await request(app.getHttpServer())
      .get('/auditoria')
      .set('Cookie', loginColaborador.headers['set-cookie'][0])
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — nexa_auditoria_interna não consegue escrever nem aceder a outras tabelas', async () => {
    const clienteRestrito = new PrismaClient({ datasources: { db: { url: process.env.AUDITORIA_INTERNA_DATABASE_URL } } });
    await clienteRestrito.$connect();

    await expect(clienteRestrito.utilizador.findMany()).rejects.toThrow();
    await expect(
      clienteRestrito.registoAuditoria.create({
        data: { empresaId: 'x', ator: 'y', acao: 'z', entidade: 'w', entidadeId: 'v' },
      }),
    ).rejects.toThrow();

    await clienteRestrito.$disconnect();
  });
});

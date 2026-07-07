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
 * RBAC granular (Passo 5) — cobre os limites L1-L6 definidos na Especificação
 * Técnica do Passo 5, 3.4, mais os overrides de RegraPermissao (3.2/3.3) e a
 * renovação deslizante de sessão (3.6). Corre contra `nexa_test` via HTTP
 * real (Middleware → Guard → Controller), não isolamento artificial.
 */
describe('RBAC granular — PATCH /utilizadores/:id/papel', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  let empresaId: string;
  let adminId: string;
  let cookieAdmin: string;
  let cookieGestor: string;
  let colaboradorMesmoDeptId: string;
  let colaboradorOutroDeptId: string;
  let deptVendasId: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    // Fidelidade ao main.ts real — sem isto, os DTOs (class-validator) nunca
    // são de facto avaliados neste harness de teste (revelado por T6 falhar
    // silenciosamente antes desta correção).
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
    const email = `rbac-admin-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'RBAC Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA } })
      .expect(201);

    const loginAdmin = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    cookieAdmin = loginAdmin.headers['set-cookie'][0];
    empresaId = loginAdmin.body.empresaId;
    adminId = loginAdmin.body.utilizadorId;

    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    deptVendasId = deptVendas.id;

    const gestor = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Gestor',
        email: `gestor-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.gestor,
        departamentoId: deptVendasId,
      },
    });

    const colabMesmo = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Colab Vendas',
        email: `colab1-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.colaborador,
        departamentoId: deptVendasId,
      },
    });
    colaboradorMesmoDeptId = colabMesmo.id;

    const colabOutro = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Colab Suporte',
        email: `colab2-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.colaborador,
        departamentoId: deptSuporte.id,
      },
    });
    colaboradorOutroDeptId = colabOutro.id;

    const loginGestor = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: gestor.email, password: SENHA })
      .expect(200);
    cookieGestor = loginGestor.headers['set-cookie'][0];
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T1 — Admin muda o papel de um Colaborador para Gestor', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorMesmoDeptId}/papel`)
      .set('Cookie', cookieAdmin)
      .send({ papel: 'gestor' })
      .expect(200);
    expect(res.body.papel).toBe('gestor');
  });

  it('T2 — ninguém pode alterar o seu próprio papel (L1)', async () => {
    await request(app.getHttpServer())
      .patch(`/utilizadores/${adminId}/papel`)
      .set('Cookie', cookieAdmin)
      .send({ papel: 'gestor' })
      .expect(403);
  });

  it('T3 — Gestor não pode promover ninguém a admin_empresa (L2, hierarquia)', async () => {
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorMesmoDeptId}/papel`)
      .set('Cookie', cookieGestor)
      .send({ papel: 'admin_empresa' })
      .expect(403);
  });

  it('T4 — Gestor não pode alterar papel de Utilizador fora do seu Departamento (L3/RN-03)', async () => {
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorOutroDeptId}/papel`)
      .set('Cookie', cookieGestor)
      .send({ papel: 'colaborador' })
      .expect(403);
  });

  it('T5 — Gestor pode alterar papel dentro do seu Departamento e dentro da hierarquia', async () => {
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorMesmoDeptId}/papel`)
      .set('Cookie', cookieGestor)
      .send({ papel: 'colaborador' })
      .expect(200);
  });

  it('T6 — nunca é possível atribuir super_admin (L4/RN-04)', async () => {
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorMesmoDeptId}/papel`)
      .set('Cookie', cookieAdmin)
      .send({ papel: 'super_admin' })
      .expect(400);
  });

  it('T7 — não é possível demover o único admin_empresa da Empresa (L5/RN-01)', async () => {
    const email = `rbac-solo-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'RBAC Solo', pais: 'PT' }, utilizador: { nome: 'Solo Admin', email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    const soloEmpresaId: string = login.body.empresaId;
    const soloAdminId: string = login.body.utilizadorId;

    const dept = await adminClient.departamento.create({ data: { empresaId: soloEmpresaId, nome: 'Geral' } });
    // Alinha o único admin ao mesmo Departamento de um Gestor, só para isolar
    // L5 (RN-01) de L1 (auto-alteração) — o ator tem de ser outra pessoa.
    await adminClient.utilizador.update({ where: { id: soloAdminId }, data: { departamentoId: dept.id } });
    const gestorSolo = await adminClient.utilizador.create({
      data: {
        empresaId: soloEmpresaId,
        nome: 'Gestor Solo',
        email: `gestor-solo-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.gestor,
        departamentoId: dept.id,
      },
    });
    const loginGestorSolo = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: gestorSolo.email, password: SENHA })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/utilizadores/${soloAdminId}/papel`)
      .set('Cookie', loginGestorSolo.headers['set-cookie'][0])
      .send({ papel: 'colaborador' })
      .expect(409);

    await limparEmpresasDeTeste(adminClient, [soloEmpresaId]);
  });

  it('T8 — não é possível alterar papel de Utilizador de outra Empresa (L6, estrutural)', async () => {
    const emailB = `rbac-outra-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'RBAC Outra Empresa', pais: 'PT' }, utilizador: { nome: 'Admin B', email: emailB, password: SENHA } })
      .expect(201);
    const loginB = await request(app.getHttpServer()).post('/auth/login').send({ email: emailB, password: SENHA }).expect(200);
    const empresaBId: string = loginB.body.empresaId;
    const adminBId: string = loginB.body.utilizadorId;

    await request(app.getHttpServer())
      .patch(`/utilizadores/${adminBId}/papel`)
      .set('Cookie', cookieAdmin)
      .send({ papel: 'colaborador' })
      .expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaBId]);
  });

  it('T9 — RegraPermissao com permitido=false bloqueia ação que o default permitiria', async () => {
    await adminClient.regraPermissao.create({
      data: { empresaId, papel: Papel.admin_empresa, modulo: 'fundacao', acao: 'atribuir_papel', permitido: false },
    });

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorMesmoDeptId}/papel`)
      .set('Cookie', cookieAdmin)
      .send({ papel: 'gestor' })
      .expect(403);
  });

  it('T10 — RegraPermissao com permitido=true permite ação que o default negaria', async () => {
    await adminClient.regraPermissao.create({
      data: { empresaId, papel: Papel.colaborador, modulo: 'fundacao', acao: 'atribuir_papel', permitido: true },
    });

    const loginColaborador = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: (await adminClient.utilizador.findUniqueOrThrow({ where: { id: colaboradorMesmoDeptId } })).email, password: SENHA })
      .expect(200);

    // O default nega para "colaborador" — mesmo com override permitido=true, o
    // Colaborador não tem departamentoId de Gestor, mas a permissão de base
    // (PermissaoGuard) já deveria deixá-lo passar; RN-03 só se aplica a Gestor.
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorOutroDeptId}/papel`)
      .set('Cookie', loginColaborador.headers['set-cookie'][0])
      .send({ papel: 'colaborador' })
      .expect(200);
  });

  it('T11 — Colaborador sem override é sempre rejeitado pelo default (PermissaoGuard)', async () => {
    const colaborador = await adminClient.utilizador.findUniqueOrThrow({ where: { id: colaboradorMesmoDeptId } });
    const loginColaborador = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: colaborador.email, password: SENHA })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorOutroDeptId}/papel`)
      .set('Cookie', loginColaborador.headers['set-cookie'][0])
      .send({ papel: 'colaborador' })
      .expect(403);
  });

  it('T12 — sessão longe da expiração não renova', async () => {
    const sessaoId = cookieAdmin.split(';')[0].split('=')[1];
    const expiraOriginal = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
    await adminClient.sessao.update({ where: { id: sessaoId }, data: { expiraEm: expiraOriginal } });

    await request(app.getHttpServer()).get('/auth/eu').set('Cookie', cookieAdmin).expect(200);

    const sessaoDepois = await adminClient.sessao.findUniqueOrThrow({ where: { id: sessaoId } });
    expect(sessaoDepois.expiraEm.getTime()).toBe(expiraOriginal.getTime());
  });

  it('T13 — sessão perto da expiração renova (deslizante)', async () => {
    const sessaoId = cookieAdmin.split(';')[0].split('=')[1];
    const expiraPertoDoLimite = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await adminClient.sessao.update({ where: { id: sessaoId }, data: { expiraEm: expiraPertoDoLimite } });

    await request(app.getHttpServer()).get('/auth/eu').set('Cookie', cookieAdmin).expect(200);

    const sessaoDepois = await adminClient.sessao.findUniqueOrThrow({ where: { id: sessaoId } });
    expect(sessaoDepois.expiraEm.getTime()).toBeGreaterThan(expiraPertoDoLimite.getTime());
  });
});

/**
 * GET /utilizadores (Especificação Técnica do Passo 14, 3.2.1) — listagem
 * reduzida para popular seletores de responsável/owner nos formulários de
 * Processos/CRM. Reutiliza o mesmo harness/beforeEach do describe acima
 * (Admin, Gestor e dois Colaboradores em Departamentos distintos).
 */
describe('RBAC granular — GET /utilizadores', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  let empresaId: string;
  let cookieAdmin: string;
  let cookieGestor: string;
  let colaboradorMesmoDeptId: string;

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

  beforeEach(async () => {
    const email = `list-utilizadores-admin-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'Listagem Utilizadores Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA } })
      .expect(201);

    const loginAdmin = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    cookieAdmin = loginAdmin.headers['set-cookie'][0];
    empresaId = loginAdmin.body.empresaId;

    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });

    const gestor = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Gestor',
        email: `list-gestor-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.gestor,
        departamentoId: deptVendas.id,
      },
    });
    const loginGestor = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: gestor.email, password: SENHA })
      .expect(200);
    cookieGestor = loginGestor.headers['set-cookie'][0];

    const colaborador = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: 'Colab Vendas',
        email: `list-colab-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel: Papel.colaborador,
        departamentoId: deptVendas.id,
      },
    });
    colaboradorMesmoDeptId = colaborador.id;
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T14 — Admin lista os Utilizadores da Empresa, com campos reduzidos (sem email/passwordHash)', async () => {
    const res = await request(app.getHttpServer()).get('/utilizadores').set('Cookie', cookieAdmin).expect(200);
    expect(res.body.length).toBe(3);
    const colab = res.body.find((u: { id: string }) => u.id === colaboradorMesmoDeptId);
    expect(colab).toEqual({ id: colaboradorMesmoDeptId, nome: 'Colab Vendas', papel: 'colaborador', departamentoId: expect.any(String) });
    expect(colab.email).toBeUndefined();
    expect(colab.passwordHash).toBeUndefined();
  });

  it('T15 — Gestor também pode listar (precisa de escolher responsável/owner)', async () => {
    await request(app.getHttpServer()).get('/utilizadores').set('Cookie', cookieGestor).expect(200);
  });

  it('T16 — Colaborador não pode listar (cria sempre para si próprio)', async () => {
    const loginColaborador = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: (await adminClient.utilizador.findUniqueOrThrow({ where: { id: colaboradorMesmoDeptId } })).email, password: SENHA })
      .expect(200);

    await request(app.getHttpServer())
      .get('/utilizadores')
      .set('Cookie', loginColaborador.headers['set-cookie'][0])
      .expect(403);
  });

  it('T17 — isolamento de tenant: Admin de outra Empresa nunca vê estes Utilizadores', async () => {
    const emailB = `list-outra-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'Listagem Outra Empresa', pais: 'PT' }, utilizador: { nome: 'Admin B', email: emailB, password: SENHA } })
      .expect(201);
    const loginB = await request(app.getHttpServer()).post('/auth/login').send({ email: emailB, password: SENHA }).expect(200);
    const empresaBId: string = loginB.body.empresaId;

    const res = await request(app.getHttpServer())
      .get('/utilizadores')
      .set('Cookie', loginB.headers['set-cookie'][0])
      .expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).not.toBe(colaboradorMesmoDeptId);

    await limparEmpresasDeTeste(adminClient, [empresaBId]);
  });
});

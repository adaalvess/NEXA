import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ProcessosModule } from '../src/modules/processos/processos.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { DashboardModule } from '../src/modules/dashboard/dashboard.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * Dashboard Inteligente (Passo 12) — agregação read-only, reutilização
 * integral de `obterEscopoVisibilidade` (terceira confirmação prática da
 * Decisão B do M2), estado inicial guiado (FR-12), e exposição de
 * Notificações (`GET /notificacoes`, `PATCH .../lida`, herdado do Passo 11).
 */
describe('Dashboard Inteligente', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({
      imports: [FundacaoModule, ProcessosModule, CrmModule, DashboardModule],
    }).compile();
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
    const email = `dash-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Dash ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return {
      cookie: login.headers['set-cookie'][0] as string,
      empresaId: login.body.empresaId as string,
      adminId: login.body.utilizadorId as string,
    };
  }

  async function criarUtilizador(empresaId: string, papel: Papel, sufixo: string, departamentoId?: string) {
    const utilizador = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: `${papel} ${sufixo}`,
        email: `${papel}-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel,
        departamentoId,
      },
    });
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: utilizador.email, password: SENHA }).expect(200);
    return { id: utilizador.id, cookie: login.headers['set-cookie'][0] as string };
  }

  it('T1 — GET /dashboard devolve indicadores corretos', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t1');
    await adminClient.processo.create({ data: { empresaId, titulo: 'P1', responsavelId: adminId, estado: 'por_fazer' } });
    await adminClient.processo.create({ data: { empresaId, titulo: 'P2', responsavelId: adminId, estado: 'concluida' } });
    await adminClient.processo.create({
      data: { empresaId, titulo: 'P Atrasado', responsavelId: adminId, estado: 'em_curso', prazo: new Date(Date.now() - 86400000) },
    });
    await adminClient.cliente.create({
      data: { empresaId, nome: 'C1', tipo: 'empresa_cliente', ownerId: adminId, estadoOportunidade: 'negociacao' },
    });
    await adminClient.cliente.create({ data: { empresaId, nome: 'C2', tipo: 'empresa_cliente', ownerId: adminId } });
    await adminClient.notificacao.create({ data: { empresaId, destinatarioId: adminId, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' } });

    const resposta = await request(app.getHttpServer()).get('/dashboard').set('Cookie', cookie).expect(200);

    expect(resposta.body.processos.total).toBe(3);
    expect(resposta.body.processos.porEstado).toEqual({ por_fazer: 1, em_curso: 1, concluida: 1 });
    expect(resposta.body.processos.emAtraso).toBe(1);
    expect(resposta.body.clientes.total).toBe(2);
    expect(resposta.body.clientes.comOportunidadeAtiva).toBe(1);
    expect(resposta.body.notificacoes.naoLidas).toBe(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — GET /dashboard aplica o escopo RBAC (gestor só vê o seu Departamento)', async () => {
    const { empresaId } = await registarELogin('t2');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't2', deptVendas.id);
    const colabVendas = await criarUtilizador(empresaId, Papel.colaborador, 't2v', deptVendas.id);
    const colabSuporte = await criarUtilizador(empresaId, Papel.colaborador, 't2s', deptSuporte.id);
    await adminClient.processo.create({ data: { empresaId, titulo: 'P Vendas', responsavelId: colabVendas.id, departamentoId: deptVendas.id } });
    await adminClient.processo.create({ data: { empresaId, titulo: 'P Suporte', responsavelId: colabSuporte.id, departamentoId: deptSuporte.id } });

    const resposta = await request(app.getHttpServer()).get('/dashboard').set('Cookie', gestor.cookie).expect(200);
    expect(resposta.body.processos.total).toBe(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — Empresa sem Processos nem Clientes recebe estadoInicial: true', async () => {
    const { empresaId, cookie } = await registarELogin('t3');

    const resposta = await request(app.getHttpServer()).get('/dashboard').set('Cookie', cookie).expect(200);
    expect(resposta.body.estadoInicial).toBe(true);
    expect(resposta.body.sugestoes.length).toBeGreaterThan(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — GET /notificacoes lista só as do próprio Utilizador', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t4');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't4');
    const notifAdmin = await adminClient.notificacao.create({
      data: { empresaId, destinatarioId: adminId, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' },
    });
    await adminClient.notificacao.create({
      data: { empresaId, destinatarioId: colaborador.id, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'y' },
    });

    const resposta = await request(app.getHttpServer()).get('/notificacoes').set('Cookie', cookie).expect(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].id).toBe(notifAdmin.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — PATCH /notificacoes/:id/lida marca como lida', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t5');
    const notif = await adminClient.notificacao.create({
      data: { empresaId, destinatarioId: adminId, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' },
    });

    const resposta = await request(app.getHttpServer()).patch(`/notificacoes/${notif.id}/lida`).set('Cookie', cookie).expect(200);
    expect(resposta.body.lida).toBe(true);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — PATCH /notificacoes/:id/lida numa Notificação de outro Utilizador', async () => {
    const { empresaId, cookie } = await registarELogin('t6');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't6');
    const notif = await adminClient.notificacao.create({
      data: { empresaId, destinatarioId: colaborador.id, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' },
    });

    await request(app.getHttpServer()).patch(`/notificacoes/${notif.id}/lida`).set('Cookie', cookie).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — isolamento entre tenants: indicadores/Notificações de uma Empresa nunca visíveis a partir doutra', async () => {
    const empresaA = await registarELogin('t7a');
    const empresaB = await registarELogin('t7b');
    await adminClient.processo.create({ data: { empresaId: empresaA.empresaId, titulo: 'P A', responsavelId: empresaA.adminId } });
    const notifA = await adminClient.notificacao.create({
      data: { empresaId: empresaA.empresaId, destinatarioId: empresaA.adminId, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' },
    });

    const respostaB = await request(app.getHttpServer()).get('/dashboard').set('Cookie', empresaB.cookie).expect(200);
    expect(respostaB.body.estadoInicial).toBe(true);

    await request(app.getHttpServer()).patch(`/notificacoes/${notifA.id}/lida`).set('Cookie', empresaB.cookie).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T8 — auditoria regista atualizar/Notificacao ao marcar como lida', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t8');
    const notif = await adminClient.notificacao.create({
      data: { empresaId, destinatarioId: adminId, tipoEvento: 'tarefa_atribuida', entidadeOrigemId: 'x' },
    });

    await request(app.getHttpServer()).patch(`/notificacoes/${notif.id}/lida`).set('Cookie', cookie).expect(200);

    const entrada = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'atualizar', entidade: 'Notificacao', entidadeId: notif.id },
    });
    expect(entrada.detalhe).toEqual({ alteracoes: { lida: { anterior: false, novo: true } } });

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

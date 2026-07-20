import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ProcessosModule } from '../src/modules/processos/processos.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * Notification Dispatcher (Passo 11) — `NotificacaoListener` fire-and-forget
 * sobre o mesmo `EVENTO_AUDITORIA` já emitido pelos Passos 6/8/9/10 (sem
 * novo tipo de evento, sem novos endpoints — Especificação Técnica do
 * Passo 11, 2.1). Como é fire-and-forget, a escrita pode terminar depois da
 * resposta HTTP — os testes fazem polling curto (`esperarNotificacao`).
 */
describe('Notification Dispatcher', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ProcessosModule, CrmModule] }).compile();
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
    const email = `notif-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Notif ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return {
      cookie: login.headers['set-cookie'][0] as string,
      empresaId: login.body.empresaId as string,
      adminId: login.body.utilizadorId as string,
    };
  }

  async function criarUtilizador(empresaId: string, papel: Papel, sufixo: string) {
    const utilizador = await adminClient.utilizador.create({
      data: {
        empresaId,
        nome: `${papel} ${sufixo}`,
        email: `${papel}-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`,
        passwordHash,
        papel,
      },
    });
    return { id: utilizador.id };
  }

  async function esperarNotificacao(where: Record<string, unknown>, tentativas = 20, intervaloMs = 50) {
    for (let i = 0; i < tentativas; i++) {
      const encontrada = await adminClient.notificacao.findFirst({ where });
      if (encontrada) {
        return encontrada;
      }
      await new Promise((resolve) => setTimeout(resolve, intervaloMs));
    }
    return null;
  }

  async function confirmarAusenciaDeNotificacao(where: Record<string, unknown>, esperaMs = 300) {
    await new Promise((resolve) => setTimeout(resolve, esperaMs));
    return adminClient.notificacao.findFirst({ where });
  }

  it('T1 — PATCH /utilizadores/:id/papel gera Notificacao (papel_alterado) para o alvo', async () => {
    const { empresaId, cookie } = await registarELogin('t1');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't1');

    await request(app.getHttpServer()).patch(`/utilizadores/${colaborador.id}/papel`).set('Cookie', cookie).send({ papel: 'gestor' }).expect(200);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: colaborador.id, tipoEvento: 'papel_alterado' });
    expect(notificacao).not.toBeNull();
    expect(notificacao?.entidadeOrigemId).toBe(colaborador.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — PATCH /utilizadores/:id/departamento gera Notificacao (departamento_alterado) para o alvo', async () => {
    const { empresaId, cookie } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't2');

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', cookie)
      .send({ departamentoId: dept.id })
      .expect(200);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: colaborador.id, tipoEvento: 'departamento_alterado' });
    expect(notificacao).not.toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — POST /partilhas gera Notificacao (partilha_concedida) para o Convidado', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t3');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't3');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'C', tipo: 'empresa_cliente', ownerId: adminId } });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id })
      .expect(201);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: convidado.id, tipoEvento: 'partilha_concedida' });
    expect(notificacao).not.toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — POST /processos com responsavelId diferente do ator gera Notificacao (tarefa_atribuida)', async () => {
    const { empresaId, cookie } = await registarELogin('t4');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't4');

    const resposta = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Tarefa Atribuída', responsavelId: colaborador.id })
      .expect(201);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: colaborador.id, tipoEvento: 'tarefa_atribuida' });
    expect(notificacao).not.toBeNull();
    expect(notificacao?.entidadeOrigemId).toBe(resposta.body.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — POST /processos com responsavelId igual ao ator não gera Notificacao', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t5');

    const resposta = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Minha Própria Tarefa', responsavelId: adminId })
      .expect(201);

    const notificacao = await confirmarAusenciaDeNotificacao({ empresaId, entidadeOrigemId: resposta.body.id, tipoEvento: 'tarefa_atribuida' });
    expect(notificacao).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — PATCH /processos/:id que reatribui responsavelId gera Notificacao (tarefa_reatribuida)', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t6');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't6');
    const processo = await adminClient.processo.create({ data: { empresaId, titulo: 'P', responsavelId: adminId } });

    await request(app.getHttpServer())
      .patch(`/processos/${processo.id}`)
      .set('Cookie', cookie)
      .send({ responsavelId: colaborador.id })
      .expect(200);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: colaborador.id, tipoEvento: 'tarefa_reatribuida' });
    expect(notificacao).not.toBeNull();
    expect(notificacao?.entidadeOrigemId).toBe(processo.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — PATCH /processos/:id sem alterar responsavelId não gera Notificacao', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t7');
    const processo = await adminClient.processo.create({ data: { empresaId, titulo: 'P', responsavelId: adminId } });

    await request(app.getHttpServer()).patch(`/processos/${processo.id}`).set('Cookie', cookie).send({ estado: 'em_curso' }).expect(200);

    const notificacao = await confirmarAusenciaDeNotificacao({ empresaId, entidadeOrigemId: processo.id, tipoEvento: 'tarefa_reatribuida' });
    expect(notificacao).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — eventos fora do conjunto de gatilhos (ex: criar Cliente) não geram Notificacao', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t8');

    const resposta = await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', cookie)
      .send({ nome: 'Cliente Sem Notificação', tipo: 'empresa_cliente', ownerId: adminId })
      .expect(201);

    const notificacao = await confirmarAusenciaDeNotificacao({ empresaId, entidadeOrigemId: resposta.body.id });
    expect(notificacao).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — a escrita da Notificacao nunca bloqueia a resposta HTTP da ação original', async () => {
    const { empresaId, cookie } = await registarELogin('t9');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't9');

    const inicio = Date.now();
    await request(app.getHttpServer()).patch(`/utilizadores/${colaborador.id}/papel`).set('Cookie', cookie).send({ papel: 'gestor' }).expect(200);
    const duracao = Date.now() - inicio;

    // A resposta HTTP não espera pelo NotificacaoListener (fire-and-forget) —
    // duração da resposta deve ser rápida, independentemente de quando a
    // notificação é de facto escrita (verificado à parte via polling).
    expect(duracao).toBeLessThan(2000);

    const notificacao = await esperarNotificacao({ empresaId, destinatarioId: colaborador.id, tipoEvento: 'papel_alterado' });
    expect(notificacao).not.toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

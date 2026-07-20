import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { IaModule } from '../src/modules/ia/ia.module';
import { AI_ADAPTER } from '../src/modules/ia/gateway/adapters/ai-adapter.interface';
import { FakeAdapter } from '../src/modules/ia/gateway/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';
const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000);

/**
 * Sugestões de ação (UC-06, RN-08; Especificação Técnica do Passo 17) —
 * geração determinística, confirmação (executa via `ProcessosService.editar`),
 * rejeição. Fecha, com este ficheiro, a metade "sugestão/confirmação" do
 * fluxo crítico "ações de IA" (NFR-17) — a metade "pergunta" já estava
 * coberta em `ia-perguntar.e2e-spec.ts` (Passo 16).
 */
describe('Sugestões de Ação da IA (Passo 17)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, IaModule] })
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
    const email = `ia-sug-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `IA Sugestões ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
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
    return { id: utilizador.id, nome: utilizador.nome, cookie: login.headers['set-cookie'][0] as string };
  }

  it('T1 — geração cria SugestaoIA pendente para Processo atrasado com candidato válido', async () => {
    const { empresaId, cookie } = await registarELogin('t1');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't1-resp', dept.id);
    const candidato = await criarUtilizador(empresaId, Papel.colaborador, 't1-cand', dept.id);
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Atrasado', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const res = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);

    expect(res.body.sugestoes).toHaveLength(1);
    expect(res.body.sugestoes[0].entidadeRef).toBe(processo.id);

    const sugestao = await adminClient.sugestaoIA.findUniqueOrThrow({ where: { id: res.body.sugestoes[0].id } });
    expect(sugestao.tipo).toBe('sugestao_acao');
    expect(sugestao.estado).toBe('pendente');
    expect((sugestao.acaoPayload as Record<string, unknown>).responsavelSugeridoId).toBe(candidato.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — sem candidato válido (único Colaborador do Departamento é o próprio responsável) → nenhuma sugestão', async () => {
    const { empresaId, cookie } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't2-resp', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Sem Candidato', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const res = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);

    expect(res.body.sugestoes).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — geração é idempotente, não duplica sugestão pendente para o mesmo Processo', async () => {
    const { empresaId, cookie } = await registarELogin('t3');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't3-resp', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't3-cand', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Idempotente', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const segunda = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);

    expect(segunda.body.sugestoes).toHaveLength(0);

    const total = await adminClient.sugestaoIA.count({ where: { empresaId, tipo: 'sugestao_acao' } });
    expect(total).toBe(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — colaborador e convidado recebem 403 em geração/confirmação/rejeição', async () => {
    const { empresaId } = await registarELogin('t4');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't4-colab');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't4-conv');

    for (const utilizador of [colaborador, convidado]) {
      await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', utilizador.cookie).send({}).expect(403);
      await request(app.getHttpServer()).post('/ia/sugestoes/id-inexistente/confirmar').set('Cookie', utilizador.cookie).send({}).expect(403);
      await request(app.getHttpServer()).post('/ia/sugestoes/id-inexistente/rejeitar').set('Cookie', utilizador.cookie).send({}).expect(403);
    }

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — confirmação bem-sucedida reatribui o Processo e audita sugestão + execução distintamente', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t5');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't5-resp', dept.id);
    const candidato = await criarUtilizador(empresaId, Papel.colaborador, 't5-cand', dept.id);
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo a Confirmar', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const geracao = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const sugestaoId = geracao.body.sugestoes[0].id;

    const confirmacao = await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/confirmar`).set('Cookie', cookie).send({}).expect(201);
    expect(confirmacao.body.estado).toBe('aceite');

    const processoAtualizado = await adminClient.processo.findUniqueOrThrow({ where: { id: processo.id } });
    expect(processoAtualizado.responsavelId).toBe(candidato.id);

    const eventos = await adminClient.registoAuditoria.findMany({ where: { empresaId, entidadeId: { in: [processo.id, sugestaoId] } } });
    expect(eventos.some((e) => e.acao === 'atualizar' && e.entidade === 'Processo')).toBe(true);
    expect(eventos.some((e) => e.acao === 'confirmar' && e.entidade === 'SugestaoIA')).toBe(true);
    expect(eventos.some((e) => e.acao === 'gerar' && e.entidade === 'SugestaoIA')).toBe(true);

    void adminId;
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — confirmar uma sugestão já aceite/rejeitada devolve 409', async () => {
    const { empresaId, cookie } = await registarELogin('t6');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't6-resp', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't6-cand', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Duplo Confirm', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const geracao = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const sugestaoId = geracao.body.sugestoes[0].id;

    await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/confirmar`).set('Cookie', cookie).send({}).expect(201);
    await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/confirmar`).set('Cookie', cookie).send({}).expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — Processo reatribuído por outra via antes da confirmação → 409, sugestão permanece pendente (UC-06 E1)', async () => {
    const { empresaId, cookie } = await registarELogin('t7');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't7-resp', dept.id);
    const candidato = await criarUtilizador(empresaId, Papel.colaborador, 't7-cand', dept.id);
    const outraPessoa = await criarUtilizador(empresaId, Papel.colaborador, 't7-outra', dept.id);
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Já Reatribuído', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const geracao = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const sugestaoId = geracao.body.sugestoes[0].id;

    // Simula reatribuição por outra via, entre a geração e a confirmação.
    await adminClient.processo.update({ where: { id: processo.id }, data: { responsavelId: outraPessoa.id } });

    await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/confirmar`).set('Cookie', cookie).send({}).expect(409);

    const sugestao = await adminClient.sugestaoIA.findUniqueOrThrow({ where: { id: sugestaoId } });
    expect(sugestao.estado).toBe('pendente');

    void candidato;
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — confirmação por um gestor que não gerou a sugestão nem é admin_empresa → 403', async () => {
    const { empresaId, cookie } = await registarELogin('t8');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't8-resp', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't8-cand', dept.id);
    const outroGestor = await criarUtilizador(empresaId, Papel.gestor, 't8-gestor', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Autoridade', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const geracao = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const sugestaoId = geracao.body.sugestoes[0].id;

    await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/confirmar`).set('Cookie', outroGestor.cookie).send({}).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — rejeição bem-sucedida marca a sugestão como rejeitada, sem alterar o Processo', async () => {
    const { empresaId, cookie } = await registarELogin('t9');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't9-resp', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't9-cand', dept.id);
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo a Rejeitar', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    const geracao = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(201);
    const sugestaoId = geracao.body.sugestoes[0].id;

    const rejeicao = await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestaoId}/rejeitar`).set('Cookie', cookie).send({}).expect(201);
    expect(rejeicao.body.estado).toBe('rejeitada');

    const processoInalterado = await adminClient.processo.findUniqueOrThrow({ where: { id: processo.id } });
    expect(processoInalterado.responsavelId).toBe(responsavel.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T10 — gestor só gera sugestões dentro do seu próprio Departamento', async () => {
    const { empresaId } = await registarELogin('t10');
    const deptA = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptB = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestorA = await criarUtilizador(empresaId, Papel.gestor, 't10-gestorA', deptA.id);
    const respA = await criarUtilizador(empresaId, Papel.colaborador, 't10-respA', deptA.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't10-candA', deptA.id);
    const respB = await criarUtilizador(empresaId, Papel.colaborador, 't10-respB', deptB.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't10-candB', deptB.id);

    const processoA = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Dept A', responsavelId: respA.id, departamentoId: deptA.id, prazo: ONTEM },
    });
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Dept B', responsavelId: respB.id, departamentoId: deptB.id, prazo: ONTEM },
    });

    const res = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', gestorA.cookie).send({}).expect(201);

    expect(res.body.sugestoes).toHaveLength(1);
    expect(res.body.sugestoes[0].entidadeRef).toBe(processoA.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T11 — GET /ia/sugestoes devolve só as pendentes geradas pelo próprio Utilizador (Passo 18)', async () => {
    const { empresaId } = await registarELogin('t11');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestorA = await criarUtilizador(empresaId, Papel.gestor, 't11-gestorA', dept.id);
    const gestorB = await criarUtilizador(empresaId, Papel.gestor, 't11-gestorB', dept.id);
    const respA = await criarUtilizador(empresaId, Papel.colaborador, 't11-respA', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't11-candA', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Gestor A', responsavelId: respA.id, departamentoId: dept.id, prazo: ONTEM },
    });

    await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', gestorA.cookie).send({}).expect(201);

    const listaA = await request(app.getHttpServer()).get('/ia/sugestoes').set('Cookie', gestorA.cookie).expect(200);
    expect(listaA.body).toHaveLength(1);
    expect(listaA.body[0].texto).toContain('Processo Gestor A');

    const listaB = await request(app.getHttpServer()).get('/ia/sugestoes').set('Cookie', gestorB.cookie).expect(200);
    expect(listaB.body).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — admin_empresa vê as sugestões pendentes geradas por qualquer Utilizador da Empresa', async () => {
    const { empresaId, cookie: cookieAdmin } = await registarELogin('t12');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't12-gestor', dept.id);
    const responsavel = await criarUtilizador(empresaId, Papel.colaborador, 't12-resp', dept.id);
    await criarUtilizador(empresaId, Papel.colaborador, 't12-cand', dept.id);
    await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Via Gestor', responsavelId: responsavel.id, departamentoId: dept.id, prazo: ONTEM },
    });

    await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', gestor.cookie).send({}).expect(201);

    const listaAdmin = await request(app.getHttpServer()).get('/ia/sugestoes').set('Cookie', cookieAdmin).expect(200);
    expect(listaAdmin.body).toHaveLength(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T13 — colaborador e convidado recebem 403 em GET /ia/sugestoes', async () => {
    const { empresaId } = await registarELogin('t13');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't13-colab');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't13-conv');

    await request(app.getHttpServer()).get('/ia/sugestoes').set('Cookie', colaborador.cookie).expect(403);
    await request(app.getHttpServer()).get('/ia/sugestoes').set('Cookie', convidado.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

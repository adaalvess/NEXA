import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ProcessosModule } from '../src/modules/processos/processos.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * Processos e Tarefas (Passo 9) — CRUD, visibilidade RBAC centralizada
 * (`AuthorizationService.obterEscopoVisibilidade`/`podeAgirSobreEntidade`),
 * regras PR-01 a PR-07, e integração real com Partilha (T10/T11 — primeiro
 * consumidor de `podeAcederViaPartilha`, resolve o Risco R1 do Passo 7).
 */
describe('Processos e Tarefas', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ProcessosModule] }).compile();
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
    const email = `proc-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Proc ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
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

  it('T1 — admin_empresa cria um Processo para qualquer Utilizador', async () => {
    const { empresaId, cookie } = await registarELogin('t1');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't1');

    const resposta = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Tarefa Admin', responsavelId: colaborador.id })
      .expect(201);

    expect(resposta.body.titulo).toBe('Tarefa Admin');
    expect(resposta.body.estado).toBe('por_fazer');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — gestor cria um Processo para um Utilizador do seu Departamento', async () => {
    const { empresaId } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't2g', dept.id);
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't2c', dept.id);

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', gestor.cookie)
      .send({ titulo: 'Tarefa Equipa', responsavelId: colaborador.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — gestor tenta criar Processo para Utilizador de outro Departamento', async () => {
    const { empresaId } = await registarELogin('t3');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't3g', deptVendas.id);
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't3c', deptSuporte.id);

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', gestor.cookie)
      .send({ titulo: 'Tarefa Fora', responsavelId: colaborador.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — colaborador cria um Processo para si mesmo', async () => {
    const { empresaId } = await registarELogin('t4');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't4');

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', colaborador.cookie)
      .send({ titulo: 'Minha Tarefa', responsavelId: colaborador.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — colaborador tenta criar Processo para outro Utilizador', async () => {
    const { empresaId } = await registarELogin('t5');
    const colaboradorA = await criarUtilizador(empresaId, Papel.colaborador, 't5a');
    const colaboradorB = await criarUtilizador(empresaId, Papel.colaborador, 't5b');

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', colaboradorA.cookie)
      .send({ titulo: 'Tarefa Alheia', responsavelId: colaboradorB.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — convidado tenta criar um Processo', async () => {
    const { empresaId } = await registarELogin('t6');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't6');

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', convidado.cookie)
      .send({ titulo: 'Tarefa Convidado', responsavelId: convidado.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — admin_empresa vê todos os Processos da Empresa', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t7');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't7');
    await adminClient.processo.create({ data: { empresaId, titulo: 'P1', responsavelId: adminId } });
    await adminClient.processo.create({ data: { empresaId, titulo: 'P2', responsavelId: colaborador.id } });

    const resposta = await request(app.getHttpServer()).get('/processos').set('Cookie', cookie).expect(200);
    expect(resposta.body.length).toBeGreaterThanOrEqual(2);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — gestor só vê Processos do seu Departamento', async () => {
    const { empresaId, adminId } = await registarELogin('t8');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't8', deptVendas.id);
    const processoVendas = await adminClient.processo.create({
      data: { empresaId, titulo: 'P Vendas', responsavelId: adminId, departamentoId: deptVendas.id },
    });
    const processoSuporte = await adminClient.processo.create({
      data: { empresaId, titulo: 'P Suporte', responsavelId: adminId, departamentoId: deptSuporte.id },
    });

    const resposta = await request(app.getHttpServer()).get('/processos').set('Cookie', gestor.cookie).expect(200);
    const ids = resposta.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(processoVendas.id);
    expect(ids).not.toContain(processoSuporte.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — colaborador só vê Processos de que é responsável', async () => {
    const { empresaId } = await registarELogin('t9');
    const colaboradorA = await criarUtilizador(empresaId, Papel.colaborador, 't9a');
    const colaboradorB = await criarUtilizador(empresaId, Papel.colaborador, 't9b');
    const processoA = await adminClient.processo.create({ data: { empresaId, titulo: 'P A', responsavelId: colaboradorA.id } });
    const processoB = await adminClient.processo.create({ data: { empresaId, titulo: 'P B', responsavelId: colaboradorB.id } });

    const resposta = await request(app.getHttpServer()).get('/processos').set('Cookie', colaboradorA.cookie).expect(200);
    const ids = resposta.body.map((p: { id: string }) => p.id);
    expect(ids).toContain(processoA.id);
    expect(ids).not.toContain(processoB.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T10/T11 — convidado só vê Processos partilhados, e perde acesso após revogação', async () => {
    const { empresaId, adminId } = await registarELogin('t10');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't10');
    const processo = await adminClient.processo.create({ data: { empresaId, titulo: 'P Partilhado', responsavelId: adminId } });
    const partilha = await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'processo', entidadeId: processo.id, convidadoId: convidado.id, concedidoPorId: adminId },
    });

    // T10 — vê o partilhado.
    await request(app.getHttpServer()).get(`/processos/${processo.id}`).set('Cookie', convidado.cookie).expect(200);

    // T11 — após revogar, deixa de ver.
    await adminClient.partilha.update({ where: { id: partilha.id }, data: { revogadoEm: new Date() } });
    await request(app.getHttpServer()).get(`/processos/${processo.id}`).set('Cookie', convidado.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — colaborador tenta eliminar um Processo seu', async () => {
    const { empresaId } = await registarELogin('t12');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't12');
    const processo = await adminClient.processo.create({ data: { empresaId, titulo: 'P', responsavelId: colaborador.id } });

    await request(app.getHttpServer()).delete(`/processos/${processo.id}`).set('Cookie', colaborador.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T13 — gestor elimina um Processo do seu Departamento', async () => {
    const { empresaId, adminId } = await registarELogin('t13');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't13', dept.id);
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'P', responsavelId: adminId, departamentoId: dept.id },
    });

    const resposta = await request(app.getHttpServer()).delete(`/processos/${processo.id}`).set('Cookie', gestor.cookie).expect(200);
    expect(resposta.body.eliminadoEm).not.toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T14 — associar Processo a Cliente sem visibilidade sobre ele', async () => {
    const { empresaId, adminId } = await registarELogin('t14');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't14');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente Alheio', tipo: 'empresa_cliente', ownerId: adminId } });

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', colaborador.cookie)
      .send({ titulo: 'Tarefa com Cliente', responsavelId: colaborador.id, clienteId: cliente.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T15 — associar Processo a Cliente com visibilidade', async () => {
    const { empresaId } = await registarELogin('t15');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't15');
    const cliente = await adminClient.cliente.create({
      data: { empresaId, nome: 'Cliente Próprio', tipo: 'empresa_cliente', ownerId: colaborador.id },
    });

    const resposta = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', colaborador.cookie)
      .send({ titulo: 'Tarefa com Cliente', responsavelId: colaborador.id, clienteId: cliente.id })
      .expect(201);
    expect(resposta.body.clienteId).toBe(cliente.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T16 — estado inválido (fora do enum) é rejeitado', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t16');
    const processo = await adminClient.processo.create({ data: { empresaId, titulo: 'P', responsavelId: adminId } });

    await request(app.getHttpServer()).patch(`/processos/${processo.id}`).set('Cookie', cookie).send({ estado: 'inexistente' }).expect(400);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T17 — isolamento entre tenants: Processo de uma Empresa nunca visível/afetável a partir doutra', async () => {
    const empresaA = await registarELogin('t17a');
    const empresaB = await registarELogin('t17b');
    const processoA = await adminClient.processo.create({
      data: { empresaId: empresaA.empresaId, titulo: 'P A', responsavelId: empresaA.adminId },
    });

    await request(app.getHttpServer()).get(`/processos/${processoA.id}`).set('Cookie', empresaB.cookie).expect(404);
    await request(app.getHttpServer()).delete(`/processos/${processoA.id}`).set('Cookie', empresaB.cookie).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T18 — auditoria regista criar/atualizar/eliminar corretamente', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t18');

    const criado = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'P Auditado', responsavelId: adminId })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/processos/${criado.body.id}`)
      .set('Cookie', cookie)
      .send({ estado: 'em_curso' })
      .expect(200);

    await request(app.getHttpServer()).delete(`/processos/${criado.body.id}`).set('Cookie', cookie).expect(200);

    const entradaCriar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'criar', entidade: 'Processo', entidadeId: criado.body.id },
    });
    expect(entradaCriar.detalhe).toMatchObject({ dados: { titulo: 'P Auditado' } });

    const entradaAtualizar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'atualizar', entidade: 'Processo', entidadeId: criado.body.id },
    });
    expect(entradaAtualizar.detalhe).toEqual({ alteracoes: { estado: { anterior: 'por_fazer', novo: 'em_curso' } } });

    const entradaEliminar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'eliminar', entidade: 'Processo', entidadeId: criado.body.id },
    });
    expect(entradaEliminar.detalhe).toHaveProperty('eliminadoEm');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

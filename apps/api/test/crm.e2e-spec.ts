import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * CRM Inteligente (Passo 10) — CRUD de Cliente/Interação, visibilidade RBAC
 * reutilizada integralmente do Passo 9 (segunda prova de que a
 * centralização da Decisão B do M2 funciona sem duplicação), regras CR-01
 * a CR-06 e IR-01 a IR-03, e `GET /pipeline`.
 */
describe('CRM Inteligente', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, CrmModule] }).compile();
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
    const email = `crm-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `CRM ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
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

  it('T1 — admin_empresa cria um Cliente para qualquer Utilizador', async () => {
    const { empresaId, cookie } = await registarELogin('t1');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't1');

    const resposta = await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', cookie)
      .send({ nome: 'Cliente Admin', tipo: 'empresa_cliente', ownerId: colaborador.id })
      .expect(201);

    expect(resposta.body.nome).toBe('Cliente Admin');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — gestor cria um Cliente para um Utilizador do seu Departamento', async () => {
    const { empresaId } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't2g', dept.id);
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't2c', dept.id);

    await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', gestor.cookie)
      .send({ nome: 'Cliente Equipa', tipo: 'empresa_cliente', ownerId: colaborador.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — gestor tenta criar Cliente para Utilizador de outro Departamento', async () => {
    const { empresaId } = await registarELogin('t3');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't3g', deptVendas.id);
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't3c', deptSuporte.id);

    await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', gestor.cookie)
      .send({ nome: 'Cliente Fora', tipo: 'empresa_cliente', ownerId: colaborador.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — colaborador cria um Cliente para si mesmo', async () => {
    const { empresaId } = await registarELogin('t4');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't4');

    await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', colaborador.cookie)
      .send({ nome: 'Meu Cliente', tipo: 'contacto_individual', ownerId: colaborador.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — colaborador tenta criar Cliente para outro Utilizador', async () => {
    const { empresaId } = await registarELogin('t5');
    const colaboradorA = await criarUtilizador(empresaId, Papel.colaborador, 't5a');
    const colaboradorB = await criarUtilizador(empresaId, Papel.colaborador, 't5b');

    await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', colaboradorA.cookie)
      .send({ nome: 'Cliente Alheio', tipo: 'contacto_individual', ownerId: colaboradorB.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — convidado tenta criar um Cliente', async () => {
    const { empresaId } = await registarELogin('t6');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't6');

    await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', convidado.cookie)
      .send({ nome: 'Cliente Convidado', tipo: 'contacto_individual', ownerId: convidado.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — admin_empresa vê todos os Clientes da Empresa', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t7');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't7');
    await adminClient.cliente.create({ data: { empresaId, nome: 'C1', tipo: 'empresa_cliente', ownerId: adminId } });
    await adminClient.cliente.create({ data: { empresaId, nome: 'C2', tipo: 'empresa_cliente', ownerId: colaborador.id } });

    const resposta = await request(app.getHttpServer()).get('/clientes').set('Cookie', cookie).expect(200);
    expect(resposta.body.length).toBeGreaterThanOrEqual(2);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — gestor só vê Clientes do seu Departamento', async () => {
    const { empresaId } = await registarELogin('t8');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't8', deptVendas.id);
    const colabVendas = await criarUtilizador(empresaId, Papel.colaborador, 't8v', deptVendas.id);
    const colabSuporte = await criarUtilizador(empresaId, Papel.colaborador, 't8s', deptSuporte.id);
    const clienteVendas = await adminClient.cliente.create({ data: { empresaId, nome: 'C Vendas', tipo: 'empresa_cliente', ownerId: colabVendas.id } });
    const clienteSuporte = await adminClient.cliente.create({ data: { empresaId, nome: 'C Suporte', tipo: 'empresa_cliente', ownerId: colabSuporte.id } });

    const resposta = await request(app.getHttpServer()).get('/clientes').set('Cookie', gestor.cookie).expect(200);
    const ids = resposta.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(clienteVendas.id);
    expect(ids).not.toContain(clienteSuporte.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — colaborador só vê os seus Clientes', async () => {
    const { empresaId } = await registarELogin('t9');
    const colaboradorA = await criarUtilizador(empresaId, Papel.colaborador, 't9a');
    const colaboradorB = await criarUtilizador(empresaId, Papel.colaborador, 't9b');
    const clienteA = await adminClient.cliente.create({ data: { empresaId, nome: 'C A', tipo: 'contacto_individual', ownerId: colaboradorA.id } });
    const clienteB = await adminClient.cliente.create({ data: { empresaId, nome: 'C B', tipo: 'contacto_individual', ownerId: colaboradorB.id } });

    const resposta = await request(app.getHttpServer()).get('/clientes').set('Cookie', colaboradorA.cookie).expect(200);
    const ids = resposta.body.map((c: { id: string }) => c.id);
    expect(ids).toContain(clienteA.id);
    expect(ids).not.toContain(clienteB.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T10 — convidado só vê Clientes partilhados, e perde acesso após revogação', async () => {
    const { empresaId, adminId } = await registarELogin('t10');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't10');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'C Partilhado', tipo: 'empresa_cliente', ownerId: adminId } });
    const partilha = await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id, concedidoPorId: adminId },
    });

    await request(app.getHttpServer()).get(`/clientes/${cliente.id}`).set('Cookie', convidado.cookie).expect(200);

    await adminClient.partilha.update({ where: { id: partilha.id }, data: { revogadoEm: new Date() } });
    await request(app.getHttpServer()).get(`/clientes/${cliente.id}`).set('Cookie', convidado.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T11 — colaborador regista Interação num Cliente seu com contactoPrincipal preenchido', async () => {
    const { empresaId } = await registarELogin('t11');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't11');
    const cliente = await adminClient.cliente.create({
      data: { empresaId, nome: 'C', tipo: 'contacto_individual', ownerId: colaborador.id, contactoPrincipal: 'cliente@teste.pt' },
    });

    await request(app.getHttpServer())
      .post(`/clientes/${cliente.id}/interacoes`)
      .set('Cookie', colaborador.cookie)
      .send({ tipo: 'chamada', descricao: 'Primeira chamada' })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — registar a primeira Interação sem contactoPrincipal preenchido', async () => {
    const { empresaId } = await registarELogin('t12');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't12');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'C', tipo: 'contacto_individual', ownerId: colaborador.id } });

    await request(app.getHttpServer())
      .post(`/clientes/${cliente.id}/interacoes`)
      .set('Cookie', colaborador.cookie)
      .send({ tipo: 'nota' })
      .expect(400);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T13 — convidado com Partilha tenta registar Interação', async () => {
    const { empresaId, adminId } = await registarELogin('t13');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't13');
    const cliente = await adminClient.cliente.create({
      data: { empresaId, nome: 'C', tipo: 'empresa_cliente', ownerId: adminId, contactoPrincipal: 'x@teste.pt' },
    });
    await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id, concedidoPorId: adminId },
    });

    await request(app.getHttpServer())
      .post(`/clientes/${cliente.id}/interacoes`)
      .set('Cookie', convidado.cookie)
      .send({ tipo: 'nota' })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T14 — GET /pipeline agrupa Clientes por estadoOportunidade, respeitando o âmbito', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t14');
    await adminClient.cliente.create({ data: { empresaId, nome: 'C Prospeção', tipo: 'empresa_cliente', ownerId: adminId, estadoOportunidade: 'prospecao' } });
    await adminClient.cliente.create({ data: { empresaId, nome: 'C Sem Oportunidade', tipo: 'empresa_cliente', ownerId: adminId } });

    const resposta = await request(app.getHttpServer()).get('/pipeline').set('Cookie', cookie).expect(200);
    expect(resposta.body.prospecao.length).toBeGreaterThanOrEqual(1);
    expect(resposta.body).toHaveProperty('negociacao');
    expect(resposta.body).toHaveProperty('fechada_ganha');
    expect(resposta.body).toHaveProperty('fechada_perdida');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T15 — colaborador tenta aceder a GET /pipeline', async () => {
    const { empresaId } = await registarELogin('t15');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't15');

    await request(app.getHttpServer()).get('/pipeline').set('Cookie', colaborador.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T16 — isolamento entre tenants: Cliente de uma Empresa nunca visível/afetável a partir doutra', async () => {
    const empresaA = await registarELogin('t16a');
    const empresaB = await registarELogin('t16b');
    const clienteA = await adminClient.cliente.create({
      data: { empresaId: empresaA.empresaId, nome: 'C A', tipo: 'empresa_cliente', ownerId: empresaA.adminId },
    });

    await request(app.getHttpServer()).get(`/clientes/${clienteA.id}`).set('Cookie', empresaB.cookie).expect(404);
    await request(app.getHttpServer()).patch(`/clientes/${clienteA.id}`).set('Cookie', empresaB.cookie).send({ nome: 'Hackeado' }).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T17 — auditoria regista criar/atualizar de Cliente e criar de Interação', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t17');

    const criado = await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', cookie)
      .send({ nome: 'C Auditado', tipo: 'empresa_cliente', ownerId: adminId, contactoPrincipal: 'x@teste.pt' })
      .expect(201);

    await request(app.getHttpServer()).patch(`/clientes/${criado.body.id}`).set('Cookie', cookie).send({ nome: 'C Renomeado' }).expect(200);

    const interacao = await request(app.getHttpServer())
      .post(`/clientes/${criado.body.id}/interacoes`)
      .set('Cookie', cookie)
      .send({ tipo: 'nota', descricao: 'Nota auditada' })
      .expect(201);

    const entradaCriar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'criar', entidade: 'Cliente', entidadeId: criado.body.id },
    });
    expect(entradaCriar.detalhe).toMatchObject({ dados: { nome: 'C Auditado' } });

    const entradaAtualizar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'atualizar', entidade: 'Cliente', entidadeId: criado.body.id },
    });
    expect(entradaAtualizar.detalhe).toEqual({ alteracoes: { nome: { anterior: 'C Auditado', novo: 'C Renomeado' } } });

    const entradaInteracao = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'criar', entidade: 'Interacao', entidadeId: interacao.body.id },
    });
    expect(entradaInteracao.detalhe).toMatchObject({ dados: { clienteId: criado.body.id, tipo: 'nota' } });

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

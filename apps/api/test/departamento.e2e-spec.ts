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
 * Departamento (Passo 8) — CRUD completo + atribuição de Utilizador a
 * Departamento (RD-01 a RD-04, Especificação Técnica do Passo 8).
 */
describe('Departamento (CRUD + Atribuição)', () => {
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
    const email = `depto-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Depto ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
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

  it('T1 — admin_empresa cria um Departamento', async () => {
    const { empresaId, cookie } = await registarELogin('t1');

    const resposta = await request(app.getHttpServer()).post('/departamentos').set('Cookie', cookie).send({ nome: 'Vendas' }).expect(201);

    expect(resposta.body.nome).toBe('Vendas');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — admin_empresa edita o nome de um Departamento', async () => {
    const { empresaId, cookie } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });

    const resposta = await request(app.getHttpServer())
      .patch(`/departamentos/${dept.id}`)
      .set('Cookie', cookie)
      .send({ nome: 'Vendas Renomeado' })
      .expect(200);

    expect(resposta.body.nome).toBe('Vendas Renomeado');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — admin_empresa elimina um Departamento sem Utilizadores ativos atribuídos', async () => {
    const { empresaId, cookie } = await registarELogin('t3');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });

    const resposta = await request(app.getHttpServer()).delete(`/departamentos/${dept.id}`).set('Cookie', cookie).expect(200);

    expect(resposta.body.eliminadoEm).not.toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — admin_empresa tenta eliminar um Departamento com Utilizador ativo atribuído', async () => {
    const { empresaId, cookie } = await registarELogin('t4');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    await criarUtilizador(empresaId, Papel.colaborador, 't4', dept.id);

    await request(app.getHttpServer()).delete(`/departamentos/${dept.id}`).set('Cookie', cookie).expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — gestor/colaborador/convidado não conseguem criar/editar/eliminar Departamento', async () => {
    const { empresaId } = await registarELogin('t5');
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't5g');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't5c');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't5v');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });

    for (const utilizador of [gestor, colaborador, convidado]) {
      await request(app.getHttpServer()).post('/departamentos').set('Cookie', utilizador.cookie).send({ nome: 'X' }).expect(403);
      await request(app.getHttpServer()).patch(`/departamentos/${dept.id}`).set('Cookie', utilizador.cookie).send({ nome: 'Y' }).expect(403);
      await request(app.getHttpServer()).delete(`/departamentos/${dept.id}`).set('Cookie', utilizador.cookie).expect(403);
    }

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — gestor consegue listar Departamentos; colaborador/convidado não', async () => {
    const { empresaId } = await registarELogin('t6');
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't6g');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't6c');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't6v');
    await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });

    await request(app.getHttpServer()).get('/departamentos').set('Cookie', gestor.cookie).expect(200);
    await request(app.getHttpServer()).get('/departamentos').set('Cookie', colaborador.cookie).expect(403);
    await request(app.getHttpServer()).get('/departamentos').set('Cookie', convidado.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7/T8 — admin_empresa atribui e depois remove o Departamento de um Utilizador', async () => {
    const { empresaId, cookie } = await registarELogin('t7');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't7');

    const respostaAtribuir = await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', cookie)
      .send({ departamentoId: dept.id })
      .expect(200);
    expect(respostaAtribuir.body.departamentoId).toBe(dept.id);

    const respostaRemover = await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', cookie)
      .send({ departamentoId: null })
      .expect(200);
    expect(respostaRemover.body.departamentoId).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — tentativa de atribuir um departamentoId de outra Empresa, ou já eliminado', async () => {
    const empresaA = await registarELogin('t9a');
    const empresaB = await registarELogin('t9b');
    const colaboradorA = await criarUtilizador(empresaA.empresaId, Papel.colaborador, 't9');
    const deptB = await adminClient.departamento.create({ data: { empresaId: empresaB.empresaId, nome: 'Vendas B' } });
    const deptEliminado = await adminClient.departamento.create({
      data: { empresaId: empresaA.empresaId, nome: 'Eliminado', eliminadoEm: new Date() },
    });

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorA.id}/departamento`)
      .set('Cookie', empresaA.cookie)
      .send({ departamentoId: deptB.id })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaboradorA.id}/departamento`)
      .set('Cookie', empresaA.cookie)
      .send({ departamentoId: deptEliminado.id })
      .expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T10 — gestor tenta atribuir Departamento a um Utilizador', async () => {
    const { empresaId } = await registarELogin('t10');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't10g');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't10c');

    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', gestor.cookie)
      .send({ departamentoId: dept.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T11 — isolamento entre tenants: Departamento de uma Empresa nunca visível/afetável a partir doutra', async () => {
    const empresaA = await registarELogin('t11a');
    const empresaB = await registarELogin('t11b');
    const deptA = await adminClient.departamento.create({ data: { empresaId: empresaA.empresaId, nome: 'Vendas A' } });

    const listaB = await request(app.getHttpServer()).get('/departamentos').set('Cookie', empresaB.cookie).expect(200);
    expect(listaB.body.some((d: { id: string }) => d.id === deptA.id)).toBe(false);

    await request(app.getHttpServer())
      .patch(`/departamentos/${deptA.id}`)
      .set('Cookie', empresaB.cookie)
      .send({ nome: 'Hackeado' })
      .expect(404);
    await request(app.getHttpServer()).delete(`/departamentos/${deptA.id}`).set('Cookie', empresaB.cookie).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T12 — todas as ações geram entradas corretas no RegistoAuditoria', async () => {
    const { empresaId, cookie } = await registarELogin('t12');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't12');

    const criado = await request(app.getHttpServer()).post('/departamentos').set('Cookie', cookie).send({ nome: 'Vendas' }).expect(201);
    await request(app.getHttpServer()).patch(`/departamentos/${criado.body.id}`).set('Cookie', cookie).send({ nome: 'Vendas 2' }).expect(200);
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', cookie)
      .send({ departamentoId: criado.body.id })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/utilizadores/${colaborador.id}/departamento`)
      .set('Cookie', cookie)
      .send({ departamentoId: null })
      .expect(200);
    await request(app.getHttpServer()).delete(`/departamentos/${criado.body.id}`).set('Cookie', cookie).expect(200);

    const entradaCriar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'criar', entidade: 'Departamento', entidadeId: criado.body.id },
    });
    expect(entradaCriar.detalhe).toEqual({ dados: { nome: 'Vendas' } });

    const entradaAtualizar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'atualizar', entidade: 'Departamento', entidadeId: criado.body.id },
    });
    expect(entradaAtualizar.detalhe).toEqual({ alteracoes: { nome: { anterior: 'Vendas', novo: 'Vendas 2' } } });

    const entradasAtribuir = await adminClient.registoAuditoria.findMany({
      where: { empresaId, acao: 'atribuir_departamento', entidadeId: colaborador.id },
      orderBy: { timestamp: 'asc' },
    });
    expect(entradasAtribuir).toHaveLength(2);
    expect(entradasAtribuir[0].detalhe).toEqual({ departamentoAnterior: null, departamentoNovo: criado.body.id });
    expect(entradasAtribuir[1].detalhe).toEqual({ departamentoAnterior: criado.body.id, departamentoNovo: null });

    const entradaEliminar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'eliminar', entidade: 'Departamento', entidadeId: criado.body.id },
    });
    expect(entradaEliminar.detalhe).toHaveProperty('eliminadoEm');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

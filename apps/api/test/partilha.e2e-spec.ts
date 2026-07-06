import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { AuthorizationService } from '../src/modules/fundacao/autorizacao/authorization.service';
import { tenantContext } from '../src/modules/fundacao/tenant/tenant-context';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * Partilha (Passo 7) — mecanismo `podeAcederViaPartilha`, regras de
 * autoridade P1-P5, endpoints `/partilhas` e integração com auditoria
 * (Especificação Técnica do Passo 7). Entidades `Cliente`/`Processo`
 * mínimas, criadas diretamente via `adminClient` — sem CRUD/módulo próprio
 * (decisão 2.1.A desse documento).
 */
describe('Partilha (Convidado)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let authorizationService: AuthorizationService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    authorizationService = moduleRef.get(AuthorizationService);

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await adminClient.$disconnect();
    await app.close();
  });

  async function registarELogin(sufixo: string) {
    const email = `partilha-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Partilha ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
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

  it('T1 — admin_empresa concede Partilha de um Cliente a um Convidado da mesma Empresa', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t1');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T1', tipo: 'empresa_cliente', ownerId: adminId } });
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't1');

    const resposta = await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id })
      .expect(201);

    const partilha = await adminClient.partilha.findUniqueOrThrow({ where: { id: resposta.body.id } });
    expect(partilha.nivelAcesso).toBe('leitura');
    expect(partilha.revogadoEm).toBeNull();

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — colaborador concede Partilha sobre um Cliente de que é owner', async () => {
    const { empresaId } = await registarELogin('t2');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't2');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't2');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T2', tipo: 'empresa_cliente', ownerId: colaborador.id } });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', colaborador.cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — colaborador tenta conceder Partilha sobre um Cliente de que não é owner', async () => {
    const { empresaId, adminId } = await registarELogin('t3');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't3');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't3');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T3', tipo: 'empresa_cliente', ownerId: adminId } });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', colaborador.cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — gestor concede Partilha sobre um Processo do seu Departamento', async () => {
    const { empresaId, adminId } = await registarELogin('t4');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas T4' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't4', dept.id);
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't4');
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo T4', responsavelId: adminId, departamentoId: dept.id },
    });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', gestor.cookie)
      .send({ entidadeTipo: 'processo', entidadeId: processo.id, convidadoId: convidado.id })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — gestor tenta conceder Partilha sobre um Processo de outro Departamento', async () => {
    const { empresaId, adminId } = await registarELogin('t5');
    const deptVendas = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas T5' } });
    const deptSuporte = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte T5' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't5', deptVendas.id);
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't5');
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo T5', responsavelId: adminId, departamentoId: deptSuporte.id },
    });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', gestor.cookie)
      .send({ entidadeTipo: 'processo', entidadeId: processo.id, convidadoId: convidado.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — tentativa de conceder Partilha a um Utilizador que não tem papel Convidado', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t6');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't6');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T6', tipo: 'empresa_cliente', ownerId: adminId } });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: colaborador.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — tentativa de conceder Partilha a um Utilizador de outra Empresa', async () => {
    const empresaA = await registarELogin('t7a');
    const empresaB = await registarELogin('t7b');
    const convidadoOutraEmpresa = await criarUtilizador(empresaB.empresaId, Papel.convidado, 't7');
    const cliente = await adminClient.cliente.create({
      data: { empresaId: empresaA.empresaId, nome: 'Cliente T7', tipo: 'empresa_cliente', ownerId: empresaA.adminId },
    });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', empresaA.cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidadoOutraEmpresa.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T8 — Convidado tenta conceder ou revogar qualquer Partilha', async () => {
    const { empresaId, adminId } = await registarELogin('t8');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't8');
    const outroConvidado = await criarUtilizador(empresaId, Papel.convidado, 't8b');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T8', tipo: 'empresa_cliente', ownerId: adminId } });

    await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', convidado.cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: outroConvidado.id })
      .expect(403);

    const partilhaExistente = await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: outroConvidado.id, concedidoPorId: adminId },
    });
    await request(app.getHttpServer()).delete(`/partilhas/${partilhaExistente.id}`).set('Cookie', convidado.cookie).expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9/T10/T11 — podeAcederViaPartilha reflete a Partilha ativa, a entidade correta, e a revogação imediata', async () => {
    const { empresaId, adminId } = await registarELogin('t9');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't9');
    const clienteA = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T9-A', tipo: 'empresa_cliente', ownerId: adminId } });
    const clienteB = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T9-B', tipo: 'empresa_cliente', ownerId: adminId } });
    const partilha = await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: clienteA.id, convidadoId: convidado.id, concedidoPorId: adminId },
    });

    const comoConvidado = <T>(fn: () => Promise<T>) =>
      tenantContext.run({ utilizadorId: convidado.id, empresaId, papel: Papel.convidado }, async () => await fn());

    // T9 — acesso concedido à entidade correta.
    await expect(comoConvidado(() => authorizationService.podeAcederViaPartilha('cliente', clienteA.id))).resolves.toBe(true);

    // T10 — nenhum acesso a uma entidade diferente.
    await expect(comoConvidado(() => authorizationService.podeAcederViaPartilha('cliente', clienteB.id))).resolves.toBe(false);

    // T11 — após revogação, acesso deixa de ser concedido imediatamente.
    await adminClient.partilha.update({ where: { id: partilha.id }, data: { revogadoEm: new Date() } });
    await expect(comoConvidado(() => authorizationService.podeAcederViaPartilha('cliente', clienteA.id))).resolves.toBe(false);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — GET /partilhas como Convidado só devolve as que lhe foram concedidas', async () => {
    const { empresaId, adminId } = await registarELogin('t12');
    const convidadoA = await criarUtilizador(empresaId, Papel.convidado, 't12a');
    const convidadoB = await criarUtilizador(empresaId, Papel.convidado, 't12b');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T12', tipo: 'empresa_cliente', ownerId: adminId } });
    await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidadoA.id, concedidoPorId: adminId },
    });
    await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidadoB.id, concedidoPorId: adminId },
    });

    const resposta = await request(app.getHttpServer()).get('/partilhas').set('Cookie', convidadoA.cookie).expect(200);

    expect(resposta.body.every((p: { convidadoId: string }) => p.convidadoId === convidadoA.id)).toBe(true);
    expect(resposta.body.length).toBeGreaterThan(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T13 — GET /partilhas como admin_empresa devolve todas as da Empresa', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t13');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't13');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T13', tipo: 'empresa_cliente', ownerId: adminId } });
    await adminClient.partilha.create({
      data: { empresaId, entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id, concedidoPorId: adminId },
    });

    const resposta = await request(app.getHttpServer()).get('/partilhas').set('Cookie', cookie).expect(200);
    expect(resposta.body.length).toBeGreaterThanOrEqual(1);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T14 — concessão e revogação geram entradas corretas no RegistoAuditoria', async () => {
    const { empresaId, cookie, adminId } = await registarELogin('t14');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't14');
    const cliente = await adminClient.cliente.create({ data: { empresaId, nome: 'Cliente T14', tipo: 'empresa_cliente', ownerId: adminId } });

    const concessao = await request(app.getHttpServer())
      .post('/partilhas')
      .set('Cookie', cookie)
      .send({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id })
      .expect(201);

    const entradaCriar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'criar', entidade: 'Partilha', entidadeId: concessao.body.id },
    });
    expect(entradaCriar.detalhe).toEqual({ entidadeTipo: 'cliente', entidadeId: cliente.id, convidadoId: convidado.id });

    await request(app.getHttpServer()).delete(`/partilhas/${concessao.body.id}`).set('Cookie', cookie).expect(200);

    const entradaEliminar = await adminClient.registoAuditoria.findFirstOrThrow({
      where: { empresaId, acao: 'eliminar', entidade: 'Partilha', entidadeId: concessao.body.id },
    });
    expect(entradaEliminar.detalhe).toHaveProperty('revogadoEm');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T15 — isolamento entre tenants: Partilha de uma Empresa nunca é visível/afetável a partir doutra', async () => {
    const empresaA = await registarELogin('t15a');
    const empresaB = await registarELogin('t15b');
    const convidadoA = await criarUtilizador(empresaA.empresaId, Papel.convidado, 't15a');
    const clienteA = await adminClient.cliente.create({
      data: { empresaId: empresaA.empresaId, nome: 'Cliente T15', tipo: 'empresa_cliente', ownerId: empresaA.adminId },
    });
    const partilhaA = await adminClient.partilha.create({
      data: {
        empresaId: empresaA.empresaId,
        entidadeTipo: 'cliente',
        entidadeId: clienteA.id,
        convidadoId: convidadoA.id,
        concedidoPorId: empresaA.adminId,
      },
    });

    // Admin da Empresa B não vê a Partilha da Empresa A na listagem.
    const listaB = await request(app.getHttpServer()).get('/partilhas').set('Cookie', empresaB.cookie).expect(200);
    expect(listaB.body.some((p: { id: string }) => p.id === partilhaA.id)).toBe(false);

    // Admin da Empresa B não consegue revogar a Partilha da Empresa A (Camada 1 — id inexistente no seu escopo).
    await request(app.getHttpServer()).delete(`/partilhas/${partilhaA.id}`).set('Cookie', empresaB.cookie).expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });
});

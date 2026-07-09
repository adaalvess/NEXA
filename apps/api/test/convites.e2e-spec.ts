import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ComercialModule } from '../src/modules/comercial/comercial.module';
import { IaModule } from '../src/modules/ia/ia.module';
import { EMAIL_ADAPTER } from '../src/modules/fundacao/email/adapters/email-adapter.interface';
import { FakeEmailAdapter } from '../src/modules/fundacao/email/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * `POST /convites`, `GET /convites/:token`, `POST /convites/:token/aceitar`
 * (UC-02; Especificação Técnica do Passo 30) — corre contra `nexa_test` via
 * HTTP real, `FakeEmailAdapter` nunca faz uma chamada de rede real.
 *
 * `ComercialModule`/`IaModule` importados desde o Passo 33 (RN-10, T19-T26)
 * — necessário para o `SubscricaoListener` criar `SubscricaoPlano`
 * reativamente no registo (Passo 19), pré-requisito para testar o limite de
 * Utilizadores. Nunca ativa `@BloqueadoPorSubscricao()` (RN-11) em nenhum
 * endpoint de Convite — decisão já fixada no Passo 30, sem alteração.
 */
describe('Convites (Passo 30)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let fakeAdapter: FakeEmailAdapter;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });
    fakeAdapter = new FakeEmailAdapter();

    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ComercialModule, IaModule] })
      .overrideProvider(EMAIL_ADAPTER)
      .useValue(fakeAdapter)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
    process.env.WEB_APP_URL = process.env.WEB_APP_URL ?? 'http://localhost:3000';
  });

  afterAll(async () => {
    await adminClient.$disconnect();
    await app.close();
  });

  beforeEach(() => {
    fakeAdapter.chamadas = 0;
    fakeAdapter.ultimaMensagem = undefined;
    fakeAdapter.deveFalhar = false;
  });

  async function registarELogin(sufixo: string) {
    const email = `convite-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Convite ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string, empresaId: login.body.empresaId as string, email };
  }

  async function criarUtilizador(empresaId: string, papel: Papel, sufixo: string, departamentoId?: string) {
    return adminClient.utilizador.create({
      data: { empresaId, nome: `Utilizador ${sufixo}`, email: `${sufixo}-${Date.now()}@teste.pt`, passwordHash, papel, departamentoId },
    });
  }

  async function login(email: string) {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return res.headers['set-cookie'][0] as string;
  }

  function extrairToken(): string {
    const html = fakeAdapter.ultimaMensagem?.corpoHtml ?? '';
    const match = html.match(/\/convites\/([a-f0-9]+)/);
    if (!match) {
      throw new Error('Token não encontrado no corpo do email simulado.');
    }
    return match[1];
  }

  async function definirLimiteUtilizadores(empresaId: string, limite: number | null) {
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { limiteUtilizadores: limite } });
  }

  it('T1 — admin_empresa convida com sucesso, email enviado, token nunca na resposta', async () => {
    const { cookie, empresaId } = await registarELogin('t1');

    const res = await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'convidado-t1@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    expect(res.body.estado).toBe('pendente');
    expect(res.body).not.toHaveProperty('token');
    expect(fakeAdapter.chamadas).toBe(1);
    expect(fakeAdapter.ultimaMensagem?.destinatario).toBe('convidado-t1@teste.pt');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — gestor convida dentro do seu Departamento com sucesso', async () => {
    const { empresaId } = await registarELogin('t2');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't2-gestor', dept.id);
    const cookieGestor = await login(gestor.email);

    const res = await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieGestor)
      .send({ email: 'convidado-t2@teste.pt', papelPretendido: 'colaborador', departamentoPretendidoId: dept.id })
      .expect(201);

    expect(res.body.departamentoPretendidoId).toBe(dept.id);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — gestor sem Departamento próprio não pode convidar', async () => {
    const { empresaId } = await registarELogin('t3');
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't3-gestor');
    const cookieGestor = await login(gestor.email);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieGestor)
      .send({ email: 'convidado-t3@teste.pt', papelPretendido: 'colaborador' })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — gestor não pode convidar com papelPretendido admin_empresa', async () => {
    const { empresaId } = await registarELogin('t4');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const gestor = await criarUtilizador(empresaId, Papel.gestor, 't4-gestor', dept.id);
    const cookieGestor = await login(gestor.email);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieGestor)
      .send({ email: 'convidado-t4@teste.pt', papelPretendido: 'admin_empresa', departamentoPretendidoId: dept.id })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — colaborador e convidado não podem convidar', async () => {
    const { empresaId } = await registarELogin('t5');
    const colaborador = await criarUtilizador(empresaId, Papel.colaborador, 't5-colab');
    const convidado = await criarUtilizador(empresaId, Papel.convidado, 't5-conv');
    const cookieColab = await login(colaborador.email);
    const cookieConv = await login(convidado.email);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieColab)
      .send({ email: 'x-t5a@teste.pt', papelPretendido: 'colaborador' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieConv)
      .send({ email: 'x-t5b@teste.pt', papelPretendido: 'colaborador' })
      .expect(403);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — papelPretendido super_admin devolve 400', async () => {
    const { cookie, empresaId } = await registarELogin('t6');

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'x-t6@teste.pt', papelPretendido: 'super_admin' })
      .expect(400);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — departamentoPretendidoId inexistente devolve 404', async () => {
    const { cookie, empresaId } = await registarELogin('t7');

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'x-t7@teste.pt', papelPretendido: 'colaborador', departamentoPretendidoId: 'inexistente' })
      .expect(404);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — email já corresponde a Utilizador existente (global) devolve 409', async () => {
    const { cookie, empresaId, email } = await registarELogin('t8');

    await request(app.getHttpServer()).post('/convites').set('Cookie', cookie).send({ email, papelPretendido: 'colaborador' }).expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — segundo convite pendente para o mesmo email na mesma Empresa devolve 409', async () => {
    const { cookie, empresaId } = await registarELogin('t9');

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'duplicado-t9@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'duplicado-t9@teste.pt', papelPretendido: 'colaborador' })
      .expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T10 — falha no envio do email devolve 502, nenhum ConviteUtilizador persistido', async () => {
    const { cookie, empresaId } = await registarELogin('t10');
    fakeAdapter.deveFalhar = true;

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'falha-t10@teste.pt', papelPretendido: 'colaborador' })
      .expect(502);

    const convites = await adminClient.conviteUtilizador.findMany({ where: { empresaId, email: 'falha-t10@teste.pt' } });
    expect(convites).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T11 — GET /convites/:token com token válido devolve 200, sem token no corpo', async () => {
    const { cookie, empresaId } = await registarELogin('t11');
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'preview-t11@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();

    const res = await request(app.getHttpServer()).get(`/convites/${token}`).expect(200);
    expect(res.body.email).toBe('preview-t11@teste.pt');
    expect(res.body.expirado).toBe(false);
    expect(res.body).not.toHaveProperty('token');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — GET /convites/:token com token inexistente devolve 404', async () => {
    await request(app.getHttpServer()).get('/convites/token-inexistente').expect(404);
  });

  it('T13 — GET /convites/:token com convite expirado devolve expirado: true', async () => {
    const { cookie, empresaId } = await registarELogin('t13');
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'expirado-t13@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();
    await adminClient.conviteUtilizador.update({ where: { token }, data: { expiraEm: new Date(Date.now() - 1000) } });

    const res = await request(app.getHttpServer()).get(`/convites/${token}`).expect(200);
    expect(res.body.expirado).toBe(true);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T14 — aceitar com sucesso cria Utilizador com papel/Departamento do convite; login imediato funciona', async () => {
    const { cookie, empresaId } = await registarELogin('t14');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Suporte' } });
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'aceitar-t14@teste.pt', papelPretendido: 'colaborador', departamentoPretendidoId: dept.id })
      .expect(201);
    const token = extrairToken();

    const res = await request(app.getHttpServer())
      .post(`/convites/${token}/aceitar`)
      .send({ nome: 'Pessoa Convidada', password: 'novaSenha1234' })
      .expect(201);
    expect(res.body.empresaId).toBe(empresaId);

    const utilizador = await adminClient.utilizador.findUnique({ where: { id: res.body.utilizadorId } });
    expect(utilizador?.papel).toBe('colaborador');
    expect(utilizador?.departamentoId).toBe(dept.id);

    const convite = await adminClient.conviteUtilizador.findUnique({ where: { token } });
    expect(convite?.estado).toBe('aceite');

    await request(app.getHttpServer()).post('/auth/login').send({ email: 'aceitar-t14@teste.pt', password: 'novaSenha1234' }).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T15 — aceitar um convite já aceite devolve 409', async () => {
    const { cookie, empresaId } = await registarELogin('t15');
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'aceite-t15@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();
    await request(app.getHttpServer()).post(`/convites/${token}/aceitar`).send({ nome: 'Pessoa Convidada', password: 'novaSenha1234' }).expect(201);

    await request(app.getHttpServer()).post(`/convites/${token}/aceitar`).send({ nome: 'Outra Pessoa', password: 'outraSenha1234' }).expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T16 — aceitar um convite expirado devolve 409', async () => {
    const { cookie, empresaId } = await registarELogin('t16');
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'expirado-t16@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();
    await adminClient.conviteUtilizador.update({ where: { token }, data: { expiraEm: new Date(Date.now() - 1000) } });

    await request(app.getHttpServer()).post(`/convites/${token}/aceitar`).send({ nome: 'Pessoa Convidada', password: 'novaSenha1234' }).expect(409);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T17 — aceitar com email entretanto já registado por outra via devolve 409', async () => {
    const { cookie, empresaId } = await registarELogin('t17');
    const emailCorrida = `corrida-t17-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: emailCorrida, papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();

    // Alguém regista essa mesma conta entretanto por outra via.
    const nomeOutraEmpresa = `Outra t17 ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: nomeOutraEmpresa, pais: 'PT' }, utilizador: { nome: 'Outro', email: emailCorrida, password: SENHA } })
      .expect(201);

    await request(app.getHttpServer()).post(`/convites/${token}/aceitar`).send({ nome: 'Pessoa Convidada', password: 'novaSenha1234' }).expect(409);

    const outraEmpresa = await adminClient.empresa.findFirst({ where: { nome: nomeOutraEmpresa } });
    await limparEmpresasDeTeste(adminClient, [empresaId, outraEmpresa!.id]);
  });

  it('T18 — isolamento de tenant: convite de uma Empresa não é visível/afeta outra', async () => {
    const { cookie, empresaId } = await registarELogin('t18a');
    const { cookie: cookieOutra, empresaId: outraEmpresaId } = await registarELogin('t18b');

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'isolamento-t18@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    // Mesmo email, Empresa diferente — CV-06 é scoped à Empresa (Camada 1),
    // nunca um conflito global de convites (só CV-05, contas já criadas, é global).
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookieOutra)
      .send({ email: 'isolamento-t18@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    const convitesEmpresa1 = await adminClient.conviteUtilizador.findMany({ where: { empresaId } });
    const convitesEmpresa2 = await adminClient.conviteUtilizador.findMany({ where: { empresaId: outraEmpresaId } });
    expect(convitesEmpresa1).toHaveLength(1);
    expect(convitesEmpresa2).toHaveLength(1);
    expect(convitesEmpresa1[0].id).not.toBe(convitesEmpresa2[0].id);

    await limparEmpresasDeTeste(adminClient, [empresaId, outraEmpresaId]);
  });

  // RN-10 (Especificação Técnica do Passo 33) — bloqueio ao atingir
  // `limiteUtilizadores`. Toda Empresa nasce com trial Professional
  // (limite 20, Passo 19) — `definirLimiteUtilizadores` ajusta para um
  // valor pequeno e previsível em cada teste.

  it('T19 — plano sem limite (null) permite convidar independentemente da contagem', async () => {
    const { cookie, empresaId } = await registarELogin('t19');
    await definirLimiteUtilizadores(empresaId, null);
    await criarUtilizador(empresaId, Papel.colaborador, 't19-extra');

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'sem-limite-t19@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T20 — ativos == limite bloqueia POST /convites com 402/LIMITE_UTILIZADORES_ATINGIDO', async () => {
    const { cookie, empresaId } = await registarELogin('t20');
    await definirLimiteUtilizadores(empresaId, 1); // só o próprio admin já atinge o limite.

    const res = await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'bloqueado-t20@teste.pt', papelPretendido: 'colaborador' })
      .expect(402);

    expect(res.body.code).toBe('LIMITE_UTILIZADORES_ATINGIDO');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T21 — (ativos + convites pendentes) == limite bloqueia, mesmo com ativos < limite', async () => {
    const { cookie, empresaId } = await registarELogin('t21');
    await definirLimiteUtilizadores(empresaId, 2); // admin (1 ativo) + 1 convite pendente já atinge.

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'primeiro-t21@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'segundo-t21@teste.pt', papelPretendido: 'colaborador' })
      .expect(402);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T22 — expiração natural de um convite pendente liberta espaço para um novo convite', async () => {
    const { cookie, empresaId } = await registarELogin('t22');
    await definirLimiteUtilizadores(empresaId, 2);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'expira-t22@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    // Confirma o bloqueio enquanto o convite anterior continua pendente.
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'bloqueado-t22@teste.pt', papelPretendido: 'colaborador' })
      .expect(402);

    await adminClient.conviteUtilizador.updateMany({ where: { empresaId, email: 'expira-t22@teste.pt' }, data: { expiraEm: new Date(Date.now() - 1000) } });

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'novo-t22@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T23 — (ativos + pendentes) < limite permite convidar normalmente', async () => {
    const { cookie, empresaId } = await registarELogin('t23');
    await definirLimiteUtilizadores(empresaId, 5);

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'com-espaco-t23@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T24 — mensagem de erro inclui o valor concreto do limite', async () => {
    const { cookie, empresaId } = await registarELogin('t24');
    await definirLimiteUtilizadores(empresaId, 1);

    const res = await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'mensagem-t24@teste.pt', papelPretendido: 'colaborador' })
      .expect(402);

    expect(res.body.message).toContain('1');
    expect(res.body.message.toLowerCase()).toContain('limite');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T25 — aceitação bloqueada com 402 se o limite for atingido entre o envio e a aceitação', async () => {
    const { cookie, empresaId } = await registarELogin('t25');
    await definirLimiteUtilizadores(empresaId, 2); // admin (1) + este convite (2) cabem exatamente.

    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'tardio-t25@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);
    const token = extrairToken();

    // Outro Utilizador é criado diretamente (simula outro convite aceite
    // entretanto, ou um upgrade/downgrade de plano) — o limite já não tem espaço.
    await criarUtilizador(empresaId, Papel.colaborador, 't25-entretanto');

    const res = await request(app.getHttpServer())
      .post(`/convites/${token}/aceitar`)
      .send({ nome: 'Pessoa Tardia', password: 'novaSenha1234' })
      .expect(402);
    expect(res.body.code).toBe('LIMITE_UTILIZADORES_ATINGIDO');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T26 — Utilizador eliminado (soft-delete) não conta como ativo', async () => {
    const { cookie, empresaId } = await registarELogin('t26');
    await definirLimiteUtilizadores(empresaId, 2);
    const eliminado = await criarUtilizador(empresaId, Papel.colaborador, 't26-eliminado');
    await adminClient.utilizador.update({ where: { id: eliminado.id }, data: { eliminadoEm: new Date() } });

    // admin (1 ativo) + eliminado (não conta) = 1 < limite(2) — convite permitido.
    await request(app.getHttpServer())
      .post('/convites')
      .set('Cookie', cookie)
      .send({ email: 'apesar-eliminado-t26@teste.pt', papelPretendido: 'colaborador' })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

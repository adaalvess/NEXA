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
 * `PATCH /utilizadores/me` (Especificação Técnica do Passo 27) — self-edit
 * de perfil, primeiro endpoint sem `PermissaoGuard` (Decisão B). Corre
 * contra `nexa_test` via HTTP real.
 */
describe('Perfil — PATCH /utilizadores/me (Passo 27)', () => {
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
    const email = `perfil-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Perfil ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA } })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return { cookie: login.headers['set-cookie'][0] as string, empresaId: login.body.empresaId as string, email };
  }

  it('T1 — atualizar só o nome, sem tocar na password', async () => {
    const { cookie, empresaId } = await registarELogin('t1');

    const res = await request(app.getHttpServer()).patch('/utilizadores/me').set('Cookie', cookie).send({ nome: 'Novo Nome' }).expect(200);
    expect(res.body.nome).toBe('Novo Nome');

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — atualizar a password com a passwordAtual correta permite login com a nova', async () => {
    const { cookie, empresaId, email } = await registarELogin('t2');

    await request(app.getHttpServer())
      .patch('/utilizadores/me')
      .set('Cookie', cookie)
      .send({ passwordAtual: SENHA, passwordNova: 'novaSenha1234' })
      .expect(200);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'novaSenha1234' }).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — passwordAtual incorreta devolve 401 e não altera a password', async () => {
    const { cookie, empresaId, email } = await registarELogin('t3');

    await request(app.getHttpServer())
      .patch('/utilizadores/me')
      .set('Cookie', cookie)
      .send({ passwordAtual: 'errada12345', passwordNova: 'novaSenha1234' })
      .expect(401);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — passwordNova sem passwordAtual devolve 400', async () => {
    const { cookie, empresaId } = await registarELogin('t4');

    await request(app.getHttpServer()).patch('/utilizadores/me').set('Cookie', cookie).send({ passwordNova: 'novaSenha1234' }).expect(400);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — corpo vazio devolve 400', async () => {
    const { cookie, empresaId } = await registarELogin('t5');

    await request(app.getHttpServer()).patch('/utilizadores/me').set('Cookie', cookie).send({}).expect(400);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — mudar a password invalida as outras sessões ativas, mantendo a atual', async () => {
    const { cookie: cookieSessao1, empresaId, email } = await registarELogin('t6');
    const loginSessao2 = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    const cookieSessao2 = loginSessao2.headers['set-cookie'][0] as string;
    const sessao2Id = cookieSessao2.split(';')[0].split('=')[1];

    await request(app.getHttpServer())
      .patch('/utilizadores/me')
      .set('Cookie', cookieSessao1)
      .send({ passwordAtual: SENHA, passwordNova: 'novaSenha1234' })
      .expect(200);

    // Sessão 2 (diferente da que fez o pedido) deixou de ser válida.
    const sessao2 = await adminClient.sessao.findUnique({ where: { id: sessao2Id } });
    expect(sessao2).toBeNull();
    await request(app.getHttpServer()).get('/auth/eu').set('Cookie', cookieSessao2).expect(401);

    // Sessão 1 (a que fez o próprio pedido) continua válida.
    await request(app.getHttpServer()).get('/auth/eu').set('Cookie', cookieSessao1).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T7 — convidado consegue chamar este endpoint sobre si próprio, sem PermissaoGuard a bloquear', async () => {
    const { empresaId } = await registarELogin('t7');
    const emailConvidado = `perfil-t7-convidado-${Date.now()}@teste.pt`;
    await adminClient.utilizador.create({
      data: { empresaId, nome: 'Convidado', email: emailConvidado, passwordHash, papel: Papel.convidado },
    });
    const loginConvidado = await request(app.getHttpServer()).post('/auth/login').send({ email: emailConvidado, password: SENHA }).expect(200);
    const cookieConvidado = loginConvidado.headers['set-cookie'][0] as string;

    await request(app.getHttpServer()).patch('/utilizadores/me').set('Cookie', cookieConvidado).send({ nome: 'Convidado Renomeado' }).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

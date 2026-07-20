import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, EstadoProcesso, PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ProcessosModule } from '../src/modules/processos/processos.module';
import { CrmModule } from '../src/modules/crm/crm.module';
import { IaModule } from '../src/modules/ia/ia.module';
import { ComercialModule } from '../src/modules/comercial/comercial.module';
import { AI_ADAPTER } from '../src/modules/ia/gateway/adapters/ai-adapter.interface';
import { FakeAdapter } from '../src/modules/ia/gateway/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';
const RESPOSTA_ESPERADA = {
  statusCode: 402,
  code: 'SUBSCRICAO_LIMITADA',
  message: 'A tua Empresa está em acesso limitado (trial expirado ou subscrição inativa). Contacta o Administrador da Empresa para atualizar o plano.',
};

/**
 * Enforcement transversal de RN-11 (Especificação Técnica do Passo 20) —
 * `SubscricaoGuard`/`SubscricaoExceptionFilter` globais, resposta uniforme
 * exigida explicitamente pela Fundadora/CEO. Único ficheiro de teste a
 * importar `ProcessosModule`, `CrmModule`, `IaModule` e `ComercialModule`
 * em simultâneo — necessário para T6 provar uniformidade entre módulos.
 */
describe('Comercial — Enforcement de RN-11 (Passo 20)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FundacaoModule, ProcessosModule, CrmModule, IaModule, ComercialModule],
    })
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
    const email = `enforcement-${sufixo}-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: `Enforcement ${sufixo}`, pais: 'PT' }, utilizador: { nome: `Admin ${sufixo}`, email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    return {
      cookie: login.headers['set-cookie'][0] as string,
      empresaId: login.body.empresaId as string,
      utilizadorId: login.body.utilizadorId as string,
    };
  }

  async function limitarSubscricao(empresaId: string) {
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { estado: 'limitada' } });
  }

  async function expirarTrial(empresaId: string) {
    const iniciadoHa15Dias = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { trialIniciadoEm: iniciadoHa15Dias } });
  }

  it('T1 — POST /processos bloqueado com 402/SUBSCRICAO_LIMITADA quando a subscrição está limitada', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t1');
    await limitarSubscricao(empresaId);

    const res = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Processo Bloqueado', responsavelId: utilizadorId })
      .expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T2 — POST /clientes bloqueado com a mesma resposta', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t2');
    await limitarSubscricao(empresaId);

    const res = await request(app.getHttpServer())
      .post('/clientes')
      .set('Cookie', cookie)
      .send({ nome: 'Cliente Bloqueado', tipo: 'empresa_cliente', ownerId: utilizadorId })
      .expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T3 — POST /clientes/:id/interacoes bloqueado com a mesma resposta', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t3');
    const cliente = await adminClient.cliente.create({
      data: { empresaId, nome: 'Cliente Existente', tipo: 'empresa_cliente', ownerId: utilizadorId, contactoPrincipal: 'contacto@teste.pt' },
    });
    await limitarSubscricao(empresaId);

    const res = await request(app.getHttpServer())
      .post(`/clientes/${cliente.id}/interacoes`)
      .set('Cookie', cookie)
      .send({ tipo: 'nota' })
      .expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T4 — POST /ia/perguntar bloqueado com a mesma resposta', async () => {
    const { cookie, empresaId } = await registarELogin('t4');
    await limitarSubscricao(empresaId);

    const res = await request(app.getHttpServer()).post('/ia/perguntar').set('Cookie', cookie).send({ pergunta: 'Olá?' }).expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T5 — POST /ia/sugestoes (geração) bloqueado com a mesma resposta', async () => {
    const { cookie, empresaId } = await registarELogin('t5');
    await limitarSubscricao(empresaId);

    const res = await request(app.getHttpServer()).post('/ia/sugestoes').set('Cookie', cookie).send({}).expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T6 — prova estrutural de uniformidade: a resposta de Processos e a de IA são byte-a-byte idênticas', async () => {
    const empresaA = await registarELogin('t6a');
    await limitarSubscricao(empresaA.empresaId);
    const resProcessos = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', empresaA.cookie)
      .send({ titulo: 'X', responsavelId: empresaA.utilizadorId })
      .expect(402);

    const empresaB = await registarELogin('t6b');
    await limitarSubscricao(empresaB.empresaId);
    const resIa = await request(app.getHttpServer()).post('/ia/perguntar').set('Cookie', empresaB.cookie).send({ pergunta: 'Olá?' }).expect(402);

    expect(resProcessos.status).toBe(resIa.status);
    expect(JSON.stringify(resProcessos.body)).toBe(JSON.stringify(resIa.body));
    expect(resProcessos.body).toEqual(RESPOSTA_ESPERADA);
    expect(resIa.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaA.empresaId, empresaB.empresaId]);
  });

  it('T7 — PATCH /processos/:id nunca bloqueado, mesmo com subscrição limitada (RN-10)', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t7');
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Existente', responsavelId: utilizadorId, estado: EstadoProcesso.por_fazer },
    });
    await limitarSubscricao(empresaId);

    await request(app.getHttpServer()).patch(`/processos/${processo.id}`).set('Cookie', cookie).send({ titulo: 'Editado' }).expect(200);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T8 — POST /ia/sugestoes/:id/confirmar nunca bloqueado, mesmo com subscrição limitada', async () => {
    const { cookie, empresaId } = await registarELogin('t8');
    const dept = await adminClient.departamento.create({ data: { empresaId, nome: 'Vendas' } });
    const passwordHash = (await adminClient.utilizador.findFirst({ where: { empresaId } }))!.passwordHash;
    const responsavel = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Responsavel', email: `resp-t8-${Date.now()}@teste.pt`, passwordHash, papel: Papel.colaborador, departamentoId: dept.id },
    });
    const candidato = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Candidato', email: `cand-t8-${Date.now()}@teste.pt`, passwordHash, papel: Papel.colaborador, departamentoId: dept.id },
    });
    const processo = await adminClient.processo.create({
      data: { empresaId, titulo: 'Processo Sugestao', responsavelId: responsavel.id, departamentoId: dept.id, estado: EstadoProcesso.por_fazer },
    });
    const sugestao = await adminClient.sugestaoIA.create({
      data: {
        empresaId,
        utilizadorId: responsavel.id,
        tipo: 'sugestao_acao',
        estado: 'pendente',
        entidadeRef: processo.id,
        fornecedorUsado: 'deterministico',
        acaoPayload: { tipo: 'reatribuir_processo', processoId: processo.id, responsavelAtualId: responsavel.id, responsavelSugeridoId: candidato.id },
      },
    });
    await limitarSubscricao(empresaId);

    await request(app.getHttpServer()).post(`/ia/sugestoes/${sugestao.id}/confirmar`).set('Cookie', cookie).send({}).expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T9 — POST /departamentos nunca bloqueado, mesmo com subscrição limitada', async () => {
    const { cookie, empresaId } = await registarELogin('t9');
    await limitarSubscricao(empresaId);

    await request(app.getHttpServer()).post('/departamentos').set('Cookie', cookie).send({ nome: 'Novo Departamento' }).expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T10 — trial recente (dentro dos 14 dias) nunca bloqueado', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t10');

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Processo Trial Recente', responsavelId: utilizadorId })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T11 — trial expirado (estado ainda "trial" na BD) bloqueado corretamente — deteção dinâmica, sem scheduler', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t11');
    await expirarTrial(empresaId);

    const subscricaoAntes = await adminClient.subscricaoPlano.findUniqueOrThrow({ where: { empresaId } });
    expect(subscricaoAntes.estado).toBe('trial'); // nunca escrito por um job — continua "trial" na BD

    const res = await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Processo Trial Expirado', responsavelId: utilizadorId })
      .expect(402);

    expect(res.body).toEqual(RESPOSTA_ESPERADA);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T12 — subscrição "ativa" nunca bloqueada, mesmo com trialIniciadoEm antigo', async () => {
    const { cookie, empresaId, utilizadorId } = await registarELogin('t12');
    await expirarTrial(empresaId);
    await adminClient.subscricaoPlano.update({ where: { empresaId }, data: { estado: 'ativa' } });

    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookie)
      .send({ titulo: 'Processo Ativa', responsavelId: utilizadorId })
      .expect(201);

    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });
});

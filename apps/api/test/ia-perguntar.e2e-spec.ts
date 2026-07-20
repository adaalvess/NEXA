import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { ProcessosModule } from '../src/modules/processos/processos.module';
import { IaModule } from '../src/modules/ia/ia.module';
import { IaService } from '../src/modules/ia/ia.service';
import { AI_ADAPTER } from '../src/modules/ia/gateway/adapters/ai-adapter.interface';
import { FakeAdapter } from '../src/modules/ia/gateway/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

const SENHA = 'senha1234';

/**
 * `POST /ia/perguntar` (UC-05; Especificação Técnica do Passo 16) — primeiro
 * endpoint de produto do M3, primeira cobertura automatizada da metade
 * "pergunta" do fluxo crítico "ações de IA" (NFR-17). Corre contra
 * `nexa_test` via HTTP real (mesmo padrão de `processos.e2e-spec.ts`).
 */
describe('POST /ia/perguntar (Passo 16)', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;
  let passwordHash: string;
  let fakeAdapter: FakeAdapter;
  let iaService: IaService;

  beforeAll(async () => {
    passwordHash = await argon2.hash(SENHA, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 });

    fakeAdapter = new FakeAdapter();
    const moduleRef = await Test.createTestingModule({ imports: [FundacaoModule, ProcessosModule, IaModule] })
      .overrideProvider(AI_ADAPTER)
      .useValue(fakeAdapter)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    iaService = moduleRef.get(IaService);

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await adminClient.$disconnect();
    await app.close();
  });

  let empresaId: string;
  let cookieAdmin: string;

  beforeEach(async () => {
    fakeAdapter.chamadas = 0;
    fakeAdapter.comportamento = 'sucesso';
    fakeAdapter.respostaConfigurada = 'Resposta simulada.';
    fakeAdapter.ultimoPedido = undefined;

    const email = `ia-pergunta-${Date.now()}-${Math.random()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({ empresa: { nome: 'IA Perguntar Teste', pais: 'PT' }, utilizador: { nome: 'Admin', email, password: SENHA }, aceiteTermos: true })
      .expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: SENHA }).expect(200);
    cookieAdmin = login.headers['set-cookie'][0];
    empresaId = login.body.empresaId;
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  it('T1 — pergunta bem-sucedida devolve a resposta e cria SugestaoIA já aceite', async () => {
    fakeAdapter.respostaConfigurada = 'A NEXA responde.';

    const res = await request(app.getHttpServer())
      .post('/ia/perguntar')
      .set('Cookie', cookieAdmin)
      .send({ pergunta: 'O que está atrasado?' })
      .expect(201);

    expect(res.body.resposta).toBe('A NEXA responde.');

    const sugestao = await adminClient.sugestaoIA.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(sugestao.tipo).toBe('pergunta');
    expect(sugestao.estado).toBe('aceite');
    expect(sugestao.fornecedorUsado).toBe('fake');
  });

  it('T2 — RN-07: o resumo de um Colaborador nunca inclui Processos de outro âmbito', async () => {
    const colabX = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Colab X', email: `x-${Date.now()}@teste.pt`, passwordHash, papel: Papel.colaborador },
    });
    const colabY = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Colab Y', email: `y-${Date.now()}@teste.pt`, passwordHash, papel: Papel.colaborador },
    });

    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookieAdmin)
      .send({ titulo: 'Processo Atrasado X', responsavelId: colabX.id, prazo: ontem })
      .expect(201);
    await request(app.getHttpServer())
      .post('/processos')
      .set('Cookie', cookieAdmin)
      .send({ titulo: 'Processo Atrasado Y', responsavelId: colabY.id, prazo: ontem })
      .expect(201);

    const loginX = await request(app.getHttpServer()).post('/auth/login').send({ email: colabX.email, password: SENHA }).expect(200);
    await request(app.getHttpServer())
      .post('/ia/perguntar')
      .set('Cookie', loginX.headers['set-cookie'][0])
      .send({ pergunta: 'O que está atrasado?' })
      .expect(201);

    expect(fakeAdapter.ultimoPedido?.sistema).toContain('Processo Atrasado X');
    expect(fakeAdapter.ultimoPedido?.sistema).not.toContain('Processo Atrasado Y');
  });

  it('T3 — Convidado nunca tem acesso ao Assistente de IA (403)', async () => {
    const convidado = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Convidado', email: `conv-${Date.now()}@teste.pt`, passwordHash, papel: Papel.convidado },
    });
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: convidado.email, password: SENHA }).expect(200);

    await request(app.getHttpServer())
      .post('/ia/perguntar')
      .set('Cookie', login.headers['set-cookie'][0])
      .send({ pergunta: 'Olá?' })
      .expect(403);
  });

  it('T4 — quota excedida devolve 429', async () => {
    process.env.IA_QUOTA_PADRAO_MENSAL = '1';
    try {
      await request(app.getHttpServer()).post('/ia/perguntar').set('Cookie', cookieAdmin).send({ pergunta: 'p1' }).expect(201);
      await request(app.getHttpServer()).post('/ia/perguntar').set('Cookie', cookieAdmin).send({ pergunta: 'p2' }).expect(429);
    } finally {
      delete process.env.IA_QUOTA_PADRAO_MENSAL;
    }
  });

  it('T5 — IA_RETER_CONTEUDO=false cria SugestaoIA sem conteúdo', async () => {
    process.env.IA_RETER_CONTEUDO = 'false';
    try {
      const res = await request(app.getHttpServer())
        .post('/ia/perguntar')
        .set('Cookie', cookieAdmin)
        .send({ pergunta: 'pergunta sensível' })
        .expect(201);

      const sugestao = await adminClient.sugestaoIA.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(sugestao.conteudoPergunta).toBeNull();
      expect(sugestao.conteudoResposta).toBeNull();
    } finally {
      delete process.env.IA_RETER_CONTEUDO;
    }
  });

  it('T6 — aplicarRetencao oculta conteúdo mais antigo que IA_RETENCAO_CONTEUDO_DIAS (sem endpoint de leitura ainda, testado diretamente)', () => {
    process.env.IA_RETENCAO_CONTEUDO_DIAS = '30';
    try {
      const antiga = { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), conteudoPergunta: 'p', conteudoResposta: 'r' };
      const recente = { createdAt: new Date(), conteudoPergunta: 'p', conteudoResposta: 'r' };

      expect(iaService.aplicarRetencao(antiga)).toEqual({ conteudoPergunta: null, conteudoResposta: null });
      expect(iaService.aplicarRetencao(recente)).toEqual({ conteudoPergunta: 'p', conteudoResposta: 'r' });
    } finally {
      delete process.env.IA_RETENCAO_CONTEUDO_DIAS;
    }
  });
});

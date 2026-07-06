import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { SessionGuard } from '../src/modules/fundacao/auth/session.guard';
import { TenantPrismaService } from '../src/modules/fundacao/prisma/tenant-prisma.service';

/**
 * Verificação de que o TenantContext, resolvido pelo `TenantContextMiddleware`,
 * sobrevive através do pedido HTTP real completo (Middleware → Guard →
 * Controller), não apenas no isolamento artificial de
 * `tenant-isolation.e2e-spec.ts`. Necessária porque a primeira tentativa de
 * implementação revelou que o AsyncLocalStorage só propaga corretamente se
 * a operação Prisma for aguardada (`await`) dentro do próprio call stack do
 * `tenantContext.run(...)` — este teste prova que isso acontece naturalmente
 * no pedido HTTP real (o handler do controlador usa `await`, tal como
 * qualquer handler de negócio futuro terá de usar).
 *
 * `ControladorDiagnostico` existe só neste teste — nunca é registado na
 * aplicação real.
 */
@Controller('teste-diagnostico')
class ControladorDiagnostico {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @UseGuards(SessionGuard)
  @Get('departamentos')
  async departamentos() {
    return this.tenantPrisma.client.departamento.findMany({});
  }
}

describe('Propagação do TenantContext via pedido HTTP real', () => {
  let app: INestApplication;
  let adminClient: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FundacaoModule],
      controllers: [ControladorDiagnostico],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    // Fidelidade ao main.ts real (ver Especificação Técnica do Passo 5, correção
    // encontrada ao escrever os testes desse passo — este ficheiro nunca
    // exercitou input inválido, por isso a lacuna não tinha sido revelada aqui).
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
    const email = `diag-${sufixo}-${Date.now()}@teste.pt`;
    await request(app.getHttpServer())
      .post('/auth/registar')
      .send({
        empresa: { nome: `Diag ${sufixo}`, pais: 'PT' },
        utilizador: { nome: `Diag ${sufixo}`, email, password: 'senha1234' },
      })
      .expect(201);

    const respostaLogin = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'senha1234' }).expect(200);

    const cookie = respostaLogin.headers['set-cookie'][0];
    const empresaId: string = respostaLogin.body.empresaId;
    return { cookie, empresaId };
  }

  it('só devolve Departamentos da própria Empresa, através do Middleware → Guard → Controller reais', async () => {
    const empresaA = await registarELogin('a');
    const empresaB = await registarELogin('b');

    await adminClient.departamento.create({ data: { empresaId: empresaA.empresaId, nome: 'Vendas A' } });

    const respostaA = await request(app.getHttpServer())
      .get('/teste-diagnostico/departamentos')
      .set('Cookie', empresaA.cookie)
      .expect(200);
    expect(respostaA.body).toHaveLength(1);
    expect(respostaA.body[0].nome).toBe('Vendas A');

    const respostaB = await request(app.getHttpServer())
      .get('/teste-diagnostico/departamentos')
      .set('Cookie', empresaB.cookie)
      .expect(200);
    expect(respostaB.body).toHaveLength(0);

    await adminClient.empresa.deleteMany({ where: { id: { in: [empresaA.empresaId, empresaB.empresaId] } } });
  });

  it('devolve 401 sem cookie de sessão', async () => {
    await request(app.getHttpServer()).get('/teste-diagnostico/departamentos').expect(401);
  });
});

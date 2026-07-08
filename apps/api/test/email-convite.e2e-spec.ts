import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { FundacaoModule } from '../src/modules/fundacao/fundacao.module';
import { TenantPrismaService } from '../src/modules/fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../src/modules/fundacao/tenant/tenant-context';
import { EMAIL_ADAPTER } from '../src/modules/fundacao/email/adapters/email-adapter.interface';
import { FakeEmailAdapter } from '../src/modules/fundacao/email/adapters/fake.adapter';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

/**
 * Gateway de Email + modelo `ConviteUtilizador` (Especificação Técnica do
 * Passo 29) — primeiro passo do Bloco C do M5. Sem endpoint de produto
 * neste passo (mesmo padrão sem-HTTP de `ia-gateway.e2e-spec.ts`,
 * Passo 15) — `FakeEmailAdapter` nunca faz uma chamada de rede real.
 */
describe('Gateway de Email + ConviteUtilizador (Passo 29)', () => {
  let moduleRef: TestingModule;
  let tenantPrisma: TenantPrismaService;
  let fakeAdapter: FakeEmailAdapter;
  let adminClient: PrismaClient;
  let empresaId: string;
  let adminUtilizadorId: string;

  beforeAll(async () => {
    fakeAdapter = new FakeEmailAdapter();
    moduleRef = await Test.createTestingModule({ imports: [FundacaoModule] })
      .overrideProvider(EMAIL_ADAPTER)
      .useValue(fakeAdapter)
      .compile();

    await moduleRef.init();
    tenantPrisma = moduleRef.get(TenantPrismaService);

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await moduleRef.close();
    await adminClient.$disconnect();
  });

  beforeEach(async () => {
    const empresa = await adminClient.empresa.create({ data: { nome: 'Email Convite Teste', pais: 'PT' } });
    empresaId = empresa.id;
    const admin = await adminClient.utilizador.create({
      data: { empresaId, nome: 'Admin', email: `admin-${Date.now()}@teste.pt`, passwordHash: 'hash', papel: 'admin_empresa' },
    });
    adminUtilizadorId = admin.id;

    fakeAdapter.chamadas = 0;
    fakeAdapter.ultimaMensagem = undefined;
    fakeAdapter.deveFalhar = false;
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  function comoTenant<T>(fn: () => Promise<T>): Promise<T> {
    return tenantContext.run({ utilizadorId: adminUtilizadorId, empresaId, papel: 'admin_empresa' }, async () => await fn());
  }

  it('T1 — FakeEmailAdapter nunca faz uma chamada de rede real, resultado determinístico', async () => {
    const resultado = await fakeAdapter.enviar({ destinatario: 'convidado@teste.pt', assunto: 'Convite', corpoHtml: '<p>Olá</p>' });

    expect(resultado.enviado).toBe(true);
    expect(fakeAdapter.chamadas).toBe(1);
    expect(fakeAdapter.ultimaMensagem?.destinatario).toBe('convidado@teste.pt');
  });

  it('T2 — ConviteUtilizador criado com sucesso, empresaId sempre presente (Camada 1)', async () => {
    const convite = await comoTenant(() =>
      tenantPrisma.client.conviteUtilizador.create({
        data: {
          email: 'convidado@teste.pt',
          papelPretendido: 'colaborador',
          token: crypto.randomBytes(32).toString('hex'),
          convidadoPorId: adminUtilizadorId,
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } as never,
      }),
    );

    expect(convite.empresaId).toBe(empresaId);
    expect(convite.estado).toBe('pendente');
  });

  it('T3 — token é único, uma segunda tentativa com o mesmo token falha', async () => {
    const token = crypto.randomBytes(32).toString('hex');

    await comoTenant(() =>
      tenantPrisma.client.conviteUtilizador.create({
        data: { email: 'a@teste.pt', papelPretendido: 'colaborador', token, convidadoPorId: adminUtilizadorId, expiraEm: new Date() } as never,
      }),
    );

    await expect(
      comoTenant(() =>
        tenantPrisma.client.conviteUtilizador.create({
          data: { email: 'b@teste.pt', papelPretendido: 'colaborador', token, convidadoPorId: adminUtilizadorId, expiraEm: new Date() } as never,
        }),
      ),
    ).rejects.toThrow();
  });

  it('T4 — isolamento de tenant: um convite de uma Empresa nunca é visível a partir de outra', async () => {
    const outraEmpresa = await adminClient.empresa.create({ data: { nome: 'Outra Empresa Convite', pais: 'PT' } });
    const outroAdmin = await adminClient.utilizador.create({
      data: { empresaId: outraEmpresa.id, nome: 'Outro Admin', email: `outro-${Date.now()}@teste.pt`, passwordHash: 'hash', papel: 'admin_empresa' },
    });

    await comoTenant(() =>
      tenantPrisma.client.conviteUtilizador.create({
        data: {
          email: 'convidado@teste.pt',
          papelPretendido: 'colaborador',
          token: crypto.randomBytes(32).toString('hex'),
          convidadoPorId: adminUtilizadorId,
          expiraEm: new Date(),
        } as never,
      }),
    );

    const convitesDaOutraEmpresa = await tenantContext.run(
      { utilizadorId: outroAdmin.id, empresaId: outraEmpresa.id, papel: 'admin_empresa' },
      async () => await tenantPrisma.client.conviteUtilizador.findMany({}),
    );

    expect(convitesDaOutraEmpresa).toHaveLength(0);

    await limparEmpresasDeTeste(adminClient, [outraEmpresa.id]);
  });
});

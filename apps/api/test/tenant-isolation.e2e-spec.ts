import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { TenantPrismaService } from '../src/modules/fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../src/modules/fundacao/tenant/tenant-context';

/**
 * Isolamento Multi-Tenant — Camada 1 (Passo 4, NFR-17).
 *
 * Corre contra `nexa_test` (Especificação Técnica do Passo 4, D6), nunca
 * `nexa_dev`. `adminClient` liga como `nexa_dev` (owner, bypassa RLS) só
 * para preparar/limpar dados de teste — nunca para validar isolamento, isso
 * é `tenantPrisma` (via `nexa_app`, sujeito a RLS).
 */
describe('Isolamento Multi-Tenant — Camada 1 (Passo 4)', () => {
  let tenantPrisma: TenantPrismaService;
  let adminClient: PrismaClient;
  let empresaA: string;
  let empresaB: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TenantPrismaService],
    }).compile();

    tenantPrisma = module.get(TenantPrismaService);
    await tenantPrisma.onModuleInit();

    adminClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_ADMIN_URL } },
    });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await tenantPrisma.onModuleDestroy();
    await adminClient.$disconnect();
  });

  beforeEach(async () => {
    const [criadaA, criadaB] = await Promise.all([
      adminClient.empresa.create({ data: { nome: 'Empresa Teste A', pais: 'PT' } }),
      adminClient.empresa.create({ data: { nome: 'Empresa Teste B', pais: 'PT' } }),
    ]);
    empresaA = criadaA.id;
    empresaB = criadaB.id;

    await Promise.all([
      adminClient.departamento.create({ data: { empresaId: empresaA, nome: 'Vendas A' } }),
      adminClient.departamento.create({ data: { empresaId: empresaB, nome: 'Vendas B' } }),
    ]);
  });

  afterEach(async () => {
    await adminClient.empresa.deleteMany({ where: { id: { in: [empresaA, empresaB] } } });
  });

  function comoTenant<T>(empresaId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContext.run(
      { utilizadorId: 'utilizador-teste', empresaId, papel: 'admin_empresa' },
      async () => await fn(),
    );
  }

  it('T1 — findMany só devolve linhas da própria Empresa, mesmo sem filtro explícito', async () => {
    const departamentos = await comoTenant(empresaA, () => tenantPrisma.client.departamento.findMany({}));

    expect(departamentos).toHaveLength(1);
    expect(departamentos[0].nome).toBe('Vendas A');
  });

  it('T2 — create sobrescreve o empresaId fornecido pelo chamador com o do TenantContext', async () => {
    const criado = await comoTenant(empresaA, () =>
      tenantPrisma.client.departamento.create({
        data: { nome: 'Tentativa Cross-Tenant', empresaId: empresaB } as never,
      }),
    );

    expect(criado.empresaId).toBe(empresaA);
  });

  it('T3 — update sobre um id de outra Empresa não afeta a linha (Record not found)', async () => {
    const deptB = await adminClient.departamento.findFirstOrThrow({ where: { empresaId: empresaB } });

    await expect(
      comoTenant(empresaA, () =>
        tenantPrisma.client.departamento.update({ where: { id: deptB.id }, data: { nome: 'Hackeado' } }),
      ),
    ).rejects.toThrow();

    const deptBInalterado = await adminClient.departamento.findUniqueOrThrow({ where: { id: deptB.id } });
    expect(deptBInalterado.nome).toBe('Vendas B');
  });

  it('T4 — operação sem TenantContext ativo falha explicitamente (Fail Secure)', async () => {
    await expect(tenantPrisma.client.departamento.findMany({})).rejects.toThrow(/TenantContext ausente/);
  });
});

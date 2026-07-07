import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { IaModule } from '../src/modules/ia/ia.module';
import { AiGatewayService } from '../src/modules/ia/gateway/ai-gateway.service';
import { CircuitBreakerService } from '../src/modules/ia/gateway/circuit-breaker';
import { AI_ADAPTER } from '../src/modules/ia/gateway/adapters/ai-adapter.interface';
import { FakeAdapter } from '../src/modules/ia/gateway/adapters/fake.adapter';
import { QuotaExcedidaError, CapacidadeNaoSuportadaError, FornecedorIndisponivelError, TimeoutIAError } from '../src/modules/ia/gateway/errors';
import { tenantContext } from '../src/modules/fundacao/tenant/tenant-context';
import { limparEmpresasDeTeste } from './utils/limpar-empresa';

/**
 * AI Gateway (Especificação Técnica do Passo 15) — corre contra `nexa_test`,
 * mesmo padrão de `tenant-isolation.e2e-spec.ts` (Passo 4): sem HTTP, sem
 * controlador de produto (não existe neste passo), `tenantContext.run(...)`
 * simula um pedido autenticado. `FakeAdapter` nunca faz chamada de rede real
 * (Especificação Técnica do Passo 15, 3.9) — condição explícita da aprovação
 * do M3.
 *
 * Um único módulo de teste para todo o ficheiro (mesmo padrão dos restantes
 * testes e2e) — descoberta real durante a implementação: compilar um novo
 * `TestingModule` por teste acumulava instâncias de `AuditoriaListener`
 * sobre o mesmo `EventEmitter2`, disparando avisos de fuga de memória e
 * duplicando entradas de auditoria. Isolamento entre testes garantido por
 * reset explícito do `FakeAdapter` e do `CircuitBreakerService`.
 */
describe('AI Gateway (Passo 15)', () => {
  let adminClient: PrismaClient;
  let empresaId: string;
  let gateway: AiGatewayService;
  let fakeAdapter: FakeAdapter;
  let circuitBreaker: CircuitBreakerService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    fakeAdapter = new FakeAdapter();
    moduleRef = await Test.createTestingModule({ imports: [IaModule] })
      .overrideProvider(AI_ADAPTER)
      .useValue(fakeAdapter)
      .compile();

    await moduleRef.init();
    gateway = moduleRef.get(AiGatewayService);
    circuitBreaker = moduleRef.get(CircuitBreakerService);

    adminClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_ADMIN_URL } } });
    await adminClient.$connect();
  });

  afterAll(async () => {
    await moduleRef.close();
    await adminClient.$disconnect();
  });

  beforeEach(async () => {
    const empresa = await adminClient.empresa.create({ data: { nome: 'IA Gateway Teste', pais: 'PT' } });
    empresaId = empresa.id;

    fakeAdapter.chamadas = 0;
    fakeAdapter.comportamento = 'sucesso';
    fakeAdapter.respostaConfigurada = 'Resposta simulada.';
    circuitBreaker.registarSucesso('fake');
  });

  afterEach(async () => {
    await limparEmpresasDeTeste(adminClient, [empresaId]);
  });

  function comoTenant<T>(fn: () => Promise<T>): Promise<T> {
    return tenantContext.run({ utilizadorId: 'utilizador-teste', empresaId, papel: 'admin_empresa' }, fn);
  }

  it('T1 — pergunta bem-sucedida devolve a resposta do adaptador e consome 1 unidade de quota', async () => {
    fakeAdapter.respostaConfigurada = 'Olá, sou a NEXA.';

    const resposta = await comoTenant(() => gateway.perguntar({ sistema: 'sistema', mensagens: [{ papel: 'utilizador', conteudo: 'Olá' }] }));

    expect(resposta.conteudo).toBe('Olá, sou a NEXA.');
    expect(resposta.fornecedorUsado).toBe('fake');
    expect(fakeAdapter.chamadas).toBe(1);

    const uso = await adminClient.usoIAMensal.findFirst({ where: { empresaId } });
    expect(uso?.contagem).toBe(1);
  });

  it('T2 — sem TenantContext ativo, falha explicitamente (Fail Secure)', async () => {
    await expect(gateway.perguntar({ sistema: 's', mensagens: [] })).rejects.toThrow();
  });

  it('T3 — quota excedida recusa antes de invocar o adaptador (nunca chega ao fornecedor)', async () => {
    process.env.IA_QUOTA_PADRAO_MENSAL = '1';
    try {
      await comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [{ papel: 'utilizador', conteudo: 'p1' }] }));
      expect(fakeAdapter.chamadas).toBe(1);

      await expect(
        comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [{ papel: 'utilizador', conteudo: 'p2' }] })),
      ).rejects.toBeInstanceOf(QuotaExcedidaError);

      // O adaptador nunca foi invocado para o pedido recusado.
      expect(fakeAdapter.chamadas).toBe(1);
    } finally {
      delete process.env.IA_QUOTA_PADRAO_MENSAL;
    }
  });

  it('T4 — capacidade não suportada recusa antes de invocar o adaptador', async () => {
    await expect(
      comoTenant(() =>
        gateway.perguntar({ sistema: 's', mensagens: [{ papel: 'utilizador', conteudo: 'p' }], capacidadesRequeridas: ['tool_use'] }),
      ),
    ).rejects.toBeInstanceOf(CapacidadeNaoSuportadaError);

    expect(fakeAdapter.chamadas).toBe(0);
  });

  it('T5 — timeout do fornecedor é tratado como falha explícita, nunca inventa resposta', async () => {
    process.env.IA_TIMEOUT_MS = '100';
    fakeAdapter.comportamento = 'timeout';
    try {
      await expect(
        comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [{ papel: 'utilizador', conteudo: 'p' }] })),
      ).rejects.toBeInstanceOf(TimeoutIAError);
    } finally {
      delete process.env.IA_TIMEOUT_MS;
    }
  }, 10_000);

  it('T6 — circuit breaker abre após o limiar de falhas consecutivas e recusa sem tentar o fornecedor', async () => {
    process.env.IA_CIRCUIT_BREAKER_LIMIAR = '2';
    process.env.IA_CIRCUIT_BREAKER_JANELA_MS = '60000';
    fakeAdapter.comportamento = 'erro_generico';
    try {
      await expect(comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [] }))).rejects.toThrow();
      await expect(comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [] }))).rejects.toThrow();
      expect(fakeAdapter.chamadas).toBe(2);

      // 3ª tentativa: circuito já aberto, nunca chega a invocar o adaptador.
      await expect(comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [] }))).rejects.toBeInstanceOf(FornecedorIndisponivelError);
      expect(fakeAdapter.chamadas).toBe(2);
    } finally {
      delete process.env.IA_CIRCUIT_BREAKER_LIMIAR;
      delete process.env.IA_CIRCUIT_BREAKER_JANELA_MS;
    }
  });

  it('T7 — toda chamada gera auditoria, nunca com o conteúdo completo no detalhe', async () => {
    await comoTenant(() => gateway.perguntar({ sistema: 's', mensagens: [{ papel: 'utilizador', conteudo: 'pergunta secreta' }] }));

    const eventos = await adminClient.registoAuditoria.findMany({ where: { empresaId, entidade: 'InteracaoIA' } });
    expect(eventos.length).toBe(2); // pergunta_iniciada + resposta_recebida
    expect(eventos.map((e) => e.acao).sort()).toEqual(['pergunta_iniciada', 'resposta_recebida']);
    for (const evento of eventos) {
      expect(JSON.stringify(evento.detalhe ?? {})).not.toContain('pergunta secreta');
    }
  });
});

# NEXA — Especificação Técnica do Passo 15 (M3): AI Gateway (Backend)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 15 — AI Gateway |
| **Fase** | 7 — Desenvolvimento da Plataforma, M3 (Assistente de IA), Passo 15 — primeiro passo do M3 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado — primeiro passo do M3 |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-005 (Camada de Abstração de IA Multi-Fornecedor) v1.2 · AI Principles v1.0 · Security & Access Principles · System Design Principles (3.5, 3.8) · Product & Security Decisions Register (PSD-002, PSD-003) · Proposta do Milestone M3 (aprovada 2026-07-07) · NFR-17 |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Implementar o AI Gateway — a interface própria decidida no ADR-005, com duas rondas de auditoria adversarial já concluídas — como serviço interno do novo módulo `ia`, cumprindo integralmente as responsabilidades já fixadas nesse documento: interface neutra de SDK, 1 adaptador real (Anthropic), timeout/circuit breaker, imposição de quota por Empresa, fail-secure. Este passo **não expõe nenhum endpoint de produto** — é a fundação de que os Passos 16 (pergunta livre, UC-05) e 17 (sugestões de ação, UC-06) dependem, o mesmo papel que o Passo 4 (Camada 1) teve para RBAC/Auditoria/Partilha no M1.

---

## 2. Contexto

A arquitetura do AI Gateway está integralmente decidida no ADR-005 — este passo não reabre nenhuma dessas decisões, implementa-as. A Proposta do Milestone M3 (aprovada 2026-07-07) validou 5 decisões adicionais diretamente relevantes a este passo, resumidas em 2.1. Este documento cumpre, ponto a ponto, as 5 condições explícitas que a Fundadora/CEO exigiu antes de qualquer implementação (§3.6 a §3.10 abaixo).

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Fornecedor de IA | Arquitetura independente de fornecedor (ADR-005 já garante isto); **1 adaptador ativo no M3 — Anthropic**; arquitetura pronta para adicionar outros sem impacto nos módulos consumidores |
| B | Credenciais | Configuráveis por ambiente via variáveis de ambiente (`ANTHROPIC_API_KEY`, já placeholder em `.env.example` desde o scaffolding); **nenhuma credencial real usada ou assumida nesta fase** — testes automatizados usam um adaptador simulado (3.9) |
| C | PSD-003 (granularidade de auditoria de IA) | Metadados sempre + conteúdo completo por retenção temporária, **configurável** — permite ajustar ou desativar o armazenamento de conteúdo por requisito legal/contratual/privacidade, mantendo sempre metadados e auditoria |
| D | PSD-002 (residência de dados) | Fora de âmbito do M3; a arquitetura (negociação de capacidades por adaptador, ADR-005 §3.5) já permite adicionar um adaptador UE/local no futuro sem reestruturação |
| E | Quota | Aprovada desde o M3 (ADR-005 D12); valor inicial conservador como **configuração técnica temporária**, nunca a política comercial definitiva dos planos (essa fica para o M4) |

---

## 3. Conteúdo Estruturado

### 3.1 Estrutura do Módulo

```
apps/api/src/modules/ia/
  gateway/
    ai-gateway.types.ts        # AIRequest/AIResponse — neutros de SDK (ADR-005 §3.6)
    ai-gateway.service.ts      # orquestração: quota → circuit breaker → adaptador → auditoria
    circuit-breaker.ts         # por fornecedor (ADR-005 §3.8)
    quota.service.ts           # consulta/consome SubscricaoPlano.limiteUsoIA (ADR-005 D12)
    adapters/
      ai-adapter.interface.ts  # contrato comum a todo adaptador
      anthropic.adapter.ts     # único adaptador real do M3
      fake.adapter.ts          # usado só em testes (3.9) — nunca importado por código de produção
  ia.module.ts
```

Mesma disciplina modular já usada em `fundacao`/`processos`/`crm`/`dashboard` (regra não-negociável #1) — `ia` é um módulo de negócio como os outros, sem acesso privilegiado a dados de outros módulos.

### 3.2 Contrato Neutro de Tipos (ADR-005 §3.6, §3.7)

```ts
// ai-gateway.types.ts
export interface AIRequest {
  sistema: string;                              // instrução de sistema, preparada pelo módulo chamador
  mensagens: { papel: 'utilizador' | 'assistente'; conteudo: string }[];
  capacidadesRequeridas?: string[];              // ex: ['tool_use'] — negociação de capacidades (3.5)
}

export interface AIResponse {
  conteudo: string;
  fornecedorUsado: string;
  capacidadesUsadas: string[];
}

// Distinção estrutural sugestão/execução (ADR-005 §3.7) — usada a partir do
// Passo 17, mas o contrato de tipos nasce aqui, junto do resto do Gateway.
export interface PendingSuggestion {
  readonly _tag: 'PendingSuggestion';
  sugestaoId: string;
}

export interface ConfirmedAction {
  readonly _tag: 'ConfirmedAction';
  sugestaoId: string;
  confirmadoPor: string;
}

// Única função que transforma uma na outra — nenhuma conversão implícita existe.
export function confirmar(pendente: PendingSuggestion, utilizadorId: string): ConfirmedAction {
  return { _tag: 'ConfirmedAction', sugestaoId: pendente.sugestaoId, confirmadoPor: utilizadorId };
}
```

Nenhum destes tipos é um alias ou reexportação de um tipo do SDK Anthropic — tradução acontece só dentro do adaptador (3.4).

### 3.3 Interface de Adaptador e Negociação de Capacidades (ADR-005 §3.5)

```ts
export interface AIAdapterInterface {
  readonly nome: string;
  readonly capacidadesSuportadas: string[];
  enviar(pedido: AIRequest): Promise<AIResponse>;
}
```

- `AnthropicAdapter implements AIAdapterInterface` — traduz `AIRequest` → chamada real ao SDK oficial da Anthropic e de volta; declara as capacidades que suporta.
- Se `AIRequest.capacidadesRequeridas` incluir algo que o adaptador configurado não declara suportar → `CapacidadeNaoSuportadaError` explícito, **nunca degradação silenciosa** (ADR-005 §3.5, regra de fallback já decidida).

### 3.4 Seleção de Fornecedor e Credenciais — Configuração, Não Código

- `IA_FORNECEDOR_PADRAO` (variável de ambiente, ex: `anthropic`) determina qual adaptador o `AiModule` regista — nunca hardcoded (System Design Principles, 3.5).
- `ANTHROPIC_API_KEY` — já placeholder em `.env.example` desde o scaffolding do Passo 1; nunca commitada, nunca usada em teste automatizado (3.9).

### 3.5 Quota (ADR-005 §3.3 ponto 6, D12)

- `QuotaService.verificarEConsumir(empresaId)` — chamado pelo `AiGatewayService` **antes** de qualquer chamada ao adaptador, nunca depois.
- Consulta e decrementa `SubscricaoPlano.limiteUsoIA` (campo já existente no schema desde o Passo 2, nunca usado até agora).
- **Valor inicial proposto: 50 pedidos/mês por Empresa**, configurável via variável de ambiente (`IA_QUOTA_PADRAO_MENSAL`), explicitamente marcado em código e documentação como "configuração técnica temporária — não é a política comercial definitiva dos planos" (Decisão Já Validada E).
- Excedida → `QuotaExcedidaError`, fail secure — o adaptador nunca chega a ser chamado.

### 3.6 Timeout, Retries e Circuit Breaker (condição explícita da aprovação do M3)

| Parâmetro | Valor proposto | Configurável via |
|---|---|---|
| Timeout por chamada | 30 segundos | `IA_TIMEOUT_MS` |
| Retries automáticos | **Zero** — nenhum retry automático no MVP | — (decisão, não parâmetro) |
| Circuit breaker — limiar de abertura | 5 falhas consecutivas em 60 segundos | `IA_CIRCUIT_BREAKER_LIMIAR`/`IA_CIRCUIT_BREAKER_JANELA_MS` |
| Circuit breaker — duração aberto | 120 segundos, depois 1 pedido de teste (half-open) antes de fechar totalmente | `IA_CIRCUIT_BREAKER_DURACAO_MS` |

**Porquê zero retries automáticos:** reenviar um pedido de IA sozinho arrisca duplicar custo real (Decisão 4 da proposta do M3) e gerar respostas inconsistentes se uma resposta parcial já tiver chegado ao Utilizador. Se uma chamada falha, falha de forma imediata e visível (fail secure) — o Utilizador decide se tenta de novo, nunca o sistema sozinho. Fica registada como Decisão Tomada (D5), sujeita a revisão se a experiência real revelar que é demasiado agressivo.

### 3.7 Classificação e Tratamento de Erros (condição explícita da aprovação do M3)

Cobre o ciclo de vida completo de um pedido através deste módulo, não só o interior do Gateway:

| Erro | Onde ocorre | Resposta HTTP | Comportamento |
|---|---|---|---|
| Não autenticado | `SessionGuard`, antes de chegar ao módulo `ia` | 401 | Mesmo padrão de todos os outros módulos, sem exceção |
| Sem permissão (RBAC) | `PermissaoGuard`, antes de chegar ao Gateway | 403 | O Gateway nunca é sequer invocado — a filtragem de dados por escopo RBAC é sempre responsabilidade do módulo chamador (ADR-005 §3.3, ponto 1), nunca do Gateway |
| `AIRequest` malformado | `ValidationPipe`, fronteira única de validação | 400 | Mesma disciplina de todos os DTOs já existentes (Data & Consistency Rules, 3.6) |
| Quota excedida | `QuotaService`, antes de qualquer chamada ao adaptador | 429 | Fail secure — o adaptador nunca é invocado |
| Capacidade não suportada | Adaptador, antes de enviar ao fornecedor | 400 | Erro explícito (`CapacidadeNaoSuportadaError`), nunca degradação silenciosa |
| Timeout do fornecedor | Chamada ao adaptador excede `IA_TIMEOUT_MS` | 504 (tratado, nunca propagado em bruto) | Fail secure — mensagem genérica ao Utilizador, nunca inventa resposta (ADR-005 §3.3, ponto 5) |
| Fornecedor indisponível (circuit breaker aberto) | `CircuitBreaker` já teria recusado antes de tentar | 503 | Fail secure imediato, sem sequer tentar a chamada de rede |
| Erro genérico do fornecedor (ex: 5xx da API externa) | Adaptador, chamada real falhou de forma não classificada | 502 (tratado) | Fail secure — nunca expõe o erro técnico bruto do fornecedor ao Utilizador final |

Todos os erros do Gateway (exceto 401/403/400 de validação, já cobertos pela disciplina existente) são auditados como tentativa falhada (3.8), nunca silenciosamente engolidos.

### 3.8 Observabilidade (condição explícita da aprovação do M3)

- **Logs estruturados** por chamada ao Gateway: `empresaId`, `utilizadorId`, `fornecedor`, `duraçãoMs`, `resultado` (sucesso | tipo de erro de 3.7) — **nunca o conteúdo completo da pergunta/resposta no log de aplicação**; esse fica exclusivamente na auditoria (Registo de Auditoria), sujeito à política de retenção configurável já aprovada (PSD-003, Decisão Já Validada C).
- **Métricas mínimas**: contagem de chamadas por fornecedor/resultado, latência p50/p95, taxa de erro por tipo de 3.7, estado do circuit breaker (fechado/aberto/half-open) — nesta fase, expostas via logs estruturados agregáveis; sem introduzir uma ferramenta de métricas dedicada (Prometheus, Datadog) — não existe hoje no projeto e seria decisão de infraestrutura prematura (ADR-007, ainda por endereçar observabilidade full-stack).
- **Tracing**: `requestId` simples gerado no início de cada pedido ao módulo `ia`, propagado pelos logs da mesma chamada — **honestidade sobre o estado atual**: nenhuma infraestrutura de correlação/tracing existe hoje em nenhum módulo do projeto; este passo introduz o mínimo necessário para depurar uma chamada de IA específica, sem inventar uma solução de tracing distribuído que nenhum outro módulo usa. Tracing distribuído real, se necessário, é decisão do ADR-007.
- `SENTRY_DSN` já existe como placeholder em `.env.example` (ADR-007, 3.4) mas **não está integrado em código nenhum do projeto ainda** — fora de âmbito deste passo, mencionado aqui só para não ficar a parecer uma omissão silenciosa.

### 3.9 Estratégia de Testes com Fornecedores Simulados (condição explícita da aprovação do M3)

- `AIAdapterInterface` é o ponto de substituição em teste — `FakeAdapter implements AIAdapterInterface`, nunca faz uma chamada de rede real.
- `FakeAdapter` é configurável por teste para simular determinística: sucesso com conteúdo definido, timeout, erro genérico do fornecedor, capacidade não suportada — permite testar toda a tabela de erros de 3.7 sem qualquer dependência externa.
- **Nenhum teste automatizado (e2e ou unitário) depende de rede externa ou de uma chave de API real** — consistente com a Decisão Já Validada B. `FakeAdapter` vive em `adapters/fake.adapter.ts`, mas nunca é importado por `ia.module.ts` em execução normal — só pelo módulo de teste, através de override do provedor do NestJS (`overrideProvider`).
- O teste do fluxo crítico "ações de IA" (NFR-17, o 4º e último fluxo crítico obrigatório) usa exclusivamente o `FakeAdapter`.

### 3.10 Estratégia de Versionamento do AI Gateway (condição explícita da aprovação do M3)

- O contrato do Gateway (`AIRequest`/`AIResponse`/`AIAdapterInterface`) é versionado implicitamente pelo compilador TypeScript — qualquer alteração incompatível quebra a compilação de todo o módulo `ia` (o único consumidor), tornando-se um erro de build, nunca uma falha silenciosa em produção.
- **Não é necessário um esquema de versionamento explícito de API (`/v1/`, `/v2/`)** para o Gateway em si: não é uma API externa, é um serviço interno do monólito modular (regra não-negociável #1), consumido só pelo módulo `ia` dentro do mesmo processo. Versionamento HTTP só se tornaria relevante se/quando o Gateway fosse exposto fora do processo — não previsto.
- Evolução de adaptadores (novo fornecedor, nova versão de SDK) acontece sempre atrás da mesma interface, sem exigir alteração aos consumidores — aplicação direta do Princípio de Evolução Tecnológica já validado (ADR-005 §3.15).

### 3.11 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-005 (§3.3 a §3.8) | ✅ Todas as responsabilidades do Gateway implementadas: filtragem RBAC pelo chamador, nunca gera evento de execução, auditoria por evento discreto, fail secure, quota antes da chamada, timeout/circuit breaker |
| ADR-005 §3.6/§3.7 | ✅ Neutralidade de tipos; distinção sugestão/execução ao nível de tipos |
| AI Principles (5 princípios) | ✅ Confirmação humana estrutural (Passo 17); mesmas regras RBAC; multi-fornecedor; toda interação auditada; autonomia configurável |
| PSD-003 | ✅ Retenção de conteúdo configurável, metadados sempre presentes |
| NFR-17 | ✅ Fluxo crítico "ações de IA" testável com `FakeAdapter`, sem dependência externa |

**Nenhum novo ADR necessário** — este passo implementa o ADR-005, não o revê.

### 3.12 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `AnthropicAdapter` traduz corretamente `AIRequest` → SDK Anthropic e devolve `AIResponse` neutro | ✅ verificado por revisão de código (sem chamada real, credenciais não usadas nesta fase); estrutura testada de ponta a ponta via `FakeAdapter` (T-testes 1) |
| T2 | Nenhum tipo do SDK Anthropic é importado ou reexportado fora do adaptador | ✅ confirmado por revisão de código — `ai-gateway.types.ts` não importa `@anthropic-ai/sdk` |
| T3 | Quota excedida → erro tipado `QuotaExcedidaError`, adaptador nunca invocado | ✅ teste T3 (`ia-gateway.e2e-spec.ts`) |
| T4 | Timeout simulado → erro tipado `TimeoutIAError`, resposta genérica, nunca resposta inventada | ✅ teste T5 |
| T5 | 5 falhas consecutivas em 60s → circuito abre; próximas chamadas na janela falham imediatamente sem tentar o adaptador | ✅ teste T6 (limiar reduzido a 2 no teste, mesmo mecanismo) |
| T6 | Capacidade não suportada pedida → `CapacidadeNaoSuportadaError` explícito, nunca degradação silenciosa | ✅ teste T4 |
| T7 | Toda chamada ao Gateway (sucesso ou erro) gera uma entrada de auditoria, nunca o conteúdo completo no log de aplicação | ✅ teste T7 — 2 eventos por interação (`pergunta_iniciada`/`resposta_recebida`), conteúdo da pergunta confirmado ausente do `detalhe` |
| T8 | Suite de testes completa corre sem qualquer chamada de rede real ou credencial real | ✅ `FakeAdapter` em todos os 7 testes, `AnthropicAdapter` nunca instanciado em teste |
| T9 | `npm run build` e `npm run test:e2e` (`apps/api`) sem erros | ✅ build limpo; 116/116 testes (109 herdados + 7 novos) |

**Exit Criteria:** T1-T9 confirmados — T1/T2 por revisão de código (sem componente de UI nem chamada real nesta fase, consistente com 1), T3-T9 por teste automatizado (`apps/api/test/ia-gateway.e2e-spec.ts`). Mesma disciplina de sempre: nunca só a leitura de código para o que é automaticamente verificável.

### 3.13 Resultado da Implementação e Evidências de Validação

**Entregáveis:** módulo `apps/api/src/modules/ia/` completo conforme 3.1 — contrato de tipos, `AiGatewayService`, `QuotaService`, `CircuitBreakerService`, `AnthropicAdapter`, `FakeAdapter`, `ia.module.ts` registado em `AppModule`. Sem controlador/endpoint HTTP, conforme âmbito (1).

**Descoberta real, não prevista na especificação original — corrigida antes de escrever qualquer código de produção:** `SubscricaoPlano.limiteUsoIA` (schema desde o Passo 2) é um **teto**, nunca um contador de consumo, e `SubscricaoPlano` nunca é criado para nenhuma Empresa (deliberadamente adiado para o M4, CLAUDE.md 3.2). Decrementar `limiteUsoIA` destruiria o valor original do limite, e não há hoje nenhuma via para provisionar `SubscricaoPlano` no registo sem reabrir essa decisão adiada. Resolvido com um novo modelo aditivo, `UsoIAMensal` (`empresaId`, `anoMes`, `contagem`) — migração `20260707150654_add_uso_ia_mensal` — com RLS ativada na mesma disciplina de todas as tabelas de negócio (migração `20260707150804_enable_rls_uso_ia_mensal`). `QuotaService` usa `SubscricaoPlano.limiteUsoIA` como teto quando existe, caindo para `IA_QUOTA_PADRAO_MENSAL` quando não — nunca decide nada sobre a política comercial do M4.

**Duas descobertas de testabilidade, corrigidas durante a implementação:**
1. Os parâmetros configuráveis (timeout, quota, circuit breaker) estavam inicialmente cacheados como constantes ao nível do módulo (lidas de `process.env` uma única vez, no import) — impossível de ajustar por teste sem depender da ordem de carregamento de módulos ES. Corrigido para leitura a cada chamada (funções, nunca `const` de topo) — mesmo comportamento em produção, mas testável.
2. Compilar um novo `TestingModule` do NestJS por teste (para isolar o `CircuitBreakerService` entre testes) acumulava instâncias do `AuditoriaListener` sobre o mesmo `EventEmitter2`, disparando avisos de fuga de memória e duplicando entradas de auditoria (14 em vez de 2 num teste). Corrigido seguindo o padrão já estabelecido nos restantes testes e2e — um único módulo por ficheiro de teste — com reset explícito do `FakeAdapter` e do `CircuitBreakerService` em `beforeEach`.

**Resultados de validação:**
- `apps/api/test/ia-gateway.e2e-spec.ts` — 7 testes (T1-T7), mesmo padrão de `tenant-isolation.e2e-spec.ts` (Passo 4): sem HTTP, `tenantContext.run(...)` simula um pedido autenticado, `FakeAdapter` nunca faz rede real.
- Suite completa: **116/116 testes** (109 herdados + 7 novos).
- `npm run build` (`apps/api`) limpo.
- App arranca corretamente com `ANTHROPIC_API_KEY` vazia (confirmado em `preview` — `IaModule dependencies initialized` sem erro), consistente com "nenhuma credencial real usada nesta fase" (Decisão Já Validada B).

**Exit Criteria T1-T9: todos cumpridos.** Este é o primeiro passo do M3 — os Passos 16 e 17 consomem este Gateway para os endpoints de produto (`POST /ia/perguntar`, `POST /ia/sugestoes/:id/confirmar`/`/rejeitar`).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Módulo `ia` com submódulo `gateway/`, mesma disciplina modular dos módulos existentes | Consistente com a regra não-negociável #1; nenhum acesso privilegiado a dados de outros módulos |
| D2 | Contrato de tipos (`AIRequest`/`AIResponse`/adaptador) definido antes de qualquer endpoint de produto | Torna o Gateway testável e substituível desde o primeiro dia (D-testabilidade), consistente com ADR-005 §3.6 |
| D3 | 1 adaptador real (Anthropic) + `FakeAdapter` só para testes | Decisão Já Validada A; testabilidade sem custo real (Decisão Já Validada B) |
| D4 | Quota inicial de 50 pedidos/mês por Empresa, configurável, explicitamente marcada como temporária | Cumpre ADR-005 D12 sem antecipar a política comercial de planos (M4) |
| D5 | Zero retries automáticos no MVP | Evita duplicar custo real ou gerar respostas inconsistentes; falha é sempre visível e imediata (fail secure) |
| D6 | `requestId` simples para correlação de logs, sem introduzir ferramenta de tracing dedicada | Honesto sobre o estado atual do projeto (nenhuma infraestrutura de tracing existe); evita decisão de infraestrutura prematura |
| D7 | Sem versionamento HTTP explícito do Gateway — é um serviço interno, não uma API externa | O monólito modular (#1) já garante que só o módulo `ia` o consome; versionamento de compilador já é suficiente |
| D8 | Novo modelo `UsoIAMensal` (aditivo), em vez de decrementar `SubscricaoPlano.limiteUsoIA` ou provisionar `SubscricaoPlano` no registo | Descoberta real (3.13) — `limiteUsoIA` é um teto, nunca um contador; provisionar `SubscricaoPlano` reabriria a decisão do M4, deliberadamente adiada |
| D9 | Parâmetros configuráveis (timeout/quota/circuit breaker) lidos a cada chamada, nunca cacheados a nível de módulo | Descoberta de testabilidade (3.13) — mesmo comportamento em produção, mas testável sem depender da ordem de importação de módulos |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | ~~Valor exato da quota inicial~~ — **Resolvida.** 50/mês aprovado pela Fundadora/CEO como configuração técnica provisória, explicitamente a rever quando o M4 (Comercial) definir os planos e limites definitivos | Nenhum | Resolvida em 2026-07-07 |
| 2 | Se/quando introduzir uma ferramenta de observabilidade dedicada (métricas/tracing reais) — fica registado como requisito de entrada do ADR-007, mesmo padrão já usado para o volume de auditoria (ADR-005 §3.9a) | Infraestrutura, não bloqueia o M3 | CTO, no ADR-007 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da especificação técnica do Passo 15, cumprindo as 5 condições explícitas da aprovação do Milestone M3: estratégia de versionamento, observabilidade, testes com adaptador simulado, limites de timeout/retries/circuit breaker, e classificação/tratamento de erros. Contrato de tipos neutro, adaptador Anthropic, quota, e distinção sugestão/execução ao nível de tipos definidos | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.13 — Resultado da Implementação, após aprovação e implementação completa: descoberta real (`UsoIAMensal`, novo modelo aditivo, já que `SubscricaoPlano.limiteUsoIA` é um teto nunca um contador e `SubscricaoPlano` nunca é criado); 2 descobertas de testabilidade corrigidas (configuração lida a cada chamada, um único `TestingModule` por ficheiro de teste); Decisões D8-D9 adicionadas; Questão em Aberto 1 resolvida (quota de 50/mês aprovada); T1-T9 confirmados, 116/116 testes | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

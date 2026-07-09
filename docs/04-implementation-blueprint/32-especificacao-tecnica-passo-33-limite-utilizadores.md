# NEXA — Especificação Técnica do Passo 33 (M6): Enforcement de `limiteUtilizadores` (RN-10)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 33 — bloqueio ao atingir o limite de Utilizadores do plano |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases), Passo 33 — segundo passo do M6 |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-09) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-08 (RN-10/RN-11); UC-02 (Exceção E1); Especificação Técnica do Passo 19 (`limiteUtilizadores: Int?`, `null` = sem limite); Especificação Técnica do Passo 20 (`SubscricaoGuard`/RN-11, precedente de tradução HTTP centralizada); Especificação Técnica do Passo 30 (`ConviteService`, CV-01 a CV-06); Proposta do Milestone M6 (aprovada em chat, 2026-07-08/09) |
| **Última atualização** | 2026-07-09 |

---

## 1. Objetivo

Implementar RN-10: bloquear especificamente a criação de um novo Utilizador além do limite de `limiteUtilizadores` do plano ativo — nunca um bloqueio geral da plataforma (RN-10 exige isto explicitamente; os Utilizadores existentes continuam a trabalhar normalmente). Viabiliza a validação integral de UC-02 (Exceção E1) e UC-08 nos Passos 34 e 37.

---

## 2. Contexto e uma Descoberta Arquitetural Real

A Proposta do M6, já aprovada, previa que este passo "reutiliza a infraestrutura comercial já existente". Ao desenhar a implementação, encontrei uma tensão real com essa frase que preciso de trazer de volta para validação, em vez de a resolver sozinho.

**A descoberta:** `ConviteService` vive em `fundacao/convite/` — Convite é, tal como Partilha (Passo 7), uma capacidade transversal da Fundação, nunca um módulo de negócio. A regra estrutural do projeto, reforçada explicitamente no próprio código do `ComercialModule` ("`FundacaoModule` nunca importa `ComercialModule`") e nunca violada em nenhum passo anterior, significa que `ConviteService` **não pode** chamar `SubscricaoService` (ou qualquer classe/erro definido em `comercial`) sem inverter essa direção — mesmo um import leve de um decorator ou de uma classe de erro seria, em espírito, o mesmo tipo de acoplamento que a regra existe para evitar. Isto é diferente do precedente já aprovado no Passo 23 ("`comercial` consome `ia`") — esse caso é `comercial → ia` (módulo de negócio → módulo de negócio), nunca `fundacao → comercial` (Fundação → módulo de negócio), que inverteria a camada mais fundamental da arquitetura.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Como implementar RN-10 sem `fundacao` importar `comercial`?** | **RN-10 implementado inteiramente dentro de `fundacao/convite/`** — leitura direta de `SubscricaoPlano.limiteUtilizadores` (campo simples, `null` = sem limite, mesma convenção já usada por `limiteUsoIA` desde o Passo 19) via `TenantPrismaService`/`PrismaService`, sem chamar nenhum serviço de `comercial`. O erro (`402`, `code: LIMITE_UTILIZADORES_ATINGIDO`) é lançado como `HttpException` simples, direta no `ConviteService`, sem depender de `SubscricaoLimitadaError`/`SubscricaoExceptionFilter` (que ficam exclusivos de RN-11). É uma pequena duplicação de leitura de dados (não de lógica de negócio complexa — `SubscricaoPlano` já não tem nenhuma lógica de cálculo aqui, ao contrário de `obterEstadoEfetivo`), preferível a introduzir a primeira exceção de sempre à regra "Fundação nunca depende de um módulo de negócio". Alternativa (não recomendada): expor `SubscricaoService.limiteUtilizadores` via um novo módulo `comum`/`shared` só para isto — complexidade desproporcional para um único campo. |
| B | **A contagem para o limite inclui só Utilizadores ativos, ou também Convites pendentes não expirados?** UC-08/RN-10 fala em "impedir convidar mais um utilizador" — se só contarmos Utilizadores ativos, seria possível enviar convites muito além da capacidade do plano (todos pendentes, nenhum ainda a contar), e só falhar em massa quando começassem a ser aceites. | **Incluir Convites pendentes não expirados na contagem em `POST /convites`** (Utilizadores ativos + Convites pendentes = "capacidade já comprometida"). Em `POST /convites/:token/aceitar`, contar **só Utilizadores ativos** (o próprio convite em aceitação não deve ser contado como "pendente" nesse momento — está a tornar-se real). |
| C | **Verificar em um só ponto (`POST /convites`) ou nos dois (`POST /convites` e `POST /convites/:token/aceitar`)?** Um convite tem 7 dias de validade — o plano pode ser alterado (upgrade/downgrade, ainda que downgrade esteja fora de âmbito do M4/M5, permanece tecnicamente possível via BD/futuro) entre o envio e a aceitação. | **Verificar nos dois pontos** — `POST /convites` prova a intenção (RN-10/UC-08, "impede convidar"); `POST /convites/:token/aceitar` revalida no momento real da criação do Utilizador, mesma disciplina já usada para CV-05 (unicidade de email revalidada na aceitação, Passo 30) — defesa em profundidade, nunca confiar só na verificação de 7 dias antes. |

---

## 3. Conteúdo Estruturado

### 3.1 `ConviteService.criar()` — nova verificação RN-10

Inserida depois de CV-06 (duplicado pendente), antes da geração do `token`/envio do email — falha rápida, nunca gera nem envia nada que depois teria de ser descartado.

```
limite = tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId } })?.limiteUtilizadores
se limite === null → sem limite, passa
senão:
  ativos = tenantPrisma.client.utilizador.count({ where: { eliminadoEm: null } })
  pendentes = tenantPrisma.client.conviteUtilizador.count({ where: { estado: 'pendente', expiraEm: { gt: now() } } })
  se (ativos + pendentes) >= limite → 402, LIMITE_UTILIZADORES_ATINGIDO
```

### 3.2 `ConviteService.aceitar()` — revalidação RN-10

Inserida a par da revalidação de CV-05 (unicidade de email), antes da transação de criação do `Utilizador` — usa `PrismaService` bruto (endpoint público, sem `TenantContext`), scoping manual por `convite.empresaId`.

```
limite = prisma.subscricaoPlano.findUnique({ where: { empresaId: convite.empresaId } })?.limiteUtilizadores
se limite === null → sem limite, passa
senão:
  ativos = prisma.utilizador.count({ where: { empresaId: convite.empresaId, eliminadoEm: null } })
  se ativos >= limite → 402, LIMITE_UTILIZADORES_ATINGIDO
```

### 3.3 Resposta HTTP

`402`, corpo `{ statusCode: 402, code: 'LIMITE_UTILIZADORES_ATINGIDO', message: 'A Empresa atingiu o limite de N utilizadores do plano atual. Contacta o Administrador para atualizar o plano.' }` — mensagem inclui o valor concreto do limite (UC-08, passo 3 do fluxo principal: "apresentando de forma clara qual o limite atingido"), nunca só uma mensagem genérica. `code` distinto de `SUBSCRICAO_LIMITADA` (RN-11) — são causas diferentes (limite numérico vs. trial expirado/subscrição inativa), nunca confundidas na resposta.

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| Regra estrutural "`FundacaoModule` nunca importa `ComercialModule`" | ✅ Preservada sem exceção (Decisão A) |
| RN-10 (bloqueia só a ação específica, nunca a plataforma) | ✅ Utilizadores existentes nunca afetados; só `POST /convites`/`.../aceitar` |
| UC-08 (mensagem clara do limite atingido) | ✅ Valor concreto na mensagem |
| Regra não-negociável #6 (camada de acesso a dados única) | ✅ `TenantPrismaService`/`PrismaService`, nunca query direta fora deles |

**Nenhum novo ADR necessário. Nenhuma alteração de schema** (`SubscricaoPlano.limiteUtilizadores` já existe desde o Passo 19).

### 3.5 Critérios de Aceitação e Exit Criteria (planeados)

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Plano com `limiteUtilizadores: null` (Enterprise) — convite sempre permitido, independentemente da contagem | HTTP real |
| T2 | Empresa com N Utilizadores ativos = limite — `POST /convites` devolve `402`/`LIMITE_UTILIZADORES_ATINGIDO` | HTTP real |
| T3 | Empresa com (ativos + pendentes) = limite, mas ativos < limite — `POST /convites` ainda bloqueado (Decisão B, convites pendentes contam) | HTTP real |
| T4 | Convite aceite reduz a contagem de "pendentes" e liberta espaço para um novo convite | HTTP real |
| T5 | `POST /convites` com sucesso quando (ativos + pendentes) < limite | HTTP real |
| T6 | Revogação/expiração de um convite pendente liberta espaço (mesma lógica de T4, via expiração natural) | HTTP real |
| T7 | `POST /convites/:token/aceitar` bloqueado com `402` se `ativos >= limite` no momento da aceitação, mesmo que o convite tivesse sido criado quando havia espaço (Decisão C) | HTTP real |
| T8 | Mensagem de erro inclui o valor concreto do limite | HTTP real |
| T9 (regressão) | Suite completa — todos os testes herdados continuam a passar | `npm run test:e2e` |
| T10 | `npm run build` (`apps/api`) sem erros | build limpo |

**Exit Criteria:** T1-T10 confirmados por teste automatizado. Sem validação de browser — passo de backend puro, sem ecrã (o formulário de Convite já existe desde o Passo 31; o erro `402` será visível através dele, mas nenhuma alteração de UI é necessária ou planeada aqui — o toast genérico de erro já mostra a mensagem exata do backend, mesmo padrão de sempre).

---

## 4. Aprovação

Decisões A, B e C aprovadas pela Fundadora/CEO em 2026-07-09, sem alterações.

---

## 5. Resultado da Implementação

- **`fundacao/convite/errors.ts`** (novo) — `LimiteUtilizadoresAtingidoError extends HttpException`, `402`, `code: LIMITE_UTILIZADORES_ATINGIDO`, mensagem com o valor concreto do limite. Definida inteiramente dentro de `fundacao`, nunca em `comercial` (Decisão A) — nenhuma alteração ao grafo de módulos, `FundacaoModule` continua a nunca importar `ComercialModule`.
- **`ConviteService.criar()`** — nova verificação RN-10 inserida entre CV-06 e a geração do `token`: lê `SubscricaoPlano.limiteUtilizadores` via `tenantPrisma.client` (`null` → sem limite, passa); quando definido, soma Utilizadores ativos (`eliminadoEm: null`) e Convites pendentes não expirados; bloqueia se o total já atingido (Decisão B).
- **`ConviteService.aceitar()`** — revalidação RN-10 a par de CV-05, usando `PrismaService` bruto (Decisão C — defesa em profundidade): conta só Utilizadores ativos (o convite em aceitação não é somado como "pendente" nesse momento, está a tornar-se real).
- **Refinamento encontrado durante a escrita dos testes (não uma alteração de decisão)**: aceitar um convite pendente **não liberta espaço** para um novo convite — converte uma reserva (pendente) em uso real (ativo), a capacidade total comprometida mantém-se igual. O que genuinamente liberta espaço é a **expiração natural** de um convite pendente (a contagem de "pendentes" só considera `expiraEm > now()`). T22 valida exatamente este comportamento; a formulação inicial no plano de testes (§3.5, T4) estava imprecisa nesse ponto — corrigida na implementação real dos testes, sem impacto nas Decisões A-C já aprovadas.
- **Resultados**: `apps/api/test/convites.e2e-spec.ts` ganhou 8 testes novos (T19-T26) — plano sem limite, bloqueio por Utilizadores ativos, bloqueio por (ativos + pendentes), expiração natural a libertar espaço, caso positivo normal, mensagem com o valor concreto do limite, revalidação na aceitação, exclusão de Utilizadores eliminados (soft-delete) da contagem. Suite completa em 210/210 testes (202 herdados + 8 novos), estável em 2 execuções consecutivas. `npm run build` (`apps/api`) limpo; app confirmada a arrancar sem alterações de configuração/credenciais.
- **Descoberta técnica menor**: `convites.e2e-spec.ts` precisou de passar a importar `ComercialModule`/`IaModule` (além de `FundacaoModule`) para que o `SubscricaoListener` criasse `SubscricaoPlano` reativamente no registo — pré-requisito para testar o limite; nunca ativa `@BloqueadoPorSubscricao()`/RN-11 em nenhum endpoint de Convite (decisão já fixada no Passo 30, sem alteração — confirmado pelos testes T1-T18 continuarem a passar sem qualquer bloqueio adicional).
- **Sem ecrã novo** — o formulário de Convite (Passo 31) já mostra a mensagem exata do backend através do toast de erro genérico já existente.
- **Milestone M6 em curso** — próximo: Passo 34 (validação manual UC-01 + UC-02), agora viabilizado integralmente por este passo.

# NEXA — Especificação Técnica do Passo 4 (M1): Camada 1 — Middleware de Tenant + Serviço Único de Autorização

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 4 — Camada 1 (Middleware de Tenant + Serviço Único de Autorização) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M1 (Fundação), Passo 4 — **o mais crítico de todo o M1** |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-001 (Multi-Tenancy) · ADR-003 (Base de Dados e ORM) · ADR-004 (Autenticação, Sessão, Autorização) · System Design Principles v1.6 (3.2, 3.6, 3.8) · Security & Access Principles v1.1 (3.1-3.3, 3.9) · Coding Standards v1.0 (3.3, 3.4) · Especificação Técnica do Passo 3 (Autenticação) · Blueprint de Implementação do MVP v1.3 |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o mecanismo técnico da Camada 1 — o ponto único de controlo que torna o isolamento multi-tenant estruturalmente impossível de esquecer (System Design Principles, 3.6; ADR-001, D2) — e a ativação da Row-Level Security (Camada 2) deixada deliberadamente pendente desde o Passo 2. Este documento não decide arquitetura nova: concretiza, ao nível de implementação, decisões já aprovadas em ADR-001, ADR-003 e ADR-004, seguindo o mesmo processo formal já aplicado no Passo 3.

---

## 2. Contexto

O Passo 3 (Autenticação) está concluído: `SessionGuard` resolve uma sessão válida e identifica `{ utilizadorId, empresaId, papel }`, mas **não aplica qualquer filtro de tenant a queries de negócio** — não havia, até agora, nenhuma query de negócio a proteger (só Fundação/Auth existe). O Passo 4 muda isso: a partir daqui, qualquer módulo de negócio futuro (Processos, CRM, Dashboard, IA, Comercial) vai precisar de aceder a dados através de um único caminho, que nunca permite que uma query saia sem filtro de tenant — mesmo que quem escreva essa query se esqueça de o pedir.

Duas camadas independentes implementam esta garantia (ADR-001, 3.3 — Defense in Depth):
- **Camada 1** (aplicação): um wrapper do Prisma que injeta automaticamente `empresaId` em toda a operação, para modelos de negócio.
- **Camada 2** (base de dados): políticas de Row-Level Security no PostgreSQL, que recusam devolver ou aceitar linhas fora do `empresaId` da sessão de base de dados atual — **independente** da Camada 1, para que uma falha na Camada 1 não seja, por si só, suficiente para uma fuga de dados.

---

## 3. Conteúdo Estruturado

### 3.1 Delimitação de Responsabilidades — Sem Duplicação entre Autenticação, Autorização e RLS

*Secção adicionada em resposta direta à condição explícita da Fundadora/CEO de que a implementação preserve os princípios já estabelecidos sem duplicar responsabilidades.*

| Camada | Pergunta a que responde | Responsabilidade | Onde vive |
|---|---|---|---|
| **Autenticação** (Passo 3, concluído) | "Quem é?" | Resolve a sessão a partir do cookie; identifica `Utilizador` + `empresaId` + `papel` | `SessionGuard` (estendido neste passo, não duplicado) |
| **Camada 1 — Autorização estrutural** (este passo) | "A que Empresa pertence tudo o que este pedido vê ou escreve?" | Injeta `empresaId` automaticamente em toda a operação Prisma sobre modelos de negócio — **nunca decide se o papel pode executar a ação**, só garante que a ação nunca escapa da Empresa do utilizador autenticado | `TenantPrismaService` (Prisma Client Extension) + `TenantContext` (AsyncLocalStorage) |
| **RBAC granular** (Passo 5, ainda não construído) | "Este papel, com estas regras específicas da Empresa, pode executar esta ação?" | Verifica o papel e as regras granulares antes de permitir uma ação — **não existe ainda**; a Camada 1 não antecipa nem substitui esta responsabilidade | A construir no Passo 5, consultando o mesmo `TenantContext` já estabelecido aqui |
| **RLS** (este passo, camada de base de dados) | "Mesmo que a aplicação tenha um bug, esta linha pertence à sessão de BD atual?" | Reforça **exatamente a mesma fronteira de tenant** da Camada 1 — não é uma responsabilidade nova, é a mesma pergunta respondida duas vezes, por dois mecanismos independentes (Defense in Depth) | Políticas PostgreSQL, avaliadas independentemente do código da aplicação |
| **Registo de Auditoria** (Passo 6, ainda não construído) | "O que aconteceu, quem, quando?" | Regista a ação depois de executada — não decide se é permitida | A construir no Passo 6 |

**Consequência direta desta delimitação:** este passo **não implementa nenhuma verificação de papel/permissão granular** (ex: "só Gestor pode fazer X"). Implementa apenas o confinamento de tenant. Um `Utilizador` de qualquer papel, autenticado, tem — depois deste passo — exatamente o mesmo acesso a dados da sua própria Empresa que tinha antes (nenhum), porque ainda não existe nenhum módulo de negócio a servir dados. O valor deste passo é estrutural: torna **impossível**, a partir de agora, que um módulo de negócio futuro (Passo seguinte a este M1, ou os módulos de EP-02 a EP-06) aceda a dados sem o filtro de tenant — não porque alguém se lembre de o aplicar, mas porque a única via de acesso a dados já o aplica sempre.

### 3.2 Arquitetura

**3.2.1 Visão geral do fluxo**

```
Pedido HTTP (cookie nexa_session)
  → TenantContextMiddleware (aplicado a '*', antes de Guards/Interceptors): resolve Sessao + Utilizador
    → grava req.utilizador e corre o resto do pedido dentro de tenantContext.run(valor, () => next())
      → SessionGuard (por rota, @UseGuards): só verifica se req.utilizador já foi populado
        → Handler do controlador executa (await em toda chamada Prisma)
          → Serviço de negócio chama TenantPrismaService (nunca o PrismaClient bruto)
            → Prisma Client Extension lê o TenantContext ativo
              → injeta empresaId no where (leitura) / data (escrita) de toda a operação
                → executa a operação dentro de $transaction([set_config(...), query(...)])
                  → PostgreSQL avalia a política de RLS, independentemente do Prisma
                    → linha só é devolvida/aceite se empresaId (ou id, para Empresa)
                      corresponder à sessão de BD atual
```

**3.2.2 `TenantContext` — propagação do tenant ativo**

Usa `AsyncLocalStorage` nativo do Node.js (`node:async_hooks`) — **não** providers `Scope.REQUEST` do NestJS. Decisão explícita: providers request-scoped obrigam **toda a cadeia de dependências** de um serviço a tornar-se request-scoped também, com custo de performance real (uma nova instância por pedido, em vez de singleton); `AsyncLocalStorage` é a solução nativa do Node para este problema exato, sem dependência nova, consistente com o Princípio de Simplicidade Operacional (Blueprint, 5a).

```ts
// tenant-context.ts
export interface TenantContextValue {
  utilizadorId: string;
  empresaId: string;
  papel: string;
}
export const tenantContext = new AsyncLocalStorage<TenantContextValue>();
```

> **Correção técnica face à v1.0/v1.1 desta especificação — aprovada antes da implementação (ver 3.9).** Não é o `SessionGuard` que populariza o `TenantContext` — um Guard do NestJS não envolve a continuação do pedido (Interceptors → Controller → Handler) dentro do seu próprio call stack, o que é necessário para o `AsyncLocalStorage` propagar corretamente. Quem faz isso é o novo `TenantContextMiddleware` (aplicado a todas as rotas), que resolve a sessão uma única vez por pedido e corre o resto do pedido dentro de `tenantContext.run(valor, () => next())`. O `SessionGuard` fica reduzido a uma verificação leve — "`req.utilizador` já foi populado?" — sem duplicar a resolução de sessão. Detalhe completo em 3.9.

**3.2.3 `TenantPrismaService` — a Camada 1 concreta (implementação do "middleware que injeta tenant_id", ADR-003, 3.2)**

Prisma Client Extension (`$extends`, mecanismo atual do Prisma 5, sucessor do `$use` legado) que intercepta toda a operação (`$allOperations`) sobre os modelos de negócio (todos exceto `Empresa`, que não tem `empresaId` próprio — é o tenant):

- **Leitura** (`findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`): funde `empresaId: ctx.empresaId` no `where` recebido. Nota técnica: desde a versão "Extended Where Unique Input" do Prisma (disponível na 5.22, já em uso), `findUnique`/`update`/`delete` aceitam campos adicionais não-únicos no `where` mesmo sem índice composto — o Prisma trata `empresaId` como filtro extra: se não corresponder, devolve `null` (leitura) ou lança "Record not found" (escrita), exatamente o comportamento Fail Secure desejado (uma tentativa cross-tenant parece "não existe", nunca "existe mas não tens acesso" — não há fuga de informação sobre a existência do registo).
- **Escrita** (`create`, `createMany`): sobrescreve `data.empresaId` com `ctx.empresaId`, **mesmo que o chamador tenha fornecido outro valor** — defesa contra um bug que tentasse criar uma entidade noutra Empresa.
- **Atualização/eliminação** (`update`, `updateMany`, `delete`, `deleteMany`, `upsert`): funde `empresaId: ctx.empresaId` no `where`, pela mesma lógica da leitura.
- **Se não existir `TenantContext` ativo** (ex: um pedido não autenticado tentasse, por engano, chamar este serviço): a operação **falha explicitamente** (erro, nunca prossegue sem filtro) — Fail Secure (Security & Access Principles, 3.9).
- **Integridade referencial entre entidades de negócio** (ex: `Processo.responsavelId` tem de pertencer à mesma Empresa) **não é verificada aqui** — já está garantida pelas constraints de chave estrangeira compostas do Passo 2 (Camada 3, ADR-003 3.3). A Camada 1 só garante a própria coluna `empresaId`; a consistência entre colunas já é da base de dados.

**Exceção documentada, não uma lacuna:** `AuthService` e `TenantContextMiddleware` continuam a usar o `PrismaService` bruto (não o `TenantPrismaService`), porque a verificação de email duplicado no registo é deliberadamente global, e a resolução da sessão acontece **antes** de existir um `TenantContext` — não pode depender dele. Isto é consistente com System Design Principles (3.2, D3): a Fundação já é reconhecida como a única camada com acesso transversal. `PrismaService` (bruto) fica **privado ao módulo Fundação** — não é exportado para nenhum módulo de negócio futuro, que só recebe `TenantPrismaService`. **Correção adicional (ver 3.9):** `PrismaService` liga-se com o role `nexa_fundacao` (BYPASSRLS), não `nexa_app` — descoberto durante a implementação que o próprio registo (criação da Empresa) é bloqueado pela política RLS de `Empresa` se o role usado estiver sujeito a RLS, já que não existe `empresaId`/`id` de sessão a definir nesse bootstrap.

**3.2.4 Row-Level Security (Camada 2) — ativação**

1. **Utilizador de base de dados dedicado, não-owner:** novo role `nexa_app`, distinto de `nexa_dev` (que continua a ser o owner das tabelas e o role usado só para migrações). `nexa_app` recebe apenas `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` + `GRANT USAGE ON SCHEMA public` — sem privilégio de DDL, sem `CREATEDB`, sem ownership (Least Privilege, Security & Access Principles 3.9). A aplicação passa a ligar-se com `nexa_app`; `apps/api/.env` é atualizado.
2. **Políticas RLS**, uma por tabela de negócio (todas exceto `Empresa`, que usa `id` como predicado em vez de `empresaId`):
   ```sql
   ALTER TABLE "Utilizador" ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON "Utilizador"
     USING ("empresaId" = current_setting('app.current_empresa_id', true))
     WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));
   ```
   `current_setting(..., true)` (modo "missing_ok") devolve `NULL` quando a variável não está definida — `NULL = qualquer coisa` é sempre falso, logo **negação por defeito** (regra não-negociável #14) quando ninguém definiu o tenant, sem exigir tratamento especial.
3. **`SET LOCAL` por transação:** o `TenantPrismaService` (3.2.3) executa toda a operação dentro de `prisma.$transaction([prisma.$executeRaw`SELECT set_config('app.current_empresa_id', ${ctx.empresaId}, TRUE)`, query(scopedArgs)])` — a forma "array" do `$transaction` do Prisma (recomendada pela própria documentação do Prisma para este padrão de RLS), que corre ambas as operações na mesma transação/ligação. `set_config(..., TRUE)` com o terceiro argumento `TRUE` é equivalente a `SET LOCAL` — o valor só vive dentro dessa transação, nunca vaza para outra ligação do pool.
4. **Custo de performance** (uma transação por operação, em vez de uma query solta): risco já identificado e aceite em ADR-003 (3.7) — "a validar com testes de carga reais na Fase 8, não motivo para reverter a decisão agora". Não é reavaliado neste passo.

### 3.3 Dependências

- Passo 2 (schema, migrações, constraints de FK compostas) — sem alterações estruturais necessárias.
- Passo 3 (`SessionGuard`, resolução de sessão) — estendido, não duplicado.
- PostgreSQL 17 local já instalado (Passo 2) — suporta RLS nativamente, sem infraestrutura nova.
- Nenhuma dependência de infraestrutura externa nova (sem Redis, sem serviço de terceiros).

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-001 (3.3, Camada 1+2) | ✅ Implementadas ambas as camadas, independentes uma da outra |
| ADR-003 (3.2, D3) | ✅ `TenantPrismaService` é a implementação concreta do "middleware que injeta tenant_id"; constraints do Passo 2 continuam a ser a Camada 3 |
| System Design Principles (3.6) | ✅ Ponto único de controlo — nenhum módulo de negócio futuro pode aceder a dados de outra forma |
| Security & Access Principles (3.9, Least Privilege/Fail Secure) | ✅ `nexa_app` sem privilégio além do necessário; ausência de `TenantContext` ou de regra RLS resulta sempre em negação |
| Coding Standards (3.3) | ✅ Reforça, com mecanismo técnico, a regra já escrita "nenhuma query fora da Camada 1" |

**Nenhum novo ADR é necessário** — mesma justificação do Passo 3: tudo aqui é implementação de decisões já aprovadas (ADR-001, ADR-003), não uma alternativa tecnológica nova.

**Módulos afetados:** só `apps/api/src/modules/fundacao/`. Nenhum módulo de negócio existe ainda para migrar — este passo prepara o caminho para os módulos de EP-02 a EP-06, que nascerão já a consumir `TenantPrismaService` desde o primeiro dia, sem migração futura necessária.

### 3.5 Critérios de Aceitação e Exit Criteria

**Testes funcionais (automatizados, Jest — ver 3.6):**

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Duas Empresas (A, B), cada uma com um Utilizador; sessão de A tenta `findMany` sobre uma entidade de negócio simulada | Só devolve linhas de A, mesmo sem o código do teste pedir explicitamente o filtro |
| T2 | Sessão de A tenta `create` fornecendo `empresaId` de B no `data` | Linha criada fica com `empresaId` de A (sobrescrito), nunca de B |
| T3 | Sessão de A tenta `update`/`delete` sobre um `id` que pertence a B | `0` linhas afetadas / "Record not found" — nunca afeta a linha de B |
| T4 | Operação chamada **sem** `TenantContext` ativo (fora de um pedido autenticado) | Falha explicitamente, nunca executa sem filtro |
| T5 | Regressão: todos os testes do Passo 3 (T1-T10, S1-S4) continuam a passar | Sem alteração de comportamento no fluxo de Autenticação |

**Testes de segurança (verificação direta contra a BD, via `psql` como `nexa_app`, sem passar pela aplicação — prova que a Camada 2 funciona independentemente da Camada 1):**

| # | Verificação |
|---|---|
| S1 | Ligar como `nexa_app`, **sem** `SET app.current_empresa_id`, `SELECT * FROM "Utilizador"` → 0 linhas |
| S2 | Ligar como `nexa_app`, `SET app.current_empresa_id = '<id de A>'`, `SELECT * FROM "Utilizador"` → só linhas de A, mesmo existindo linhas de B na tabela |
| S3 | Ligar como `nexa_app`, tentar `INSERT` com `empresaId` diferente do `current_setting` ativo → rejeitado pelo `WITH CHECK` da política |
| S4 | Ligar como `nexa_app`, tentar `CREATE TABLE` ou `ALTER TABLE` → "permission denied" (confirma Least Privilege — sem DDL) |
| S5 | Ligar como `nexa_dev` (owner), confirmar que **continua a conseguir migrar** (RLS não bloqueia o role de migração, que nunca serve pedidos da aplicação) |

**Exit Criteria do Passo 4:** T1-T5 e S1-S5 passam; `npm run build` sem erros; nenhuma verificação de RBAC granular foi antecipada (3.1); `apps/api/.env` aponta para `nexa_app`, não `nexa_dev`; documentação e histórico atualizados em todos os artefactos afetados.

### 3.6 Estratégia de Testes

Este é o primeiro passo do M1 onde um dos **4 fluxos críticos obrigatórios** (NFR-17, Coding Standards 3.4 — isolamento multi-tenant) passa a ter cobertura **automatizada**, não apenas verificação manual como nos Passos 2 e 3. Proposta:

- Base de dados de teste dedicada (`nexa_test`, mesma instância PostgreSQL 17 local) — nunca a `nexa_dev` usada em desenvolvimento manual, para não misturar dados de teste automatizado com dados de exploração manual.
- `apps/api/test/tenant-isolation.e2e-spec.ts` (Jest, `@nestjs/testing`) — implementa T1-T4 da tabela acima como testes automatizados reais, contra a `nexa_test`.
- S1-S5 continuam manuais (via `psql`) neste passo — são verificação de infraestrutura/permissões de BD, não lógica de aplicação; candidatos a automatizar num script de verificação de ambiente no futuro (ADR-007), não bloqueiam este passo.

### 3.7 Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Overhead de performance (transação por operação, para o `SET LOCAL`) | Já identificado e aceite em ADR-003 (3.7) — validar com testes de carga reais na Fase 8, não motivo para bloquear este passo |
| R2 | Erro humano: um módulo de negócio futuro injeta `PrismaService` bruto em vez de `TenantPrismaService` | Mitigado estruturalmente — `PrismaService` bruto não é exportado por `FundacaoModule`; só `TenantPrismaService` é. Reforçado por revisão de código (Coding Standards, 3.3) |
| R3 | `AsyncLocalStorage` não se propaga automaticamente para trabalho assíncrono fora do ciclo de pedido HTTP (ex: filas, cron jobs) | Não aplicável ainda — não existe nenhum worker em segundo plano no M1. Registado para revisitar quando o Notification Dispatcher (Event & Notification Architecture Rules) for construído |
| R4 | **Ausência de controlo de versões (git) no repositório** — um plano de rollback é significativamente mais fraco sem histórico de commits reais | Ver 3.8 — apresentado como decisão a validar antes de avançar, não decidido unilateralmente |

### 3.8 Plano de Rollback

**Migração (RLS):** a migração deste passo inclui explicitamente o par direto/reverso:
```sql
-- reverso, documentado mas não aplicado automaticamente
ALTER TABLE "Utilizador" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Utilizador";
-- (repetido por tabela)
```
**Role de BD:** reverter `apps/api/.env` para `DATABASE_URL` com `nexa_dev` (o estado do Passo 3) restaura imediatamente o comportamento anterior — a aplicação volta a funcionar sem RLS, sem exigir alteração de código (`nexa_app` fica apenas revogado/eliminado com `REVOKE ALL ...; DROP ROLE nexa_app;`).

**Código:** aqui identifico uma lacuna que afeta a qualidade de qualquer plano de rollback deste ponto em diante — **este repositório não tem controlo de versões (git)**. Sem histórico de commits, reverter código significa restaurar manualmente ficheiros a partir de cópias, um processo frágil e sujeito a erro humano, incompatível com o rigor de rollback que este passo (o mais crítico do M1) exige.

> **Resolvido — aprovado pela Fundadora/CEO.** Repositório git local inicializado (sem remoto associado, sem push). `.gitignore` revisto e reforçado (segredos, credenciais, bases de dados locais, `.claude/` como configuração de ferramenta, não estado do projeto). Commit inicial `8f047cb` — `chore: baseline approved - implementation steps 0-3` — 74 ficheiros, árvore de trabalho confirmada limpa (`git status` → "nothing to commit, working tree clean") e sem remotes configurados (`git remote -v` → vazio). **A partir de agora, o plano de rollback deste e de todos os passos seguintes é executável** (`git revert`/`git reset --hard 8f047cb`), não apenas descritivo.

**Role `nexa_fundacao` (correção 3.9):** reverter `apps/api/.env`/`.env.test` para remover `FUNDACAO_DATABASE_URL` e `nexa_fundacao` com `REVOKE ALL ...; DROP ROLE nexa_fundacao;` — o `PrismaService` voltaria a precisar de um role sem RLS para o `AuthService` funcionar (equivalente a reverter também a ativação de RLS, 3.8 acima).

### 3.9 Correções Técnicas Durante a Implementação

*Duas correções identificadas ao implementar, ambas documentadas e submetidas à aprovação da Fundadora/CEO antes de serem aplicadas, consistente com a exigência de que nenhum desvio avance sem validação prévia.*

**Correção 1 — Resolução de sessão movida do `SessionGuard` para um novo `TenantContextMiddleware`.** A v1.0/v1.1 desta especificação previa que o `SessionGuard` (Passo 3) fosse estendido para popular o `TenantContext`. Ao detalhar a implementação, confirmei que isto não funciona: um Guard do NestJS só devolve `true`/`false` ao próprio NestJS — não envolve a continuação do pedido (Interceptors → Controller → Handler) dentro do seu próprio call stack, que é exatamente o que o `AsyncLocalStorage` precisa para propagar o contexto corretamente. Corrigido: a resolução de sessão (ler cookie, validar `Sessao`/`Utilizador`) passou para um `TenantContextMiddleware` (`apps/api/src/modules/fundacao/tenant/tenant-context.middleware.ts`), aplicado a todas as rotas (`forRoutes('*')`, `FundacaoModule.configure()`), que resolve o contexto **uma única vez por pedido** e corre o resto do pedido dentro de `tenantContext.run(...)`. O `SessionGuard` (`session.guard.ts`) ficou reduzido a uma verificação leve — `request.utilizador` existe? — sem duplicar nenhuma lógica de resolução. Aprovada explicitamente antes da implementação.

**Correção 2 — Novo role `nexa_fundacao` (BYPASSRLS) para o `PrismaService` bruto.** Ao correr o teste HTTP real (3.10), o registo (`POST /auth/registar`) falhou com `new row violates row-level security policy for table "Empresa"`. Causa: o `PrismaService` (usado por `AuthService` e, inicialmente, também pelo `TenantContextMiddleware`) ligava-se com `nexa_app` — mas criar uma Empresa nova é, por natureza, uma operação sem `empresaId`/`id` de sessão a definir ainda (o próprio bootstrap do registo), pelo que a política RLS de `Empresa` bloqueia sempre este `INSERT`, mesmo sendo legítimo. Corrigido: criado um terceiro role, `nexa_fundacao`, com o atributo `BYPASSRLS` do PostgreSQL (ignora RLS em todas as tabelas) e **exatamente os mesmos privilégios DML de `nexa_app`** (sem DDL) — usado exclusivamente pelo `PrismaService` bruto (Auth + resolução de sessão), nunca pelo `TenantPrismaService`. Reflete tecnicamente o que já estava documentado desde o Passo 3 e o System Design Principles (3.2, D3): a Fundação é a única camada com acesso transversal reconhecido — `BYPASSRLS` sem DDL mantém Least Privilege (só ignora RLS, não ganha privilégio de schema). Aprovada explicitamente antes da implementação, com confirmação verificada empiricamente (3.10) de que `nexa_fundacao` vê dados sem `current_setting` (BYPASSRLS ativo) mas continua sem conseguir `CREATE TABLE` (sem DDL).

### 3.10 Resultado da Implementação e Evidências de Validação

**Entregáveis:** `apps/api/src/modules/fundacao/tenant/` (`tenant-context.ts`, `tenant-context.middleware.ts`); `apps/api/src/modules/fundacao/prisma/tenant-prisma.service.ts`; `session.guard.ts` reescrito (verificação leve); `prisma.service.ts` atualizado (role `nexa_fundacao`); `fundacao.module.ts` atualizado (regista o middleware, exporta só `TenantPrismaService`); migração `20260706105932_enable_row_level_security`; roles de BD `nexa_app` e `nexa_fundacao`; base de dados de teste `nexa_test`; suite de testes automatizados (`apps/api/test/`).

**Resultados dos testes funcionais (Jest, automatizados, `nexa_test`):**

| # | Resultado |
|---|---|
| T1 | ✅ `findMany` só devolve linhas da própria Empresa |
| T2 | ✅ `create` sobrescreve `empresaId` fornecido pelo chamador |
| T3 | ✅ `update` sobre `id` de outra Empresa não afeta a linha |
| T4 | ✅ Operação sem `TenantContext` falha explicitamente |
| T5 (regressão Passo 3) | ✅ Confirmado manualmente contra `nexa_dev` (registo, login, `GET /auth/eu`, password errada — sem alteração de comportamento) |

**Verificação adicional, além do exigido pela especificação original:** escrito também um teste HTTP real (`tenant-context-http.e2e-spec.ts`, com `supertest`) que prova a propagação do `TenantContext` através do pedido HTTP completo (Middleware → Guard → Controller), não apenas do isolamento artificial dos testes T1-T4. Foi precisamente este teste que revelou a Correção 2 (3.9) — sem ele, o bloqueio do registo por RLS só seria descoberto em uso real.

**Resultados dos testes de segurança (verificação direta via `psql`, sem passar pela aplicação):**

| # | Resultado |
|---|---|
| S1 | ✅ `nexa_app` sem `current_setting` → 0 linhas |
| S2 | ✅ `nexa_app` com `current_setting` = Empresa A → só linhas de A |
| S3 | ✅ `nexa_app` tenta `INSERT` com `empresaId` diferente do `current_setting` → rejeitado pelo `WITH CHECK` |
| S4 | ✅ `nexa_app` tenta `CREATE TABLE` → "permission denied" |
| S5 | ✅ `nexa_dev` (owner) continua a funcionar sem restrição |
| Verificação adicional — `nexa_fundacao` | ✅ Vê dados sem `current_setting` definido (BYPASSRLS confirmado empiricamente), mas continua sem conseguir `CREATE TABLE` (sem DDL, Least Privilege confirmado) |

**`npm run build --workspace=apps/api`:** ✅ sem erros de TypeScript (`strict` mode). **`eslint`:** ✅ sem avisos.

**Exit Criteria do Passo 4: cumprido integralmente**, incluindo as duas correções técnicas devidamente documentadas e aprovadas antes de implementadas. Dados de teste removidos de `nexa_dev`/`nexa_test` após validação.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | `AsyncLocalStorage` nativo, não providers `Scope.REQUEST` do NestJS | Evita o custo de performance de tornar toda a cadeia de dependências request-scoped; solução nativa do Node, sem dependência nova (Blueprint 5a) |
| D2 | Prisma Client Extension (`$extends`) como mecanismo concreto da Camada 1, fundindo `empresaId` no `where`/`data` de toda operação | Implementação direta do "middleware que injeta tenant_id" já previsto em ADR-003 (3.2); usa a "Extended Where Unique Input" do Prisma 5 para funcionar uniformemente em `findUnique`/`update`/`delete` sem exigir alterações ao schema |
| D3 | Falha de tentativa cross-tenant devolve "não encontrado", nunca "encontrado mas sem permissão" | Fail Secure sem fuga de informação sobre a existência do registo — comportamento nativo do Prisma com esta técnica, não uma escolha adicional |
| D4 | `AuthService` mantém-se no `PrismaService` bruto (não migra para `TenantPrismaService`) | A verificação de email global do registo e a resolução de sessão acontecem antes de existir `TenantContext` — consistente com a exceção já documentada no Passo 3 e com o reconhecimento da Fundação como camada transversal (System Design Principles, 3.2, D3) |
| D5 | `nexa_app` como novo role de BD dedicado, sem privilégio de DDL nem ownership | Least Privilege (Security & Access Principles, 3.9) — a aplicação nunca precisa de alterar schema em runtime |
| D6 | Base de dados de teste dedicada (`nexa_test`) para os testes automatizados deste passo | Evita misturar dados de teste automatizado com dados de exploração manual em `nexa_dev`; primeiro passo do M1 com cobertura automatizada real de um dos 4 fluxos críticos (NFR-17) |
| D7 | Recomendação de inicializar git antes deste passo, não decidida unilateralmente — **aprovada pela Fundadora/CEO e executada** (commit `8f047cb`) | Um plano de rollback sem controlo de versões é descritivo, não executável — identificado como lacuna real ao preparar este documento; resolvido antes de qualquer implementação deste passo, conforme exigido |
| D8 | Resolução de sessão movida do `SessionGuard` para um novo `TenantContextMiddleware` — **aprovada pela Fundadora/CEO antes da implementação** (3.9, Correção 1) | Um Guard do NestJS não envolve a continuação do pedido no seu próprio call stack — necessário para o `AsyncLocalStorage` propagar; só um Middleware consegue. Sem duplicação: a resolução de sessão vive só no Middleware, o Guard só a consulta |
| D9 | Novo role `nexa_fundacao` (BYPASSRLS, sem DDL) para o `PrismaService` bruto — **aprovada pela Fundadora/CEO antes da implementação** (3.9, Correção 2) | O registo cria uma Empresa sem `empresaId`/`id` de sessão ainda definido (bootstrap) — um role sujeito a RLS bloquearia sempre esta operação legítima. `nexa_fundacao` reflete tecnicamente o acesso transversal da Fundação já documentado (System Design Principles, 3.2, D3), sem alargar privilégios além do estritamente necessário |
| D10 | Teste HTTP real adicional (`tenant-context-http.e2e-spec.ts`, com `supertest`), além do exigido pela especificação original | Provou a propagação do TenantContext através do pedido HTTP completo, não só do isolamento artificial dos testes T1-T4 — foi este teste que revelou a necessidade de D9 |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| 1 | ~~Inicializar git antes de avançar com o Passo 4?~~ | **Resolvida.** Aprovado pela Fundadora/CEO; git inicializado, commit `8f047cb`, sem remoto — ver 3.8 e D7 | Fundadora/CEO — decidido |
| 2 | Nome exato da base de dados de teste (`nexa_test` proposto) e se deve ser recriada a cada execução de testes ou persistente | Detalhe operacional, não bloqueia a decisão de arquitetura | CTO, pode decidir ao implementar, sem nova validação formal |
| 3 | Overhead real de performance da abordagem `$transaction` por operação | Já registado como Q3 do ADR-003 (Fase 8) — não é novo, só reafirmado aqui | CTO, com testes de carga reais |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 4, a pedido explícito da Fundadora/CEO antes de qualquer implementação: delimitação de responsabilidades entre Autenticação/Camada 1/RBAC/RLS/Auditoria (sem duplicação), arquitetura completa (TenantContext, TenantPrismaService, ativação de RLS com role dedicado), dependências, impacto arquitetural (nenhum novo ADR necessário), critérios de aceitação/Exit Criteria, estratégia de testes (primeira cobertura automatizada de um fluxo crítico, NFR-17), riscos, e plano de rollback (identificando a ausência de git como lacuna a validar) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-06 | **Pré-requisito de rollback resolvido.** Fundadora/CEO aprovou a inicialização de git local (sem remoto); `.gitignore` reforçado e revisto; commit inicial `8f047cb` ("chore: baseline approved - implementation steps 0-3", 74 ficheiros) criado; árvore de trabalho confirmada limpa. Questão em Aberto 1 e Decisão D7 atualizadas para refletir a resolução. A especificação em si (arquitetura, critérios, testes) permanece por aprovar antes de iniciar a implementação | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-06 | **Aprovação formal da especificação.** Fundadora/CEO autoriza a implementação, condicionada a: baseline git antes de iniciar (concluído), conformidade integral com Blueprint/ADRs/Security & Access Principles/Coding Standards/Data & Consistency Rules, documentação prévia de qualquer desvio, e relatório técnico completo no fecho | Fundadora/CEO |
| 1.2 | 2026-07-06 | Registadas as duas correções técnicas identificadas e aprovadas durante a implementação (3.9: TenantContextMiddleware substitui a resolução de sessão no SessionGuard; role `nexa_fundacao` com BYPASSRLS para o PrismaService bruto), adicionada a secção 3.10 com os resultados reais de T1-T5/S1-S5 e da verificação HTTP end-to-end adicional, novas Decisões D8-D10. Exit Criteria do Passo 4 cumprido integralmente | CTO (Claude) + Fundadora/CEO |

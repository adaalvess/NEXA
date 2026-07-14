# NEXA — Relatório de Execução do Passo 40 (M7 — Base de Dados Neon em Staging)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 40: Base de Dados Neon (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 40 |
| **Versão** | 1.1 |
| **Estado** | ✅ Concluído e formalmente aprovado pela Fundadora/CEO (2026-07-12) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 40](39-especificacao-tecnica-passo-40-neon-staging.md); ADR-007 (v1.2) |
| **Última atualização** | 2026-07-12 |

---

## 1. Resumo Executivo

Base de dados de staging criada na Neon (PostgreSQL 17, região UE), com o schema completo replicado (17 migrações, RLS, trigger de imutabilidade) e os 4 roles de BD recriados com exatamente os privilégios já validados localmente. Teste de fumo completo (registo, login, isolamento multi-tenant, imutabilidade do Registo de Auditoria) executado com sucesso contra a base de dados real, não simulado. **Um desvio de arquitetura foi detetado e corrigido durante a execução** (região inicial incorreta) e **um achado fica pendente de decisão** (retenção de backups do plano gratuito abaixo do mínimo exigido pelo ADR-007) — nenhum dos dois foi decidido unilateralmente.

---

## 2. Desvio Detetado e Corrigido — Região Inicial Incorreta

O primeiro projeto Neon (criado pela Fundadora/CEO antes deste passo, via `neonctl init`) tinha sido provisionado em `aws-us-east-1` (EUA) — violação direta do ADR-007 §3.2 e do NFR-21 ("Alojamento de dados: Dentro da União Europeia"). Sinalizado imediatamente, sem prosseguir com a configuração. Após confirmação explícita da Fundadora/CEO: projeto eliminado e recriado do zero na região correta.

## 3. Projeto Neon — Estado Final

| Campo | Valor |
|---|---|
| Nome | `NEXA` |
| ID do projeto | `old-dust-53652461` |
| Organização | `org-nameless-wind-63008870` (`adaira1989@gmail.com`) |
| Região | `aws-eu-central-1` (Frankfurt, UE) ✅ |
| Plano | Free |
| Versão PostgreSQL | 17 (igual à versão local `nexa_dev`) |
| Base de dados | `nexa` |
| Host (endpoint direto, só migrações) | `ep-old-thunder-asb5y9w0.c-4.eu-central-1.aws.neon.tech` |
| Host (endpoint pooled, tráfego de runtime) | `ep-old-thunder-asb5y9w0-pooler.c-4.eu-central-1.aws.neon.tech` |

## 4. Schema e Migrações

`prisma migrate deploy` executado com sucesso contra o endpoint direto (owner `nexa_owner`) — **17/17 migrações aplicadas**, na mesma ordem já validada em `nexa_dev`/`nexa_test`: schema base, RLS de todas as 16 tabelas tenant-scoped, o trigger de imutabilidade do Registo de Auditoria, e todas as extensões aditivas de schema dos Milestones M2-M7. Confirmado por leitura direta do catálogo (`pg_tables`, `pg_trigger`) — nunca apenas pela ausência de erro no comando.

## 5. Roles de Base de Dados — Criados e Verificados

Script SQL da Especificação Técnica (secção 3.2) executado sem alterações. **O risco técnico sinalizado na especificação (incerteza sobre se o owner do Neon permite `CREATE ROLE ... BYPASSRLS`) fica resolvido empiricamente: permite.**

| Role | `rolcanlogin` | `rolbypassrls` | Privilégios confirmados |
|---|---|---|---|
| `nexa_owner` (Neon, por defeito) | ✅ | ✅ | Owner de todas as tabelas — só usado para migrações |
| `nexa_app` | ✅ | ❌ (correto — sujeito a RLS) | `SELECT/INSERT/UPDATE/DELETE` nas 18 tabelas do schema `public` |
| `nexa_fundacao` | ✅ | ✅ | Mesmos privilégios DML de `nexa_app` |
| `nexa_auditoria_interna` | ✅ | ✅ | **Só `SELECT` em `RegistoAuditoria`** — confirmado que não tem nenhum outro grant em nenhuma outra tabela |

Palavras-passe geradas com `crypto.randomBytes(24)` (48 caracteres hex cada), guardadas só em `apps/api/.env.staging` (nunca commitado — `.gitignore` corrigido nesta execução, ver secção 8).

## 6. Validações Realizadas (Todas Reais, Contra a Base de Dados Neon)

| Validação | Resultado |
|---|---|
| RLS ativa nas 16 tabelas tenant-scoped | ✅ Confirmado via `pg_tables.rowsecurity` |
| `TentativaLoginFalhada` sem RLS (por desenho) | ✅ Confirmado — única tabela de negócio sem RLS, intencional |
| Trigger `trg_registo_auditoria_imutavel` presente em `RegistoAuditoria` | ✅ Confirmado via `pg_trigger` |
| Registo de Utilizador (Empresa de demonstração A) | ✅ `POST /auth/registar` → `201` |
| Login | ✅ `POST /auth/login` → `200`, cookie de sessão válido |
| Isolamento multi-tenant | ✅ Empresa A cria um Processo; Empresa B (sessão distinta) lista `GET /processos` → `[]`, nunca vê o Processo da A |
| Imutabilidade do Registo de Auditoria | ✅ `UPDATE`/`DELETE` diretos rejeitados pelo trigger, mesmo usando o role owner (privilégio SQL total); registo permaneceu intacto |
| Limpeza dos dados de teste | ✅ As 2 Empresas de demonstração eliminadas; BD de staging confirmada vazia (0 Empresas, 0 Utilizadores) no final |

## 7. Achado — Retenção de Backups Abaixo do Mínimo do ADR-007 (Resolvido)

O ADR-007 §3.8 exige "Backups automáticos diários com retenção mínima de 7 dias". A Neon usa recuperação num ponto no tempo (PITR) contínua como mecanismo de backup — confirmado **ativo**, mas com **retenção de só 6 horas** (`history_retention_seconds: 21600`) no plano Free atualmente associado à organização. Planos pagos da Neon (ex: Launch) oferecem retenção mais longa, compatível com os 7 dias exigidos.

**Decisão da Fundadora/CEO (2026-07-12): opção (b) aprovada** — mantém-se o plano Neon Free em staging, aceitando temporariamente 6h de retenção. Registado formalmente como **exceção temporária no próprio ADR-007** (§3.8 + nova Questão em Aberto Q4, versão 1.2), com o requisito explícito e não-negociável de que o upgrade do plano tem de acontecer **antes de qualquer lançamento em produção**, nunca ficando esquecido ou assumido implicitamente.

## 8. Correção de Segurança Encontrada Durante a Execução

`.gitignore` não cobria `.env.staging` (só `.env`, `.env.local`, `.env.*.local`, `.env.test`, `.env.migrate` — nenhum destes padrões coincide com `.env.staging`). Corrigido antes de escrever qualquer segredo em disco — `.env.staging` adicionado explicitamente ao `.gitignore`, confirmado por `git check-ignore -v` e por `git status` nunca mostrar o ficheiro.

## 9. Refinamento Técnico — Endpoint Pooled vs Direto

Não estava explicitamente detalhado na Especificação Técnica: usei o endpoint **pooled** (PgBouncer, `-pooler` no hostname) para os 3 roles de runtime (`nexa_app`, `nexa_fundacao`, `nexa_auditoria_interna`) — recomendação nativa da Neon para tráfego de aplicação com muitas ligações curtas — e o endpoint **direto** só para `DATABASE_ADMIN_URL` (migrações, que exigem funcionalidades incompatíveis com o modo transação do pooler). Não altera nenhuma decisão de arquitetura — é só a escolha do hostname de ligação.

## 10. `.env.staging` — Estrutura Final (Sem Segredos)

```
PORT=4000
DATABASE_ADMIN_URL="postgresql://nexa_owner:***@ep-old-thunder-asb5y9w0.c-4.eu-central-1.aws.neon.tech/nexa?sslmode=require"
DATABASE_URL="postgresql://nexa_app:***@ep-old-thunder-asb5y9w0-pooler.c-4.eu-central-1.aws.neon.tech/nexa?sslmode=require"
FUNDACAO_DATABASE_URL="postgresql://nexa_fundacao:***@ep-old-thunder-asb5y9w0-pooler.c-4.eu-central-1.aws.neon.tech/nexa?sslmode=require"
AUDITORIA_INTERNA_DATABASE_URL="postgresql://nexa_auditoria_interna:***@ep-old-thunder-asb5y9w0-pooler.c-4.eu-central-1.aws.neon.tech/nexa?sslmode=require"
WEB_APP_URL="http://localhost:3000"
SESSION_SECRET="***" (64 caracteres hex, gerado com crypto.randomBytes(32))
ARGON2_MEMORY_COST=19456
ARGON2_TIME_COST=2
```

Ainda por preencher (fora do âmbito deste passo): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_*` — credenciais de teste/sandbox dos fornecedores, a resolver quando o Passo 41/42 as tornar necessárias, consistente com a decisão já aprovada ("credenciais de teste/sandbox reais sempre que disponíveis").

## 11. Exit Criteria (Especificação Técnica do Passo 40) — Checklist

- [x] Base de dados Neon criada, região UE, schema completo migrado.
- [x] Os 4 roles criados com exatamente os privilégios documentados, confirmados por teste direto.
- [x] Teste de fumo manual concluído sem erros: registo, login, isolamento multi-tenant, imutabilidade do Registo de Auditoria.
- [x] `.env.staging` preenchido e nunca commitado (`.gitignore` corrigido).
- [x] Backups automáticos confirmados **ativos** — retenção de 6h em staging, exceção temporária formalmente aprovada e registada no ADR-007 (secção 7).

---

## 12. Recomendação

**Passo 40 formalmente concluído.** Todos os Exit Criteria cumpridos, incluindo o achado da secção 7, já resolvido e registado permanentemente no ADR-007 (v1.2, Q4) — upgrade do plano Neon obrigatório antes de produção, nunca antes disso. Nada bloqueia o avanço para o Passo 41 (Backend em Render).

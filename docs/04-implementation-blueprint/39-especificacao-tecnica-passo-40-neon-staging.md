# NEXA — Especificação Técnica do Passo 40 (M7 — Base de Dados Neon em Staging)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 40: Base de Dados Neon (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 40 — segundo passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.1-3.2/3.8; Especificação Técnica do Passo 4 (roles de BD); Especificação Técnica do Passo 6 (`nexa_auditoria_interna`); Proposta do Milestone M7 |
| **Última atualização** | 2026-07-11 |

---

## 1. Objetivo

Provisionar a base de dados PostgreSQL gerida (Neon, região UE, ADR-007 §3.2) para o ambiente de **staging**, replicando integralmente o que já existe localmente (`nexa_dev`): schema completo (17 modelos), os 4 roles de BD com os privilégios exatos já validados, Row-Level Security ativa, e o trigger de imutabilidade do Registo de Auditoria — sem reinterpretar nenhuma decisão já tomada nos Passos 2/4/6, só a reproduzir num ambiente gerido.

---

## 2. Bloqueio Estrutural — Conta/Projeto Neon

**Tal como o Passo 39 (GitHub), este passo depende de uma decisão que só a Fundadora/CEO pode tomar**: a conta Neon (nova ou existente) e o projeto onde a base de dados de staging vai ser criada. Nada neste documento assume essa configuração — a preparação (scripts, comandos, variáveis de ambiente) fica pronta a executar assim que a conta/projeto existir.

**Informação necessária antes de qualquer execução real:**
- Conta Neon nova ou já existente?
- Nome do projeto (proponho `nexa-staging`, a confirmar).
- Plano — o nível gratuito do Neon já inclui região UE, backups automáticos e branching (suficiente para staging, ADR-007 nunca exigiu um plano pago para esta fase); a confirmar se há preferência diferente.

---

## 3. O Que Precisa de Ser Replicado (Inventário a Partir do Ambiente Local)

### 3.1 Schema e Migrações

Toda a estrutura (17 modelos, RLS de cada tabela tenant-scoped, o trigger de imutabilidade do Registo de Auditoria) já está capturada em `apps/api/prisma/migrations/` — **nenhuma recriação manual necessária**. `prisma migrate deploy` (com a connection string do role owner do Neon) replica tudo, na ordem correta, tal como já acontece hoje entre `nexa_dev` e `nexa_test` (mesma disciplina "D9" já usada nos Passos 7/29/39).

### 3.2 Os 4 Roles de Base de Dados (Recriação Manual — Não Está em Nenhuma Migração Prisma)

Estes roles foram criados manualmente fora do Prisma nos Passos 4 e 6 — precisam de ser recriados manualmente também no Neon, com exatamente os mesmos privilégios já documentados e validados:

| Role | Privilégios | Origem |
|---|---|---|
| **owner** (Neon já cria um por defeito, ex: `neondb_owner`) | Dono das tabelas, único usado para `prisma migrate deploy` | — |
| `nexa_app` | `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` + `GRANT USAGE ON SCHEMA public`, sujeito a RLS | Passo 4 |
| `nexa_fundacao` | Mesmos privilégios DML de `nexa_app` + atributo `BYPASSRLS` | Passo 4 |
| `nexa_auditoria_interna` | `BYPASSRLS`, só `GRANT SELECT ON "RegistoAuditoria"` — nenhuma outra tabela, nenhum outro privilégio | Passo 6 |

```sql
-- A correr uma única vez, com a connection string do owner do Neon, depois
-- de `prisma migrate deploy` já ter criado todas as tabelas.
CREATE ROLE nexa_app LOGIN PASSWORD '<gerar segredo forte>';
GRANT USAGE ON SCHEMA public TO nexa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexa_app;

CREATE ROLE nexa_fundacao LOGIN PASSWORD '<gerar segredo forte>' BYPASSRLS;
GRANT USAGE ON SCHEMA public TO nexa_fundacao;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexa_fundacao;

CREATE ROLE nexa_auditoria_interna LOGIN PASSWORD '<gerar segredo forte>' BYPASSRLS;
GRANT USAGE ON SCHEMA public TO nexa_auditoria_interna;
GRANT SELECT ON "RegistoAuditoria" TO nexa_auditoria_interna;
```

**Risco técnico genuíno, a confirmar empiricamente (nunca assumido)**: não há garantia documentada de que o role owner por defeito do Neon tem privilégio suficiente para `CREATE ROLE ... BYPASSRLS` (Neon é Postgres gerido, mas alguns fornecedores geridos restringem atributos de superuser mesmo ao owner do projeto). Se `BYPASSRLS` for rejeitado, a alternativa é o próprio Neon disponibilizar esse atributo só através do seu painel/CLI dedicado — a verificar no momento da execução, não uma suposição a resolver agora.

### 3.3 Variáveis de Ambiente (Novo `.env.staging`, Nunca Commitado)

Mesma estrutura já usada localmente (`.env`/`.env.migrate`/`.env.test`), com as connection strings do Neon:

```
DATABASE_URL="postgresql://nexa_app:<segredo>@<host-neon>/nexa?sslmode=require"
FUNDACAO_DATABASE_URL="postgresql://nexa_fundacao:<segredo>@<host-neon>/nexa?sslmode=require"
AUDITORIA_INTERNA_DATABASE_URL="postgresql://nexa_auditoria_interna:<segredo>@<host-neon>/nexa?sslmode=require"
DATABASE_ADMIN_URL="postgresql://<owner>:<segredo>@<host-neon>/nexa?sslmode=require"  # só para prisma migrate deploy
```

`sslmode=require` — Neon exige TLS em todas as ligações (cumpre NFR-06 diretamente, sem configuração adicional).

---

## 4. Sequência de Execução (Só Depois da Confirmação da Secção 2)

1. Criar o projeto Neon (região UE), confirmar a connection string do owner.
2. `prisma migrate deploy` (via `DATABASE_ADMIN_URL` apontando ao owner) — replica schema + RLS + trigger.
3. Executar o script SQL da secção 3.2 (roles), guardando os segredos gerados em local seguro (nunca em código).
4. Preencher `.env.staging` com as 4 connection strings.
5. **Verificação local antes de avançar para o Passo 41**: apontar temporariamente a API local (`apps/api`) para `.env.staging`, correr a aplicação, e fazer um teste de fumo manual — registo de uma Empresa de demonstração, login, criação de um Processo, confirmação de que RLS bloqueia acesso cross-tenant (criar uma segunda Empresa e confirmar isolamento) e de que o Registo de Auditoria regista e é imutável (`UPDATE`/`DELETE` direto rejeitado). Empresas de teste eliminadas no fim.
6. Confirmar no painel do Neon que os backups automáticos diários estão ativos (ADR-007 §3.8) — o teste real de recuperação (restore) fica para o Passo 45, não aqui.

---

## 5. Fora de Âmbito Deste Passo

- Branching do Neon para testar migrações em segurança (capacidade disponível, mas não usada ainda — só relevante quando houver uma alteração de schema a testar antes de aplicar a staging, não neste passo de criação inicial).
- Teste de recuperação de backup (Passo 45).
- Deploy do backend/frontend a apontar para esta base de dados (Passos 41-42).
- Qualquer alteração ao schema, RLS ou trigger já decididos — este passo só replica, nunca reinterpreta.

---

## 6. Exit Criteria

- Base de dados Neon criada, região UE, schema completo migrado.
- Os 4 roles criados com exatamente os privilégios documentados na secção 3.2, confirmados por teste direto (`nexa_app` bloqueado por RLS sem `current_setting`; `nexa_fundacao`/`nexa_auditoria_interna` com `BYPASSRLS` confirmado).
- Teste de fumo manual (secção 4, passo 5) concluído sem erros: registo, login, isolamento multi-tenant, imutabilidade do Registo de Auditoria.
- `.env.staging` preenchido e nunca commitado (confirmar `.gitignore`).
- Backups automáticos confirmados ativos no painel do Neon.

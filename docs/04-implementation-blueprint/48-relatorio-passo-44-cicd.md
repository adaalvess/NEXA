# NEXA — Relatório de Execução do Passo 44 (M7 — CI/CD, GitHub Actions)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 44: CI/CD via GitHub Actions |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 44 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação formal da Fundadora/CEO |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 44](47-especificacao-tecnica-passo-44-cicd.md); ADR-007 §3.9; Relatório do Passo 43 |
| **Última atualização** | 2026-07-20 |

---

## 1. Resumo Executivo

Pipeline CI/CD real implementado — **portão genuíno**, não só visibilidade (Opção 2 da especificação, aprovada). `autoDeploy` do Render desativado permanentemente; a partir de agora, **só o próprio workflow do GitHub Actions dispara deploys**, e só depois de os dois portões de qualidade (219 testes e2e do backend + build/lint do frontend) passarem com sucesso. As duas direções do portão foram **provadas com evidência real, não simulada**: um commit correto chega mesmo aos dois serviços; um commit com um teste a falhar nunca chega a nenhum.

---

## 2. Arquitetura do Pipeline (`​.github/workflows/ci-cd.yml`)

3 jobs, disparados em `push` para `main` (Decisão F — sem Pull Requests no fluxo de trabalho atual do projeto):

| Job | Conteúdo | Decisão da especificação |
|---|---|---|
| `test-backend` | Contentor Postgres efémero (`postgres:17`) nativo do runner → 18 migrações replicadas → 3 roles de runtime recriados (mesmos privilégios do Passo 4/40) → `nest build` → suite e2e completa (219 testes) | Decisão B (BD efémera, nunca a Neon real) |
| `build-frontend` | `next build` + `next lint` | Decisão D |
| `deploy` | `needs: [test-backend, build-frontend]` — só corre se ambos passarem. Dispara deploy no Render via API e **aguarda confirmação real de "live"** (polling, timeout de 10 min, deteção explícita de `build_failed`/`update_failed`/`canceled`); só depois dispara `vercel deploy --prod` | Decisão A (portão real) |

**Segredos de teste** (`SESSION_SECRET`, senhas dos roles de CI) gerados inline no próprio workflow (`openssl rand -hex 32`) — nunca guardados como GitHub Secrets, porque a base de dados é efémera e descartada no fim de cada execução, não protegem nada real (Decisão C).

**Vercel identificado por `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`** diretamente no workflow (não sensíveis, IDs de projeto) — sem depender de `.vercel/project.json` commitado (Decisão E).

## 3. GitHub Secrets Configurados

| Secret | Origem | Método |
|---|---|---|
| `RENDER_API_KEY` | Mesma chave já usada manualmente nos Passos 41/43 (nunca uma credencial nova) | Encriptada com a chave pública do repositório (`libsodium` sealed box) antes do envio via API — nunca em texto simples em nenhum pedido |
| `VERCEL_TOKEN` | Mesmo token já usado manualmente nos Passos 42/43 | Idem |

O token GitHub (Fine-grained PAT, só o repositório NEXA, permissão "Secrets: Read and write") fornecido pela Fundadora/CEO foi usado exclusivamente para este provisionamento — nunca escrito em nenhum ficheiro do repositório, nunca em logs. Script de encriptação temporário (`libsodium-wrappers`, instalado só no diretório de scratchpad) eliminado imediatamente após uso.

## 4. Descoberta Técnica Real, Corrigida Durante a Validação

**A primeira execução real do pipeline (run #1) falhou no `test-backend`** — não pela ausência dos GitHub Secrets (esperado nessa fase), mas por um erro genuíno: `TypeError: Cannot read properties of undefined (reading '$disconnect')` em `auth.e2e-spec.ts`.

**Diagnóstico**: `auth.e2e-spec.ts` constrói o seu próprio `PrismaClient` (`adminClient`) a partir de `process.env.DATABASE_ADMIN_URL`, usado por `limparEmpresasDeTeste` para desativar/reativar o trigger de imutabilidade da auditoria durante a limpeza de dados de teste (mesmo padrão já documentado desde o Passo 6). O `.env.test` efémero escrito pelo workflow **não incluía `DATABASE_ADMIN_URL`** — só `DATABASE_URL`/`FUNDACAO_DATABASE_URL`/`AUDITORIA_INTERNA_DATABASE_URL`. Sem essa variável, o construtor do `PrismaClient` falhava, `adminClient` nunca era atribuído, e o `afterAll`/`afterEach` que lhe chamava `$disconnect()` rebentava.

**Diagnosticado com a ajuda direta da Fundadora/CEO** (download de logs do GitHub Actions exige permissão "Actions" que não fazia parte do âmbito do token combinado — ela leu o erro exato diretamente na interface do GitHub e colou-o aqui, evitando pedir um token com mais alcance do que o necessário).

**Corrigido** (commit `690f451`) adicionando `DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/nexa_ci` ao `.env.test` do workflow — mesmo superuser já usado para `prisma migrate deploy` no passo anterior do job. Confirmado por `grep` a todos os ficheiros de teste que nenhuma outra variável de ambiente estava em falta.

## 5. Validação Real — As Duas Direções do Portão

### 5.1 Sucesso → Deploy Real (commit `690f451`)

| Passo | Resultado |
|---|---|
| `test-backend` (219 testes, Postgres efémero) | ✅ `success` |
| `build-frontend` | ✅ `success` |
| `deploy` → Render (disparo + polling até `live`) | ✅ `success` |
| `deploy` → Vercel (`vercel deploy --prod`) | ✅ `success` |
| **Verificação independente, fora do CI**: `GET /health` (Render) | ✅ `200` |
| **Verificação independente**: `GET /` (Vercel) | ✅ `200` |
| **Verificação independente**: deploy live do Render aponta exatamente ao commit `690f4512` | ✅ Confirmado via API da Render |

### 5.2 Falha → Deploy Bloqueado (commit `4211217`, teste deliberadamente falhado)

Ficheiro temporário `apps/api/test/ci-validacao-passo-44.e2e-spec.ts` com um único teste sempre a falhar (`expect(1).toBe(2)`) — commitado, enviado, e removido de imediato a seguir à confirmação (mesma disciplina de validação real já usada no Passo 43).

| Passo | Resultado |
|---|---|
| `test-backend` | ❌ `failure` (o teste deliberado, confirmado — nenhuma outra falha nova) |
| `build-frontend` | ✅ `success` (não afetado, como esperado) |
| `deploy` | ⏭️ **`skipped`** — nunca chegou a correr, `needs` do workflow impediu-o estruturalmente |
| **Verificação independente**: deploy live do Render **inalterado**, mesmo `id` (`dep-d9f68k57vvec73fnlujg`) e commit (`690f4512`) de antes desta tentativa | ✅ Confirmado |
| **Verificação independente**: `GET /health` continua `200` | ✅ Confirmado |

`skipped` (não `failure`) é uma prova mais forte do que um simples erro — significa que a condição `needs` do GitHub Actions **impediu estruturalmente** o job de sequer começar, não que ele tentou e falhou.

## 6. Render — `autoDeploy` Desativado Permanentemente

`PATCH /v1/services/srv-d9b0u358nd3s739uavd0` (`autoDeploy: "no"`) — confirmado por leitura de volta. A partir de agora, um `git push` para `main` nunca mais dispara um deploy no Render por si só; só o job `deploy` do pipeline o faz, e só depois dos dois portões de qualidade passarem.

## 7. Commits Realizados

| Commit | Propósito |
|---|---|
| `8668017` | Workflow inicial (`.github/workflows/ci-cd.yml`) + Especificação Técnica |
| `690f451` | Correção real: `DATABASE_ADMIN_URL` em falta no `.env.test` efémero |
| `4211217` | Teste deliberadamente falhado — validação da direção "falha bloqueia deploy" |
| `b8873aa` | Revert do teste deliberado — `main` de volta a estado limpo |

## 8. Exit Criteria (Especificação Técnica do Passo 44) — Checklist

- [x] Workflow `.github/workflows/ci-cd.yml` commitado.
- [x] `autoDeploy` desativado no Render — confirmado que um push já não dispara deploy sozinho (provado pelo `skipped` da secção 5.2).
- [x] Teste real: commit com testes a passar → pipeline verde → deploy automático confirmado em ambos os serviços, com verificação independente fora do CI.
- [x] Teste real: commit com um teste deliberadamente a falhar → pipeline vermelho → nenhum deploy disparado, confirmado por verificação independente de que o serviço live não mudou.

---

## 9. Recomendação

**Passo 44 tecnicamente concluído**, com as duas direções do portão provadas por evidência real (não simulada), incluindo uma descoberta técnica genuína (variável de ambiente em falta) diagnosticada e corrigida durante a própria validação — exatamente o tipo de problema que este passo existe para prevenir a partir de agora. `main` está num estado limpo, sem os ficheiros temporários de diagnóstico. Aguardo a tua aprovação formal antes de sincronizar a documentação (CLAUDE.md/Blueprint/Master Roadmap) e avançar para o Passo 45 (validação técnica final do M7).

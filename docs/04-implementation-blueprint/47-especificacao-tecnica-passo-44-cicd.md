# NEXA — Especificação Técnica do Passo 44 (M7 — CI/CD, GitHub Actions)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 44: CI/CD via GitHub Actions |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 44 — sexto passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.9; Relatório do Passo 43 (Observabilidade) |
| **Última atualização** | 2026-07-16 |

---

## 1. Objetivo

Implementar a suite de testes (`apps/api`, 219 testes e2e) como **portão real antes de deploy** — literalmente o texto já aprovado na Proposta do M7 — para o repositório GitHub, agora com remoto ativo desde o Passo 39, pré-requisito estrutural já cumprido.

---

## 2. Decisão Mais Consequente Deste Passo — Portão Real vs. Só Visibilidade

Há duas formas válidas de interpretar "suite de testes como portão antes de deploy", com implicações reais diferentes sobre como os deploys já acontecem hoje (Render com `autoDeploy: yes` desde a criação do serviço no Passo 41; Vercel por `vercel deploy --prod` manual desde o Passo 42):

**Opção 1 — Portão informativo (menor complexidade, reversível)**: o workflow do GitHub Actions corre em cada `push` para `main`, executa a suite completa de `apps/api` e o build/lint de `apps/web`. Se falhar, fica visível como ❌ no GitHub (commit status), mas **não impede** o Render de fazer o deploy automático (`autoDeploy: yes` continua a disparar de forma independente) nem me impede de correr `vercel deploy --prod` manualmente. A decisão de intervir (reverter, corrigir) fica sempre humana, informada pelo resultado do CI.

**Opção 2 — Portão real (mais fiel ao texto literal aprovado, mais complexidade operacional)**: desativa-se `autoDeploy` no Render; o próprio workflow, só depois dos testes passarem, chama a API da Render (`POST /v1/services/{id}/deploys`) e a API da Vercel (`vercel deploy --prod` a partir do runner do GitHub Actions, com `VERCEL_TOKEN` como GitHub Secret) para disparar os deploys. Um commit com testes a falhar **nunca chega a ser deployado**, em nenhum dos dois serviços.

**Recomendo a Opção 2** — é o que a Proposta do M7 já aprovada literalmente descreve ("suite de testes como portão antes de deploy", não "suite de testes visível"), e é o padrão real de CI/CD, não uma aproximação. A complexidade adicional (2 GitHub Secrets: `RENDER_API_KEY`, `VERCEL_TOKEN` — os mesmos já usados manualmente nos Passos 41-43, nunca credenciais novas) é proporcional ao benefício (impossível fazer deploy de um commit que quebra os 4 fluxos críticos).

---

## 3. Decisões a Validar

- **A — Portão real (Opção 2, secção 2)** — confirmar ou preferir a Opção 1.
- **B — Base de dados de teste: contentor Postgres efémero do próprio GitHub Actions** (`postgres:17`, serviço nativo do runner), nunca a Neon real (nem staging nem produção) — schema, roles (`nexa_app`/`nexa_fundacao`/`nexa_auditoria_interna`/RLS/trigger de imutabilidade) recriados do zero em cada execução, a partir das 18 migrações já existentes, exatamente como já acontece em `nexa_test` localmente. Isolamento total, sem custo, sem risco de tocar em dados reais.
- **C — Segredos de teste (`SESSION_SECRET`, `ARGON2_*`) gerados inline no workflow**, nunca guardados como GitHub Secrets — não protegem nada real (a BD é efémera e descartada no fim de cada execução), simplifica sem reduzir segurança.
- **D — Âmbito do gate**: `apps/api` — `npm run build` + `npm run test:e2e` (219 testes); `apps/web` — `npm run build` + `npm run lint` (sem testes automatizados de frontend, ainda inexistentes, fora de âmbito deste passo). As 3 credenciais de fornecedores (Anthropic/Stripe/Resend) continuam deliberadamente ausentes do ambiente de CI — mesma garantia de "arranca e testa sem credencial real" já validada em todos os passos anteriores.
- **E — Deploy do Vercel a partir do GitHub Actions**: usa o mesmo `VERCEL_TOKEN` (GitHub Secret), `vercel deploy --prod --token $VERCEL_TOKEN --yes` a partir do runner, `working-directory: apps/web` — substitui a invocação manual que tenho feito até agora, sem alterar nenhuma configuração já feita no Passo 42 (`vercel.json`, projeto já ligado).
- **F — Só o branch `main`** — sem branches de feature nem Pull Requests no fluxo de trabalho atual do projeto (todo o histórico até agora são commits diretos a `main`, aprovados um a um pela Fundadora/CEO) — o workflow corre em `push` para `main`, não em `pull_request` (não há PRs a correr).

---

## 4. Sequência de Execução

1. Criar `.github/workflows/ci-cd.yml` com 3 jobs: `test-backend` (build + e2e contra Postgres efémero), `build-frontend` (build + lint), `deploy` (só corre se os dois anteriores passarem — dispara Render + Vercel).
2. Adicionar os 2 GitHub Secrets (`RENDER_API_KEY`, `VERCEL_TOKEN`) — os mesmos já usados manualmente, nunca credenciais novas.
3. Desativar `autoDeploy` no serviço Render (`PATCH /v1/services/{id}`, `autoDeploy: "no"`) — a partir de agora, só o workflow dispara deploys.
4. Validação real: um commit trivial (ex.: comentário) para confirmar o pipeline completo corre e deploya com sucesso; e um teste deliberado de falha (branch/commit temporário com um teste a falhar de propósito, nunca chega a `main`) para confirmar que o portão bloqueia mesmo — mesma disciplina de validação real já aplicada em todo o M7.
5. Documentar o novo fluxo de deploy no README ou no próprio CLAUDE.md, para nunca mais ser preciso disparar deploys manualmente por API depois deste passo.

---

## 5. Fora de Âmbito Deste Passo

- Testes automatizados de frontend (fora de âmbito, nunca decidido nesta fase).
- Pull Requests / branch protection rules — sem fluxo de PRs estabelecido no projeto.
- Ambiente de produção — só staging.
- Passo 45 (validação técnica final, incluindo teste real de recuperação de backup) — continua o último passo do M7.

---

## 6. Exit Criteria

- Workflow `.github/workflows/ci-cd.yml` commitado.
- `autoDeploy` desativado no Render — confirmado que um push já não dispara deploy sozinho.
- Teste real: commit com testes a passar → pipeline verde → deploy automático confirmado em ambos os serviços.
- Teste real: commit (fora de `main`, nunca mesclado) com um teste deliberadamente a falhar → pipeline vermelho → nenhum deploy disparado, confirmado.

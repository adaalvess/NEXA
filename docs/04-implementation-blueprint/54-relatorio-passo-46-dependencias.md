# NEXA — Relatório de Execução do Passo 46 (M8 — Triagem de Vulnerabilidades de Dependências)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 46: Triagem e Correção de Vulnerabilidades de Dependências |
| **Fase** | 7 — Desenvolvimento da Plataforma, M8 (Preparação para Lançamento), Passo 46 — primeiro passo do M8 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído e aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 46](53-especificacao-tecnica-passo-46-dependencias.md); Proposta e Especificação Técnica do M8 |
| **Última atualização** | 2026-07-20 |

---

## 1. Resumo Executivo

Das 32 vulnerabilidades originais, **29 ficam classificadas e documentadas** (26 do backend, mantidas por decisão explícita da Fundadora/CEO — sem upgrade major do NestJS neste Milestone) e **3 do frontend foram corrigidas de facto**, através de um upgrade incremental e validado do Next.js (14→15→16), reduzindo os avisos do frontend de **13 nomeados (incluindo XSS, request smuggling e SSRF) para 3 residuais, nenhum deles atingível pelo código da NEXA**. Duas incompatibilidades reais foram encontradas durante a migração, ambas diagnosticadas com precisão e resolvidas dentro do âmbito já aprovado, nunca por tentativa-erro às cegas.

---

## 2. Backend — Decisões A/B/C Confirmadas, Sem Alteração de Código

| Decisão | Confirmação |
|---|---|
| **A — Vulnerabilidades exclusivas do `@nestjs/cli`** (17 de 26) | Aceites, documentadas — dependência de build/dev, nunca presente no artefacto deployado (`dist/`) |
| **B — `multer`** (1 de 26, high) | Aceite, documentada — confirmado por `grep` que a aplicação nunca implementa upload de ficheiros em nenhum endpoint; caminho de código nunca atingível |
| **C — Upgrade major do NestJS (10→11)**, resolveria as 8 restantes | **Não executado, por decisão explícita da Fundadora/CEO** — registado como trabalho para um milestone pós-lançamento, salvo se surgir uma vulnerabilidade crítica que obrigue à atualização antes disso |

**Backend termina este passo com 26/26 vulnerabilidades originais ainda presentes, todas classificadas e documentadas — nenhuma delas crítica, nenhuma delas silenciosamente ignorada.**

---

## 3. Frontend — Decisão D Executada com Sucesso, Duas Incompatibilidades Reais Resolvidas

### 3.1 Upgrade Incremental (14.2.35 → 15.5.20 → 16.2.10)

Migração feita em dois saltos, com validação completa entre cada um (build + lint), exatamente como aprovado ("de forma incremental").

### 3.2 Incompatibilidade Real #1 — Turbopack (Next.js 16)

**Achado**: `next build` no Next.js 16 usa Turbopack por defeito — a compilação falhou com `Error [PageNotFoundError]: Cannot find module for page: /processos`, um erro real e reprodutível, não um falso alarme.

**Diagnóstico**: confirmado com `next build --webpack` (flag oficial do próprio Next.js, não uma gambiarra) — build limpo, 17/17 rotas resolvidas sem nenhum erro. Isolou o problema especificamente ao Turbopack, não ao Next.js 16 em geral.

**Decisão da Fundadora/CEO**: manter o Next.js 16 (resolve os avisos de segurança), fixar `--webpack` explicitamente nos scripts `build`/`dev` do `package.json` — opção suportada oficialmente, documentada, sem data de remoção anunciada.

### 3.3 Incompatibilidade Real #2 — `@sentry/nextjs` (Next.js 16)

**Achado**: com `@sentry/nextjs@10.65.0` (a versão já instalada desde o Passo 43), toda a aplicação retornava `Internal Server Error` — confirmado ao vivo no browser, não apenas no log — com o erro `unknown field 'isDevelopment', expected one of 'isReactServerLayer', 'enabled', 'hashSalt'` em `sentry.client.config.ts`.

**Diagnóstico e correção**: `@sentry/nextjs` já declara suporte a Next.js 16 no seu `peerDependencies` (`^16.0.0-0`), mas a versão instalada tinha um bug real de compatibilidade. Atualizado para `@sentry/nextjs@10.67.0` (patch mais recente disponível) — resolveu o erro por completo, confirmado por reinício limpo do servidor e nova validação visual.

### 3.4 Migração Adicional Necessária — `next lint` Removido no Next.js 16

**Achado**: `next lint` (usado desde o Passo 13) deixou de existir como comando no Next.js 16 — `npm run lint` falhava com "Invalid project directory provided". Esperado e documentado pelo próprio Next.js (aviso de depreciação já visível desde a versão 15), não uma surpresa.

**Correção**: executado o codemod oficial (`npx @next/codemod next-lint-to-eslint-cli .`) — gerou `eslint.config.mjs` (formato flat config moderno, primeira vez que o plugin do Next.js fica corretamente detetado — resolve também o aviso "Next.js plugin was not detected" que persistia desde o Passo 13); script `lint` atualizado para `eslint .`. Uma correção adicional necessária: `next.config.js` (CommonJS `require`) violava a nova regra `@typescript-eslint/no-require-imports` do config gerado — convertido para `next.config.mjs` (ESM), mais correto para o ecossistema atual do Next.js, não apenas uma supressão da regra.

---

## 4. Validação Manual Exaustiva (Sem Suite Automatizada de Frontend)

Validação real no browser, com o backend local a correr, cobrindo exatamente o que a Fundadora/CEO exigiu:

| Página | Resultado |
|---|---|
| `/` (Landing) | ✅ Renderiza corretamente, zero erros de consola |
| `/precos` | ✅ Carrega os 3 planos reais (Starter/Professional/Enterprise) com valores corretos |
| `/login` | ✅ Formulário funcional, login real bem-sucedido |
| `/registar` | ✅ Renderiza corretamente |
| `/dashboard` (autenticado) | ✅ Estado inicial guiado correto |
| `/processos` | ✅ Lista + estado vazio corretos |
| `/crm` | ✅ Lista + estado vazio corretos |
| `/ia` | ✅ As duas secções (Perguntar/Sugestões Pendentes) presentes |
| `/configuracoes` | ✅ As 3 secções (Perfil/Utilizadores/Departamentos) presentes e com dados reais |
| `/subscricao` | ✅ Plano/trial/limites reais corretos |
| `/processos/novo` → criação real | ✅ Formulário submetido com sucesso, Processo criado e navegação para a página de detalhe confirmada — round-trip completo `POST /processos` validado |

**Zero erros de consola em toda a sessão de validação.** Empresa de demonstração e Processo de teste eliminados no final (mesmo mecanismo de limpeza de sempre — trigger de imutabilidade da auditoria desativado/reativado à volta da eliminação).

**Nota metodológica honesta**: durante a validação, cliques via a ferramenta de automação de browser (`preview_click`) em dois formulários (login, criação de Processo) inicialmente pareceram não disparar o pedido — investigação confirmou que era um problema de tempo da própria ferramenta de teste (verificação feita antes do pedido assíncrono terminar), nunca um bug real da aplicação; confirmado com `element.click()` nativo e espera adequada, ambos os fluxos funcionam corretamente.

---

## 5. Contagem Final de Vulnerabilidades

| Workspace | Antes | Depois | Detalhe |
|---|---|---|---|
| `apps/api` | 26 (3 low, 14 moderate, 9 high) | **26, inalterado** | Decisão C (NestJS) explicitamente adiada |
| `apps/web` | 6 (1 low, 1 moderate, 4 high) | **3 (1 low, 2 moderate, 0 high)** | Os 4 "high" (todos avisos nomeados do Next.js — XSS, request smuggling, SSRF, cache poisoning) resolvidos por completo |

O resíduo de 3 no frontend é a mesma classe já identificada na especificação: `postcss@8.4.31` **empacotado internamente pelo próprio Next.js 16** (isolado do `postcss@8.5.16` que a NEXA usa diretamente, já seguro) — não corrigível sem alterar o próprio Next.js, e `webpack` (low, ferramenta de build). Nenhum caminho de código da NEXA passa CSS não confiável por este componente interno.

---

## 6. Exit Criteria (Especificação Técnica do Passo 46) — Checklist

- [x] Decisões A-D confirmadas pela Fundadora/CEO antes de qualquer alteração de código.
- [x] Next.js atualizado (16.2.10), build/lint limpos, validação manual exaustiva sem regressão de comportamento (2 incompatibilidades reais encontradas, diagnosticadas e resolvidas dentro do âmbito aprovado).
- [x] Deploy real a staging confirmado via o pipeline de CI/CD, sem qualquer intervenção manual — ver secção 7.
- [x] Lista completa das 32 vulnerabilidades originais classificada — 26 aceites com justificação (backend), 3 corrigidas + 3 residuais aceites com justificação (frontend).

---

## 7. Deploy a Staging Via Pipeline Real — Concluído e Validado

Commit `661056d` (todas as alterações deste passo) enviado ao `main`; deploy feito **exclusivamente pelo pipeline de CI/CD** (`.github/workflows/ci-cd.yml`, Passo 44), sem nenhuma intervenção manual — mesma disciplina do M7.

### 7.1 Resultado do Pipeline (run `29775901816`)

Os 3 jobs concluídos com sucesso:

| Job | Resultado |
|---|---|
| `test-backend` | ✅ `success` — Postgres efémero, 18 migrações replicadas, 3 roles recriados, **219/219 testes e2e** inalterados (backend não foi tocado neste passo) |
| `build-frontend` | ✅ `success` — `next build --webpack` + `eslint .` limpos, confirmando em CI o que já tinha sido validado localmente |
| `deploy` | ✅ `success` — Render confirmado `live` por polling, seguido de deploy no Vercel |

### 7.2 Validação Independente Contra o Staging Ao Vivo

Confirmação feita separadamente do próprio relatório do pipeline, contra os serviços reais:

- `GET /health` (Render) → `200`
- `GET /` (Vercel) → `200`
- `GET /precos` (Vercel) → `200`
- `GET /login` (Vercel) → `200`
- Deploy do Render confirmado, via API, no commit exato `661056d0` — a versão correta está de facto em produção de staging, não apenas o pipeline a reportar sucesso

### 7.3 Teste de Fumo Real Contra o Staging Atualizado

Executado diretamente contra o staging já com o Next.js 16 em produção (nunca simulado):

1. Duas Empresas de demonstração registadas ("Passo46 Staging Next16 A" e "B") via `/registar` real.
2. Login bem-sucedido como Empresa A.
3. Processo real criado pela Empresa A.
4. Isolamento multi-tenant confirmado: `GET /processos` da Empresa B devolveu `[]`; o mesmo endpoint na Empresa A mostrou o Processo criado.
5. Ambas as Empresas de teste eliminadas no final (mesmo mecanismo de sempre — trigger de imutabilidade da auditoria desativado/reativado à volta da eliminação); confirmado por consulta direta que restam **0 Empresas de teste** na base de dados de staging.

**Nenhuma regressão encontrada em staging — o upgrade do Next.js 14→16 está agora deployado e validado no ambiente real, não apenas localmente.**

---

## 8. Encerramento Formal

Com o deploy via pipeline confirmado, a validação independente do staging ao vivo e o teste de fumo real sem qualquer regressão, o **Passo 46 está formalmente concluído** — primeiro passo do M8 encerrado. Documentação sincronizada (CLAUDE.md, ambas as cópias; Blueprint de Implementação do MVP; Master Roadmap) para refletir o M8 aprovado e o Passo 46 concluído, mantendo o mesmo padrão de disciplina documental usado em todos os passos anteriores.

**Próximo: Passo 47 (Documentos Legais e Consentimento RGPD)** — conforme a sequência já aprovada do M8.

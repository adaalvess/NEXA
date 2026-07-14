# NEXA — Especificação Técnica do Passo 42 (M7 — Frontend em Vercel, Staging)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 42: Frontend Next.js em Vercel (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 42 — quarto passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.2/3.4; Relatório do Passo 41 (Backend em Render) |
| **Última atualização** | 2026-07-14 |

---

## 1. Objetivo

Publicar `apps/web` (Next.js) como projeto Vercel, ambiente de staging, ligado ao backend já em produção de staging no Render (Passo 41) — sem introduzir nenhuma decisão de arquitetura nova, só executar o que o ADR-007 §3.2 já decidiu (Vercel para o frontend).

---

## 2. Via de Provisionamento — Diferente do Render: Existe CLI Oficial

Ao contrário da Render, a Vercel tem um **CLI oficial completo** (`vercel`, confirmado disponível via `npx vercel@latest`, versão `56.1.0`), que suporta login por token (`vercel --token <TOKEN>`), ligação de projeto (`vercel link`), configuração de variáveis de ambiente (`vercel env add`) e deploy (`vercel deploy --prod`) — sem necessidade de recorrer à API REST diretamente, ao contrário do Passo 41.

**Preciso de um token de acesso da Vercel**, fornecido pela Fundadora/CEO (Dashboard Vercel → Account Settings → Tokens → Create Token), com o mesmo nível de cuidado já aplicado ao Render: **usado exclusivamente para este provisionamento, nunca armazenado no repositório nem exposto em ficheiros versionados.**

---

## 3. Decisões a Validar

- **A — Região do projeto**: `fra1` (Frankfurt) — única opção que mantém consistência geográfica com o Render (`frankfurt`) e a Neon (`aws-eu-central-1`), cumprindo ADR-007 §3.2/NFR-21 (dados e processamento na UE). A Vercel permite fixar a região das Serverless Functions via `vercel.json` (`regions: ["fra1"]"`) — necessário porque o Next.js App Router usa Server Components/rotas dinâmicas (ex.: `/dashboard`, `/login`, que leem `cookies()`), executadas como função, não como ficheiro estático.
- **B — `NEXT_PUBLIC_API_URL`**: `https://nexa-api-staging.onrender.com` (URL real e já validada do Passo 41).
- **C — Correção do `WEB_APP_URL` no Render (Decisão C do Passo 41, agora resolvida)**: depois do primeiro deploy Vercel, a URL real de staging fica conhecida (previsivelmente `https://nexa-web-staging.vercel.app`, a confirmar) — atualizo de imediato a variável `WEB_APP_URL` no serviço Render (`PATCH /v1/services/{id}/env-vars`) para deixar de ser o valor provisório `http://localhost:3000`. Sem isto, o CORS do backend (`main.ts`, `origin: process.env.WEB_APP_URL`) bloquearia todos os pedidos do frontend em staging — descoberta feita nesta especificação, não durante a implementação, por inspeção direta do código (`apps/api/src/main.ts`, linha 44).
- **D — Credenciais de fornecedores ainda por preencher**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SENTRY_DSN` continuam vazias (mesma decisão já aprovada nos Passos 15/29/41 — "sempre que o fornecedor disponibilizar um ambiente de testes adequado"). Não bloqueia este passo — os ecrãs que dependem delas (checkout Stripe, captura de erros Sentry) continuam a funcionar sem elas, exatamente como já acontece localmente; `NEXT_PUBLIC_SENTRY_DSN` fica formalmente a cargo do Passo 43.

---

## 4. Sequência de Execução (Só Depois da Confirmação do Token)

1. Criar/ligar o projeto Vercel (`vercel link` ou via API), nome `nexa-web-staging`, `rootDirectory: apps/web`, `region: fra1`.
2. Configurar as variáveis de ambiente: `NEXT_PUBLIC_API_URL` (Decisão B), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_SENTRY_DSN` (vazias, Decisão D).
3. Primeiro deploy (`vercel deploy --prod`), a partir do commit atual de `main` (mesmo branch do Render).
4. Confirmar a URL pública real atribuída pela Vercel.
5. **Corrigir `WEB_APP_URL` no Render** para essa URL real (Decisão C) — sem isto, o passo seguinte (teste de fumo) falharia por CORS, não por um problema do frontend em si.
6. Teste de fumo real contra o frontend em produção de staging: `/`, `/precos`, `/registar` (fluxo completo até `/dashboard`), `/login`, isolamento multi-tenant visível na UI — mesma disciplina dos Passos 40/41, agora ponta a ponta (frontend real + backend real + BD real).
7. Limpeza dos dados de teste.

---

## 5. Fora de Âmbito Deste Passo

- Domínio próprio/DNS (fora de staging).
- Observabilidade (Sentry, uptime — Passo 43).
- CI/CD automático (Passo 44) — este passo é deploy manual/via CLI, uma única vez.
- Credenciais reais de Stripe/Anthropic/Resend (fora de âmbito desde o Passo 41, sem alteração).

---

## 6. Exit Criteria

- Projeto Vercel criado, região `fra1` (UE).
- `NEXT_PUBLIC_API_URL` a apontar para o backend real do Render (Passo 41).
- `WEB_APP_URL` no Render corrigido para a URL real do Vercel (fecha a Decisão C do Passo 41).
- Teste de fumo real ponta a ponta (frontend + backend + BD, todos em staging real): landing pública, registo público até `/dashboard`, login, isolamento multi-tenant visível na UI.
- Dados de teste eliminados no final.

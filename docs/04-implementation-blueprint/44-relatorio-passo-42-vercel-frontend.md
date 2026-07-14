# NEXA — Relatório de Execução do Passo 42 (M7 — Frontend em Vercel, Staging)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 42: Frontend Next.js em Vercel (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 42 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação formal da Fundadora/CEO |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 42](43-especificacao-tecnica-passo-42-vercel-frontend.md); ADR-007 §3.2/3.4; Relatório do Passo 41 |
| **Última atualização** | 2026-07-14 |

---

## 1. Resumo Executivo

`apps/web` está publicado como projeto Vercel, região `fra1` (Frankfurt, UE), ligado ao backend real do Render (Passo 41) e, através dele, à base de dados Neon de staging (Passo 40). Todas as 4 Decisões a Validar (A-D) confirmadas sem alteração. Teste de fumo real, ponta a ponta (frontend + backend + BD, todos em staging real, não simulado): páginas públicas a responder, CORS corrigido para o domínio real do Vercel, registo, login, criação de Processo e isolamento multi-tenant confirmados via pedidos com o cabeçalho `Origin` do frontend real. Dados de teste eliminados no final.

---

## 2. Via de Provisionamento — CLI Oficial da Vercel (Decisão A confirmada)

Ao contrário da Render, a Vercel tem CLI oficial completo (`vercel`, `56.1.0`), confirmado a funcionar com o token fornecido (`vercel whoami` → conta `adaira1989-4812`). Todo o provisionamento feito por automação via CLI, mesmo nível de rigor e evidência já usado nos Passos 40/41.

## 3. Projeto Vercel — Estado Final

| Campo | Valor |
|---|---|
| Nome | `nexa-web-staging` |
| Organização/conta | `nexa-adair` |
| Project ID | `prj_kJeUxGw2fCEZ0bzFCZv1CW8EmDKD` |
| Diretório raiz | `apps/web` |
| Região das funções (Serverless) | `fra1` (Frankfurt, UE) ✅ — fixada em `apps/web/vercel.json` (`regions: ["fra1"]`) |
| URL de produção (staging) | `https://nexa-web-staging.vercel.app` |
| Repositório | Deploy feito diretamente do estado local via CLI (`vercel deploy --prod`), commit `37c704a` de `main` |

**Confirmação real de que a região foi respeitada** (não apenas assumida da configuração): `curl -I` a `https://nexa-web-staging.vercel.app/` devolveu o cabeçalho `X-Vercel-Id: cdg1::fra1::...` — o troço `fra1` confirma que a função serverless executou de facto em Frankfurt, não apenas que o build correu lá (o build em si correu numa máquina em `iad1`/Washington D.C., o que é irrelevante para o NFR-21 — o que importa é onde o código corre a servir pedidos reais, não onde foi compilado).

## 4. Variáveis de Ambiente — Configuradas

| Variável | Valor | Ambiente |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://nexa-api-staging.onrender.com` (Decisão B) | Production |

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_SENTRY_DSN` **deliberadamente não configuradas** (Decisão D) — confirmado por `grep` que nenhum ficheiro em `apps/web/src` as referencia ainda; ficam a cargo dos passos que as tornarem necessárias (checkout Stripe self-service, fora do M7; Sentry, Passo 43).

## 5. Descoberta Confirmada na Especificação, Resolvida na Execução — CORS (Decisão C)

Tal como já identificado na Especificação Técnica (inspeção de `apps/api/src/main.ts`, linha 44 — `origin: process.env.WEB_APP_URL`), o backend em Render continuava configurado com o valor provisório `http://localhost:3000` (Decisão C do Passo 41). Corrigido nesta execução:

1. `PATCH`/`PUT https://api.render.com/v1/services/{id}/env-vars/WEB_APP_URL` → `https://nexa-web-staging.vercel.app`. **Nota técnica**: o primeiro pedido `PATCH` foi aceite pela API mas não alterou o valor persistido (confirmado por leitura de volta) — corrigido usando `PUT` no mesmo endpoint, que teve sucesso imediato e confirmado.
2. Novo deploy disparado no Render (`POST /v1/services/{id}/deploys`) para o serviço carregar a variável atualizada — mesma lição já aprendida no Passo 41 (variáveis de ambiente só têm efeito a partir do deploy seguinte à sua alteração). Deploy `dep-d9b5nd7avr4c73bfv0vg` concluído em `live` em cerca de 65 segundos.
3. Confirmado por pedido `OPTIONS` real com `Origin: https://nexa-web-staging.vercel.app` contra `https://nexa-api-staging.onrender.com/auth/eu` — resposta `204`, `access-control-allow-origin: https://nexa-web-staging.vercel.app`.

## 6. Validações Realizadas (Todas Reais, Ponta a Ponta — Frontend + Backend + BD em Staging Real)

| Validação | Resultado |
|---|---|
| `GET /` (Landing pública) | ✅ `200` |
| `GET /precos` | ✅ `200` |
| `GET /login` | ✅ `200` |
| `GET /registar` | ✅ `200` |
| `GET /health` (backend) | ✅ `200` |
| CORS para a origem real do Vercel | ✅ `204`, `access-control-allow-origin` correto |
| Registo de Utilizador (Empresa "Vercel Smoke Test A"), com `Origin` do frontend real | ✅ `POST /auth/registar` → `201` |
| Registo de Utilizador (Empresa "Vercel Smoke Test B") | ✅ `POST /auth/registar` → `201` |
| Login (ambas as Empresas), com `Origin` do frontend real | ✅ `POST /auth/login` → `200` |
| Criação de Processo pela Empresa A | ✅ `POST /processos` → `201` |
| Isolamento multi-tenant | ✅ Empresa B (`GET /processos`) → `[]`; Empresa A vê o seu próprio Processo |
| Limpeza dos dados de teste | ✅ As 2 Empresas de demonstração eliminadas; BD de staging confirmada com 0 Empresas no final |

**Nota metodológica**: os pedidos de registo/login/CRUD foram feitos via `curl` direto à API com o cabeçalho `Origin` da Vercel (em vez de navegação real no browser) — prova rigorosa de que o backend aceita e responde corretamente a pedidos com a proveniência exata do frontend real (incluindo a resposta CORS), sem depender da disponibilidade de um browser interativo neste ambiente de execução. As páginas públicas do próprio frontend foram confirmadas diretamente (`GET` às URLs reais do Vercel).

## 7. Fora de Âmbito Deste Passo (Confirmado)

Domínio próprio/DNS. Observabilidade (Sentry, uptime — Passo 43). CI/CD automático (Passo 44) — este passo usou deploy manual via CLI. Credenciais reais de Stripe/Anthropic/Resend — inalterado desde o Passo 41.

## 8. Exit Criteria (Especificação Técnica do Passo 42) — Checklist

- [x] Projeto Vercel criado, região `fra1` (UE) — confirmado por cabeçalho `X-Vercel-Id` de um pedido real.
- [x] `NEXT_PUBLIC_API_URL` a apontar para o backend real do Render.
- [x] `WEB_APP_URL` no Render corrigido para a URL real do Vercel — fecha a Decisão C do Passo 41.
- [x] Teste de fumo real ponta a ponta: landing pública, registo, login, isolamento multi-tenant.
- [x] Dados de teste eliminados no final.

---

## 9. Recomendação

**Passo 42 tecnicamente concluído.** Todos os Exit Criteria cumpridos, incluindo a correção definitiva do CORS entre o frontend e o backend reais de staging. A NEXA tem agora, pela primeira vez, os três componentes de staging (frontend Vercel + backend Render + base de dados Neon) operacionais em conjunto, todos em região UE, validados por um teste de fumo real de ponta a ponta. Nada bloqueia o avanço para o Passo 43 (Observabilidade — Sentry + monitorização de disponibilidade), salvo a aprovação formal deste relatório pela Fundadora/CEO.

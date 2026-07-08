# NEXA — Especificação Técnica do Passo 24 (M5): `GET /planos/publico` + Página de Preços — Primeiro Passo do M5

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 24 — endpoint público de planos, página `/precos` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 24 — primeiro passo do M5, primeiro passo do Bloco A (Landing/Pricing pública + Registo) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08) — Decisão B; PRD §"Camada Comercial e Produto"; FR-29/30/31; Especificação Técnica do Passo 19 (`PLANOS_CONFIG`, `GET /planos`); Especificação Técnica do Passo 14 (convenções de frontend, `lib/api.ts`) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Expor os 3 planos (Starter/Professional/Enterprise) e os respetivos limites a um visitante sem sessão, através de um novo endpoint público `GET /planos/publico`, e construir a página `/precos` que o consome. Primeiro passo do M5 e do Bloco A — sem isto, a Landing Page (Passo 25) não tem para onde apontar o CTA de preços, nem o Registo (Passo 26) tem contexto de plano antes de o visitante decidir registar-se.

---

## 2. Contexto

A Decisão B da Proposta do M5 já validou o essencial: novo endpoint público, reaproveitando exatamente `PLANOS_CONFIG` (nunca duplicar valores como texto fixo no frontend). Este documento fecha o desenho concreto — onde vive o endpoint, que garantias de segurança se aplicam a uma rota sem sessão (a primeira deste tipo desde o webhook Stripe, Passo 22), e como a página consome isto no frontend.

### 2.1 Decisões a Validar

Nenhuma decisão de âmbito ou arquitetura nova além do que a Proposta do M5 já fixou — as escolhas abaixo são de implementação, documentadas em §4 como Decisões Tomadas, não decisões a validar.

---

## 3. Conteúdo Estruturado

### 3.1 `GET /planos/publico` (Backend)

Adicionado ao `ComercialController` já existente (mesmo controlador de `GET /planos`), sem `@UseGuards` nenhum — mesmo padrão de "rota sem sessão, dedicada e explícita" já usado pelo `StripeWebhookController` (Passo 22), mas aqui não justifica um controlador próprio (nenhum requisito especial de `rawBody`/assinatura, só ausência de guards):

```ts
// Reaproveita listarPlanos() literalmente — nunca duplica o mapeamento de
// PLANOS_CONFIG. Resposta byte-idêntica à de GET /planos, só sem exigir sessão.
@Get('planos/publico')
async listarPlanosPublico() {
  return this.listarPlanos();
}
```

Nunca devolve nada além do que `GET /planos` já devolve hoje — não há dado sensível em `PLANOS_CONFIG` (é configuração de produto, não de uma Empresa concreta).

**Rate limiting:** herda o limite global por defeito (`ThrottlerModule.forRoot`, 60/min) — sem `@Throttle` dedicado. É uma leitura pura, sem custo de escrita nem de fornecedor externo (ao contrário de `/auth/registar`, que tem limite mais apertado por criar dados); não há necessidade de um limite mais restritivo.

**CORS:** sem alteração — já restrito a `WEB_APP_URL` (`app.enableCors`, `main.ts`), suficiente para uma página do próprio `apps/web` consumir isto; não é uma API pública para terceiros.

### 3.2 Página `/precos` (Frontend)

```
apps/web/src/app/precos/page.tsx
```

Fora do grupo `(autenticado)` — mesmo nível de `/login`, sem exigir sessão. **Server Component** (sem `'use client'`), com `fetch` direto ao endpoint no próprio `page.tsx` — decisão de implementação (§4, D2), não uma alteração ao padrão de dados já estabelecido para ecrãs autenticados (que continuam Client Component + TanStack Query, Especificação Técnica do Passo 14, 3.4): uma página pública, sem interação de escrita nem necessidade de refetch, não precisa de estado de carregamento no cliente — SSR direto é mais simples (Regra não-negociável #24) e melhor para conteúdo indexável.

Estrutura mínima: nome de cada plano, limites (`limiteUtilizadores`/`limiteArmazenamentoMb`/`limiteUsoIA`, com "Ilimitado" quando `null`, mesma função `formatarLimite` já usada em `/subscricao`, Passo 23 — extraída para um sítio partilhado se reutilizada por uma terceira página no Bloco A, avaliado no Passo 25/26), botão de CTA por plano.

**CTA de cada plano** aponta para `/login` nesta fase (D1, §4) — `/registar` só existe a partir do Passo 26; evita um link morto em produção nesta fase intermédia.

### 3.3 Tratamento de Erros

Se `fetch` falhar (API indisponível), a página mostra uma mensagem estática, nunca uma página em branco nem um erro não tratado — mesma disciplina de todo o frontend desde o Passo 14, adaptada a um Server Component (sem `ApiError`/`isLoading` do TanStack Query, usa `try/catch` simples em torno do `fetch`).

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| Regra não-negociável #4 (Configuração sobre hardcoding) | ✅ `/precos` nunca duplica valores de planos — lê sempre de `PLANOS_CONFIG` via `GET /planos/publico` |
| Regra não-negociável #3 (API-first) | ✅ Frontend nunca acede a `PLANOS_CONFIG` diretamente — só via API, mesmo sendo dados não sensíveis |
| System Design Principles, regra #1 | ✅ Zero duplicação de lógica — `listarPlanosPublico()` chama `listarPlanos()` |

**Nenhum novo ADR necessário.**

### 3.5 Critérios de Aceitação e Exit Criteria (planeados)

**Backend:**

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `GET /planos/publico` sem cookie de sessão nenhum devolve os 3 planos (`200`) | HTTP real |
| T2 | Resposta de `GET /planos/publico` é byte-idêntica à de `GET /planos` (autenticado como `admin_empresa`) para a mesma Empresa | HTTP real, comparação direta |
| T3 | Regressão completa — todos os testes herdados (171) continuam a passar | `npm run test:e2e` |
| T4 | `npm run build` (`apps/api`) sem erros | build limpo |

**Frontend (validação visual real no browser):**

| # | Cenário | Resultado esperado |
|---|---|---|
| V1 | `/precos` acessível sem sessão nenhuma (browser sem cookie) | Inspeção visual |
| V2 | Os 3 planos mostrados com os limites corretos (Starter/Professional/Enterprise, Enterprise com "Ilimitado") | Inspeção visual |
| V3 | CTA de cada plano aponta para `/login` | Inspeção/rede |
| V4 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual |
| V5 | `npm run build`/`npm run lint` (`apps/web`) sem erros | build/lint limpos |

**Exit Criteria:** T1-T4 confirmados por teste automatizado; V1-V5 confirmados por validação visual real no browser.

---

### 3.6 Resultado da Implementação (2026-07-08)

**Descoberta técnica real, corrigida antes do fecho:** o Next.js pré-renderia `/precos` estaticamente no build (`○ Static`), porque um Server Component sem nenhuma API dinâmica explícita é elegível a Static Site Generation por defeito — o `fetch` a `GET /planos/publico` corria uma única vez, no momento do `next build`, e a resposta (ou o estado de erro, se a API não estivesse acessível nesse momento) ficaria congelada até ao próximo deploy, mesmo que `PLANOS_CONFIG` mudasse depois. Nunca foi a intenção de D2 (Server Component só significa "sem estado de carregamento no cliente", nunca "dados congelados no build"). Corrigido com `export const dynamic = 'force-dynamic'` — força um pedido real em cada acesso, `/precos` passou de `○ Static` para `ƒ Dynamic` na saída do build, mesmo comportamento de todas as outras páginas da aplicação. Correção de implementação, não uma alteração à Decisão D2 nem ao âmbito.

**Backend:**

| # | Cenário | Resultado |
|---|---|---|
| T1 | `GET /planos/publico` sem cookie de sessão devolve os 3 planos com os limites aprovados | ✅ Passou |
| T2 | Resposta de `GET /planos/publico` byte-idêntica à de `GET /planos` (autenticado) | ✅ Passou |
| T3 (regressão) | Suite completa — 171 herdados + 2 novos | ✅ 173/173 |
| T4 | `npm run build` (`apps/api`) sem erros | ✅ Limpo |

`apps/api/test/comercial-planos-publico.e2e-spec.ts` — novo ficheiro, 2 testes.

**Frontend (validação visual real no browser):**

| # | Cenário | Resultado |
|---|---|---|
| V1 | `/precos` acessível sem sessão nenhuma | ✅ Confirmado |
| V2 | Os 3 planos com os limites corretos, Enterprise com "Ilimitado" em todos os campos | ✅ Confirmado |
| V3 | CTA de cada plano ("Começar") aponta para `/login` | ✅ Confirmado (3/3 links verificados) |
| V4 | Responsivo sem quebras em 375px/768px/1280px, zero overflow horizontal | ✅ Confirmado |
| V5 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola | ✅ Confirmado |

**Milestone M5 em curso** — próximo: Passo 25 (Landing Page pública).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | CTA de cada plano em `/precos` aponta para `/login`, não `/registar` (que só existe a partir do Passo 26) | Evita link morto nesta fase intermédia; ajustável no Passo 26 sem alterar o backend nem a estrutura da página |
| D2 | `/precos` é Server Component (fetch direto), não Client Component + TanStack Query | Página pública sem escrita nem necessidade de refetch — SSR é mais simples (Regra #24) e melhor para conteúdo indexável; não altera o padrão já estabelecido para ecrãs autenticados |
| D3 | `GET /planos/publico` reaproveita `listarPlanos()` literalmente, no mesmo `ComercialController`, sem controlador dedicado | Só a ausência de guards distingue esta rota — não há requisito especial (`rawBody`, assinatura) que justifique um controlador próprio, ao contrário do `StripeWebhookController` |
| D4 | Sem `@Throttle` dedicado — herda o limite global (60/min) | Leitura pura, sem custo de escrita nem de fornecedor externo |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Centro de Ajuda mínimo (PRD, "Camada Comercial e Produto") não está no âmbito aprovado deste M5 | Nenhum — não bloqueia o M5; registado para não ser esquecido num milestone futuro | CEO + CTO, milestone futuro |
| 2 | Componente partilhado para "Cartão de Plano" (usado em `/precos` e potencialmente em `/subscricao`) — extrair já ou só quando um terceiro consumidor aparecer | Nenhum — decisão de detalhe, avaliada no momento se/quando surgir duplicação real | CTO, durante a implementação |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 24 — sem implementação. `GET /planos/publico` (reaproveita `listarPlanos()`, sem controlador dedicado), página `/precos` (Server Component, CTA para `/login` nesta fase). Plano de testes backend T1-T4 e validação visual V1-V5 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO. Descoberta técnica real corrigida: Next.js pré-renderia `/precos` estaticamente no build, congelando os dados de `GET /planos/publico`; corrigido com `export const dynamic = 'force-dynamic'`, sem alterar a Decisão D2 nem o âmbito. Testes backend 2/2 novos (173/173 com regressão), validação visual V1-V5 confirmada no browser. Resultados completos em §3.6 | CTO / Arquiteto Principal (Claude) |

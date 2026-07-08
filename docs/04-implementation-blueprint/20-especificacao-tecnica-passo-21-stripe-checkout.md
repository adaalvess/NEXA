# NEXA — Especificação Técnica do Passo 21 (M4): Stripe Checkout — `POST /subscricao/checkout`

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 21 — `POST /subscricao/checkout` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M4 (Comercial e Pagamentos), Passo 21 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-008 (Pagamentos e Faturação) · Use Cases (UC-07, RN-02, RN-09) · Functional Requirements (FR-29, FR-30) · Especificação Técnica do Passo 19 (`SubscricaoPlano`) · Especificação Técnica do Passo 20 (`SubscricaoGuard`, RN-11) · Security & Access Principles §3.8 (segredos nunca em código) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Implementar `POST /subscricao/checkout` (já antecipado no Blueprint §4) — o Administrador da Empresa escolhe um plano, a NEXA cria uma sessão de Stripe Checkout associando o `empresaId` como metadado (ADR-008 §3.3), e devolve o URL para onde o frontend redireciona o browser. Consistente com RN-02: o Stripe nunca é invocado antes deste momento — o registo/trial nunca exigiu dados de pagamento. Este passo **não ativa nenhuma subscrição** — a Stripe devolve o controlo à NEXA via webhook (ADR-008 §3.4), nunca via redirecionamento direto confiável; a ativação real fica para o Passo 22.

---

## 2. Contexto

ADR-008 já decidiu tudo o que este passo precisa ao nível de arquitetura (processador, modelo de integração, dados guardados) — não há decisões de arquitetura de pagamentos em aberto. As variáveis de ambiente `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` já existem em `.env.example` desde o scaffolding do Passo 1, nunca usadas até agora — o pacote `stripe` (SDK oficial) ainda não está instalado. Seis decisões de implementação, nenhuma coberta literalmente pelo ADR-008, precisam de validação explícita.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Que planos são compráveis via este endpoint.** `PLANOS_CONFIG.enterprise` (Passo 19) tem os 3 limites a `null` — "sem limite" não corresponde a um preço fixo definível como um Stripe Price. Nenhum UC aprovado descreve um fluxo de vendas assistido para Enterprise, mas também nenhum define Enterprise como self-service. | **Só `starter`/`professional` self-service via este endpoint.** `plano: 'enterprise'` devolve `400` — decisão consciente de âmbito (Enterprise tipicamente "contacta vendas" em SaaS B2B, consistente com não ter um limite numérico fixo), não uma lacuna. Preço de Enterprise fica fora do âmbito deste passo. |
| B | **Preços Stripe — como mapear plano → Stripe Price ID.** Estes IDs existem só do lado da Stripe (dashboard), nunca no nosso schema. | `STRIPE_PRICE_ID_STARTER`/`STRIPE_PRICE_ID_PROFESSIONAL` — variáveis de ambiente (nunca hardcoded, regra não-negociável #21), mesmo padrão já usado para `STRIPE_SECRET_KEY`. |
| C | **Reaproveitar o Cliente Stripe já existente, nunca duplicar.** Uma Empresa que já teve uma subscrição (cancelada, ou trial anterior a uma tentativa de checkout abandonada) pode já ter `SubscricaoPlano.stripeCustomerId` preenchido. | Se `stripeCustomerId` já existir, passar `customer: stripeCustomerId` na sessão Stripe; caso contrário, deixar a Stripe criar um Cliente novo automaticamente (capturado pelo Passo 22 via webhook) — nunca criar um Cliente Stripe explicitamente neste passo, evitando duplicar essa responsabilidade entre dois passos. |
| D | **Bloquear um segundo checkout se a subscrição já está `ativa`.** A Proposta do M4 (Decisão 6.4) já excluiu upgrade/downgrade entre planos pagos do âmbito do M4 — sem essa exclusão, um segundo checkout bem-sucedido criaria uma segunda subscrição Stripe para a mesma Empresa (risco real de faturação duplicada). | `409 Conflict` se `SubscricaoService.obterEstadoEfetivo(empresaId) === 'ativa'` — mensagem clara ("já tens uma subscrição ativa"). `trial`/`limitada`/`cancelada` continuam a poder iniciar checkout livremente (é precisamente o propósito de UC-07). |
| E | **Testes sem credenciais Stripe reais.** Mesma condição já aplicada ao fornecedor de IA (M3) e a toda a integração externa deste projeto. | `Stripe` (cliente do SDK oficial) injetado via token `STRIPE_CLIENT` (`useFactory`), nunca instanciado diretamente dentro do serviço — mesmo padrão de `AI_ADAPTER`/`FakeAdapter` (Passo 15), mas sem precisar de uma interface de adaptador completa: ADR-008 já decidiu Stripe como processador único, sem exigência de substituibilidade multi-fornecedor (ao contrário da IA, FR-26). Testes usam um `FakeStripeClient` mínimo (só `checkout.sessions.create`), zero chamada de rede real. |
| F | **`POST /subscricao/checkout` nunca sujeito ao `SubscricaoGuard` (Passo 20).** Aplicar `@BloqueadoPorSubscricao()` aqui seria paradoxal — impediria precisamente a via de escape de uma Empresa em acesso limitado. | **Nunca decorado.** Registado explicitamente aqui para não ser esquecido por engano num passo futuro. |

---

## 3. Conteúdo Estruturado

### 3.1 `STRIPE_CLIENT` — Injeção Testável (Decisão E)

```ts
// apps/api/src/modules/comercial/stripe-client.provider.ts
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeClientProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: () => new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' }),
};
```

Só a assinatura mínima usada é tipada explicitamente onde consumida (`checkout.sessions.create`) — nunca todo o SDK Stripe reexportado para fora deste ficheiro, mesma disciplina de neutralidade já aplicada ao AI Gateway (ADR-005 §3.6), mesmo sem exigência formal de substituibilidade aqui.

### 3.2 `PRECOS_STRIPE` — Configuração de Código (Decisão B)

```ts
// apps/api/src/modules/comercial/precos-stripe.ts
export const PRECOS_STRIPE: Partial<Record<Plano, string>> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER ?? '',
  professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? '',
  // 'enterprise' deliberadamente ausente (Decisão A) — self-service não suportado.
};
```

### 3.3 `SubscricaoService.criarCheckout` (Decisões A/C/D)

```ts
async criarCheckout(empresaId: string, plano: 'starter' | 'professional'): Promise<{ url: string }> {
  const precoId = PRECOS_STRIPE[plano];
  if (!precoId) throw new BadRequestException('Plano inválido para checkout self-service.');

  const estadoAtual = await this.obterEstadoEfetivo(empresaId);
  if (estadoAtual === 'ativa') {
    throw new ConflictException('Esta Empresa já tem uma subscrição ativa.');
  }

  const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId } });

  const sessao = await this.stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: precoId, quantity: 1 }],
    customer: subscricao?.stripeCustomerId ?? undefined,
    metadata: { empresaId }, // ADR-008 §3.3 — único elo entre a sessão Stripe e a Empresa
    success_url: `${process.env.WEB_APP_URL}/dashboard?checkout=sucesso&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.WEB_APP_URL}/dashboard?checkout=cancelado`,
  });

  return { url: sessao.url! };
}
```

`success_url`/`cancel_url` apontam para `/dashboard` (já existe) com parâmetros de query — placeholder deliberado até o Passo 23 construir o ecrã dedicado de subscrição; ajustável sem alterar este método (só a string de destino).

### 3.4 `POST /subscricao/checkout`

```
POST /subscricao/checkout
Body: { plano: 'starter' | 'professional' }
→ SessionGuard + PermissaoGuard('comercial', 'iniciar_checkout')
→ nunca @BloqueadoPorSubscricao() (Decisão F)
→ devolve { url }
```

Nova permissão `comercial.iniciar_checkout` — só `admin_empresa` (mesmo padrão de `ver_planos`, Passo 19; UC-07 descreve só o Administrador a escolher plano).

### 3.5 Sem Nova Lógica de Idempotência (Nota, Não uma Decisão)

Ao contrário do `SubscricaoListener` (Passo 19), este passo não introduz nenhum mecanismo de idempotência novo: cada chamada cria uma nova Sessão de Checkout Stripe (efémera por natureza, ~24h de validade) — não há "duplicação" a evitar aqui, ao contrário da criação do registo `SubscricaoPlano`. A idempotência que importa de facto (processar o evento de conclusão de pagamento) é responsabilidade do Passo 22 (webhook), nunca deste.

### 3.6 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-008 §3.3 | ✅ Stripe só invocado a partir de UC-07, nunca no registo (RN-02) |
| ADR-008 §3.6 | ✅ Nenhum dado de cartão toca a NEXA — só `metadata.empresaId` e, futuramente, `stripeCustomerId`/`stripeSubscriptionId` (Passo 22) |
| Security & Access Principles §3.8 | ✅ `STRIPE_SECRET_KEY`/Price IDs só via variáveis de ambiente |
| Passo 20 (RN-11) | ✅ Endpoint explicitamente nunca decorado com `@BloqueadoPorSubscricao()` |
| Proposta do M4, Decisão 6.4 | ✅ Bloqueio de segunda subscrição enquanto já `ativa` — upgrade/downgrade continua fora de âmbito |

**Nenhum novo ADR necessário** — este passo aplica ADR-008, não o altera.

### 3.7 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | `admin_empresa` com subscrição `trial` inicia checkout para `professional` → `201`, `{ url }` devolvido, `FakeStripeClient` recebe `metadata.empresaId` correto | HTTP real | ✅ |
| T2 | Sessão Stripe criada com `line_items` correspondente a `STRIPE_PRICE_ID_PROFESSIONAL` | HTTP real, inspecionando o pedido recebido pelo `FakeStripeClient` | ✅ |
| T3 | `plano: 'enterprise'` devolve `400` | HTTP real | ✅ |
| T4 | Subscrição já `ativa` → `409`, nenhuma sessão Stripe criada | HTTP real | ✅ |
| T5 | `gestor`/`colaborador`/`convidado` recebem `403` | HTTP real | ✅ |
| T6 | `SubscricaoPlano.stripeCustomerId` já preenchido → reaproveitado (`customer` no pedido à Stripe), nunca `undefined` | HTTP real | ✅ |
| T7 | Subscrição `trial` expirado/`limitada` consegue iniciar checkout com sucesso (via de escape nunca bloqueada) | HTTP real | ✅ |
| T8 | Regressão completa — todos os testes herdados (153) continuam a passar | `npm run test:e2e` | ✅ 160/160 |
| T9 | `npm run build` sem erros | build limpo | ✅ |

**Exit Criteria: T1-T9 todos cumpridos.**

### 3.8 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- `apps/api/src/modules/comercial/stripe-client.provider.ts` (`STRIPE_CLIENT`), `precos-stripe.ts` (`obterPrecoStripe`, lido a cada chamada — mesmo padrão do Passo 15), `dto/criar-checkout.dto.ts` (`CriarCheckoutDto`, valida `plano` via `@IsIn(['starter','professional'])` — rejeita `enterprise` já na fronteira de validação, T3 confirmado sem código adicional no serviço).
- `SubscricaoService.criarCheckout` — único ponto responsável por esta lógica, lê `tenantContext` internamente (mesmo padrão de `IaService.perguntar`), nunca recebe `empresaId` como parâmetro do controlador.
- `POST /subscricao/checkout` (`ComercialController`) — nova permissão `comercial.iniciar_checkout`, só `admin_empresa`. Nunca decorado com `@BloqueadoPorSubscricao()` (confirmado por T7).
- `apps/api/test/comercial-checkout.e2e-spec.ts` — 7 testes (T1-T7), `FakeStripeClient` mínimo (duck-type só de `checkout.sessions.create`).
- `.env.example` — `STRIPE_PRICE_ID_STARTER`/`STRIPE_PRICE_ID_PROFESSIONAL` adicionados.
- Pacote `stripe` (SDK oficial) instalado.

**Descoberta técnica real, corrigida antes de fechar o passo**: ao contrário do SDK da Anthropic (Passo 15, que aceita uma `apiKey` vazia sem lançar exceção no construtor), o SDK da Stripe lança `Neither apiKey nor config.authenticator provided` no próprio construtor quando a chave é uma string vazia — isto quebrava a compilação de qualquer módulo de teste que incluísse `ComercialModule` sem substituir `STRIPE_CLIENT`, mesmo sem nunca chamar a Stripe (`comercial.e2e-spec.ts` e `comercial-enforcement.e2e-spec.ts`, Passos 19/20, ambos regressaram). Corrigido com um valor de reserva inofensivo (`sk_test_placeholder_sem_credencial_real`) quando `STRIPE_SECRET_KEY` está vazia — satisfaz o construtor sem nunca ser usado numa chamada real, mesma garantia de "arranca sem credencial real" já estabelecida para a IA, agora também confirmada para a Stripe. Correção de implementação, não uma alteração de âmbito ou arquitetura (Decisão E já previa exatamente este comportamento — só a forma exata de o alcançar precisou de ajuste).

**Resultados de validação:**
- `apps/api/test/comercial-checkout.e2e-spec.ts` — 7 testes (T1-T7), via HTTP real com `FakeStripeClient` (zero chamada de rede real).
- Suite completa: **160/160 testes** (153 herdados + 7 novos), zero regressões após a correção do provider Stripe.
- `npm run build` (`apps/api`) limpo.

**Exit Criteria T1-T9: todos cumpridos.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Só `starter`/`professional` self-service via este endpoint (Decisão a Validar A) | Enterprise sem preço fixo definível; nenhum UC descreve fluxo self-service para Enterprise |
| D2 | Stripe Price IDs via variáveis de ambiente (Decisão a Validar B) | Nunca hardcoded; existem só do lado da Stripe |
| D3 | Cliente Stripe reaproveitado via `stripeCustomerId` se existir, nunca criado explicitamente aqui (Decisão a Validar C) | Evita duplicar responsabilidade entre este passo e o Passo 22 |
| D4 | `409` se subscrição já `ativa` (Decisão a Validar D) | Evita subscrição Stripe duplicada para a mesma Empresa, consistente com upgrade/downgrade fora de âmbito do M4 |
| D5 | `STRIPE_CLIENT` injetado via DI, `FakeStripeClient` nos testes (Decisão a Validar E) | Zero dependência de rede/credenciais reais, mesma disciplina já aplicada ao M3 |
| D6 | `POST /subscricao/checkout` nunca decorado com `@BloqueadoPorSubscricao()` (Decisão a Validar F) | Seria a via de escape do próprio acesso limitado — bloqueá-la seria paradoxal |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `success_url`/`cancel_url` apontam para `/dashboard` como placeholder — o ecrã dedicado (Passo 23) pode exigir um destino diferente | Ajuste de string, sem impacto arquitetural | CTO, no Passo 23 |
| 2 | Preços/Price IDs reais da Stripe (valores concretos em euros) continuam por definir — são configuração externa à NEXA, no dashboard da Stripe, nunca no código | Bloqueante só para o ambiente de produção real, não para este passo (testado com `FakeStripeClient`) | Fundadora/CEO, antes do lançamento real |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 21 — sem implementação. Seis Decisões a Validar (A-F): só Starter/Professional self-service (Enterprise excluído), Price IDs via env vars, reaproveitamento do Cliente Stripe existente, bloqueio de segunda subscrição enquanto já ativa, testabilidade via `STRIPE_CLIENT`/`FakeStripeClient` (sem interface de adaptador completa, ao contrário da IA), e confirmação explícita de que este endpoint nunca fica sujeito ao `SubscricaoGuard` do Passo 20. Plano de testes T1-T9 (não executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Adicionado §3.8 — Resultado da Implementação, após aprovação e implementação completa das 6 Decisões a Validar (A-F) tal como propostas. Descoberta técnica real corrigida: SDK da Stripe lança exceção no construtor com `apiKey` vazia (ao contrário do SDK da Anthropic) — corrigido com valor de reserva inofensivo, sem alterar a Decisão E nem introduzir dependência de rede real; regressão em `comercial.e2e-spec.ts`/`comercial-enforcement.e2e-spec.ts` (Passos 19/20) identificada e corrigida antes do fecho. T1-T9 confirmados, 160/160 testes, zero regressões | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

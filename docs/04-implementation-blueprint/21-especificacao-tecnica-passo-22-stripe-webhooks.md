# NEXA — Especificação Técnica do Passo 22 (M4): Webhooks Stripe — `POST /webhooks/stripe`

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 22 — `POST /webhooks/stripe` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M4 (Comercial e Pagamentos), Passo 22 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-008 §3.4 (Processamento de Webhooks) · Event & Notification Architecture Rules §3.5 (idempotência) · Security & Access Principles §3.9 (Fail Secure) · Especificação Técnica do Passo 19 (`SubscricaoListener`, padrão `tenantContext.run()`) · Especificação Técnica do Passo 21 (Stripe Checkout, `STRIPE_CLIENT`) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Implementar `POST /webhooks/stripe` (já antecipado no Blueprint §4, "sem sessão — verificado por assinatura") — o ponto onde a Stripe devolve o controlo à NEXA após um checkout bem-sucedido (ADR-008 §3.3, passo 4), ativando de facto a subscrição criada no Passo 21. Fecha o ciclo completo de UC-07: escolher plano → pagar → subscrição ativa.

---

## 2. Contexto

ADR-008 §3.4 já fixa os três requisitos não-negociáveis: verificação de assinatura obrigatória (Fail Secure), processamento idempotente por identificador único do evento, e aplicação das regras já decididas (RN-10/RN-11) sem as redefinir. O que falta são decisões de implementação — como obter o corpo bruto do pedido (a assinatura Stripe é calculada sobre os bytes exatos, não sobre JSON já interpretado), como resolver o `empresaId` sem sessão, e o âmbito exato de eventos Stripe tratados. Seis decisões, nenhuma coberta literalmente pelo ADR-008.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Que eventos Stripe este passo trata.** `checkout.session.completed` é suficiente para UC-07/DoD literal do M4 (Blueprint §2.2: "webhooks verificados e idempotentes"). Tratar também `customer.subscription.deleted` (cancelamento) exigiria saber a que Empresa uma Subscription pertence — mas os metadados (`empresaId`) só são propagados automaticamente para a Checkout Session, nunca para o objeto Subscription associado, a menos que se peça isso explicitamente no Passo 21 (já aprovado e implementado) — reabrir esse código para acrescentar `subscription_data.metadata` seria tocar num passo já fechado sem necessidade concreta ainda. | **Só `checkout.session.completed` neste passo.** Qualquer outro tipo de evento recebido é reconhecido com `200` mas ignorado deliberadamente (Decisão E) — nunca um erro. Cancelamento/falha de pagamento ficam registados como Questão em Aberto para um passo futuro, quando houver necessidade real (nenhum UC aprovado descreve cancelamento self-service, Proposta do M4, Decisão 6.4). |
| B | **Corpo bruto do pedido, exigido pela verificação de assinatura.** O `ValidationPipe`/parser JSON global (Passo 3) interpretaria o corpo antes de a assinatura poder ser verificada sobre os bytes exatos. | **`NestFactory.create(AppModule, { rawBody: true })`** (mecanismo nativo do NestJS, documentado precisamente para este cenário) — preserva `req.rawBody` (Buffer) em paralelo ao corpo já interpretado, sem afetar o parsing JSON de nenhuma outra rota. Mais simples e menos frágil do que desativar o parser global e o reconstruir manualmente por rota. |
| C | **Resolução do `empresaId` sem sessão.** Este endpoint é público (sem cookie) — `TenantContextMiddleware` (Passo 4) já tolera pedidos sem cookie sem lançar erro (`forRoutes('*')`, mas só populariza o contexto quando existe uma sessão válida). | `session.metadata.empresaId` (gravado no Passo 21) identifica a Empresa; o handler entra explicitamente em `tenantContext.run({ utilizadorId: 'stripe-webhook', empresaId, papel: admin_empresa }, ...)` — **mesmo padrão exato já usado pelo `SubscricaoListener`** (Passo 19), primeira reutilização deste padrão fora do contexto de eventos internos. |
| D | **Idempotência real (ADR-008: "usando o identificador único do evento Stripe").** Reprocessar `checkout.session.completed` é inofensivo por si só (atribuição de valores, nunca um incremento) — mas ADR-008 exige deduplicação real, não apenas tolerância a repetição. | Novo modelo `WebhookStripeProcessado` (tenant-scoped, RLS — mesma disciplina de todas as tabelas), chave única `stripeEventId`. Ordem: verificar se já existe → só então mutar `SubscricaoPlano` → só então registar o evento como processado. Nota honesta: não é uma transação multi-operação atómica (`TenantPrismaService` não a suporta nativamente através da extensão Prisma) — aceitável porque a própria mutação de `SubscricaoPlano` é idempotente por natureza; um crash entre os dois passos, na pior hipótese, causa um reprocessamento inofensivo numa nova tentativa da Stripe, nunca corrupção de dados. |
| E | **Eventos Stripe válidos mas não tratados por este passo (Decisão A).** Devolver um erro faria a Stripe reenviar indefinidamente um evento que decidimos ignorar deliberadamente. | Sempre `200` para qualquer `event.type` diferente de `checkout.session.completed` — reconhecido, nunca processado, nunca um erro. |
| F | **Como testar a verificação de assinatura sem enfraquecer o que está a ser testado.** Um `FakeStripeClient` que simula `constructEvent` sem crypto real nunca provaria que assinaturas inválidas são de facto rejeitadas — exatamente o ponto de segurança que a Fundadora/CEO pediu para reforçar. | **Usar o SDK real da Stripe** (`Stripe.webhooks.generateTestHeaderString`, utilitário oficial só para testes, zero chamada de rede) para gerar uma assinatura válida localmente com um segredo de teste, e verificar que uma assinatura adulterada é genuinamente rejeitada pela lógica criptográfica real — nunca simulada. |

---

## 3. Conteúdo Estruturado

### 3.1 Schema — `WebhookStripeProcessado` (Decisão D)

```prisma
model WebhookStripeProcessado {
  id            String   @id @default(cuid())
  empresaId     String
  empresa       Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  stripeEventId String   @unique
  processadoEm  DateTime @default(now())

  @@index([empresaId])
}
```

Aditivo, RLS ativa (mesma disciplina de todas as tabelas de negócio).

### 3.2 `main.ts` — Corpo Bruto (Decisão B)

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

Única alteração — nenhuma outra rota é afetada; o corpo continua a ser interpretado como JSON normalmente para todos os outros endpoints.

### 3.3 `StripeWebhookController`

```ts
// apps/api/src/modules/comercial/stripe-webhook.controller.ts
@Controller('webhooks')
export class StripeWebhookController {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly subscricaoService: SubscricaoService,
  ) {}

  @Post('stripe')
  async receberWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') assinatura: string) {
    let evento: Stripe.Event;
    try {
      evento = this.stripe.webhooks.constructEvent(req.rawBody!, assinatura, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    } catch {
      throw new BadRequestException('Assinatura inválida.'); // Fail Secure — nunca processa sem verificação (ADR-008 §3.4)
    }

    if (evento.type !== 'checkout.session.completed') {
      return { recebido: true }; // Decisão E — 200, nunca um erro
    }

    const sessao = evento.data.object as Stripe.Checkout.Session;
    const empresaId = sessao.metadata?.empresaId;
    if (!empresaId) {
      throw new BadRequestException('metadata.empresaId em falta.');
    }

    await this.subscricaoService.processarCheckoutConcluido(empresaId, evento.id, sessao);
    return { recebido: true };
  }
}
```

Controlador dedicado (não `ComercialController`) — evita misturar a exigência de corpo bruto/sem sessão com os restantes endpoints autenticados do módulo. Sem `SessionGuard`/`PermissaoGuard` (endpoint público, verificado por assinatura, não por RBAC).

### 3.4 `SubscricaoService.processarCheckoutConcluido` (Decisões C/D)

```ts
async processarCheckoutConcluido(empresaId: string, stripeEventId: string, sessao: Stripe.Checkout.Session): Promise<void> {
  await tenantContext.run({ utilizadorId: 'stripe-webhook', empresaId, papel: Papel.admin_empresa }, async () => {
    const jaProcessado = await this.tenantPrisma.client.webhookStripeProcessado.findUnique({ where: { stripeEventId } });
    if (jaProcessado) {
      return; // idempotência — nunca reprocessa
    }

    await this.tenantPrisma.client.subscricaoPlano.update({
      where: { empresaId },
      data: {
        estado: 'ativa',
        stripeCustomerId: typeof sessao.customer === 'string' ? sessao.customer : sessao.customer?.id,
        stripeSubscriptionId: typeof sessao.subscription === 'string' ? sessao.subscription : sessao.subscription?.id,
      },
    });

    await this.tenantPrisma.client.webhookStripeProcessado.create({ data: { empresaId, stripeEventId } });
  });
}
```

Adicionado a `SubscricaoService` — nunca um novo serviço paralelo (single source of truth já validada nos Passos 19-21).

### 3.5 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-008 §3.4 | ✅ Verificação de assinatura obrigatória, idempotência por `stripeEventId`, RN-10/RN-11 aplicadas sem redefinição |
| Security & Access Principles §3.9 (Fail Secure) | ✅ Assinatura inválida → `400`, nunca processamento |
| Event & Notification Architecture Rules §3.5 | ✅ Consumidor de evento externo idempotente, mesmo princípio já aplicado a consumidores internos |
| Passo 19 (`tenantContext.run()`) | ✅ Reutilizado tal-e-qual, primeira vez fora de um evento interno |
| Passo 20 (RN-11) | ✅ `estado: 'ativa'` escrito aqui é exatamente o que `SubscricaoGuard`/`obterEstadoEfetivo` já sabem interpretar, sem alteração |

**Nenhum novo ADR necessário.**

### 3.6 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | Webhook com assinatura válida (`checkout.session.completed`) → `SubscricaoPlano.estado = 'ativa'`, `stripeCustomerId`/`stripeSubscriptionId` gravados | HTTP real, assinatura real gerada localmente (`generateTestHeaderString`) | ✅ |
| T2 | Assinatura inválida/adulterada → `400`, `SubscricaoPlano` nunca alterado | HTTP real, verificação criptográfica genuína (Decisão F) | ✅ |
| T3 | Evento de tipo diferente (ex: `customer.created`) → `201` (default NestJS sem `@HttpCode`), `{ recebido: true }`, `SubscricaoPlano` nunca alterado | HTTP real | ✅ |
| T4 | Reenvio do mesmo evento (`stripeEventId` repetido) → segunda chamada não reprocessa (idempotência) | HTTP real, confirmado via contagem de `WebhookStripeProcessado` e via um estado alterado manualmente entre as duas entregas, nunca revertido pela segunda | ✅ |
| T5 | `metadata.empresaId` em falta → `400` | HTTP real | ✅ |
| T6 | Endpoint nunca exige sessão — chamada sem cookie é aceite normalmente (só a assinatura é verificada) | HTTP real | ✅ |
| T7 | Regressão completa — todos os testes herdados (160) continuam a passar | `npm run test:e2e` | ✅ 166/166 |
| T8 | `npm run build` sem erros | build limpo | ✅ |

**Exit Criteria: T1-T8 todos cumpridos.**

### 3.7 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- Migrações `20260708090916_webhook_stripe_processado` + `20260708090948_enable_rls_webhook_stripe_processado` — novo modelo `WebhookStripeProcessado`, RLS ativa (mesma disciplina de todas as tabelas de negócio).
- `main.ts` — `rawBody: true` adicionado à criação da aplicação, sem nenhuma outra alteração ao bootstrap.
- `apps/api/src/modules/comercial/stripe-webhook.controller.ts` — `StripeWebhookController`, controlador dedicado, sem `SessionGuard`/`PermissaoGuard`.
- `SubscricaoService.processarCheckoutConcluido` — extensão do mesmo serviço (single source of truth preservada).
- `apps/api/test/comercial-webhooks.e2e-spec.ts` — 6 testes (T1-T6), assinatura gerada e verificada com o SDK real da Stripe (`generateTestHeaderString`/`constructEvent`), zero chamada de rede real.

**Sem descobertas técnicas emergentes além das já identificadas e validadas na própria especificação** — as 6 Decisões a Validar (A-F) cobriram antecipadamente o que, nos passos anteriores, normalmente só surgia durante a implementação.

**Resultados de validação:**
- `apps/api/test/comercial-webhooks.e2e-spec.ts` — 6 testes (T1-T6), incluindo prova genuína de rejeição criptográfica (T2) e prova genuína de deduplicação (T4 — um estado alterado manualmente entre duas entregas do mesmo evento nunca é revertido pela segunda entrega).
- Suite completa: **166/166 testes** (160 herdados + 6 novos), zero regressões.
- `npm run build` (`apps/api`) limpo.

**Exit Criteria T1-T8: todos cumpridos.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Só `checkout.session.completed` tratado neste passo (Decisão a Validar A) | Suficiente para UC-07/DoD; evita reabrir o Passo 21 já aprovado e evita um lookup cross-tenant sem tenant conhecido |
| D2 | `rawBody: true` (mecanismo nativo do NestJS) (Decisão a Validar B) | Mais simples e robusto do que desativar/reconstruir manualmente o parser global |
| D3 | `tenantContext.run()` explícito, reutilizando o padrão do Passo 19 (Decisão a Validar C) | Mesma solução já validada para escrita fora de um pedido autenticado normal |
| D4 | `WebhookStripeProcessado`, verificar → mutar → registar, sem transação multi-operação (Decisão a Validar D) | Deduplicação real pedida pelo ADR-008; simplicidade aceitável porque a mutação em si é idempotente |
| D5 | Eventos não tratados devolvem sempre `200` (Decisão a Validar E) | Evita reenvio indefinido pela Stripe de eventos deliberadamente ignorados |
| D6 | Testes de assinatura com o SDK real, não `FakeStripeClient` (Decisão a Validar F) | Prova real da rejeição de assinaturas inválidas, não uma simulação — pedido explícito da Fundadora/CEO sobre segurança |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Cancelamento (`customer.subscription.deleted`) e falha de pagamento (`invoice.payment_failed`) ficam por tratar | Exigiria propagar `empresaId` também para o objeto Subscription (tocar no Passo 21) ou um mecanismo de lookup cross-tenant por `stripeCustomerId` — decisão de arquitetura a trazer isoladamente quando houver necessidade real | CEO + CTO, em passo futuro |
| 2 | `GET /subscricao` (estado atual, incluindo `stripeSubscriptionId`) continua sem existir | Fica para o Passo 23 (frontend), mesmo raciocínio de adiamento já usado nos passos anteriores | CTO, no Passo 23 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 22 — sem implementação. Seis Decisões a Validar (A-F): só `checkout.session.completed` tratado, `rawBody: true` para o corpo bruto, `tenantContext.run()` reutilizado do Passo 19, idempotência via `WebhookStripeProcessado` (verificar → mutar → registar, sem transação multi-operação), eventos não tratados sempre `200`, testes de assinatura com o SDK real (não `FakeStripeClient`). Plano de testes T1-T8 (não executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Adicionado §3.7 — Resultado da Implementação, após aprovação e implementação completa das 6 Decisões a Validar (A-F) tal como propostas, sem nenhum desvio à arquitetura, âmbito ou decisões já aprovadas. T1-T8 confirmados, 166/166 testes, com prova genuína de rejeição criptográfica (T2) e de deduplicação real (T4). Sem descobertas técnicas emergentes | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

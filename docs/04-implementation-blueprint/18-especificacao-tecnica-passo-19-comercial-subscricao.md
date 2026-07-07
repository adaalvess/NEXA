# NEXA — Especificação Técnica do Passo 19 (M4): Módulo `comercial` — Subscrição Real e `GET /planos`

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 19 — `SubscricaoPlano` real, `GET /planos` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M4 (Comercial e Pagamentos), Passo 19 — primeiro passo do M4 |
| **Versão** | 1.2 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M4 (aprovada, 2026-07-07) · ADR-008 (Pagamentos) · Use Cases (UC-07, UC-08, RN-02, RN-09 a RN-11) · Functional Requirements (FR-29, FR-30) · System Design Principles §3.2 (regras #1-#3) · Especificação Técnica do Passo 15 (`QuotaService`) · Master Roadmap, Risco R3 (resolvido nesta proposta) |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Ativar `SubscricaoPlano` — scaffolded desde o Passo 2, nunca instanciado — como registo real, criado automaticamente no registo de cada Empresa (trial de 14 dias, RN-02/FR-30), com os valores de limite por plano já aprovados na Proposta do M4. Expor `GET /planos` (já antecipado no Blueprint §4). Primeiro passo do módulo `comercial` (já previsto na regra não-negociável #1 desde o início do projeto). Toda a lógica de subscrição, estados e limites fica centralizada neste módulo, conforme pedido explícito da Fundadora/CEO na aprovação do M4 — nenhum outro módulo conhece diretamente regras de faturação.

---

## 2. Contexto

A Proposta do M4 já aprovou os valores de limite (Starter/Professional/Enterprise) e o âmbito de enforcement (só `limiteUsoIA` ativo nesta fase). Este passo cria a fundação de dados sobre a qual os passos seguintes (20-23: enforcement de RN-11, Stripe Checkout, webhooks, ecrã) se apoiam. Quatro decisões técnicas emergentes, nenhuma coberta literalmente pela Proposta do M4, precisam de validação explícita.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Como criar `SubscricaoPlano` no registo, sem violar a direção de dependência entre módulos.** `AuthService.registar()` vive em `fundacao/` e cria a Empresa — mas a Fundadora/CEO pediu que "estados" e lógica de subscrição fiquem 100% em `comercial`, "sem conhecimento direto das regras de faturação" por outros módulos. Isto impede `fundacao` de chamar `comercial` diretamente (o inverso do precedente do Passo 17), e impede também que `comercial` precise de ser importado por `fundacao`. | **Reativo por evento, reaproveitando o mesmo `EVENTO_AUDITORIA` já emitido por `AuthService.registar()`** (`acao: 'criar', entidade: 'Empresa'`) — mesmo padrão já usado pelo `NotificacaoListener` (Passo 11) a partilhar o mesmo evento sem alterar quem o emite. `fundacao` nunca fica a saber que `comercial` existe. O `SubscricaoListener` (em `comercial/`) precisa de escrever com `empresaId` explícito, fora de qualquer pedido HTTP — resolvido com `tenantContext.run({ utilizadorId: payload.ator, empresaId: payload.empresaId, papel: admin_empresa }, fn)`, envolvendo a escrita via `TenantPrismaService` normal. Isto é a **primeira utilização em código de produção** de um padrão até agora só usado em testes (`comoTenant()`, Passo 15) — não exige nenhum novo role de BD nem alarga a exceção já documentada do `PrismaService` bruto (que continua privado à Fundação). Alternativas consideradas e rejeitadas: chamada direta `fundacao → comercial` (contradiz o pedido explícito de centralização); exportar `PrismaService` bruto para `comercial` (alargaria uma exceção de segurança já deliberadamente restrita, Passo 4). **Idempotência exigida explicitamente pela Fundadora/CEO na aprovação desta decisão** — `EventEmitter2` não garante entrega exatamente uma vez (mesma limitação já documentada no Passo 11 para o `NotificacaoListener`); o listener usa `upsert` (3.3), nunca `create`, para que um replay/nova tentativa do mesmo evento nunca origine uma segunda `SubscricaoPlano` nem sobrescreva um estado já avançado (ex: já convertida para paga). |
| B | **Como representar "ilimitado" (Enterprise) — dado que o schema exige hoje `Int` não-nulo.** A Fundadora/CEO deu margem para um valor sentinela documentado, mas também sinalizou explicitamente o risco de esse valor se tornar uma regra de negócio implícita. | **Tornar os 3 campos de limite `Int?` (nullable)** — `null` significa literalmente "sem limite", autoexplicativo, sem número mágico a documentar nem risco de ser lido por engano como um teto real. Custo: `QuotaService` (Passo 15) precisa de uma correção — hoje `subscricao?.limiteUsoIA ?? quotaPadraoMensal()` trataria `null` como "ausente" (nullish) e cairia incorretamente no valor global de 50, exatamente o oposto de "ilimitado". Corrigido para distinguir "sem `SubscricaoPlano`" de "`SubscricaoPlano` existe, limite é `null`" (3.4). |
| C | **Que plano usa o trial automático?** Nenhum documento aprovado fixa isto. | **`professional`** — generoso o suficiente para demonstrar valor real durante os 14 dias (Business Goals, meta de conversão trial→pago), sem oferecer gratuitamente o nível Enterprise. Um Administrador pode sempre fazer upgrade/downgrade explícito ao converter (UC-07, Passo 21). |
| D | **Promover `SubscricaoPlano.plano`/`estado` de `String` para `enum` Prisma.** Ambos os campos, scaffolded como `String` desde o Passo 2, tornam-se reais pela primeira vez neste passo. | **Sim** — mesmo padrão já aplicado a `Papel` (Passo 5), `EstadoProcesso` (Passo 9), `EstadoOportunidade` (Passo 10): reforça validação ao nível da BD assim que um campo passa de decorativo a usado de facto. |
| E | **`Empresa.estadoSubscricao` (campo `String`, scaffolded desde o Passo 2) nunca foi lido nem escrito em código nenhum até agora — redundante com `SubscricaoPlano.estado`, que passa a ser a fonte de verdade real neste passo.** | **Remover.** Manter os dois seria duplicar o mesmo conceito em dois sítios, exigindo sincronização manual a cada atualização de estado — o oposto do pedido de centralização da Fundadora/CEO. Alteração estrutural ao schema, documentada aqui conforme a regra de rastreabilidade do Blueprint (§3). |
| F | **`GET /planos` — quem pode ver?** UC-07 descreve só o Administrador a consultar/escolher planos (passo 2 do fluxo principal). | **Só `admin_empresa`** — nova permissão `comercial.ver_planos`. `gestor`/`colaborador`/`convidado` sem acesso; nenhum UC aprovado descreve outro papel a interagir com planos/faturação. |

---

## 3. Conteúdo Estruturado

### 3.1 Schema — `SubscricaoPlano` e Remoção de `Empresa.estadoSubscricao`

```prisma
enum Plano {
  starter
  professional
  enterprise
}

enum EstadoSubscricao {
  trial
  ativa
  limitada
  cancelada
}

model SubscricaoPlano {
  id                    String           @id @default(cuid())
  empresaId             String           @unique
  empresa               Empresa          @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  plano                 Plano
  estado                EstadoSubscricao @default(trial)
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  limiteUtilizadores    Int?             // null = sem limite (Decisão B)
  limiteArmazenamentoMb Int?
  limiteUsoIA           Int?
  trialIniciadoEm       DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
}
```

`Empresa.estadoSubscricao` removido (Decisão E) — `SubscricaoPlano.estado` é agora a única fonte de verdade. Migração aditiva para os enums/nullability + remoção do campo legado, numa única migração (sem dados reais em produção a migrar — nenhuma Empresa tem `SubscricaoPlano` nem usa `estadoSubscricao` hoje).

### 3.2 `PLANOS_CONFIG` — Configuração de Código (Comercial, Decisão B do M2 aplicada a novo contexto)

```ts
// apps/api/src/modules/comercial/planos-config.ts
export const PLANOS_CONFIG: Record<Plano, { limiteUtilizadores: number | null; limiteArmazenamentoMb: number | null; limiteUsoIA: number | null }> = {
  starter:      { limiteUtilizadores: 5,   limiteArmazenamentoMb: 1024,  limiteUsoIA: 50 },
  professional: { limiteUtilizadores: 20,  limiteArmazenamentoMb: 10240, limiteUsoIA: 200 },
  enterprise:   { limiteUtilizadores: null, limiteArmazenamentoMb: null, limiteUsoIA: null },
};
```

Valores literais aprovados pela Fundadora/CEO na aprovação do M4 (Decisão 6.1 dessa proposta) — nunca hardcoded disperso por vários pontos do código, mesmo padrão já usado em `DEFAULT_PERMISSION_MATRIX` (Passo 5).

### 3.3 `SubscricaoListener` — Criação Automática do Trial, Idempotente (Decisão A)

```ts
// apps/api/src/modules/comercial/subscricao.listener.ts
@Injectable()
export class SubscricaoListener {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @OnEvent(EVENTO_AUDITORIA)
  async aoRegistarEvento(payload: EventoAuditoria): Promise<void> {
    if (payload.acao !== 'criar' || payload.entidade !== 'Empresa') {
      return;
    }

    const limites = PLANOS_CONFIG.professional; // Decisão C

    await tenantContext.run({ utilizadorId: payload.ator, empresaId: payload.empresaId, papel: Papel.admin_empresa }, async () => {
      // `upsert`, nunca `create` — idempotência exigida explicitamente pela
      // Fundadora/CEO (aprovação desta especificação). `EventEmitter2` não
      // garante entrega exatamente uma vez (mesma limitação já documentada
      // no Passo 11 para o `NotificacaoListener`); um replay ou nova
      // tentativa do mesmo evento `criar`/`Empresa` tem de ser inofensivo.
      await this.tenantPrisma.client.subscricaoPlano.upsert({
        where: { empresaId: payload.empresaId },
        create: { plano: 'professional', estado: 'trial', ...limites },
        // Vazio deliberadamente — se já existir (replay), nunca reescreve
        // nem reinicia `trialIniciadoEm`; nunca sobrescreve um estado já
        // avançado (ex: entretanto convertida para paga por um webhook,
        // Passo 22) com os valores iniciais de trial.
        update: {},
      });
    });
  }
}
```

Subscreve o **mesmo** `EVENTO_AUDITORIA` já emitido por `AuthService.registar()` desde o Passo 6 — nenhuma alteração ao ponto de emissão em `fundacao/`. Bloqueante (não fire-and-forget, ao contrário do `NotificacaoListener`) — a criação da subscrição de trial é uma etapa de correção imediata de RN-02/FR-30, não um efeito secundário tolerante a atraso. Idempotência garantida por `upsert` com `update: {}` — a chave de deduplicação é o próprio `empresaId` (já `@unique` em `SubscricaoPlano`), nunca um identificador de evento à parte: processar o mesmo evento `criar`/`Empresa` uma ou várias vezes produz sempre exatamente uma `SubscricaoPlano`, sem erro e sem sobrescrever estado real já avançado.

### 3.4 Correção do `QuotaService` (Passo 15) — `null` Significa Sem Limite (Decisão B)

```ts
const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId: ctx.empresaId } });

if (subscricao && subscricao.limiteUsoIA === null) {
  // Enterprise (ou qualquer plano futuro sem limite) — nunca bloqueia.
} else {
  const limite = subscricao?.limiteUsoIA ?? quotaPadraoMensal();
  // ... verificação existente, sem alteração de comportamento para Starter/Professional
}
```

Distingue explicitamente "sem `SubscricaoPlano`" (usa o valor global provisório, comportamento já existente desde o Passo 15) de "`SubscricaoPlano` existe, `limiteUsoIA` é `null`" (sem limite, nunca bloqueia) — o `??` usado até agora tratava os dois casos da mesma forma, o que passa a estar errado assim que `SubscricaoPlano` real existir.

### 3.5 `GET /planos`

```
GET /planos
→ SessionGuard + PermissaoGuard('comercial', 'ver_planos')
→ devolve PLANOS_CONFIG formatado: [{ plano: 'starter', limiteUtilizadores: 5, ... }, ...]
```

Estático, não depende da Empresa que pergunta — lista os planos disponíveis (UC-07, passo 2 do fluxo principal), nunca o estado da subscrição atual dessa Empresa (isso fica para um passo seguinte, quando o ecrã precisar de facto — mesmo raciocínio já usado para adiar `GET /ia/sugestoes` até ao Passo 18).

### 3.6 Nova Permissão `comercial.ver_planos`

| Papel | `ver_planos` |
|---|---|
| `admin_empresa` | `true` |
| `gestor` | `false` |
| `colaborador` | `false` |
| `convidado` | `false` |

### 3.7 Módulo `comercial`

```
apps/api/src/modules/comercial/
  comercial.module.ts       // imports: [FundacaoModule]; providers: [SubscricaoListener]; controllers: [ComercialController]
  planos-config.ts
  subscricao.listener.ts
  comercial.controller.ts
```

Primeiro módulo de negócio já antecipado desde a regra não-negociável #1 ("Módulos: fundacao, dashboard, processos, crm, ia, comercial"), agora construído. `FundacaoModule` nunca importa `ComercialModule` (Decisão A) — a direção de dependência permanece sempre "módulo de negócio → Fundação", nunca o inverso, mesmo com o novo padrão de módulo-a-módulo já estabelecido no Passo 17.

### 3.8 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| RN-02 / FR-30 | ✅ Trial de 14 dias criado automaticamente, sem dados de pagamento |
| System Design Principles, regra #2 | ✅ `fundacao` nunca conhece `comercial`; evento genérico já existente é o único ponto de contacto |
| Regra não-negociável #4 (Configuração sobre hardcoding) | ✅ `PLANOS_CONFIG` único ponto de verdade dos limites |
| Master Roadmap, Risco R3 | ✅ Resolvido — valores numéricos aprovados e aplicados |
| Especificação Técnica do Passo 15 (`QuotaService`) | ✅ Corrigido para `null` = sem limite, sem alterar o comportamento já testado para Starter/Professional |

**Nenhum novo ADR necessário** — este passo aplica ADR-008 (já aprovado) e FR-29/30, não os altera.

### 3.9 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | Registo de Empresa cria `SubscricaoPlano` automaticamente — `estado: trial`, `plano: professional`, limites = `PLANOS_CONFIG.professional`, `trialIniciadoEm` ≈ agora | HTTP real | ✅ |
| T2 | `GET /planos` devolve os 3 planos com os limites aprovados; Enterprise com os 3 campos `null` | HTTP real | ✅ |
| T3 | `gestor`/`colaborador`/`convidado` recebem `403` em `GET /planos` | HTTP real | ✅ |
| T4 | `QuotaService` — Empresa com `SubscricaoPlano` `enterprise` (`limiteUsoIA: null`) nunca bloqueia, mesmo com uso elevado | Direto sobre o serviço (mesmo padrão do Passo 15/16 para cenários sem endpoint HTTP dedicado) | ✅ |
| T5 | `QuotaService` — comportamento para Starter/Professional (`limiteUsoIA` numérico) permanece inalterado face ao Passo 15 | Regressão dos testes já existentes de `ia-gateway.e2e-spec.ts` | ✅ |
| T6 | **Idempotência** — invocar `SubscricaoListener.aoRegistarEvento` duas vezes com o mesmo payload (`criar`/`Empresa`) nunca cria uma segunda `SubscricaoPlano` nem lança erro; se o estado já tiver avançado (ex: `ativa`) entre as duas chamadas, a segunda nunca o reverte para `trial` | Direto sobre o listener | ✅ |
| T7 | Regressão completa — todos os testes herdados (135) continuam a passar | `npm run test:e2e` | ✅ 141/141 |
| T8 | `npm run build` sem erros | build limpo | ✅ |

**Exit Criteria: T1-T8 todos cumpridos.** Resolve formalmente o Risco R3 do Master Roadmap.

### 3.10 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- Migração `20260707212334_comercial_subscricao_real` — enums `Plano`/`EstadoSubscricao`, campos de limite `Int?`, remoção de `Empresa.estadoSubscricao`. Aplicada a `nexa_dev` e `nexa_test`. Duas Empresas de teste residuais de validação visual manual anterior (Passo 14) foram eliminadas antes da migração — nunca dados reais, `estadoSubscricao` nunca lido por nenhum código.
- `apps/api/src/modules/comercial/` — `planos-config.ts` (`PLANOS_CONFIG`, valores aprovados), `subscricao.listener.ts` (`SubscricaoListener`, idempotente via `upsert`), `comercial.controller.ts` (`GET /planos`), `comercial.module.ts`. Registado em `app.module.ts`.
- `QuotaService` (Passo 15) corrigido — distingue "sem `SubscricaoPlano`" de "`SubscricaoPlano` existe, `limiteUsoIA` é `null`" (Decisão B/D7).
- Nova permissão `comercial.ver_planos` — só `admin_empresa`.
- `apps/api/test/comercial.e2e-spec.ts` — 6 testes (T1-T6), incluindo teste dedicado de idempotência (T6).

**Sem descobertas técnicas emergentes além das já identificadas e validadas na própria especificação** — as 6 Decisões a Validar (A-F) e o reforço de idempotência pedido pela Fundadora/CEO cobriram antecipadamente o que, nos passos anteriores, normalmente só surgia durante a implementação.

**Resultados de validação:**
- `apps/api/test/comercial.e2e-spec.ts` — 6 testes (T1-T6), via HTTP real e direto sobre serviço/listener (mesmo padrão de `ia-gateway.e2e-spec.ts`).
- Suite completa: **141/141 testes** (135 herdados + 6 novos).
- `npm run build` (`apps/api`) limpo.

**Exit Criteria T1-T8: todos cumpridos.** Risco R3 do Master Roadmap formalmente resolvido — valores numéricos de limites por plano aprovados e aplicados.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Criação de `SubscricaoPlano` reativa ao `EVENTO_AUDITORIA` já existente, com `tenantContext.run()` (Decisão a Validar A) | Fundação nunca conhece Comercial; primeira utilização em produção de um padrão já validado em testes, sem exigir novo role de BD |
| D2 | Campos de limite `Int?`, `null` = sem limite (Decisão a Validar B) | Evita um valor sentinela mágico que se tornaria uma regra de negócio implícita — pedido explícito da Fundadora/CEO |
| D3 | Trial automático no plano `professional` (Decisão a Validar C) | Suficientemente generoso para demonstrar valor sem oferecer o nível Enterprise gratuitamente |
| D4 | `plano`/`estado` promovidos a `enum` Prisma (Decisão a Validar D) | Mesmo padrão já aplicado a `Papel`/`EstadoProcesso`/`EstadoOportunidade` |
| D5 | `Empresa.estadoSubscricao` removido (Decisão a Validar E) | Nunca usado; `SubscricaoPlano.estado` passa a ser a única fonte de verdade, conforme pedido de centralização |
| D6 | `GET /planos` só para `admin_empresa` (Decisão a Validar F) | Único papel que interage com planos/faturação em qualquer UC aprovado |
| D7 | `QuotaService` corrigido para distinguir "sem subscrição" de "subscrição sem limite" | Sem esta correção, Enterprise ficaria incorretamente limitado a 50/mês assim que `SubscricaoPlano` real existisse |
| D8 | `SubscricaoListener` usa `upsert` (nunca `create`), idempotente por `empresaId` | Exigência explícita da Fundadora/CEO — `EventEmitter2` não garante entrega exatamente uma vez; um replay nunca pode duplicar nem reverter estado já avançado |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `GET /subscricao` (estado atual da própria Empresa — plano, uso, datas) ainda não existe | Necessário para o ecrã do Passo 23; fica para quando esse passo precisar de facto (mesmo raciocínio de adiamento já usado nos Passos 16-18) | CTO, no Passo 23 |
| 2 | Upgrade/downgrade entre planos pagos e cancelamento self-service continuam fora de âmbito do M4 (já resolvido na Proposta do M4, Decisão 6.4) | Nenhum — não bloqueia este passo | Confirmado na Proposta do M4 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da proposta de Especificação Técnica do Passo 19 — sem implementação. Seis Decisões a Validar (A-F): criação reativa da subscrição de trial via evento existente + `tenantContext.run()` (sem novo role de BD nem chamada direta entre módulos), limites `Int?` com `null`=sem limite, plano `professional` para o trial, promoção de `plano`/`estado` a enum, remoção de `Empresa.estadoSubscricao`, `GET /planos` restrito a `admin_empresa`. Inclui correção necessária ao `QuotaService` (Passo 15) para `null`=sem limite. Plano de testes T1-T7 (não executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | **Aprovação da Fundadora/CEO das Decisões A-F, com um pedido explícito adicional:** o `SubscricaoListener` tem de ser idempotente — o mesmo evento nunca pode originar duas subscrições, mesmo em replay/nova tentativa. `SubscricaoListener` (3.3) atualizado de `create` para `upsert` (`update: {}` deliberadamente vazio — nunca reescreve nem reverte estado já avançado); novo teste T6 de idempotência; D8 adicionada. Aprovado — avança para implementação | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-07 | Adicionado §3.10 — Resultado da Implementação, após implementação completa: sem descobertas técnicas emergentes além das já antecipadas. T1-T8 confirmados, 141/141 testes. Risco R3 do Master Roadmap formalmente resolvido | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

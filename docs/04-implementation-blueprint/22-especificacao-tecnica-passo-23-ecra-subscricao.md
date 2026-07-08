# NEXA — Especificação Técnica do Passo 23 (M4): Ecrã de Subscrição (Frontend) — Último Passo do M4

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 23 — `/subscricao` (frontend), `GET /subscricao` (extensão aditiva ao backend) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M4 (Comercial e Pagamentos), Passo 23 — último passo do M4 |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) — Milestone M4 formalmente concluído |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Especificação Técnica do Passo 14/18 (Ecrãs, convenções de frontend) · Especificação Técnica do Passo 19/20/21/22 (`SubscricaoService`) · Use Cases (UC-07, UC-08, US-19) · Information Architecture (nav "Configurações → Empresa", condicionado a Administrador) · ADR-006 §3.7 (nenhuma lógica de RBAC duplicada no frontend) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Implementar o ecrã de subscrição — plano atual, estado (trial/ativa/limitada/cancelada), uso do limite de IA, e upgrade via Stripe Checkout (Passo 21) — dentro da aplicação autenticada. Consome `POST /subscricao/checkout` (Passo 21) e `GET /planos` (Passo 19) já existentes, mais `GET /subscricao`, extensão aditiva ao backend já sinalizada como dependência desde os Passos 20/22. **Último passo do M4** — com este passo aprovado, o Milestone M4 (Comercial e Pagamentos) fica formalmente concluído.

---

## 2. Contexto

Backend do M4 completo desde o Passo 22 (ciclo UC-07 fechado: escolher plano → pagar → subscrição ativa). Falta a superfície visual — sem isto, nenhum Administrador real consegue converter um trial em subscrição paga. Cinco decisões de implementação, nenhuma coberta literalmente pelos passos anteriores, precisam de validação explícita.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **`GET /subscricao` — nova permissão ou reaproveitar `comercial.ver_planos`?** É uma segunda leitura informativa pelo mesmo ator (Administrador), sem ação de escrita. | **Reaproveitar `comercial.ver_planos`** — evita inflacionar a matriz de permissões com uma permissão trivial adicional para outra leitura do mesmo módulo, pelo mesmo papel. |
| B | **Uso mensal de IA (`UsoIAMensal`) — `comercial` duplica a consulta/cálculo de `anoMesAtual()`, ou pede a `ia`?** `QuotaService` (Passo 15) já sabe calcular isto; `UsoIAMensal` é conceptualmente propriedade do módulo `ia`. | **`IaModule` passa a exportar `QuotaService`, com um novo método público `obterUsoAtual(empresaId)`; `ComercialModule` importa `IaModule` e consulta-o** — nunca duplica a lógica de "mês atual" nem a query a `UsoIAMensal`. Primeira vez que `comercial` consome outro módulo de negócio (a direção inversa, `ia → processos`, já está estabelecida desde o Passo 17) — reforça, não contradiz, o princípio já validado de reutilização entre módulos em vez de duplicação. |
| C | **Onde vive o ecrã na navegação.** A Information Architecture já reserva este conteúdo para "Configurações → Empresa (dados, plano, subscrição)" — mas "Configurações" (Perfil, Utilizadores/Permissões, Departamentos) nunca foi construído (excluído deliberadamente do Passo 14, E2) e construí-lo agora seria uma alteração de âmbito não pedida por este passo. | **Item de navegação independente** ("Plano"), mesmo padrão já usado para "Assistente de IA" (Passo 18) — só visível para `admin_empresa` (mesmo padrão do Pipeline/`ver_pipeline`). A secção "Configurações" completa fica registada como trabalho futuro, não construída aqui. |
| D | **Âmbito do aviso a 90% (US-19).** US-19/UC-08 exemplificam com `limiteUtilizadores`/`limiteArmazenamentoMb` — mas nenhum dos dois tem uso realmente contabilizado neste Milestone (Passo 19, Decisão de âmbito: só `limiteUsoIA` ativamente aplicado). | O aviso a 90% aplica-se **só a `limiteUsoIA`** — o único limite com uso real medido. `limiteUtilizadores`/`limiteArmazenamentoMb` aparecem no ecrã como "preparados" (o valor do limite, sem barra de uso, sem aviso) — honesto sobre o que está realmente medido, sem inventar uma percentagem sem significado real. |
| E | **`success_url`/`cancel_url` do Passo 21** apontam para `/dashboard?checkout=sucesso\|cancelado` (placeholder). | Este ecrã lê esses parâmetros de query, se presentes, para mostrar uma mensagem de confirmação/cancelamento ao voltar da Stripe — sem exigir nenhuma alteração ao backend (os parâmetros já existem desde o Passo 21); `success_url`/`cancel_url` podem continuar a apontar para `/dashboard` (mais simples) ou passar a apontar para `/subscricao` diretamente — **decisão de detalhe, não arquitetural**, a confirmar durante a implementação. |

---

## 3. Conteúdo Estruturado

### 3.1 `IaModule` — `QuotaService` Exportado (Decisão B)

```ts
// quota.service.ts — novo método público
async obterUsoAtual(empresaId: string): Promise<number> {
  const anoMes = anoMesAtual();
  const uso = await this.tenantPrisma.client.usoIAMensal.findUnique({ where: { empresaId_anoMes: { empresaId, anoMes } } });
  return uso?.contagem ?? 0;
}
```

`IaModule.exports` passa a incluir `QuotaService` (além de `AiGatewayService`, já exportado desde o Passo 15).

### 3.2 `GET /subscricao` (Decisões A/B)

```
GET /subscricao
→ SessionGuard + PermissaoGuard('comercial', 'ver_planos')
→ devolve: {
    plano, estado (armazenado), estadoEfetivo (SubscricaoService.obterEstadoEfetivo, Passo 20),
    limiteUtilizadores, limiteArmazenamentoMb, limiteUsoIA,
    usoIAMensalAtual (QuotaService.obterUsoAtual, Decisão B),
    trialIniciadoEm, diasRestantesTrial (calculado, só quando estadoEfetivo === 'trial')
  }
```

Nunca devolve `stripeCustomerId`/`stripeSubscriptionId` — identificadores internos sem utilidade para a interface.

### 3.3 Estrutura de Rotas e Navegação (Decisão C)

```
apps/web/src/app/(autenticado)/subscricao/page.tsx
```

`BarraLateralNavegacao` — novo item `{ rotulo: 'Plano', href: '/subscricao', icone: CreditCard }`, condicional a `papel === 'admin_empresa'`.

### 3.4 Ecrã `/subscricao`

- **Cartão "Plano atual"**: nome do plano, `BadgeEstado` para o estado efetivo (`trial`/`ativa`/`limitada`/`cancelada`), dias restantes se em `trial`.
- **Cartão "Uso de IA este mês"**: `usoIAMensalAtual` / `limiteUsoIA` (ou "Ilimitado" se `null`, plano Enterprise); aviso visual (cor) quando `>= 90%` do limite (Decisão D).
- **Cartão "Limites do plano"**: `limiteUtilizadores`/`limiteArmazenamentoMb` mostrados como valor preparado, sem barra de uso (Decisão D).
- **Secção de upgrade**: só visível quando `estadoEfetivo !== 'ativa'` (evita um clique que resultaria sempre em `409`, Passo 21, Decisão D) — lista de planos (`GET /planos`) com botão "Escolher" por plano, chama `POST /subscricao/checkout`, redireciona (`window.location.href = url`) para a Stripe.
- **Mensagem de confirmação/cancelamento** (Decisão E) — lida de `?checkout=sucesso|cancelado` na URL, se presente.

### 3.5 Tratamento de Erros

Mesmo padrão já estabelecido desde o Passo 14 — `403` (acesso direto por URL por um papel sem `ver_planos`) tratado com mensagem, nunca crash; `409` de `POST /subscricao/checkout` (já `ativa`, ex: condição de corrida) tratado com mensagem, nunca crash.

### 3.6 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-006 §3.7 | ✅ `papel` só oculta o item de navegação; a API continua a decidir (`ver_planos`) |
| System Design Principles, regra #1 | ✅ `comercial` consome `QuotaService` via interface explícita, nunca duplica a query a `UsoIAMensal` |
| Information Architecture | ✅ Conteúdo alinhado com "Configurações → Empresa"; posição exata (item independente vs. secção completa) registada como decisão consciente de âmbito |
| US-19/UC-08 | ✅ Aviso a 90% implementado para o único limite com uso real medido |

**Nenhum novo ADR necessário.**

### 3.7 Critérios de Aceitação e Exit Criteria (planeados)

**Backend (`GET /subscricao`, extensão aditiva):**

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` obtém `estadoEfetivo`/`limites`/`usoIAMensalAtual` corretos | HTTP real |
| T2 | `gestor`/`colaborador`/`convidado` recebem `403` | HTTP real |
| T3 | `QuotaService.obterUsoAtual` devolve a contagem correta do mês atual | Direto sobre o serviço (mesmo padrão já usado no Passo 15/16) |
| T4 | Regressão completa — todos os testes herdados (166) continuam a passar | `npm run test:e2e` |
| T5 | `npm run build`/`npm run lint` (`apps/api`) sem erros | build/lint limpos |

**Frontend (validação visual real no browser, obrigatória para passos de frontend):**

| # | Cenário | Resultado esperado |
|---|---|---|
| V1 | `admin_empresa` vê o item "Plano"; `gestor`/`colaborador`/`convidado` não | Inspeção visual |
| V2 | Ecrã mostra plano/estado/dias de trial corretamente | Inspeção visual |
| V3 | Uso de IA mostrado corretamente, aviso visual a partir de 90% | Inspeção visual (forçar um cenário de uso elevado via fixture) |
| V4 | Fluxo de upgrade completo até ao redirecionamento para a Stripe (URL de teste) | Inspeção visual/rede |
| V5 | Secção de upgrade ausente quando já `ativa` | Inspeção visual |
| V6 | Acesso direto por URL por `colaborador` → mensagem, nunca crash | Inspeção visual, `fetch` direto |
| V7 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual |
| V8 | `npm run build`/`npm run lint` (`apps/web`) sem erros | build/lint limpos |

**Exit Criteria:** T1-T5 confirmados por teste automatizado; V1-V8 confirmados por validação visual real no browser. Com este passo, o **Milestone M4 (Comercial e Pagamentos) fica formalmente concluído**.

---

### 3.8 Resultado da Implementação (2026-07-08)

Na aprovação deste passo, a Fundadora/CEO acrescentou três requisitos de validação explícitos, além das 5 Decisões A-E: (1) os dados apresentados no frontend têm de refletir exatamente o estado devolvido pela API, sem cálculos paralelos no cliente; (2) toda ação de upgrade usa exclusivamente o fluxo de checkout já implementado (Passo 21), sem lógica duplicada; (3) estados de carregamento/erro/vazio consistentes com o Design System.

O requisito (1) levou a um refinamento face ao esboço original de `GET /subscricao` em 3.2: a resposta passou a incluir também `usoIAPercentagem` (`number | null`, `null` quando `limiteUsoIA` é `null`) e `avisoLimiteIAProximo` (`boolean`, `true` quando `usoIAPercentagem >= 90`) — ambos calculados em `SubscricaoService.obterResumoSubscricao()`, nunca no frontend. Sem isto, o cálculo da percentagem/aviso teria de existir no cliente, contrariando diretamente o requisito da CEO. Não é uma alteração de âmbito — é a implementação literal do que já estava proposto em 3.4/Decisão D, apenas com o local do cálculo tornado explícito.

**Backend:**

| # | Cenário | Resultado |
|---|---|---|
| T1 | `admin_empresa` obtém `estadoEfetivo`/limites/`usoIAMensalAtual`/`diasRestantesTrial` corretos para uma subscrição em trial | ✅ Passou |
| T2 | `gestor`/`colaborador`/`convidado` recebem `403` em `GET /subscricao` | ✅ Passou |
| T3 | `usoIAPercentagem`/`avisoLimiteIAProximo` refletem o uso real; aviso ativa a partir de 90% | ✅ Passou |
| T4 | Plano Enterprise (`limiteUsoIA: null`) nunca aciona aviso; `usoIAPercentagem` é `null` | ✅ Passou |
| T5 | Trial expirado (>14 dias) devolve `estadoEfetivo: 'limitada'`, `diasRestantesTrial: null` | ✅ Passou |
| T6 (regressão) | Suite completa — 166 herdados + 5 novos | ✅ 171/171 |
| T7 | `npm run build` (`apps/api`) sem erros | ✅ Limpo |

`apps/api/test/comercial-subscricao-resumo.e2e-spec.ts` — novo ficheiro, 5 testes, mesmo padrão HTTP real já usado em `comercial.e2e-spec.ts`.

**Frontend (validação visual real no browser, `apps/web` a correr contra a API real em `nexa_dev`):**

| # | Cenário | Resultado |
|---|---|---|
| V1 | `admin_empresa` vê o item "Plano" na navegação; `colaborador` não vê (nem o link, nem consegue navegar) | ✅ Confirmado |
| V2 | Ecrã mostra plano (Professional), estado (`Em Trial`/`Ativa`), 14 dias restantes em trial, ausentes quando `ativa` | ✅ Confirmado |
| V3 | Uso de IA (180/200) e aviso "Estás perto do limite mensal de uso de IA (90%)" mostrados corretamente, dados manipulados diretamente na BD para simular o cenário | ✅ Confirmado |
| V4 | `POST /subscricao/checkout` chamado corretamente ao clicar "Escolher"; erro tratado com mensagem (sem Price ID de teste configurado neste ambiente local, `400` esperado e tratado, nunca crash) — fluxo usa exclusivamente o endpoint do Passo 21, nenhuma lógica duplicada | ✅ Confirmado (redirecionamento real para a Stripe não testável sem credenciais de teste reais, fora do âmbito deste ambiente) |
| V5 | Secção "Fazer upgrade" ausente quando `estadoEfetivo === 'ativa'` | ✅ Confirmado |
| V6 | Acesso direto por URL por `colaborador` → mensagem "Não tens permissão para ver o Plano da Empresa.", nunca crash | ✅ Confirmado |
| V7 | Responsivo sem quebras em 375px (mobile)/768px (tablet)/1280px (desktop) | ✅ Confirmado |
| V8 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola durante toda a validação | ✅ Confirmado |

**`BadgeEstado`** (Passo 13) estendido de forma aditiva com os 4 valores de `EstadoSubscricao` (`trial`/`ativa`/`limitada`/`cancelada`) — mesmo componente partilhado, nenhuma duplicação.

**Sem descobertas técnicas emergentes que alterassem arquitetura ou âmbito** — o único ajuste (`usoIAPercentagem`/`avisoLimiteIAProximo` no backend) foi a implementação direta de um requisito explícito da própria aprovação, não uma descoberta durante a implementação.

**Milestone M4 (Comercial e Pagamentos) formalmente concluído** — Passos 19 a 23 implementados, validados e aprovados.

---

## 4. Decisões Tomadas (propostas — pendentes de aprovação)

| # | Decisão | Justificação |
|---|---|---|
| D1 | `GET /subscricao` reaproveita `comercial.ver_planos` (Decisão a Validar A) | Evita permissão trivial adicional para outra leitura do mesmo módulo |
| D2 | `QuotaService` exportado por `IaModule`, `comercial` consome-o para uso de IA (Decisão a Validar B) | Reforça single source of truth; evita duplicar a lógica de `anoMesAtual`/consulta a `UsoIAMensal` |
| D3 | Item de navegação independente "Plano", sem construir "Configurações" completa (Decisão a Validar C) | Evita alteração de âmbito não pedida por este passo |
| D4 | Aviso a 90% só para `limiteUsoIA` (Decisão a Validar D) | Único limite com uso real medido neste Milestone |
| D5 | `success_url`/`cancel_url` — decisão de detalhe, não arquitetural (Decisão a Validar E) | Ajustável sem alterar o backend |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Secção "Configurações" completa (Perfil, Utilizadores/Permissões, Departamentos) continua por construir | Trabalho futuro, fora do âmbito do M4 | CEO + CTO, milestone futuro |
| 2 | Upgrade/downgrade entre planos pagos e cancelamento self-service continuam fora de âmbito (já resolvido na Proposta do M4, Decisão 6.4) | Nenhum — não bloqueia este passo | Confirmado na Proposta do M4 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 23 — sem implementação. Cinco Decisões a Validar (A-E): `GET /subscricao` reaproveita `comercial.ver_planos`, `QuotaService` exportado por `IaModule` e consumido por `comercial` (evita duplicar lógica de uso de IA), item de navegação independente sem construir "Configurações" completa, aviso a 90% só para `limiteUsoIA`, `success_url`/`cancel_url` como decisão de detalhe. Plano de testes backend T1-T5 e validação visual V1-V8 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado com 3 requisitos de validação adicionais da Fundadora/CEO (sem cálculos paralelos no cliente, upgrade exclusivamente via checkout já implementado, estados de carregamento/erro/vazio consistentes com o Design System). Implementado: `QuotaService.obterUsoAtual`, `GET /subscricao` (com `usoIAPercentagem`/`avisoLimiteIAProximo` calculados no backend), item de navegação "Plano", `apps/web/.../subscricao/page.tsx`, `BadgeEstado` estendido. Testes backend 5/5 novos (171/171 com regressão), validação visual V1-V8 confirmada no browser. Resultados completos em §3.8. **Milestone M4 formalmente concluído.** | CTO / Arquiteto Principal (Claude) |

# NEXA — Especificação Técnica do Passo 12 (M2): Dashboard Inteligente

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 12 — Dashboard (Agregação Read-Only) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 12 — último passo de backend do M2 antes do frontend (Passos 13-14) |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-11 a FR-13, FR-36 · Functional Specifications v1.1 (3.2) · Information Architecture v1.1 (3.3) · NFR-02, NFR-04 · Especificações Técnicas dos Passos 9, 10, 11 · Blueprint v2.2 · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o módulo Dashboard — agregação read-only sobre Processos, CRM e Notificações (FR-11 a FR-13), "sem entidade própria" (Functional Specifications, 3.2). Terceira reutilização da visibilidade centralizada (Decisão B do M2) e primeiro consumidor real da tabela `Notificacao` (Passo 11, escrita sem via de leitura até agora).

---

## 2. Contexto

Nenhum modelo novo — o Dashboard só lê `Processo`, `Cliente` e `Notificacao`, já completos desde os Passos 2/9/10/11. É o último passo de backend do M2 antes dos passos de frontend (13, Design System; 14, Ecrãs).

### 2.1 Decisão Já Herdada do Passo 11

O Passo 11 (2.1.B desse documento) já decidiu explicitamente que "a exposição [de Notificações] ao Utilizador fica para o Passo 12 (Dashboard)" — por isso este passo inclui `GET /notificacoes` e `PATCH /notificacoes/:id/lida`, não como uma nova decisão de âmbito, mas como a continuação de uma já tomada.

---

## 3. Conteúdo Estruturado

### 3.1 Módulo e Localização

`apps/api/src/modules/dashboard/` — terceiro módulo de negócio fora da Fundação (depois de Processos e CRM), mesma estrutura (`imports: [FundacaoModule]`).

### 3.2 Indicadores Agregados (FR-11)

```json
{
  "processos": {
    "total": 12,
    "porEstado": { "por_fazer": 5, "em_curso": 4, "concluida": 3 },
    "emAtraso": 2
  },
  "clientes": {
    "total": 8,
    "comOportunidadeAtiva": 3
  },
  "notificacoes": {
    "naoLidas": 4
  }
}
```

- `processos.emAtraso`: `prazo < agora` e `estado ≠ concluida` — o exemplo literal de FR-11 ("tarefas em atraso").
- `clientes.comOportunidadeAtiva`: `estadoOportunidade IN (prospecao, negociacao)` — não conta `fechada_ganha`/`fechada_perdida`.
- `notificacoes.naoLidas`: `lida = false`, `destinatarioId = utilizador atual`.

Todos os três blocos aplicam **o mesmo `obterEscopoVisibilidade`** já usado em `GET /processos` e `GET /clientes` (Passos 9/10) — nenhuma lógica de visibilidade nova; `notificacoes.naoLidas` é sempre pessoal (`destinatarioId` do próprio, sem escopo adicional, já que uma Notificação só existe para o seu destinatário).

### 3.3 Estado Inicial Guiado (FR-12, Information Architecture §3.3)

Se, dentro do escopo de visibilidade do Utilizador, `processos.total === 0 && clientes.total === 0`, a resposta substitui os indicadores por uma sugestão de ação:

```json
{
  "estadoInicial": true,
  "sugestoes": [
    { "acao": "criar_processo", "modulo": "processos" },
    { "acao": "criar_cliente", "modulo": "crm" }
  ]
}
```

Mesma distinção de 3 estados já formalizada no Data Model Conceptual (§3.5: "não existe" / "existe vazia" / "existe com dados") — aqui aplicada ao nível do Dashboard como um todo, não a uma entidade isolada.

### 3.4 Notificações — Exposição ao Utilizador (herdado do Passo 11, 2.1)

| Endpoint | Comportamento |
|---|---|
| `GET /notificacoes` | Lista as Notificações do próprio Utilizador (`destinatarioId = ctx.utilizadorId`), paginada (`take`/`skip`), mais recentes primeiro; filtro opcional `?lida=false`. |
| `PATCH /notificacoes/:id/lida` | Marca uma Notificação como lida (`lida: true`) — só se `destinatarioId === ctx.utilizadorId` (nunca a de outro Utilizador, mesmo dentro da mesma Empresa). |

### 3.5 Matriz de Permissões — Módulo `dashboard`

Tudo pessoal e já filtrado pelo próprio mecanismo de visibilidade — sem restrição adicional por papel (mesmo `convidado` vê o seu Dashboard, com os números naturalmente reduzidos pelo escopo `partilhado`).

| Ação | admin_empresa | gestor | colaborador | convidado |
|---|---|---|---|---|
| `ver` | true | true | true | true |
| `marcar_lida` | true | true | true | true |

### 3.6 Superfície de API

| Método | Rota | Ação | Autoridade adicional (serviço) |
|---|---|---|---|
| `GET` | `/dashboard` | `dashboard.ver` | `obterEscopoVisibilidade('processo')` + `('cliente')` |
| `GET` | `/notificacoes` | `dashboard.ver` | Sempre `destinatarioId = ctx.utilizadorId` |
| `PATCH` | `/notificacoes/:id/lida` | `dashboard.marcar_lida` | `destinatarioId === ctx.utilizadorId`, senão `404` |

### 3.7 Sincronização (NFR-04, já resolvido — não uma decisão nova)

`GET /dashboard` é síncrono/imediato — a "sincronização periódica, atraso máximo 30s" (NFR-04) é responsabilidade do **frontend** (Passo 14, polling), não deste endpoint. Este passo só garante que o endpoint responde rápido o suficiente (NFR-02, <2s) para suportar polling frequente sem sobrecarga.

### 3.8 Auditoria

| `acao` | `entidade` | `detalhe` |
|---|---|---|
| `atualizar` | `Notificacao` | `{ alteracoes: { lida: { anterior: false, novo: true } } }` |

`GET /dashboard` e `GET /notificacoes` são leituras — sem auditoria (mesma disciplina já aplicada a todos os `GET` desde o Passo 6, só ações de escrita são auditadas).

### 3.9 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-11 a FR-13 | ✅ Indicadores agregados, estado inicial guiado, escopo RBAC |
| FR-36 | ✅ Notificações finalmente expostas ao Utilizador (Passo 11 só escrevia) |
| Data Model Conceptual (3.2) | ✅ Dashboard confirmado "sem entidade própria" |
| NFR-02, NFR-04 | ✅ Sem alteração — responsabilidade de resposta rápida (backend) e polling (frontend, Passo 14) já divididas corretamente |

**Nenhum novo ADR necessário. Nenhuma migração de schema necessária.**

**Terceira confirmação prática da Decisão B do M2:** nenhuma alteração ao `AuthorizationService` — mesma reutilização já validada nos Passos 9 e 10.

### 3.10 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `GET /dashboard` devolve indicadores corretos (processos por estado, em atraso, clientes, oportunidades ativas, notificações não lidas) | ✅ |
| T2 | `GET /dashboard` aplica o escopo RBAC (admin todas; gestor do Departamento; colaborador as suas; convidado só partilhadas) | ✅ |
| T3 | Empresa sem Processos nem Clientes recebe `estadoInicial: true` com sugestões | ✅ |
| T4 | `GET /notificacoes` lista só as do próprio Utilizador | ✅ |
| T5 | `PATCH /notificacoes/:id/lida` marca como lida | ✅ |
| T6 | `PATCH /notificacoes/:id/lida` numa Notificação de outro Utilizador | `404` |
| T7 | Isolamento entre tenants (Notificação/indicadores de uma Empresa nunca visíveis a partir doutra) | ✅ |
| T8 | Auditoria regista `atualizar`/`Notificacao` ao marcar como lida | ✅ |
| Regressão | Testes automatizados dos Passos 4-11 continuam a passar | ✅ |

**Exit Criteria:** T1-T8 e regressão passam; `npm run build` sem erros; nenhuma alteração ao `AuthorizationService`; `GET /dashboard`/`GET /notificacoes` sem escrita de auditoria (só leitura).

### 3.11 Resultado da Implementação e Evidências de Validação

**Entregáveis:** novo módulo `apps/api/src/modules/dashboard/` (`dashboard.service.ts` com os indicadores, estado inicial guiado e gestão de Notificações; `dashboard.controller.ts`), registado em `AppModule`; nova entrada `dashboard` na `DEFAULT_PERMISSION_MATRIX`. **Sem migração de schema, sem alteração ao `AuthorizationService`** — confirmado, terceira reutilização integral de `obterEscopoVisibilidade`.

**Sem descobertas técnicas emergentes durante a implementação** — passo direto, sem correções de arquitetura a meio.

**Resultados dos testes (Jest, `nexa_test`, 102/102, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T8 (este passo) | ✅ Todos |
| Regressão (Passos 4-11, 94 testes) | ✅ Sem alteração de comportamento |

Suite completa confirmada estável, sem nenhum erro de log, em 3 execuções consecutivas.

**`npm run build` / `eslint`:** ✅ sem erros (1 erro de `no-unused-vars` corrigido antes do resultado final).

**Exit Criteria do Passo 12: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Ver 2.1 — exposição de Notificações herdada do Passo 11, não uma nova decisão de âmbito | O próprio Passo 11 já a atribuiu explicitamente a este passo |
| D2 | Indicadores agregados: `processos` (total, por estado, em atraso), `clientes` (total, com oportunidade ativa), `notificacoes` (não lidas) | Cobre literalmente os exemplos de FR-11 ("tarefas em atraso, clientes ativos") sem inventar indicadores adicionais não pedidos |
| D3 | Estado inicial guiado acionado quando `processos.total === 0 && clientes.total === 0` | Mesma distinção de 3 estados já formalizada no Data Model Conceptual (§3.5) |
| D4 | `PATCH /notificacoes/:id/lida` é auditado, `GET`s não | Mesma disciplina já aplicada desde o Passo 6 — só ações de escrita são auditadas |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Nenhuma questão nova identificada neste passo | — | — |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 12, incorporando a decisão já herdada do Passo 11 (exposição de Notificações): indicadores agregados, estado inicial guiado, `GET /notificacoes`/`PATCH .../lida`, matriz de permissões do módulo `dashboard`, auditoria, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-07 | Adicionada a secção 3.11 (Resultado da Implementação e Evidências de Validação) com 102/102 testes reais (8 novos deste passo + regressão completa de 94 testes dos Passos 4-11), estáveis e sem erros de log em 3 execuções consecutivas; sem descobertas técnicas emergentes durante a implementação | CTO (Claude) |
| 1.2 | 2026-07-07 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 12 na íntegra | Fundadora/CEO |

# NEXA — Validação Manual UC-05 + UC-06 (Passo 36, M6)

| | |
|---|---|
| **Documento** | Registo de validação manual — UC-05 (Consultar o Assistente de IA) e UC-06 (Receber e Confirmar uma Sugestão da IA) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases), Passo 36 — quinto passo do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído (2026-07-11) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-05, UC-06; FR-23, FR-24, FR-25, FR-26, FR-28; RN-07, RN-08; Proposta do Milestone M6 |
| **Última atualização** | 2026-07-11 |

---

## 1. Método

Validação real no browser + API — Empresa de demonstração criada via API (`Validacao UC05 UC06 Lda`, mesmo padrão dos Passos 34/35). Para UC-06, foram necessários fixtures adicionais: um Departamento, dois Colaboradores (criados via aceitação real de `ConviteUtilizador` inserido diretamente na BD, mesmo mecanismo já usado nos Passos 31/34 para contornar a ausência de `RESEND_API_KEY`) e quatro Processos em atraso, todos atribuídos ao Colaborador com maior carga, para que a heurística determinística (Passo 17) sugerisse consistentemente a reatribuição ao Colaborador com menor carga. Estado confirmado por leitura direta da BD (incluindo o Registo de Auditoria) e por respostas HTTP reais em cada passo relevante. Empresa de teste eliminada no fim da validação.

---

## 2. UC-05 — Consultar o Assistente de IA

| Item | Resultado |
|---|---|
| Pré-condição (Utilizador autenticado, com pelo menos uma entidade visível no seu escopo) | ✅ Confirmado |
| Fluxo Principal 1 (colocar pergunta) | ✅ Formulário "Perguntar" em `/ia` |
| Fluxo Principal 2 (resolução só com base no escopo RBAC) | ✅ Coberto por teste automatizado dedicado (T2, `ia-perguntar.e2e-spec.ts`, Passo 16) — inspeciona o `AIRequest` real recebido pelo `FakeAdapter`, prova estrutural de que dados fora do escopo nunca chegam ao Gateway; não repetido ao vivo nesta validação por não existir credencial real do fornecedor neste ambiente (nota de âmbito já registada desde o Passo 18) |
| Fluxo Principal 3 (processamento via AI Gateway) | ✅ `POST /ia/perguntar` disparado corretamente, atravessa `AiGatewayService` → `AnthropicAdapter` |
| Fluxo Principal 4 (resposta apresentada) | ⚠️ Ver Achado A (caminho de sucesso não observável neste ambiente, já coberto por teste automatizado) |
| Fluxo Principal 5 (registo no Registo de Auditoria, FR-28) | ✅ Confirmado na BD — ver abaixo |
| Alternativo 2a (pergunta sobre entidade fora do escopo) | ✅ Mesma cobertura do Fluxo Principal 2 (T2) — RN-07 é estrutural (o dado nunca é reunido), logo nunca pode ser revelado, direta ou indiretamente |
| Exceção E1 (fornecedor de IA indisponível) | ✅ Confirmado ao vivo — ver abaixo |
| RN-07 (nunca revelar dados fora do escopo, direta ou indiretamente) | ✅ Estrutural, T2 |

### Confirmação ao vivo da Exceção E1 e do Fluxo Principal 5 (FR-28)

Sem `ANTHROPIC_API_KEY` real neste ambiente (decisão já aprovada desde o M3), `POST /ia/perguntar` devolveu `502 Bad Gateway` de forma consistente — exercitando naturalmente a Exceção E1. A interface reagiu exatamente como especificado: mensagem clara "Não foi possível obter resposta do Assistente de IA.", sem nenhum detalhe técnico do erro exposto, o texto da pergunta permaneceu na caixa de texto (facilita nova tentativa), zero erros de consola.

Confirmado na BD que o Registo de Auditoria capturou a interação (FR-28), com dois eventos distintos correlacionados pelo mesmo `requestId`, entidade `InteracaoIA` (nunca `SugestaoIA` — essa só é criada em caso de sucesso, Passo 16):

```
acao: "pergunta_iniciada", entidadeId: "1de87359-...", timestamp: 11:26:33.097Z
acao: "pergunta_falhou",   entidadeId: "1de87359-...", timestamp: 11:26:33.107Z, detalhe: { tipoErro: "ErroGenericoFornecedorError" }
```

### Achado A — Caminho de sucesso da pergunta não observável neste ambiente (limitação já conhecida, não um achado novo)

Mesma nota de âmbito honesta já registada no Passo 18: sem credencial real do fornecedor Anthropic, o caminho de resposta bem-sucedida não pode ser observado visualmente. Não é um achado novo — o caminho de sucesso já está coberto por teste automatizado (T1, `ia-perguntar.e2e-spec.ts`) desde o Passo 16.

---

## 3. UC-06 — Receber e Confirmar uma Sugestão da IA

| Item | Resultado |
|---|---|
| Pré-condição (IA identificou situação relevante no escopo do Utilizador) | ✅ 4 Processos em atraso criados como fixture, heurística determinística (Passo 17) detetou todos |
| Fluxo Principal 1 (sugestão apresentada com contexto suficiente) | ✅ "Processo 'X' está atrasado. Sugerimos reatribuir a Colaborador B UC0506, que tem atualmente menos Processos em atraso no Departamento." |
| Fluxo Principal 2 (Utilizador avalia) | ✅ |
| Fluxo Principal 3 (Utilizador confirma) | ✅ `Modal` de segunda confirmação ("Confirmar sugestão" → "Confirmar Reatribuição") antes de qualquer execução — RN-08 refletida na interface |
| Fluxo Principal 4 (sistema executa a ação sugerida) | ✅ Confirmado na BD — `Processo.responsavelId` mudou do Colaborador A para o Colaborador B sugerido |
| Fluxo Principal 5 (auditoria dupla — sugestão + execução, distinguindo autor humano de origem IA) | ✅ Confirmado na BD — ver abaixo |
| Alternativo 3a (rejeitar) | ✅ `SugestaoIA.estado` → `rejeitada`; `Processo.responsavelId` inalterado (continuou com o Colaborador A); evento de auditoria `rejeitar` registado |
| Alternativo 3b (ignorar sem responder) | ✅ Sugestão "Deixar pendente" permaneceu com `estado: pendente`, visível na área "Sugestões Pendentes" sem qualquer ação do sistema |
| Exceção E1 (ação já não válida — ex: Processo alterado por outra via antes da confirmação) | ✅ Confirmado ao vivo — ver abaixo |
| RN-08 (nunca "aceitar todas" em lote; confirmação explícita e individual) | ✅ Confirmado estruturalmente — nenhum botão/endpoint de confirmação em lote existe em toda a base de código (`grep` sem resultados em `apps/api/src/modules/ia` e `apps/web/src/app/(autenticado)/ia`); cada sugestão exige o seu próprio `Modal` de confirmação |

### Confirmação ao vivo do Fluxo Principal 4/5 (execução + auditoria dupla)

Confirmação da sugestão "Tarefa atrasada UC06 - Confirmar" via `Modal` real (`POST /ia/sugestoes/:id/confirmar → 201`). Confirmado na BD:

- `Processo.responsavelId`: mudou de Colaborador A para Colaborador B (o sugerido) — reatribuição real executada, não simulada.
- `SugestaoIA.estado`: `aceite`.
- Registo de Auditoria — **dois eventos distintos**, exatamente como o Fluxo Principal 5 e RN-08 (via Event & Notification Architecture Rules §3.8) exigem: um em `entidade: SugestaoIA, acao: confirmar` (autor: o Utilizador humano que confirmou) e outro, completamente separado, em `entidade: Processo, acao: atualizar, detalhe.alteracoes.responsavelId` (a execução em si) — nunca um único evento amalgamado, distinguindo claramente a decisão humana da execução.

### Confirmação ao vivo da Exceção E1 (staleness)

Antes de confirmar a sugestão "Tarefa atrasada UC06 - Staleness", o Processo associado foi alterado por outra via (`PATCH /processos/:id`, `estado: concluida`) — simulando exatamente o cenário do UC-06 ("a tarefa já foi concluída por outra via"). Ao tentar confirmar essa sugestão já desatualizada:

- `POST /ia/sugestoes/:id/confirmar → 409 Conflict`.
- Interface reagiu com a mensagem "Esta sugestão já não é válida — foi atualizada entretanto." — informa claramente, sem executar a ação de forma inconsistente, exatamente como a Exceção E1 exige. Zero crash.
- Confirmado na BD que `SugestaoIA.estado` permaneceu `pendente` (nunca `aceite`) e que o `Processo` não sofreu nenhuma alteração adicional além da que já tinha sido feita manualmente — a revalidação (Decisão E, Passo 17) impediu a execução da ação obsoleta.

### Nota — divergência textual menor face ao UC-06 (não um achado novo)

O Fluxo Alternativo 3b do UC-06 já regista explicitamente, no próprio texto do Use Case, que "não expira automaticamente nesta fase (comportamento de expiração não definido — ver Questão em Aberto, Q1)" — comportamento confirmado nesta validação (a sugestão "Deixar pendente" nunca expirou nem foi removida da lista). Não é um achado novo, é uma confirmação do texto já existente.

---

## 4. Bugs Encontrados

**Nenhum.** Zero erros de consola durante toda a sessão de validação. Todos os fluxos, incluindo os dois casos de exceção testados ao vivo (UC-05 E1, UC-06 E1) e a auditoria dupla do UC-06, comportaram-se exatamente como documentado, sem crashes.

---

## 5. Conclusão

UC-05 e UC-06 validados manualmente pelo menos uma vez, com registo escrito de cada pré-condição, fluxo, alternativa, exceção e regra de negócio, confirmados no sistema real (nunca apenas assumidos) — critério de conclusão do M6 cumprido para estes dois Use Cases. UC-06 foi validado com maior profundidade do que os passos anteriores por ser 100% determinístico na geração (decisão do Passo 17), permitindo cobertura completa dos 4 desfechos possíveis de uma sugestão (confirmar, rejeitar, deixar pendente, staleness) sem qualquer dependência de credencial de IA real. Um único achado registado (Achado A), já uma limitação conhecida e reconfirmada, não um achado novo — nenhum bloqueante para o encerramento deste passo.

**Passo 36 concluído.**

# NEXA — Especificação Técnica do Passo 16 (M3): Módulo `ia` — Pergunta Livre (UC-05)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 16 — `POST /ia/perguntar` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M3 (Assistente de IA), Passo 16 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Especificação Técnica do Passo 15 (AI Gateway) v1.1 · Use Cases (UC-05, RN-07) · Functional Requirements (FR-23, FR-24, FR-26, FR-28) · Functional Specifications §3.5 · Data Model Conceptual §3.2 · Product & Security Decisions Register (PSD-003) · Information Architecture §3.4 (RBAC por área) · NFR-17 |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Implementar a pergunta livre ao Assistente de IA (UC-05, FR-23/FR-24) — `POST /ia/perguntar` — consumindo o `AiGatewayService` já construído e aprovado no Passo 15, com contexto operacional reunido e filtrado pelo escopo RBAC do Utilizador **antes** de chegar ao Gateway (ADR-005 §3.3 ponto 1), e persistindo cada interação em `SugestaoIA` com o mecanismo de retenção de conteúdo já aprovado (PSD-003). Este é o primeiro endpoint de produto do M3, e a primeira cobertura de teste automatizado do 4º e último fluxo crítico obrigatório (NFR-17, "ações de IA" — a metade "pergunta"; a metade "sugestão/confirmação" fica para o Passo 17).

---

## 2. Contexto

O Passo 15 entregou o AI Gateway completo (interface neutra, adaptador Anthropic, quota, circuit breaker, timeout) sem nenhum endpoint de produto. Este passo constrói o primeiro consumidor real. Três decisões emergentes, nenhuma coberta literalmente pela documentação existente, precisam de validação explícita antes de implementar (2.1) — nenhuma foi assumida sozinha.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Reutilização da lógica de "escopo → filtro `where`" do Dashboard.** `DashboardService` (Passo 12) já traduz `AuthorizationService.obterEscopoVisibilidade(...)` num filtro Prisma (`construirWhereProcesso`/`construirWhereCliente`/`aplicarEscopo`), mas como métodos **privados** — o módulo `ia` precisa exatamente da mesma tradução para reunir o resumo operacional (3.3), e duplicá-la seria repetir lógica de visibilidade RBAC fora do único ponto centralizado (contradiz a Decisão B do M2, já confirmada 3 vezes sem duplicação). | **Extrair para `AuthorizationService.construirFiltroWhere(entidadeTipo, camposEscopo)`** — mesmo padrão já usado no Passo 9, quando a lógica de visibilidade privada do `PartilhaService` foi extraída para `AuthorizationService` e reutilizada sem alterar o comportamento (confirmado pelos testes de Partilha, na altura, sem qualquer alteração ao ficheiro de teste). `DashboardService` passa a consumir o método extraído — refactor comportamentalmente neutro, validado pelos 8 testes já existentes do Dashboard. |
| B | **Retenção de conteúdo (PSD-003, já aprovada em princípio — falta o mecanismo concreto).** A decisão aprovada foi "metadados sempre + conteúdo completo por retenção temporária, configurável, podendo desativar". Não existe hoje nenhuma infraestrutura de tarefas agendadas (cron/scheduler) no projeto — introduzi-la agora seria decisão de infraestrutura prematura (mesmo raciocínio já usado no ADR-005 §3.9a para o volume de auditoria). | **Sem purga física nesta fase.** `IA_RETER_CONTEUDO` (booleano, `env`) controla se o conteúdo é escrito a criar a `SugestaoIA` — se `false`, `conteudoPergunta`/`conteudoResposta` ficam sempre `null`, só metadados. `IA_RETENCAO_CONTEUDO_DIAS` (`env`, ex: 60) — o conteúdo, mesmo armazenado, **nunca é devolvido pela API** se `createdAt` exceder essa janela (ocultação no momento da leitura, não da escrita) — cumpre a intenção de retenção sem exigir um scheduler. Purga física (`DELETE` do conteúdo antigo) fica registada como trabalho futuro, condicionado a existir infraestrutura de tarefas agendadas (Questão em Aberto 2). |
| C | **Âmbito da "pergunta livre" no MVP.** UC-05 não define que dados exatamente entram no contexto da IA. As 6 perguntas canónicas (Product Vision §3.5a) são maioritariamente perguntas agregadas ("o que está atrasado", "que cliente arrisca abandono"), não perguntas sobre uma entidade nomeada específica. | **Contexto = resumo agregado** (Processos por estado/atraso, Clientes/Pipeline por oportunidade — mesmos agregados já computados pelo Dashboard, Decisão A). **Sem lookup de uma entidade nomeada específica** (ex: "o que sabes sobre o Cliente X") nesta fase — exigiria alguma forma de deteção/extração de entidade no texto da pergunta, complexidade não pedida por nenhum FR ainda. Nota honesta: com só o resumo agregado, algumas das 6 perguntas canónicas (ex: "que tarefas posso automatizar hoje") terão respostas mais fracas do que outras (ex: "o que está atrasado") — registado como Questão em Aberto 3, não escondido. |

---

## 3. Conteúdo Estruturado

### 3.1 Extensão do Schema `SugestaoIA`

```prisma
model SugestaoIA {
  // ... campos existentes desde o Passo 2 ...
  conteudoPergunta  String?   // null se IA_RETER_CONTEUDO=false (Decisão B)
  conteudoResposta  String?   // idem
}
```

Aditivo, sem alterar nenhum campo existente. `estado` (já existente: `pendente | aceite | rejeitada`) ganha uma semântica explícita para `tipo='pergunta'` — nunca fica `pendente` (não há confirmação humana pendente para uma pergunta-resposta, ao contrário de uma sugestão de ação, Passo 17): é sempre criada já como `aceite`, assim que a resposta é devolvida. `entidadeRef` fica `null` para perguntas (Decisão C — sem entidade nomeada específica nesta fase).

### 3.2 `AuthorizationService.construirFiltroWhere` (extração, Decisão A)

```ts
construirFiltroWhere(
  escopo: EscopoVisibilidade,
  campoDepartamento: string,
  campoResponsavel: string,
): Record<string, unknown> {
  if (escopo.tipo === 'departamento') return { [campoDepartamento]: escopo.departamentoId };
  if (escopo.tipo === 'proprio') return { [campoResponsavel]: escopo.utilizadorId };
  if (escopo.tipo === 'partilhado') return { id: { in: escopo.entidadeIds } };
  return {}; // 'total' — sem filtro adicional além do isolamento de tenant (Camada 1)
}
```

`DashboardService.aplicarEscopo` (privado, Passo 12) é removido, substituído por uma chamada a este método — `construirWhereProcesso`/`construirWhereCliente` do Dashboard passam a delegar aqui. Zero alteração de comportamento (os 8 testes de Dashboard já existentes confirmam isto sem alteração ao próprio ficheiro de teste, mesmo padrão de validação já usado no Passo 9).

### 3.3 Resumo Operacional (contexto da IA, Decisão C)

`IaService.reunirResumoOperacional()` — usa `AuthorizationService.obterEscopoVisibilidade` + `construirFiltroWhere` (3.2) para agregar, já filtrado por RBAC:

```
Processos: {total} no total — {porFazer} por fazer, {emCurso} em curso, {concluida} concluída, {emAtraso} em atraso.
Processos em atraso: {até 10 títulos, se emAtraso > 0}
Clientes: {total} no total — {comOportunidadeAtiva} com oportunidade ativa.
Pipeline: {prospecao} em prospeção, {negociacao} em negociação, {fechadaGanha} fechada-ganha, {fechadaPerdida} fechada-perdida.
```

Este resumo é o `sistema` do `AIRequest` (Passo 15) — nunca dados em bruto de nenhum registo individual, sempre já agregado. Cumpre RN-07 estruturalmente: dados fora do escopo RBAC do Utilizador nunca são reunidos, logo nunca podem chegar ao Gateway nem ao fornecedor — a garantia não depende da IA "escolher" não os revelar.

### 3.4 `IaService.perguntar(pergunta: string)`

1. `SessionGuard` + `PermissaoGuard('ia', 'perguntar')` — só quem tem `ia.perguntar` chega aqui (3.5).
2. `reunirResumoOperacional()` (3.3).
3. `AiGatewayService.perguntar({ sistema: resumo, mensagens: [{ papel: 'utilizador', conteudo: pergunta }] })` (Passo 15, já pronto).
4. Persiste `SugestaoIA` — `tipo: 'pergunta'`, `estado: 'aceite'`, `fornecedorUsado`, `conteudoPergunta`/`conteudoResposta` conforme `IA_RETER_CONTEUDO` (Decisão B).
5. Devolve `{ id, resposta }` ao Utilizador.

### 3.5 Permissão `ia.perguntar`

Nova chave na `DEFAULT_PERMISSION_MATRIX` (`fundacao/autorizacao/permission-matrix.ts`), módulo `ia` — Information Architecture §3.4 (RBAC por área, "Assistente de IA"): `admin_empresa`/`gestor`/`colaborador` = `true` (âmbito diferente cada um, aplicado por `obterEscopoVisibilidade`, nunca por este gate); `convidado` = `false` ("Não aplicável", literal da tabela).

### 3.6 Classificação e Tratamento de Erros — Primeira Exposição HTTP

Os erros tipados do Gateway (Passo 15, §3.7 desse documento) nunca tinham sido traduzidos para HTTP, já que esse passo não tinha controlador. Introduzido aqui um `IaExceptionFilter` (`@Catch`), aplicado só ao `IaController` — nunca repetido em `try/catch` por método:

| Erro do Gateway | HTTP |
|---|---|
| `QuotaExcedidaError` | 429 |
| `TimeoutIAError` | 504 |
| `FornecedorIndisponivelError` | 503 |
| `CapacidadeNaoSuportadaError` | 400 |
| `ErroGenericoFornecedorError` | 502 |

### 3.7 RN-07 — Nunca Revela Dados Fora do Escopo RBAC

Estrutural, não uma verificação a posteriori: o resumo operacional (3.3) já é construído a partir de dados filtrados por `obterEscopoVisibilidade`/`construirFiltroWhere` — um Colaborador nunca recebe, no seu próprio resumo, contagens que incluam Processos/Clientes fora do seu âmbito. Teste dedicado (3.9) cria dados em 2 âmbitos distintos e confirma que o resumo de um nunca aparece no do outro.

### 3.8 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-005 §3.3 ponto 1 | ✅ Filtragem RBAC pelo módulo chamador (`ia`), nunca pelo Gateway |
| Decisão B do M2 | ✅ 4ª confirmação da centralização — `construirFiltroWhere` extraído e reutilizado, nunca duplicado |
| PSD-003 | ✅ Retenção configurável implementada sem exigir infraestrutura nova |
| RN-07 | ✅ Estrutural, testável |
| NFR-17 | ✅ Metade "pergunta" do fluxo crítico "ações de IA" coberta; metade "sugestão/confirmação" fica para o Passo 17 |

**Nenhum novo ADR necessário.**

### 3.9 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Pergunta bem-sucedida devolve resposta + `SugestaoIA` criada com `estado: 'aceite'` | ✅ HTTP real |
| T2 | Resumo operacional de um Colaborador nunca inclui Processos/Clientes de outro âmbito (RN-07) | ✅ HTTP real — `FakeAdapter.ultimoPedido` inspecionado, confirma título do Colaborador X presente, título do Colaborador Y ausente |
| T3 | `convidado` recebe `403` (sem `ia.perguntar`) | ✅ HTTP real |
| T4 | Quota excedida (Passo 15) → `429` | ✅ HTTP real, via `IaExceptionFilter` |
| T5 | `IA_RETER_CONTEUDO=false` → `SugestaoIA` criada sem `conteudoPergunta`/`conteudoResposta` | ✅ HTTP real |
| T6 | `SugestaoIA` mais antiga que `IA_RETENCAO_CONTEUDO_DIAS` → nunca devolve o conteúdo, mesmo que ainda exista na BD | ✅ testado diretamente sobre `IaService.aplicarRetencao` — sem endpoint de leitura ainda neste passo (só `POST /ia/perguntar`, que devolve sempre conteúdo fresco); pronto para os Passos 17/18 reutilizarem |
| T7 | `DashboardService` — os 8 testes já existentes continuam a passar sem alteração ao ficheiro de teste, após a extração de `construirFiltroWhere` | ✅ confirmado antes de qualquer outro código deste passo |
| T8 | `npm run build` e `npm run test:e2e` (`apps/api`) sem erros | ✅ 122/122 (116 herdados + 6 novos) |

**Exit Criteria:** T1-T5, T7, T8 confirmados por teste automatizado via HTTP real (`supertest`, `FakeAdapter` override — primeiro endpoint de produto do M3, mesma disciplina e2e já usada desde o Passo 4); T6 confirmado diretamente sobre o serviço, por não existir ainda nenhum endpoint de leitura para o exercitar via HTTP — honestidade de âmbito, não uma lacuna escondida.

### 3.10 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- `AuthorizationService.construirFiltroWhere` (Decisão a Validar A) — `DashboardService` refatorado para o consumir; os 8 testes de Dashboard confirmados a passar sem qualquer alteração ao ficheiro de teste, **antes** de escrever qualquer outro código deste passo (validação incremental deliberada).
- Extensão aditiva de `SugestaoIA` (`conteudoPergunta`/`conteudoResposta`) — migração `20260707154415_add_sugestao_ia_conteudo`, aplicada a `nexa_dev` e `nexa_test`.
- `apps/api/src/modules/ia/ia.service.ts` — `reunirResumoOperacional()` (resumo agregado de Processos/Clientes/Pipeline, filtrado por RBAC antes do Gateway) e `perguntar()` (orquestra Gateway + persistência); `aplicarRetencao()` já pronto para os Passos 17/18.
- `apps/api/src/modules/ia/ia.controller.ts` — `POST /ia/perguntar`, `IaExceptionFilter` dedicado (3.6).
- Permissão `ia.perguntar` na matriz — `admin_empresa`/`gestor`/`colaborador` = `true`, `convidado` = `false` (Information Architecture §3.4).
- `FakeAdapter` (Passo 15) ganhou `ultimoPedido` — captura o último `AIRequest` recebido, necessário para testar RN-07 (3.9, T2) sem qualquer chamada real.

**Sem descobertas técnicas emergentes além das já identificadas e validadas na própria especificação** — as 3 Decisões a Validar (A, B, C) cobriram antecipadamente o que, nos passos anteriores, normalmente só surgia durante a implementação.

**Resultados de validação:**
- `apps/api/test/ia-perguntar.e2e-spec.ts` — 6 testes (T1-T6), via HTTP real (mesmo padrão de `processos.e2e-spec.ts`).
- Suite completa: **122/122 testes** (116 herdados + 6 novos).
- `npm run build` (`apps/api`) limpo.
- App arranca corretamente, rota `POST /ia/perguntar` mapeada, sem erros nos logs do servidor.

**Exit Criteria T1-T8: todos cumpridos** (T6 com o âmbito honesto já assinalado). NFR-17 ("ações de IA") tem agora a sua metade "pergunta" coberta — a metade "sugestão/confirmação" (RN-08) fica para o Passo 17.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | `AuthorizationService.construirFiltroWhere` extraído do `DashboardService` (Decisão a Validar A) | 4ª confirmação da Decisão B do M2 — reutilização centralizada, nunca duplicação |
| D2 | Retenção de conteúdo por ocultação-na-leitura, sem purga física nesta fase (Decisão a Validar B) | Cumpre PSD-003 sem introduzir infraestrutura de scheduler prematura |
| D3 | Contexto da IA = resumo agregado, sem lookup de entidade nomeada (Decisão a Validar C) | Suficiente para a maioria das 6 perguntas canónicas; profundidade adicional fica para iteração futura, não bloqueia o DoD literal do M3 |
| D4 | `estado` de `SugestaoIA` para `tipo='pergunta'` é sempre `'aceite'`, nunca `'pendente'` | Não há confirmação humana pendente para uma resposta informativa (Nível A) — só para uma sugestão de ação (Nível B, Passo 17) |
| D5 | `IaExceptionFilter` dedicado, em vez de `try/catch` repetido | Primeira exposição HTTP dos erros tipados do Gateway; um único ponto de tradução |
| D6 | `FakeAdapter.ultimoPedido` adicionado (captura o último `AIRequest`) | Necessário para testar RN-07 (T2) sem qualquer chamada real — extensão mínima ao suporte de testes do Passo 15 |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | ~~Confirmar `IA_RETENCAO_CONTEUDO_DIAS`~~ — **Resolvida.** 60 dias aprovado sem ajuste pela Fundadora/CEO | Nenhum | Resolvida em 2026-07-07 |
| 2 | Purga física de conteúdo antigo (para além da ocultação na leitura) — só faz sentido quando existir infraestrutura de tarefas agendadas | Fica registada como requisito de entrada do ADR-007, mesmo padrão já usado para o volume de auditoria (ADR-005 §3.9a) | CTO, no ADR-007 |
| 3 | Qualidade desigual das respostas às 6 perguntas canónicas com só resumo agregado (sem lookup de entidade) — avaliar com uso real antes de decidir se vale a pena aprofundar | Produto, não bloqueia o Passo 16 | CEO + CTO, após validação com dados reais |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da especificação técnica do Passo 16: extensão do schema `SugestaoIA` (conteúdo com retenção configurável, PSD-003), extração de `construirFiltroWhere` para `AuthorizationService` (4ª confirmação da Decisão B do M2), resumo operacional como contexto da IA, `POST /ia/perguntar`, `IaExceptionFilter`, e as 3 decisões emergentes (reutilização de lógica de escopo, mecanismo de retenção sem scheduler, âmbito da pergunta livre no MVP) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.10 — Resultado da Implementação, após aprovação e implementação completa: sem descobertas técnicas emergentes além das já antecipadas nas 3 Decisões a Validar; Decisão D6 adicionada (`FakeAdapter.ultimoPedido`); Questão em Aberto 1 resolvida (60 dias aprovado); T1-T8 confirmados (T6 com âmbito honesto assinalado — sem endpoint de leitura ainda), 122/122 testes | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

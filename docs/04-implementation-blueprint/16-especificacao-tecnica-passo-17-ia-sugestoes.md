# NEXA — Especificação Técnica do Passo 17 (M3): Sugestões de Ação (UC-06)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 17 — `POST /ia/sugestoes`, `POST /ia/sugestoes/:id/confirmar`, `POST /ia/sugestoes/:id/rejeitar` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M3 (Assistente de IA), Passo 17 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Especificação Técnica do Passo 16 (`POST /ia/perguntar`) v1.1 · Use Cases (UC-06, RN-08) · Functional Requirements (FR-25, FR-28) · Functional Specifications §3.5 · Event & Notification Architecture Rules §3.8 · AI Principles, Princípio 1 · System Design Principles §3.2 (regras #1-#3) · ADR-005 §3.6-3.8 · NFR-17 |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Implementar a receção e confirmação de uma sugestão de ação do Assistente de IA (UC-06, FR-25) — geração de sugestões pendentes, `POST /ia/sugestoes/:id/confirmar` e `POST /ia/sugestoes/:id/rejeitar` — completando a distinção estrutural sugestão/execução já preparada ao nível de tipos desde o Passo 15 (ADR-005 §3.7, `PendingSuggestion`/`ConfirmedAction`), mas nunca antes consumida por nenhum endpoint de produto. Este passo fecha a metade "sugestão/confirmação" do fluxo crítico obrigatório "ações de IA" (NFR-17) — a metade "pergunta" já foi coberta no Passo 16 — e é a primeira aplicação real de RN-08 (nenhuma ação sugerida pela IA executa sem confirmação humana explícita e individual) a um endpoint de produto, não apenas como princípio de arquitetura.

---

## 2. Contexto

O Passo 16 deixou por resolver, de forma deliberada, uma pergunta que a Proposta do M3 também não fechou: **que ação concreta o Assistente de IA efetivamente propõe no MVP?** Nem a Proposta do M3 nem o Blueprint (§4) fixam isto — o Blueprint só lista os dois endpoints de confirmação/rejeição, sem endpoint de geração e sem definir o conteúdo de uma sugestão. Seguindo o mesmo processo já usado nas Decisões a Validar do Passo 16 (nenhuma decisão emergente assumida sozinha), este passo traz **seis decisões** para validação explícita antes de implementar.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Que ação concreta o MVP propõe?** FR-25 dá "criar uma tarefa" como exemplo; UC-06 dá "reatribuir Processo X a Colaborador Y" como exemplo do fluxo. Nenhum dos dois documentos fecha a lista para o MVP. | **Um único tipo de ação nesta fase: reatribuição de um Processo em atraso para um Colaborador do mesmo Departamento com menor carga** — o exemplo literal do fluxo principal de UC-06, e o que mais diretamente aproveita a deteção de "Processos em atraso" já construída no Passo 16 (`reunirResumoOperacional`). "Criar uma tarefa" (o exemplo de FR-25) fica fora deste passo — decisão consciente de âmbito, não uma lacuna. |
| B | **A "sugestão" tem de ser gerada por uma chamada ao AI Gateway, ou pode ser 100% determinística?** A quota de IA é escassa (50/pedidos por mês por Empresa, provisória — Proposta do M3) e uma tela futura de "Sugestões Pendentes" (Passo 18) pode invocar a geração com alguma frequência. Gerar uma sugestão por Processo em risco, cada uma com uma chamada ao Gateway, esgotaria a quota de uma Empresa com poucos cliques. | **Deteção e texto 100% determinísticos nesta fase — sem qualquer chamada ao AI Gateway na geração.** "Identificar riscos" (FR-24) e "propor ações" (FR-25) não exigem, em nenhum dos dois FRs, que a deteção ou o texto sejam produzidos por um modelo de LLM — só que o sistema nunca execute sem confirmação (RN-08), o que este desenho cumpre integralmente. Fica registado como melhoria futura de baixo risco (Questão em Aberto 1) substituir o texto determinístico por uma frase gerada pelo Gateway, sem alterar nada da execução/confirmação. |
| C | **Como é que a ação confirmada é executada, sem duplicar as regras de negócio de Processos (PR-01 a PR-07) dentro do módulo `ia`?** Até agora, nenhum módulo de negócio importou o serviço de outro módulo de negócio — só a Fundação é importada transversalmente (System Design Principles, regra #2). O Passo 16 reuniu o resumo operacional com queries próprias, precisamente para não depender de outro módulo de negócio (Especificação Técnica do Passo 16, 3.3) — mas ali tratava-se só de leitura agregada; aqui trata-se de **escrever** no Processo, e duplicar `validarResponsavelParaEdicao` (PR-02/PR-03) seria repetir uma regra de negócio já validada, com risco real de divergência futura entre as duas cópias. | **`IaModule` importa `ProcessosModule` e chama `ProcessosService.editar(...)` diretamente para executar a ação confirmada** — nunca escreve no Processo via `TenantPrismaService` bruto. Isto está coberto pela regra #1 do System Design Principles: "comunica através de uma interface interna explícita (função, serviço interno, ou evento — nunca uma consulta direta cruzando fronteiras)" — chamar o serviço público de outro módulo de negócio é exatamente essa interface explícita, não uma exceção à regra. Herda automaticamente PR-01 a PR-07, a autorização de instância (`podeAgirSobreEntidade`) e o evento de auditoria já emitidos por Processos — zero lógica de escrita duplicada. Exige tornar `ProcessosService` exportado por `ProcessosModule` (hoje só `ProcessosController` é usado fora do módulo) — extensão aditiva mínima. |
| D | **Quem pode gerar, confirmar e rejeitar sugestões de reatribuição?** `ProcessosService.editar` já impede um `colaborador` de reatribuir um Processo a outra pessoa (só pode atribuir a si mesmo — `validarResponsavelParaEdicao`, linha 292 do serviço) — logo um `colaborador` nunca conseguiria executar esta ação específica, mesmo que a confirmasse. | **`ia.gerar_sugestoes`/`ia.confirmar_sugestao`/`ia.rejeitar_sugestao` só para `admin_empresa` e `gestor`** (âmbito de `gestor` restrito ao seu Departamento, herdado automaticamente de `obterEscopoVisibilidade('processo')`/`ProcessosService.editar`). `colaborador`/`convidado` = `false` — consistente com a incapacidade estrutural já existente em Processos, e evita construir uma superfície de API que nunca poderia ser executada com sucesso por quem a chamasse. |
| E | **O que acontece se a situação deixar de ser válida entre a geração e a confirmação (UC-06, Exceção E1 — ex: o Processo já foi concluído ou reatribuído por outra via)?** `SugestaoIA.estado` só tem 3 valores documentados (Functional Specifications §3.5: `pendente` / `aceite` / `rejeitada`) — introduzir um 4º valor (ex: `expirada`/`invalida`) exigiria alterar um contrato de produto já aprovado, só para este caso. | **Revalidar a situação no momento da confirmação; se já não for válida, devolver `409 Conflict` sem executar e sem alterar `estado`** (a sugestão permanece `pendente`, disponível para o Utilizador a rejeitar explicitamente). Cumpre UC-06 E1 literalmente ("informa o Utilizador... em vez de a executar de forma inconsistente") sem introduzir um novo estado. |
| F | **`GET /ia/sugestoes` (listagem) fica neste passo?** Nem o Blueprint nem a Proposta do M3 exigem uma superfície de leitura já neste passo — o mesmo raciocínio já usado no Passo 16 para adiar a leitura de `SugestaoIA` (`aplicarRetencao` testado diretamente, sem endpoint). | **Não.** Fica para o Passo 18 (frontend), quando a área "Sugestões Pendentes" (Information Architecture §3.1) precisar de facto de listar. Este passo testa geração/confirmação/rejeição via os `id`s devolvidos pela própria geração — decisão consciente de âmbito, não uma lacuna. |

---

## 3. Conteúdo Estruturado

### 3.1 Extensão do Schema `SugestaoIA`

```prisma
model SugestaoIA {
  // ... campos existentes desde o Passo 2/16 ...
  acaoPayload Json?  // parâmetros exatos da ação proposta — só para tipo='sugestao_acao'
}
```

Aditivo, sem alterar nenhum campo existente. `acaoPayload` guarda exatamente o que foi decidido no momento da geração (ex: `{ tipo: 'reatribuir_processo', processoId, responsavelAtualId, responsavelSugeridoId }`) — a confirmação executa **este** payload, nunca uma recomputação tardia da heurística (3.2), para que a ação executada seja sempre, sem exceção, a mesma que foi mostrada ao Utilizador na sugestão. `conteudoResposta` (já existente desde o Passo 16) é reaproveitado para o texto de justificação determinístico (3.2) — sujeito à mesma retenção configurável (PSD-003) já implementada; `conteudoPergunta` fica `null` para `tipo='sugestao_acao'` (não há pergunta de um Utilizador nesta origem). `entidadeRef` (já existente, por preencher desde o Passo 7) passa a ser usado pela primeira vez: guarda o `id` do Processo referenciado.

### 3.2 Deteção Determinística de Processos em Risco (Decisões A/B)

`IaService.detetarProcessosEmRisco()` — reaproveita literalmente o padrão já estabelecido em `reunirResumoOperacional` (Passo 16, 3.3: `obterEscopoVisibilidade('processo')` + `construirFiltroWhere`):

1. `processosEmRisco = Processo.findMany({ where: { ...filtro, eliminadoEm: null, estado: { not: concluida }, prazo: { lt: agora } } })` — mesma condição de "atraso" já usada no Passo 16.
2. Para cada Processo em risco, ignorando os que já têm uma `SugestaoIA` `pendente` com `tipo='sugestao_acao'` e `entidadeRef` igual (idempotência — chamadas repetidas nunca duplicam sugestões já pendentes):
   - Candidatos = `Utilizador.findMany({ departamentoId: processo.departamentoId, papel: colaborador, eliminadoEm: null, id: { not: processo.responsavelId } })`.
   - Se `processo.departamentoId` for `null`, ou não existir nenhum candidato, **não gerar sugestão** para este Processo (sem candidato válido, não há ação a propor).
   - Escolher o candidato com **menos Processos em atraso atualmente atribuídos** (contagem determinística; empate desfeito por `id` ascendente, para resultado estável em teste).
3. Texto determinístico (Decisão B): `"Processo '{titulo}' está atrasado. Sugerimos reatribuir a {nomeCandidato}, que tem atualmente menos Processos em atraso no Departamento."`

### 3.3 `POST /ia/sugestoes` — Geração

1. `SessionGuard` + `PermissaoGuard('ia', 'gerar_sugestoes')` (Decisão D).
2. `detetarProcessosEmRisco()` (3.2).
3. Para cada situação detetada, cria `SugestaoIA` (`tipo: 'sugestao_acao'`, `estado: 'pendente'` — valor por omissão do schema, `utilizadorId: ctx.utilizadorId`, `entidadeRef: processoId`, `acaoPayload`, `conteudoResposta: texto`, `fornecedorUsado: 'deterministico'`).
4. Audita `gerar`/`SugestaoIA` (evento agregado, uma vez por chamada, com a contagem de sugestões criadas — não uma vez por sugestão, para não inflacionar o Registo de Auditoria com N eventos idênticos numa única ação do Utilizador).
5. Devolve `{ sugestoes: [{ id, entidadeRef, texto }] }` (array — pode ser vazio, se não houver Processos em risco com candidato válido).

### 3.4 `POST /ia/sugestoes/:id/confirmar` — Execução (Decisões C/E)

1. `SessionGuard` + `PermissaoGuard('ia', 'confirmar_sugestao')`.
2. Carrega `SugestaoIA` por `id` (via `TenantPrismaService` — isolamento de tenant estrutural, Camada 1) → `404` se não existir.
3. **Autoridade**: `ctx.utilizadorId === sugestao.utilizadorId` OU `ctx.papel === admin_empresa` → senão `403` (só quem gerou a sugestão, ou o Administrador, pode confirmá-la — mesmo padrão de autoridade já usado em Partilha, Passo 7, regras P1-P5).
4. `sugestao.estado !== 'pendente'` → `409` ("Esta sugestão já foi confirmada ou rejeitada.").
5. `sugestao.tipo !== 'sugestao_acao'` → `400` (defesa em profundidade — este endpoint nunca deveria receber o `id` de uma pergunta).
6. **Revalidação (Decisão E)**: relê o Processo (`acaoPayload.processoId`); se eliminado, já `concluida`, ou `responsavelId` já diferente de `acaoPayload.responsavelAtualId` (alterado entretanto por outra via) → `409` ("A ação sugerida já não é válida."), sem alterar `estado` da sugestão.
7. Executa `processosService.editar(acaoPayload.processoId, { responsavelId: acaoPayload.responsavelSugeridoId })` (Decisão C) — se o serviço lançar `ForbiddenException` (ex: o Departamento do confirmante mudou entre a geração e a confirmação), propaga tal-e-qual.
8. Atualiza `SugestaoIA.estado = 'aceite'`.
9. Audita `confirmar`/`SugestaoIA` (evento **distinto** do `atualizar`/`Processo` já emitido pelo próprio `ProcessosService.editar` — cumpre Event & Notification Architecture Rules §3.8: os dois eventos, "sugestão" e "execução", são sempre distintos, e o segundo só é emitido por uma ação humana explícita a este endpoint).
10. Devolve `{ id, estado: 'aceite' }`.

### 3.5 `POST /ia/sugestoes/:id/rejeitar`

Mesmos passos 1-5 de 3.4 (guards, carregamento, autoridade, `estado === pendente`, `tipo === sugestao_acao`). Nunca toca no Processo. `estado = 'rejeitada'`. Audita `rejeitar`/`SugestaoIA`. Devolve `{ id, estado: 'rejeitada' }`.

### 3.6 Permissões `ia.gerar_sugestoes` / `ia.confirmar_sugestao` / `ia.rejeitar_sugestao`

Novas chaves na `DEFAULT_PERMISSION_MATRIX`, módulo `ia`:

| Papel | `gerar_sugestoes` | `confirmar_sugestao` | `rejeitar_sugestao` |
|---|---|---|---|
| `admin_empresa` | `true` | `true` | `true` |
| `gestor` | `true` (âmbito: seu Departamento, herdado de `obterEscopoVisibilidade`) | `true` | `true` |
| `colaborador` | `false` | `false` | `false` |
| `convidado` | `false` | `false` | `false` |

Justificação (Decisão D): `colaborador` nunca teria sucesso a confirmar esta ação específica de qualquer forma (`ProcessosService.editar` já o impede de reatribuir a outra pessoa) — negar o gate mais cedo evita expor um endpoint que estruturalmente nunca poderia ser usado com sucesso por este papel.

### 3.7 RN-08 e a Salvaguarda Estrutural (Event & Notification Architecture Rules §3.8)

RN-08 ("nenhuma ação sugerida pela IA é executada sem confirmação explícita e individual") é garantida em duas camadas independentes:

- **Ao nível de tipos** (ADR-005 §3.7, já construído no Passo 15): `PendingSuggestion`/`ConfirmedAction` são estruturalmente incompatíveis; só `confirmar()` converte um no outro, exigindo um `utilizadorId` explícito.
- **Ao nível de eventos** (Event & Notification Architecture Rules §3.8): o evento `gerar`/`SugestaoIA` (3.3) e o evento `confirmar`/`SugestaoIA` (3.4) são sempre distintos; não existe nenhum caminho técnico em que o primeiro desencadeie automaticamente o segundo — só uma chamada HTTP explícita e autenticada a `POST /ia/sugestoes/:id/confirmar` o faz.

Nenhuma das duas camadas depende da outra — mesmo que uma falhe (ex: um bug futuro no `PermissaoGuard`), a distinção estrutural de tipos continua a impedir a conversão implícita.

### 3.8 Extensão de `ProcessosModule` (Decisão C)

```ts
// processos.module.ts
@Module({
  imports: [FundacaoModule],
  controllers: [ProcessosController],
  providers: [ProcessosService],
  exports: [ProcessosService], // novo — primeira vez que um módulo de negócio é consumido por outro
})
```

`IaModule` passa a `imports: [FundacaoModule, ProcessosModule]`. Primeira vez que um módulo de negócio depende de outro módulo de negócio (até agora só `FundacaoModule` era importado transversalmente) — precedente estabelecido por esta especificação, coberto pela regra #1 do System Design Principles (interface interna explícita), nunca pela regra #2 (que continua a proibir só o acesso direto a dados internos, não a chamada ao serviço público de outro módulo).

### 3.9 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| RN-08 / UC-06 | ✅ Confirmação humana explícita e individual, em duas camadas independentes (3.7) |
| Event & Notification Architecture Rules §3.8 | ✅ Eventos "sugestão" e "execução" sempre distintos, sem encadeamento automático |
| System Design Principles, regra #1 | ✅ `IaModule` consome `ProcessosService` via interface explícita, nunca uma query direta cruzando fronteiras |
| ADR-005 §3.7 | ✅ Primeira aplicação real de `PendingSuggestion`/`ConfirmedAction` a um endpoint de produto |
| AI Principles, Princípio 1 | ✅ Estruturalmente garantido, não por convenção |
| NFR-17 | ✅ Fecha a metade "sugestão/confirmação" do fluxo crítico "ações de IA" — os 4 fluxos críticos obrigatórios ficam todos cobertos após este passo |

**Nenhum novo ADR necessário** — este passo aplica ADR-005 (já aprovado), não o altera.

### 3.10 Critérios de Aceitação e Exit Criteria (planeados)

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | Geração cria uma `SugestaoIA` `pendente` para um Processo atrasado com candidato válido no Departamento | HTTP real | ✅ |
| T2 | Geração não cria nenhuma sugestão para um Processo atrasado sem candidato válido (ex: único Colaborador do Departamento) | HTTP real | ✅ |
| T3 | Geração é idempotente — chamar duas vezes seguidas não duplica a sugestão pendente para o mesmo Processo | HTTP real | ✅ |
| T4 | `colaborador`/`convidado` recebem `403` em `POST /ia/sugestoes`, `.../confirmar`, `.../rejeitar` (Decisão D) | HTTP real | ✅ |
| T5 | Confirmação bem-sucedida: `Processo.responsavelId` atualizado, `SugestaoIA.estado = 'aceite'`, evento `atualizar`/`Processo` **e** evento `confirmar`/`SugestaoIA` ambos presentes no Registo de Auditoria (RN-08, 3.7) | HTTP real | ✅ |
| T6 | Confirmação de sugestão já `aceite`/`rejeitada` → `409` | HTTP real | ✅ |
| T7 | Confirmação de sugestão cujo Processo entretanto foi concluído/reatribuído por outra via → `409`, `estado` permanece `pendente` (UC-06 E1, Decisão E) | HTTP real | ✅ |
| T8 | Confirmação por um Utilizador que não gerou a sugestão nem é `admin_empresa` → `403` | HTTP real | ✅ |
| T9 | Rejeição bem-sucedida: `SugestaoIA.estado = 'rejeitada'`, `Processo` nunca alterado | HTTP real | ✅ |
| T10 | `gestor` só gera/confirma sugestões dentro do seu próprio Departamento (herdado de `obterEscopoVisibilidade`) | HTTP real | ✅ |
| T11 | Regressão completa — todos os testes herdados (122) continuam a passar | `npm run test:e2e` | ✅ 132/132 |
| T12 | `npm run build` sem erros | build limpo | ✅ |

**Exit Criteria:** T1-T11 confirmados por teste automatizado via HTTP real (`supertest`, mesma disciplina e2e já usada desde o Passo 4); T12 build limpo. Fecha NFR-17 na íntegra (os 4 fluxos críticos obrigatórios — isolamento multi-tenant, RBAC, limites de plano, ações de IA — ficam todos cobertos por teste automatizado após este passo).

### 3.11 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- Extensão aditiva de `SugestaoIA` (`acaoPayload Json?`) — migração `20260707191042_add_sugestao_ia_acao_payload`, aplicada a `nexa_dev` e `nexa_test`.
- `ProcessosModule` passa a exportar `ProcessosService` (Decisão C) — primeira vez que um módulo de negócio é consumido por outro; `IaModule` importa `ProcessosModule`.
- `apps/api/src/modules/ia/ia.service.ts` — `detetarProcessosEmRisco()` (privado, deteção determinística, Decisão A/B), `gerarSugestoes()`, `confirmarSugestao(id)` (executa via `processosService.editar`, Decisão C; revalida staleness, Decisão E), `rejeitarSugestao(id)`.
- `apps/api/src/modules/ia/ia.controller.ts` — `POST /ia/sugestoes`, `POST /ia/sugestoes/:id/confirmar`, `POST /ia/sugestoes/:id/rejeitar`.
- Permissões `ia.gerar_sugestoes`/`ia.confirmar_sugestao`/`ia.rejeitar_sugestao` na matriz — `admin_empresa`/`gestor` = `true`, `colaborador`/`convidado` = `false` (Decisão D).
- `apps/api/test/ia-sugestoes.e2e-spec.ts` — 10 testes (T1-T10), via HTTP real.

**Sem descobertas técnicas emergentes além das já identificadas e validadas na própria especificação** — as 6 Decisões a Validar (A-F) cobriram antecipadamente o que, nos passos anteriores, normalmente só surgia durante a implementação. A única confirmação obtida só em código (não alterou nenhuma decisão): `validarResponsavelParaEdicao` do `ProcessosService` já resolve `departamentoId` a partir do Processo existente quando a confirmação não o fornece explicitamente (`dto.departamentoId ?? existente.departamentoId`) — por isso a chamada de `IaService.confirmarSugestao` a `processosService.editar(processoId, { responsavelId })`, sem `departamentoId`, herda corretamente o âmbito de Departamento do `gestor` confirmante, sem exigir nenhum código adicional no módulo `ia`.

**Resultados de validação:**
- `apps/api/test/ia-sugestoes.e2e-spec.ts` — 10 testes (T1-T10), via HTTP real (mesmo padrão de `ia-perguntar.e2e-spec.ts`).
- Suite completa: **132/132 testes** (122 herdados + 10 novos).
- `npm run build` (`apps/api`) limpo.
- App arranca corretamente, rotas `POST /ia/sugestoes`, `POST /ia/sugestoes/:id/confirmar`, `POST /ia/sugestoes/:id/rejeitar` mapeadas, sem erros nos logs do servidor.

**Exit Criteria T1-T12: todos cumpridos.** NFR-17 ("ações de IA") fica coberto na íntegra — os 4 fluxos críticos obrigatórios (isolamento multi-tenant, RBAC, limites de plano, ações de IA) têm agora todos cobertura de teste automatizado.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Único tipo de ação suportado no MVP: reatribuição de Processo em atraso (Decisão a Validar A) | Literal do fluxo principal de UC-06; reaproveita a deteção já construída no Passo 16 |
| D2 | Deteção e texto de justificação 100% determinísticos, sem chamada ao AI Gateway na geração (Decisão a Validar B) | Preserva a quota escassa (50/mês); FR-24/FR-25 não exigem que a deteção seja feita por um LLM |
| D3 | `IaModule` importa `ProcessosModule` e chama `ProcessosService.editar` para executar a ação confirmada (Decisão a Validar C) | Evita duplicar PR-01 a PR-07; coberto pela regra #1 do System Design Principles (interface interna explícita) |
| D4 | `ia.gerar_sugestoes`/`confirmar_sugestao`/`rejeitar_sugestao` só para `admin_empresa`/`gestor` (Decisão a Validar D) | `colaborador` estruturalmente incapaz de reatribuir Processos a terceiros (`ProcessosService.editar` já o impede) |
| D5 | Sugestão obsoleta na confirmação → `409`, sem novo valor de `estado` (Decisão a Validar E) | Cumpre UC-06 E1 sem alterar o contrato de 3 estados já documentado no Functional Specifications |
| D6 | Sem `GET /ia/sugestoes` neste passo (Decisão a Validar F) | Superfície de leitura só quando o Passo 18 (frontend) precisar dela |
| D7 | Novo campo aditivo `SugestaoIA.acaoPayload` (Json?) | A confirmação executa exatamente o que foi mostrado ao Utilizador, nunca uma recomputação tardia |
| D8 | Eventos `gerar`/`confirmar`/`rejeitar` de `SugestaoIA` distintos do evento `atualizar`/`Processo` já emitido por Processos | Cumpre literalmente Event & Notification Architecture Rules §3.8 |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Substituir o texto de justificação determinístico (D2) por uma frase gerada pelo AI Gateway, quando a quota deixar de ser um constrangimento tão apertado | Melhoria de produto, não estrutural — não altera `acaoPayload` nem a execução/confirmação | CEO + CTO, após avaliação de uso real do M3 |
| 2 | Expandir o âmbito de ações suportadas além da reatribuição de Processo (ex: "criar uma tarefa", o exemplo de FR-25) | Cada novo tipo de ação exige a sua própria heurística de deteção e o seu próprio payload — decisão de produto a trazer isoladamente, nunca assumida | CEO + CTO, em milestone futuro |
| 3 | Comportamento de expiração de uma sugestão pendente nunca respondida (Use Cases, Q1) — continua sem resolução, tal como já assinalado nesse documento; UC-06 3b já define o comportamento do MVP ("sem expirar automaticamente"), por isso não bloqueia este passo | Nenhum, nesta fase | CEO + CTO, se e quando o volume de sugestões pendentes justificar revisitar |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da proposta de Especificação Técnica do Passo 17 — sem implementação. Seis Decisões a Validar (A-F): âmbito do único tipo de ação suportado (reatribuição de Processo), deteção/texto determinísticos sem chamada ao Gateway, reutilização de `ProcessosService` via novo precedente de importação entre módulos de negócio, autoridade restrita a `admin_empresa`/`gestor`, tratamento de sugestão obsoleta sem novo `estado`, adiamento de `GET /ia/sugestoes` para o Passo 18. Novo campo aditivo `SugestaoIA.acaoPayload`. Plano de testes T1-T12 (não executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.11 — Resultado da Implementação, após aprovação e implementação completa das 6 Decisões a Validar (A-F) tal como propostas, sem nenhuma alteração de âmbito. Sem descobertas técnicas emergentes além das já antecipadas. T1-T12 confirmados, 132/132 testes (122 herdados + 10 novos). NFR-17 fecha na íntegra — os 4 fluxos críticos obrigatórios têm agora todos cobertura automatizada | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |


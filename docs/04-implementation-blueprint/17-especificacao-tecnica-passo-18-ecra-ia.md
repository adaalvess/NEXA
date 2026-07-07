# NEXA — Especificação Técnica do Passo 18 (M3): Ecrã do Assistente de IA (Frontend)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 18 — `/ia` (frontend), `GET /ia/sugestoes` (extensão aditiva ao backend) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M3 (Assistente de IA), Passo 18 — último passo do M3 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Especificação Técnica do Passo 14 (Ecrãs) v1.1 · Especificação Técnica do Passo 17 (Sugestões de Ação) v1.1, Decisão F · Use Cases (UC-05, UC-06, RN-07, RN-08) · Information Architecture §3.1, §3.4, §3.5, §3.6.6 · ADR-006 (Design System) §3.7 · Regra não-negociável #16 |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Implementar o ecrã do Assistente de IA (`/ia`) — pergunta livre (UC-05, consumindo `POST /ia/perguntar`, Passo 16) e sugestões pendentes (UC-06, consumindo `POST /ia/sugestoes`/`.../confirmar`/`.../rejeitar`, Passo 17) — através dos componentes do Design System (Passo 13), sem duplicar lógica de RBAC (ADR-006 §3.7). Último passo do M3: com este ecrã, o Assistente de IA torna-se utilizável por uma pessoa real, não só por `supertest`. Inclui uma extensão aditiva mínima ao backend — `GET /ia/sugestoes` — deliberadamente adiada do Passo 17 (Decisão F desse documento) até este momento, em que passa a ser necessária de facto.

---

## 2. Contexto

### 2.1 Decisões Já Validadas (antes deste documento)

- **E1 (Passo 14):** ecrãs consomem sempre APIs já implementadas, testadas e aprovadas — nunca UI antes da API (Decisão Arquitetónica A do M2). `POST /ia/perguntar` (Passo 16) e `POST /ia/sugestoes`/`.../confirmar`/`.../rejeitar` (Passo 17) já cumprem esta condição.
- **Decisão F (Passo 17):** `GET /ia/sugestoes` fica "para o Passo 18, quando a área 'Sugestões Pendentes' precisar de facto de listar" — chegou o momento.
- **`papel` só em memória no frontend** (Passo 14, 3.4, D4) — a API continua a ser a única fonte de decisão de autorização; a interface só oculta, nunca decide.

### 2.2 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **`GET /ia/sugestoes` — forma exata da extensão backend.** Sem este endpoint, a área "Sugestões Pendentes" (Information Architecture §3.1) não tem como existir — a geração (`POST /ia/sugestoes`) já devolve as sugestões criadas nessa chamada, mas não as já existentes de visitas anteriores. | Novo endpoint, escopo mínimo: `tipo='sugestao_acao'`, `estado='pendente'` sempre (sem parâmetro de filtro — a área é literalmente "Sugestões **pendentes**", Information Architecture §3.1); nova permissão `ia.listar_sugestoes` (`admin_empresa`/`gestor` = `true`, mesmo padrão de `gerar_sugestoes`). Reaproveita `IaService.aplicarRetencao` (Passo 16) sobre `conteudoResposta` (o texto de justificação), pela mesma disciplina já aplicada a perguntas — nenhuma lógica de retenção nova. |
| B | **Escopo de visibilidade de `GET /ia/sugestoes`.** Um segundo `gestor` do mesmo Departamento vê as sugestões geradas pelo primeiro? | **Não — mesma regra de autoridade já usada em confirmar/rejeitar (Passo 17, Decisão E/autoridade):** `admin_empresa` vê todas; qualquer outro só vê as que gerou (`utilizadorId === ctx.utilizadorId`). Reutiliza a regra já validada, sem introduzir uma segunda noção de "âmbito de Departamento" para sugestões — decisão consciente de âmbito, documentada, não uma lacuna. Fica registada como possível revisão futura (Questão em Aberto 1), se o uso real revelar que múltiplos Gestores do mesmo Departamento precisam de partilhar a mesma lista. |
| C | **Histórico de "Conversa" (perguntas anteriores).** Não existe (nem este passo introduz) um `GET` para reler perguntas/respostas passadas — só `POST /ia/perguntar` devolve a resposta no momento em que é feita. | **Âmbito local à sessão do browser.** A conversa fica em estado do componente React (nunca persistida no `localStorage`, mesmo princípio de segurança já usado para `papel`, Passo 14 D4) — cada pergunta feita durante a visita ao ecrã aparece na conversa; recarregar a página limpa-a. Introduzir um histórico persistido e lido pela UI é uma extensão de âmbito de produto, não uma correção técnica — fica fora deste passo. |
| D | **RN-08 na interface — como tornar "confirmação explícita e individual" visível, não só estrutural.** RN-08 já é estruturalmente garantida no backend (Passo 17, 3.7) — mas a regra não-negociável #16 exige que a IA nunca aja sem confirmação humana explícita, e uma interface mal desenhada podia tornar essa confirmação trivial ao ponto de deixar de ser uma decisão consciente (ex: um único clique acidental). | Cada sugestão pendente tem os seus próprios botões "Confirmar"/"Rejeitar" (nunca uma ação em lote — RN-08 é literal: "não existe 'aceitar todas'"); o botão "Confirmar" abre um `Modal` (Design System, Passo 13) com o texto exato da ação proposta e um segundo clique explícito de confirmação, antes de chamar `POST /ia/sugestoes/:id/confirmar`. "Rejeitar" não exige o mesmo grau de fricção (não executa nenhuma ação sobre dados de negócio) — só o `Modal` de confirmação é aplicado a "Confirmar". |
| E | **Posicionamento do Assistente de IA na navegação.** Information Architecture §3.6.6 descreve uma posição visual transversal e sempre igual (mesmo padrão de Pesquisa Global/Command Palette) — mas esse é um dos "8 princípios arquiteturais para evolução futura", explicitamente listado nesse documento como fora do âmbito funcional do MVP (§3.6, último parágrafo). | Item normal na `BarraLateralNavegacao` (mesma UX de Dashboard/Processos/CRM, Passo 14) — `/ia`, oculto para `convidado` (Information Architecture §3.4, "Não aplicável" — mesmo padrão de `ver_pipeline` para quem não tem acesso). A refinação futura (posição fixa cross-módulo, Command Palette) fica registada como capacidade arquitetural já prevista, não implementada agora. |

---

## 3. Conteúdo Estruturado

### 3.1 `GET /ia/sugestoes` (extensão backend — Decisões A/B)

```
GET /ia/sugestoes
→ SessionGuard + PermissaoGuard('ia', 'listar_sugestoes')
→ where: { tipo: 'sugestao_acao', estado: 'pendente', utilizadorId: ctx.papel === admin_empresa ? undefined : ctx.utilizadorId }
→ aplica aplicarRetencao() a cada `conteudoResposta` antes de devolver
→ devolve: { id, entidadeRef, texto, createdAt }[]
```

Nova permissão `ia.listar_sugestoes` — `admin_empresa`/`gestor` = `true`, `colaborador`/`convidado` = `false` (mesmo padrão de `gerar_sugestoes`/`confirmar_sugestao`/`rejeitar_sugestao`, Passo 17, Decisão D).

### 3.2 Estrutura de Rotas

```
apps/web/src/app/(autenticado)/ia/page.tsx
```

Segue a mesma estrutura de grupo de rotas `(autenticado)` já usada por Dashboard/Processos/CRM (Passo 14, 3.3) — sessão resolvida no layout do grupo, nunca duplicada por ecrã.

### 3.3 Ecrã `/ia`

Duas secções na mesma página (sem sub-rotas — o volume de conteúdo não justifica, mesma cautela de simplicidade já aplicada em Passo 12):

**Secção "Perguntar" (todos exceto `convidado`, que nunca vê o item de navegação — 2.2, Decisão E):**
- `Textarea` (Design System) + `Botao` "Perguntar" → `POST /ia/perguntar`.
- Conversa em estado local do componente (2.2, Decisão C) — cada par pergunta/resposta acrescentado à lista visível, mais recente no fundo.
- `429` (quota excedida) e `504`/`503` (Gateway indisponível, Passo 15/16) tratados com mensagem — nunca crash (mesmo padrão já usado no Pipeline, Passo 14, para `403`).

**Secção "Sugestões Pendentes" (só `admin_empresa`/`gestor` — oculta para `colaborador`, que tem `ia.perguntar` mas nunca `ia.gerar_sugestoes`, Passo 17 Decisão D):**
- Botão "Gerar Sugestões" → `POST /ia/sugestoes`; após resposta, invalida a query de `GET /ia/sugestoes` (mesmo padrão `queryClient.invalidateQueries` já usado em Notificações, Passo 14).
- Lista de sugestões pendentes (`GET /ia/sugestoes`, 3.1) — cada uma num `Cartao` com o `texto` (já contém o título do Processo e a justificação, Passo 17, 3.3 — sem necessidade de nova consulta), um link para o Processo referenciado (`entidadeRef` → `/processos/:id`, cumprindo Information Architecture §3.5 — "Do Assistente de IA → a entidade exata a que uma sugestão se refere"), e os botões "Confirmar"/"Rejeitar".
- "Confirmar" abre `Modal` de segunda confirmação (2.2, Decisão D) antes de chamar `POST /ia/sugestoes/:id/confirmar`.
- `409` (sugestão já resolvida ou obsoleta, Passo 17, 3.4) tratado com mensagem + refrescar a lista — nunca crash.
- Sem sugestões pendentes: texto simples ("Sem sugestões pendentes de momento.") — não um `EstadoVazioGuiado` completo, já que a ação "criar a primeira" não se aplica aqui (o botão "Gerar Sugestões" já está sempre visível acima da lista, ao contrário de Processos/Clientes).

### 3.4 `BarraLateralNavegacao` (Decisão E)

```ts
{ rotulo: 'Assistente de IA', href: '/ia', icone: Sparkles }
```

Adicionado à lista de `itens`, sempre visível exceto para `papel === 'convidado'` — mesmo padrão condicional já usado para o link do Pipeline (Passo 14, restrito a `admin_empresa`/`gestor`).

### 3.5 Tratamento de Erros e Estados de Carregamento

Mesmo padrão já estabelecido no Passo 14 (3.10) — nenhum ecrã mostra uma página em branco ou uma exceção não tratada:

| Cenário | Tratamento |
|---|---|
| `403` em qualquer pedido (ex: acesso direto a `/ia` por `convidado` via URL) | Mensagem clara, mesmo padrão do Pipeline (Passo 14) |
| `429` (quota excedida, `POST /ia/perguntar`) | Mensagem "Limite de perguntas à IA atingido este mês." |
| `503`/`504` (fornecedor de IA indisponível/lento) | Mensagem "O Assistente de IA está indisponível de momento. Tenta novamente em breve." |
| `409` (sugestão já resolvida/obsoleta, `.../confirmar`) | Mensagem + lista de sugestões refrescada automaticamente |

### 3.6 Acessibilidade e Responsividade

Mesmos critérios já validados nos ecrãs do Passo 14 (NFR-13/NFR-14) — `Modal`/`Textarea`/`Botao` já garantem acessibilidade por construção (Radix UI ou elementos nativos, Passo 13); responsivo sem quebras em 375px/768px/desktop, validado visualmente no browser (não só revisão de código).

### 3.7 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| ADR-006 §3.7 | ✅ Nenhuma lógica de RBAC duplicada — `papel` só oculta, API decide sempre |
| Regra não-negociável #16 | ✅ Confirmação humana explícita e individual, visível na interface (Modal, sem ação em lote), não só estrutural |
| Information Architecture §3.5 | ✅ Cross-navegação Sugestão → Processo referenciado |
| Information Architecture §3.4 | ✅ `convidado` nunca vê o item de navegação |
| Data & Consistency Rules / Passo 14 D4 | ✅ Nenhum dado de sessão sensível em `localStorage` |

**Nenhum novo ADR necessário.**

### 3.8 Critérios de Aceitação e Exit Criteria

**Backend (`GET /ia/sugestoes`, extensão aditiva):**

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | `GET /ia/sugestoes` devolve só as sugestões `pendente` geradas pelo próprio Utilizador | HTTP real | ✅ |
| T2 | `admin_empresa` vê as sugestões pendentes de qualquer Utilizador da Empresa | HTTP real | ✅ |
| T3 | `colaborador`/`convidado` recebem `403` | HTTP real | ✅ |
| T4 | Regressão completa — todos os testes herdados (132) continuam a passar | `npm run test:e2e` | ✅ 135/135 |
| T5 | `npm run build`/`npm run lint` (`apps/api`) sem erros | build/lint limpos | ✅ |

**Frontend (validação visual real no browser, mesma disciplina do Passo 14 — não só revisão de código):**

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| V1 | `admin_empresa`/`gestor`/`colaborador` veem o item "Assistente de IA" na navegação; `convidado` não | Inspeção visual | ✅ |
| V2 | Pergunta livre funciona ponta a ponta; conversa acumula pares pergunta/resposta na sessão | Inspeção visual | ✅ pedido HTTP real confirmado (`POST /ia/perguntar`), com tratamento de erro validado ponta a ponta — ver nota de âmbito honesto abaixo |
| V3 | `colaborador` não vê a secção "Sugestões Pendentes"; `admin_empresa`/`gestor` veem | Inspeção visual | ✅ |
| V4 | "Gerar Sugestões" popula a lista; link de cada sugestão navega para o Processo correto | Inspeção visual | ✅ |
| V5 | "Confirmar" exige o segundo passo no `Modal`; nunca existe um botão de aceitar em lote | Inspeção visual | ✅ |
| V6 | Acesso direto a `/ia` por `convidado` via URL → mensagem, nunca crash (defesa em profundidade) | Inspeção visual, `fetch` direto | ✅ |
| V7 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual | ✅ |
| V8 | `npm run build`/`npm run lint` (`apps/web`) sem erros | build/lint limpos | ✅ |

**Exit Criteria: T1-T5 e V1-V8 todos cumpridos.** Com este passo, o **Milestone M3 (Assistente de IA) fica formalmente concluído** — Passos 15-18 implementados, validados e aprovados.

### 3.9 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- `GET /ia/sugestoes` (`IaService.listarSugestoesPendentes()`) — nova permissão `ia.listar_sugestoes` (`admin_empresa`/`gestor` = `true`).
- `apps/web/src/app/(autenticado)/ia/page.tsx` — secções "Perguntar" e "Sugestões Pendentes" (condicional por papel), `Modal` de segunda confirmação, tratamento de `403`/`429`/`503`/`504`/`409`.
- `BarraLateralNavegacao` — item "Assistente de IA" (`Sparkles`, `lucide-react`), oculto para `convidado`.
- `apps/api/test/ia-sugestoes.e2e-spec.ts` — 3 testes adicionais (T11-T13) para `GET /ia/sugestoes`.

**Validação visual real no browser** (não só revisão de código) — Empresa de demonstração criada via `POST /auth/registar` + fixtures diretas em `nexa_dev` (Departamento, `gestor`, 2 `colaborador`, `convidado`, Processo em atraso), eliminada no fim da validação (mesmo mecanismo de limpeza dos testes e2e, trigger de imutabilidade do Registo de Auditoria desativado/reativado): fluxo completo ponta a ponta confirmado como `admin_empresa` — pergunta livre (erro do fornecedor tratado sem crash, ver nota abaixo), geração de sugestão, navegação cruzada para o Processo referenciado, confirmação via `Modal` com execução real da reatribuição (verificado diretamente na BD), e como `gestor` — geração adicional, rejeição sem `Modal`. Testado também com `colaborador` (secção "Sugestões Pendentes" ausente, `403` confirmado por `fetch` direto a `GET /ia/sugestoes`) e `convidado` (item de navegação ausente, acesso direto a `/ia` mostra mensagem sem crash, `403` confirmado por `fetch` direto a `POST /ia/perguntar`). Responsividade confirmada em 375px/768px/1280px.

**Nota de âmbito honesta (V2):** o ambiente local não tem uma credencial real do fornecedor Anthropic configurada (decisão já aprovada do M3 — "credenciais só via variáveis de ambiente, nunca reais em teste"), por isso o caminho de resposta bem-sucedida da pergunta livre não pôde ser observado visualmente com uma resposta real da IA nesta validação — o pedido `POST /ia/perguntar` foi confirmado a disparar corretamente e o erro `502` (fornecedor indisponível) foi tratado sem crash, com mensagem clara; o caminho de sucesso já está coberto por teste automatizado com `FakeAdapter` desde o Passo 16 (T1 desse ficheiro). Registado como honestidade de âmbito, não uma lacuna escondida.

**Sem descobertas técnicas emergentes além de uma correção operacional (não de código):** durante a validação visual, um clique inicial no botão "Perguntar" não disparou o pedido — investigação confirmou tratar-se de um artefacto do Fast Refresh do servidor de desenvolvimento a meio de uma edição concorrente (não um bug da página), resolvido ao repetir a interação; sem impacto em produção nem no código entregue.

**Resultados de validação:** `apps/api/test/ia-sugestoes.e2e-spec.ts` com 13 testes (122 + 13 = 135/135 na suite completa); `npm run build`/`npm run lint` limpos em `apps/api` e `apps/web`. **Milestone M3 (Assistente de IA) formalmente concluído** — Passos 15-18 implementados, validados e aprovados.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | `GET /ia/sugestoes` — sem parâmetro de filtro, sempre `estado='pendente'` (Decisão a Validar A) | A área é literalmente "Sugestões Pendentes" (Information Architecture §3.1); histórico de resolvidas fica fora de âmbito |
| D2 | Visibilidade de `GET /ia/sugestoes` = mesma regra de autoridade de confirmar/rejeitar (Decisão a Validar B) | Reutiliza a regra já validada no Passo 17, sem introduzir uma segunda noção de âmbito |
| D3 | Conversa sem histórico persistido — âmbito local à sessão do browser (Decisão a Validar C) | Nenhum FR/UC exige leitura de perguntas passadas; extensão de âmbito de produto, não uma correção técnica |
| D4 | Confirmação de sugestão exige um `Modal` de segundo passo; nunca ação em lote (Decisão a Validar D) | Torna a regra não-negociável #16 visível na interface, não só garantida estruturalmente no backend |
| D5 | Assistente de IA como item normal da barra lateral, não como elemento de posição transversal fixa (Decisão a Validar E) | A posição transversal é um dos 8 princípios explicitamente fora do âmbito funcional do MVP (Information Architecture §3.6) |
| D6 | Nova permissão `ia.listar_sugestoes` | Mesma granularidade já usada para `gerar_sugestoes`/`confirmar_sugestao`/`rejeitar_sugestao` |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Partilhar a lista de sugestões pendentes entre vários Gestores do mesmo Departamento (em vez de só quem gerou) | Produto, não estrutural — reavaliar se o uso real revelar necessidade | CEO + CTO, após validação com dados reais |
| 2 | Histórico de perguntas persistido e lido pela UI (2.2, Decisão C) | Nova extensão de âmbito, exigiria `GET /ia/historico` | CEO + CTO, em milestone futuro |
| 3 | Posição visual transversal do Assistente de IA (Information Architecture §3.6.6) | Já registada como capacidade arquitetural futura nesse documento, não uma questão nova | CEO + CTO, quando Pesquisa Global/Command Palette forem endereçados |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da proposta de Especificação Técnica do Passo 18 — sem implementação. Cinco Decisões a Validar (A-E): forma e escopo de `GET /ia/sugestoes` (extensão aditiva ao backend, herdada da Decisão F do Passo 17), âmbito local da conversa sem histórico persistido, `Modal` de segunda confirmação para tornar RN-08 visível na interface, posicionamento do Assistente de IA como item normal de navegação (refinação transversal fora do âmbito do MVP). Plano de testes backend T1-T5 e validação visual V1-V8 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.9 — Resultado da Implementação, após aprovação e implementação completa das 5 Decisões a Validar (A-E) tal como propostas. Validação visual real no browser confirmada em todos os papéis (`admin_empresa`, `gestor`, `colaborador`, `convidado`), incluindo execução real da reatribuição confirmada. Nota de âmbito honesta registada para V2 (sem credencial real do fornecedor Anthropic no ambiente local — caminho de sucesso já coberto por `FakeAdapter` desde o Passo 16). T1-T5/V1-V8 confirmados, 135/135 testes. **Milestone M3 (Assistente de IA) formalmente concluído** | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

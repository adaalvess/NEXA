# NEXA — Consolidação NFR-17 (Passo 32, M6)

| | |
|---|---|
| **Documento** | Consolidação da cobertura de teste automatizado dos 4 fluxos críticos (NFR-17) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 fluxos críticos + validação manual dos Use Cases), Passo 32 — primeiro passo do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado e Concluído (2026-07-09) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | NFR-17 (Non-Functional Requirements, 3.6); Security & Access Principles §3.9; Coding Standards §3.3; Proposta do Milestone M6 (aprovada em chat, 2026-07-08/09) |
| **Última atualização** | 2026-07-09 |

---

## 1. Objetivo

Confirmar formalmente, com evidência verificável (não apenas afirmada), que os 4 fluxos críticos definidos em NFR-17 — isolamento multi-tenant, RBAC, limites de plano, ações de IA — têm cobertura de teste automatizado real: testes que provariam genuinamente uma regressão, não apenas testes que passam independentemente da proteção estar ou não presente. Sem código novo, sem alteração de comportamento do sistema (Especificação Técnica do Passo 32).

---

## 2. Método

Para cada fluxo: (1) identificar o(s) ficheiro(s) de teste com cobertura direta; (2) ler as asserções reais, não apenas o nome do teste; (3) raciocinar explicitamente, por inspeção manual do código de produção correspondente, sobre o que aconteceria a cada asserção se a proteção fosse removida — só um teste que **falharia genuinamente** conta como cobertura real.

---

## 3. Resultado da Suite Completa

`npm run test:e2e` — **202/202 testes, 23 suites**, estável em 2 execuções consecutivas (2026-07-09), sem alterações ao código entre as duas execuções.

---

## 4. Mapeamento Fluxo Crítico → Testes → Lacunas

### 4.1 Isolamento Multi-Tenant

**Testes:** `tenant-isolation.e2e-spec.ts` (T1-T4), `tenant-context-http.e2e-spec.ts` (2 testes) — cobertura secundária em todos os `*.e2e-spec.ts` que criam duas Empresas e confirmam que uma nunca vê dados da outra (`convites` T18, `email-convite` T4, `rbac` T8/T17, etc.).

**O que prova genuinamente:**
- T1 (`findMany` sem filtro explícito) — se a injeção automática de `empresaId` (Camada 1, `TenantPrismaService`) fosse removida, devolveria as linhas de ambas as Empresas; o teste espera exatamente 1 (só da Empresa do `TenantContext`) — **falharia genuinamente**.
- T2 (`create` com `empresaId` de outra Empresa no `data`) — se a sobreposição pelo `TenantContext` real fosse removida, o `empresaId` gravado seria o injetado pelo chamador (`empresaB`); o teste espera o do `TenantContext` (`empresaA`) — **falharia genuinamente**.
- T3 (`update` sobre `id` de outra Empresa) — se o filtro cross-tenant fosse removido, a atualização teria sucesso e a linha da Empresa B ficaria alterada; o teste espera rejeição e a linha inalterada — **falharia genuinamente**.
- T4 (sem `TenantContext`) — se o Fail Secure fosse removido, a query executaria sem filtro nenhum; o teste espera um erro explícito — **falharia genuinamente**.
- `tenant-context-http`: prova a propagação real via HTTP (Middleware → Guard → Controller), não só o isolamento artificial de T1-T4 — se o `TenantContextMiddleware` não propagasse corretamente via `AsyncLocalStorage`, a Empresa B veria as 0 linhas esperadas mas por uma razão errada (contexto vazio, não isolamento); o teste complementar de 401 sem cookie prova que a ausência de sessão é tratada à parte.

**Lacunas identificadas:** as duas Camadas (1 — `TenantPrismaService`, 2 — RLS nativa do PostgreSQL) correm sempre **em conjunto** em todos os testes acima, nunca isoladamente — `TenantPrismaService` liga sempre como `nexa_app` (role sujeito a RLS) e define sempre `current_setting('app.current_empresa_id')` antes de cada query. Isto significa que os testes provam a proteção **combinada** (defesa em profundidade genuína — se uma camada falhar silenciosamente, a outra já a intercetaria na prática), mas nenhum teste isola deliberadamente uma camada da outra (ex: forçar Camada 1 a falhar e confirmar que a RLS sozinha ainda bloqueia, ou vice-versa). Não é uma lacuna de proteção real — é uma lacuna de **atribuição**: se uma das duas camadas regredisse silenciosamente, estes testes continuariam verdes enquanto a outra camada continuasse a proteger. Registada para avaliação futura, fora do âmbito deste passo (não introduz novo código de teste).

### 4.2 RBAC

**Testes:** `rbac.e2e-spec.ts` (T1-T17) — cobertura secundária em `partilha.e2e-spec.ts`, `processos.e2e-spec.ts`, `crm.e2e-spec.ts`, `departamento.e2e-spec.ts` (escopo de visibilidade por papel/posse/Departamento).

**O que prova genuinamente:**
- T3 (Gestor tenta promover a `admin_empresa`) — se a verificação de hierarquia (L2, `PRIVILEGIO`) fosse removida, o pedido teria sucesso (`200`); o teste espera `403` — **falharia genuinamente**.
- T4 (Gestor fora do seu Departamento) — se L3/RN-03 fosse removida, o pedido teria sucesso; o teste espera `403` — **falharia genuinamente**.
- T6 (tentativa de `super_admin`) — se a validação na fronteira única (DTO, L4/RN-04) fosse removida, o pedido chegaria ao serviço; o teste espera `400` antes disso — **falharia genuinamente**.
- T7 (demover o único admin) — se L5/RN-01 fosse removida, a Empresa ficaria sem nenhum `admin_empresa`; o teste espera `409` — **falharia genuinamente**.
- T8 (Utilizador de outra Empresa) — reforça isolamento estrutural (L6) especificamente no contexto de RBAC — se a Camada 1 não filtrasse a query de resolução do alvo, devolveria `200` sobre um Utilizador de outra Empresa; o teste espera `404`/rejeição — **falharia genuinamente**.
- T9/T10 (`RegraPermissao` override, ambas as direções) — se o override por Empresa fosse ignorado e só o `DEFAULT_PERMISSION_MATRIX` valesse, T9 (nega o que o default permitiria) e T10 (permite o que o default negaria) **falhariam genuinamente**, em direções opostas — prova que o override é lido e aplicado de facto, não apenas que existe no schema.
- T12/T13 (renovação deslizante de sessão) — se o limiar de renovação fosse removido/invertido, a sessão perto da expiração não seria renovada (T13 falharia) ou uma sessão longe da expiração seria escrita desnecessariamente (T12, verificado por ausência de escrita, falharia).

**Lacunas identificadas:** nenhuma nos mecanismos centrais de RBAC (hierarquia, `RegraPermissao`, sessão). O escopo de visibilidade por posse/Partilha está coberto, mas distribuído por vários ficheiros de domínio em vez de centralizado num único ficheiro RBAC — característica arquitetural conhecida (Decisão B do M2, visibilidade centralizada no `AuthorizationService`, consumida por cada módulo), não uma lacuna de proteção.

### 4.3 Limites de Plano

**Testes:** `comercial-enforcement.e2e-spec.ts` (T1-T12, RN-11/estado "limitada"), `ia-gateway.e2e-spec.ts` (T3, quota numérica `limiteUsoIA`), `comercial.e2e-spec.ts` (T4/T5, `QuotaService`).

**O que prova genuinamente:**
- `comercial-enforcement` T1-T5 (5 endpoints decorados, subscrição limitada) — se o `SubscricaoGuard`/decorator fosse removido, os pedidos teriam sucesso (`201`); os testes esperam `402`/`SUBSCRICAO_LIMITADA` — **falhariam genuinamente**.
- T6 (prova estrutural de uniformidade, comparação byte-a-byte Processos vs. IA) — se um módulo devolvesse uma mensagem/código diferente do outro, a comparação falharia — **falharia genuinamente** perante qualquer divergência introduzida por engano num módulo específico.
- T7/T8/T9 (edição, confirmação de sugestão, ações administrativas nunca bloqueadas) — se o decorator fosse aplicado indevidamente a estes endpoints (regressão de âmbito, RN-10), os pedidos seriam bloqueados; os testes esperam sucesso — **falhariam genuinamente** perante um alargamento indevido do bloqueio.
- `ia-gateway` T3 (quota excedida) — se a verificação de `limiteUsoIA` fosse removida, o pedido chegaria ao `FakeAdapter`; o teste confirma explicitamente que o adaptador **nunca é invocado** — **falharia genuinamente**.
- `comercial` T4 (Enterprise, `limiteUsoIA: null`) — se `null` fosse tratado como zero em vez de "sem limite", a Empresa Enterprise seria bloqueada; o teste espera nunca bloqueado — **falharia genuinamente**, prova a distinção correta de `null` (Decisão B, Passo 19).

**Lacunas identificadas:** **RN-10 (`limiteUtilizadores`/`limiteArmazenamentoMb`) não tem nenhum teste, porque o mecanismo de bloqueio ainda não existe** — decisão já registada como Questão em Aberto (Passo 30, Q1) e endereçada pela Proposta do M6 (Passo 33, a seguir a este). Não é uma lacuna de teste a corrigir aqui — é uma lacuna de funcionalidade, já planeada.

### 4.4 Ações de IA

**Testes:** `ia-sugestoes.e2e-spec.ts` (T1-T13), `ia-perguntar.e2e-spec.ts`, `ia-gateway.e2e-spec.ts`.

**O que prova genuinamente:**
- T1 (geração) — a asserção `sugestao.estado === 'pendente'` imediatamente após a geração é a prova direta de RN-08: se o sistema executasse a ação (reatribuição) no momento da geração, o estado já não seria `'pendente'` — **falharia genuinamente**.
- T5 (confirmação) — confirma que `Processo.responsavelId` só muda **depois** da chamada explícita a `POST /ia/sugestoes/:id/confirmar`, e que os 3 eventos de auditoria (`gerar`, `confirmar` de `SugestaoIA`, `atualizar` de `Processo`) são distintos — se a confirmação fosse redundante com a geração (RN-08 violada), a sequência de eventos não corresponderia; o teste falharia — **falharia genuinamente**.
- T6 (confirmar sugestão já aceite/rejeitada) e T7 (Processo alterado por outra via antes da confirmação, staleness) — se a revalidação antes de executar fosse removida, uma confirmação tardia sobre um estado já mudado teria sucesso silenciosamente; os testes esperam `409` — **falhariam genuinamente**.
- T4/T8 (autoridade de quem confirma/rejeita) — se a verificação de autoridade fosse removida, um `colaborador` ou um `gestor` sem relação com a sugestão conseguiria confirmar; os testes esperam `403` — **falhariam genuinamente**.
- `ia-gateway` T6 (circuit breaker) — se o limiar de falhas consecutivas não abrisse o circuito, uma sexta tentativa chegaria ao fornecedor; o teste confirma que não chega — **falharia genuinamente**.

**Lacunas identificadas:** nenhuma. A distinção estrutural sugestão/execução (tipos `PendingSuggestion`/`ConfirmedAction`, Passo 15) é reforçada por este conjunto de testes tanto ao nível de comportamento (T1/T5) como de autoridade (T4/T8) e de staleness (T6/T7) — as três dimensões que uma violação de RN-08 poderia assumir.

---

## 5. Conclusão

Os 4 fluxos críticos do NFR-17 têm cobertura de teste automatizado real e verificada por inspeção manual — não apenas testes que passam, mas testes cuja falha seria a consequência direta e imediata de uma regressão na proteção correspondente. Duas lacunas identificadas, ambas já registadas e sem impacto no fecho deste passo: (1) as duas camadas de isolamento multi-tenant não são testadas isoladamente uma da outra (só em conjunto — comportamento de defesa em profundidade genuíno, lacuna de atribuição, não de proteção); (2) RN-10 não tem testes porque ainda não existe como funcionalidade, resolvido pelo Passo 33 (já planeado na Proposta do M6).

**Passo 32 concluído.**

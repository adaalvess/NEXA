# NEXA — Especificação Técnica do Passo 14 (M2): Ecrãs (Frontend)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 14 — Ecrãs (Dashboard, Processos, CRM) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 14 — último passo do M2 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado — último passo do M2, Milestone concluído |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Especificação Técnica do Passo 13 (Design System) · Information Architecture v1.5 (§3.1, §3.3, §3.4) · Functional Specifications (§3.2, §3.3, §3.4) · ADR-006 (§3.4, §3.7) · ADR-004 · Blueprint v2.4 (§4, §5.2) |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, os ecrãs reais de `apps/web` que consomem as APIs já implementadas e aprovadas nos Passos 8-12 (Departamento, Processos, CRM, Notification Dispatcher, Dashboard), através dos 11 componentes do Design System aprovado no Passo 13. Este é o **último passo do Milestone M2** — o seu Definition of Done fecha o Milestone: os 3 módulos core (Dashboard, Processos, CRM) operacionais com CRUD completo, visibilidade RBAC verificada, e estado inicial guiado presente em todos os ecrãs sem dados (Blueprint, tabela de Milestones, linha M2).

Este documento também regista e resolve uma dependência técnica real encontrada durante a preparação (3.2.1) e propõe duas decisões de âmbito (3.1) que precisam de validação explícita antes de avançar, consistente com a disciplina já seguida em todos os passos anteriores.

---

## 2. Contexto

O backend do M2 está completo e aprovado (Passos 8-12) e o Design System está completo e aprovado (Passo 13, 11 componentes + tokens de marca). `apps/web` tem, para além disso, apenas o scaffolding do Passo 1: `app/layout.tsx` (fontes, `ToastProvider`), `app/page.tsx` (placeholder), e a vitrine `app/design-system/page.tsx`. Não existe ainda nenhum ecrã de produto, nenhuma camada de acesso a API no frontend, nenhuma gestão de sessão no browser, e nenhum `QueryClientProvider` (TanStack Query, já uma dependência instalada mas nunca configurada).

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Reutilização do Design System | Todos os ecrãs consomem exclusivamente os componentes de `apps/web/src/components/ui/` (Passo 13) — nenhum estilo ad-hoc, nenhuma duplicação de variantes já definidas (Blueprint, Decisão A do M2; Objetivo 2 do Design System). |
| B | API-first | Nenhum ecrã antecipa dados ou comportamento não coberto pelas APIs já aprovadas (Passos 8-12). Onde uma API estiver em falta para um ecrã planeado, a API é adicionada primeiro (ver 3.2.1), nunca contornada no frontend. |
| C | Frontend nunca decide RBAC | Confirmado por ADR-006 §3.7: o frontend apresenta o que a API já filtrou pelo escopo RBAC (`obterEscopoVisibilidade`); qualquer ocultação de botões/ações no frontend é conveniência de experiência, nunca o mecanismo de segurança — a mesma ação tentada diretamente contra a API é recusada pelo `AuthorizationService`, independentemente do que a interface mostra. |

---

## 3. Conteúdo Estruturado

### 3.1 Âmbito e Fora de Âmbito — Duas Decisões a Validar

O `CLAUDE.md` (§3, tabela do M2) descreve o Passo 14 como "Ecrãs (frontend) — Dashboard, Processos, CRM, estado inicial guiado". Isto não inclui, literalmente, nenhum ecrã de autenticação. Na prática, porém, **nenhum destes ecrãs é visualmente verificável no browser sem uma sessão autenticada** — a regra permanente de validação de UI ("testar a golden path... antes de reportar como completo") não pode ser cumprida sem conseguir entrar na aplicação. Proponho as duas decisões seguintes, ambas a validar explicitamente:

| # | Decisão proposta | Justificação |
|---|---|---|
| E1 | **Incluir um ecrã de Login mínimo** (`/login`) neste passo, como pré-requisito técnico de validação — apenas email/palavra-passe, chamando `POST /auth/login` já existente (Passo 3). | Sem isto, é impossível validar visualmente Dashboard/Processos/CRM no browser, violando a regra permanente de validação de UI. O ecrã é mínimo (2 campos, Input + Botao do Design System), não introduz nenhuma lógica nova. |
| E2 | **Excluir o ecrã de Registo e o ecrã de Configurações** deste passo — ficam para um passo futuro (Blueprint §5.2 já os lista como prioridade M1, mas nunca foram construídos; não bloqueiam a validação deste passo). Para criar utilizadores/empresas de teste durante a validação, uso `POST /auth/registar` diretamente (via API, já testado desde o Passo 3), não através de UI. | Mantém o âmbito deste passo disciplinado (Dashboard/Processos/CRM, conforme já planeado); Registo e Configurações não têm nenhuma dependência das APIs dos Passos 8-12, pelo que não há benefício em adiantá-los aqui. |

**Ecrãs cobertos por este passo, assumindo E1/E2 aprovadas:**

| Ecrã | Rota proposta | APIs consumidas |
|---|---|---|
| Login | `/login` | `POST /auth/login` |
| Dashboard | `/dashboard` | `GET /dashboard`, `GET /notificacoes`, `PATCH /notificacoes/:id/lida` |
| Processos — lista | `/processos` | `GET /processos` |
| Processos — detalhe | `/processos/:id` | `GET /processos/:id`, `PATCH /processos/:id`, `DELETE /processos/:id` |
| Processos — criar | `/processos/novo` | `POST /processos`, `GET /departamentos`, `GET /utilizadores` (3.2.1), `GET /clientes` |
| CRM — lista | `/crm` | `GET /clientes` |
| CRM — detalhe | `/crm/:id` | `GET /clientes/:id`, `PATCH /clientes/:id`, `GET /clientes/:id/interacoes`, `POST /clientes/:id/interacoes` |
| CRM — criar | `/crm/novo` | `POST /clientes`, `GET /utilizadores` (3.2.1) |
| CRM — pipeline | `/crm/pipeline` | `GET /pipeline` |

`BarraLateralNavegacao` (Blueprint §5.1, deixada para este passo) cobre a navegação entre estes ecrãs — árvore reduzida à profundidade do MVP (Information Architecture §3.1: Dashboard, Processos, CRM; Assistente de IA e Configurações aparecem na estrutura mas ficam desativados/ocultos, por serem de milestones futuros, nunca mostrados-mas-desativados por regra de UX já fixada em IA §3.2.3).

### 3.2 Pré-requisitos de API — Descoberta Técnica

#### 3.2.1 `GET /utilizadores` não existe — dependência real para os formulários de criação

Os formulários "Criar Processo" (`responsavelId`) e "Criar Cliente" (`ownerId`) precisam de listar Utilizadores da Empresa para popular um `Select`. Verifiquei o módulo `fundacao/auth/utilizadores.controller.ts` (Passos 5 e 8) e **não existe nenhum endpoint de listagem** — apenas `PATCH :id/papel` e `PATCH :id/departamento`, ambos por `id` já conhecido. Isto é uma lacuna real de API, não uma questão de frontend, e o princípio API-first (Decisão B, 2.1) exige resolvê-la antes de construir os formulários que dela dependem.

**Proposta:** adicionar `GET /utilizadores` ao `UtilizadoresController` já existente (`fundacao/auth/`), como parte deste passo (não um novo módulo, não um novo Passo numerado — é uma extensão mínima de um controlador já aprovado no Passo 5/8, na mesma família de responsabilidade):

- **Permissão:** nova chave `fundacao.listar_utilizadores` na `DEFAULT_PERMISSION_MATRIX` — `true` para `admin_empresa`/`gestor` (ambos já precisam de escolher responsáveis/owners), `false` para `colaborador`/`convidado` (não criam Processos/Clientes para terceiros — `colaborador` cria sempre para si próprio, `convidado` nunca cria).
- **Resposta:** lista reduzida — `{ id, nome, papel, departamentoId }` (nunca `email`/dados sensíveis desnecessários ao caso de uso de um `Select`).
- **Escopo:** sempre `empresaId` da sessão (via `TenantPrismaService`, Camada 1) — nenhuma alteração à Camada 1/RLS.
- **Sem alteração ao `AuthorizationService`** — é uma listagem simples por tenant, não uma pergunta de visibilidade RBAC por entidade (não há "dono" de um Utilizador do ponto de vista de posse, ao contrário de Processo/Cliente).

Isto é a única alteração ao backend proposta neste passo — todo o resto do Passo 14 é exclusivamente `apps/web`.

### 3.3 Estrutura de Rotas (Next.js App Router)

```
apps/web/src/app/
  login/
    page.tsx                    # público
  (autenticado)/                # route group — layout partilhado com sessão + shell
    layout.tsx                  # AppShell: BarraLateralNavegacao + verificação de sessão
    dashboard/
      page.tsx
    processos/
      page.tsx                  # lista
      novo/page.tsx              # criar
      [id]/page.tsx              # detalhe/editar
    crm/
      page.tsx                   # lista
      novo/page.tsx              # criar
      pipeline/page.tsx
      [id]/page.tsx              # detalhe
  design-system/                 # já existe (Passo 13), inalterado
  page.tsx                       # placeholder do Passo 1 → passa a redirecionar para /dashboard ou /login consoante sessão
  layout.tsx                     # já existe (Passo 1/13) — raiz, sem alteração de fontes/ToastProvider
```

O grupo de rotas `(autenticado)` (parênteses — não aparece no URL, só organiza o layout partilhado) isola a verificação de sessão e o `BarraLateralNavegacao` num único `layout.tsx`, sem repetir a lógica em cada ecrã — mesmo princípio de "nenhuma lógica duplicada" já aplicado no backend (`AuthorizationService` centralizado).

### 3.4 Sessão no Frontend

- **Cliente de API** (`apps/web/src/lib/api.ts`, novo): wrapper único sobre `fetch`, base URL de `process.env.NEXT_PUBLIC_API_URL`, sempre `credentials: 'include'` (obrigatório — CORS do backend já configurado com `credentials: true` e origem restrita a `WEB_APP_URL`, Passo 3/4). Nenhum ecrã chama `fetch` diretamente — mesma disciplina de "camada de acesso única" já aplicada no backend à base de dados (regra não-negociável #6), aplicada agora ao acesso à API no frontend.
- **Verificação de sessão**: o `layout.tsx` do grupo `(autenticado)` chama `GET /auth/eu` (já existente, Passo 3) num Server Component; se `401`, redireciona para `/login` (`redirect()` do Next.js). Nenhuma lógica de sessão duplicada no cliente — o backend continua a ser a única fonte de verdade sobre quem está autenticado (Security & Access Principles).
- **`papel` no frontend**: guardado em memória (React Context, populado pela resposta de `GET /auth/eu` no layout) exclusivamente para decisões de **conveniência de UX** (2.1, Decisão C) — nunca persistido em `localStorage`/cookie legível por JS, nunca usado para decidir dados, apenas para ocultar/mostrar botões de ação.
- **Atributo `Secure` do cookie de sessão em desenvolvimento local**: o cookie `nexa_session` (Passo 3/4) usa `secure: true`. Browsers modernos (Chrome, Firefox) tratam `http://localhost` como "origem potencialmente segura" e permitem cookies `Secure` mesmo sem HTTPS — não antecipo um problema real, mas **fica como item de verificação empírica nos Exit Criteria (T1)**, não uma alteração à Camada de Autenticação (regra não-negociável #11 mantém-se intacta); só se a verificação falhar na prática é que este documento voltará com uma proposta concreta, nunca decidida preventivamente sem evidência.

### 3.5 TanStack Query — Configuração

- `QueryClientProvider` adicionado no `layout.tsx` raiz (precisa de um Client Component boundary — `apps/web/src/app/providers.tsx`, novo, encapsulando `QueryClientProvider` + o `ToastProvider` já existente).
- Convenção de `queryKey`: `['processos', id?]`, `['clientes', id?]`, `['dashboard']`, `['notificacoes']`, `['pipeline']`, `['utilizadores']`, `['departamentos']` — namespaced por recurso, mesmo padrão da rota de API.
- `GET /dashboard`: `refetchInterval: 30_000` (30 segundos) — cumpre literalmente NFR-04 ("atraso máximo 30 segundos", Functional Specifications §3.2).
- Mutations (`POST`/`PATCH`/`DELETE`) invalidam a `queryKey` correspondente via `queryClient.invalidateQueries` — nunca gestão de estado manual paralela ao cache do TanStack Query.

### 3.6 Ecrã: Login (`/login`)

Formulário mínimo — `Input` (email), `Input` (password, `type="password"`), `Botao` (submit, estado `carregando` durante o pedido). Chama `POST /auth/login`; sucesso → `router.push('/dashboard')`; erro (`401`) → toast `erro` ("Credenciais inválidas"), sem revelar se o email existe (mesma disciplina de segurança já aplicada no backend, Passo 3).

### 3.7 Ecrã: Dashboard (`/dashboard`)

- Estado guiado (`estadoInicial: true`): dois `EstadoVazioGuiado`, um por sugestão (`criar_processo` → `/processos/novo`, `criar_cliente` → `/crm/novo`) — literal já resolvido no Passo 13, §3.6.
- Estado normal: `Cartao` por indicador (`processos.total`, `processos.emAtraso`, `clientes.total`, `clientes.comOportunidadeAtiva`, `notificacoes.naoLidas`), `BadgeEstado` para a distribuição `porEstado`.
- Lista de notificações recentes (via `GET /notificacoes`) — cada uma com ação "marcar como lida" (`PATCH .../lida`), usando `MenuDropdown` ou botão inline conforme melhor se ajustar visualmente (decisão de detalhe na implementação, não estrutural).

### 3.8 Ecrãs: Processos

- **Lista** (`/processos`): `TabelaDados` (colunas: título, responsável — nome via `utilizadores` já carregado, estado via `BadgeEstado`, prazo), estado vazio via `EstadoVazioGuiado` ("Criar Processo" → `/processos/novo`), botão "Novo Processo" sempre visível (a API decide se `POST` é permitido; `403` tratado com toast, não bloqueia a navegação ao formulário — mesma disciplina de "frontend nunca é o mecanismo de segurança").
- **Detalhe** (`/processos/:id`): campos em `Cartao`, edição inline ou modal (`Modal`) para `PATCH`, botão "Eliminar" condicionalmente oculto se `papel === 'colaborador' || papel === 'convidado'` (conveniência de UX, 2.1 Decisão C — a API já recusa de qualquer forma).
- **Criar** (`/processos/novo`): formulário com `Input` (título, descrição), `Select` (responsável — de `GET /utilizadores`, departamento — de `GET /departamentos`, cliente — de `GET /clientes`, todos opcionais exceto responsável), submissão `POST /processos`.

### 3.9 Ecrãs: CRM

- **Lista** (`/crm`): `TabelaDados` (nome, tipo, contacto principal, estado da oportunidade via `BadgeEstado`), estado vazio via `EstadoVazioGuiado` ("Criar Cliente" → `/crm/novo`).
- **Detalhe** (`/crm/:id`): dados do Cliente em `Cartao`, lista de Interações (ordenada por data, `GET .../interacoes`), formulário de nova Interação (`Select` tipo, `Input` descrição) — bloqueado com aviso inline se `contactoPrincipal` estiver vazio (CR-06, já validado no backend; o frontend replica a mensagem apenas para dar feedback imediato, a validação real continua a ser do backend).
- **Criar** (`/crm/novo`): `Input` (nome, contacto principal), `Select` (tipo, owner via `GET /utilizadores`), submissão `POST /clientes`.
- **Pipeline** (`/crm/pipeline`): 4 colunas (uma por `EstadoOportunidade`), cada `Cliente` como `Cartao` dentro da coluna correspondente — sem drag-and-drop nesta fase (não pedido, YAGNI); mudança de estado feita a partir do ecrã de detalhe (`PATCH /clientes/:id`). Oculto da navegação para `colaborador`/`convidado` (`ver_pipeline: false`).

### 3.10 Tratamento de Erros e Estados de Carregamento

- **`401` em qualquer pedido**: redireciona para `/login` (sessão expirada) — tratado centralmente no `lib/api.ts`, nunca ecrã a ecrã.
- **`403`**: toast `erro` genérico ("Não tens permissão para esta ação") — nunca um ecrã em branco ou crash.
- **Carregamento**: `TabelaDados` já suporta `carregando` (skeleton, Passo 13); formulários usam o estado `carregando` do `Botao` já existente.

### 3.11 Acessibilidade e Responsividade

Sem requisitos novos — herdados do Passo 13 (Radix UI para `Select`/`Modal`/`MenuDropdown`/`NotificacaoToast`, contraste WCAG AA já validado nos tokens, breakpoints Tailwind por defeito). Cada ecrã novo é validado visualmente nos mesmos 3 breakpoints já usados no Passo 13 (375px/768px/1280px).

### 3.12 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| ADR-006 §3.4, §3.7 | ✅ TanStack Query para todo estado de servidor; frontend nunca decide RBAC |
| Blueprint (Decisão A do M2) | ✅ Todas as APIs consumidas já estão implementadas e aprovadas (exceto 3.2.1, adicionada antes de qualquer UI que dela dependa) |
| Information Architecture §3.2.3 | ✅ Itens de navegação condicionados por RBAC simplesmente não aparecem, nunca "mostrado mas desativado" |
| NFR-04 (Functional Specifications §3.2) | ✅ `refetchInterval: 30_000` no Dashboard |

**Risco R1 — `GET /utilizadores` (3.2.1) introduz a primeira alteração ao backend depois do M2 ter sido declarado "backend concluído":** aceite conscientemente — é uma extensão mínima e estritamente aditiva (novo endpoint, nova chave de permissão), sem alterar nenhum contrato existente dos Passos 8-12, e sem a qual os formulários de criação não seriam de todo implementáveis sem violar API-first.

**Risco R2 — âmbito deste passo é o maior de todo o M2** (3 módulos, 9 rotas, sessão, roteamento, camada de dados): mitigado propondo, se a Fundadora/CEO preferir, dividir a implementação em sub-entregas sequenciais dentro do mesmo passo (ex: Login+Dashboard primeiro, depois Processos, depois CRM), cada uma validada visualmente antes de avançar para a seguinte — sem necessitar de uma Especificação Técnica separada por sub-entrega, já que a arquitetura é toda definida aqui de uma vez.

### 3.13 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Login com utilizador de teste (criado via `POST /auth/registar`) estabelece sessão; cookie `nexa_session` confirmado presente e enviado em pedidos subsequentes (verificação empírica do risco de `Secure` em `localhost`, 3.4) | ✅ confirmado — o cookie `Secure` funciona corretamente em `http://localhost` (exceção de "origem potencialmente segura" dos browsers modernos); sessão sobrevive a recarregamento completo da página; nenhuma mitigação necessária (fecha a Questão em Aberto 2) |
| T2 | Dashboard mostra estado guiado com Empresa vazia; após criar 1 Processo e 1 Cliente, mostra indicadores corretos | ✅ |
| T3 | Lista de Processos filtra corretamente por papel (testado com `admin_empresa`, `gestor`, `colaborador`) — mesmo escopo já devolvido por `obterEscopoVisibilidade`, sem lógica adicional no frontend | ✅ |
| T4 | Criar/editar/eliminar Processo funcional end-to-end; botão "Eliminar" oculto para `colaborador`/`convidado` | ✅ |
| T5 | Lista de Clientes, detalhe com Interações, criação de Interação bloqueada corretamente sem `contactoPrincipal` | ✅ |
| T6 | Pipeline mostra 4 colunas corretas, oculto da navegação para `colaborador`/`convidado` | ✅ |
| T7 | `401` redireciona para `/login`; `403` mostra toast, nunca crash | ✅ |
| T8 | Responsivo em 375px/768px/1280px, sem quebras | ✅ |
| T9 | `npm run build` e `npm run lint` (`apps/web`) sem erros; `npm run build`/testes (`apps/api`) sem erros após adicionar `GET /utilizadores` | ✅ |

**Exit Criteria:** T1-T9 confirmados por inspeção visual real no browser (preview) e testes automatizados no backend para o novo endpoint (3.2.1) — mesma disciplina já exigida em todos os passos anteriores. Cumprido este passo, **o Milestone M2 (Módulos Core) fica formalmente concluído**.

### 3.14 Resultado da Implementação e Evidências de Validação

Implementado em 3 sub-entregas sequenciais, cada uma validada visualmente no browser e aprovada formalmente pela Fundadora/CEO antes de avançar para a seguinte (Questão em Aberto 1, resolvida por esta abordagem).

**Sub-entrega 1 — Login + Dashboard:**
- Entregue: `lib/api.ts` (cliente único de API), `lib/sessao-context.tsx`/`lib/sessao-servidor.ts` (sessão, `papel` só em memória), `app/providers.tsx` (TanStack Query + Toast), `/login`, `(autenticado)/layout.tsx` (guarda de sessão via `GET /auth/eu`), `BarraLateralNavegacao`, `/dashboard`.
- **Descoberta 1 — `POST /auth/logout` não existia.** O Passo 3 nunca o implementou (só registo/login/verificação). Adicionado como extensão do `AuthController`/`AuthService` já existentes: invalida a `Sessao` na BD (nunca só o cookie), limpa o cookie na resposta, emite evento de auditoria `logout`. 3 novos testes e2e.
- **Descoberta 2 — sidebar sem responsividade real.** A largura fixa de 240px cortava o conteúdo principal em ecrãs `<768px`. Corrigido com um padrão de *drawer* sobreposto em mobile (cabeçalho com botão de menu, `BarraLateralNavegacao` fixa só a partir de `md`).
- Validação de logout pedida explicitamente pela Fundadora/CEO antes de aprovar a sub-entrega: invalidação de sessão confirmada (BD + `401` subsequente), redirecionamento de rotas protegidas confirmado, botão "Voltar" do browser não expõe conteúdo autenticado (testado duas vezes), cache do TanStack Query limpa (`queryClient.clear()`, confirmado sem fuga de dados ao trocar de utilizador/Empresa).

**Sub-entrega 2 — Processos:**
- Entregue: `/processos` (lista), `/processos/novo` (criação), `/processos/[id]` (detalhe, mudança de estado inline, edição via `Modal`, eliminação).
- **Descoberta 3 — sem componente `Textarea`.** Nenhum dos 11 componentes do Passo 13 cobria texto multi-linha. Adicionado como extensão mínima e coerente do Design System, mesmo padrão visual do `Input`.
- **Descoberta 4 — `TabelaDados` recortava colunas em ecrãs estreitos.** Em vez de reduzir/scrollar, cortava conteúdo (`Estado`/`Prazo`) silenciosamente fora do viewport em 375px. Corrigido no próprio componente partilhado (`overflow-x-auto`) — benefício automático para a lista de Clientes na Sub-entrega 3, sem código adicional.
- RBAC validado com um utilizador `colaborador` real (criado diretamente na BD de desenvolvimento, já que não existe endpoint de convite — UC-02 continua fora de âmbito): formulário de criação esconde responsável/departamento, lista mostra âmbito correto, "Eliminar" ausente. Confirmação de defesa em profundidade: `DELETE` direto via `fetch` como colaborador devolveu `403` mesmo com o botão ausente da UI.

**Sub-entrega 3 — CRM:**
- Entregue: `/crm` (lista), `/crm/novo` (criação), `/crm/[id]` (detalhe + Interações), `/crm/pipeline` (4 colunas por `estadoOportunidade`).
- **CR-06 validado end-to-end**: Cliente sem contacto → aviso inline + botão de Interação desativado → edição para adicionar contacto → aviso desaparece → Interação registada com sucesso.
- **RBAC por posse (CR-02/CR-03) validado**: `colaborador` vê só os Clientes de que é owner; formulário de criação atribui-se sempre a si próprio; "Editar" e registo de Interação aparecem corretamente no Cliente que o próprio colaborador possui (posse decide, não papel).
- **Pipeline**: mudança de estado no detalhe refletida corretamente nas colunas; oculto da navegação para `colaborador`/`convidado`; acesso direto por URL devolve `403` tratado com mensagem, nunca um crash (T7).

**Resultados finais de validação:**
- Backend: 109/109 testes (102 herdados do M2 + 7 novos deste passo: 4 para `GET /utilizadores`, 3 para `POST /auth/logout`).
- Frontend: `npm run build` e `npm run lint` (`apps/web`) limpos em todas as 3 sub-entregas.
- Responsividade confirmada em 375px/768px/1280px em todos os ecrãs novos.

**Exit Criteria T1-T9: todos cumpridos**, confirmados por inspeção visual real no browser em cada sub-entrega — nunca apenas por revisão de código. **Milestone M2 (Módulos Core) formalmente concluído.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Incluir ecrã de Login mínimo neste passo (E1, 3.1) | Pré-requisito técnico inevitável para validar visualmente qualquer outro ecrã deste passo |
| D2 | Excluir Registo e Configurações deste passo (E2, 3.1) | Mantém o âmbito disciplinado; utilizadores de teste criados via API diretamente |
| D3 | Adicionar `GET /utilizadores` ao controlador já existente, não um novo módulo/Passo (3.2.1) | Extensão mínima e aditiva, estritamente necessária para os formulários de criação já planeados |
| D4 | `papel` do Utilizador guardado em memória (Context) no frontend, nunca em `localStorage` | Reduz superfície de exposição; usado só para conveniência de UX, nunca para decisões de segurança (2.1, Decisão C) |
| D5 | Sem drag-and-drop no Pipeline nesta fase | Não pedido por nenhum FR/US; mudança de estado via ecrã de detalhe já cobre o fluxo funcional (YAGNI) |
| D6 | Adicionado `POST /auth/logout` (Descoberta 1, 3.14) | Lacuna real do Passo 3; pedido explicitamente para validação antes de aprovar a Sub-entrega 1 |
| D7 | Adicionado componente `Textarea` ao Design System (Descoberta 3, 3.14) | Extensão mínima e coerente, necessária para todos os campos `descricao` (Processo/Cliente/Interação) |
| D8 | `TabelaDados` ganhou scroll horizontal em vez de recortar colunas em ecrãs estreitos (Descoberta 4, 3.14) | Correção ao componente partilhado do Passo 13, beneficia todos os usos futuros sem código adicional |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | ~~Divisão da implementação em sub-entregas sequenciais~~ — **Resolvida.** Aprovada pela Fundadora/CEO: Login+Dashboard → Processos → CRM, cada uma validada e aprovada antes da seguinte | Nenhum | Resolvida em 2026-07-07 |
| 2 | ~~Se a verificação empírica de T1 falhar, propor mitigação~~ — **Resolvida, sem impacto.** O cookie `Secure` funciona corretamente em `localhost`; nenhuma alteração à Autenticação/Camada 1 foi necessária | Nenhum | Resolvida em 2026-07-07 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da especificação técnica do Passo 14: âmbito (Login incluído, Registo/Configurações excluídos), estrutura de rotas, sessão no frontend, TanStack Query, os 9 ecrãs/rotas, tratamento de erros, e a descoberta técnica de `GET /utilizadores` em falta (proposta como extensão mínima ao backend já existente) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.14 — Resultado da Implementação, após as 3 sub-entregas (Login+Dashboard, Processos, CRM) validadas e aprovadas sequencialmente: 4 descobertas reais documentadas (`POST /auth/logout` em falta; sidebar sem responsividade; componente `Textarea` em falta; `TabelaDados` sem scroll horizontal); Decisões D6-D8 adicionadas; Questões em Aberto 1 e 2 resolvidas; T1-T9 confirmados. **Milestone M2 formalmente concluído** | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |

# NEXA — Especificação Técnica do Passo 31 (M5): Ecrã de Convite (Envio + Aceitação) — Fecha o Bloco C e o Milestone M5

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 31 — ecrã de envio e aceitação de Convites (UC-02) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 31 — último passo do Bloco C, fecha formalmente o Milestone M5 |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-02; Information Architecture §3.4 (Configurações — Utilizadores/Permissões, condicionado a Administrador/Gestor); Especificação Técnica do Passo 26 (Registo público, encadeamento registar+login); Especificação Técnica do Passo 28 (Ecrã "Configurações", `SeccaoUtilizadores`/`SeccaoDepartamentos`, padrão `Modal`+`TabelaDados`); Especificação Técnica do Passo 30 (`POST /convites`, `GET /convites/:token`, `POST /convites/:token/aceitar`, CV-01 a CV-06) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Consumir os três endpoints já implementados e aprovados no Passo 30 num ecrã real: (1) um formulário de envio de convite, para `admin_empresa`/`gestor`, dentro do ecrã "Configurações" já existente; (2) um ecrã público de aceitação, em `/convites/:token`, onde a pessoa convidada vê o contexto do convite e define a sua própria palavra-passe. Último passo do Bloco C — a sua conclusão fecha formalmente o Milestone M5.

---

## 2. Contexto

Toda a lógica de negócio, autoridade e validação já está resolvida e aprovada no Passo 30 — este passo é interface pura, sem nenhuma nova regra de produto. A Information Architecture (§3.4) já coloca "Utilizadores e Permissões" (condicionado a Administrador/Gestor) dentro de "Configurações" — o mesmo local onde `SeccaoUtilizadores.tsx` (Passo 28) já lista e edita Utilizadores existentes.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Onde vive o formulário de envio — dentro de `SeccaoUtilizadores.tsx` (Configurações), ou uma página/rota nova?** | **Dentro de `SeccaoUtilizadores.tsx`** — a Information Architecture (§3.4) já fixa este local ("Configurações → Utilizadores e Permissões"), e o `Modal` de criação já está estabelecido como padrão nesta mesma página (`SeccaoDepartamentos.tsx`, Passo 28) para o mesmo tipo de ação ("Novo Departamento" → botão + `Modal` com formulário). Reaproveita a UI já existente (mesma `TabelaDados` de Utilizadores fica visível por baixo) em vez de introduzir uma rota/nav item novos para uma ação que a arquitetura de informação já colocou noutro lugar. |
| B | **Adicionar `GET /convites` (listagem de convites pendentes/enviados) neste passo, para o Administrador/Gestor ver o que já convidou?** Não estava no âmbito literal do Passo 30 (fixado a 3 endpoints) nem deste passo (fixado a "envio + aceitação"). | **Não adicionar.** Mesma disciplina já registada como Questão em Aberto Q2 do Passo 30 (reenvio/revogação de convite, fora de âmbito) — uma listagem sem ação de reenvio/revogação teria valor limitado, e introduzi-la agora alargaria o âmbito de um passo já fixado como "envio + aceitação". CV-06 (Passo 30) já dá feedback claro ao Administrador se tentar convidar duas vezes o mesmo email (`409`, mensagem explícita) — suficiente para este MVP. Registar como melhoria futura, junto de Q2. |

---

## 3. Conteúdo Estruturado

### 3.1 Formulário de Envio — `SeccaoUtilizadores.tsx` (Configurações)

Botão "Convidar Utilizador" no cabeçalho da secção (mesmo padrão visual do botão "Novo Departamento" em `SeccaoDepartamentos.tsx`) abre um `Modal` com formulário: `email` (`Input type="email"`, obrigatório), `papel` (`Select`, reaproveitando as 4 opções já usadas em `SeccaoUtilizadores.tsx` — **sem filtrar por privilégio do ator** (Decisão D3 do Passo 28, já estabelecida: "sem restrição adicional às opções oferecidas a um Gestor — L2/L3 continuam só verificadas no backend", mesmo princípio aplicado aqui, nunca uma segunda cópia de regra de autoridade no frontend), `departamentoPretendidoId` (`Select`, **só visível para `admin_empresa`** — Decisão de implementação, não de produto: o backend (CV-03, Passo 30) já força sempre o Departamento do próprio Gestor quando quem convida é Gestor, tornando um seletor editável para esse papel enganador — mostraria uma escolha que nunca é a que efetivamente se aplica).

`PAPEIS_ATRIBUIVEIS` (lista de opções papel→rótulo) **extraída para `apps/web/src/lib/tipos.ts`** — reutilizada tal-e-qual por `SeccaoUtilizadores.tsx` (edição de papel existente, já implementado) e pelo novo formulário de convite, evitando uma segunda definição da mesma lista (mesmo espírito da extração de `PRIVILEGIO` no backend, Passo 30).

`POST /convites` via `useMutation` (mesmo padrão de `mutationGuardar` em `SeccaoDepartamentos.tsx`): sucesso → toast "Convite enviado para {email}." + fecha o `Modal`, sem invalidar `['utilizadores']` (nenhum Utilizador foi criado ainda, só um convite). Erro (`409`/`404`/`502`/`500`) → toast com a mensagem exata do backend (mesmo padrão já estabelecido em toda a aplicação desde o Passo 26), nunca uma mensagem genérica que esconda a causa real.

### 3.2 Ecrã Público de Aceitação — `apps/web/src/app/convites/[token]/page.tsx`

Novo Client Component público (mesmo nível de `/registar`, `/login`, `/precos` — fora do grupo `(autenticado)`), estrutura visual idêntica à de `/registar/page.tsx` (cartão centrado).

1. Ao montar, `GET /convites/:token` via `useQuery`.
2. **Estado de carregamento**: mensagem simples ("A carregar convite...").
3. **Convite inválido** (`404`) ou **já não disponível** (`estado !== 'pendente'` ou `expirado: true`, devolvidos por `GET /convites/:token`): mensagem clara e distinta para cada caso ("Este convite não existe ou já foi usado." / "Este convite expirou — pede à Empresa para enviar um novo.") + link para `/login`. Nunca um crash, nunca o formulário de palavra-passe apresentado às cegas.
4. **Convite válido**: mostra o contexto antes de pedir qualquer dado — "Foste convidado para te juntares a **{empresaNome}** como **{papel}**" (Decisão A do Passo 30, agora concretizada na interface) — seguido do formulário (`nome`, `password`, mesmos limites de `RegistarDto`/`AceitarConviteDto` — `minLength`/`maxLength` no HTML, mesmo padrão de `/registar`).
5. Submissão: `POST /convites/:token/aceitar` → sucesso → **encadeia imediatamente `POST /auth/login`** com o email do convite (devolvido por `GET /convites/:token`) e a password submetida — **reutilização literal do padrão já aprovado no Passo 26** (`/registar`: `try { login } catch { toast aviso + router.push('/login') }`), nunca um segundo mecanismo de auto-login. Sucesso do login → `router.push('/dashboard')`. Erro na aceitação (`409`/`404`) → toast com a mensagem exata do backend.

### 3.3 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| Information Architecture §3.4 | ✅ Formulário de envio no local já fixado ("Configurações → Utilizadores e Permissões") |
| ADR-006 §3.7 (frontend nunca é o mecanismo de segurança) | ✅ Papel sem filtro client-side (Decisão D3 do Passo 28, reaplicada); Departamento oculto para Gestor é UX, não segurança — o backend já decide/força de qualquer forma |
| Regra não-negociável #3 (API-first) | ✅ Nenhuma lógica nova de negócio no frontend — só consumo dos 3 endpoints já aprovados no Passo 30 |
| Padrão de encadeamento login (Passo 26) | ✅ Reutilizado literalmente na aceitação, nunca um segundo mecanismo |

**Nenhum novo endpoint. Nenhuma alteração de schema. Nenhum novo ADR necessário.**

### 3.4 Critérios de Aceitação e Exit Criteria (planeados)

Validação por **inspeção visual real no browser** (mesma disciplina de todos os passos de frontend anteriores), não só revisão de código:

| # | Cenário |
|---|---|
| V1 | `admin_empresa` vê o botão "Convidar Utilizador" em Configurações; `Modal` abre com os 3 campos, `departamentoPretendidoId` visível |
| V2 | `gestor` vê o mesmo botão; `Modal` sem o campo de Departamento |
| V3 | `colaborador`/`convidado` nunca veem a secção "Utilizadores e Permissões" (já garantido desde o Passo 28, sem alteração) |
| V4 | Envio com sucesso — toast de confirmação, `Modal` fecha; tentativa de reenvio ao mesmo email — toast com a mensagem exata do backend (`409`, CV-06) |
| V5 | `/convites/:token` com token inválido — mensagem clara, sem crash |
| V6 | `/convites/:token` com token expirado (manipulado diretamente na BD para o teste) — mensagem de expiração |
| V7 | `/convites/:token` válido — contexto do convite visível (Empresa/papel) antes do formulário; aceitação com sucesso → autenticado em `/dashboard` sem passo manual extra; `Utilizador` criado com o papel/Departamento corretos (confirmado na BD) |
| V8 | Aceitar o mesmo convite uma segunda vez (já aceite) — mensagem clara, sem crash |
| V9 | Responsivo sem quebras em 375px/768px/1280px; zero erros de consola |

`npm run build`/`npm run lint` (`apps/web`) sem erros. Sem testes automatizados de API novos (os 3 endpoints já têm cobertura completa desde o Passo 30).

**Exit Criteria:** V1-V9 confirmados por validação visual real no browser.

### 3.5 Resultado da Implementação

- **`PAPEIS_ATRIBUIVEIS`** extraída para `apps/web/src/lib/tipos.ts` — reutilizada tal-e-qual por `SeccaoUtilizadores.tsx` (edição de papel existente, já implementado no Passo 28) e pelo novo formulário de Convite, sem uma segunda definição.
- **`SeccaoUtilizadores.tsx`** — botão "Convidar Utilizador" + `Modal` com `email`/`papel`/`departamento` (este último só para `admin_empresa`), `useMutation` sobre `POST /convites`.
- **`apps/web/src/app/convites/[token]/page.tsx`** — Client Component público, `GET /convites/:token` via `useQuery`, três estados distintos e claros (carregamento / indisponível — token inexistente, já usado, ou expirado, com mensagens diferentes para cada — / válido com contexto + formulário), aceitação seguida de `POST /auth/login` (mesmo padrão do Passo 26).
- **Descoberta operacional real, sem impacto no código**: cache do servidor de desenvolvimento (`.next`) desatualizado a meio da validação (`npm run build` a correr antes do preview) — mesma classe de problema já documentada nos Passos 13/25/29, corrigido apagando `.next` e reiniciando o servidor.
- **Validação por inspeção visual real no browser** — Empresa de demonstração criada via API + fixtures diretas em `nexa_dev` (mesmo mecanismo dos Passos 18/29), eliminada no fim da validação. Confirmado: `admin_empresa` vê o formulário completo com Departamento; `gestor` vê o mesmo formulário sem o campo de Departamento; `colaborador` nunca vê a secção; envio com sucesso e reenvio duplicado mostram a mensagem exata do backend; falha real do envio de email (sem credencial Resend real neste ambiente, mesma limitação honesta já registada desde o Passo 18) mostra o erro `502` do backend sem crash, `Modal` permanece aberto para nova tentativa; token inexistente/expirado/já aceite mostram três mensagens distintas, nunca um formulário às cegas; aceitação com sucesso cria o `Utilizador` com o papel/Departamento corretos (confirmado na BD), convite passa a `estado: aceite`, encadeamento de login funciona e a pessoa fica autenticada em `/dashboard` sem passo manual extra; responsivo sem quebras em 375px/768px; zero erros de consola em todo o fluxo.
- **`npm run build`/`npm run lint`** (`apps/web`) sem erros. Sem alteração ao backend nem testes automatizados novos de API (os 3 endpoints já cobertos desde o Passo 30).
- **Com este passo aprovado, o Bloco C do M5 (UC-02, Convite por email) está formalmente concluído — e, com ele, o Milestone M5 (Camada Comercial e Produto) está formalmente concluído.**

---

## 4. Aprovação

Decisões A e B aprovadas pela Fundadora/CEO em 2026-07-08, sem alterações.

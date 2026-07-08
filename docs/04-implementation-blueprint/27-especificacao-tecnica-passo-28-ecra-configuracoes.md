# NEXA — Especificação Técnica do Passo 28 (M5): Ecrã "Configurações" — Fecha o Bloco B do M5

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 28 — Ecrã "Configurações" (Perfil, Utilizadores/Permissões, Departamentos) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 28 — segundo e último passo do Bloco B |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) — Bloco B do M5 concluído |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08); Information Architecture §3.1 (árvore de navegação "Configurações"); Especificação Técnica do Passo 27 (`PATCH /utilizadores/me`); Especificações Técnicas dos Passos 5/8/14 (`atribuir_papel`, `atribuir_departamento`, CRUD de `Departamento`, `GET /utilizadores`) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Construir `/configuracoes` — o único ecrã novo deste passo, agregando três capacidades que já existem ao nível de API mas nunca tiveram interface: self-edit de Perfil (Passo 27, novo), gestão de Utilizadores/Permissões (papel, Departamento — Passos 5/8/14), e CRUD de Departamentos (Passo 8). Fecha o Bloco B e, com ele, o único bloco do M5 sem UI pendente até este ponto.

---

## 2. Contexto

Antes de desenhar o ecrã, confirmei o que a Information Architecture já define: a árvore de navegação (§3.1) lista **4** sub-áreas dentro de "Configurações" — Perfil pessoal, Empresa (dados, plano, subscrição), Utilizadores e Permissões, Departamentos e Equipas. "Empresa" já foi implementada como o ecrã independente `/subscricao` (Passo 23, Decisão C — "nunca uma secção 'Configurações' completa"), por isso as 3 restantes são exatamente o âmbito deste passo. Nenhum texto da Information Architecture especifica o mecanismo de layout (separadores/tabs vs. rotas separadas) — é uma decisão de implementação em aberto.

Confirmei também que não existe, em nenhuma página já construída, um padrão de edição em linha dentro de uma `TabelaDados` (Select por linha) — seria a primeira vez. E que o único ecrã "tipo definições" já existente (`/subscricao`, Passo 23) é uma página única com secções empilhadas (`Cartao`), nunca separadores.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Layout — uma única página com 3 secções empilhadas, ou 3 sub-rotas com navegação interna?** Nenhuma decisão prévia cobre isto. | **Uma única página** (`/configuracoes`, 3 secções empilhadas), mesmo padrão já usado em `/subscricao` (Passo 23) — o único precedente de "ecrã de definições" do projeto. Evita construir um componente de separadores novo só para este passo (Regra #24, menor complexidade). |
| B | **Nav item "Configurações" — visível a quem?** A Information Architecture não condiciona "Perfil pessoal" por papel nenhum (só "Empresa"/"Utilizadores e Permissões"/"Departamentos" têm qualificador "condicionado a..."), mas as outras duas secções são só admin/gestor. | **Item "Configurações" visível a todos os papéis** (incluindo `convidado`) — todos têm de conseguir editar o próprio Perfil. Dentro da página, a secção "Utilizadores/Permissões" só aparece para `admin_empresa`/`gestor` (`fundacao.listar_utilizadores`), e "Departamentos" só para `admin_empresa` (`fundacao.listar_departamentos`/`criar_departamento`) — mesmo princípio já estabelecido (frontend só oculta, API continua a decidir, ADR-006 §3.7). Primeira vez que um item de navegação é visível a todos os papéis mas esconde secções internas por papel — nunca antes necessário (Plano/Pipeline/Assistente de IA eram sempre geridos inteiramente ao nível do item de navegação). |

Nenhuma outra decisão de âmbito em aberto — as 3 secções consomem só endpoints já existentes (Passos 5, 8, 14, 27), sem nenhuma alteração de backend prevista.

---

## 3. Conteúdo Estruturado

### 3.1 Rota e Navegação

```
apps/web/src/app/(autenticado)/configuracoes/page.tsx
```

Client Component (`'use client'`) — tem estado de formulário e mutações, mesmo padrão de `/subscricao` (Passo 23), nunca dos Passos 24/25 (só leitura).

`BarraLateralNavegacao.tsx` — novo item `{ rotulo: 'Configurações', href: '/configuracoes', icone: Settings }` (ícone novo, `lucide-react`), **sem condição de papel** (Decisão B) — primeiro item nunca gated ao nível do menu.

### 3.2 Secção "Perfil"

Sempre visível. Formulário com `nome` (pré-preenchido a partir de `GET /auth/eu`, já existente) e, opcionalmente, alteração de palavra-passe (`passwordAtual`/`passwordNova`) — consome `PATCH /utilizadores/me` (Passo 27). Sucesso na alteração de password mostra aviso de que as outras sessões foram terminadas (Decisão A do Passo 27, já implementada no backend).

### 3.3 Secção "Utilizadores e Permissões"

Visível só para `admin_empresa`/`gestor` (`fundacao.listar_utilizadores`). `GET /utilizadores` popula uma `TabelaDados` (nome, papel, Departamento). Colunas `papel` e `departamento` renderizadas com `Select` **em linha** (primeira vez neste padrão) — mudança de valor chama imediatamente `PATCH /utilizadores/:id/papel`/`PATCH /utilizadores/:id/departamento` (Passos 5/8), sem modal de confirmação (mesma disciplina de UX já usada para ações de valor único e reversível). `Select` de papel restringe sempre às 4 opções de `PAPEIS_ATRIBUIVEIS` (nunca `super_admin`, já reforçado no backend). A própria linha do utilizador autenticado nunca mostra o `Select` de papel (L1 do Passo 5, "nunca auto-alteração" — defesa em profundidade visual, o backend já rejeita isto de qualquer forma). Erros do backend (ex: `403` de um Gestor a tentar um Departamento fora do seu, RN-03) mostrados como toast, nunca um crash.

### 3.4 Secção "Departamentos"

Visível só para `admin_empresa` (`fundacao.listar_departamentos`/`criar_departamento`/`editar_departamento`/`eliminar_departamento`). `TabelaDados` (nome, contagem de Utilizadores atribuídos) com ações "Editar" (`Modal` com `Input` de nome, `PATCH /departamentos/:id`) e "Eliminar" (`DELETE /departamentos/:id`). Botão "Novo Departamento" abre o mesmo `Modal` em modo de criação (`POST /departamentos`) — mesmo componente, reaproveitado. Erro RD-01 (`409`, "O Departamento tem Utilizadores ativos atribuídos — reatribui-os antes de eliminar.") mostrado tal-e-qual, mensagem exata já devolvida pelo backend (mesmo padrão do Passo 26 para o `409` de `POST /auth/registar`).

### 3.5 Tratamento de Erros

`403` de acesso direto por URL a `/configuracoes` nunca acontece (a página em si é sempre acessível — Decisão B); dentro dela, cada secção só aparece se o `papel` local permitir, e qualquer ação que ainda assim seja rejeitada pelo backend (condição de corrida, mudança de papel a meio de sessão) mostra um toast de erro, nunca um crash — mesma disciplina de todo o frontend desde o Passo 14.

### 3.6 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-006 §3.7 (frontend nunca é o mecanismo de segurança) | ✅ Toda a decisão de acesso já reforçada pelo backend; frontend só oculta |
| Information Architecture §3.1 (item 3, "nunca visível-mas-bloqueado") | ✅ Secções internas simplesmente não aparecem para quem não tem a permissão |
| Regra não-negociável #24 (menor complexidade) | ✅ Página única, sem componente de separadores novo (Decisão A) |

**Nenhum novo ADR necessário. Nenhuma alteração de backend prevista.**

### 3.7 Critérios de Aceitação e Exit Criteria (planeados)

Sem testes automatizados de API novos (todos os endpoints consumidos já têm cobertura própria dos Passos 5/8/27). Validação **exclusivamente por inspeção visual real no browser**, nos 4 papéis.

| # | Cenário | Resultado esperado |
|---|---|---|
| V1 | Item "Configurações" visível para todos os 4 papéis | Inspeção visual |
| V2 | `admin_empresa`: as 3 secções visíveis; consegue editar Perfil, mudar papel/Departamento de outro Utilizador, criar/editar/eliminar Departamento | Inspeção visual |
| V3 | `gestor`: só "Perfil" e "Utilizadores/Permissões" visíveis; tentativa de mudar Departamento de um Utilizador fora do seu (RN-03) mostra erro, nunca crash | Inspeção visual |
| V4 | `colaborador`/`convidado`: só "Perfil" visível; conseguem mudar o próprio nome/palavra-passe | Inspeção visual |
| V5 | A própria linha do utilizador autenticado nunca mostra `Select` de papel (L1) | Inspeção visual |
| V6 | Eliminar um Departamento com Utilizadores ativos mostra a mensagem exata do backend (RD-01) | Inspeção visual |
| V7 | Alterar a palavra-passe mostra aviso de que as outras sessões foram terminadas | Inspeção visual |
| V8 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual |
| V9 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola | build/lint limpos |

**Exit Criteria:** V1-V9 confirmados por validação visual real no browser. Com este passo aprovado, **o Bloco B do M5 (Configurações) fica formalmente concluído**.

---

### 3.8 Resultado da Implementação (2026-07-08)

`apps/web/src/app/(autenticado)/configuracoes/page.tsx` (orquestrador) + `SeccaoPerfil.tsx`/`SeccaoUtilizadores.tsx`/`SeccaoDepartamentos.tsx` (3 componentes independentes, pedido explícito da Fundadora/CEO na aprovação — facilita uma futura evolução para separadores/sub-rotas sem reescrever a página). Item "Configurações" adicionado a `BarraLateralNavegacao` (ícone `Settings`, `lucide-react`), visível a todos os papéis (Decisão B).

**Descoberta real durante a validação visual, corrigida antes do fecho**: a secção "Perfil" não invalidava a query `utilizadores` do TanStack Query no sucesso — um `admin_empresa`/`gestor` a mudar o próprio nome via "Perfil" não via a `TabelaDados` da secção "Utilizadores e Permissões" (mesma página) refletir a alteração até um refresh manual. Corrigido adicionando `queryClient.invalidateQueries({ queryKey: ['utilizadores'] })` ao `onSuccess` de `SeccaoPerfil` — as duas secções continuam componentes independentes (nunca uma referência direta entre si), só passam a partilhar a mesma chave de cache do TanStack Query, padrão idiomático da própria biblioteca.

**Frontend (validação visual real no browser, nos 4 papéis):**

| # | Cenário | Resultado |
|---|---|---|
| V1 | Item "Configurações" visível para os 4 papéis (incluindo `convidado`) | ✅ Confirmado |
| V2 | `admin_empresa`: as 3 secções visíveis; editou o próprio Perfil, mudou o Departamento do próprio Utilizador via `Select` em linha, criou um Departamento ("Vendas") | ✅ Confirmado |
| V3 | `gestor`: só "Perfil" e "Utilizadores/Permissões" visíveis (sem "Departamentos"); tentativa de promover um `colaborador` a `admin_empresa` (violação de L2) devolveu `403`, sem crash, tabela manteve o estado correto | ✅ Confirmado |
| V4 | `colaborador`/`convidado`: só "Perfil" visível; ambos conseguiram atualizar o próprio nome (`PATCH /utilizadores/me` → `200`) | ✅ Confirmado |
| V5 | A própria linha do utilizador autenticado nunca mostra `Select` de papel (testado para `admin_empresa` e `gestor`) | ✅ Confirmado |
| V6 | Eliminar um Departamento com um Utilizador ativo mostrou a mensagem exata do backend (RD-01) | ✅ Confirmado |
| V7 | Alterar a palavra-passe mostrou o aviso "As restantes sessões ativas foram terminadas."; login com a nova password confirmado a funcionar | ✅ Confirmado |
| V8 | Responsivo sem quebras em 375px/768px/1280px | ✅ Confirmado |
| V9 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola em toda a validação | ✅ Confirmado |

Regressão completa do backend confirmada sem impacto — 180/180 (nenhum endpoint alterado neste passo).

**Bloco B do M5 (Configurações) formalmente concluído** — Passos 27 e 28 implementados, validados e aprovados. **Milestone M5 em curso** — próximo: Bloco C (UC-02, Convite por email, Passos 29-31).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Mudança de papel/Departamento em linha (`Select`), sem `Modal` de confirmação | Ação reversível, de valor único — mesma disciplina de UX já usada para outras ações simples do projeto; `Modal` reservado a ações de maior risco (ex: confirmar sugestão de IA, RN-08) |
| D2 | `Select` de papel nunca oferece `super_admin` | Já reforçado no backend (`PAPEIS_ATRIBUIVEIS`, Passo 5) — o frontend só espelha o mesmo limite, nunca duplicando a lógica de hierarquia (L2) |
| D3 | Sem restrição client-side adicional às opções de papel/Departamento oferecidas a um Gestor (L2/L3 continuam só verificadas no backend) | Evita duplicar a lógica de hierarquia de privilégio no frontend; um Gestor que tente uma ação fora do seu âmbito recebe um erro claro, mesma disciplina de defesa em profundidade já usada no resto do projeto |
| D4 | `Modal` de Departamento reaproveitado para criar e editar | Mesmo formulário (só `nome`), evita duplicar componente |

---

## 5. Questões em Aberto

Nenhuma nova — as Questões em Aberto já registadas nos Passos 24-27 (Centro de Ajuda, RGPD/Termos, edição granular de `RegraPermissao`) continuam válidas e não são afetadas por este passo.

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 28 — sem implementação. 2 Decisões a Validar (A: página única com 3 secções empilhadas, sem separadores; B: item "Configurações" visível a todos os papéis, secções internas condicionadas por papel). Plano de validação visual V1-V9 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO, com pedido explícito de cada secção ser um componente independente (facilita evolução futura para separadores/sub-rotas). Descoberta real corrigida: `SeccaoPerfil` não invalidava a query `utilizadores`, causando inconsistência visual entre secções na mesma página — corrigido com `invalidateQueries`, mantendo os componentes independentes (só partilham chave de cache). Validação visual V1-V9 confirmada nos 4 papéis. Bloco B do M5 formalmente concluído. Resultados completos em §3.8 | CTO / Arquiteto Principal (Claude) |

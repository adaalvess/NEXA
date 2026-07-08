# NEXA — Especificação Técnica do Passo 27 (M5): `PATCH /utilizadores/me` — Primeiro Passo do Bloco B

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 27 — self-edit de perfil (nome/palavra-passe) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 27 — primeiro passo do Bloco B (Configurações) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08) — Decisão C; Especificação Técnica do Passo 3 (`AuthService`, hashing Argon2id, `Sessao`); Especificação Técnica do Passo 5 (`UtilizadoresService`, padrão `tenantContext`); NFR-08 (robustez de password) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Adicionar `PATCH /utilizadores/me` — a primeira capacidade de self-service de perfil do projeto (nome e palavra-passe, nunca email nem papel, Decisão C da Proposta do M5). Backend puro — este passo não constrói nenhum ecrã; o Passo 28 consome este endpoint dentro do ecrã "Configurações".

---

## 2. Contexto

Nenhum endpoint de `UtilizadoresController` até agora opera sobre o próprio ator — todos (`atribuirPapel`, `atribuirDepartamento`) têm um `alvoId` que é sempre outro Utilizador, e todos exigem uma permissão de papel (`PermissaoGuard`/`@RequirePermissao`). Este passo é estruturalmente diferente: o alvo é sempre e só o próprio chamador, nunca outro — nenhuma verificação de RBAC faz sentido, porque não há nenhuma escalada de privilégio possível (o próprio `convidado` tem de conseguir mudar a sua palavra-passe).

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Alterar a palavra-passe deve invalidar as outras sessões ativas do Utilizador (força novo login nos outros dispositivos/browsers), ou deixá-las todas ativas?** Nenhum documento do projeto (Security & Access Principles incluído) cobre este cenário explicitamente. | **Invalidar todas as outras sessões**, mantendo só a sessão atual (a que fez o pedido) — consistente com o princípio já aplicado no projeto de tratar a segurança de forma conservadora (Fail Secure, RN-01/L1-L6 do Passo 5). Se a palavra-passe estava comprometida, um atacante com uma sessão ativa nunca deveria continuar autenticado depois da vítima a mudar. |
| B | **Guard do endpoint — só `SessionGuard`, sem `PermissaoGuard`/`@RequirePermissao`?** Seria a primeira mutação (`PATCH`) do projeto sem verificação de permissão de papel. | **Sim, só `SessionGuard`** — o endpoint nunca aceita um `alvoId`, o alvo é sempre `ctx.utilizadorId` (o próprio chamador, resolvido do `TenantContext`, nunca de um parâmetro de rota/corpo). RBAC por papel não tem nenhum sentido aqui: não há nenhuma ação sobre outro Utilizador para restringir. Isolamento de tenant continua estrutural (`TenantPrismaService`, Camada 1) — nunca depende deste guard. |

---

## 3. Conteúdo Estruturado

### 3.1 `PATCH /utilizadores/me`

```
PATCH /utilizadores/me
→ SessionGuard (Decisão B — sem PermissaoGuard)
→ Body: { nome?: string, passwordAtual?: string, passwordNova?: string }
→ devolve: { utilizadorId, nome } — nunca passwordHash/email/papel
```

**`AtualizarPerfilDto`** — `nome` opcional (2-100 caracteres, mesmo limite de `RegistarDto`); `passwordAtual`/`passwordNova` sempre juntos ou nenhum dos dois (`@ValidateIf`) — nunca uma mudança de password sem confirmar a atual; `passwordNova` com o mesmo `@MinLength(8)` (NFR-08) já usado no registo. Pelo menos um dos dois grupos (`nome` ou par de passwords) tem de estar presente — corpo vazio é `400`.

**`UtilizadoresService.atualizarPerfil()`** — nunca recebe `alvoId`: lê sempre `ctx.utilizadorId` do `TenantContext` (Passo 4). Se `passwordNova` presente: `argon2.verify(utilizador.passwordHash, passwordAtual)` primeiro — falha lança `UnauthorizedException('Palavra-passe atual incorreta.')`, mesma mensagem genérica de segurança já usada no login (nunca distinguir "utilizador não existe" de "password errada", aqui nem se aplica porque o utilizador já está autenticado). Novo hash gerado com os mesmos parâmetros Argon2id de `AuthService.registar` (Passo 3) — nunca duplicar a lógica de custo do algoritmo, só os parâmetros de ambiente já usados lá.

**Invalidação de sessões (Decisão A)** — só quando `passwordNova` está presente: `tenantPrisma.client.sessao.deleteMany({ where: { utilizadorId: ctx.utilizadorId, id: { not: sessaoAtualId } } })`. A sessão atual (a que fez este pedido) nunca é invalidada a meio do próprio pedido.

**Auditoria** — evento `atualizar_perfil` sobre a entidade `Utilizador` (`acao` é um `string` livre no evento, Especificação Técnica do Passo 6, nenhuma alteração de schema); `detalhe` regista só `{ nomeAlterado: boolean, passwordAlterada: boolean }` — **nunca a password em texto plano nem o hash**, nem antigo nem novo.

### 3.2 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| NFR-08 (robustez de password) | ✅ Mesmo `@MinLength(8)` já aplicado no registo |
| Regra não-negociável #12 (Argon2id) | ✅ Reaproveita os mesmos parâmetros de `AuthService.registar`, nunca uma segunda implementação |
| Security & Access Principles (Fail Secure) | ✅ Decisão A — invalidação conservadora de outras sessões |
| Regra não-negociável #6 (camada de acesso a dados única) | ✅ `TenantPrismaService`, nenhuma query direta |

**Nenhum novo ADR necessário.**

### 3.3 Critérios de Aceitação e Exit Criteria (planeados)

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Atualizar só `nome` — sucesso, sem tocar em `passwordHash` | HTTP real |
| T2 | Atualizar palavra-passe com `passwordAtual` correta — sucesso; login subsequente com a nova password funciona | HTTP real |
| T3 | Atualizar palavra-passe com `passwordAtual` incorreta — `401`, `passwordHash` inalterado | HTTP real |
| T4 | `passwordNova` sem `passwordAtual` (ou vice-versa) — `400` (fronteira única, DTO) | HTTP real |
| T5 | Corpo vazio (`{}`) — `400` | HTTP real |
| T6 | Após mudar a palavra-passe, uma sessão diferente do mesmo Utilizador deixa de ser válida; a sessão que fez o pedido continua válida | HTTP real — Decisão A |
| T7 | `convidado` consegue chamar este endpoint sobre si próprio (sem `PermissaoGuard` a bloquear) | HTTP real — Decisão B |
| T8 (regressão) | Suite completa — todos os testes herdados continuam a passar | `npm run test:e2e` |
| T9 | `npm run build` (`apps/api`) sem erros | build limpo |

**Exit Criteria:** T1-T9 confirmados por teste automatizado. Sem validação de browser — passo de backend puro, sem ecrã (fica para o Passo 28).

---

### 3.4 Resultado da Implementação (2026-07-08)

**`AtualizarPerfilDto`** (`nome`/`passwordAtual`/`passwordNova`, `@ValidateIf` mútuo) e **`UtilizadoresService.atualizarPerfil()`** implementados exatamente como desenhado em §3.1.

**Descoberta técnica real, resolvida antes de escrever código (não uma correção pós-facto)**: a exigência explícita da Fundadora/CEO de que a invalidação de sessões seja transacional revelou uma limitação real do `TenantPrismaService` — cada operação sua já corre dentro da sua própria transação interna de scoping (`SET LOCAL app.current_empresa_id`, Especificação Técnica do Passo 4, 3.2.4), o que a torna estruturalmente incompatível com ser usada dentro de uma transação multi-operação genuína (`update` + `deleteMany` atómicos). Resolvido reaproveitando o mesmo padrão já estabelecido em `AuthService.registar` (Passo 3) — `PrismaService` bruto, injetado como exceção documentada dentro do próprio `UtilizadoresService`, com scoping por `empresaId` feito manualmente via a chave composta `id_empresaId` (`@@unique([id, empresaId])`, ADR-003 §3.3) em vez do scoping automático da Camada 1. `sessaoAtualId` obtido do cookie (`req.cookies[SESSION_COOKIE_NAME]`), mesmo padrão já usado em `AuthController.logout` (Passo 14).

**Backend:**

| # | Cenário | Resultado |
|---|---|---|
| T1 | Atualizar só o nome, sem tocar na password | ✅ Passou |
| T2 | Atualizar a password com `passwordAtual` correta permite login com a nova | ✅ Passou |
| T3 | `passwordAtual` incorreta devolve `401`, password inalterada | ✅ Passou |
| T4 | `passwordNova` sem `passwordAtual` devolve `400` | ✅ Passou |
| T5 | Corpo vazio devolve `400` | ✅ Passou |
| T6 | Mudar a password invalida as outras sessões ativas, mantendo a atual | ✅ Passou — prova real de transação atómica (sessão diferente eliminada da BD e `401` em `GET /auth/eu`; sessão do próprio pedido continua válida) |
| T7 | `convidado` consegue chamar este endpoint sobre si próprio, sem `PermissaoGuard` a bloquear | ✅ Passou |
| T8 (regressão) | Suite completa — 173 herdados + 7 novos | ✅ 180/180 |
| T9 | `npm run build` (`apps/api`) sem erros | ✅ Limpo |

`apps/api/test/perfil-self-edit.e2e-spec.ts` — novo ficheiro, 7 testes, todos a passar na primeira execução.

**Sem ecrã neste passo** (backend puro) — fica para o Passo 28, que consome `PATCH /utilizadores/me` dentro do ecrã "Configurações".

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Endpoint nunca aceita `alvoId` — o alvo é sempre `ctx.utilizadorId` | Elimina estruturalmente qualquer possibilidade de um Utilizador editar o perfil de outro através deste endpoint |
| D2 | Resposta nunca inclui `passwordHash`/`email`/`papel` | `email`/`papel` estão fora de âmbito (Decisão C da Proposta do M5); `passwordHash` nunca é devolvido por nenhum endpoint do projeto |
| D3 | Auditoria regista só booleanos (`nomeAlterado`/`passwordAlterada`), nunca o valor da password | Mesma disciplina de nunca persistir segredos em texto plano, mesmo em auditoria |

---

## 5. Questões em Aberto

Nenhuma nova — as Questões em Aberto já registadas nos Passos 24-26 (Centro de Ajuda, RGPD/Termos) continuam válidas e não são afetadas por este passo.

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 27 — sem implementação. 2 Decisões a Validar (A: invalidar outras sessões ao mudar palavra-passe; B: `PATCH /utilizadores/me` só com `SessionGuard`, sem `PermissaoGuard`, por ser sempre self-scoped). Plano de testes T1-T9 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO, com o requisito adicional explícito de transacionalidade real na invalidação de sessões. Descoberta técnica real resolvida antes de implementar: `TenantPrismaService` incompatível com transação multi-operação genuína — resolvido com `PrismaService` bruto (mesmo padrão de `AuthService.registar`), scoping manual via `id_empresaId`. 7/7 testes novos (180/180 com regressão). Resultados completos em §3.4 | CTO / Arquiteto Principal (Claude) |

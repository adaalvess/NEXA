# NEXA — Especificação Técnica do Passo 8 (M2): Departamento

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 8 — Departamento (CRUD + Atribuição) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 8 — pré-requisito funcional para a visibilidade RBAC de Processos (Passo 9) e CRM (Passo 10) |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-05 · Data Model Conceptual v1.1 (3.2) · Especificação Técnica do Passo 5 (RBAC, RN-03, L1-L6) · Blueprint v1.8 (§2, §4) · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o CRUD de `Departamento` (modelo já existente desde o Passo 2, sem endpoint real) e a atribuição de Utilizadores a Departamentos — a lacuna identificada na Proposta de M2 (§2) e validada com a Fundadora/CEO como Passo 8. Sem isto, a visibilidade RBAC de Gestor em Processos (Passo 9) e CRM (Passo 10) não tem via real de produto para ser testada, só fixtures diretos em base de dados.

---

## 2. Contexto

`Departamento` existe desde o Passo 2 (`empresaId`, `nome`, `eliminadoEm`, `criadoPor`/`atualizadoPor`, timestamps) — modelo completo, sem alteração de schema necessária neste passo. A permissão `criar_departamento` já existe na `DEFAULT_PERMISSION_MATRIX` desde o Passo 5 (só `admin_empresa: true`), mas nenhum endpoint a consome. `Utilizador.departamentoId` também existe desde o Passo 2, mas nenhum fluxo de produto o define — só `AuthService.registar` (nunca define departamento) e testes (via `adminClient` direto).

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Passo 8 deve incluir atribuição de Utilizador a Departamento, além do CRUD de Departamento em si | **Sim** — sem isto, a visibilidade de Gestor por Departamento (motivo do próprio Passo 8) fica intestável através do produto real. |
| B | Forma dos endpoints — `/empresas/:id/departamentos` (literal do Blueprint) ou plano `/departamentos` | **Plano, `/departamentos`** — mesmo padrão já implementado no Passo 5 para `PATCH /utilizadores/:id/papel` (o Blueprint já assume, D2, que a API é "primeira versão real", não contrato final). `empresaId` é sempre implícito via `TenantContext` (Camada 1) — expô-lo na URL seria redundante e nunca usado para outra Empresa. |

---

## 3. Conteúdo Estruturado

### 3.1 Superfície de API

| Método | Rota | Ação (matriz) | Descrição |
|---|---|---|---|
| `POST` | `/departamentos` | `fundacao.criar_departamento` (já existe) | Criar Departamento |
| `GET` | `/departamentos` | `fundacao.listar_departamentos` (nova) | Listar Departamentos da Empresa |
| `PATCH` | `/departamentos/:id` | `fundacao.editar_departamento` (nova) | Renomear |
| `DELETE` | `/departamentos/:id` | `fundacao.eliminar_departamento` (nova) | Soft-delete |
| `PATCH` | `/utilizadores/:id/departamento` | `fundacao.atribuir_departamento` (nova) | Atribuir/reatribuir/remover o Departamento de um Utilizador |

### 3.2 Matriz de Permissões — Novas Entradas

Todas as ações de gestão de Departamento ficam, por desenho, **exclusivas de `admin_empresa`** — reestruturar a organização (criar/editar/eliminar Departamentos, mover Utilizadores entre eles) é uma decisão administrativa, não operacional; um Gestor já tem autoridade suficiente dentro do seu próprio Departamento (RN-03, Passo 5) sem precisar de o poder redesenhar. `listar_departamentos` é a exceção: Gestor também precisa de visibilidade da estrutura para operar (ex: perceber o contexto ao gerir a sua equipa).

| Ação | admin_empresa | gestor | colaborador | convidado |
|---|---|---|---|---|
| `criar_departamento` (já existe) | true | false | false | false |
| `listar_departamentos` | true | true | false | false |
| `editar_departamento` | true | false | false | false |
| `eliminar_departamento` | true | false | false | false |
| `atribuir_departamento` | true | false | false | false |

### 3.3 Regras de Negócio — Eliminação e Atribuição

| # | Regra |
|---|---|
| RD-01 | Um Departamento não pode ser eliminado (soft-delete) enquanto tiver pelo menos um `Utilizador` ativo (`eliminadoEm: null`) com `departamentoId` a apontar para ele — evita órfãos silenciosos, mesmo padrão de cautela já usado em RN-01 (Passo 5, nunca zero admins). |
| RD-02 | Atribuir um Departamento a um Utilizador aceita `departamentoId: string \| null` — `null` remove a atribuição (Utilizador passa a não ter Departamento, estado já suportado pelo schema desde o Passo 2). |
| RD-03 | O `departamentoId` fornecido (quando não `null`) tem de existir, pertencer à mesma Empresa (estrutural, Camada 1) e não estar eliminado (`eliminadoEm: null`) — não é possível atribuir um Utilizador a um Departamento já soft-deleted. |
| RD-04 | Isolamento de tenant é sempre estrutural (Camada 1) — nenhuma verificação adicional necessária, mesmo padrão de L6 (Passo 5). |

### 3.4 Auditoria (extensão da convenção do Passo 6)

| `acao` | `entidade` | `detalhe` |
|---|---|---|
| `criar` | `Departamento` | `{ dados: { nome } }` |
| `atualizar` | `Departamento` | `{ alteracoes: { nome: { anterior, novo } } }` |
| `eliminar` | `Departamento` | `{ eliminadoEm: timestamp }` |
| `atribuir_departamento` | `Utilizador` | `{ departamentoAnterior, departamentoNovo }` (mesmo padrão de `atribuir_papel`, Passo 5) |

Todos via `emitAsync` (aguardado) — mesma disciplina de consistência forte já aplicada a toda ação de escrita desde o Passo 6.

### 3.5 DTOs

```ts
export class CriarDepartamentoDto {
  @IsString() @Length(2, 100)
  nome!: string;
}

export class EditarDepartamentoDto {
  @IsString() @Length(2, 100)
  nome!: string;
}

export class AtribuirDepartamentoDto {
  @IsOptional() @IsString()
  departamentoId!: string | null;
}
```

### 3.6 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| FR-05 | ✅ Criar Departamento/Equipa — implementado pela primeira vez via produto real |
| Data Model Conceptual (3.2) | ✅ Nenhuma alteração ao modelo — só consumo do que já existe |
| Security & Access Principles (3.1, 3.3) | ✅ Todas as ações via `AuthorizationService`/`PermissaoGuard` único, negação por defeito |
| Data & Consistency Rules (3.4) | ✅ Soft-delete, mesmo padrão de `Utilizador`/`Cliente`/`Processo` |

**Nenhum novo ADR necessário. Nenhuma migração de schema necessária.**

### 3.7 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` cria um Departamento | `201` |
| T2 | `admin_empresa` edita o nome de um Departamento | `200` |
| T3 | `admin_empresa` elimina um Departamento sem Utilizadores ativos atribuídos | `200`, `eliminadoEm` preenchido |
| T4 | `admin_empresa` tenta eliminar um Departamento com um Utilizador ativo atribuído | `409` (RD-01) |
| T5 | `gestor`/`colaborador`/`convidado` tentam criar/editar/eliminar um Departamento | `403` |
| T6 | `gestor` consegue listar Departamentos; `colaborador`/`convidado` não | `200` / `403` |
| T7 | `admin_empresa` atribui um Departamento a um Utilizador | `200` |
| T8 | `admin_empresa` remove a atribuição (`departamentoId: null`) | `200` |
| T9 | Atribuir um `departamentoId` de outra Empresa, ou já eliminado | `403`/`404` (RD-03) |
| T10 | `gestor` tenta atribuir Departamento a um Utilizador | `403` |
| T11 | Isolamento entre tenants (Departamento de uma Empresa nunca visível/afetável a partir doutra) | ✅ |
| T12 | Concessão de todas as ações gera entradas corretas no `RegistoAuditoria` | ✅ |
| Regressão | Testes automatizados dos Passos 4-7 continuam a passar | ✅ |

**Exit Criteria:** T1-T12 e regressão passam; `npm run build` sem erros; nenhuma verificação de permissão feita diretamente por um controlador.

### 3.8 Resultado da Implementação e Evidências de Validação

**Entregáveis:** `apps/api/src/modules/fundacao/departamento/` (`departamento.service.ts` com RD-01/RD-03, `departamento.controller.ts`, `dto/criar-departamento.dto.ts`, `dto/editar-departamento.dto.ts`); `UtilizadoresService.atribuirDepartamento` + `PATCH /utilizadores/:id/departamento` em `utilizadores.controller.ts`; `apps/api/src/modules/fundacao/auth/dto/atribuir-departamento.dto.ts`; 4 novas entradas na `DEFAULT_PERMISSION_MATRIX` (`listar_departamentos`, `editar_departamento`, `eliminar_departamento`, `atribuir_departamento`); `apps/api/test/departamento.e2e-spec.ts` (T1-T12).

**Sem migração de schema** — confirmado, `Departamento` já estava completo desde o Passo 2.

**Sem descobertas técnicas emergentes durante a implementação** — passo direto, sem correções de arquitetura, ao contrário dos Passos 4/5/6/7.

**Resultados dos testes (Jest, `nexa_test`, 51/51, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T12 (este passo) | ✅ Todos |
| Regressão (Passos 4-7, 40 testes) | ✅ Sem alteração de comportamento |

Suite completa confirmada estável em 2 execuções consecutivas.

**`npm run build` / `eslint`:** ✅ sem erros.

**Exit Criteria do Passo 8: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D2 | Ver 2.1 (A-B) — decisões já validadas antes deste documento | — |
| D3 | Gestão de Departamento (criar/editar/eliminar/atribuir) exclusiva de `admin_empresa`; só `listar_departamentos` também acessível a `gestor` | Reestruturar a organização é decisão administrativa; Gestor já tem autoridade suficiente dentro do seu próprio Departamento (RN-03) sem precisar de o poder redesenhar |
| D4 | RD-01 bloqueia eliminação com Utilizadores ativos atribuídos | Evita órfãos silenciosos, mesmo padrão de cautela de RN-01 (Passo 5) |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `Processo.departamentoId` não é verificado por RD-01 (só Utilizadores ativos) — um Departamento com Processos associados mas sem Utilizadores ativos pode ser eliminado | Aceite conscientemente: Processos são histórico de trabalho, não pessoas ativas a orfanizar; a associação `departamentoId` em `Processo` permanece válida mesmo após o Departamento ser soft-deleted | CTO, a rever se um caso real de confusão surgir |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 8, incorporando as 2 decisões já validadas (atribuição de Departamento incluída no âmbito; endpoints planos em vez do literal `/empresas/:id/...`): CRUD completo, atribuição de Utilizador a Departamento, regras RD-01 a RD-04, matriz de permissões, auditoria, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.8 (Resultado da Implementação e Evidências de Validação) com 51/51 testes reais (11 novos deste passo, T7/T8 num único bloco Jest + 40 de regressão completa dos Passos 4-7), estáveis em 2 execuções consecutivas; sem descobertas técnicas emergentes durante a implementação | CTO (Claude) |
| 1.2 | 2026-07-06 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 8 na íntegra; corrigida inconsistência editorial na contagem de testes de regressão (uniformizado para 40, totalizando 51/51 em toda a documentação) | Fundadora/CEO |

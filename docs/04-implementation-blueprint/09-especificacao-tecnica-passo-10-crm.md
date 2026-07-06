# NEXA — Especificação Técnica do Passo 10 (M2): CRM Inteligente

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 10 — CRM (Cliente/Contacto/Oportunidade, Interação, Pipeline) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 10 — segundo módulo de negócio, reutiliza a visibilidade centralizada do Passo 9 |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-19 a FR-22 · Functional Specifications v1.1 (3.4) · UC-04 · RN-06 · Data Model Conceptual v1.1 (3.2, D4) · Especificações Técnicas dos Passos 5, 7, 9 · Blueprint v2.0 · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o CRUD de `Cliente`/`Interacao` (modelos já existentes desde o Passo 2) com visibilidade RBAC completa — segundo módulo de negócio (EP-04), reutilizando integralmente o mecanismo de visibilidade centralizado no `AuthorizationService` (Passo 9, Decisão B do M2), sem o duplicar. Resolve também o Risco R2 do Passo 9 (formato de `GET /pipeline` por definir).

---

## 2. Contexto

`Cliente` e `Interacao` existem desde o Passo 2. Nenhum endpoint de negócio os consome ainda. Este é o segundo módulo de negócio fora da Fundação (`apps/api/src/modules/crm/`), seguindo exatamente o mesmo padrão arquitetural do Passo 9.

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Campo "Contacto principal" (Functional Specifications, 3.4 — obrigatório na especificação conceptual) em falta no schema | **Adicionar** `Cliente.contactoPrincipal String?` — mesmo padrão do `Processo.descricao` (Passo 9). |
| B | Campo "Descrição" da Interação (Functional Specifications, 3.4) em falta no schema | **Adicionar** `Interacao.descricao String?`. |
| C | Tipo do campo `estadoOportunidade` | **Promovido a `enum EstadoOportunidade`** — mesmo padrão de `Papel` (Passo 5) e `Processo.estado` (Passo 9). |
| D | Ausência da linha "Eliminar Cliente" na matriz de permissões do CRM (Functional Specifications, 3.4) — ao contrário de Processos | **Fora de âmbito deste passo, deliberadamente** — Cliente é uma entidade estrutural do negócio (histórico de Interações, Oportunidades, Pipeline); eliminação física ou lógica fica para uma decisão futura própria, se necessária. CRUD deste passo limitado a criar/ler/atualizar. `eliminadoEm` (já no schema) permanece sem uso neste passo. |

---

## 3. Conteúdo Estruturado

### 3.1 Migração de Base de Dados

```prisma
enum EstadoOportunidade {
  prospecao
  negociacao
  fechada_ganha
  fechada_perdida
}

model Cliente {
  // ...
  contactoPrincipal  String?
  estadoOportunidade EstadoOportunidade?
  // ...
}

model Interacao {
  // ...
  descricao String?
  // ...
}
```

Três alterações, todas refinamento de detalhe (Blueprint D4) — sem impacto estrutural nas relações já existentes.

### 3.2 Reutilização da Visibilidade Centralizada (Decisão B do M2, Passo 9)

**Nenhuma alteração ao `AuthorizationService`** — `obterEscopoVisibilidade('cliente')`, `obterRelacaoEntidade('cliente', id)`, `podeAgirSobreEntidade('cliente', id)` e `podeAcederViaPartilha('cliente', id)` já existem desde o Passo 9 e já sabem resolver `Cliente` (owner + Departamento do owner). O módulo CRM consome-os exatamente como o módulo Processos — esta é a validação prática de que a centralização do Passo 9 cumpre a Decisão B: um segundo módulo a reutilizar sem duplicar nada.

### 3.3 Regras de Negócio — Cliente (CR-01 a CR-06)

| # | Regra |
|---|---|
| CR-01 | `admin_empresa` cria/vê/edita qualquer Cliente da Empresa, com qualquer `ownerId`/`estadoOportunidade`. |
| CR-02 | `gestor` só vê/edita Clientes cujo `owner` pertence ao seu Departamento; ao criar, só pode definir `ownerId` para um Utilizador do seu Departamento (incluindo si mesmo). |
| CR-03 | `colaborador` só vê/edita Clientes de que é `owner`; ao criar, `ownerId` tem de ser ele próprio. |
| CR-04 | `convidado` nunca cria/edita; só vê Clientes com Partilha ativa concedida a si (`nivelAcesso: leitura`). |
| CR-05 | Eliminação de Cliente fora de âmbito (2.1.D) — sem endpoint `DELETE /clientes/:id` neste passo. |
| CR-06 | `contactoPrincipal` validado no momento de registar a **primeira** Interação de um Cliente (Functional Specifications, 3.4) — se estiver vazio/nulo, rejeitar a criação da Interação com erro claro; Interações subsequentes não repetem esta validação. |

### 3.4 Regras de Negócio — Interação (IR-01 a IR-03)

| # | Regra |
|---|---|
| IR-01 | Registar uma Interação exige a mesma autoridade de edição sobre o Cliente associado (`podeAgirSobreEntidade('cliente', clienteId)`) — nunca `convidado`, mesmo com Partilha ativa (`nivelAcesso` é sempre só leitura, Especificação Técnica do Passo 7, 2.1.B). |
| IR-02 | Ver Interações de um Cliente segue a mesma visibilidade do próprio Cliente (`podeAgirSobreEntidade` OR, para `convidado`, `podeAcederViaPartilha`) — mesma composição já usada em `ProcessosService.podeVerProcesso` (Passo 9). |
| IR-03 | `data`, se omitida, assume o momento do registo (`@default(now())`, já suportado pelo schema — RN-06, "ausência de histórico não é erro"). |

### 3.5 Matriz de Permissões — Módulo `crm`

| Ação | admin_empresa | gestor | colaborador | convidado |
|---|---|---|---|---|
| `criar` | true | true | true | false |
| `ver` | true | true | true | true *(âmbito limitado por `obterEscopoVisibilidade`/Partilha)* |
| `editar` | true | true | true | false |
| `ver_pipeline` | true | true | false *(Functional Specifications: "Não aplicável")* | false |

`editar` cobre também "Registar Interação" (Functional Specifications, 3.4) — a matriz do documento aprovado já mostra os dois com exatamente o mesmo padrão de âmbito ("Todos/Da sua equipa/Os seus/Não"); uma ação distinta duplicaria a mesma decisão sem necessidade.

### 3.6 Superfície de API

| Método | Rota | Ação | Autoridade adicional (serviço) |
|---|---|---|---|
| `POST` | `/clientes` | `crm.criar` | CR-02/CR-03 (owner) |
| `GET` | `/clientes` | `crm.ver` | `obterEscopoVisibilidade('cliente')` |
| `GET` | `/clientes/:id` | `crm.ver` | `podeAgirSobreEntidade` OR (`convidado` AND `podeAcederViaPartilha`) |
| `PATCH` | `/clientes/:id` | `crm.editar` | `podeAgirSobreEntidade`, CR-02/CR-03 se `ownerId` alterado |
| `POST` | `/clientes/:id/interacoes` | `crm.editar` | IR-01, CR-06 (`contactoPrincipal`) |
| `GET` | `/clientes/:id/interacoes` | `crm.ver` | IR-02 |
| `GET` | `/pipeline` | `crm.ver_pipeline` | `obterEscopoVisibilidade('cliente')` (âmbito igual à listagem) |

Sem `DELETE /clientes/:id` (2.1.D).

### 3.7 DTOs

```ts
export const TIPOS_CLIENTE = ['empresa_cliente', 'contacto_individual'] as const;
export const ESTADOS_OPORTUNIDADE = ['prospecao', 'negociacao', 'fechada_ganha', 'fechada_perdida'] as const;
export const TIPOS_INTERACAO = ['chamada', 'reuniao', 'nota', 'outro'] as const;

export class CriarClienteDto {
  @IsString() @Length(2, 150) nome!: string;
  @IsIn(TIPOS_CLIENTE) tipo!: (typeof TIPOS_CLIENTE)[number];
  @IsOptional() @IsString() contactoPrincipal?: string;
  @IsString() ownerId!: string;
  @IsOptional() @IsIn(ESTADOS_OPORTUNIDADE) estadoOportunidade?: (typeof ESTADOS_OPORTUNIDADE)[number];
}

export class EditarClienteDto {
  @IsOptional() @IsString() @Length(2, 150) nome?: string;
  @IsOptional() @IsIn(TIPOS_CLIENTE) tipo?: (typeof TIPOS_CLIENTE)[number];
  @IsOptional() @IsString() contactoPrincipal?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @ValidateIf((o) => o.estadoOportunidade !== null) @IsIn(ESTADOS_OPORTUNIDADE) estadoOportunidade?: (typeof ESTADOS_OPORTUNIDADE)[number] | null;
}

export class CriarInteracaoDto {
  @IsIn(TIPOS_INTERACAO) tipo!: (typeof TIPOS_INTERACAO)[number];
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsDateString() data?: string;
}
```

### 3.8 `GET /pipeline` — Formato de Resposta (resolve Risco R2 do Passo 9)

Agrupamento por `estadoOportunidade`, incluindo só Clientes que de facto têm uma Oportunidade associada (um Cliente sem `estadoOportunidade` não é "pipeline", é só um contacto — FR-22, "oportunidades por estado"). Âmbito de visibilidade igual ao de `GET /clientes` (`obterEscopoVisibilidade`).

```json
{
  "prospecao": [{ "id": "...", "nome": "...", "ownerId": "..." }],
  "negociacao": [...],
  "fechada_ganha": [...],
  "fechada_perdida": [...]
}
```

### 3.9 Auditoria (extensão da convenção do Passo 6)

| `acao` | `entidade` | `detalhe` |
|---|---|---|
| `criar` | `Cliente` | `{ dados: { nome, tipo, ownerId } }` |
| `atualizar` | `Cliente` | `{ alteracoes: { campo: { anterior, novo } } }` |
| `criar` | `Interacao` | `{ dados: { clienteId, tipo } }` |

### 3.10 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-19 a FR-22 | ✅ Criar/editar/consultar Cliente; registar Interação; Pipeline |
| Data Model Conceptual (D4) | ✅ Segunda prova de que a visibilidade RBAC é uma regra única — `crm` reutiliza `AuthorizationService` sem nenhuma alteração |
| RN-06 | ✅ Cliente pode existir sem Interação, sem erro |

**Nenhum novo ADR necessário.**

**Risco R1 — ausência de eliminação de Cliente pode ser revisitada:** se surgir uma necessidade real de remover Clientes (ex: RGPD, duplicados), será uma decisão de produto própria, não uma extensão trivial deste passo (2.1.D). Aceite conscientemente.

### 3.11 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` cria um Cliente para qualquer Utilizador | `201` |
| T2 | `gestor` cria um Cliente para Utilizador do seu Departamento | `201` |
| T3 | `gestor` tenta criar Cliente para Utilizador de outro Departamento | `403` (CR-02) |
| T4 | `colaborador` cria um Cliente para si mesmo | `201` |
| T5 | `colaborador` tenta criar Cliente para outro Utilizador | `403` (CR-03) |
| T6 | `convidado` tenta criar um Cliente | `403` |
| T7 | `admin_empresa` vê todos os Clientes | ✅ |
| T8 | `gestor` só vê Clientes do seu Departamento | ✅ |
| T9 | `colaborador` só vê os seus Clientes | ✅ |
| T10 | `convidado` só vê Clientes partilhados; perde acesso após revogação | ✅ |
| T11 | `colaborador` regista Interação num Cliente seu com `contactoPrincipal` preenchido | `201` |
| T12 | Registar a primeira Interação sem `contactoPrincipal` preenchido | `400`/`403` (CR-06) |
| T13 | `convidado` com Partilha tenta registar Interação | `403` (IR-01, nunca escreve) |
| T14 | `GET /pipeline` agrupa Clientes por `estadoOportunidade`, respeitando o âmbito do papel | ✅ |
| T15 | `colaborador` tenta aceder a `GET /pipeline` | `403` |
| T16 | Isolamento entre tenants | ✅ |
| T17 | Auditoria regista criar/atualizar de Cliente e criar de Interação | ✅ |
| Regressão | Testes automatizados dos Passos 4-9 continuam a passar | ✅ |

**Exit Criteria:** T1-T17 e regressão passam; `npm run build` sem erros; nenhuma verificação de permissão feita diretamente por um controlador; `AuthorizationService` continua o único ponto de autorização, sem nenhuma alteração neste passo.

### 3.12 Resultado da Implementação e Evidências de Validação

**Entregáveis:** migração `20260706171205_crm_contacto_descricao_e_estado_oportunidade_enum` (`EstadoOportunidade`, `Cliente.contactoPrincipal`, `Interacao.descricao`); novo módulo `apps/api/src/modules/crm/` (`crm.service.ts` com CR-01 a CR-06 e IR-01 a IR-03, `crm.controller.ts`, DTOs), registado em `AppModule`; nova entrada `crm` na `DEFAULT_PERMISSION_MATRIX`.

**Confirmado exatamente como previsto (2.2 esperado, não uma surpresa):** zero alterações ao `AuthorizationService` — `obterEscopoVisibilidade('cliente')`, `obterRelacaoEntidade('cliente', ...)` e `podeAgirSobreEntidade('cliente', ...)` já resolviam `Cliente` desde o Passo 9 (a mesma implementação genérica que já lidava com `cliente`/`processo`). Esta é a segunda prova prática de que a Decisão B do M2 (centralização) cumpre o objetivo: nenhuma linha de lógica de visibilidade nova foi escrita neste passo.

**Sem descobertas técnicas emergentes durante a implementação.**

**Resultados dos testes (Jest, `nexa_test`, 85/85, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T17 (este passo) | ✅ Todos |
| Regressão (Passos 4-9, 68 testes) | ✅ Sem alteração de comportamento |

Suite completa confirmada estável em 2 execuções consecutivas.

**`npm run build` / `eslint`:** ✅ sem erros, sem correções necessárias.

**Exit Criteria do Passo 10: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D4 | Ver 2.1 (A-D) — decisões já validadas antes deste documento | — |
| D5 | `editar` cobre também "Registar Interação" na matriz — nenhuma ação `crm.registar_interacao` separada | A matriz aprovada já mostra o mesmo padrão de âmbito para ambas; uma ação distinta duplicaria a mesma decisão |
| D6 | `GET /pipeline` só inclui Clientes com `estadoOportunidade` preenchido | FR-22 refere-se a "oportunidades por estado" — um Cliente sem oportunidade associada não pertence ao pipeline |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Eliminação de Cliente (2.1.D, R1) permanece sem decisão | Nenhum agora; revisitar se surgir necessidade real (RGPD, duplicados) | CEO + CTO, se/quando necessário |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 10, incorporando as 4 decisões já validadas (campos `contactoPrincipal`/`descricao` em falta; `estadoOportunidade` como enum; eliminação de Cliente fora de âmbito): reutilização integral da visibilidade centralizada do Passo 9, regras CR-01 a CR-06 e IR-01 a IR-03, matriz de permissões do módulo `crm`, formato de `GET /pipeline` (resolve Risco R2 do Passo 9), auditoria, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.12 (Resultado da Implementação e Evidências de Validação) com 85/85 testes reais (17 novos deste passo + regressão completa de 68 testes dos Passos 4-9), estáveis em 2 execuções consecutivas; confirmado que zero alterações foram necessárias ao `AuthorizationService` — segunda prova prática da centralização (Decisão B do M2) | CTO (Claude) |
| 1.2 | 2026-07-06 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 10 na íntegra (modelo, módulo `crm`, reutilização integral do `AuthorizationService`, CR-01 a CR-06, IR-01 a IR-03, 85/85 testes) | Fundadora/CEO |

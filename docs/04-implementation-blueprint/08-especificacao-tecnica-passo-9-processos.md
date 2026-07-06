# NEXA — Especificação Técnica do Passo 9 (M2): Processos e Tarefas

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 9 — Gestão de Processos e Tarefas |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 9 — primeiro módulo de negócio "puro" (fora da Fundação) |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-14 a FR-18 · Functional Specifications v1.1 (3.3) · UC-03 · RN-05 · Data Model Conceptual v1.1 (3.2, D4) · Especificações Técnicas dos Passos 5, 7, 8 · Blueprint v1.9 · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o CRUD de `Processo` (modelo já existente desde o Passo 2) com visibilidade RBAC completa — o primeiro módulo de negócio construído fora da Fundação (EP-03, Blueprint), e o primeiro consumidor real de `AuthorizationService.podeAcederViaPartilha` (Passo 7, até agora sem nenhum endpoint de produto a chamá-lo — Risco R1 desse passo). Implementa também a Decisão B do M2 (centralização da lógica de visibilidade RBAC na Fundação) e a Decisão C (promoção de `Processo.estado` a `enum`).

---

## 2. Contexto

`Processo` existe desde o Passo 2 (`titulo`, `responsavelId`, `departamentoId`, `clienteId`, `estado` como `String`, `prazo`, soft-delete). Nenhum endpoint de negócio o consome ainda. Este é também o primeiro módulo construído fora de `apps/api/src/modules/fundacao/` — `apps/api/src/modules/processos/` — consistente com "monólito modular" (regra não-negociável #1: módulos `fundacao`, `dashboard`, `processos`, `crm`, `ia`, `comercial`).

### 2.1 Decisões Já Validadas (antes deste documento — Proposta de M2, aprovada 2026-07-06)

| # | Questão | Decisão |
|---|---|---|
| A | Centralização da lógica de visibilidade RBAC | **Decisão B do M2** — nunca duplicada entre Processos e CRM; mecanismo reutilizável na Fundação |
| B | Tipo do campo `estado` | **Decisão C do M2** — promovido a `enum EstadoProcesso`, mesmo padrão do `Papel` (Passo 5) |

### 2.2 Decisão Emergente Proposta Neste Documento (a validar)

A Decisão A acima ("centralizar na Fundação") tem uma implicação concreta que só se torna visível ao desenhar este passo: o `PartilhaService` (Passo 7) já implementa exatamente esta lógica — `buscarRelacaoEntidade` (owner/responsável + Departamento, genérico para `cliente`/`processo`) e `verificarAutoridadeSobreEntidade` (P1-P3: admin sempre, gestor por Departamento, colaborador por posse) — mas de forma **privada e local** a esse serviço. Para cumprir a Decisão B sem duplicar esta lógica num terceiro sítio (Processos, e depois CRM no Passo 10), proponho:

**Mover `buscarRelacaoEntidade` e `verificarAutoridadeSobreEntidade` do `PartilhaService` para o `AuthorizationService`** (já o serviço único de autorização, Passo 5), tornando-os públicos e genéricos, e **refatorar o `PartilhaService` (Passo 7, já em produção) para os consumir daí**, em vez de manter a sua própria cópia. Isto é uma alteração a código já aprovado e commitado — trago-a explicitamente para validação, não decido por conta própria (System Design Principles, 3.7).

Ver 3.2 para o desenho completo.

### 2.3 Descoberta Adicional Durante a Implementação (validada antes de codificar)

Ao escrever o DTO de criação, confirmou-se que `Processo` **não tem campo `descricao`** desde o Passo 2, apesar de o Functional Specifications (3.3) o listar como parte da entidade ("Descrição | Texto longo | Não"). Sem o campo, o `descricao` já assumido no DTO deste documento (3.8) não teria onde ser guardado. **Validado com a Fundadora/CEO antes de implementar:** adicionar `Processo.descricao String?` ao schema, na mesma migração da promoção de `estado` a `enum` — refinamento de detalhe (Blueprint D4), mesmo padrão dos campos `criadoPor`/`atualizadoPor` já adicionados no Passo 2.

---

## 3. Conteúdo Estruturado

### 3.1 Migração de Base de Dados — `Processo.estado` para `enum`

```prisma
enum EstadoProcesso {
  por_fazer
  em_curso
  concluida
}

model Processo {
  // ...
  estado EstadoProcesso @default(por_fazer)
  // ...
}
```

Mesma classificação da mudança `Papel` no Passo 5 (Blueprint D4, "ajuste de tipo", não estrutural) — reforça a fronteira de validação ao nível da própria BD. A migração gerada pelo Prisma faz `ALTER COLUMN ... TYPE "EstadoProcesso" USING "estado"::text::"EstadoProcesso"` — seguro em `nexa_dev`/`nexa_test` (sem dados de produção, e os 3 valores já em uso literal coincidem exatamente com os do enum).

### 3.2 Centralização da Visibilidade RBAC — `AuthorizationService`

Três capacidades novas, adicionadas ao serviço único já existente (nunca um serviço paralelo, ADR-004 §3.3):

```ts
interface RelacaoEntidade {
  responsavelId: string;       // owner (Cliente) ou responsavel (Processo)
  departamentoId: string | null; // Departamento da entidade, ou do owner (Cliente)
}

type EscopoVisibilidade =
  | { tipo: 'total' }                                 // admin_empresa
  | { tipo: 'departamento'; departamentoId: string }   // gestor, com Departamento
  | { tipo: 'proprio'; utilizadorId: string }          // colaborador, ou gestor sem Departamento (Fail Secure)
  | { tipo: 'partilhado'; entidadeIds: string[] };     // convidado — via Partilha
```

- **`obterRelacaoEntidade(entidadeTipo, entidadeId): Promise<RelacaoEntidade | null>`** — movido de `PartilhaService.buscarRelacaoEntidade` (3.4 desse passo), sem alteração de lógica, agora público.
- **`podeAgirSobreEntidade(entidadeTipo, entidadeId): Promise<boolean>`** — substitui `PartilhaService.verificarAutoridadeSobreEntidade` (P1-P3), mas retorna `boolean` em vez de lançar exceção (consistente com `podeExecutar`/`podeAcederViaPartilha`, que já seguem este padrão) — quem chama decide o que fazer com `false` (tipicamente `ForbiddenException`).
- **`obterEscopoVisibilidade(entidadeTipo): Promise<EscopoVisibilidade>`** — nova capacidade, para consultas de listagem: `admin_empresa` → `total`; `gestor` com Departamento → `departamento`; `gestor` sem Departamento → `proprio` (Fail Secure — nunca assume "vê tudo" na ausência de Departamento); `colaborador` → `proprio`; `convidado` → `partilhado`, com os `entidadeId` das Partilhas ativas para esse `entidadeTipo` já resolvidos (consulta a `Partilha`, `revogadoEm: null`).

Cada módulo de negócio (Processos, e depois CRM) traduz o `EscopoVisibilidade` na sua própria cláusula Prisma — a **decisão** de quem vê o quê fica centralizada; a **tradução** para uma query concreta fica em cada módulo, porque a forma exata difere (campo direto `departamentoId` em `Processo`; relação `owner.departamentoId` em `Cliente`) — isto não é duplicação de regra, é a mesma regra aplicada a schemas diferentes.

### 3.3 Refatoração do `PartilhaService` (Passo 7)

`PartilhaService.conceder`/`revogar` passam a chamar `authorizationService.podeAgirSobreEntidade(...)` (lançando `ForbiddenException` se `false`) em vez da sua própria `verificarAutoridadeSobreEntidade`. `buscarRelacaoEntidade` é removido de `PartilhaService` — usa `authorizationService.obterRelacaoEntidade` diretamente. **`PartilhaService.listar()` não é alterado** — a sua lógica de âmbito por papel já é uma pergunta diferente ("que Partilhas envolvem entidades do meu Departamento", não "que entidades vejo"), não duplicada por este passo.

**Nenhuma mudança de comportamento observável** — os 40 testes de Partilha (Passo 7) continuam válidos sem alteração; a refatoração é puramente estrutural (D5, 4).

### 3.4 Exportações do `FundacaoModule`

`AuthorizationService`, `PermissaoGuard` e `SessionGuard` passam a ser exportados (hoje só `TenantPrismaService`) — necessário para que `ProcessosModule` (e módulos futuros: CRM, Dashboard) os consigam injetar/usar em `@UseGuards(...)`, sem os reimplementar. Mudança mecânica, sem impacto de comportamento.

### 3.5 Regras de Negócio — Processos (PR-01 a PR-07)

| # | Regra |
|---|---|
| PR-01 | `admin_empresa` pode criar/ver/editar/eliminar qualquer Processo da Empresa, com qualquer `responsavelId`/`departamentoId`. |
| PR-02 | `gestor` só vê/edita/elimina Processos cujo `departamentoId` coincide com o seu; ao criar/editar, só pode definir `responsavelId` para um Utilizador do seu Departamento, e `departamentoId` só pode ser o seu próprio. |
| PR-03 | `colaborador` só vê/edita (nunca elimina) Processos de que é `responsavelId`; ao criar, `responsavelId` tem de ser ele próprio (fornecido ou implícito); `departamentoId`, se fornecido, só pode ser `null` ou o seu próprio. |
| PR-04 | `convidado` nunca cria/edita/elimina; só vê Processos com Partilha ativa concedida a si (`nivelAcesso: leitura`, via `podeAcederViaPartilha`). |
| PR-05 | Associar um Processo a um `clienteId` (FR-16, UC-03 E1) exige que o criador tenha visibilidade sobre esse Cliente — mesma lógica de `obterEscopoVisibilidade('cliente')`, aplicada ainda que o módulo CRM (Passo 10) não exista como controlador — o modelo `Cliente` já existe desde o Passo 2. Rejeitar com erro claro se a validação falhar. |
| PR-06 | `departamentoId`/`clienteId` fornecidos (quando não `null`) têm de existir, pertencer à mesma Empresa (estrutural, Camada 1) e não estarem eliminados — mesma disciplina de RD-03 (Passo 8). |
| PR-07 | Eliminação é sempre soft-delete (`eliminadoEm`), nunca `DELETE` físico — `eliminar Processo` é ação exclusiva de `admin_empresa`/`gestor` (nunca `colaborador`, mesmo sobre os seus — Functional Specifications, 3.3, matriz). |

**Nota de modelação (não uma limitação a corrigir):** `Processo.departamentoId` é independente do `departamentoId` do `responsavelId` — um Processo pode pertencer formalmente a um Departamento diferente do da pessoa responsável (ex: uma tarefa cross-funcional). A visibilidade de Gestor segue sempre o `departamentoId` do Processo, nunca o do responsável.

### 3.6 Matriz de Permissões — Módulo `processos`

Ao contrário de Partilha/Departamento (capacidades transversais da Fundação, módulo `fundacao`), Processos é o primeiro módulo de negócio genuíno — usa o seu próprio módulo `processos` na matriz (já antecipado no comentário do schema desde o Passo 5).

| Ação | admin_empresa | gestor | colaborador | convidado |
|---|---|---|---|---|
| `criar` | true | true | true | false |
| `ver` | true | true | true | true *(âmbito limitado por `obterEscopoVisibilidade`/Partilha)* |
| `editar` | true | true | true | false |
| `eliminar` | true | true | false | false |

A permissão `ver: true` para todos os papéis é o gate estático (guard); o âmbito real de cada listagem/detalhe é decidido por `obterEscopoVisibilidade`/`podeAgirSobreEntidade`, nunca pelo guard sozinho — mesmo padrão já estabelecido para `listar_partilhas` (Passo 7).

### 3.7 Superfície de API

| Método | Rota | Ação | Autoridade adicional (serviço) |
|---|---|---|---|
| `POST` | `/processos` | `processos.criar` | PR-02/PR-03 (responsável/Departamento), PR-05 (Cliente), PR-06 |
| `GET` | `/processos` | `processos.ver` | `obterEscopoVisibilidade('processo')` |
| `GET` | `/processos/:id` | `processos.ver` | `podeAgirSobreEntidade` OR (`convidado` AND `podeAcederViaPartilha`) |
| `PATCH` | `/processos/:id` | `processos.editar` | `podeAgirSobreEntidade`, PR-02/PR-03 se `responsavelId`/`departamentoId` alterados |
| `DELETE` | `/processos/:id` | `processos.eliminar` | `podeAgirSobreEntidade` (nunca `colaborador`, já bloqueado pelo guard) |

Paginação `take`/`skip` (default `take=50`), mesmo padrão dos Passos 6/7/8.

### 3.8 DTOs

```ts
export class CriarProcessoDto {
  @IsString() @Length(2, 200) titulo!: string;
  @IsOptional() @IsString() descricao?: string;
  @IsString() responsavelId!: string; // obrigatório (Functional Specifications, 3.3)
  @IsOptional() @ValidateIf((o) => o.departamentoId !== null) @IsString() departamentoId?: string | null;
  @IsOptional() @ValidateIf((o) => o.clienteId !== null) @IsString() clienteId?: string | null;
  @IsOptional() @IsDateString() prazo?: string;
}

export class EditarProcessoDto {
  @IsOptional() @IsString() @Length(2, 200) titulo?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() responsavelId?: string;
  @IsOptional() @ValidateIf((o) => o.departamentoId !== null) @IsString() departamentoId?: string | null;
  @IsOptional() @ValidateIf((o) => o.clienteId !== null) @IsString() clienteId?: string | null;
  @IsOptional() @IsIn(['por_fazer', 'em_curso', 'concluida']) estado?: 'por_fazer' | 'em_curso' | 'concluida';
  @IsOptional() @IsDateString() prazo?: string | null;
}
```

### 3.9 Auditoria (extensão da convenção do Passo 6)

| `acao` | `entidade` | `detalhe` |
|---|---|---|
| `criar` | `Processo` | `{ dados: { titulo, responsavelId, departamentoId, clienteId } }` |
| `atualizar` | `Processo` | `{ alteracoes: { campo: { anterior, novo } } }` — só campos que mudaram |
| `eliminar` | `Processo` | `{ eliminadoEm: timestamp }` |

### 3.10 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-14 a FR-18 | ✅ CRUD completo, associação a Departamento/Cliente, visibilidade RBAC, navegação bidirecional (via `clienteId` na resposta) |
| Data Model Conceptual (D4) | ✅ Visibilidade RBAC como regra única (`obterEscopoVisibilidade`), nunca implementações separadas |
| ADR-004 (3.3) | ✅ `AuthorizationService` continua o único ponto de autorização, agora com 4 capacidades (`podeExecutar`, `podeAcederViaPartilha`, `obterRelacaoEntidade`, `podeAgirSobreEntidade`, `obterEscopoVisibilidade`) |
| System Design Principles (#1, monólito modular) | ✅ Primeiro módulo de negócio fora da Fundação, sem aceder a dados internos de outro módulo diretamente |

**Nenhum novo ADR necessário.**

**Risco R1 (herdado do Passo 7, agora resolvido):** `podeAcederViaPartilha` ganha o seu primeiro consumidor real — `GET /processos/:id` para Convidado.

**Risco R2 — refatoração de código já aprovado (Passo 7):** mover lógica do `PartilhaService` para `AuthorizationService` toca código em produção. Mitigação: os 40 testes existentes de Partilha correm sem alteração como regressão; qualquer falha bloqueia o Passo 9 até resolução.

**Risco R3 — validação PR-05 sem CRM ainda existir como módulo:** a validação de visibilidade sobre `Cliente` funciona (o modelo já existe), mas sem `POST /clientes` ainda (Passo 10), só é testável com `Cliente` criado via fixture direta (mesmo padrão do Passo 7, 2.1.A) — aceite conscientemente, mesma decisão já validada para Partilha.

### 3.11 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` cria um Processo para qualquer Utilizador | `201` |
| T2 | `gestor` cria um Processo para um Utilizador do seu Departamento | `201` |
| T3 | `gestor` tenta criar um Processo para um Utilizador de **outro** Departamento | `403` (PR-02) |
| T4 | `colaborador` cria um Processo para si mesmo | `201` |
| T5 | `colaborador` tenta criar um Processo para **outro** Utilizador | `403` (PR-03) |
| T6 | `convidado` tenta criar um Processo | `403` |
| T7 | `admin_empresa` vê todos os Processos da Empresa | ✅ |
| T8 | `gestor` só vê Processos do seu Departamento | ✅ |
| T9 | `colaborador` só vê Processos de que é responsável | ✅ |
| T10 | `convidado` só vê Processos com Partilha ativa concedida a si | ✅ |
| T11 | Após revogar a Partilha, `convidado` deixa de ver o Processo | ✅ |
| T12 | `colaborador` tenta eliminar um Processo seu | `403` (PR-07) |
| T13 | `gestor` elimina um Processo do seu Departamento | `200` |
| T14 | Associar um Processo a um Cliente sem visibilidade sobre ele | `403` (PR-05) |
| T15 | Associar um Processo a um Cliente com visibilidade | `201`/`200` |
| T16 | `estado` inválido (fora do enum) | `400` |
| T17 | Isolamento entre tenants | ✅ |
| T18 | Auditoria regista criar/atualizar/eliminar corretamente | ✅ |
| Regressão | Testes automatizados dos Passos 4-8 continuam a passar, incluindo Partilha após a refatoração (3.3) | ✅ |

**Exit Criteria:** T1-T18 e regressão passam; `npm run build` sem erros; nenhuma verificação de permissão feita diretamente por um controlador; `AuthorizationService` continua o único ponto de autorização.

### 3.12 Resultado da Implementação e Evidências de Validação

**Entregáveis:** migração `20260706163908_processo_estado_enum_e_descricao` (`EstadoProcesso`, `Processo.descricao`); `AuthorizationService` estendido com `obterRelacaoEntidade`, `podeAgirSobreEntidade`, `obterEscopoVisibilidade` (`autorizacao/authorization.service.ts`); `PartilhaService` refatorado para consumir as duas primeiras (removida a cópia privada); `FundacaoModule` a exportar `AuthorizationService`/`PermissaoGuard`/`SessionGuard`; novo módulo `apps/api/src/modules/processos/` (`processos.service.ts` com PR-01 a PR-07, `processos.controller.ts`, `dto/criar-processo.dto.ts`, `dto/editar-processo.dto.ts`), registado em `AppModule`; nova entrada `processos` na `DEFAULT_PERMISSION_MATRIX`; `apps/api/test/processos.e2e-spec.ts` (T1-T18).

**Descoberta emergente adicional, validada antes de implementar (2.3):** campo `Processo.descricao` em falta desde o Passo 2 — adicionado na mesma migração da promoção de `estado` a enum.

**Sem outras descobertas técnicas emergentes durante a implementação** — a refatoração do `PartilhaService` (2.2) correu exatamente como desenhada, sem alteração de comportamento; os 40 testes de Partilha passaram sem qualquer alteração ao ficheiro de teste.

**Resultados dos testes (Jest, `nexa_test`, 68/68, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T18 (este passo) | ✅ Todos |
| Regressão (Passos 4-8, 51 testes, incluindo Partilha pós-refatoração) | ✅ Sem alteração de comportamento |

Suite completa confirmada estável em 2 execuções consecutivas.

**`npm run build` / `eslint`:** ✅ sem erros (2 erros de `no-unused-vars` encontrados e corrigidos antes do resultado final).

**Exit Criteria do Passo 9: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D2 | Ver 2.1 (A-B) — decisões já validadas na Proposta de M2 | — |
| D3 | `obterRelacaoEntidade`/`podeAgirSobreEntidade`/`obterEscopoVisibilidade` movidos/adicionados ao `AuthorizationService`, `PartilhaService` refatorado para os consumir | Cumpre a Decisão B do M2 sem introduzir um terceiro sítio com a mesma lógica; único serviço de autorização (ADR-004 §3.3) |
| D4 | Módulo `processos` (não `fundacao`) na matriz de permissões | Primeiro módulo de negócio genuíno (EP-03), distinto das capacidades transversais da Fundação (Partilha, Departamento) |
| D5 | `FundacaoModule` passa a exportar `AuthorizationService`, `PermissaoGuard`, `SessionGuard` | Necessário para qualquer módulo de negócio (Processos, e futuros CRM/Dashboard) usar os mesmos guards/serviço, sem duplicar |
| D6 | `Processo.departamentoId` independente do Departamento do `responsavelId` (nota de modelação, 3.5) | Já é o desenho do schema desde o Passo 2; formalizado aqui para não ser confundido com um bug |
| D7 | `Processo.descricao` adicionado ao schema (2.3) | Em falta desde o Passo 2 apesar de exigido pelo Functional Specifications (3.3); descoberto ao escrever o DTO, validado antes de implementar |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `obterEntidadesDoDepartamento`-style de lista de IDs concreta (usada só internamente por `PartilhaService.listar`) não foi extraída para `AuthorizationService` — permanece local a `PartilhaService`, já que nenhum outro módulo precisa dela ainda | Nenhum agora; reavaliar se um terceiro consumidor surgir | CTO, se/quando necessário |
| 2 | Validação de PR-05 (Cliente) só testável com fixtures até o CRM (Passo 10) existir como módulo completo | Nenhum — mesma decisão já aceite para Partilha (Passo 7) | CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 9, incorporando as 2 decisões já validadas na Proposta de M2 (centralização de visibilidade; `Processo.estado` como enum) e propondo a refatoração do `AuthorizationService`/`PartilhaService` (2.2) para cumprir a Decisão B sem duplicação: mecanismo de visibilidade completo, regras PR-01 a PR-07, matriz de permissões do módulo `processos`, migração, auditoria, riscos, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 2.3 (descoberta emergente de `Processo.descricao` em falta, validada antes de implementar, D7) e a secção 3.12 (Resultado da Implementação e Evidências de Validação) com 68/68 testes reais (18 novos deste passo + regressão completa de 51 testes dos Passos 4-8, incluindo Partilha pós-refatoração sem alteração de comportamento), estáveis em 2 execuções consecutivas | CTO (Claude) |
| 1.2 | 2026-07-06 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 9 na íntegra (modelo, `AuthorizationService`, refatoração do `PartilhaService`, módulo `processos`, PR-01 a PR-07, integração de Partilha, 68/68 testes) | Fundadora/CEO |

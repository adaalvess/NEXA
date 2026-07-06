# NEXA — Especificação Técnica do Passo 7 (M1): Partilha (Convidado)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 7 — Partilha (Convidado) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M1 (Fundação), Passo 7 — pré-requisito para o encerramento formal do M1 |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado — Passo 7 encerrado; M1 (Fundação) formalmente concluído |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-35 · Data Model Conceptual v1.1 (3.3, D5) · Functional Specifications v1.1 (3.1) · Security & Access Principles v1.1 (3.4, D1) · ADR-004 (3.3, ponto 3) · Data & Consistency Rules v1.1 (3.4, 3.7) · Especificações Técnicas dos Passos 4-6 · Blueprint v1.7 |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o mecanismo que usa a entidade `Partilha` (já existente desde o Passo 2, sem uso ainda) para conceder ao papel Convidado a sua única via de acesso a uma entidade específica (`Cliente` ou `Processo`). Incorpora 4 decisões já validadas com a Fundadora/CEO antes deste documento (2.1).

---

## 2. Contexto

`Partilha` existe desde o Passo 2 (`empresaId`, `entidadeTipo`, `entidadeId`, `convidadoId`, `concedidoPorId`, `createdAt`), polimórfica (sem FK direta para `Cliente`/`Processo`, tal como `RegistoAuditoria`), sem nenhum mecanismo que a consulte ou escreva. O papel `Convidado` existe no `enum Papel` desde o Passo 5, sem nenhuma ação permitida em toda a `DEFAULT_PERMISSION_MATRIX` — este é o passo onde ganha a sua única via de acesso real. É também, por decisão da Fundadora/CEO (CLAUDE.md §3), pré-requisito para o encerramento formal do M1, apesar do Definition of Done literal (Blueprint §2.2) já estar tecnicamente cumprido desde o Passo 6.

Os módulos de negócio Processos (EP-03) e CRM (EP-04) ainda não existem como módulos completos — não há CRUD, controladores, nem regras de visibilidade próprias para `Cliente`/`Processo`. Os modelos Prisma existem desde o Passo 2 (com `ownerId`/`responsavelId`/`departamentoId` e escopo de tenant completos), mas sem nenhuma superfície de API. Este passo constrói o mecanismo de Partilha sobre esses modelos já existentes, sem antecipar os módulos EP-03/EP-04.

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Como demonstrar Partilha sem os módulos Processos/CRM existirem | **Entidades mínimas só para teste** — usar os modelos `Cliente`/`Processo` já existentes no schema (Passo 2), populados com dados reduzidos apenas para exercitar o mecanismo de Partilha, permissões, auditoria e isolamento entre tenants. Sem CRUD nem lógica de negócio desses módulos. Quando EP-03/EP-04 forem construídos, reutilizam esta infraestrutura de Partilha já validada, em vez de a duplicar. |
| B | Campo "Nível de acesso" (Functional Specifications, 3.1 — obrigatório, "apenas leitura no MVP") ausente do schema do Passo 2 | **Adicionar ao schema** — novo campo `nivelAcesso` (enum `NivelAcessoPartilha`, só o valor `leitura` possível no MVP). Fiel ao texto literal já aprovado; pronto para uma futura extensão (edição por Convidado), sem redesenho quando essa decisão for tomada. Refinamento de detalhe (Blueprint D4), não estrutural. |
| C | Mecanismo de revogação (ausente do modelo `Partilha` do Passo 2) | **Soft-delete** — novo campo `revogadoEm DateTime?`, seguindo o mesmo padrão já usado em `Utilizador`/`Departamento`/`Processo`/`Cliente` (Data & Consistency Rules, 3.4). Histórico de partilhas revogadas consultável diretamente, sem depender só do Registo de Auditoria. |
| D | Autoridade para conceder/revogar uma Partilha, dado que Processos/CRM ainda não têm modelo de edição próprio | **Papel + relação direta com a entidade** — duas condições cumulativas: (1) o papel do concedente tem a ação `conceder_partilha`/`revogar_partilha` permitida na matriz (módulo `fundacao` — Partilha é uma capacidade transversal da Fundação, System Design Principles 3.1, regra #2, não do CRM/Processos); e (2) o concedente tem uma relação direta com a entidade concreta (ver 3.4, regras P1-P4). Mais fiel ao literal do Functional Specifications ("deve ter permissão de edição sobre a entidade partilhada no momento da concessão"), reutiliza o padrão já validado no Passo 5 (RN-03, L3). |

---

## 3. Conteúdo Estruturado

### 3.1 Delimitação de Responsabilidades (continuação do Passo 6, §3.1)

| Camada | Responsabilidade | Estado |
|---|---|---|
| Autenticação (Passo 3) | Resolve sessão | ✅ |
| Camada 1 / Tenant (Passo 4) | Confina dados de negócio à Empresa | ✅ |
| RBAC (Passo 5) | Decide se o papel pode executar a ação | ✅ |
| Auditoria (Passo 6) | Regista o que aconteceu | ✅ |
| **Partilha (este passo)** | **Concede acesso de leitura a uma entidade específica a um Convidado — exceção pontual e explícita, verificada pelo mesmo `AuthorizationService`, nunca um caminho de acesso paralelo (Security & Access Principles, 3.4)** | 🔨 Este passo |

### 3.2 Migração de Base de Dados

```prisma
enum NivelAcessoPartilha {
  leitura
}

model Partilha {
  id             String              @id @default(cuid())
  empresaId      String
  empresa        Empresa             @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  entidadeTipo   String // "cliente" | "processo"
  entidadeId     String
  convidadoId    String
  convidado      Utilizador          @relation("PartilhaConvidado", fields: [convidadoId, empresaId], references: [id, empresaId], onDelete: Cascade)
  concedidoPorId String
  concedidoPor   Utilizador          @relation("PartilhaConcedidaPor", fields: [concedidoPorId, empresaId], references: [id, empresaId])
  nivelAcesso    NivelAcessoPartilha @default(leitura)
  revogadoEm     DateTime?
  createdAt      DateTime            @default(now())

  @@index([empresaId, entidadeTipo, entidadeId])
  @@index([empresaId, convidadoId])
}
```

- Dois campos novos (`nivelAcesso`, `revogadoEm`) — refinamento de detalhe (Blueprint D4), sem alteração estrutural às relações já existentes.
- Novo índice `[empresaId, convidadoId]` — suporta a query mais frequente do mecanismo de verificação (3.3) e a listagem "partilhas concedidas a mim" (3.6).
- RLS já cobre `Partilha` desde o Passo 4 (política por tabela, aplicada a todo modelo de negócio) — nenhuma alteração de política necessária.

### 3.3 Mecanismo de Verificação — `AuthorizationService.podeAcederViaPartilha`

```ts
async podeAcederViaPartilha(entidadeTipo: string, entidadeId: string): Promise<boolean> {
  const ctx = tenantContext.getStore();
  if (!ctx) {
    return false; // Fail Secure — mesmo padrão de podeExecutar.
  }

  const partilha = await this.tenantPrisma.client.partilha.findFirst({
    where: {
      entidadeTipo,
      entidadeId,
      convidadoId: ctx.utilizadorId,
      revogadoEm: null,
    },
  });

  return partilha !== null;
}
```

- Implementação literal de ADR-004 §3.3, ponto 3 ("Consulta a entidade Partilha quando aplicável") — uma nova pergunta que o mesmo `AuthorizationService` já existente (Passo 5) responde, ao lado de `podeExecutar`, nunca um serviço de autorização separado.
- **Semântica pura:** responde só "uma Partilha ativa concede acesso a ESTA entidade ao utilizador ATUAL" — não decide sozinho se o pedido deve ser aceite. Módulos futuros (Processos, CRM) que definirem a sua própria visibilidade por RBAC chamam este método como fallback quando o seu próprio `podeExecutar` recusar, especificamente para o papel Convidado (é a via através da qual FR-35 se cumpre). Este passo não constrói esses módulos — só o método fica pronto a ser consultado quando existirem.
- Consultado via `TenantPrismaService` — automaticamente confinado à Empresa do `TenantContext` (Camada 1), consistente com toda a arquitetura já aprovada.
- `revogadoEm: null` garante que uma Partilha revogada deixa de conceder acesso imediatamente — sem cache, sem atraso (ADR-004 §3.2, "uma revogação de Partilha tem de ter efeito imediato").

### 3.4 Autoridade para Conceder/Revogar uma Partilha — Regras P1-P5

Mesma disciplina do Passo 5 (L1-L6) — nenhuma ambiguidade sobre quem pode conceder ou revogar.

| # | Regra | Onde é aplicada |
|---|---|---|
| P1 | `admin_empresa` pode sempre conceder/revogar qualquer Partilha da sua Empresa | `PartilhaService`, sem restrição de instância |
| P2 | `gestor` pode conceder/revogar Partilha sobre um `Cliente` cujo `ownerId` pertence ao seu próprio Departamento, ou sobre um `Processo` do seu próprio Departamento (`departamentoId`) — mesmo padrão de RN-03/L3 (Passo 5) | `PartilhaService`, verificação de instância |
| P3 | `colaborador` pode conceder/revogar Partilha só sobre entidades de que é diretamente `owner` (`Cliente`) ou `responsavel` (`Processo`) | `PartilhaService`, verificação de instância |
| P4 | `convidado` nunca pode conceder nem revogar Partilha | `DEFAULT_PERMISSION_MATRIX` (`conceder_partilha`/`revogar_partilha`: `false`) — nunca chega à verificação de instância |
| P5 | O `convidadoId` alvo tem de referenciar um `Utilizador` da mesma Empresa com `papel === convidado` (Data Model Conceptual, 3.3 — "a um Utilizador com papel Convidado") | `PartilhaService`, validação antes de criar |

A autoridade para **revogar** segue as mesmas regras P1-P3, avaliadas contra o estado **atual** da entidade partilhada (não contra quem a concedeu originalmente) — se a titularidade mudar (ex: `Cliente` transferido para outro `owner`), a autoridade de revogação acompanha a entidade, nunca fica presa ao concedente original.

### 3.5 Matriz de Permissões — Novas Entradas

```ts
[Papel.admin_empresa]: {
  fundacao: {
    // ...entradas já existentes (Passos 5-6)
    conceder_partilha: true,
    revogar_partilha: true,
    listar_partilhas: true,
  },
},
[Papel.gestor]: {
  fundacao: {
    conceder_partilha: true,  // P2 verificado à parte, não aqui
    revogar_partilha: true,
    listar_partilhas: true,
  },
},
[Papel.colaborador]: {
  fundacao: {
    conceder_partilha: true, // P3 verificado à parte, não aqui
    revogar_partilha: true,
    listar_partilhas: true,
  },
},
[Papel.convidado]: {
  fundacao: {
    conceder_partilha: false,
    revogar_partilha: false,
    listar_partilhas: true, // única entrada `true` do Convidado em toda a matriz — só vê as suas próprias (3.6)
  },
},
```

`super_admin` não recebe estas entradas — mantém-se sem atuação dentro de uma Empresa cliente para além de `consultar_auditoria` (Especificação Técnica do Passo 6, 2.1.B), coerente com o já decidido.

### 3.6 Superfície de API

| Método | Rota | Guard | Autoridade adicional (serviço) |
|---|---|---|---|
| `POST` | `/partilhas` | `SessionGuard`, `PermissaoGuard('fundacao','conceder_partilha')` | P1-P3, P5 |
| `DELETE` | `/partilhas/:id` | `SessionGuard`, `PermissaoGuard('fundacao','revogar_partilha')` | P1-P3 (contra a entidade atual) |
| `GET` | `/partilhas` | `SessionGuard`, `PermissaoGuard('fundacao','listar_partilhas')` | Âmbito da listagem varia por papel (abaixo) |

**`POST /partilhas`** — DTO `{ entidadeTipo: 'cliente' \| 'processo', entidadeId: string, convidadoId: string }` (`nivelAcesso` nunca no DTO — o serviço fixa sempre `leitura`, único valor possível no MVP, mesmo padrão de `PAPEIS_ATRIBUIVEIS` do Passo 5 fixar a fronteira de valores aceites). O serviço valida, por esta ordem: (1) `entidadeId` existe e pertence à Empresa (Camada 1); (2) P5 — `convidadoId` é `Utilizador` da Empresa com `papel === convidado`; (3) P1/P2/P3 conforme o papel do concedente; emite evento de auditoria (3.7) só depois de tudo validado.

**`DELETE /partilhas/:id`** — soft-delete (`revogadoEm: now()`), nunca `DELETE` físico (Data & Consistency Rules, 3.4). Rejeita (`404`) se já revogada.

**`GET /partilhas`** — âmbito por papel:
- `admin_empresa`: todas as Partilhas da Empresa.
- `gestor`: as que concedeu, mais as que envolvem entidades do seu Departamento.
- `colaborador`: só as que concedeu.
- `convidado`: só as que lhe foram concedidas a ele (`convidadoId === ctx.utilizadorId`) — é a forma como o próprio Convidado descobre a que tem acesso.

Paginação simples (`take`/`skip`, default `take=50`), mesmo padrão do Passo 6.

### 3.7 Auditoria (integração com o Passo 6)

Extensão da convenção já fixada (Especificação Técnica do Passo 6, 3.3.3) — nenhuma alteração ao mecanismo, só novas categorias de `acao`:

| `acao` | `entidade` | `detalhe` |
|---|---|---|
| `criar` | `Partilha` | `{ entidadeTipo, entidadeId, convidadoId }` |
| `eliminar` | `Partilha` | `{ revogadoEm: timestamp }` — nome do campo alinhado com o schema real (3.2), em vez do `eliminadoEm` genérico já usado para outras entidades |

Ambos os eventos via `emitAsync` (aguardado), mesmo padrão de todas as ações de escrita desde o Passo 6 — a concessão/revogação de uma Partilha é, tal como a atribuição de papel, uma das ações mais sensíveis do RBAC.

### 3.8 Entidades Mínimas para Demonstração (decisão 2.1.A)

Sem controlador nem serviço de CRUD para `Cliente`/`Processo` — os testes e2e criam as linhas mínimas diretamente via o cliente `nexa_dev` (`adminClient`, mesmo padrão já usado em `rbac.e2e-spec.ts` para `Departamento`/`Utilizador`), só com os campos obrigatórios do schema (Passo 2). Nenhum novo endpoint de negócio para estas entidades nasce deste passo — ficam exclusivamente para EP-03/EP-04.

### 3.9 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-35 | ✅ Concessão explícita de acesso a uma entidade específica a um Convidado |
| Data Model Conceptual (3.3) | ✅ `Partilha` usada exatamente como especificada, com os 2 campos em falta (2.1.B/C) agora presentes |
| Functional Specifications (3.1) | ✅ Nível de acesso (leitura), validação de concedente com relação à entidade, Convidado só da mesma Empresa |
| Security & Access Principles (3.4, D1) | ✅ Partilha verificada pelo mesmo `AuthorizationService`, nunca um caminho paralelo |
| ADR-004 (3.3, ponto 3) | ✅ `podeAcederViaPartilha` implementa literalmente o 3º passo do serviço único |
| Data & Consistency Rules (3.4) | ✅ Revogação por soft-delete, mesmo padrão de outras entidades |

**Nenhum novo ADR necessário.**

**Risco R1 — método `podeAcederViaPartilha` fica sem nenhum consumidor real de produto neste passo:** como Processos/CRM ainda não existem, não há nenhum endpoint de negócio que hoje chame este método fora dos testes. Mitigação: aceite conscientemente, coerente com a decisão 2.1.A — o mecanismo fica construído e validado agora; EP-03/EP-04 consomem-no quando existirem, sem o reconstruir. Documentado explicitamente para não ser confundido com código morto no futuro.

**Risco R2 — P2 depende de `Cliente` não ter `departamentoId` próprio:** a autoridade do Gestor sobre um `Cliente` deriva do Departamento do seu `owner` (Utilizador), não de um campo direto na entidade `Cliente`. Se EP-04 (CRM) vier a introduzir um conceito de Departamento por Cliente distinto do Departamento do `owner`, esta regra terá de ser revista nessa altura — não é uma limitação deste passo, é uma dependência explícita a registar para EP-04.

### 3.10 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` concede Partilha de um `Cliente` a um Convidado da mesma Empresa | `201`, Partilha criada com `nivelAcesso: leitura` |
| T2 | `colaborador` concede Partilha sobre um `Cliente` de que é `owner` | `201` |
| T3 | `colaborador` tenta conceder Partilha sobre um `Cliente` de que **não** é `owner` | `403` (P3) |
| T4 | `gestor` concede Partilha sobre um `Processo` do seu Departamento | `201` |
| T5 | `gestor` tenta conceder Partilha sobre um `Processo` de **outro** Departamento | `403` (P2) |
| T6 | Tentativa de conceder Partilha a um `Utilizador` que **não** tem papel `convidado` | `400`/`403` (P5) |
| T7 | Tentativa de conceder Partilha a um `Utilizador` de **outra** Empresa | `404`/`403` (estrutural, Camada 1) |
| T8 | `convidado` tenta conceder ou revogar qualquer Partilha | `403` (P4) |
| T9 | `podeAcederViaPartilha` retorna `true` para um Convidado com Partilha ativa sobre a entidade correta | ✅ |
| T10 | `podeAcederViaPartilha` retorna `false` para o mesmo Convidado sobre uma entidade **diferente** | ✅ |
| T11 | Após `DELETE /partilhas/:id`, `podeAcederViaPartilha` passa a retornar `false` imediatamente | ✅ |
| T12 | `GET /partilhas` como Convidado só devolve as suas próprias | ✅ |
| T13 | `GET /partilhas` como `admin_empresa` devolve todas as da Empresa | ✅ |
| T14 | Concessão e revogação geram entradas corretas no `RegistoAuditoria` (`criar`/`Partilha`, `eliminar`/`Partilha`) | ✅ |
| T15 | Isolamento entre tenants: uma Partilha de uma Empresa nunca é visível/afetável a partir doutra | ✅ |
| Regressão | Testes automatizados dos Passos 4-6 continuam a passar | ✅ |

**Exit Criteria:** T1-T15 e regressão passam; `npm run build` sem erros; nenhuma verificação de permissão feita diretamente por um controlador; `podeAcederViaPartilha` consultado exclusivamente através do `AuthorizationService` único.

### 3.11 Resultado da Implementação e Evidências de Validação

**Entregáveis:** migração `20260706150132_add_partilha_nivel_acesso_e_revogacao` (`NivelAcessoPartilha`, `Partilha.nivelAcesso`/`revogadoEm`, índice `[empresaId, convidadoId]`); `AuthorizationService.podeAcederViaPartilha` (Passo 5); novas entradas `conceder_partilha`/`revogar_partilha`/`listar_partilhas` na `DEFAULT_PERMISSION_MATRIX`; `apps/api/src/modules/fundacao/partilha/` (`partilha.service.ts` com as regras P1-P5, `partilha.controller.ts`, `dto/conceder-partilha.dto.ts`); `apps/api/test/partilha.e2e-spec.ts` (T1-T15).

**Descoberta durante a aplicação da migração a `nexa_test` (não é um bug de código, foi um erro de execução do próprio processo de migração):** `prisma migrate deploy` contra `nexa_test`, correndo com o ficheiro `.env.test`, falhava com `permission denied for schema public`. Investigação revelou que `nexa_dev` já era o dono real de `nexa_test` (`pg_database.datdba`) — nunca precisou de nenhum `GRANT` adicional, ao contrário do que se suspeitou inicialmente. A causa real: `schema.prisma` lê sempre `DATABASE_URL` (nunca `DATABASE_ADMIN_URL`), e em `.env.test` essa variável aponta para o role `nexa_app` (runtime de negócio, sem DDL, por desenho — Least Privilege). O comando de migração nunca chegou a correr como `nexa_dev`. **Corrigido** substituindo `DATABASE_URL` por `DATABASE_ADMIN_URL` só para o comando de migração contra `nexa_test`, sem alterar nenhum ficheiro `.env` persistente — documentado como D9 (4) para não se repetir em passos futuros.

**Resultados dos testes (Jest, `nexa_test`, 40/40, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T15 (este passo) | ✅ Todos |
| Regressão (Passos 4-6, 27 testes) | ✅ Sem alteração de comportamento |

Suite completa confirmada estável em 2 execuções consecutivas.

**`npm run build` / `eslint`:** ✅ sem erros (2 erros de `no-unused-vars` no ficheiro de teste, encontrados e corrigidos antes do resultado final).

**Exit Criteria do Passo 7: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D4 | Ver 2.1 (A-D) — decisões já validadas antes deste documento | — |
| D5 | `podeAcederViaPartilha` fica no `AuthorizationService` já existente (Passo 5), não num serviço novo | Um único serviço de autorização, consultado por todos (ADR-004 §3.3) — Partilha é mais uma pergunta que esse serviço responde, nunca um mecanismo paralelo |
| D6 | Autoridade de conceder/revogar usa a ação `fundacao.conceder_partilha`/`revogar_partilha` (módulo `fundacao`), não `crm`/`processos` | Partilha é uma capacidade transversal da Fundação (System Design Principles, regra #2 — "só a Fundação tem acesso transversal reconhecido"), não uma ação de um módulo de negócio que ainda não existe |
| D7 | Guard estático (`PermissaoGuard`) verifica só a permissão de papel; a verificação de instância (P1-P3) fica no serviço, nunca no controlador | Mesmo padrão já estabelecido em `UtilizadoresService.atribuirPapel` (Passo 5) — o guard cobre o caso estático, o serviço cobre o caso dinâmico (depende do alvo concreto) |
| D8 | Autoridade de revogação avaliada contra o estado atual da entidade, não contra o concedente original | Evita que a autoridade fique presa a um utilizador que possa já não ter relação com a entidade (ex: `owner` alterado) |
| D9 | Migrações contra `nexa_test` devem sempre usar `DATABASE_ADMIN_URL` (`nexa_dev`), nunca `DATABASE_URL` de `.env.test` | Descoberto ao aplicar a migração deste passo (3.11) — `DATABASE_URL` de `.env.test` aponta para `nexa_app` (sem DDL, por desenho); não é uma falta de permissão real, é a variável errada para este comando |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `podeAcederViaPartilha` fica sem consumidor de produto real até EP-03/EP-04 existirem (R1, 3.9) | Nenhum, mecanismo construído e testado, pronto a ser consumido | CTO, quando EP-03/EP-04 forem construídos |
| 2 | Dependência de `Cliente` não ter `departamentoId` próprio para a regra P2 (R2, 3.9) | Pode exigir revisão de P2 quando EP-04 (CRM) definir o seu próprio modelo de Departamento por Cliente | CTO, no momento de especificar EP-04 |
| 3 | Partilha com Utilizador de outra Empresa (mencionado como possibilidade futura no Data Model Conceptual, 3.3) — fora de âmbito deste passo | Nenhum no MVP — só Convidados da mesma Empresa | CEO + CTO, se e quando essa capacidade for priorizada |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 7, incorporando as 4 decisões já validadas (entidades mínimas para teste; campo `nivelAcesso`; revogação por soft-delete `revogadoEm`; autoridade por papel + relação direta, regras P1-P5): mecanismo `podeAcederViaPartilha`, migração, superfície de API, integração com auditoria, riscos, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.11 (Resultado da Implementação e Evidências de Validação) com 40/40 testes reais (13 novos deste passo + regressão completa dos Passos 4-6), estáveis em 2 execuções consecutivas; registada a descoberta D9 sobre a variável de ambiente incorreta usada na migração contra `nexa_test` (não era uma falta de permissão real) | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-06 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 7 na íntegra (schema, `podeAcederViaPartilha`, regras P1-P5, endpoints `/partilhas`, auditoria, migrações, 40/40 testes) e a decisão D9. **Com esta aprovação, o Milestone M1 (Fundação) é formalmente declarado concluído** — todos os passos previstos no Blueprint para este marco (0-7) estão implementados, validados e aprovados | Fundadora/CEO |

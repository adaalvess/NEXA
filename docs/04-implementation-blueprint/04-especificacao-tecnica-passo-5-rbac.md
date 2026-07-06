# NEXA — Especificação Técnica do Passo 5 (M1): RBAC Granular

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 5 — RBAC Granular, Renovação Deslizante de Sessão, Integração com o TenantContext |
| **Fase** | 7 — Desenvolvimento da Plataforma, M1 (Fundação), Passo 5 |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Vision Document v1.1 (RBAC) · Data Model Conceptual v1.1 (3.2, "Papel e Regras de Permissão") · Functional Requirements v1.1 (FR-02 a FR-04) · Functional Specifications v1.1 (3.1, Matriz de Permissões — Fundação) · Use Cases v1.0 (UC-01, UC-02) · System Design Principles v1.6 (3.5) · Security & Access Principles v1.1 (3.1, 3.3, 3.4, 3.9) · ADR-004 (3.3) · Especificações Técnicas dos Passos 3 e 4 · Blueprint v1.4 |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o modelo de permissões granulares (RBAC) — decisão deliberadamente adiada até este passo (CLAUDE.md, §5) — a renovação deslizante da sessão (pendente desde o Passo 4), e a sua integração com o `TenantContext` já estabelecido. Incorpora 3 decisões de âmbito já validadas com a Fundadora/CEO antes deste documento (ver 2.1).

---

## 2. Contexto

O Passo 4 entregou o `TenantContext` (`utilizadorId`, `empresaId`, `papel`) e o `TenantPrismaService` (Camada 1). O Passo 5 constrói sobre isto o **serviço único de autorização** que ADR-004 (3.3) já antecipa: carrega o papel e as regras granulares da Empresa, aplica negação por defeito. Ainda não existe nenhum módulo de negócio (Processos, CRM, Dashboard) — este passo prepara o mecanismo para quando existirem, e aplica-o já ao único endpoint de negócio que a Fundação hoje expõe.

### 2.1 Decisões de Âmbito Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Papel "Super Administrador" (equipa interna NEXA, acesso transversal a todas as Empresas) | **Só estrutural neste passo.** Reconhecido e atribuível (nunca via fluxo normal, RN-04), mas **sem** lógica de bypass cross-tenant implementada — isso fica para o Passo 6, quando existir Registo de Auditoria para consultar. Isolamento entre tenants permanece absoluto neste passo. |
| B | UC-02 (Convidar Utilizador por email) | **Fora de âmbito.** Exige fornecedor de email (sem ADR) e verificação de limite de plano (`SubscricaoPlano` adiado no Passo 3). Sem mecanismos provisórios de convite/ativação. Permanece dependência explícita do roadmap. |
| C | Nova entidade `RegraPermissao` (FR-04) | **Aprovada**, com estrutura completa detalhada em 3.2 abaixo, sujeita a validação formal desta especificação antes de implementar. |

---

## 3. Conteúdo Estruturado

### 3.1 Delimitação de Responsabilidades (continuação de Passo 4, §3.1)

| Camada | Responsabilidade | Estado |
|---|---|---|
| Autenticação (Passo 3) | Resolve sessão → `{ utilizadorId, empresaId, papel }` | ✅ |
| Camada 1 / Tenant (Passo 4) | Confina toda a query de negócio à Empresa do `TenantContext` | ✅ |
| **RBAC / Autorização (este passo)** | **"Este papel, com as regras desta Empresa, pode executar esta ação sobre este módulo?"** | 🔨 Este passo |
| Partilha (Passo 7) | Exceção pontual a uma entidade específica para um Convidado | Ainda não existe — tratado como "sem partilhas" |
| Auditoria (Passo 6) | Regista a ação depois de decidida/executada; é onde o Super Admin ganha consulta cross-tenant | Ainda não existe |

### 3.2 Modelo de Dados — `RegraPermissao` (FR-04)

```prisma
model RegraPermissao {
  id        String   @id @default(cuid())
  empresaId String
  empresa   Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  papel     String   // papel RBAC a que a regra se aplica (nunca "super_admin" — RN-04, ver 3.4)
  modulo    String   // "fundacao" | "dashboard" | "processos" | "crm" | "ia" | "comercial"
  acao      String   // vocabulário próprio por módulo — ver 3.3
  permitido Boolean  // override explícito: true concede, false revoga, face ao default do papel

  criadoPor     String?
  atualizadoPor String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([empresaId, papel, modulo, acao])
  @@index([empresaId])
}
```

- **Uma linha por combinação (Empresa, papel, módulo, ação)** — a ausência de linha significa "usa o default do papel" (3.3); a presença de uma linha **sobrepõe-se sempre** ao default, em qualquer sentido (concede o que o default nega, ou revoga o que o default concede) — implementação direta de FR-04 ("regras granulares adicionais... sobre a base dos Papéis predefinidos").
- **Tenant-scoped** (`empresaId`), automaticamente coberta pela Camada 1 (`TenantPrismaService`) e por uma nova política RLS — sem alteração ao mecanismo genérico do Passo 4 (aplica-se a "todos os modelos exceto Empresa").
- **`papel` nunca pode ser `"super_admin"`** — validado na fronteira única (3.6) — consistente com RN-04 (Super Admin nunca é atribuível/configurável por uma Empresa cliente).

### 3.3 `AuthorizationService` — o Serviço Único (ADR-004, 3.3)

```ts
async podeExecutar(modulo: string, acao: string): Promise<boolean> {
  const ctx = tenantContext.getStore();
  if (!ctx) return false; // Fail Secure — sem contexto, nunca permite

  const regra = await this.tenantPrisma.client.regraPermissao.findFirst({
    where: { papel: ctx.papel, modulo, acao },
  });
  if (regra) return regra.permitido; // override explícito da Empresa tem sempre prioridade

  return DEFAULT_PERMISSION_MATRIX[ctx.papel]?.[modulo]?.[acao] ?? false; // negação por defeito
}
```

- **`DEFAULT_PERMISSION_MATRIX`** é uma constante de configuração (não espalhada em `if`s pelos controladores — Coding Standards, 3.3/System Design Principles 3.5), traduzindo diretamente a Matriz de Permissões — Fundação (Functional Specifications, 3.1):

  | Papel | `fundacao.criar_departamento` | `fundacao.editar_permissoes` | `fundacao.atribuir_papel` |
  |---|---|---|---|
  | `admin_empresa` | true | true | true |
  | `gestor` | false | false | true *(RN-03: âmbito da sua equipa, ver 3.5)* |
  | `colaborador` | false | false | false |
  | `convidado` | false | false | false |
  | `super_admin` | — *(não atua dentro de uma Empresa cliente — 2.1.A)* | — | — |

- **`PermissaoGuard`** (`@RequirePermissao(modulo, acao)`, decorator + Guard): chama `AuthorizationService.podeExecutar`; nega com `403 Forbidden` se `false`. Nenhum controlador verifica permissões diretamente (regra não-negociável #13). Esta é só a primeira das várias verificações do fluxo completo — ver 3.4.

### 3.4 Autoridade para Alterar o Papel de um Utilizador Existente — Definição Inequívoca

*Secção reescrita a pedido explícito da Fundadora/CEO: "convidar" e "alterar papel de utilizador existente" não são tratadas como automaticamente equivalentes — são operações distintas, com regras próprias, ainda que os atores de base se sobreponham.*

**1. Quem está autorizado a alterar o papel de um Utilizador existente:**

| Papel do ator | Autorizado? | Âmbito |
|---|---|---|
| `admin_empresa` | Sim | Qualquer Utilizador da sua Empresa |
| `gestor` | Sim, com restrição | Só Utilizadores do seu próprio Departamento/Equipa (RN-03) |
| `colaborador` | Não | — |
| `convidado` | Não | — |
| `super_admin` | Não aplicável | Não atua dentro de uma Empresa cliente (2.1.A) |

**2. É a mesma autoridade que "convidar utilizador", ou diferente?** Os **atores de base são os mesmos** — RN-03 já usa o verbo "atribuir papéis" de forma genérica ("Um Gestor só pode convidar e **atribuir papéis** dentro do seu próprio Departamento/Equipa"), não restrito ao momento do convite. Mas **alterar** introduz três riscos que **convidar** (sempre aditivo, sobre uma pessoa nova) não tem — por isso esta operação tem **verificações adicionais**, detalhadas no ponto 3, que não se aplicam ao convite.

**3. Limites explícitos (mínimo exigido, todos verificados nesta ordem):**

| # | Limite | Implementação |
|---|---|---|
| L1 | **Um Utilizador nunca pode alterar o seu próprio papel** | `req.utilizador.utilizadorId === alvo.id` → `403 Forbidden`, antes de qualquer outra verificação |
| L2 | **Nenhum Utilizador pode atribuir um papel com privilégio maior do que o seu próprio** | Hierarquia explícita (dentro do âmbito de uma Empresa): `admin_empresa` (1, mais privilegiado) > `gestor` (2) > `colaborador` (3) > `convidado` (4, menos privilegiado). Só permitido se `rank(papel_novo) >= rank(papel_do_ator)`. Um Gestor (rank 2) nunca pode promover ninguém a `admin_empresa` (rank 1); só um `admin_empresa` pode criar outro `admin_empresa`. `super_admin` fica fora desta hierarquia — nunca atribuível por ninguém dentro de uma Empresa (RN-04, L4) |
| L3 | **Gestor só atua dentro do seu próprio Departamento/Equipa** | RN-03 — compara `departamentoId` do alvo com o do Gestor. Verificação de **âmbito de dados** (sobre quem), distinta de L2 (que decide **qual papel**) |
| L4 | **Nunca atribuível: `super_admin`** (RN-04) | Validado na fronteira única (DTO) — `400 Bad Request`, antes de qualquer verificação de autoridade |
| L5 | **Nunca zero `admin_empresa` na Empresa** (RN-01) | Se o alvo é atualmente `admin_empresa` e o novo papel não é, verifica-se, na mesma transação, que fica pelo menos um `admin_empresa` — `409 Conflict` se não |
| L6 | **Admin da Empresa só gere Utilizadores da sua própria Empresa; isolamento entre tenants sempre respeitado** | **Estruturalmente garantido pela Camada 1** (Passo 4) — `TenantPrismaService` funde sempre `empresaId` do `TenantContext` no `where`; um `id` de outra Empresa devolve "Record not found" (Prisma Extended Where Unique Input), nunca chega a existir a possibilidade de atravessar tenant. Não é uma verificação de aplicação adicional neste passo — é a mesma garantia já provada no Passo 4 (T3), aplicada automaticamente a este novo endpoint |

**Ordem de verificação completa** (cada uma só corre se a anterior passar): L4 (DTO, `super_admin` nunca) → `SessionGuard` (autenticado) → `PermissaoGuard('fundacao', 'atribuir_papel')` (3.3, autorização de base) → L1 (não pode alterar-se a si próprio) → L2 (hierarquia — não pode atribuir papel mais privilegiado que o seu) → L3 (RN-03, âmbito do Gestor) → L5 (RN-01, nunca zero admins) → `TenantPrismaService.utilizador.update(...)` (L6 garantido estruturalmente).

**4. Reflexo na matriz de permissões e no `AuthorizationService`:** `fundacao.atribuir_papel` continua a ser a ação de base verificada por `PermissaoGuard`/`DEFAULT_PERMISSION_MATRIX` (decide **se** o papel do ator, em geral, pode alterar papéis — `admin_empresa`/`gestor` sim, `colaborador`/`convidado` não). Os limites L1-L6 são verificações **adicionais e sequenciais**, implementadas no `AuthController`/serviço de negócio deste endpoint especificamente (não no `AuthorizationService` genérico) — porque L1, L2 e L5 dependem do **alvo concreto** da operação (quem está a ser alterado, para que papel), não apenas do módulo/ação genéricos que o `AuthorizationService` conhece. Isto é consistente com Security & Access Principles (3.3): a autorização de base nunca deriva, só consulta regras explícitas — as regras de negócio específicas desta operação (RN-01/03/04 + hierarquia) são exatamente isso, regras explícitas, só que específicas deste endpoint em vez de genéricas a todos os módulos.

### 3.5 Endpoint Implementado — `PATCH /utilizadores/:id/papel`

- Único endpoint de negócio construído neste passo (Blueprint, §4) — suficiente para demonstrar o DoD do M1 ("5 papéis atribuíveis e a restringir acesso corretamente") sem depender de email/limites de plano (2.1.B).
- DTO valida: `papel` pertence ao conjunto `{admin_empresa, gestor, colaborador, convidado}` — **nunca `super_admin`** (L4/RN-04, `400`) — fronteira única de validação (Data & Consistency Rules, 3.6).
- Fluxo completo: ver a ordem de verificação em 3.4.

### 3.6 Renovação Deslizante da Sessão (pendente do Passo 4)

No `TenantContextMiddleware`, depois de validar a sessão: se `expiraEm` está a **menos de 6 dias** do momento atual (i.e., já passou mais de 1 dia desde a última renovação), atualiza `expiraEm = now + 7 dias`. Limiar de 1 dia evita uma escrita à BD em **todos** os pedidos (custo desproporcional) mantendo a semântica de "sessão desliza com o uso" (ADR-007, 3.5). Usa `PrismaService` bruto (mesma exceção transversal já documentada).

### 3.7 Refinamento de Detalhe — `Utilizador.papel` passa a `enum`

```prisma
enum Papel {
  super_admin
  admin_empresa
  gestor
  colaborador
  convidado
}
```
Substitui `papel String` por `papel Papel` em `Utilizador`. Classificado como "ajuste de tipo" (Blueprint, D4) — não estrutural, não exige nova referência formal. Reforça a fronteira única de validação ao nível da própria base de dados (nenhum valor de papel inválido pode ser persistido, mesmo por erro de aplicação).

### 3.8 Migração de Base de Dados

Nova migração: `RegraPermissao` (tabela + índices), `enum Papel`, política RLS para `RegraPermissao` (mesmo padrão do Passo 4 — `empresaId = current_setting(...)`). Concedidos automaticamente a `nexa_app`/`nexa_fundacao` via `ALTER DEFAULT PRIVILEGES` já configurado no Passo 4 — **a confirmar empiricamente na implementação**, não assumido.

### 3.9 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| ADR-004 (3.3) | ✅ Serviço único de autorização, consultando papel + regras granulares, com negação por defeito |
| Security & Access Principles (3.1, 3.3, 3.4, 3.9) | ✅ Ponto único (3.1); autorização nunca deriva, só consulta regras explícitas (3.3); Partilha ainda não existe, tratado como ausente, não como exceção lateral (3.4); Fail Secure/Least Privilege (3.9) |
| System Design Principles (3.5) | ✅ Regras granulares por Empresa são dados (`RegraPermissao`), nunca hardcoding |
| Data Model Conceptual (3.2) | ✅ `RegraPermissao` implementa a entidade conceptual "Papel e Regras de Permissão" já aprovada |

**Nenhum novo ADR necessário.**

### 3.10 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Admin da Empresa muda o papel de um Colaborador para Gestor | `200`, papel atualizado |
| T2 | Admin (ou qualquer papel) tenta alterar o **seu próprio** papel | `403` (L1) |
| T3 | Gestor tenta promover alguém a `admin_empresa` | `403` (L2 — hierarquia, papel mais privilegiado que o seu) |
| T4 | Gestor muda papel de Utilizador **fora** do seu Departamento (mas para um papel dentro da hierarquia permitida) | `403` (L3/RN-03) |
| T5 | Gestor muda papel de Utilizador **dentro** do seu Departamento, para `colaborador` (dentro da hierarquia) | `200` (confirma que L3 não bloqueia o caso legítimo) |
| T6 | Qualquer ator tenta atribuir `super_admin` | `400` (L4/RN-04) |
| T7 | Admin tenta demover o único `admin_empresa` da Empresa | `409` (L5/RN-01) |
| T8 | Admin tenta alterar papel de Utilizador de **outra** Empresa (id inexistente no seu tenant) | `404` (L6 — garantido estruturalmente pela Camada 1) |
| T9 | `RegraPermissao` com `permitido=false` bloqueia `fundacao.atribuir_papel` que o default do papel permitiria | `403` |
| T10 | `RegraPermissao` com `permitido=true` permite uma ação que o default do papel negaria | `200` |
| T11 | Colaborador tenta `PATCH /utilizadores/:id/papel` | `403` (default nega, `PermissaoGuard` de base) |
| T12 | Sessão com `expiraEm` a mais de 6 dias no futuro — pedido não renova (sem escrita à BD) | `expiraEm` inalterado |
| T13 | Sessão com `expiraEm` a menos de 6 dias — pedido renova | `expiraEm` atualizado para +7 dias |
| Regressão | Testes automatizados do Passo 4 (isolamento multi-tenant) continuam a passar | ✅ |

**Exit Criteria:** T1-T13 e regressão passam (Jest, `nexa_test`); `npm run build` sem erros; os 5 papéis RBAC demonstravelmente atribuíveis e a restringir acesso (DoD do M1); todos os limites L1-L6 de 3.4 verificados individualmente por teste próprio; nenhuma lógica de bypass cross-tenant (Super Admin) nem de Partilha antecipada.

### 3.11 Resultado da Implementação e Evidências de Validação

**Entregáveis:** `enum Papel` + `RegraPermissao` no `schema.prisma`; migração `20260706120040_add_rbac_regra_permissao_papel_enum` (inclui política RLS para `RegraPermissao`); `apps/api/src/modules/fundacao/autorizacao/` (`authorization.service.ts`, `permissao.guard.ts`, `require-permissao.decorator.ts`, `permission-matrix.ts`); `apps/api/src/modules/fundacao/auth/utilizadores.controller.ts` + `utilizadores.service.ts` + `dto/atribuir-papel.dto.ts`; `TenantContextMiddleware` estendido com renovação deslizante; `FundacaoModule` atualizado.

**Verificação empírica adicional (3.8):** confirmado que `ALTER DEFAULT PRIVILEGES` configurado no Passo 4 se estende automaticamente a tabelas novas — `nexa_app`/`nexa_fundacao` já tinham `SELECT/INSERT/UPDATE/DELETE` em `RegraPermissao` assim que a migração foi aplicada, sem qualquer `GRANT` manual, em `nexa_dev` e `nexa_test`.

**Correção encontrada durante a escrita dos testes (não uma decisão arquitetural, uma lacuna de fidelidade do harness de teste):** os testes Jest deste passo e do Passo 4 (`tenant-context-http.e2e-spec.ts`) constroem a aplicação de teste diretamente via `Test.createTestingModule(...).createNestApplication()`, que **não** herda o `app.useGlobalPipes(...)` registado em `main.ts` — os DTOs nunca eram, de facto, validados nestes testes. Revelado pelo teste T6 (tentar atribuir `super_admin` devolvia `200` em vez de `400`). Corrigido em ambos os ficheiros de teste, adicionando o mesmo `ValidationPipe` do `main.ts` real. Sem esta correção, T6 teria "passado" por acidente antes da correção do DTO ser sequer necessária — ou seja, o teste estava a validar o comportamento errado sem o saber.

**Resultados dos testes (Jest, `nexa_test`, 19/19):**

| # | Resultado |
|---|---|
| T1-T13 (este passo) | ✅ Todos, incluindo os 6 limites L1-L6 individualmente |
| Regressão (Passo 4, T1-T4 + verificação HTTP) | ✅ 6/6, sem alteração de comportamento |

**Demonstração manual adicional contra `nexa_dev`** (servidor real, `npm run start`): registo + login; `PATCH` bem-sucedido (Colaborador → Gestor); rejeição de `super_admin` (`400`); rejeição de auto-alteração (`403`); e os 5 papéis (incluindo `convidado`) confirmados atribuíveis em sequência no mesmo Utilizador. Dados de teste removidos após validação.

**`npm run build` / `eslint`:** ✅ sem erros.

**Exit Criteria do Passo 5: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D3 | Ver 2.1 (A, B, C) — decisões de âmbito já aprovadas antes deste documento | — |
| D4 | `RegraPermissao` como override explícito (concede ou revoga) sobre uma matriz de defaults em configuração de código, não como tabela que replica todo o default por Empresa | Menor complexidade operacional (Blueprint 5a) — evita seedar milhares de linhas default por Empresa; a Empresa só define o que quer *diferente* do default |
| D5 | **Revista a pedido da Fundadora/CEO.** "Convidar" e "alterar papel de utilizador existente" partilham os mesmos atores de base (RN-03), mas alterar tem 6 limites adicionais explícitos (L1-L6, 3.4) que convidar não tem — não são tratadas como automaticamente equivalentes | Alterar um papel existente introduz riscos que convidar (sempre aditivo, sobre pessoa nova) não tem: auto-alteração, escalada de privilégio, remoção do último admin. Cada risco tem agora uma regra explícita e testável (3.10), não uma equivalência assumida |
| D6 | Renovação deslizante só escreve à BD se `expiraEm` estiver a menos de 6 dias (não em todos os pedidos) | Evita custo de escrita desproporcional; mantém a semântica de sessão deslizante já decidida (ADR-007, 3.5) |
| D7 | `Utilizador.papel` passa de `String` para `enum Papel` | Ajuste de tipo (Blueprint D4, não estrutural) — reforça validação ao nível da BD |
| D8 | Hierarquia explícita de privilégio (`admin_empresa` > `gestor` > `colaborador` > `convidado`) introduzida para L2 (3.4) — não existia antes deste passo | Necessária para impedir escalada de privilégio (um Gestor promover alguém a Admin) — requisito explícito da Fundadora/CEO; `super_admin` fica fora desta hierarquia, nunca atribuível por ninguém dentro de uma Empresa (L4/RN-04) |
| D9 | L1/L2/L5 (auto-alteração, hierarquia, nunca zero admins) implementados no controlador/serviço deste endpoint, não no `AuthorizationService` genérico | Dependem do alvo concreto da operação (quem, para que papel) — o `AuthorizationService` genérico só decide se o papel do ator, em geral, pode executar a ação sobre o módulo, consistente com Security & Access Principles 3.3 |
| D10 | `ValidationPipe` adicionado aos testes Jest deste passo e retroativamente ao do Passo 4 (`tenant-context-http.e2e-spec.ts`) | Sem isto, nenhum DTO era de facto validado nestes testes — lacuna de fidelidade ao `main.ts` real, revelada por T6 (3.10), corrigida antes de considerar o passo concluído |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | ~~Confirmar a interpretação D5~~ | **Resolvida.** D5 revista com definição inequívoca (3.4, L1-L6) — ver histórico v1.1 | Fundadora/CEO — decidido |
| 2 | Fornecedor de email/notificações (bloqueia UC-02 completo) | Roadmap — ADR futuro | CTO, quando necessário |
| 3 | Limites de plano (`SubscricaoPlano`) | Já registado (Master Roadmap R3) — Comercial/M4 | CEO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 5, incorporando as 3 decisões de âmbito já validadas (Super Admin só estrutural; UC-02 fora de âmbito; nova entidade RegraPermissao aprovada): modelo de dados, serviço único de autorização, regras de negócio RN-01/RN-03/RN-04, endpoint de atribuição de papel, renovação deslizante de sessão, refinamento de tipo (enum Papel), critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-06 | **Revisão exigida pela Fundadora/CEO antes de aprovar:** reescrita a secção 3.4 (agora "Autoridade para Alterar o Papel de um Utilizador Existente — Definição Inequívoca"), com resposta explícita aos 4 pontos exigidos (quem está autorizado; se é a mesma autoridade de convidar; limites mínimos L1-L6 incluindo auto-alteração, hierarquia de privilégio, âmbito do Gestor, nunca super_admin, nunca zero admins, isolamento estrutural; reflexo no AuthorizationService). D5 revista, D8/D9 adicionadas, Questão 1 resolvida, tabela de testes expandida de 9 para 13 cenários (T2-T8 cobrem L1-L6 individualmente) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO aprova a especificação revista e autoriza o início da implementação | Fundadora/CEO |
| 1.2 | 2026-07-06 | Adicionada a secção 3.11 (Resultado da Implementação e Evidências de Validação) com os 19/19 testes reais, a verificação empírica dos grants automáticos na nova tabela, e a correção D10 (ValidationPipe em falta nos harnesses de teste, retroativa também ao Passo 4). Demonstração manual adicional contra `nexa_dev`. Exit Criteria do Passo 5 cumprido integralmente | CTO (Claude) + Fundadora/CEO |

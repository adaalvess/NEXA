# NEXA — Especificação Técnica do Passo 6 (M1): Registo de Auditoria

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 6 — Registo de Auditoria (Append-Only) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M1 (Fundação), Passo 6 — último requisito em falta do DoD do M1 |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-07 · Data & Consistency Rules v1.1 (3.1, 3.3, 3.7) · Event & Notification Architecture Rules v1.1 (3.1-3.5) · Security & Access Principles v1.1 (3.7, 3.9, Q1) · Functional Specifications v1.1 (3.1) · NFR-09 · ADR-003 (jsonb) · Especificações Técnicas dos Passos 3-5 · Blueprint v1.5 |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o mecanismo que grava no `RegistoAuditoria` (modelo já existente desde o Passo 2, ainda sem escritas). Incorpora 3 decisões já validadas com a Fundadora/CEO antes deste documento (2.1) e a especificação completa do campo `detalhe` exigida explicitamente (3.3).

---

## 2. Contexto

`RegistoAuditoria` existe desde o Passo 2 (`empresaId`, `ator`, `acao`, `entidade`, `entidadeId`, `timestamp`), sem nenhuma escrita real. O Passo 5 deixou deliberadamente por resolver a capacidade cross-tenant do Super Admin (Especificação Técnica do Passo 5, 2.1.A) — este é o passo que a resolve. É também o último requisito em falta do Definition of Done do M1 (Blueprint, 2.2).

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Mecanismo de escrita da auditoria | **Orientado a eventos**, via `EventEmitterModule` já existente (Passo 1), consistente com Event & Notification Architecture Rules §3.3 ("cada evento de negócio relevante corresponde a exatamente uma entrada no Registo de Auditoria"). Usa **`emitAsync`** (aguardado, nunca fire-and-forget) especificamente para este listener, para cumprir a exigência de consistência forte de Data & Consistency Rules §3.1 ("Registo de Auditoria: Forte — nunca atrasado, nunca opcional"). **Nenhum serviço de negócio chama o `AuditoriaService` diretamente** — só emite eventos. O listener de auditoria é uma etapa obrigatória da operação: se falhar, a operação inteira falha (não é tratado como efeito secundário best-effort). Outros eventuais consumidores futuros de eventos não-críticos (notificações, métricas) podem continuar fire-and-forget — essa distinção fica explícita no código (3.2). |
| B | Capacidade cross-tenant do Super Admin | Novo role de BD dedicado, **`nexa_auditoria_interna`**: `BYPASSRLS`, **só `SELECT`**, **só na tabela `RegistoAuditoria`** — nunca reutilizado para outra finalidade, nunca outras tabelas, nunca `INSERT`/`UPDATE`/`DELETE`/DDL. O acesso continua sujeito ao `PermissaoGuard` da aplicação (o role é só capacidade técnica de infraestrutura, nunca substitui a autorização funcional). O próprio ato de consulta cross-tenant pelo Super Admin é, em si, auditado (3.6). |
| C | Campo `detalhe` (FR-07, "a alteração efetuada") | Aprovado, com especificação completa em 3.3 abaixo. |

---

## 3. Conteúdo Estruturado

### 3.1 Delimitação de Responsabilidades (continuação do Passo 5, §3.1)

| Camada | Responsabilidade | Estado |
|---|---|---|
| Autenticação (Passo 3) | Resolve sessão | ✅ |
| Camada 1 / Tenant (Passo 4) | Confina dados de negócio à Empresa | ✅ |
| RBAC (Passo 5) | Decide se o papel pode executar a ação | ✅ |
| **Auditoria (este passo)** | **Regista o que aconteceu, depois de decidido/executado — nunca decide se é permitido** | 🔨 Este passo |
| Partilha (Passo 7) | Exceção pontual a um Convidado | Ainda não existe |

### 3.2 Mecanismo — Eventos, `emitAsync`, Listener Obrigatório

```ts
// eventos-auditoria.ts
export const EVENTO_AUDITORIA = 'auditoria.registar';

export interface EventoAuditoria {
  empresaId: string;   // já validado/conhecido por quem emite — o listener confia nele, não o deriva
  ator: string;        // utilizadorId ou "ia"
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhe?: Record<string, unknown>; // ver 3.3
}
```

- Serviços de negócio (`AuthService`, `UtilizadoresService`, futuros módulos) **emitem o evento, nunca chamam um `AuditoriaService.registar()` diretamente** — implementação literal de Event & Notification Architecture Rules §3.3/3.4 (mesmo padrão já usado para Notificações, agora aplicado à Auditoria).
- A emissão usa **`this.eventEmitter.emitAsync(EVENTO_AUDITORIA, payload)`**, **aguardado** (`await`) antes de a operação de negócio responder ao pedido — o listener de auditoria é parte obrigatória da operação; se falhar, a exceção propaga-se e a operação inteira falha (transação de negócio + auditoria tratadas como uma unidade lógica, ainda que não sejam a mesma transação SQL — ver 3.7, risco R1).
- **`AuditoriaListener`** (`@OnEvent(EVENTO_AUDITORIA)`) escreve a linha usando **`PrismaService`** (bruto, exceção transversal da Fundação já documentada nos Passos 3/4) — nunca `TenantPrismaService`. Justificação: o `empresaId` já vem validado no payload do evento (por quem o emitiu, sob a Camada 1 correta na origem); a auditoria não precisa de re-derivar tenant a partir de um `TenantContext`, o que resolve também o caso de bootstrap (registo de Empresa, onde não existe `TenantContext` ainda — Especificação Técnica do Passo 3, D2).
- **Distinção explícita no código:** um comentário no `AuditoriaListener` e em qualquer futuro listener não-crítico documenta se o consumo é `emitAsync` (obrigatório, bloqueante) ou `emit` (fire-and-forget, best-effort) — nunca ambíguo.

### 3.3 Campo `detalhe` — Especificação Completa (FR-07, "a alteração efetuada")

**1. Tipo de dados:** `Json?` no Prisma → `jsonb` no PostgreSQL (mapeamento nativo do conector `postgresql`, não `json` simples). Justificação: `jsonb` é binário (mais compacto, mais rápido a ler), suporta indexação futura (GIN) se um dia necessário; já reconhecido como vantagem nativa do motor escolhido (ADR-003, "JSONB nativo — flexibilidade para campos semi-estruturados").

**2. Estrutura base — obrigatório vs. opcional:** o campo é sempre opcional (`Json?`, `null` permitido) — nem toda ação tem "alteração" relevante que justifique detalhe (ex: login). Quando presente, é sempre um objeto JSON simples (nunca array na raiz), com chaves específicas por categoria de ação (3.3.3). **Nunca inclui segredos** (`passwordHash` ou equivalente) — regra absoluta, sem exceção.

**3. Convenção de serialização por categoria de ação:**

| Categoria | `acao` | Formato de `detalhe` | Exemplo |
|---|---|---|---|
| Criação | `criar` | `{ "dados": { campo: valor, ... } }` — só campos não sensíveis | `{ "dados": { "nome": "Empresa X", "pais": "PT" } }` |
| Atualização | `atualizar` | `{ "alteracoes": { campo: { "anterior": valor, "novo": valor } } }` — só os campos que **de facto** mudaram, nunca o objeto inteiro | `{ "alteracoes": { "papel": { "anterior": "colaborador", "novo": "gestor" } } }` |
| Eliminação (soft-delete) | `eliminar` | `{ "eliminadoEm": timestamp }` — o facto já está em `entidade`/`entidadeId`/`acao`; detalhe só acrescenta o momento exato se distinto do `timestamp` do próprio registo | `{ "eliminadoEm": "2026-07-06T12:00:00Z" }` |
| Autenticação | `login` | `null` — nenhuma alteração de estado de negócio para além da própria `Sessao`, já identificada por `entidade`/`entidadeId` | `null` |
| Alteração de papel (Passo 5) | `atribuir_papel` | `{ "papelAnterior": ..., "papelNovo": ... }` (caso específico do padrão "atualização" acima, nomeado explicitamente por ser a ação mais sensível do MVP) | `{ "papelAnterior": "colaborador", "papelNovo": "gestor" }` |
| Consulta cross-tenant (Super Admin) | `consultar_auditoria_interna` | `{ "empresasConsultadas": "todas" }` ou, se filtrado, a lista de ids | `{ "empresasConsultadas": "todas" }` |

**4. Before/after:** só para `atualizar`/`atribuir_papel` — formato `{ anterior, novo }` por campo alterado, nunca o registo completo antes e depois (reduz volume; o registo completo *atual* já está na tabela de negócio em si, a auditoria só precisa de capturar a transição).

**5. Impacto em indexação, performance e retenção:**
- **Sem índice GIN no `detalhe` neste passo** — toda pesquisa/filtro de auditoria continua por `empresaId`+`timestamp` (já indexado desde o Passo 2); não há necessidade comprovada de pesquisa por conteúdo de `detalhe` ainda (YAGNI). Se surgir, adicionar o índice nessa altura, sem alterar o schema atual.
- **Volume:** payloads pequenos (poucos campos por linha); sem impacto de escala relevante à volumetria do MVP (10-50 empresas piloto, NFR-10).
- **Retenção:** `detalhe` faz parte da mesma linha imutável do `RegistoAuditoria` — sujeito à mesma política de retenção mínima de 12 meses já fixada (NFR-09), sem tratamento diferenciado nem purga isolada do campo (isso seria análogo à questão ainda pendente em PSD-003 sobre conteúdo de IA — não é decisão de engenharia deste passo).

**6. Compatibilidade:** implementação literal de FR-07; não contradiz Data Model Conceptual (estende "quem, quando, que ação, sobre que entidade" com "o que mudou", sem redefinir a entidade); mantém Data & Consistency Rules §3.3 (append-only — `detalhe` é escrito uma vez, na mesma linha, nunca editado depois). **Nenhuma decisão adicional fica pendente nem exige registo no Product & Security Decisions Register** — é estrutura técnica de um campo já aprovado ao nível conceptual, não uma questão legal/produto nova.

### 3.4 Migração de Base de Dados

- `RegistoAuditoria.detalhe Json?` (novo campo opcional — Blueprint D4, não estrutural).
- **Trigger de imutabilidade** (reforço de Data & Consistency Rules §3.3, "nunca UPDATE nem DELETE" — agora que a tabela começa a ter escrita real, este é o momento de o tornar estruturalmente impossível, não só convencional):
  ```sql
  CREATE OR REPLACE FUNCTION registo_auditoria_imutavel() RETURNS TRIGGER AS $$
  BEGIN
    RAISE EXCEPTION 'RegistoAuditoria é append-only — UPDATE/DELETE nunca são permitidos (Data & Consistency Rules, 3.3)';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_registo_auditoria_imutavel
    BEFORE UPDATE OR DELETE ON "RegistoAuditoria"
    FOR EACH ROW EXECUTE FUNCTION registo_auditoria_imutavel();
  ```
  Nota: triggers aplicam-se a **todos** os roles, incluindo o owner (`nexa_dev`) — ao contrário do RLS, não há bypass por ownership. É a camada mais forte de imutabilidade disponível no motor já escolhido.
- **Novo role `nexa_auditoria_interna`**: `CREATE ROLE ... BYPASSRLS; GRANT SELECT ON "RegistoAuditoria" TO nexa_auditoria_interna;` — sem `GRANT` em mais nenhuma tabela, sem `USAGE ON SCHEMA` além do estritamente necessário para o `SELECT` funcionar.

### 3.5 Retroatividade — Instrumentar Ações Já Existentes

Para cumprir "Registo de Auditoria a gravar em toda ação de escrita" (DoD do M1), as ações já escritas nos Passos 3 e 5 passam a emitir eventos:

| Ação existente | Evento emitido |
|---|---|
| `AuthService.registar` — criação de Empresa | `{ acao: "criar", entidade: "Empresa", ator: <utilizadorId recém-criado> }` |
| `AuthService.registar` — criação de Utilizador | `{ acao: "criar", entidade: "Utilizador", ator: <o próprio> }` |
| `AuthService.login` | `{ acao: "login", entidade: "Sessao", entidadeId: <sessao.id> }` |
| `UtilizadoresService.atribuirPapel` | `{ acao: "atribuir_papel", entidade: "Utilizador", detalhe: { papelAnterior, papelNovo } }` |

### 3.6 Endpoint — `GET /auditoria`

- Uma única rota; comportamento ramifica por `ctx.papel`:
  - `admin_empresa`: usa `TenantPrismaService` (Camada 1 normal) — só a sua Empresa.
  - `super_admin`: usa o novo `AuditoriaInternaService` (role `nexa_auditoria_interna`) — todas as Empresas. **Este próprio acesso é auditado** (3.3, categoria "Consulta cross-tenant"), escrito na Empresa do próprio Super Admin via o mecanismo normal (3.2) — o role `nexa_auditoria_interna` nunca escreve, só lê.
  - `gestor`/`colaborador`/`convidado`: `403` (default nega — Functional Specifications, 3.1).
- `PermissaoGuard('fundacao', 'consultar_auditoria')` — nova entrada na `DEFAULT_PERMISSION_MATRIX`, incluindo agora `super_admin: true` (primeira entrada deste papel na matriz, já que antes não tinha nenhuma ação — Especificação Técnica do Passo 5, 2.1.A).
- Paginação simples (`take`/`skip`, default `take=50`) — detalhe de implementação, não um novo requisito de produto.

### 3.7 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-07 | ✅ Quem (`ator`), quando (`timestamp`), entidade (`entidade`/`entidadeId`), alteração (`detalhe`) |
| Data & Consistency Rules (3.1, 3.3) | ✅ Forte (via `emitAsync` aguardado); append-only (trigger de BD) |
| Event & Notification Architecture Rules (3.3, 3.4) | ✅ Um evento → uma entrada de auditoria; nenhuma chamada direta a serviço de auditoria |
| Security & Access Principles (3.9, Least Privilege) | ✅ `nexa_auditoria_interna` só `SELECT`, só uma tabela |
| NFR-09 | ✅ Retenção herdada, sem tratamento diferenciado do campo `detalhe` |

**Nenhum novo ADR necessário.**

**Risco R1 — auditoria e operação de negócio não partilham a mesma transação SQL:** `emitAsync` garante que o listener é aguardado, mas a escrita do `RegistoAuditoria` (via `PrismaService`) acontece numa ligação/transação distinta da operação de negócio original (via `TenantPrismaService`). Em caso de falha do listener depois da operação de negócio já ter sido confirmada na BD, a operação de negócio **não é revertida automaticamente** — a exceção propaga-se ao pedido HTTP (falha visível ao cliente), mas o registo de negócio já escrito permanece. Mitigação: aceite conscientemente para o MVP (mesma disciplina de "Last-Write-Wins com Rasto Auditado", Data & Consistency Rules 3.5, que já aceita não ter transações distribuídas perfeitas); a probabilidade de falha do listener é baixa (escrita simples, mesma BD); revisitar com transações distribuídas apenas se houver evidência real de necessidade.

### 3.8 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Registo de Empresa+Utilizador gera 2 entradas de auditoria (`criar`/`Empresa`, `criar`/`Utilizador`) | ✅ |
| T2 | Login gera 1 entrada (`login`/`Sessao`) | ✅ |
| T3 | `PATCH /utilizadores/:id/papel` gera 1 entrada com `detalhe.papelAnterior`/`papelNovo` corretos | ✅ |
| T4 | Tentativa de `UPDATE`/`DELETE` direto em `RegistoAuditoria` (via `psql`, qualquer role incl. `nexa_dev`) | Rejeitado pelo trigger |
| T5 | Admin da Empresa consulta `GET /auditoria` — só vê entradas da sua Empresa | ✅ |
| T6 | Super Admin consulta `GET /auditoria` — vê entradas de múltiplas Empresas | ✅ |
| T7 | A própria consulta do Super Admin (T6) gera uma nova entrada de auditoria, na Empresa do Super Admin | ✅ |
| T8 | Gestor/Colaborador/Convidado tentam `GET /auditoria` | `403` |
| T9 | `nexa_auditoria_interna` tenta `INSERT`/`UPDATE`/`DELETE` ou aceder a outra tabela (via `psql`) | Rejeitado (sem privilégio) |
| Regressão | Testes automatizados dos Passos 4 e 5 continuam a passar | ✅ |

**Exit Criteria:** T1-T9 e regressão passam; `npm run build` sem erros; Registo de Auditoria a gravar em toda ação de escrita existente (DoD do M1 — **último requisito em falta, agora cumprido**); nenhuma escrita de auditoria fire-and-forget; nenhuma chamada direta a serviço de auditoria fora do mecanismo de eventos.

### 3.9 Resultado da Implementação e Evidências de Validação

**Entregáveis:** `RegistoAuditoria.detalhe` (jsonb) + trigger `trg_registo_auditoria_imutavel` (migração `20260706124533_add_auditoria_detalhe_e_trigger_imutavel`); role `nexa_auditoria_interna` (`BYPASSRLS`, só `SELECT`, só nesta tabela); `apps/api/src/modules/fundacao/auditoria/` (`eventos-auditoria.ts`, `auditoria.listener.ts`, `auditoria.service.ts`, `auditoria-interna.service.ts`, `auditoria.controller.ts`); `AuthService`/`UtilizadoresService` a emitir eventos; `DEFAULT_PERMISSION_MATRIX` com a nova entrada `super_admin`.

**Descoberta durante a escrita dos testes (consequência real, não um bug):** o trigger de imutabilidade bloqueia `UPDATE`/`DELETE` em `RegistoAuditoria` **mesmo quando disparado por `CASCADE`** a partir de `Empresa` (`onDelete: Cascade`, Passo 2) — ou seja, uma vez que uma Empresa tenha qualquer entrada de auditoria (o que agora acontece desde o primeiro registo), **já não é possível eliminá-la fisicamente por cascade normal**. Isto é uma propriedade correta e desejada da imutabilidade (impede que apagar uma Empresa apague silenciosamente o seu rasto de auditoria), mas tem uma consequência prática real: os testes automatizados (e qualquer futuro processo de eliminação definitiva de dados, PSD-001) têm de desativar o trigger explicitamente para limpar dados de teste/eliminação real, nunca por acidente. Criado `apps/api/test/utils/limpar-empresa.ts` para os testes; **registado como consideração explícita para quando o PSD-001 (hard-delete RGPD) for decidido** (5, Questão 3 nova).

**Segunda descoberta, encontrada ao correr a suite completa (falha intermitente real):** a limpeza de teste usa `ALTER TABLE ... DISABLE/ENABLE TRIGGER`, que é uma alteração de **catálogo global** (afeta todas as ligações à base de dados), não uma alteração scoped à sessão/transação. Como o Jest corre ficheiros de teste em paralelo por defeito, um ficheiro a reativar o trigger no seu bloco `finally` podia coincidir com outro ficheiro a meio da sua própria limpeza, causando falhas intermitentes reais (reproduzido e confirmado). **Tentativa de correção com `SET LOCAL session_replication_role = replica`** (scoped à transação, a alternativa tecnicamente correta) **falhou** — exige privilégio de superuser no PostgreSQL, que `nexa_dev` deliberadamente não tem (Least Privilege). **Correção final:** os testes e2e passam a correr sempre em série (`--runInBand`, `package.json`), eliminando a possibilidade de sobreposição entre ficheiros que partilham este estado global — documentado explicitamente no comentário de `limpar-empresa.ts` para que não seja removido por engano no futuro.

**Resultados dos testes (Jest, `nexa_test`, 27/27):**

| # | Resultado |
|---|---|
| T1-T9 (este passo) | ✅ Todos |
| Regressão (Passos 4-5, 19 testes) | ✅ Sem alteração de comportamento |

**Demonstração manual adicional contra `nexa_dev`:** registo + login + `GET /auditoria` confirmados com `detalhe` corretamente populado para `criar:Empresa`, `criar:Utilizador`, `login:Sessao`. Dados de teste removidos (com o mesmo procedimento de desativar/reativar o trigger).

**`npm run build` / `eslint`:** ✅ sem erros.

**Nota estrutural adicional:** `EventEmitterModule.forRoot()` foi movido de `AppModule` para `FundacaoModule` — necessário para os testes que importam só `FundacaoModule` (sem `AppModule`) terem `EventEmitter2` disponível para injeção; arquiteturalmente correto também, já que a Fundação é a dona natural do mecanismo de eventos (Event & Notification Architecture Rules, 3.1) e continua global para qualquer módulo futuro.

**Exit Criteria do Passo 6: cumprido integralmente. Definition of Done do M1 (Blueprint, 2.2) agora completo** — registo/login funcionais (Passo 3); isolamento multi-tenant verificado por teste (Passo 4); os 5 papéis RBAC atribuíveis e a restringir acesso corretamente (Passo 5); Registo de Auditoria a gravar em toda ação de escrita (Passo 6).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D3 | Ver 2.1 (A, B, C) — decisões já validadas antes deste documento | — |
| D4 | `AuditoriaListener` usa `PrismaService` bruto, nunca `TenantPrismaService` — `empresaId` vem do payload do evento, não de `TenantContext` | Resolve o caso de bootstrap (registo, sem `TenantContext` ainda) sem duplicar lógica; consistente com a Fundação já ser reconhecida como camada transversal (System Design Principles, 3.2, D3) |
| D5 | `nexa_auditoria_interna` nunca escreve — a própria consulta do Super Admin é auditada pelo mecanismo normal (evento → `PrismaService`), não pelo role dedicado | Cumpre o requisito 5 da aprovação da Fundadora/CEO (rastreabilidade completa das ações do Super Admin) sem alargar o role dedicado além de `SELECT` |
| D6 | Trigger de imutabilidade a nível de BD, aplicável a todos os roles incluindo o owner | Reforça Data & Consistency Rules §3.3 estruturalmente, não só por convenção — momento certo, agora que a tabela tem escrita real |
| D7 | Ações já existentes dos Passos 3 e 5 instrumentadas retroativamente | Necessário para cumprir "toda ação de escrita" do DoD do M1 — sem isto, o Registo de Auditoria ficaria incompleto para ações já em produção |
| D8 | `EventEmitterModule.forRoot()` movido de `AppModule` para `FundacaoModule` | Descoberto durante a implementação: testes que importam só `FundacaoModule` precisam de `EventEmitter2` disponível; correto também porque a Fundação já é a dona natural do mecanismo de eventos (Event & Notification Architecture Rules, 3.1) |
| D9 | Testes e2e passam a correr sempre em série (`--runInBand`) | `ALTER TABLE DISABLE/ENABLE TRIGGER` é catálogo global, não scoped à sessão; `SET LOCAL session_replication_role` (a alternativa correta) exige superuser, que `nexa_dev` não tem por Least Privilege. Serializar os testes elimina a corrida real encontrada, sem alargar privilégios |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Nível de detalhe de tentativas de acesso negadas (403) — não auditado neste passo | Já registado como Q1 de Security & Access Principles — ADR de Observabilidade futuro | CTO |
| 2 | O "porquê" de uma ação (Data Model Conceptual, Q2) continua sem decisão — `detalhe` não inclui campo de justificação textual obrigatório | Ainda em aberto nesse documento, não resolvido aqui | CEO + CTO |
| 3 | O trigger de imutabilidade bloqueia `DELETE` em cascade a partir de `Empresa` assim que exista qualquer entrada de auditoria — um futuro hard-delete de Empresa (PSD-001, se decidido) terá de desativar o trigger explicitamente como parte desse processo, nunca implicitamente | PSD-001 (Product & Security Decisions Register) — a considerar quando essa decisão for tomada | CTO, no momento de implementar PSD-001 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 6, incorporando as 3 decisões já validadas (auditoria via eventos com `emitAsync`; role `nexa_auditoria_interna` só-leitura; campo `detalhe` aprovado): mecanismo completo, especificação exaustiva do campo `detalhe` (6 pontos exigidos), migração (trigger de imutabilidade + novo role), retroatividade sobre Passos 3/5, endpoint `GET /auditoria`, riscos, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.9 (Resultado da Implementação e Evidências de Validação) com 27/27 testes reais, a descoberta da interação entre o trigger de imutabilidade e `onDelete: Cascade` (nova Questão em Aberto 3, relevante para PSD-001), a descoberta de uma falha intermitente real de corrida entre ficheiros de teste (`ALTER TABLE DISABLE/ENABLE TRIGGER` é catálogo global, não scoped à sessão) corrigida com testes e2e em série (D9), e a nota estrutural sobre `EventEmitterModule` mover-se para `FundacaoModule` (D8). Definition of Done do M1 confirmado completo, com 2 corridas consecutivas da suite completa confirmando estabilidade | CTO (Claude) + Fundadora/CEO |

# NEXA — Contexto de Projeto para o Claude Code

**Lê este documento por completo antes de escrever qualquer código.** É o teu ponto de continuidade — a implementação tem de prosseguir exatamente daqui, sem perder nenhuma decisão já tomada.

---

## 1. O Que É a NEXA

Sistema Operacional Inteligente para Empresas — plataforma SaaS multi-tenant que centraliza processos, CRM, dashboard e um assistente de IA para PMEs europeias, com IA que sugere mas nunca executa ações sem confirmação humana explícita.

---

## 2. Fonte de Verdade — Toda a Documentação Está em `/docs`

O repositório inclui **38 documentos aprovados**, organizados por fase. **Nunca inventes uma decisão que já esteja documentada — consulta primeiro.**

| Pasta | Conteúdo | Estado |
|---|---|---|
| `/docs/00-governance/` | Master Roadmap, Product & Security Decisions Register, Architecture Review Log | ✅ Todos aprovados |
| `/docs/01-strategy/` | Vision, Product Vision, Competitive Analysis, Mission & Values, Business Goals, Success Metrics, Product Roadmap, Brand Book, Product Vision Canvas | ✅ Todos aprovados |
| `/docs/02-product/` | Glossário, PRD, Personas, Journey Maps, Information Architecture, Data Model Conceptual, Functional Requirements, User Stories, Use Cases, NFR, Functional Specifications | ✅ Todos aprovados |
| `/docs/03-engineering/` | System Design Principles, Data & Consistency Rules, Event & Notification Architecture Rules, Security & Access Principles, Coding Standards, AI Principles, 8 ADRs (`/adrs`) | ✅ Todos aprovados |
| `/docs/04-implementation-blueprint/` | Blueprint de Implementação do MVP (Épicos, Milestones+DoD, Schema Prisma inicial, API, Design System) | ✅ Aprovado |

**Se encontrares uma decisão de implementação que nenhum destes documentos cobre:** não decidas sozinho por conveniência. Regista a questão (segue o processo já estabelecido no System Design Principles, 3.7 — Descoberta Técnica vs. Decisão de Produto) e traz de volta para validação, em vez de assumir.

---

## 3. Estado Atual da Implementação

**M1 (Fundação) formalmente concluído (2026-07-06). M2 (Módulos Core — Dashboard, Processos, CRM) aprovado e em curso — Passo 8 (Departamento) concluído e aprovado. Ver nota abaixo.**

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 0 | Preparação e contexto | ✅ Concluído |
| Passo 1 | Scaffolding do monorepo (`apps/api` NestJS, `apps/web` Next.js) | ✅ Concluído — validação local em curso |
| Passo 2 | Schema Prisma + primeira migração | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.1 |
| Passo 3 | Autenticação (registo + login) | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.2 |
| Passo 4 | Camada 1 — middleware de tenant + serviço de autorização único | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.4 |
| Passo 5 | RBAC — papéis e permissões granulares | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.5 |
| Passo 6 | Registo de Auditoria (append-only) | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.6 |
| Passo 7 | Partilha (Convidado) | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.7 |

**Definition of Done do M1** (Blueprint, secção 2.2): registo/login funcionais ✅; isolamento multi-tenant verificado por teste ✅; todos os 5 papéis RBAC atribuíveis e a restringir acesso corretamente ✅; Registo de Auditoria a gravar em toda ação de escrita ✅.

**M1 formalmente encerrado (2026-07-06):** o DoD literal (Blueprint §2.2) estava tecnicamente cumprido desde o Passo 6, mas a Fundadora/CEO tinha decidido que o Passo 7 (Partilha/Convidado) — listado como conteúdo do M1 no Blueprint §3 — era pré-requisito para o encerramento formal do Milestone. Com o Passo 7 concluído e aprovado, **o Milestone M1 (Fundação) está formalmente concluído** — todos os passos previstos (0-7) implementados, validados e aprovados.

### M2 (Módulos Core) — Aprovado e em Curso (2026-07-06)

Proposta completa do M2 (objetivos, âmbito, sequência de passos, dependências, riscos, DoD, decisões arquitetónicas) apresentada e aprovada pela Fundadora/CEO. Numeração de passos continua a partir do M1.

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 8 | Departamento — CRUD completo + atribuição a Utilizadores | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.8 |
| Passo 9 | Processos/Tarefas — CRUD, visibilidade RBAC, integração real de `podeAcederViaPartilha` | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.9 |
| Passo 10 | CRM — Cliente/Contacto/Oportunidade, Interação, Pipeline | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.10 |
| Passo 11 | Notification Dispatcher — consumidor de eventos para `Notificacao` (fire-and-forget) | 🔜 Próximo passo |
| Passo 12 | Dashboard — agregação read-only | Por iniciar |
| Passo 13 | Design System (frontend) — componentes base (ADR-006) | Por iniciar |
| Passo 14 | Ecrãs (frontend) — Dashboard, Processos, CRM, estado inicial guiado | Por iniciar |

**Decisões arquitetónicas do M2 já validadas (2026-07-06):** (A) M2 inclui frontend (`apps/web`), mantendo API-first — nenhuma UI construída antes da respetiva API estar implementada, testada e aprovada; (B) lógica de visibilidade RBAC (admin tudo / gestor por Departamento / colaborador por posse / convidado via Partilha) fica **centralizada na Fundação** como mecanismo reutilizável (opção B1), nunca duplicada entre Processos e CRM; (C) `Processo.estado` e `Cliente.estadoOportunidade` serão promovidos a `enum` (mesmo padrão do `Papel` no Passo 5), reforçando validação ao nível da BD.

O scaffolding do Passo 1 já inclui: monorepo com npm workspaces, ESLint/Prettier partilhados, NestJS mínimo (`main.ts` com cookie-parser, `app.module.ts` com EventEmitter), Next.js mínimo com Tailwind já configurado com os tokens exatos do Brand Book.

### 3.1 Registo de Conclusão — Passo 2 (2026-07-06)

- **Schema real** em `apps/api/prisma/schema.prisma`, com rastreabilidade completa documentada no próprio ficheiro e em Blueprint §3a. As 12 entidades de negócio têm `tenant_id` (`empresaId`) indexado; `Utilizador`, `Departamento`, `Processo`, `Cliente` e `Sessao` usam constraints de chave estrangeira compostas com escopo de tenant `(id, empresaId)` (Camada 3 de Defense in Depth, ADR-003 §3.3) — verificado empiricamente: uma tentativa de referência cruzada entre Empresas foi rejeitada pela própria base de dados.
- **Migração** `20260706095205_init_fundacao_processos_crm_ia_comercial` aplicada sem erros.
- **Ambiente de BD:** PostgreSQL 17 local (não Neon) — decisão explícita para validar o M1 sem depender ainda de infraestrutura remota. Transição para Neon (ADR-007) fica para depois do M1 estar validado. Ligação configurada em `apps/api/.env` (não commitado).
- **RLS (Camada 2, ADR-001 §3.3) deliberadamente NÃO ativada nesta migração** — decisão explícita confirmada com a Fundadora/CEO. Motivo: RLS só é efetiva com um utilizador de BD dedicado não-owner (Postgres não aplica RLS ao dono da tabela por defeito) e com a variável de sessão `tenant_id` injetada pelo middleware — ambas as condições só existem a partir do **Passo 4**. Ativar políticas RLS antes disso daria falsa sensação de segurança. **Isto é uma dependência explícita a não esquecer no Passo 4**, documentada também no cabeçalho de `schema.prisma`.
- **Refinamentos face ao literal do Blueprint §3** (todos de detalhe, não estruturais — Blueprint D4): campos `criadoPor`/`atualizadoPor` em toda entidade de negócio (Data & Consistency Rules 3.7); `eliminadoEm` para soft-delete em `Utilizador`/`Departamento`/`Processo`/`Cliente` (Data & Consistency Rules 3.4); `Sessao` ganhou `empresaId` (exigido por ADR-004, Validação Arquitetural ponto 5). Detalhe completo em Blueprint §3a.
- **Pendente, não bloqueante:** binário nativo do `argon2` ainda não compilado neste ambiente — resolver no Passo 3. Trigger de imutabilidade a nível de BD para `RegistoAuditoria` (append-only) ainda não implementado — avaliar no Passo 6.

### 3.2 Registo de Conclusão — Passo 3 (2026-07-06)

- **Especificação técnica formal aprovada antes da implementação** — ver [docs/04-implementation-blueprint/02-especificacao-tecnica-passo-3-autenticacao.md](docs/04-implementation-blueprint/02-especificacao-tecnica-passo-3-autenticacao.md) (fluxo completo, arquitetura de segurança, conformidade, Exit Criteria — todos com resultado real de teste registado em §3.5 desse documento).
- **Argon2id resolvido** — o binário nativo compila/obtém-se automaticamente neste ambiente; não foi preciso mudar de biblioteca.
- **Módulo `apps/api/src/modules/fundacao/`** implementado: `POST /auth/registar`, `POST /auth/login`, `GET /auth/eu` (endpoint de verificação técnica, não de produto). `PrismaService` acede diretamente ao Prisma — sem Camada 1 ainda, como já combinado.
- **`SessionGuard` construído neste passo** (revisão face ao plano informal inicial) — resolve a sessão (autenticação pura), sem qualquer lógica de RBAC/tenant/Partilha. Distinção justificada por Security & Access Principles 3.2. O Passo 4 substitui/estende este guard pelo serviço único de autorização.
- **Dependências explícitas registadas para passos futuros** (mesmo padrão do RLS/Passo 4 e Auditoria/Passo 6): `SubscricaoPlano` com limites de plano reais **não foi criado** no registo — os valores numéricos de limites nunca foram decididos (Master Roadmap, risco R3); fica para quando o Comercial (EP-06/M4) for construído. Renovação deslizante da sessão (extensão de `expiraEm` por atividade) **não implementada** — só a expiração fixa de 7 dias no login; fica para o Passo 4, que introduz o hook por pedido necessário. Nenhuma escrita em `RegistoAuditoria` ainda — fica para o Passo 6.
- **Rate limiting conservador aplicado** (`@nestjs/throttler`, 10/min login, 5/min registo) — valores provisórios, a rever no ADR-007 (já registado como questão em aberto nesse ADR).
- Todos os testes funcionais e de segurança da especificação (T1-T10, S1-S4) passaram — detalhe em §3.5 do documento da especificação.

### 3.3 Controlo de Versões — Git Inicializado (2026-07-06)

Ao preparar a Especificação Técnica do Passo 4 (o passo mais crítico do M1), identifiquei que este repositório nunca teve git — um plano de rollback sem controlo de versões é descritivo, não executável. Aprovado pela Fundadora/CEO: repositório git local inicializado, **sem remoto associado, sem push** — fica só local nesta fase. `.gitignore` revisto e reforçado (segredos, credenciais, bases de dados locais, `.claude/` excluído por ser configuração de ferramenta, não estado do projeto). Commit inicial `8f047cb` — `chore: baseline approved - implementation steps 0-3` — captura o estado aprovado dos Passos 0-3 (74 ficheiros). Árvore de trabalho confirmada limpa, sem remotes configurados. Detalhe completo em [Especificação Técnica do Passo 4](docs/04-implementation-blueprint/03-especificacao-tecnica-passo-4-camada1-autorizacao.md), §3.8.

**A partir de agora, todo commit segue Conventional Commits** (regra não-negociável #23, já fixada), e cada passo aprovado deve corresponder a um commit — para que o plano de rollback de qualquer passo futuro seja sempre `git revert`/`git reset` executável, nunca apenas descritivo.

### 3.4 Registo de Conclusão — Passo 4 (2026-07-06) — o mais crítico do M1

- **Especificação técnica formal aprovada antes da implementação** — ver [Especificação Técnica do Passo 4](docs/04-implementation-blueprint/03-especificacao-tecnica-passo-4-camada1-autorizacao.md) (delimitação de responsabilidades Autenticação/Camada 1/RBAC/RLS/Auditoria sem duplicação, arquitetura completa, Exit Criteria — resultados reais em §3.10).
- **`TenantContextMiddleware`** (`apps/api/src/modules/fundacao/tenant/`) resolve a sessão uma única vez por pedido e populariza o `TenantContext` (AsyncLocalStorage) para toda a cadeia do pedido. `SessionGuard` ficou reduzido a uma verificação leve — **correção técnica face ao plano original**, aprovada antes de implementar: um Guard não envolve a continuação do pedido no seu próprio call stack, só um Middleware consegue.
- **`TenantPrismaService`** (Prisma Client Extension) é a Camada 1 concreta — injeta `empresaId` automaticamente em toda operação sobre modelos de negócio; é o único ponto de acesso a dados de negócio a partir de agora (exportado por `FundacaoModule`; `PrismaService` bruto fica privado).
- **RLS ativada** (migração `20260706105932_enable_row_level_security`) — política por tabela, `current_setting('app.current_empresa_id', true)` (negação por defeito quando não definido).
- **Três roles de BD, com responsabilidades distintas:** `nexa_dev` (owner, só migrações), `nexa_app` (runtime de negócio, sujeito a RLS, sem DDL), `nexa_fundacao` (runtime da Fundação — registo/sessão, `BYPASSRLS`, sem DDL) — **o terceiro role foi uma correção técnica descoberta durante a implementação** (o registo de uma Empresa nova é bloqueado por RLS se o role usado estiver sujeito a ela, já que não há `empresaId`/`id` de sessão a definir nesse bootstrap), aprovada antes de implementar. Detalhe completo em Especificação Técnica do Passo 4, §3.9.
- **Base de dados de teste dedicada** `nexa_test` — primeiro passo do M1 com cobertura automatizada real (Jest) de um dos 4 fluxos críticos (NFR-17): `apps/api/test/tenant-isolation.e2e-spec.ts` (isolamento artificial) e `tenant-context-http.e2e-spec.ts` (propagação via pedido HTTP real — foi este teste que revelou a necessidade do role `nexa_fundacao`).
- **Renovação deslizante da sessão continua NÃO implementada** — dependência que tinha sido registada para este passo acabou por não ser resolvida ainda; **fica explicitamente para o Passo 5 ou seguinte**, a avaliar quando o hook por pedido for revisitado.
- Todos os testes (T1-T5, S1-S5, mais a verificação HTTP adicional) passaram — detalhe em §3.10 da especificação.
- **Verificação final de consistência** (pedida antes do encerramento formal): encontradas e corrigidas 5 divergências reais — cabeçalho stale do `schema.prisma`; `npm run prisma:migrate` silenciosamente quebrado pela troca de `DATABASE_URL` (corrigido com `apps/api/.env.migrate`, git-ignored); comentário desatualizado em `.env`; `fundacao/README.md` desatualizado; 4 menções obsoletas no Master Roadmap ("Passo 3 a decorrer" → "Passo 5 a decorrer"). Detalhe completo em Especificação Técnica do Passo 4, §3.11. **Passo 4 formalmente encerrado.**

### 3.5 Registo de Conclusão — Passo 5 (2026-07-06)

- **Especificação técnica formal aprovada antes da implementação, com uma revisão exigida a meio** — ver [Especificação Técnica do Passo 5](docs/04-implementation-blueprint/04-especificacao-tecnica-passo-5-rbac.md). A Fundadora/CEO rejeitou a primeira versão da decisão sobre "quem pode alterar o papel de um utilizador existente" (assumia equivalência automática com "quem pode convidar") e exigiu definição inequívoca — resultado em §3.4 desse documento: 6 limites explícitos (L1-L6): nunca auto-alteração, nunca escalada de privilégio (hierarquia `admin_empresa > gestor > colaborador > convidado`), Gestor só no seu Departamento (RN-03), nunca `super_admin` (RN-04), nunca zero admins (RN-01), isolamento de tenant sempre estrutural (Camada 1).
- **3 decisões de âmbito validadas antes da especificação:** Super Admin só estrutural (sem bypass cross-tenant, fica para o Passo 6); UC-02 (convite por email) fora de âmbito (sem fornecedor de email decidido); nova entidade `RegraPermissao` aprovada.
- **`RegraPermissao`** (novo modelo Prisma, tenant-scoped, RLS ativa) — override explícito por Empresa sobre uma `DEFAULT_PERMISSION_MATRIX` em configuração de código (nunca hardcoding disperso). `Utilizador.papel` passou de `String` para `enum Papel` (ajuste de tipo, Blueprint D4).
- **`AuthorizationService`** (serviço único, ADR-004 §3.3) + `PermissaoGuard`/`@RequirePermissao` — nenhum controlador verifica permissões diretamente.
- **`PATCH /utilizadores/:id/papel`** implementado — único endpoint de negócio deste passo, suficiente para demonstrar o DoD do M1 ("5 papéis atribuíveis e a restringir acesso corretamente") sem depender de email/limites de plano.
- **Renovação deslizante da sessão** (pendente desde o Passo 4) implementada no `TenantContextMiddleware` — só escreve à BD quando `expiraEm` está a menos de 6 dias, evitando escrita em todos os pedidos.
- **Correção encontrada durante os testes (não arquitetural):** os testes Jest deste passo e do Passo 4 nunca tinham o `ValidationPipe` do `main.ts` real — nenhum DTO era de facto validado nesses testes. Revelado pelo teste que tentava atribuir `super_admin` (devolvia `200` em vez de `400`). Corrigido em ambos os ficheiros de teste.
- Todos os testes (19/19: T1-T13 deste passo + regressão completa do Passo 4) passaram, mais demonstração manual contra `nexa_dev` — detalhe em §3.11 da especificação.

### 3.6 Registo de Conclusão — Passo 6 (2026-07-06) — último requisito em falta do DoD do M1

- **Especificação técnica formal aprovada antes da implementação, com 3 decisões previamente validadas** — ver [Especificação Técnica do Passo 6](docs/04-implementation-blueprint/05-especificacao-tecnica-passo-6-auditoria.md): auditoria via mecanismo de eventos já existente (`EventEmitterModule`), usando `emitAsync` (aguardado, nunca fire-and-forget) para cumprir consistência forte (Data & Consistency Rules 3.1) sem contradizer o desenho orientado a eventos já aprovado (Event & Notification Architecture Rules 3.3); role de BD `nexa_auditoria_interna` (`BYPASSRLS`, só `SELECT`, só nesta tabela) para a capacidade cross-tenant do Super Admin, deixada em aberto no Passo 5; campo `detalhe` (jsonb) com especificação completa por categoria de ação (criação/atualização/eliminação/login/atribuição de papel).
- **`AuditoriaListener`** escreve sempre via `PrismaService` bruto (nunca `TenantPrismaService`) — o `empresaId` vem do payload do evento, resolvendo também o caso de bootstrap do registo (sem `TenantContext` ainda).
- **Trigger de imutabilidade a nível de BD** (`BEFORE UPDATE OR DELETE`) — aplica-se a todos os roles, incluindo o owner `nexa_dev`, ao contrário do RLS.
- **Instrumentação retroativa** dos Passos 3 (registo, login) e 5 (atribuição de papel) — agora todos emitem eventos de auditoria.
- **A própria consulta cross-tenant do Super Admin é auditada** — na Empresa do próprio Super Admin, pelo mecanismo normal, nunca pelo role só-leitura (que nunca escreve).
- **Descoberta real durante os testes:** o trigger bloqueia `DELETE` mesmo via `CASCADE` a partir de `Empresa` — uma vez que uma Empresa tenha qualquer entrada de auditoria (agora desde o primeiro registo), deixa de ser possível eliminá-la por cascade normal. Propriedade correta e desejada (protege o rasto de auditoria), mas com consequência prática real para testes e para um futuro hard-delete (PSD-001) — registada como nova Questão em Aberto nesse documento.
- **`EventEmitterModule.forRoot()` movido de `AppModule` para `FundacaoModule`** — correção estrutural encontrada ao escrever os testes (precisavam de `EventEmitter2` disponível ao importar só `FundacaoModule`); também mais correto arquiteturalmente, já que a Fundação já é a dona do mecanismo de eventos.
- **Falha intermitente real encontrada e corrigida:** a limpeza de dados de teste desativa/reativa o trigger de imutabilidade via `ALTER TABLE` — uma alteração de catálogo **global**, não scoped à sessão. Como o Jest corre ficheiros em paralelo por defeito, isto causava corridas reais entre ficheiros. Tentativa de correção com `SET LOCAL session_replication_role` falhou (exige superuser, que `nexa_dev` não tem por Least Privilege); corrigido fazendo os testes e2e correrem sempre em série (`--runInBand`).
- Todos os testes (27/27: T1-T9 deste passo + regressão completa dos Passos 4-5) passaram, mais demonstração manual contra `nexa_dev` — detalhe em §3.9 da especificação.
- **Definition of Done do M1 (Blueprint §2.2) tecnicamente completo** — ver nota na secção 3 acima sobre a posição do Passo 7 (Partilha) face ao DoD.

### 3.7 Registo de Conclusão — Passo 7 (2026-07-06) — último passo do M1, Milestone formalmente encerrado

- **Especificação técnica formal aprovada antes da implementação, com 4 decisões previamente validadas** — ver [Especificação Técnica do Passo 7](docs/04-implementation-blueprint/06-especificacao-tecnica-passo-7-partilha.md): demonstração com entidades mínimas de `Cliente`/`Processo` só para teste (sem CRUD/módulo, EP-03/EP-04 ficam para depois); campo `nivelAcesso` (enum, só `leitura` no MVP) adicionado ao schema; revogação por soft-delete (`revogadoEm`, mesmo padrão de outras entidades); autoridade de conceder/revogar por papel + relação direta com a entidade (regras P1-P5).
- **`AuthorizationService.podeAcederViaPartilha(entidadeTipo, entidadeId)`** — terceira pergunta do serviço único de autorização (Passo 5), implementando literalmente ADR-004 §3.3 ponto 3 ("consulta a entidade Partilha quando aplicável"). Semântica pura: só responde se uma Partilha ativa concede acesso; não decide sozinho a visibilidade — fica pronto para EP-03/EP-04 consumirem quando existirem.
- **Regras P1-P5** (mesmo rigor do L1-L6 do Passo 5): `admin_empresa` sempre; `gestor` só sobre entidades do seu Departamento (Cliente via Departamento do `owner`, Processo via `departamentoId` direto); `colaborador` só sobre o que é `owner`/`responsavel`; `convidado` nunca; o convidado-alvo tem de ser Utilizador da mesma Empresa com papel Convidado.
- **`PartilhaService`** (`apps/api/src/modules/fundacao/partilha/`) faz a verificação de instância (P1-P3); o `PermissaoGuard` do controlador só verifica a permissão de papel (`fundacao.conceder_partilha`/`revogar_partilha`/`listar_partilhas`) — mesmo padrão já estabelecido em `UtilizadoresService.atribuirPapel` (Passo 5). Partilha é ação do módulo `fundacao`, não `crm`/`processos` — capacidade transversal da Fundação (regra não-negociável #2), não de um módulo de negócio ainda inexistente.
- **`POST /partilhas`, `DELETE /partilhas/:id`, `GET /partilhas`** implementados — listagem com âmbito por papel (`admin_empresa` vê tudo; `gestor` o que concedeu + o do seu Departamento; `colaborador` só o que concedeu; `convidado` só o que lhe foi concedido a ele).
- **Auditoria integrada** — `criar`/`Partilha` e `eliminar`/`Partilha`, mesma convenção do Passo 6.
- **Descoberta real durante a aplicação da migração (não um bug de código):** `prisma migrate deploy` contra `nexa_test` falhava com `permission denied for schema public`. Diagnóstico revisto e corrigido: `nexa_dev` já era o dono real de `nexa_test` — nunca foi necessário nenhum `GRANT`. A causa real era `.env.test`'s `DATABASE_URL` apontar para `nexa_app` (sem DDL, por desenho) — o Prisma lê sempre essa variável, nunca `DATABASE_ADMIN_URL`. Corrigido usando `DATABASE_ADMIN_URL` só para o comando de migração, documentado como D9 na especificação para não se repetir.
- Todos os testes (40/40: T1-T15 deste passo + regressão completa dos Passos 4-6) passaram, estáveis em 2 execuções consecutivas — detalhe em §3.11 da especificação.
- **Milestone M1 (Fundação) formalmente concluído** — todos os passos previstos no Blueprint (0-7) implementados, validados e aprovados.

### 3.8 Registo de Conclusão — Passo 8 (2026-07-06) — primeiro passo do M2

- **Especificação técnica formal aprovada antes da implementação, com 2 decisões previamente validadas** — ver [Especificação Técnica do Passo 8](docs/04-implementation-blueprint/07-especificacao-tecnica-passo-8-departamento.md): atribuição de Departamento a Utilizadores incluída no âmbito (sem isto, a visibilidade de Gestor por Departamento ficaria intestável via produto real); endpoints planos (`/departamentos`, `/utilizadores/:id/departamento`), mesmo padrão do Passo 5.
- **CRUD completo de Departamento** (`apps/api/src/modules/fundacao/departamento/`) — criar, listar, editar, eliminar (soft-delete) — sem alteração de schema, `Departamento` já estava completo desde o Passo 2.
- **`UtilizadoresService.atribuirDepartamento`** + `PATCH /utilizadores/:id/departamento` — aceita `departamentoId: string | null` (`null` remove a atribuição).
- **Gestão exclusiva de `admin_empresa`**, exceto `listar_departamentos` (também `gestor`, que precisa de contexto de estrutura para operar).
- **RD-01 a RD-04**: nunca eliminar um Departamento com Utilizadores ativos atribuídos (mesma cautela de RN-01, Passo 5); `departamentoId` fornecido tem de existir, pertencer à mesma Empresa e não estar eliminado; isolamento de tenant sempre estrutural (Camada 1).
- **Auditoria integrada** — `criar`/`atualizar`/`eliminar` de `Departamento`, `atribuir_departamento` de `Utilizador`.
- **Sem descobertas técnicas emergentes** — passo direto, sem correções de arquitetura a meio, ao contrário de vários passos anteriores.
- Todos os testes (51/51: 11 novos deste passo + regressão completa de 40 testes dos Passos 4-7) passaram, estáveis em 2 execuções consecutivas — detalhe em §3.8 da especificação.
- **Milestone M2 (Módulos Core) em curso** — Passo 9 (Processos/Tarefas) concluído a seguir (ver 3.9).

### 3.9 Registo de Conclusão — Passo 9 (2026-07-06) — primeiro módulo de negócio fora da Fundação

- **Especificação técnica formal aprovada antes da implementação, com 2 decisões previamente validadas na Proposta de M2** — ver [Especificação Técnica do Passo 9](docs/04-implementation-blueprint/08-especificacao-tecnica-passo-9-processos.md): centralização da visibilidade RBAC (Decisão B do M2); `Processo.estado` promovido a `enum EstadoProcesso` (Decisão C do M2).
- **Decisão emergente identificada e validada durante o desenho (antes de implementar):** a lógica de visibilidade que a Decisão B exige centralizar já existia — de forma privada — no `PartilhaService` (Passo 7). Em vez de a duplicar num terceiro sítio, foi **movida para o `AuthorizationService`** (`obterRelacaoEntidade`, `podeAgirSobreEntidade`, e a nova `obterEscopoVisibilidade` para listagens) e o **`PartilhaService` foi refatorado para a consumir daí** — os 40 testes de Partilha passaram sem qualquer alteração ao ficheiro de teste, confirmando zero impacto de comportamento.
- **Segunda descoberta, validada antes de codificar:** `Processo.descricao` estava em falta desde o Passo 2, apesar de exigido pelo Functional Specifications (3.3) — adicionado ao schema na mesma migração da promoção de `estado`.
- **`FundacaoModule` passa a exportar `AuthorizationService`, `PermissaoGuard`, `SessionGuard`** — necessário para qualquer módulo de negócio (agora Processos, e os seguintes CRM/Dashboard) os consumir sem duplicar.
- **Novo módulo `apps/api/src/modules/processos/`** — primeiro módulo de negócio fora da Fundação (regra não-negociável #1). CRUD completo com regras PR-01 a PR-07: `admin_empresa` sem restrição; `gestor` por Departamento (do Processo, não do responsável — nota de modelação explícita); `colaborador` só sobre o que é responsável, nunca pode eliminar; `convidado` nunca cria/edita/elimina, só vê via Partilha.
- **`GET /processos/:id` é o primeiro consumidor real de `AuthorizationService.podeAcederViaPartilha`** (Passo 7) — resolve o Risco R1 desse passo, até aqui sem nenhum endpoint de produto a chamá-lo.
- **Associação a Cliente (FR-16) validada** via `podeAgirSobreEntidade('cliente', ...)` — funciona mesmo sem o módulo CRM existir como controlador (Passo 10), usando o modelo `Cliente` já existente desde o Passo 2 e entidades mínimas de teste (mesmo padrão do Passo 7).
- Todos os testes (68/68: 18 novos deste passo + regressão completa de 51 testes dos Passos 4-8) passaram, estáveis em 2 execuções consecutivas — detalhe em §3.12 da especificação.
- **Próximo: Passo 10 — CRM**, concluído a seguir (ver 3.10), reutilizando a mesma infraestrutura de visibilidade centralizada (Decisão B) sem a duplicar.

### 3.10 Registo de Conclusão — Passo 10 (2026-07-06) — segundo módulo de negócio, zero alterações ao AuthorizationService

- **Especificação técnica formal aprovada antes da implementação, com 4 decisões previamente validadas** — ver [Especificação Técnica do Passo 10](docs/04-implementation-blueprint/09-especificacao-tecnica-passo-10-crm.md): campos `Cliente.contactoPrincipal`/`Interacao.descricao` em falta desde o Passo 2 (mesmo tipo de lacuna encontrada em `Processo.descricao` no Passo 9); `Cliente.estadoOportunidade` promovido a `enum EstadoOportunidade`; eliminação de Cliente **deliberadamente fora de âmbito** — Cliente é uma entidade estrutural do negócio (Interações, Oportunidades, Pipeline), sem a linha "Eliminar Cliente" na matriz aprovada do Functional Specifications (ao contrário de Processos), decisão explícita da Fundadora/CEO de não assumir essa lacuna como lapso.
- **Confirmação prática da Decisão B do M2:** zero alterações ao `AuthorizationService` — `obterEscopoVisibilidade('cliente')`, `obterRelacaoEntidade('cliente', ...)` e `podeAgirSobreEntidade('cliente', ...)` já resolviam `Cliente` desde o Passo 9 (mesma implementação genérica). Segundo módulo de negócio a reutilizar a visibilidade centralizada sem escrever nenhuma lógica nova.
- **Novo módulo `apps/api/src/modules/crm/`** — CRUD de Cliente (criar/listar/ver/editar, **sem eliminar**), registo de Interações (`POST /clientes/:id/interacoes`, gate `crm.editar` — mesmo âmbito que editar o próprio Cliente, Functional Specifications 3.4), `GET /pipeline` (agregação por `estadoOportunidade`, só Clientes com oportunidade associada, âmbito igual ao de `GET /clientes`; `colaborador`/`convidado` sem acesso — "Não aplicável"/"Não" na matriz aprovada).
- **CR-06**: `contactoPrincipal` obrigatório antes da primeira Interação de um Cliente (Functional Specifications, 3.4) — validado no serviço, `400` se ausente.
- **IR-01**: Convidado nunca regista Interações, mesmo com Partilha ativa — `nivelAcesso` é sempre só leitura (Especificação Técnica do Passo 7, 2.1.B).
- Todos os testes (85/85: 17 novos deste passo + regressão completa de 68 testes dos Passos 4-9) passaram, estáveis em 2 execuções consecutivas — detalhe em §3.12 da especificação.
- **Próximo: Passo 11 — Notification Dispatcher**, primeiro consumidor de eventos fire-and-forget (`emit`, nunca `emitAsync`) do projeto.

---

## 4. Regras Não-Negociáveis — Nunca Violar

### Arquitetura (System Design Principles)
1. **Monólito modular** — nunca microsserviços nesta fase. Módulos: `fundacao`, `dashboard`, `processos`, `crm`, `ia`, `comercial`.
2. **Nenhum módulo acede diretamente aos dados internos de outro.** Só a Fundação (RBAC, Auditoria, Partilha) tem acesso transversal reconhecido.
3. **API-first** — o frontend nunca acede à base de dados diretamente, só via API.
4. **Configuração sobre hardcoding** — limites de plano, regras de permissão, políticas de autonomia de IA são dados, nunca valores fixos no código.
5. **Substituibilidade Controlada** — toda decisão de tecnologia (BD, fornecedor de IA, mecanismo de eventos) fica atrás de uma interface própria.

### Multi-Tenancy e Dados (ADR-001, ADR-003, Data & Consistency Rules)
6. **Nenhuma query à base de dados fora da camada de acesso a dados única.** Esta é a regra mais importante de todo o projeto — protege NFR-05 (zero-tolerância a fugas entre Empresas).
7. Toda entidade de negócio tem `tenant_id`, indexado, desde a primeira migração.
8. Row-Level Security nativa do PostgreSQL ativa como segunda camada, independente do middleware.
9. Registo de Auditoria é **append-only** — nunca UPDATE nem DELETE.
10. Integridade referencial nunca atravessa Empresas — reforçada por constraints de chave estrangeira com escopo de tenant.

### Autenticação e Autorização (ADR-004, Security & Access Principles)
11. **Sessões do lado do servidor** — nunca JWT. Cookie `httpOnly`, `Secure`, `SameSite=Strict`.
12. Argon2id para hashing de palavras-passe — nunca texto plano, nunca bcrypt.
13. **Um único serviço de autorização**, consultado por todos os controladores. Nenhum controlador verifica permissões diretamente.
14. Negação por defeito — na ausência de regra explícita, o acesso é sempre recusado.
15. Fail Secure — se o mecanismo de verificação falhar, a resposta é sempre negar, nunca permitir.

### IA (ADR-005, AI Principles)
16. **A IA nunca executa uma ação sem confirmação humana explícita.** É reforçado ao nível do sistema de tipos — nunca apenas por convenção.
17. Nenhum módulo chama um SDK de fornecedor de IA diretamente — só o AI Gateway.
18. Todo dado incluído num pedido à IA já foi filtrado pelo escopo RBAC de quem pergunta, **antes** de chegar ao Gateway.
19. Toda interação de IA é auditada.

### Código (Coding Standards)
20. TypeScript em modo `strict`, sempre.
21. Nenhum segredo em código ou commitado — só variáveis de ambiente.
22. Cobertura de teste obrigatória para os 4 fluxos críticos: isolamento multi-tenant, RBAC, limites de plano, ações de IA.
23. Commits em formato convencional (`feat:`, `fix:`, `docs:`).

### Princípio Geral (Blueprint, 5a)
24. Quando existir mais do que uma solução tecnicamente válida, prefere a de **menor complexidade operacional, maior facilidade de manutenção assistida por IA, e maior capacidade de evolução futura** — sem nunca comprometer segurança, qualidade ou escalabilidade.

---

## 5. Método de Trabalho — Não Alterar

- **Um passo de cada vez.** Não avances para o passo seguinte sem validação explícita.
- **Explica a estratégia antes de implementar.** Se houver mais do que uma opção válida, apresenta prós/contras e recomenda.
- **Nunca decidas uma questão de arquitetura por conta própria** se ela não estiver já coberta pelos ADRs ou pelo Blueprint — regista como pergunta e pede validação.
- **RBAC granular por Empresa fica para o Passo 5**, deliberadamente adiado — não o antecipes nos Passos 2-4, mesmo que pareças "já lá estar".

---

## 6. Próxima Ação Imediata — Passo 11 (M2)

**M1 (Fundação) formalmente concluído em 2026-07-06** (Passos 0-7). **M2 (Módulos Core) aprovado e em curso** — Passo 8 (Departamento), Passo 9 (Processos/Tarefas) e Passo 10 (CRM) concluídos e aprovados (ver 3.8, 3.9, 3.10). Próximo: **Passo 11 — Notification Dispatcher**.

- Construir o consumidor de eventos para `Notificacao` (FR-36) — ponto único de despacho ("Notification Dispatcher", conceptual, Event & Notification Architecture Rules §3.4), subscrevendo os eventos de negócio relevantes já emitidos desde os Passos 6/9/10 (criar/atualizar de Processo/Cliente, atribuir_papel, atribuir_departamento, etc.) e criando as `Notificacao` correspondentes.
- **Primeiro consumidor de eventos fire-and-forget (`emit`, nunca `emitAsync`) do projeto** — distinto do `AuditoriaListener` (Passo 6), que é obrigatório/bloqueante. A consistência é eventual, com o mesmo atraso máximo de 30s já fixado em NFR-04 para o Dashboard (Event & Notification Architecture Rules §3.6) — não introduzir uma nova janela de tolerância.
- **Idempotência obrigatória** (Event & Notification Architecture Rules §3.5) — processar o mesmo evento duas vezes nunca deve criar duas Notificações duplicadas.
- Decidir, antes da especificação, que eventos de negócio já existentes justificam uma Notificação (nem todos os eventos de auditoria precisam de gerar uma) — não assumir, validar com a Fundadora/CEO.
- Seguir a mesma disciplina de governação: especificação técnica antes de implementar, decisões emergentes identificadas antes de as tomar, evidências objetivas de validação antes de considerar o passo concluído.

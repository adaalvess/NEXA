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

**M1 (Fundação) formalmente concluído (2026-07-06). M2 (Módulos Core — Dashboard, Processos, CRM) formalmente concluído (2026-07-07). Ver nota abaixo.**

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

### M2 (Módulos Core) — Formalmente Concluído (2026-07-07)

Proposta completa do M2 (objetivos, âmbito, sequência de passos, dependências, riscos, DoD, decisões arquitetónicas) apresentada e aprovada pela Fundadora/CEO. Numeração de passos continua a partir do M1.

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 8 | Departamento — CRUD completo + atribuição a Utilizadores | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.8 |
| Passo 9 | Processos/Tarefas — CRUD, visibilidade RBAC, integração real de `podeAcederViaPartilha` | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.9 |
| Passo 10 | CRM — Cliente/Contacto/Oportunidade, Interação, Pipeline | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.10 |
| Passo 11 | Notification Dispatcher — consumidor de eventos para `Notificacao` (fire-and-forget) | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.11 |
| Passo 12 | Dashboard — agregação read-only | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.12 |
| Passo 13 | Design System (frontend) — componentes base (ADR-006) | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.13 |
| Passo 14 | Ecrãs (frontend) — Login, Dashboard, Processos, CRM | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.14 |

**Milestone M2 (Módulos Core) formalmente concluído em 2026-07-07** — todos os passos previstos (8-14) implementados, validados e aprovados; Definition of Done (Blueprint §2.2) cumprido: os 3 módulos (Dashboard, Processos, CRM) operacionais com CRUD completo, visibilidade RBAC verificada em cada módulo (por papel e por posse), estado inicial guiado presente em todos os ecrãs sem dados.

### M3 (Assistente de IA) — Formalmente Concluído (2026-07-07)

Proposta completa do M3 (objetivos, âmbito, arquitetura, sequência de passos, riscos, decisões técnicas, DoD, plano de validação) apresentada e aprovada pela Fundadora/CEO, com 5 decisões adicionais validadas (fornecedor único Anthropic, credenciais só via env vars, PSD-003 com retenção configurável, PSD-002 fora de âmbito, quota de 50/mês provisória). Numeração de passos continua a partir do M2.

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 15 | AI Gateway (backend) — interface própria, adaptador Anthropic, timeout/circuit breaker/quota | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.15 |
| Passo 16 | Módulo `ia` — `POST /ia/perguntar` (UC-05), extensão do schema `SugestaoIA`, teste NFR-17 | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.16 |
| Passo 17 | Sugestões de ação (UC-06) — `POST /ia/sugestoes`, `.../confirmar`/`/rejeitar`, RN-08 | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.17 |
| Passo 18 | Ecrã do Assistente de IA (frontend) — conversa + sugestões pendentes | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.18 |

**Milestone M3 (Assistente de IA) formalmente concluído em 2026-07-07** — todos os passos previstos (15-18) implementados, validados e aprovados; NFR-17 ("ações de IA") coberto na íntegra, fechando os 4 fluxos críticos obrigatórios do projeto (isolamento multi-tenant, RBAC, limites de plano, ações de IA).

### M4 (Comercial e Pagamentos) — Aprovado e em Curso (2026-07-07)

Proposta completa do M4 (objetivos, âmbito, exclusões, arquitetura, sequência de passos, riscos, DoD) apresentada e aprovada pela Fundadora/CEO — resolve formalmente o Risco R3 do Master Roadmap (valores numéricos de limites por plano, nunca antes fixados): Starter (5 utilizadores, 1024 MB, 50 pedidos IA/mês), Professional (20 utilizadores, 10240 MB, 200 pedidos IA/mês), Enterprise (sem limite — `null`, nunca um valor sentinela). Âmbito de enforcement nesta fase: só `limiteUsoIA` (RN-10/RN-11 para `limiteUtilizadores`/`limiteArmazenamentoMb` ficam preparados no modelo de dados, sem lógica de bloqueio, por não existir ainda nenhuma funcionalidade que os gatilhe — UC-02, convite por email, e gestão documental continuam fora de âmbito). Upgrade/downgrade entre planos pagos e cancelamento self-service ficam fora do M4 (nenhum UC aprovado os cobre). Toda a lógica de subscrição, estados, limites e Stripe centralizada no módulo `comercial` — outros módulos consomem serviços expostos, nunca conhecem regras de faturação diretamente. Numeração de passos continua a partir do M3.

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 19 | `SubscricaoPlano` real (trial automático), `GET /planos` | ✅ **Concluído e aprovado** (2026-07-07) — ver 3.19 |
| Passo 20 | Enforcement de `limiteUsoIA` por plano + RN-11 (trial expirado → estado "limitada") | 🔜 Próximo passo |
| Passo 21 | Stripe Checkout — `POST /subscricao/checkout` | Por iniciar |
| Passo 22 | Webhooks Stripe — `POST /webhooks/stripe`, idempotentes | Por iniciar |
| Passo 23 | Ecrã(s) frontend — plano atual, limites/uso, upgrade | Por iniciar |

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
- **Próximo: Passo 11 — Notification Dispatcher**, concluído a seguir (ver 3.11), primeiro consumidor de eventos fire-and-forget do projeto.

### 3.11 Registo de Conclusão — Passo 11 (2026-07-06) — primeiro consumidor de eventos fire-and-forget

- **Especificação técnica formal aprovada antes da implementação, com 2 decisões previamente validadas** — ver [Especificação Técnica do Passo 11](docs/04-implementation-blueprint/10-especificacao-tecnica-passo-11-notification-dispatcher.md): conjunto mínimo de 5 gatilhos (`atribuir_papel`, `atribuir_departamento`, `criar` Partilha, `criar`/`atualizar` Processo com reatribuição); sem endpoints de leitura neste passo — exposição ao Utilizador fica para o Passo 12 (Dashboard).
- **`NotificacaoListener`** (`apps/api/src/modules/fundacao/notificacao/`) subscreve o **mesmo** `EVENTO_AUDITORIA` já emitido desde os Passos 6/8/9/10 — nenhum novo tipo de evento, nenhuma alteração a pontos de emissão já em produção. A distinção fire-and-forget vem de o `handle` nunca retornar/aguardar a sua própria promessa — o `Promise.all` interno do `emitAsync` (usado por quem emite) só espera pelo que cada listener efetivamente devolve, por isso este consumidor nunca bloqueia a operação original, mesmo partilhando o evento com o `AuditoriaListener` (esse, sim, bloqueante).
- **Sem verificação de deduplicação/idempotência adicional** — `EventEmitter2` não tem redelivery real (nota técnica honesta, não uma lacuna); revisitar só se o projeto migrar para um broker de mensagens real.
- **Descoberta real durante os testes (corrida exclusiva do ambiente de testes, sem impacto em produção):** a escrita fire-and-forget do `NotificacaoListener` podia ainda estar em curso quando outros testes (Partilha, RBAC, Departamento, Auditoria) eliminavam a Empresa logo a seguir ao pedido HTTP — causando violações de chave estrangeira (capturadas, não faziam os testes falhar, mas poluíam os logs). Mitigado com uma pequena espera (150ms) em `limparEmpresasDeTeste`, mas uma espera fixa nunca elimina uma corrida, só a torna menos provável — a corrida persistiu ocasionalmente. **Corrigido na raiz** tratando `P2003` (violação de chave estrangeira) como desfecho legítimo e silencioso dentro do próprio `NotificacaoListener` (a entidade referenciada já não existir é um cenário real para um consumidor fire-and-forget, não um erro a alarmar) — confirmado limpo, sem nenhum erro de log, em 3 execuções consecutivas da suite completa. A aplicação em produção nunca elimina uma Empresa fisicamente logo a seguir a uma ação (PSD-001 continua sem decisão de hard-delete).
- Todos os testes (94/94: 9 novos deste passo + regressão completa de 85 testes dos Passos 4-10) passaram, estáveis em 2 execuções consecutivas — detalhe em §3.7 da especificação.
- **Próximo: Passo 12 — Dashboard**, concluído a seguir (ver 3.12), agregação read-only sobre Processos/CRM/Notificações, primeiro consumidor real da tabela `Notificacao`.

### 3.12 Registo de Conclusão — Passo 12 (2026-07-07) — terceira confirmação da Decisão B do M2, backend do M2 concluído

- **Especificação técnica formal aprovada antes da implementação, com uma decisão herdada do Passo 11** (exposição de Notificações, já ali atribuída a este passo, não uma nova decisão de âmbito) — ver [Especificação Técnica do Passo 12](docs/04-implementation-blueprint/11-especificacao-tecnica-passo-12-dashboard.md).
- **Terceiro módulo de negócio** (`apps/api/src/modules/dashboard/`) — `GET /dashboard` (indicadores agregados de Processos/Clientes/Notificações + estado inicial guiado, FR-11/FR-12), `GET /notificacoes`, `PATCH /notificacoes/:id/lida` (FR-36).
- **Zero alterações ao `AuthorizationService`** — terceira reutilização integral de `obterEscopoVisibilidade`, confirmando que a centralização da Decisão B do M2 escala para um terceiro módulo sem duplicação.
- **Sem migração de schema** — Dashboard confirmado "sem entidade própria" (Functional Specifications, 3.2).
- **Sem descobertas técnicas emergentes** — passo direto, sem correções de arquitetura a meio.
- Todos os testes (102/102: 8 novos deste passo + regressão completa de 94 testes dos Passos 4-11) passaram, estáveis e sem erros de log em 3 execuções consecutivas — detalhe em §3.11 da especificação.
- **Backend do M2 concluído** — Passos 8 a 12 implementados, validados e aprovados. Próximo: Passo 13 — Design System (frontend), primeiro passo de `apps/web` desde o scaffolding do Passo 1.

### 3.13 Registo de Conclusão — Passo 13 (2026-07-07) — primeiro passo de frontend desde o scaffolding do Passo 1

- **Especificação técnica formal aprovada antes da implementação, adaptada ao contexto visual/frontend (sem regras de negócio, RBAC ou schema) mas com a mesma disciplina de governação dos passos anteriores** — ver [Especificação Técnica do Passo 13](docs/04-implementation-blueprint/12-especificacao-tecnica-passo-13-design-system.md): resolve duas Questões em Aberto herdadas (ADR-006 Q1 — estrutura de pastas e nomenclatura; Information Architecture Q1 — estado inicial guiado personalizado por módulo, já implicitamente confirmado pelo desenho do `GET /dashboard`, Passo 12).
- **Estrutura de pastas** `apps/web/src/components/ui/`, `components/layout/` (vazia — `BarraLateralNavegacao` fica para o Passo 14), `lib/utils.ts` (`cn()`), `hooks/use-toast.ts` — nomenclatura de componentes e props em português, consistente com o vocabulário do backend.
- **11 componentes base** implementados sobre primitivas Radix UI (`@radix-ui/react-select`, `-dialog`, `-dropdown-menu`, `-toast`, `-avatar`): `Botao`, `Input`, `Select`, `Modal`, `MenuDropdown`, `TabelaDados`, `Cartao`, `NotificacaoToast`, `BadgeEstado`, `Avatar`, `EstadoVazioGuiado` — acessibilidade (NFR-14) herdada por construção nos que usam Radix.
- **Tokens de marca estendidos** em `tailwind.config.ts` — escala tipográfica completa (`display` a `caption`) e `boxShadow.glow-purple`, ambos traduzidos diretamente do Brand Book v1.3, sem reinterpretação.
- **Modo único dark** (Dark Tech Premium) confirmado para o âmbito do MVP — sem "light mode"; questão fica registada para decisão futura, não antecipada.
- **Vitrine interna** em `/design-system` (`apps/web/src/app/design-system/page.tsx`) demonstra todos os componentes com estado interativo real — substituindo Storybook por menor complexidade operacional (Risco R1, aceite conscientemente).
- **Três descobertas reais durante a implementação, todas documentadas em §3.12 da especificação:** (1) correção de rota — a especificação previa `/_design-system`, mas o Next.js App Router exclui do routing qualquer pasta prefixada com `_`; corrigido para `/design-system`, sem impacto na decisão de vitrine interna vs. Storybook; (2) lacuna real pré-existente desde o Passo 1 — `tailwind.config.ts` já referenciava os nomes das fontes (Space Grotesk/Inter) mas nenhum ficheiro as carregava, caindo silenciosamente no tipo de letra do sistema; corrigido com `next/font/google` em `app/layout.tsx`; (3) cache do servidor de desenvolvimento (`.next`) temporariamente desatualizado após a alteração ao `tailwind.config.ts`, sem impacto em produção nem no código — resolvido reiniciando o servidor com o cache limpo.
- Validação por **inspeção visual real no browser** (preview), não apenas revisão de código: todos os 11 componentes e variantes renderizados; cores confirmadas por correspondência HEX exata ao Brand Book; tipografia confirmada (Space Grotesk/Inter, escala completa); `Modal`/`Select` navegáveis por teclado; responsivo sem quebras em 375px/768px/desktop; `EstadoVazioGuiado` confirmado sem texto fixo interno. `npm run build` e `npm run lint` (`apps/web`) sem erros, TypeScript `strict` intacto — detalhe completo em §3.12 da especificação.
- **Design System (Blueprint §5.1) concluído** — próximo e último passo do M2: Passo 14 (Ecrãs), primeiro a consumir as APIs do backend (Passos 8-12) através destes componentes.

### 3.14 Registo de Conclusão — Passo 14 (2026-07-07) — último passo do M2, Milestone formalmente concluído

- **Especificação técnica formal aprovada antes da implementação** — ver [Especificação Técnica do Passo 14](docs/04-implementation-blueprint/13-especificacao-tecnica-passo-14-ecras.md). Duas decisões de âmbito validadas (E1: incluir ecrã de Login mínimo, pré-requisito técnico para validação visual dos restantes ecrãs; E2: excluir Registo/Configurações, utilizadores de teste criados via API). Implementado em **3 sub-entregas sequenciais**, cada uma validada visualmente no browser e aprovada formalmente antes da seguinte (Login+Dashboard → Processos → CRM) — mesma disciplina, ritmo mais granular.
- **Descoberta técnica pré-implementação**: `GET /utilizadores` não existia (só `PATCH :id/papel`/`:id/departamento`), necessário para os seletores de responsável/owner nos formulários de criação — adicionado como extensão mínima e aditiva ao `UtilizadoresController` já existente, nova permissão `fundacao.listar_utilizadores` (só admin/gestor).
- **Sub-entrega 1 (Login + Dashboard)**: `lib/api.ts` (cliente único de API), sessão via `GET /auth/eu` no Server Component, `papel` só em memória (nunca `localStorage`). **Descoberta**: `POST /auth/logout` nunca tinha sido implementado desde o Passo 3 — adicionado (invalida `Sessao` na BD, nunca só o cookie; evento de auditoria `logout`), com validação explícita pedida pela Fundadora/CEO (invalidação de sessão, redirecionamento de rotas protegidas, botão "Voltar" do browser não expõe conteúdo autenticado, cache do TanStack Query limpa sem fuga entre Empresas). **Descoberta**: sidebar sem responsividade real (largura fixa cortava conteúdo em mobile) — corrigida com padrão de drawer sobreposto em `<md`.
- **Sub-entrega 2 (Processos)**: lista/criar/detalhe completos, RBAC testado com utilizador `colaborador` real (formulário esconde responsável/departamento, "Eliminar" ausente, confirmado com tentativa direta de `DELETE` via `fetch` → `403`, defesa em profundidade). **Descoberta**: faltava componente `Textarea` (nenhum dos 11 do Passo 13 cobria multi-linha) — adicionado. **Descoberta**: `TabelaDados` recortava colunas em ecrãs estreitos em vez de scrollar — corrigido no componente partilhado, beneficia CRM automaticamente.
- **Sub-entrega 3 (CRM)**: lista/criar/detalhe/pipeline completos. CR-06 (contacto principal obrigatório antes da primeira Interação) validado end-to-end. RBAC por posse (CR-02/CR-03) validado — "Editar" e registo de Interação dependem de ser owner, não do papel. Pipeline oculto da navegação para colaborador/convidado, acesso direto por URL devolve `403` tratado com mensagem, nunca crash.
- **Resultados finais**: backend 109/109 testes (102 herdados + 7 novos: 4 para `GET /utilizadores`, 3 para `POST /auth/logout`); frontend build/lint limpos em todas as sub-entregas; responsividade confirmada em 375px/768px/1280px.
- **Milestone M2 (Módulos Core) formalmente concluído** — Passos 8 a 14 implementados, validados e aprovados; Definition of Done (Blueprint §2.2) cumprido integralmente.

### 3.15 Registo de Conclusão — Passo 15 (2026-07-07) — primeiro passo do M3

- **Proposta formal do Milestone M3 aprovada antes de qualquer Especificação Técnica** — objetivos, âmbito, arquitetura, sequência de passos (15-18), riscos, DoD, plano de validação; 5 decisões adicionais validadas (fornecedor único Anthropic com arquitetura independente de fornecedor; credenciais só via variáveis de ambiente, nunca reais em teste; PSD-003 com retenção de conteúdo configurável; PSD-002 fora de âmbito, sem bloquear extensão futura; quota de 50 pedidos/mês por Empresa como configuração técnica provisória, a rever no M4). Contexto orientador: Product Vision v1.2 §3.5a (princípio 40/60).
- **Especificação técnica formal aprovada antes da implementação, cumprindo 5 condições explícitas adicionais da aprovação do M3** — ver [Especificação Técnica do Passo 15](docs/04-implementation-blueprint/14-especificacao-tecnica-passo-15-ai-gateway.md): estratégia de versionamento (nenhum HTTP explícito — serviço interno, não API externa), observabilidade (logs estruturados, `requestId` de correlação, sem ferramenta dedicada ainda), testes com `FakeAdapter` (zero dependência de rede/credenciais reais), timeout (30s)/zero retries automáticos/circuit breaker (5 falhas/60s → 120s aberto), classificação completa de erros.
- **Módulo `apps/api/src/modules/ia/`** implementado — `AiGatewayService`, `QuotaService`, `CircuitBreakerService`, `AnthropicAdapter` (único adaptador real), `FakeAdapter` (só testes). Contrato de tipos neutro de SDK (`AIRequest`/`AIResponse`) e distinção estrutural sugestão/execução (`PendingSuggestion`/`ConfirmedAction`) ao nível de tipos (ADR-005 §3.6/§3.7). **Sem endpoint de produto neste passo** — fundação para os Passos 16/17.
- **Descoberta técnica real, corrigida antes de escrever código de produção**: `SubscricaoPlano.limiteUsoIA` é um teto, nunca um contador, e `SubscricaoPlano` nunca é criado para nenhuma Empresa (M4, deliberadamente adiado). Resolvido com um novo modelo aditivo `UsoIAMensal` (migração `20260707150654`) + RLS (migração `20260707150804`) — nunca reabre a decisão adiada do M4.
- **Duas descobertas de testabilidade**: parâmetros configuráveis (timeout/quota/circuit breaker) passaram de constantes cacheadas ao nível do módulo para leitura a cada chamada (mesmo comportamento em produção, testável sem depender de ordem de importação); testes migrados de "um `TestingModule` por teste" (que acumulava listeners do `EventEmitter2` entre compilações, duplicando auditoria) para o padrão já estabelecido de um único módulo por ficheiro de teste.
- **Resultados**: `apps/api/test/ia-gateway.e2e-spec.ts` (7 testes, mesmo padrão sem-HTTP de `tenant-isolation.e2e-spec.ts`), suite completa em 116/116 testes (109 herdados + 7 novos); `npm run build` limpo; app arranca corretamente sem credencial real.
- **Milestone M3 em curso** — próximo: Passo 16 (`POST /ia/perguntar`, UC-05).

### 3.16 Registo de Conclusão — Passo 16 (2026-07-07) — primeiro endpoint de produto do M3

- **Especificação técnica formal aprovada antes da implementação, com 3 decisões emergentes validadas antecipadamente** — ver [Especificação Técnica do Passo 16](docs/04-implementation-blueprint/15-especificacao-tecnica-passo-16-ia-perguntar.md): (A) `AuthorizationService.construirFiltroWhere` extraído do `DashboardService` — 4ª confirmação da Decisão B do M2, comportamento neutro confirmado pelos 8 testes de Dashboard já existentes, sem alteração ao ficheiro de teste; (B) retenção de conteúdo (PSD-003) por ocultação-na-leitura, sem purga física nem scheduler nesta fase; (C) contexto da IA = resumo agregado (Processos/Clientes/Pipeline), sem lookup de entidade nomeada — decisão consciente de âmbito, registada como tal, não uma lacuna escondida.
- **`POST /ia/perguntar`** implementado — `IaService.reunirResumoOperacional()` (RN-07 estrutural: dados fora do escopo RBAC nunca são reunidos, logo nunca chegam ao Gateway) + `IaService.perguntar()` (orquestra o `AiGatewayService` do Passo 15 e persiste `SugestaoIA`). `IaExceptionFilter` traduz pela primeira vez os erros tipados do Gateway para HTTP (429/504/503/400/502). Permissão `ia.perguntar` — `convidado` sem acesso (Information Architecture §3.4).
- **Extensão aditiva do schema `SugestaoIA`** (`conteudoPergunta`/`conteudoResposta`, migração `20260707154415`) — `estado` de uma pergunta é sempre `'aceite'`, nunca `'pendente'` (só sugestões de ação, Passo 17, ficam pendentes).
- **Sem descobertas técnicas emergentes além das já antecipadas nas 3 decisões da própria especificação** — as Decisões a Validar cobriram antecipadamente o que, nos passos anteriores, normalmente só surgia durante a implementação.
- **Resultados**: `apps/api/test/ia-perguntar.e2e-spec.ts` (6 testes, via HTTP real — RN-07 verificado inspecionando o `AIRequest` realmente recebido pelo `FakeAdapter`), suite completa em 122/122 testes (116 herdados + 6 novos); `npm run build` limpo; app arranca corretamente, rota mapeada.
- **NFR-17 ("ações de IA")** tem agora a metade "pergunta" coberta — a metade "sugestão/confirmação" (RN-08) fica para o Passo 17.
- **Milestone M3 em curso** — próximo: Passo 17 (`POST /ia/sugestoes/:id/confirmar`/`/rejeitar`, UC-06).

### 3.17 Registo de Conclusão — Passo 17 (2026-07-07) — fecha NFR-17 na íntegra

- **Especificação técnica formal aprovada antes da implementação, com 6 decisões emergentes validadas antecipadamente** — ver [Especificação Técnica do Passo 17](docs/04-implementation-blueprint/16-especificacao-tecnica-passo-17-ia-sugestoes.md): (A) único tipo de ação suportado no MVP — reatribuição de um Processo em atraso a um Colaborador do mesmo Departamento com menor carga, o exemplo literal de UC-06; (B) deteção e texto de justificação 100% determinísticos, sem qualquer chamada ao AI Gateway na geração — preserva a quota escassa (50/mês), sem exigir que FR-24/FR-25 sejam cumpridos por um LLM; (C) `ProcessosService` passa a ser exportado por `ProcessosModule` e consumido por `IaModule` para executar a reatribuição confirmada — primeira vez que um módulo de negócio importa o serviço de outro módulo de negócio, coberto pela regra #1 do System Design Principles (interface interna explícita), nunca uma exceção a ela; (D) `ia.gerar_sugestoes`/`confirmar_sugestao`/`rejeitar_sugestao` só para `admin_empresa`/`gestor` — `colaborador` estruturalmente incapaz de reatribuir Processos a terceiros (`ProcessosService.editar` já o impede); (E) sugestão obsoleta na confirmação (UC-06, Exceção E1) → `409`, sem introduzir um 4º valor de `estado`; (F) sem `GET /ia/sugestoes` neste passo, adiado para o Passo 18.
- **`POST /ia/sugestoes`** (geração), **`POST /ia/sugestoes/:id/confirmar`**, **`POST /ia/sugestoes/:id/rejeitar`** implementados — `IaService.detetarProcessosEmRisco()` (deteção determinística, idempotente), `gerarSugestoes()`, `confirmarSugestao()` (revalida staleness antes de executar via `processosService.editar`, Decisão E; autoridade = destinatário da sugestão ou `admin_empresa`), `rejeitarSugestao()`. RN-08 garantida em duas camadas independentes: tipos (`PendingSuggestion`/`ConfirmedAction`, Passo 15) e eventos (`gerar`/`confirmar`/`rejeitar` de `SugestaoIA` sempre distintos do evento `atualizar`/`Processo` já emitido por Processos, Event & Notification Architecture Rules §3.8).
- **Extensão aditiva do schema `SugestaoIA`** (`acaoPayload Json?`, migração `20260707191042`) — a confirmação executa exatamente o payload gravado na geração, nunca uma recomputação tardia da heurística.
- **Sem descobertas técnicas emergentes além das já antecipadas nas 6 decisões da própria especificação** — única confirmação obtida em código (não alterou nenhuma decisão): `ProcessosService.validarResponsavelParaEdicao` já resolve o Departamento a partir do Processo existente quando a confirmação não o fornece explicitamente, por isso `IaService.confirmarSugestao` herda corretamente o âmbito de Departamento do `gestor` confirmante sem código adicional.
- **Resultados**: `apps/api/test/ia-sugestoes.e2e-spec.ts` (10 testes, via HTTP real), suite completa em 132/132 testes (122 herdados + 10 novos); `npm run build` limpo; app arranca corretamente, rotas mapeadas.
- **NFR-17 ("ações de IA") fecha na íntegra** — os 4 fluxos críticos obrigatórios (isolamento multi-tenant, RBAC, limites de plano, ações de IA) têm agora todos cobertura de teste automatizado.
- **Milestone M3 em curso** — próximo: Passo 18 (Ecrã do Assistente de IA, frontend — conversa + sugestões pendentes), primeiro passo de `apps/web` desde o Passo 14.

### 3.18 Registo de Conclusão — Passo 18 (2026-07-07) — último passo do M3, Milestone formalmente concluído

- **Especificação técnica formal aprovada antes da implementação, com 5 decisões emergentes validadas antecipadamente** — ver [Especificação Técnica do Passo 18](docs/04-implementation-blueprint/17-especificacao-tecnica-passo-18-ecra-ia.md): (A) `GET /ia/sugestoes` (extensão aditiva ao backend, herdada da Decisão F do Passo 17) — sempre `tipo='sugestao_acao'`/`estado='pendente'`, sem parâmetro de filtro, nova permissão `ia.listar_sugestoes`; (B) visibilidade da listagem = mesma regra de autoridade de confirmar/rejeitar (Passo 17) — nunca um novo âmbito de Departamento para sugestões; (C) conversa da pergunta livre sem histórico persistido — âmbito local à sessão do browser, decisão de produto consciente, não uma limitação técnica; (D) RN-08 refletida na interface — `Modal` de segunda confirmação antes de "Confirmar", nunca ação em lote; (E) Assistente de IA como item normal da `BarraLateralNavegacao` (mesma UX de Dashboard/Processos/CRM) — a posição visual transversal fixa (Information Architecture §3.6.6) é uma capacidade arquitetural explicitamente fora do âmbito funcional do MVP nesse mesmo documento.
- **`apps/web/src/app/(autenticado)/ia/page.tsx`** implementado — secções "Perguntar" (todos exceto `convidado`) e "Sugestões Pendentes" (só `admin_empresa`/`gestor`, condicional por `papel` — API continua a decidir, frontend só oculta, ADR-006 §3.7). Cross-navegação de cada sugestão para o Processo referenciado (Information Architecture §3.5). Tratamento explícito de `403`/`429`/`503`/`504`/`409`, nunca crash.
- **`IaService.listarSugestoesPendentes()`** reaproveita `aplicarRetencao` (Passo 16) sobre o texto de justificação, mesma disciplina de retenção já aplicada a perguntas.
- **Validação visual real no browser** (não só revisão de código) — Empresa de demonstração criada via API + fixtures diretas em `nexa_dev`, eliminada no fim da validação (mesmo mecanismo de limpeza dos testes e2e). Fluxo completo ponta a ponta confirmado nos 4 papéis: `admin_empresa` (pergunta livre, geração, cross-navegação, confirmação real via `Modal` com reatribuição verificada na BD), `gestor` (geração adicional, rejeição), `colaborador` (secção "Sugestões Pendentes" ausente, `403` confirmado por `fetch` direto), `convidado` (item de navegação ausente, acesso direto por URL mostra mensagem sem crash, `403` confirmado por `fetch` direto). Responsividade confirmada em 375px/768px/1280px.
- **Nota de âmbito honesta**: sem credencial real do fornecedor Anthropic no ambiente local (decisão já aprovada do M3), o caminho de resposta bem-sucedida da pergunta livre não pôde ser observado visualmente com uma resposta real da IA — o pedido `POST /ia/perguntar` foi confirmado a disparar corretamente e o erro `502` (fornecedor indisponível) foi tratado sem crash; o caminho de sucesso já está coberto por teste automatizado com `FakeAdapter` desde o Passo 16.
- **Sem descobertas técnicas emergentes além de uma correção operacional (não de código)**: um clique inicial no botão "Perguntar" não disparou o pedido durante a validação — artefacto do Fast Refresh do servidor de desenvolvimento a meio de uma edição concorrente, sem impacto em produção nem no código entregue.
- **Resultados**: `apps/api/test/ia-sugestoes.e2e-spec.ts` ganhou 3 testes adicionais (T11-T13) para `GET /ia/sugestoes`, suite completa em 135/135 testes (132 herdados + 3 novos); `npm run build`/`npm run lint` limpos em `apps/api` e `apps/web`.
- **Milestone M3 (Assistente de IA) formalmente concluído** — todos os passos previstos (15-18) implementados, validados e aprovados; NFR-17 coberto na íntegra.

### 3.19 Registo de Conclusão — Passo 19 (2026-07-07) — primeiro passo do M4

- **Especificação técnica formal aprovada antes da implementação, com 6 decisões emergentes validadas antecipadamente e um reforço explícito pedido pela Fundadora/CEO na aprovação** — ver [Especificação Técnica do Passo 19](docs/04-implementation-blueprint/18-especificacao-tecnica-passo-19-comercial-subscricao.md): (A) `SubscricaoPlano` de trial criado reativamente ao mesmo `EVENTO_AUDITORIA` já emitido por `AuthService.registar()` (`fundacao/`), via `tenantContext.run()` — primeira utilização em produção de um padrão até agora só usado em testes (`comoTenant()`); `fundacao` nunca fica a saber que `comercial` existe, sem exigir nenhum novo role de BD; (B) campos de limite `Int?`, `null` = sem limite (Enterprise) — nunca um valor sentinela; exigiu corrigir o `QuotaService` (Passo 15) para distinguir "sem `SubscricaoPlano`" de "`SubscricaoPlano` existe, sem limite"; (C) trial automático no plano `professional`; (D) `plano`/`estado` promovidos a `enum` Prisma; (E) `Empresa.estadoSubscricao` removido (nunca usado desde o Passo 2) — `SubscricaoPlano.estado` passa a ser a única fonte de verdade; (F) `GET /planos` só para `admin_empresa`.
- **Reforço explícito da Fundadora/CEO**: o `SubscricaoListener` tem de ser idempotente — `EventEmitter2` não garante entrega exatamente uma vez, e um replay do mesmo evento nunca pode duplicar a subscrição nem reverter um estado já avançado. Implementado com `upsert` (`update: {}` deliberadamente vazio), nunca `create` — testado explicitamente (T6).
- **Novo módulo `comercial`** (`apps/api/src/modules/comercial/`) — já antecipado desde a regra não-negociável #1, agora construído: `PLANOS_CONFIG` (valores aprovados na Proposta do M4, resolvendo o Risco R3 do Master Roadmap), `SubscricaoListener`, `GET /planos`. `FundacaoModule` nunca importa `ComercialModule` — a direção de dependência mantém-se sempre módulo de negócio → Fundação, mesmo com o novo padrão de módulo-a-módulo já estabelecido no Passo 17.
- **Sem descobertas técnicas emergentes além das já identificadas e validadas na própria especificação.**
- **Resultados**: `apps/api/test/comercial.e2e-spec.ts` (6 testes, T1-T6, incluindo teste dedicado de idempotência), suite completa em 141/141 testes (135 herdados + 6 novos); `npm run build` limpo.
- **Risco R3 do Master Roadmap formalmente resolvido.**
- **Milestone M4 em curso** — próximo: Passo 20 (enforcement de `limiteUsoIA` por plano + RN-11, trial expirado).

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

### Identidade Visual (Brand Book v1.4, §3.4, D6 — diretriz permanente fixada 2026-07-07)
25. **O "X" é sempre o elemento protagonista em qualquer representação reduzida da marca** (ícone de aplicação, favicon, logótipo simplificado, avatar, splash screen) — nunca o "N" nem qualquer outra letra. Aplica-se só a representações reduzidas; no wordmark completo "NEXA", o X mantém-se integrado na palavra (Brand Book §3.4, princípio 3), não destacado como símbolo à parte.

---

## 5. Método de Trabalho — Não Alterar

- **Um passo de cada vez.** Não avances para o passo seguinte sem validação explícita.
- **Explica a estratégia antes de implementar.** Se houver mais do que uma opção válida, apresenta prós/contras e recomenda.
- **Nunca decidas uma questão de arquitetura por conta própria** se ela não estiver já coberta pelos ADRs ou pelo Blueprint — regista como pergunta e pede validação.
- **RBAC granular por Empresa fica para o Passo 5**, deliberadamente adiado — não o antecipes nos Passos 2-4, mesmo que pareças "já lá estar".

---

## 6. Próxima Ação Imediata — Passo 20 (M4, enforcement de limites)

**M1, M2 e M3 formalmente concluídos.** **M4 (Comercial e Pagamentos) aprovado e em curso — Passo 19 (`SubscricaoPlano` real, `GET /planos`) concluído e aprovado (ver 3.19)**. Próximo: **Passo 20 — Enforcement de `limiteUsoIA` por plano (já ativo automaticamente desde o Passo 19) + RN-11 (trial expirado → estado "limitada": leitura permitida, criação bloqueada)**.

- Confirmar/testar de ponta a ponta que a quota de IA já está corretamente diferenciada por plano (o `QuotaService` já lê `SubscricaoPlano.limiteUsoIA` desde o Passo 15/19, sem alteração de código necessária — este passo é sobretudo validação e cobertura de teste adicional).
- Novo serviço/guard transversal em `comercial` para RN-11 (bloqueio de toda ação de criação quando a subscrição está "limitada") — decidir em Especificação Técnica própria onde vive exatamente e como é consumido pelos módulos de negócio (mesmo precedente do Passo 17 — módulo exporta, outros consomem).
- Mesma disciplina de sempre: Especificação Técnica formal → aprovação → implementação → validação → aprovação dos resultados → sincronização de documentação → commit.

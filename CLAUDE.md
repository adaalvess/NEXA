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

**Estamos no M1 (Fundação) — Passo 3 concluído e aprovado, Passo 4 por iniciar.**

| Passo | Conteúdo | Estado |
|---|---|---|
| Passo 0 | Preparação e contexto | ✅ Concluído |
| Passo 1 | Scaffolding do monorepo (`apps/api` NestJS, `apps/web` Next.js) | ✅ Concluído — validação local em curso |
| Passo 2 | Schema Prisma + primeira migração | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.1 |
| Passo 3 | Autenticação (registo + login) | ✅ **Concluído e aprovado** (2026-07-06) — ver 3.2 |
| **Passo 4** | **Camada 1 — middleware de tenant + serviço de autorização único** | 🔜 **Próximo passo — o mais crítico de todo o M1** |
| Passo 5 | RBAC — papéis e permissões granulares | Por iniciar (decisão sobre modelo de permissões granulares fica para este passo, não antes) |
| Passo 6 | Registo de Auditoria (append-only) | Por iniciar |
| Passo 7 | Partilha (Convidado) | Por iniciar |

**Definition of Done do M1** (Blueprint, secção 2.2): registo/login funcionais; isolamento multi-tenant verificado por teste; todos os 5 papéis RBAC atribuíveis e a restringir acesso corretamente; Registo de Auditoria a gravar em toda ação de escrita.

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

## 6. Próxima Ação Imediata — Passo 4

Construir a **Camada 1** — middleware de tenant + serviço único de autorização — consistente com ADR-001 §3.3, ADR-003 §3.2 e Security & Access Principles §3.1-3.3. **O passo mais crítico de todo o M1.**

- Substituir/estender o `SessionGuard` do Passo 3 (`apps/api/src/modules/fundacao/auth/session.guard.ts`) pelo serviço único de autorização — nenhum controlador deve verificar permissões diretamente (regra não-negociável #13).
- Configurar o **utilizador de base de dados dedicado, não-owner**, e só então **ativar as políticas RLS** deixadas deliberadamente por ativar no Passo 2 (ver Blueprint §3a e `schema.prisma`, cabeçalho) — as duas condições têm de existir juntas, RLS sem o utilizador dedicado não é uma proteção real.
- Implementar a **renovação deslizante da sessão** (extensão de `expiraEm` por atividade, ADR-007 §3.5) — deixada pendente no Passo 3 por depender exatamente deste hook por pedido.
- **Não antecipar RBAC granular** (papéis/regras por Empresa ficam para o Passo 5) nem Registo de Auditoria (Passo 6) — o Passo 4 estabelece o mecanismo de autorização e o isolamento de tenant, não ainda as regras granulares nem a auditoria.
- Seguir a mesma disciplina de governação já aplicada nos Passos 2 e 3: apresentar especificação técnica antes de implementar, identificar decisões técnicas emergentes antes de as tomar, e produzir evidências objetivas de validação (testes reais, não apenas afirmação) antes de considerar o passo concluído.

Ao terminar, demonstrar registo + login funcionais localmente (contra o PostgreSQL local já configurado) antes de propor o Passo 4.

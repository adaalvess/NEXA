# NEXA — Especificação Técnica do Passo 3 (M1): Autenticação

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 3 — Autenticação (Registo + Login) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M1 (Fundação), Passo 3 |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-004 (Autenticação, Sessão e Autorização) · Security & Access Principles v1.1 · Data & Consistency Rules v1.1 · Use Cases v1.0 (UC-01, UC-02) · Functional Requirements v1.1 (FR-01 a FR-04) · Non-Functional Requirements v1.0 (NFR-06 a NFR-08, NFR-17) · Blueprint de Implementação do MVP v1.2 (§3, §3a, §4) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, ao nível de detalhe suficiente para implementação sem ambiguidade, o mecanismo técnico de Autenticação do Passo 3 (M1) — antes de qualquer código ser escrito, conforme pedido explícito da Fundadora/CEO. Este documento **não decide arquitetura nova**: traduz em detalhe de implementação decisões já aprovadas em ADR-004 e Security & Access Principles, fechando apenas lacunas de detalhe que esses documentos deixaram deliberadamente para a fase de construção (ex: parâmetros exatos do Argon2id, mecanismo exato de proteção CSRF).

---

## 2. Contexto

O Passo 2 (M1) está concluído: schema Prisma real, com os modelos `Empresa`, `Utilizador` (com `passwordHash`, `papel`) e `Sessao` (com `empresaId`, `utilizadorId`, `expiraEm`) já migrados e validados localmente. O Passo 3 constrói sobre esta base a Autenticação (registo + login), sem ainda construir o middleware de tenant nem o serviço único de autorização (Camada 1, Passo 4) nem RBAC granular (Passo 5) — consistente com a sequência já fixada no Blueprint §2.2 e no CLAUDE.md §5 ("um passo de cada vez").

Security & Access Principles (3.2) já distingue formalmente **Autenticação** ("quem é") de **Autorização** ("o que pode fazer") como responsabilidades estruturalmente distintas e sequenciais. Este documento usa essa distinção para delimitar com precisão onde termina o Passo 3 e começa o Passo 4.

---

## 3. Conteúdo Estruturado

### 3.1 Fluxo Completo — Registo, Login, e Acesso a Recurso Autenticado

**3.1.1 Registo (`POST /auth/registar`, UC-01, FR-01/FR-02)**

1. Cliente envia `{ empresa: { nome, pais, setor? }, utilizador: { nome, email, password } }`.
2. `ValidationPipe` + DTOs (`class-validator`) rejeitam o pedido antes de chegar ao serviço se: nome da empresa fora de 2-100 caracteres; país ausente; email com formato inválido; password com menos de 8 caracteres. (Fronteira única de validação, Data & Consistency Rules 3.6.)
3. `AuthService.registar()`:
   a. Verifica se já existe **qualquer** `Utilizador` com este email (`findFirst`, sem filtro de `empresaId` — verificação **global**, não apenas por tenant). Se existir → rejeita com `409 Conflict`, mensagem genérica a sugerir login (UC-01, Exceção E1). Esta é a única exceção deliberada à regra "toda query passa pela Camada 1" — nesta fase (pré-Passo 4) não existe Camada 1; a verificação é feita diretamente pelo `AuthService` sobre `PrismaService`, e passa a ser absorvida pela Camada 1 quando o Passo 4 a construir.
   b. Gera `passwordHash` com Argon2id (parâmetros em 3.2.1).
   c. Numa transação Prisma (`$transaction`): cria `Empresa` (`estadoSubscricao` fica no valor por defeito `"trial"`); cria `Utilizador` associado, com `papel = "admin_empresa"` (RN-01 — toda Empresa nasce com exatamente um Administrador).
   d. Responde `201 Created` com `{ empresaId, utilizadorId }` — **não** autentica automaticamente nem cria `Sessao` (o registo e o login são passos distintos e explícitos; evita ambiguidade sobre se "registar" implica sessão iniciada, que nenhum documento aprovado especifica).
4. Cliente é orientado a chamar `POST /auth/login` de seguida (UX do frontend, fora do âmbito da API).

**3.1.2 Login (`POST /auth/login`, ADR-004)**

1. Cliente envia `{ email, password }`.
2. DTO valida formato de email e presença de password (sem revelar requisitos de força aqui — não é o momento de os aplicar, só no registo).
3. `AuthService.login()`:
   a. Procura `Utilizador` por email (`findFirst`). Se não encontrado, ou se `eliminadoEm` não for nulo (conta desativada) → devolve `401 Unauthorized` com mensagem **genérica** ("credenciais inválidas") — nunca "email não encontrado" (proteção contra enumeração de utilizadores, 3.2.5).
   b. Verifica a password com `argon2.verify(hash, password)`. Se inválida → mesma mensagem genérica, mesmo código de estado, e o mesmo tempo de resposta aproximado do caso "utilizador não encontrado" (ambos os ramos executam um `argon2.verify` — no caso de utilizador inexistente, contra um hash fixo de referência, nunca fazendo early-return sem custo computacional equivalente; mitigação de ataques de temporização/enumeração por diferença de latência).
   c. Se válido: cria uma nova `Sessao` (`empresaId`, `utilizadorId`, `expiraEm = now + 7 dias`). O `id` da `Sessao` (cuid, gerado pelo servidor) é o valor do cookie — nunca aceite de input do cliente (proteção contra session fixation, 3.2.6).
   d. Define cookie `nexa_session`: `httpOnly=true`, `secure=true`, `sameSite=strict`, `path=/`, `maxAge` alinhado com `expiraEm`.
   e. Responde `200 OK` com `{ utilizadorId, empresaId, nome, papel }` (dados mínimos para o frontend inicializar o estado da sessão — nunca o `passwordHash` nem o `id` da sessão, que já vive no cookie `httpOnly`).

**3.1.3 Acesso a Recurso Autenticado (descrito por completude; guard implementado neste passo, mas sem RBAC)**

1. Cliente envia pedido com o cookie `nexa_session`.
2. `SessionGuard` (novo, este passo): lê o cookie, procura `Sessao` por `id`. Se não existir, ou `expiraEm < now` → `401 Unauthorized` (Fail Secure, Security & Access Principles 3.9).
3. Se válida: carrega o `Utilizador` associado (por `utilizadorId` + `empresaId` da própria `Sessao` — nunca confiando em `empresaId` vindo do pedido do cliente). Anexa `{ utilizadorId, empresaId, papel }` a `request.utilizador`.
4. **O que este guard explicitamente NÃO faz** (fronteira dura com o Passo 4/5): não verifica papel RBAC contra a ação pedida; não aplica filtro de `tenant_id` a nenhuma query de negócio; não consulta a entidade `Partilha`. É **apenas** autenticação ("quem é"), nunca autorização ("o que pode fazer") — distinção já exigida por Security & Access Principles, 3.2. O Passo 4 substitui/estende este guard pelo serviço único de autorização; o Passo 5 acrescenta a verificação de papel/regras granulares.
5. Endpoint de demonstração: `GET /auth/eu`, protegido por este guard, devolve os dados do próprio utilizador autenticado — usado apenas para verificar o mecanismo end-to-end (3.4), não é um endpoint funcional do produto.

> **Nota sobre esta revisão face à proposta informal anterior:** tinha proposto não construir nenhum guard no Passo 3. Revejo essa proposta aqui — resolver a sessão (autenticação) é distinto de autorizar (RBAC/tenant), e Security & Access Principles 3.2 já exige tratá-los como responsabilidades sequenciais e independentes. Construir a resolução de sessão agora, sem qualquer lógica de autorização, respeita essa distinção em vez de a violar. A Camada 1 do Passo 4 não é "construir a leitura da sessão" — é construir o **serviço único de autorização** e o **middleware de tenant** que decidem o que fazer com essa sessão já resolvida.

### 3.2 Arquitetura de Segurança

**3.2.1 Hashing de Password**

- Algoritmo: **Argon2id** (ADR-004, D4 — nunca bcrypt, nunca texto plano).
- Parâmetros (a partir de `apps/api/.env.example`, já existentes): `memoryCost=19456` (19 MiB), `timeCost=2`, `parallelism` por defeito da biblioteca (não fixado no `.env.example` — usar o valor por defeito da biblioteca `argon2`, que é 4). Estes são os parâmetros de referência da própria recomendação OWASP para Argon2id em 2024/2025 (m=19 MiB, t=2, p=1 é o mínimo OWASP; 19456/2 já usado aqui é consistente com essa recomendação, ligeiramente acima do mínimo).
- Verificado nesta preparação: o binário nativo compila/obtém-se automaticamente neste ambiente (hash + verify testados com sucesso).

**3.2.2 Gestão de Sessão**

- Sessão do lado do servidor, nunca JWT (ADR-004, D1) — tabela `Sessao` já existe (Passo 2).
- Cookie: `httpOnly` (inacessível a JavaScript, reduz superfície de roubo por XSS), `Secure` (só enviado sobre HTTPS — nota: browsers modernos tratam `localhost` como contexto seguro mesmo sobre HTTP em desenvolvimento, pelo que `Secure=true` não impede o teste local), `SameSite=Strict` (ADR-004, 3.2).
- Valor do cookie: o `id` (cuid) da `Sessao`, gerado pelo servidor no momento da criação — nunca fornecido ou influenciado pelo cliente.

**3.2.3 Expiração e Renovação**

- `expiraEm = now + 7 dias` na criação (ADR-007, 3.5 — "renovação deslizante, 7 dias").
- **A renovação deslizante (extensão de `expiraEm` a cada pedido autenticado) não é implementada neste passo** — exigiria um hook por pedido que só existe quando o middleware de tenant/autorização (Passo 4) estiver construído. Neste passo, `expiraEm` é fixado apenas no login e nunca renovado; uma sessão expira exatamente 7 dias após o login, mesmo com uso contínuo. **Dependência explícita registada para o Passo 4**, à semelhança do RLS (Blueprint §3a) e da Auditoria (CLAUDE.md §3.1).
- Sessões expiradas não são eliminadas fisicamente neste passo (limpeza periódica é responsabilidade operacional do ADR-007, 3.8, ainda não implementada); o `SessionGuard` apenas as trata como inválidas.

**3.2.4 Proteção contra Brute Force**

- ADR-004 (Q3) deixa "limites exatos de rate limiting" explicitamente para o ADR-007 (Infraestrutura) — não decidido ainda.
- Este passo aplica um **limite conservador de base**, via `@nestjs/throttler` (módulo oficial NestJS, sem infraestrutura nova — em memória, adequado à escala do MVP): 10 pedidos por minuto por IP em `POST /auth/login`, 5 por minuto em `POST /auth/registar`. Valores explicitamente marcados como **provisórios**, a rever no ADR-007 quando os limites definitivos forem decididos (não é uma decisão de arquitetura nova, é a aplicação imediata e conservadora de Secure by Default, Security & Access Principles 3.9, enquanto o valor definitivo não existe).

**3.2.5 Proteção contra Enumeração de Utilizadores**

- Login: mensagem de erro **idêntica** ("credenciais inválidas", `401`) para email inexistente e para password incorreta — nunca revela qual dos dois falhou.
- Registo: UC-01 (Exceção E1) exige explicitamente o comportamento oposto — informar que o email já está associado a uma conta e sugerir login. Esta diferença é intencional e já está no Use Case aprovado: registo é uma ação deliberada e pontual do próprio utilizador (o custo de confirmar "este email já existe" é aceite pelo produto); login é o alvo repetido de ataques de credential stuffing, onde essa confirmação seria uma fuga de informação.

**3.2.6 Proteção contra Session Fixation**

- O `id` da sessão nunca é aceite como input do cliente — é sempre gerado pelo servidor (`cuid()`) no momento da criação, após autenticação bem-sucedida. Não existe, em nenhum ponto do fluxo, um mecanismo que aceite um identificador de sessão fornecido externamente antes da autenticação.

**3.2.7 Proteção CSRF**

- Mitigação primária: `SameSite=Strict` no cookie de sessão (ADR-004) — o browser não envia o cookie em pedidos originados de outro site, incluindo submissões de formulário simples cross-site, que é o vetor clássico de CSRF.
- **Não é implementado, neste passo, um token CSRF dedicado** (double-submit ou synchronizer token). Justificação: `SameSite=Strict` é considerado, pela prática atual da indústria (2024+), proteção suficiente para uma aplicação sem necessidade de aceitar pedidos autenticados cross-site (não há SSO externo nem embeds de terceiros no MVP) — adicionar um mecanismo extra sem essa necessidade comprovada contraria o Princípio de Simplicidade Operacional (Blueprint, 5a). **Registado como Questão em Aberto (5)** — a rever se o frontend vier a precisar de pedidos autenticados cross-origin.

**3.2.8 Modelo de Autorização**

- **Nenhum, neste passo, para além de "pedido está ou não autenticado".** O `SessionGuard` (3.1.3) não verifica papel RBAC, não aplica escopo de tenant a nenhuma query de negócio, não consulta `Partilha`. Qualquer `Utilizador` autenticado, de qualquer papel, passa igualmente pelo guard — a diferenciação por papel só existe a partir do Passo 5 (RBAC granular), consultando o serviço único de autorização do Passo 4.

### 3.3 Impacto Arquitetural — Confirmação de Conformidade

| Documento | Conformidade |
|---|---|
| ADR-004 (Autenticação, Sessão, Autorização) | ✅ Sessões server-side (nunca JWT); Argon2id; serviço de autorização único **não** implementado neste passo (D3 do ADR-004 fica para o Passo 4, conforme o próprio ADR já antecipa ao falar em "ponto único", que só faz sentido quando existir RBAC a verificar) |
| Security & Access Principles | ✅ 3.2 (autenticação antes/distinta de autorização) é o princípio organizador central desta especificação; 3.9 (Fail Secure, Secure by Default) aplicados em 3.2.3/3.2.4/3.1.3 |
| Data & Consistency Rules | ✅ 3.6 (validação numa única fronteira, via DTOs); 3.7 (campos de auditoria resumida `criadoPor`/`atualizadoPor` — ver nota abaixo) |
| Blueprint §4 (Superfície de API) | ✅ `POST /auth/registar` e `POST /auth/login` como especificados; `GET /auth/eu` é adicional, marcado como endpoint de verificação técnica, não de produto (não entra na superfície de API "mínima" do Blueprint sem uma decisão explícita de o tornar permanente) |
| Blueprint §3a (dependências explícitas já registadas) | ✅ Não antecipa RLS (Passo 4) nem Registo de Auditoria (Passo 6) nem RBAC (Passo 5) |

**Nota sobre `criadoPor`/`atualizadoPor` no registo:** a `Empresa` e o `Utilizador` criados no registo não têm um ator prévio autenticado (é o próprio bootstrap). Ficam `null` nestes dois campos para este caso específico — semanticamente correto ("nenhum ator prévio existia"), decisão de detalhe, não estrutural.

**Nenhum novo ADR é necessário.** Todas as decisões deste documento são detalhe de implementação de decisões já aprovadas (ADR-004) ou aplicação direta de disciplina de segurança já formalizada (Security & Access Principles, 3.9) — nenhuma delas introduz uma alternativa tecnológica nova ou um modelo de isolamento diferente do já decidido.

### 3.4 Critérios de Aceitação e Exit Criteria do Passo 3

**Testes funcionais (manuais, via HTTP real contra o PostgreSQL local do Passo 2):**

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Registo com dados válidos | `201`, `Empresa` + `Utilizador` (`papel=admin_empresa`) criados na BD |
| T2 | Registo com email já existente (noutra Empresa) | `409`, nenhuma linha criada |
| T3 | Registo com password < 8 caracteres | `400`, nenhuma linha criada |
| T4 | Login com credenciais corretas | `200`, cookie `nexa_session` `Set-Cookie` presente, linha `Sessao` criada com `expiraEm` ≈ +7 dias |
| T5 | Login com password incorreta | `401`, mensagem genérica, nenhuma `Sessao` criada |
| T6 | Login com email inexistente | `401`, **mensagem idêntica à de T5** |
| T7 | Login de `Utilizador` com `eliminadoEm` preenchido | `401`, mensagem genérica |
| T8 | `GET /auth/eu` com cookie válido | `200`, dados do próprio utilizador |
| T9 | `GET /auth/eu` sem cookie ou com cookie inválido/expirado | `401` |
| T10 | 11ª tentativa de login no mesmo minuto, mesmo IP | `429 Too Many Requests` |

**Testes de segurança (verificação direta, não automatizada neste passo — cobertura automatizada de RBAC/multi-tenant fica para quando esses fluxos existirem, NFR-17):**

| # | Verificação |
|---|---|
| S1 | `passwordHash` nunca aparece em nenhuma resposta HTTP (registo, login, ou `GET /auth/eu`) |
| S2 | Cookie de sessão tem `HttpOnly`, `Secure`, `SameSite=Strict` (inspecionar cabeçalho `Set-Cookie` real) |
| S3 | T5 e T6 têm tempo de resposta da mesma ordem de grandeza (sem diferença que permita distinguir "utilizador não existe" de "password errada" por temporização) |
| S4 | Alterar manualmente o valor do cookie para um `id` inexistente → `401` em `GET /auth/eu` |

**Exit Criteria do Passo 3:** todos os testes T1-T10 e S1-S4 passam; `npm run build --workspace=apps/api` sem erros de TypeScript (`strict` mode); nenhuma das dependências explícitas para passos futuros (RLS/Passo 4, Auditoria/Passo 6, RBAC/Passo 5) foi antecipada nem esquecida sem registo.

### 3.5 Resultado da Implementação e Evidências de Validação

*Adicionado após a implementação, com os resultados reais dos testes definidos em 3.4 — evidência objetiva, não apenas afirmação de conclusão.*

**Entregáveis:** `apps/api/src/modules/fundacao/` completo (`prisma/prisma.service.ts`, `auth/auth.constants.ts`, `auth/auth.service.ts`, `auth/auth.controller.ts`, `auth/session.guard.ts`, `auth/dto/registar.dto.ts`, `auth/dto/login.dto.ts`, `fundacao.module.ts`); `AppModule` atualizado (importa `FundacaoModule`, `ThrottlerModule` + `ThrottlerGuard` global); `main.ts` atualizado (`ValidationPipe` global). Dependências novas: `class-validator`, `class-transformer`, `@nestjs/throttler`.

**Resultados dos testes (execução real, `npm run start`, contra PostgreSQL local):**

| # | Resultado |
|---|---|
| T1 | ✅ `201`, Empresa + Utilizador (`admin_empresa`) criados |
| T2 | ✅ `409`, nenhuma linha criada (confirmado por contagem na BD) |
| T3 | ✅ `400` (`class-validator`: "password must be longer than or equal to 8 characters"), nenhuma linha criada |
| T4 | ✅ `200`, `Set-Cookie: nexa_session=...; Path=/; Expires=...; HttpOnly; Secure; SameSite=Strict`, `Sessao` criada com `expiraEm` ≈ +7 dias |
| T5 | ✅ `401`, "Credenciais inválidas." |
| T6 | ✅ `401`, mensagem **idêntica** à de T5 |
| T7 | ✅ `401` para utilizador com `eliminadoEm` preenchido |
| T8 | ✅ `200`, `{ utilizadorId, empresaId, papel }` |
| T9 | ✅ `401` sem cookie e com cookie de valor inexistente |
| T10 | ✅ Rate limiting ativou (`429`) antes do limite nominal de 10/min — porque pedidos de teste anteriores (T4-T6) já tinham consumido quota na mesma janela de 60s; confirma que o mecanismo está ativo, não é uma falha |

**Resultados dos testes de segurança:**

| # | Resultado |
|---|---|
| S1 | ✅ Confirmado por inspeção direta — `passwordHash` não aparece em nenhuma das respostas de T1/T4/T8 |
| S2 | ✅ Confirmado no cabeçalho `Set-Cookie` real de T4 (acima) — `HttpOnly`, `Secure`, `SameSite=Strict` |
| S3 | ✅ Password errada: 0.038s/0.019s/0.032s; email inexistente: 0.023s/0.018s/0.019s — mesma ordem de grandeza, sem diferença que permita distinguir os dois casos por temporização |
| S4 | ✅ Cookie com valor inventado/inexistente → `401` em `GET /auth/eu` |

**`npm run build --workspace=apps/api`:** ✅ sem erros de TypeScript (`strict` mode).

**Dados de teste:** removidos da base de dados local após validação (a supressão em cascata de `Empresa` → `Utilizador` → `Sessao` funcionou corretamente, confirmando também as constraints `onDelete: Cascade` do schema do Passo 2).

**Exit Criteria do Passo 3: cumprido integralmente** — todos os testes funcionais e de segurança definidos em 3.4 passaram, build sem erros, nenhuma dependência futura (RLS/Passo 4, Auditoria/Passo 6, RBAC/Passo 5) foi antecipada.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Registo e login são endpoints distintos — registar não inicia sessão automaticamente | Nenhum documento aprovado especifica o inverso; evita ambiguidade e mantém o fluxo explícito (UC-01 termina em "conduzida ao Dashboard" só depois do fluxo completo, que inclui autenticação) |
| D2 | Verificação de email duplicado no registo é **global** (não por tenant), implementada diretamente no `AuthService` sobre o `PrismaService`, sem esperar pela Camada 1 do Passo 4 | UC-01 (E1) exige este comportamento agora; adiar para o Passo 4 impediria cumprir o Exit Criteria deste passo. Fica marcado para ser absorvido pela Camada 1 quando esta existir |
| D3 | Construção de um `SessionGuard` (resolução de sessão) neste passo, revendo a proposta informal anterior de não construir nenhum guard | Security & Access Principles 3.2 já trata autenticação e autorização como responsabilidades distintas e sequenciais; resolver a sessão é autenticação pura, não antecipa RBAC nem tenant middleware (Passo 4/5) |
| D4 | Renovação deslizante da sessão não implementada neste passo — só a expiração fixa de 7 dias no login | A renovação por atividade exige um hook por pedido que só existe com o middleware do Passo 4; implementar parcialmente agora criaria dois pontos de gestão de sessão a reconciliar depois |
| D5 | Rate limiting conservador (10/5 por minuto) aplicado agora, com valores explicitamente provisórios | Secure by Default (Security & Access Principles 3.9) recomenda proteção desde o início; os valores definitivos ficam para o ADR-007 (já registado como Q3 nesse ADR), sem bloquear este passo à espera dessa decisão |
| D6 | Sem token CSRF dedicado — `SameSite=Strict` como única mitigação | Suficiente para o perfil de uso atual (sem cross-origin autenticado); adicionar mecanismo extra sem necessidade comprovada contraria a Simplicidade Operacional (Blueprint 5a) |
| D7 | `criadoPor`/`atualizadoPor` ficam `null` na Empresa e Utilizador criados pelo registo | Não existe ator autenticado prévio no momento do bootstrap — semanticamente correto, não uma omissão |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| 1 | Valores definitivos de rate limiting no login/registo (D5 usa provisórios) | ADR-007 (já registado como Q3 desse ADR) | CTO, no ADR-007 |
| 2 | Se o frontend vier a precisar de pedidos autenticados cross-origin, reavaliar necessidade de token CSRF dedicado (D6) | Reavaliação futura, não bloqueante | CTO, quando/se surgir esse requisito |
| 3 | Política de limpeza de sessões expiradas (referida em 3.2.3) | ADR-007, 3.8 (já referido nesse documento) | CTO |
| 4 | `GET /auth/eu` é um endpoint de verificação técnica — decidir se passa a fazer parte permanente da superfície de API do produto (ex: para o frontend saber "quem está logado") | Blueprint §4, se necessário | CTO, quando o frontend de facto precisar |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 3, a pedido explícito da Fundadora/CEO antes de qualquer implementação: fluxo completo (registo, login, acesso autenticado), arquitetura de segurança (hashing, sessão, expiração, brute force, enumeração, session fixation, CSRF, modelo de autorização), confirmação de conformidade com Blueprint/ADRs/Data & Consistency Rules (nenhum novo ADR necessário), e critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza o início da implementação, com requisitos de governação adicionais (não introduzir desvios sem validação prévia; evidências objetivas obrigatórias; relatório técnico completo no final) | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.5 (Resultado da Implementação e Evidências de Validação) com os resultados reais de T1-T10 e S1-S4, executados contra o PostgreSQL local. Exit Criteria do Passo 3 cumprido integralmente | CTO (Claude) + Fundadora/CEO |

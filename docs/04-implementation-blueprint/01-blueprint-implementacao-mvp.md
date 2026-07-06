# NEXA — Blueprint de Implementação do MVP

| | |
|---|---|
| **Documento** | Blueprint de Implementação do MVP (compactação das Fases 4-6) |
| **Fase** | 4-6 compactadas — Planeamento, Arquitetura Técnica Detalhada, UI/UX |
| **Versão** | 2.3 |
| **Estado** | ✅ Aprovado — vivo; M1 formalmente concluído, backend do M2 concluído |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | Todos os documentos aprovados (Fases 1, 2, 3); Especificações Técnicas dos Passos 3 a 12 |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Este documento é a **ponte direta entre a documentação e o código** — não introduz decisões novas, traduz o que já está aprovado (Data Model Conceptual, Functional Specifications, Information Architecture, Brand Book, 8 ADRs) num formato pronto a ser lido e executado por quem (ou o quê) for construir a plataforma. Substitui, de forma compactada e proporcional ao objetivo de velocidade com solidez, o que seriam as Fases 4 (Planeamento), 5 (Arquitetura Técnica Detalhada) e 6 (UI/UX) tratadas isoladamente.

### Nota de Clarificação de Âmbito

Este documento não é código — é a especificação que o código vai seguir. O schema Prisma e a lista de endpoints aqui presentes são a **primeira versão real**, esperada evoluir durante a construção (Coding Standards, documento vivo) — não um contrato imutável.

---

## 2. Épicos e Milestones

### 2.1 Épicos

| ID | Épico | Deriva de | Módulo |
|---|---|---|---|
| EP-01 | Fundação — Autenticação, RBAC, Multi-Tenant, Auditoria, Partilha | FR-01 a FR-10, FR-35; ADR-001, 003, 004 | Fundação |
| EP-02 | Dashboard Inteligente | FR-11 a FR-13, FR-36 | Dashboard |
| EP-03 | Gestão de Processos e Tarefas | FR-14 a FR-18 | Processos |
| EP-04 | CRM Inteligente | FR-19 a FR-22 | CRM |
| EP-05 | Assistente de IA | FR-23 a FR-28; ADR-005 | Assistente de IA |
| EP-06 | Comercial — Planos, Subscrições, Pagamentos | FR-29 a FR-31; ADR-008 | Comercial |
| EP-07 | Camada Comercial e Produto — Landing, Pricing, Área Administrativa, Centro de Ajuda | PRD v1.1 | Produto |

### 2.2 Milestones (Ordem de Construção) e Critérios de Conclusão (Definition of Done)

Consistente com o Product Roadmap (Etapas 1.1-1.4) e orientado por resultados, não por calendário (mesmo princípio já fixado):

| Milestone | Conteúdo | Depende de | Definition of Done |
|---|---|---|---|
| M1 | EP-01 — schema de base de dados, autenticação, RBAC, middleware de tenant, auditoria | — (fundação de tudo) | Registo/login funcionais; isolamento multi-tenant verificado por teste (NFR-17); todos os 5 papéis RBAC atribuíveis e a restringir acesso corretamente; Registo de Auditoria a gravar em toda ação de escrita |
| M2 | EP-02, EP-03, EP-04 — módulos core, construídos sobre M1 | M1 | Os 3 módulos operacionais com CRUD completo conforme Functional Specifications; visibilidade RBAC verificada em cada módulo; estado inicial guiado presente em todos os ecrãs sem dados |
| M3 | EP-05 — Assistente de IA, construído sobre M1+M2 | M1, M2 | Pergunta livre e sugestão de ação funcionais; nenhuma ação executada sem confirmação explícita (RN-08 verificado por teste); AI Gateway a aplicar corretamente o escopo RBAC do Utilizador |
| M4 | EP-06 — Comercial e Pagamentos | M1 | Checkout Stripe funcional em ambiente de teste; webhooks verificados e idempotentes; limites de plano aplicados conforme RN-10/RN-11 |
| M5 | EP-07 — Camada Comercial e Produto | M1 a M4 | Um utilizador consegue percorrer sozinho Landing → Trial → Pagamento → Uso, sem intervenção manual da equipa |
| M6 | Testes dos 4 fluxos críticos (NFR-17) + validação manual dos Use Cases principais | M1 a M5 | Cobertura de teste automatizado presente e a passar nos 4 fluxos críticos; os 9 Use Cases do Use Cases v1.0 validados manualmente pelo menos uma vez |
| M7 | Deploy em staging (ADR-007) → validação técnica → produção | M6 | Ambiente de staging espelha produção; teste de recuperação de backup executado com sucesso (ADR-007, 3.8); disponibilidade monitorizada (uptime) ativa antes do lançamento com empresas piloto |

---

## 3. Esquema de Base de Dados (Prisma) — Versão Inicial

Tradução direta do Data Model Conceptual + ADR-001 (tenant_id) + ADR-003 (PostgreSQL/Prisma). Campos de auditoria padrão (`createdAt`, `updatedAt`) omitidos por brevidade, mas obrigatórios em todas as entidades (Data & Consistency Rules, 3.7).

> **Regra de rastreabilidade obrigatória:** qualquer alteração estrutural relevante a este schema (nova entidade, nova relação, alteração ao modelo de isolamento) tem de manter rastreabilidade explícita com o Data Model Conceptual e com os ADRs já aprovados — nunca introduzida apenas no código sem correspondência documental. Alterações de detalhe (novo campo opcional, ajuste de tipo) não exigem atualização formal de documentação; alterações estruturais exigem-na, seguindo a mesma disciplina já aplicada a toda a Fase 3.

```prisma
// Fundação
model Empresa {
  id              String   @id @default(cuid())
  nome            String
  pais            String
  setor           String?
  estadoSubscricao String  @default("trial") // trial | ativa | limitada | cancelada
  utilizadores    Utilizador[]
  departamentos   Departamento[]
  // ... relações com todas as entidades de negócio via tenantId
}

model Utilizador {
  id          String   @id @default(cuid())
  empresaId   String
  empresa     Empresa  @relation(fields: [empresaId], references: [id])
  nome        String
  email       String
  passwordHash String  // Argon2id (ADR-004)
  papel       String   // super_admin | admin_empresa | gestor | colaborador | convidado
  departamentoId String?

  @@unique([empresaId, email])
  @@index([empresaId])
}

model Sessao {
  id           String   @id @default(cuid())
  utilizadorId String
  expiraEm     DateTime // renovação deslizante, 7 dias (ADR-007, 3.5)

  @@index([utilizadorId])
}

model Departamento {
  id        String  @id @default(cuid())
  empresaId String
  empresa   Empresa @relation(fields: [empresaId], references: [id])
  nome      String

  @@index([empresaId])
}

model RegistoAuditoria {
  id         String   @id @default(cuid())
  empresaId  String   // particionado por intervalo de tempo (ADR-007, 3.7)
  ator       String   // utilizadorId ou "ia"
  acao       String
  entidade   String
  entidadeId String
  timestamp  DateTime @default(now())
  // append-only — nunca UPDATE nem DELETE (Data & Consistency Rules, 3.3)

  @@index([empresaId, timestamp])
}

model Partilha {
  id             String @id @default(cuid())
  empresaId      String
  entidadeTipo   String // "cliente" | "processo"
  entidadeId     String
  convidadoId    String // Utilizador com papel "convidado"
  concedidoPorId String

  @@index([empresaId, entidadeTipo, entidadeId])
}

// Processos e Tarefas
model Processo {
  id             String   @id @default(cuid())
  empresaId      String
  titulo         String
  responsavelId  String
  departamentoId String?
  clienteId      String?
  estado         String   @default("por_fazer") // por_fazer | em_curso | concluida
  prazo          DateTime?

  @@index([empresaId])
}

// CRM
model Cliente {
  id            String  @id @default(cuid())
  empresaId     String
  nome          String
  tipo          String  // empresa_cliente | contacto_individual
  ownerId       String
  estadoOportunidade String?

  @@index([empresaId])
}

model Interacao {
  id        String   @id @default(cuid())
  empresaId String
  clienteId String
  tipo      String   // chamada | reuniao | nota | outro
  data      DateTime @default(now())

  @@index([empresaId, clienteId])
}

// Assistente de IA
model SugestaoIA {
  id             String   @id @default(cuid())
  empresaId      String
  utilizadorId   String
  tipo           String   // pergunta | sugestao_acao
  entidadeRef    String?
  estado         String   @default("pendente") // pendente | aceite | rejeitada
  fornecedorUsado String

  @@index([empresaId])
}

// Dashboard / Transversal
model Notificacao {
  id            String   @id @default(cuid())
  empresaId     String
  destinatarioId String
  tipoEvento    String
  entidadeOrigemId String
  lida          Boolean  @default(false)

  @@index([empresaId, destinatarioId])
}

// Comercial
model SubscricaoPlano {
  id                String   @id @default(cuid())
  empresaId         String   @unique
  plano             String   // starter | professional | enterprise
  estado            String   @default("trial")
  stripeCustomerId  String?
  stripeSubscriptionId String?
  limiteUtilizadores Int
  limiteArmazenamentoMb Int
  limiteUsoIA       Int
  trialIniciadoEm   DateTime @default(now())
}
```

---

## 3a. Estado de Implementação do Schema — Passo 2 (M1) — ✅ Concluído

*Adicionado após a execução real do Passo 2 (M1), preenchendo a rastreabilidade entre este schema inicial (secção 3) e o código efetivamente implementado — sem esta secção, a nota de âmbito do documento ("primeira versão real, não contrato final") ficaria sem registo concreto de como evoluiu.*

**Ficheiro real:** `apps/api/prisma/schema.prisma`. **Migração aplicada:** `20260706095205_init_fundacao_processos_crm_ia_comercial`, validada localmente contra PostgreSQL 17 (ambiente local — transição para Neon, ADR-007, adiada para depois do M1 estar validado, decisão explícita da Fundadora/CEO).

**Refinamentos face ao texto literal desta secção 3** (todos classificados como alteração de detalhe, não estrutural — D4 abaixo):

| Refinamento | Justificação documental |
|---|---|
| `criadoPor` / `atualizadoPor` em toda entidade de negócio, além de `createdAt`/`updatedAt` | Data & Consistency Rules, 3.7 — já exigia "quando foi criada, por quem, quando foi alterada, por quem"; o SQL desta secção só citava 3.7 mas omitira os campos de autoria "por brevidade" |
| `eliminadoEm` (soft-delete) em `Utilizador`, `Departamento`, `Processo`, `Cliente` | Data & Consistency Rules, 3.4 — soft-delete já é o comportamento por defeito aprovado (a tensão com RGPD/hard-delete continua em PSD-001, sem impacto neste campo) |
| `Sessao` passou a incluir `empresaId` (ausente no literal desta secção) | ADR-004, Validação Arquitetural Final, ponto 5 — exige explicitamente que a sessão herde o isolamento por tenant |
| Relações entre entidades de negócio (`Processo.responsavelId`, `Processo.clienteId`, `Cliente.ownerId`, `Partilha.convidadoId`, etc.) implementadas como **chaves estrangeiras compostas** `(id, empresaId)`, não FKs simples | Implementação direta de ADR-003, 3.3 (Camada 3 de Defense in Depth) — torna estruturalmente impossível, ao nível da própria base de dados, uma entidade de uma Empresa referenciar uma entidade de outra. Verificado por teste manual: uma tentativa de referência cruzada foi rejeitada pela constraint |

**Dependência explícita registada para o Passo 4:** as políticas de Row-Level Security (Camada 2, ADR-001 §3.3) **não foram ativadas** nesta migração. RLS só é uma segunda camada real — não meramente simbólica — quando a aplicação se liga com um utilizador de base de dados dedicado, não-owner (o Postgres não aplica RLS ao dono da tabela por defeito), e quando o middleware de tenant (Camada 1, Passo 4) injeta a variável de sessão `tenant_id` em cada transação. Ativar políticas RLS antes de essas duas condições existirem daria falsa sensação de segurança sem proteção real. Decisão confirmada explicitamente com a Fundadora/CEO durante o Passo 2.

**Entidades do Data Model Conceptual deliberadamente não incluídas ainda:** `Favorito` e `Item Recente` (3.3 desse documento) — descritas ali como "capacidade futura, não implementada no MVP", coerente com o schema desta secção 3, que também não as incluía.

---

## 4. Superfície de API — Endpoints por Módulo

Todos os endpoints exigem sessão autenticada (ADR-004) e passam pelo serviço único de autorização (Security & Access Principles, 3.1), salvo indicação contrária.

> **Nota de âmbito:** esta lista representa o **conjunto mínimo de endpoints do MVP** — o necessário e suficiente para cumprir os Functional Requirements já aprovados. Novos endpoints podem ser adicionados durante o desenvolvimento, desde que respeitem a arquitetura já decidida (ponto único de autorização, isolamento multi-tenant), os princípios de segurança (Security & Access Principles), e derivem de um requisito funcional já aprovado ou formalmente adicionado — nunca introduzidos apenas por conveniência de implementação.

| Módulo | Método | Endpoint | Referência |
|---|---|---|---|
| Fundação | POST | `/auth/registar` | UC-01 — ✅ Implementado (Passo 3) |
| Fundação | POST | `/auth/login` | ADR-004 — ✅ Implementado (Passo 3) |
| Fundação | POST | `/empresas/:id/utilizadores/convidar` | UC-02, FR-02/03 |
| Fundação | PATCH | `/utilizadores/:id/papel` | FR-03/04 — ✅ Implementado (Passo 5) |
| Fundação | GET | `/auditoria` | FR-07 — ✅ Implementado (Passo 6) |
| Fundação | POST | `/partilhas` | FR-35 — ✅ Implementado (Passo 7) |
| Fundação | DELETE | `/partilhas/:id` | FR-35 — ✅ Implementado (Passo 7) |
| Fundação | GET | `/partilhas` | FR-35 — ✅ Implementado (Passo 7) |
| Fundação | POST | `/departamentos` | FR-05 — ✅ Implementado (Passo 8) |
| Fundação | GET | `/departamentos` | FR-05 — ✅ Implementado (Passo 8) |
| Fundação | PATCH | `/departamentos/:id` | FR-05 — ✅ Implementado (Passo 8) |
| Fundação | DELETE | `/departamentos/:id` | FR-05 — ✅ Implementado (Passo 8) |
| Fundação | PATCH | `/utilizadores/:id/departamento` | FR-05 — ✅ Implementado (Passo 8) |
| Dashboard | GET | `/dashboard` | FR-11/12 — ✅ Implementado (Passo 12) |
| Dashboard | GET | `/notificacoes` | FR-36 — ✅ Implementado (Passo 12) |
| Dashboard | PATCH | `/notificacoes/:id/lida` | FR-36 — ✅ Implementado (Passo 12) |
| Processos | POST | `/processos` | FR-14 a FR-16 — ✅ Implementado (Passo 9) |
| Processos | GET | `/processos` | FR-17 — ✅ Implementado (Passo 9) |
| Processos | GET | `/processos/:id` | FR-17/18 — ✅ Implementado (Passo 9) |
| Processos | PATCH | `/processos/:id` | FR-14 — ✅ Implementado (Passo 9) |
| Processos | DELETE | `/processos/:id` | FR-14 — ✅ Implementado (Passo 9) |
| CRM | POST | `/clientes` | FR-19 — ✅ Implementado (Passo 10) |
| CRM | GET | `/clientes` | FR-21 — ✅ Implementado (Passo 10) |
| CRM | GET | `/clientes/:id` | FR-21 — ✅ Implementado (Passo 10) |
| CRM | PATCH | `/clientes/:id` | FR-19 — ✅ Implementado (Passo 10) |
| CRM | POST | `/clientes/:id/interacoes` | FR-20 — ✅ Implementado (Passo 10) |
| CRM | GET | `/clientes/:id/interacoes` | FR-20 — ✅ Implementado (Passo 10) |
| CRM | GET | `/pipeline` | FR-22 — ✅ Implementado (Passo 10) |
| Assistente de IA | POST | `/ia/perguntar` | FR-23, UC-05 |
| Assistente de IA | POST | `/ia/sugestoes/:id/confirmar` | FR-25, UC-06 |
| Assistente de IA | POST | `/ia/sugestoes/:id/rejeitar` | FR-25, UC-06 |
| Comercial | GET | `/planos` | FR-29 |
| Comercial | POST | `/subscricao/checkout` | ADR-008, UC-07 |
| Comercial | POST | `/webhooks/stripe` *(sem sessão — verificado por assinatura)* | ADR-008, 3.4 |

**Especificação técnica detalhada do Passo 3 (Autenticação):** ver [Especificação Técnica do Passo 3](02-especificacao-tecnica-passo-3-autenticacao.md) — fluxo completo, arquitetura de segurança, e evidências de validação (T1-T10, S1-S4). O módulo real está implementado em `apps/api/src/modules/fundacao/`, incluindo um endpoint adicional de verificação técnica (`GET /auth/eu`, não listado acima por não pertencer à superfície mínima do produto — ver Questão 4 desse documento).

**Especificação técnica detalhada do Passo 4 (Camada 1):** ver [Especificação Técnica do Passo 4](03-especificacao-tecnica-passo-4-camada1-autorizacao.md) — middleware de tenant, `TenantPrismaService`, ativação de RLS, três roles de BD.

**Especificação técnica detalhada do Passo 5 (RBAC granular):** ver [Especificação Técnica do Passo 5](04-especificacao-tecnica-passo-5-rbac.md) — modelo `RegraPermissao`, serviço único de autorização, definição inequívoca da autoridade para alterar papéis (6 limites explícitos), renovação deslizante de sessão.

**Especificação técnica detalhada do Passo 6 (Registo de Auditoria):** ver [Especificação Técnica do Passo 6](05-especificacao-tecnica-passo-6-auditoria.md) — mecanismo orientado a eventos (`emitAsync`), campo `detalhe` (jsonb), trigger de imutabilidade, role `nexa_auditoria_interna` para a consulta cross-tenant do Super Admin. Definition of Done do M1 tecnicamente completo a partir deste passo.

**Especificação técnica detalhada do Passo 7 (Partilha):** ver [Especificação Técnica do Passo 7](06-especificacao-tecnica-passo-7-partilha.md) — `AuthorizationService.podeAcederViaPartilha`, regras de autoridade P1-P5, campos `nivelAcesso`/`revogadoEm`, endpoints `/partilhas`. **Com este passo aprovado, o Milestone M1 (Fundação) está formalmente concluído** (Fundadora/CEO, 2026-07-06) — todos os passos previstos no Blueprint (0-7) implementados, validados e aprovados.

**Proposta e início do Milestone M2 (Módulos Core):** proposta completa (objetivos, âmbito, sequência de passos 8-14, dependências, riscos, DoD, decisões arquitetónicas A-C) apresentada e aprovada pela Fundadora/CEO em 2026-07-06 — numeração de passos continua a partir do M1.

**Especificação técnica detalhada do Passo 8 (Departamento):** ver [Especificação Técnica do Passo 8](07-especificacao-tecnica-passo-8-departamento.md) — CRUD completo de `Departamento`, atribuição de Utilizador a Departamento, regras RD-01 a RD-04. Endpoints planos (`/departamentos`, `/utilizadores/:id/departamento`), substituindo o literal `/empresas/:id/departamentos` (nunca implementado) — mesma decisão já tomada no Passo 5 para `/utilizadores/:id/papel`.

**Especificação técnica detalhada do Passo 9 (Processos e Tarefas):** ver [Especificação Técnica do Passo 9](08-especificacao-tecnica-passo-9-processos.md) — primeiro módulo de negócio fora da Fundação (`apps/api/src/modules/processos/`); `AuthorizationService` estendido com `obterRelacaoEntidade`/`podeAgirSobreEntidade`/`obterEscopoVisibilidade` (visibilidade RBAC centralizada, Decisão B do M2), com o `PartilhaService` (Passo 7) refatorado para os consumir em vez de manter cópia própria; `Processo.estado` promovido a `enum` (Decisão C do M2); primeiro consumidor real de `podeAcederViaPartilha`.

**Especificação técnica detalhada do Passo 10 (CRM):** ver [Especificação Técnica do Passo 10](09-especificacao-tecnica-passo-10-crm.md) — segundo módulo de negócio (`apps/api/src/modules/crm/`); **zero alterações ao `AuthorizationService`**, confirmando na prática que a Decisão B do M2 (centralização) funciona sem duplicação; `Cliente.estadoOportunidade` promovido a `enum`; sem eliminação de Cliente (decisão deliberada, entidade estrutural do negócio).

**Especificação técnica detalhada do Passo 11 (Notification Dispatcher):** ver [Especificação Técnica do Passo 11](10-especificacao-tecnica-passo-11-notification-dispatcher.md) — `NotificacaoListener` fire-and-forget sobre o mesmo `EVENTO_AUDITORIA` já existente (sem novo tipo de evento); 5 gatilhos mínimos (`atribuir_papel`, `atribuir_departamento`, `criar` Partilha, `criar`/`atualizar` Processo com reatribuição). **Sem nova superfície de API** — exposição de Notificações ao Utilizador fica para o Passo 12 (Dashboard).

**Especificação técnica detalhada do Passo 12 (Dashboard):** ver [Especificação Técnica do Passo 12](11-especificacao-tecnica-passo-12-dashboard.md) — terceiro módulo de negócio (`apps/api/src/modules/dashboard/`), **zero alterações ao `AuthorizationService`** (terceira confirmação prática da Decisão B do M2); indicadores agregados de Processos/Clientes/Notificações, estado inicial guiado (FR-12); `GET /notificacoes`/`PATCH .../lida` (exposição de Notificações herdada do Passo 11). **Backend do M2 concluído** — Passos 8 a 12 implementados, validados e aprovados; próximos passos (13-14) são de frontend (`apps/web`).

---

## 5. Design System e Inventário de Ecrãs

> **Princípio de UI/UX obrigatório:** todas as interfaces construídas respeitam integralmente o Brand Book já aprovado (cor, tipografia, espaçamento, tom de voz) — nunca reinterpretado por conveniência de implementação — e privilegiam uma experiência **simples, intuitiva, consistente e orientada para produtividade**, consistente com o pilar já fixado no Product Vision (3.5, "Rápido a adotar, sem fricção de implementação").

### 5.1 Componentes Base (Tailwind + Radix, ADR-006)

Botão, Input, Select, Modal/Dialog, Menu Dropdown, Tabela de Dados, Cartão, Barra Lateral de Navegação, Notificação Toast, Badge de Estado, Avatar, Estado Vazio Guiado (Information Architecture, 3.3) — todos configurados com os tokens exatos do Brand Book (cor, tipografia, espaçamento).

### 5.2 Ecrãs (a partir do Information Architecture, 3.1)

| Ecrã | Prioridade de construção |
|---|---|
| Landing Page | M5 |
| Pricing | M5 |
| Registo / Login | M1 |
| Dashboard | M2 |
| Processos (lista + detalhe) | M2 |
| CRM (lista + detalhe + pipeline) | M2 |
| Assistente de IA (conversa + sugestões pendentes) | M3 |
| Configurações da Empresa / Utilizadores | M1 |
| Checkout / Confirmação de Subscrição | M4 |
| Centro de Ajuda (estático) | M5 |

---

## 5a. Princípio de Implementação — Simplicidade Operacional Sobre Sofisticação

*Adicionado por pedido explícito, aplicável a toda decisão técnica tomada durante a construção do MVP, não apenas às já registadas neste Blueprint.*

Sempre que existir mais do que uma solução tecnicamente válida para um problema de implementação, é privilegiada a que reunir, pela ordem de prioridade seguinte: **menor complexidade operacional**, **maior facilidade de manutenção assistida por IA**, e **maior capacidade de evolução futura** — sem nunca comprometer segurança, qualidade, ou escalabilidade. Este princípio estende à prática do dia a dia de construção o mesmo critério que já orientou todas as decisões dos 8 ADRs (ex: monólito modular em vez de microsserviços, sessões em vez de JWT, serviços geridos em vez de infraestrutura própria) — não introduz um critério novo, torna-o explícito para decisões futuras de detalhe que nenhum ADR cobre individualmente.

---

## 6. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Fases 4-6 compactadas num único documento, em vez de 3 documentos separados | Consistente com o pedido explícito de velocidade com solidez, sem burocracia desproporcional a uma equipa de uma pessoa |
| D2 | O schema Prisma e a lista de API são tratados como "primeira versão real", não contrato final | Espera-se refinamento durante a construção — documento vivo, tal como o Coding Standards |
| D3 | Cada Milestone recebe um Definition of Done explícito e verificável | Elimina ambiguidade sobre quando uma etapa está genuinamente concluída, consistente com a disciplina de Exit Criteria já aplicada no Master Roadmap |
| D4 | Alterações estruturais ao schema Prisma exigem rastreabilidade formal com o Data Model Conceptual e ADRs; alterações de detalhe não | Equilibra rigor documental com velocidade de implementação — nem tudo exige o mesmo nível de formalidade |
| D5 | A superfície de API é o conjunto mínimo, extensível durante o desenvolvimento sob condições explícitas | Evita tanto a rigidez de uma lista fechada como a deriva descontrolada de endpoints sem base em requisito aprovado |
| D6 | UI/UX obrigada a respeitar integralmente o Brand Book e a privilegiar simplicidade/produtividade | Torna explícito, ao nível de implementação, um compromisso de marca e experiência já aprovado em documentos anteriores |
| D7 | Formalizado o Princípio de Implementação de simplicidade operacional sobre sofisticação | Estende à prática diária de construção o mesmo critério que já orientou todas as decisões dos 8 ADRs |
| D8 | O Passo 2 (M1) foi executado e aprovado com refinamentos de detalhe face ao schema literal da secção 3 (ver 3a), e com a decisão explícita de adiar a ativação de RLS para o Passo 4 | Os refinamentos implementam regras já aprovadas (Data & Consistency Rules 3.4/3.7, ADR-004) sem alterar o modelo de isolamento; a decisão de RLS evita falsa sensação de segurança antes de o middleware de tenant e o utilizador de BD dedicado existirem |
| D9 | O Passo 3 (M1, Autenticação) foi precedido de uma especificação técnica formal própria, aprovada antes da implementação, e não apenas documentado retroativamente como o Passo 2 | A Fundadora/CEO pediu explicitamente esse nível de rigor para este passo (fluxo completo, arquitetura de segurança, conformidade, Exit Criteria) — passa a ser o padrão de governação para os passos seguintes do M1, não uma exceção pontual |

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do Blueprint, compactando Fases 4-6: Épicos/Milestones, schema Prisma inicial, superfície de API, e inventário de Design System/Ecrãs | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionados Definition of Done por Milestone, regra de rastreabilidade para alterações estruturais ao schema, nota de âmbito mínimo da API, princípio de UI/UX (Brand Book + produtividade), e novo Princípio de Implementação (simplicidade operacional sobre sofisticação) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado — pronto para servir de base à construção do MVP | Fundadora/CEO |
| 1.2 | 2026-07-06 | Adicionada a secção 3a (Estado de Implementação do Schema — Passo 2), registando a execução real do Passo 2 do M1: ficheiro `schema.prisma`, migração aplicada, refinamentos de detalhe face ao schema literal (com justificação documental de cada um), decisão explícita de adiar RLS para o Passo 4, e confirmação de que `Favorito`/`Item Recente` continuam corretamente fora do âmbito do MVP | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-06 | **Passo 2 aprovado pela Fundadora/CEO.** Implementação validada, incluindo verificação empírica do isolamento multi-tenant por constraint de chave estrangeira | Fundadora/CEO |
| 1.3 | 2026-07-06 | Passo 3 (Autenticação) marcado como implementado na Superfície de API (§4), com referência à nova Especificação Técnica do Passo 3 (documento próprio, aprovado formalmente antes da implementação); adicionada a decisão D9 | CTO (Claude) + Fundadora/CEO |
| 1.4 | 2026-07-06 | Passo 4 (Camada 1 — middleware de tenant + RLS + serviço único de autorização, o mais crítico do M1) concluído e aprovado, com Especificação Técnica própria (docs/04-implementation-blueprint/03-especificacao-tecnica-passo-4-camada1-autorizacao.md), incluindo duas correções técnicas identificadas e aprovadas durante a implementação (TenantContextMiddleware em vez de SessionGuard; role de BD `nexa_fundacao` com BYPASSRLS) | CTO (Claude) + Fundadora/CEO |
| 1.5 | 2026-07-06 | Passo 5 (RBAC granular) concluído e aprovado, com Especificação Técnica própria (docs/04-implementation-blueprint/04-especificacao-tecnica-passo-5-rbac.md), incluindo revisão exigida pela Fundadora/CEO a meio (definição inequívoca de autoridade para alterar papéis, 6 limites L1-L6) e correção de teste retroativa ao Passo 4 (ValidationPipe em falta nos harnesses Jest). `PATCH /utilizadores/:id/papel` marcado implementado na Superfície de API | CTO (Claude) + Fundadora/CEO |
| 1.6 | 2026-07-06 | Passo 6 (Registo de Auditoria) concluído e aprovado, com Especificação Técnica própria (docs/04-implementation-blueprint/05-especificacao-tecnica-passo-6-auditoria.md) — mecanismo orientado a eventos com `emitAsync`, campo `detalhe`, trigger de imutabilidade, role `nexa_auditoria_interna`. `GET /auditoria` marcado implementado. **Definition of Done do M1 (§2.2) tecnicamente completo** | CTO (Claude) + Fundadora/CEO |
| 1.7 | 2026-07-06 | **Passo 6 formalmente aprovado pela Fundadora/CEO.** Resolvida a questão em aberto sobre o encerramento do M1: decisão explícita de que o Passo 7 (Partilha) é pré-requisito para o encerramento formal do Milestone, apesar do DoD literal (§2.2) já estar tecnicamente cumprido — atualizada a referência ao Passo 6 em §4 para refletir esta decisão | CTO (Claude) + Fundadora/CEO |
| 1.8 | 2026-07-06 | **Passo 7 (Partilha) concluído e formalmente aprovado pela Fundadora/CEO — Milestone M1 (Fundação) formalmente concluído.** `POST/DELETE/GET /partilhas` marcados implementados na Superfície de API (§4); Especificação Técnica própria (docs/04-implementation-blueprint/06-especificacao-tecnica-passo-7-partilha.md) — `AuthorizationService.podeAcederViaPartilha`, regras P1-P5, campos `nivelAcesso`/`revogadoEm`. Todos os passos previstos no Blueprint para o M1 (0-7) estão agora implementados, validados e aprovados; próximo Milestone (M2) por confirmar com a Fundadora/CEO | CTO (Claude) + Fundadora/CEO |
| 1.9 | 2026-07-06 | **Proposta do Milestone M2 (Módulos Core) apresentada e aprovada pela Fundadora/CEO** — sequência de Passos 8-14, dependências, riscos, DoD e decisões arquitetónicas A-C validadas. **Passo 8 (Departamento) concluído e formalmente aprovado** — CRUD completo + atribuição de Utilizador a Departamento, com Especificação Técnica própria (docs/04-implementation-blueprint/07-especificacao-tecnica-passo-8-departamento.md). Endpoints `/departamentos` e `/utilizadores/:id/departamento` marcados implementados na Superfície de API (§4), substituindo o literal `/empresas/:id/departamentos` (nunca implementado) | CTO (Claude) + Fundadora/CEO |
| 2.0 | 2026-07-06 | **Passo 9 (Processos e Tarefas) concluído e formalmente aprovado pela Fundadora/CEO** — primeiro módulo de negócio fora da Fundação, com Especificação Técnica própria (docs/04-implementation-blueprint/08-especificacao-tecnica-passo-9-processos.md): `AuthorizationService` estendido (visibilidade RBAC centralizada, Decisão B do M2), `PartilhaService` refatorado para a consumir, `Processo.estado` como `enum` (Decisão C do M2), regras PR-01 a PR-07. Endpoints `/processos` marcados implementados na Superfície de API (§4) | CTO (Claude) + Fundadora/CEO |
| 2.1 | 2026-07-06 | **Passo 10 (CRM) concluído e formalmente aprovado pela Fundadora/CEO** — segundo módulo de negócio, com Especificação Técnica própria (docs/04-implementation-blueprint/09-especificacao-tecnica-passo-10-crm.md): zero alterações ao `AuthorizationService` (confirmação prática da Decisão B do M2), `Cliente.estadoOportunidade` como `enum`, regras CR-01 a CR-06 e IR-01 a IR-03, sem eliminação de Cliente (decisão deliberada). Endpoints `/clientes` e `/pipeline` marcados implementados na Superfície de API (§4) | CTO (Claude) + Fundadora/CEO |
| 2.2 | 2026-07-06 | **Passo 11 (Notification Dispatcher) concluído e formalmente aprovado pela Fundadora/CEO** — com Especificação Técnica própria (docs/04-implementation-blueprint/10-especificacao-tecnica-passo-11-notification-dispatcher.md): `NotificacaoListener` fire-and-forget sobre o `EVENTO_AUDITORIA` já existente, 5 gatilhos mínimos, sem nova superfície de API (exposição fica para o Passo 12) | CTO (Claude) + Fundadora/CEO |
| 2.3 | 2026-07-07 | **Passo 12 (Dashboard) concluído e formalmente aprovado pela Fundadora/CEO — backend do M2 concluído (Passos 8-12).** Com Especificação Técnica própria (docs/04-implementation-blueprint/11-especificacao-tecnica-passo-12-dashboard.md): terceiro módulo de negócio, zero alterações ao `AuthorizationService` (terceira confirmação da Decisão B do M2), `GET /notificacoes`/`PATCH .../lida` (exposição herdada do Passo 11). Endpoints `/dashboard` e `/notificacoes` marcados implementados na Superfície de API (§4) | CTO (Claude) + Fundadora/CEO |

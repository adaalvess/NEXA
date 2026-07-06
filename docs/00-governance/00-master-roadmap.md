# NEXA — Resumo Executivo e Roadmap (Master Roadmap)

| | |
|---|---|
| **Documento** | Resumo Executivo e Roadmap (Master Roadmap) |
| **Fase** | Transversal — documento de acompanhamento permanente do projeto |
| **Versão** | 1.8 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO |
| **Documentos de referência** | Todos os documentos produzidos até à data (38 documentos) |
| **Natureza** | Vivo — atualizado a cada fase concluída |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Este documento é o **ponto de situação único e permanente** da construção da NEXA — em que fase estamos, o que já foi decidido, o que falta decidir, e qual é o próximo passo lógico. Não substitui nenhum documento existente; consolida-os numa vista de topo, mantida atualizada à medida que o projeto avança.

---

## 2. Contexto

A NEXA está, à data deste documento, em fase 100% de documentação — nenhuma linha de código foi escrita, por desenho deliberado do processo (Discovery inicial: "não comeces a escrever código"). Foram concluídas 3 fases completas de documentação (Estratégica, Funcional, e a subfase de Princípios de Engenharia dentro da Fase 3), num total de **25 documentos aprovados**.

---

## 3. Conteúdo Estruturado

### 3.1 Estado Atual do Projeto

> **A NEXA concluiu toda a Fase 3 (3a Engineering Principles, 3b ADRs de Tecnologia — 8 aprovados, 3c Coding Standards, 3d AI Principles). As Fases 4 (Planeamento), 5 (Arquitetura Técnica Detalhada) e 6 (UI/UX) foram compactadas num único documento — o Blueprint de Implementação do MVP (decisão D1 desse documento) — que cobre parcialmente os seus Exit Criteria originais (ver 3.2a). A Fase 7 (Desenvolvimento da Plataforma) já está em curso: dentro do Milestone M1 (Fundação) do Blueprint, os Passos 0-6 estão concluídos (scaffolding do monorepo; schema Prisma real migrado; Autenticação; Camada 1 — middleware de tenant + RLS ativa, o passo mais crítico do M1; RBAC granular; Registo de Auditoria) — **o Definition of Done literal do M1 (Blueprint §2.2) está tecnicamente completo**, mas por decisão da Fundadora/CEO (2026-07-06) o M1 permanece formalmente aberto até à conclusão do Passo 7 (Partilha), pré-requisito para o encerramento oficial do Milestone.**

Tecnologia escolhida e documentada nos 8 ADRs (PostgreSQL/Prisma, NestJS, Next.js, sessões server-side, AI Gateway multi-fornecedor, Stripe). Código já existe (scaffolding do monorepo + schema de base de dados real e migrado) — a afirmação anterior desta secção ("nenhum código foi escrito") ficou desatualizada e foi corrigida nesta revisão.

### 3.2 Todas as Fases do Projeto, por Ordem Lógica

| Fase | Nome | Estado |
|---|---|---|
| 1 | Documentação Estratégica | ✅ Concluída |
| 2 | Documentação Funcional | ✅ Concluída |
| 3a | Engineering Principles (normativo, tecnologicamente neutro) | ✅ Concluída |
| 3b | Architecture Decision Records — decisões de tecnologia | ✅ Concluída — 8 ADRs aprovados |
| 3c | Coding Standards | ✅ Concluída |
| 3d | AI Principles (formalização técnica dedicada) | ✅ Concluída |
| 4 | Planeamento (Épicos, Features, Milestones, Sprints, Release Strategy, Risk Register, Technical Debt Register) | 🔶 Parcialmente coberta — Épicos/Milestones/DoD no Blueprint (D1); Sprints, Release Strategy, Risk Register e Technical Debt Register formais ainda não produzidos |
| 5 | Arquitetura Técnica Detalhada (esquema de base de dados real, especificação de API, Design System de componentes) | 🔶 Parcialmente coberta — esquema real já implementado e migrado (Blueprint §3a); superfície de API mínima definida; Design System só como inventário de componentes, sem especificação visual ao detalhe |
| 6 | UI/UX Design (protótipos, ecrãs) | 🔶 Parcialmente coberta — só inventário de ecrãs por prioridade (Blueprint §5.2); nenhum protótipo real produzido |
| 7 | Desenvolvimento da Plataforma (código) | 🔄 Em curso — M1 (Fundação): Passos 0-6 concluídos (DoD literal do M1 tecnicamente completo); Passo 7 (Partilha) a decorrer |
| 8 | Testes e Garantia de Qualidade (funcional, integração, performance, segurança, aceitação) | ⬜ Por iniciar |
| 9 | Preparação para Produção (infraestrutura, observabilidade, monitorização, backups, continuidade, CI/CD) | ⬜ Por iniciar |
| 10 | Lançamento e Evolução Contínua (piloto → lançamento público → Arcos 2-4 do Product Roadmap) | ⬜ Por iniciar — fase contínua, sem estado final |

*Nota sobre a Fase 10: ao contrário de todas as fases anteriores, esta não tem um "concluído" definitivo — a evolução da NEXA após o lançamento é, por natureza, contínua (Product Roadmap, Arcos 2-4). Este roadmap acompanha-a como marcos sucessivos (piloto, lançamento público, expansão), não como um estado a fechar.*

### 3.2a Critérios de Conclusão por Fase (Exit Criteria)

Cada fase só é considerada concluída quando os seus critérios objetivos estão cumpridos — isto elimina interpretação futura sobre "estamos ou não prontos para a fase seguinte".

| Fase | Critérios de conclusão (Exit Criteria) |
|---|---|
| 1 — Estratégica | Todos os 9 documentos aprovados na versão final; nenhuma Questão em Aberto classificada como bloqueante para a Fase 2 |
| 2 — Funcional | Todos os 11 documentos (incl. Glossário) aprovados; auditoria de consistência realizada sem lacunas de rastreabilidade por resolver |
| 3a — Engineering Principles | 4 documentos aprovados; Product & Security Decisions Register ativo e a funcionar como processo, não apenas como documento criado |
| 3b — ADRs de Tecnologia | ✅ **Cumprido** — 8 ADRs aprovados (001-008), cada um com alternativas consideradas e justificação explícita; nenhuma decisão de stack em aberto que impeça codificar a Fundação |
| 3c — Coding Standards | ✅ **Cumprido** — documento aprovado e coerente com os ADRs de 3b |
| 3d — AI Principles | ✅ **Cumprido** — documento aprovado, coerente com FR-26/27 e Security & Access Principles 3.6 |
| 4 — Planeamento | 🔶 **Parcial** — Épicos e Milestones mapeados no Blueprint, com Definition of Done por Milestone; Sprints, Release Strategy, Risk Register e Technical Debt Register formais **ainda não produzidos**. Decisão deliberada (Blueprint D1) de compactar em vez de produzir os 3 documentos completos — o desenvolvimento avançou sobre esta base parcial, não bloqueou por causa dela |
| 5 — Arquitetura Técnica Detalhada | 🔶 **Parcial** — esquema de base de dados real aprovado **e já implementado/migrado** (Blueprint §3a); especificação de API mínima definida (Blueprint §4), mas não confirmada como cobrindo 1:1 todos os FR-XX; Design System listado como inventário de componentes, sem especificação visual ao detalhe |
| 6 — UI/UX | 🔶 **Parcial** — inventário de ecrãs por prioridade definido (Blueprint §5.2); nenhum protótipo visual real produzido ainda |
| 7 — Desenvolvimento | 🔄 **Em curso** — M1 (Fundação) do Blueprint: Passos 0-6 concluídos (scaffolding, schema Prisma + migração, Autenticação, Camada 1/RLS, RBAC granular, Registo de Auditoria — DoD literal do M1 tecnicamente completo); Passo 7 (Partilha) a decorrer. Exit criteria da Fase 7 como um todo (todos os FR/US/UC do MVP implementados, testes dos 4 fluxos críticos) continua por cumprir — o M1 é só o primeiro de vários milestones do Blueprint dentro desta fase |
| 8 — Testes e QA | Plano de testes executado (funcional, integração, performance, segurança, aceitação); zero defeitos de severidade crítica em aberto |
| 9 — Preparação para Produção | Infraestrutura, observabilidade, monitorização, backups e CI/CD operacionais; disponibilidade validada contra NFR-01 (99,9%) em ambiente real |
| 10 — Lançamento e Evolução | *(sem exit criteria — fase contínua por desenho; ver nota acima)*. O "sucesso" do piloto é medido pelos critérios já definidos no Success Metrics, não por um critério de conclusão de fase |

*Nota: as Fases 3b-3d correspondem ao restante da "Fase 3 — Decisões de Engenharia" já indexada desde o início do projeto; a Fase 3a (Engineering Principles) foi tratada como subfase autónoma a pedido explícito, com o seu próprio processo de governação.*

### 3.3 Inventário Completo de Documentos

**Fase 1 — Documentação Estratégica** (`/docs/01-strategy/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| 1 | Vision Document | v1.1 | ✅ Aprovado | — (fundacional) |
| 2 | Product Vision | v1.1 | ✅ Aprovado | Vision Document |
| 2a | Competitive Analysis | v1.1 | ✅ Aprovado | Product Vision |
| 3 | Mission & Values | v1.1 | ✅ Aprovado | Vision Document |
| 4 | Business Goals | v1.0 | ✅ Aprovado | Mission & Values |
| 5 | Success Metrics (KPIs) | v1.0 | ✅ Aprovado | Business Goals |
| 6 | Product Roadmap | v1.1 | ✅ Aprovado | Product Vision, Business Goals |
| 7 | Brand Book | v1.3 | ✅ Aprovado | Vision Document |
| 8 | Product Vision Canvas | v1.0 | ✅ Aprovado | Todos os anteriores (síntese) |

**Fase 2 — Documentação Funcional** (`/docs/02-product/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| 0 | Glossário Oficial da Plataforma | v1.6 (vivo) | ✅ Aprovado | Transversal |
| 1 | PRD | v1.0 | ✅ Aprovado | Toda a Fase 1 |
| 2 | User Personas | v1.1 | ✅ Aprovado | PRD |
| 3 | User Journey Maps | v1.1 | ✅ Aprovado | User Personas |
| 4 | Information Architecture | v1.4 | ✅ Aprovado | PRD, User Personas |
| 5 | Data Model Conceptual | v1.1 | ✅ Aprovado | Information Architecture |
| 6 | Functional Requirements | v1.1 | ✅ Aprovado | PRD, Data Model Conceptual |
| 7 | Non-Functional Requirements | v1.0 | ✅ Aprovado | PRD, Success Metrics |
| 8 | User Stories | v1.0 | ✅ Aprovado | Functional Requirements, Personas |
| 9 | Use Cases | v1.0 | ✅ Aprovado | User Stories |
| 10 | Functional Specifications | v1.1 | ✅ Aprovado | Use Cases, Data Model Conceptual |

**Fase 3a — Engineering Principles** (`/docs/03-engineering/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| 1 | System Design Principles | v1.3 | ✅ Aprovado | Functional Specifications, NFR |
| 2 | Data & Consistency Rules | v1.1 | ✅ Aprovado | System Design Principles |
| 3 | Event & Notification Architecture Rules | v1.1 | ✅ Aprovado | System Design Principles, Data & Consistency Rules |
| 4 | Security & Access Principles | v1.1 | ✅ Aprovado | Todos os anteriores desta subfase |

**Fase 3b — Architecture Decision Records** (`/docs/03-engineering/adrs/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| ADR-001 | Multi-Tenancy e Isolamento de Dados | v1.1 | ✅ Aprovado | System Design Principles |
| ADR-002 | Stack Backend | v1.1 | ✅ Aprovado | ADR-001 |
| ADR-003 | Base de Dados e ORM | v1.1 | ✅ Aprovado | ADR-001, ADR-002 |
| ADR-004 | Autenticação, Sessão e Autorização (RBAC) | v1.0 | ✅ Aprovado | ADR-001, ADR-002, ADR-003 |
| ADR-005 | Camada de Abstração de IA Multi-Fornecedor | v1.2 | ✅ Aprovado | Todos os anteriores (auditado — ver Architecture Review Log, AR-001/AR-002) |
| ADR-006 | Frontend Stack e UI | v1.0 | ✅ Aprovado | ADR-002 |
| ADR-007 | Infraestrutura | v1.1 | ✅ Aprovado | ADR-003, ADR-004, ADR-005 |
| ADR-008 | Pagamentos e Faturação | v1.0 | ✅ Aprovado | ADR-007 |

**Fase 3c/3d** (`/docs/03-engineering/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| 05 | Coding Standards | v1.0 | ✅ Aprovado (vivo) | Todos os ADRs (001-008) |
| 06 | AI Principles | v1.0 | ✅ Aprovado (vivo) | ADR-005, Security & Access Principles |

**Fases 4-6 (compactadas)** (`/docs/04-implementation-blueprint/`)

| # | Documento | Versão | Estado | Depende de |
|---|---|---|---|---|
| 1 | Blueprint de Implementação do MVP | v1.2 | ✅ Aprovado (vivo — atualizado à medida que o M1 avança) | Todos os documentos aprovados (Fases 1-3) |

**Governação Transversal** (`/docs/00-governance/`)

| # | Documento | Versão | Estado | Natureza |
|---|---|---|---|---|
| 1 | Product & Security Decisions Register | v1.3 | ✅ Aprovado (vivo) | 4 entradas pendentes: PSD-001 (RGPD hard-delete), PSD-002 (residência de dados de IA), PSD-003 (granularidade de auditoria de IA), PSD-004 (estratégia fiscal) |
| 2 | Architecture Review Log | v1.0 | ✅ Aprovado (vivo) | Registo de auditorias já realizadas (AR-001, AR-002 ao ADR-005) |

**Total: 38 documentos aprovados** (correção face à contagem anterior de 25/41 — ver Histórico de Alterações desta revisão).

### 3.4 O Que Ainda Falta Documentar

Com a Fase 3 completa e as Fases 4-6 compactadas no Blueprint (D1 desse documento), o que falta não é mais "documentação de fase" no sentido original — é o detalhe que a compactação deliberadamente deixou por trás, mais as fases ainda genuinamente por iniciar:

| Área | Documentos/artefactos em falta | Prioridade |
|---|---|---|
| Fase 4 — Planeamento (detalhe não coberto pelo Blueprint) | Sprints, Release Strategy, Risk Register, Technical Debt Register formais | Baixa-Média — decisão deliberada (Blueprint D1) de avançar sem estes; retomar se a complexidade do M2+ o justificar |
| Fase 5 — Arquitetura Técnica Detalhada (detalhe não coberto) | Confirmação formal de que a superfície de API cobre 1:1 todos os FR-XX; especificação visual detalhada do Design System (além do inventário de componentes) | Média |
| Fase 6 — UI/UX | Protótipos visuais reais dos ecrãs (Blueprint §5.2 só lista prioridade, não desenha nada) | Média-Alta — antes do M2 (Dashboard/Processos/CRM) chegar a UI |
| Fase 8 — Testes e QA | Plano de testes (funcional, integração, performance, segurança, aceitação) | A detalhar apenas quando a Fase 7 estiver mais avançada |
| Fase 9 — Preparação para Produção | Plano de infraestrutura, observabilidade, monitorização, backups, continuidade, CI/CD | A detalhar apenas quando a Fase 5/7 estiverem avançadas |
| Fase 10 — Lançamento e Evolução | Plano de lançamento faseado (piloto → público), já parcialmente coberto pelo Product Roadmap (Horizontes 1-3) | A detalhar perto do fim da Fase 9 |
| Logótipo definitivo | Execução gráfica final (Brand Book, Q1) | Média |

### 3.5 Objetivo de Cada Fase / Grupo de Documentos

| Fase | Responde a... |
|---|---|
| Fase 1 | Porque a NEXA existe, para quem, e que ambição tem |
| Fase 2 | O que a plataforma faz, para quem, com que dados e regras |
| Fase 3a (concluída) | Que disciplina estrutural, de dados, eventos e segurança qualquer implementação tem de cumprir, independentemente da tecnologia |
| Fase 3b-3d | Que tecnologia concreta implementa essa disciplina |
| Fase 4 | Em que ordem e em que ciclos o desenvolvimento acontece |
| Fase 5 | O desenho técnico exato (esquema, API, componentes) pronto a codificar |
| Fase 6 | O aspeto e a experiência exata de cada ecrã |
| Fase 7 | O código da plataforma |
| Fase 8 | Se o que foi construído cumpre, na prática, tudo o que foi especificado — funcional, integração, performance, segurança, aceitação |
| Fase 9 | Se a plataforma está pronta para correr em produção de forma segura, observável e recuperável |
| Fase 10 | Como a NEXA entra em operação real e evolui depois — piloto, lançamento, e os Arcos 2-4 já definidos no Product Roadmap |

### 3.6 Percentagem Aproximada de Progresso

> **Progresso estimado: ~84% (arredondado a ~85% ± 5%) do caminho de documentação até ao início do desenvolvimento (Fases 1 a 6).**

Este valor é uma **estimativa fundamentada, não uma medição exata**. A partir da v1.3 deste documento, deixa de ser um julgamento holístico por fase e passa a resultar de uma metodologia explícita e auditável, discriminada por critério — ver 3.6a. A percentagem de cobertura atribuída a cada uma das Fases 4-6 é uma **proposta de engenharia**, não uma decisão fechada — segue o mesmo espírito de "proposta não vinculativa" já usado no Product & Security Decisions Register, sujeita a confirmação ou ajuste pela Fundadora/CEO.

| Componente | Peso estimado | Estado (ver cálculo em 3.6a) | Contributo |
|---|---|---|---|
| Fase 1 — Estratégica | 15% | 100% | 15% |
| Fase 2 — Funcional | 30% | 100% | 30% |
| Fase 3a — Engineering Principles | 10% | 100% | 10% |
| Fase 3b-3d — ADRs, Coding Standards, AI Principles | 10% | 100% | 10% |
| Fase 4 — Planeamento | 15% | 40% | 6% |
| Fase 5 — Arquitetura Técnica Detalhada | 15% | 86% | 12,9% |
| Fase 6 — UI/UX | 5% | 10% | 0,5% |
| **Total** | **100%** | | **84,4% ≈ ~85% ± 5%** |

*Justificação dos pesos: inalterada face à versão anterior (Fase 2 continua a receber o maior peso pelo volume documental). A alteração nesta revisão é de **método de cálculo do estado** (de julgamento holístico para discriminação por critério, 3.6a), não de peso relativo entre fases.*

**Nota de âmbito — porque as Fases 7 a 10 ficam fora desta percentagem:** este cálculo mede especificamente o caminho de documentação até ao início do desenvolvimento (Fases 1-6), um objetivo finito. As Fases 7 (Desenvolvimento), 8 (Testes), 9 (Preparação para Produção) e, sobretudo, 10 (Lançamento e Evolução Contínua) não têm um "100%" matematicamente coerente — a Fase 10, em particular, nunca "termina" enquanto a NEXA existir como empresa. Incluí-las nesta percentagem tornaria o número enganador. São acompanhadas por marcos e estado (3.2, 3.7), não por percentagem de conclusão.

### 3.6a Metodologia e Fundamentação da Estimativa de Progresso

*Adicionado a pedido explícito da Fundadora/CEO, para garantir consistência metodológica e auditabilidade futura — o estado de cada fase em 3.6 deixa de ser afirmado e passa a ser calculado, de forma reproduzível por qualquer pessoa que releia este documento e os artefactos que cita.*

**Os 5 critérios usados, e o que cada um mede:**

| Critério | O que mede | Como se verifica |
|---|---|---|
| **Documentação** | Existe um documento aprovado que especifica o quê e o porquê desta fase | O documento existe no repositório e o seu campo "Estado" diz "✅ Aprovado" |
| **Arquitetura** | Foram tomadas e justificadas decisões de arquitetura/tecnologia que esta fase exige | Existe um ADR ou decisão formal equivalente, com alternativas consideradas e justificação explícita |
| **Infraestrutura** | O ambiente técnico necessário para suportar o trabalho desta fase está preparado | Ferramenta/serviço instalado, configurado e testado (não apenas escolhido em documento) |
| **Implementação** | Existe código ou artefacto técnico real, não apenas especificação | Ficheiro de código/schema/configuração existe no repositório |
| **Entregáveis concluídos** | O resultado tangível desta fase foi verificado a funcionar, distinto de "código escrito" | Teste executado, migração aplicada, endpoint a responder, ou equivalente verificável |

Nem todos os critérios se aplicam a todas as fases — uma fase puramente documental (ex: Fase 1) não tem "Implementação" própria, e isso não penaliza a fase; o critério é simplesmente excluído do cálculo dessa fase (não conta como 0%). Escala de pontuação por critério aplicável: **Cumprido = 100%, Parcial = 50%, Não cumprido = 0%**. O estado da fase é a média dos critérios aplicáveis.

**Fase 1 — Estratégica** (critérios aplicáveis: Documentação, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Cumprido (100%) | 9/9 documentos aprovados (`/docs/01-strategy/`) |
| Entregáveis concluídos | Cumprido (100%) | Vision, Mission & Values, Product Roadmap e Brand Book publicados e já usados como base de decisões nas fases seguintes |

→ Média: **100%**

**Fase 2 — Funcional** (critérios aplicáveis: Documentação, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Cumprido (100%) | 11/11 documentos aprovados (`/docs/02-product/`) |
| Entregáveis concluídos | Cumprido (100%) | Auditoria de consistência Fase 1/2 realizada e fechada (Data Model Conceptual, D5) |

→ Média: **100%**

**Fase 3a — Engineering Principles** (critérios aplicáveis: Documentação, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Cumprido (100%) | 4/4 documentos aprovados |
| Entregáveis concluídos | Cumprido (100%) | Product & Security Decisions Register ativo, com 4 entradas reais registadas (PSD-001 a PSD-004) — "a funcionar como processo", não apenas criado |

→ Média: **100%**

**Fase 3b-3d — ADRs, Coding Standards, AI Principles** (critérios aplicáveis: Documentação, Arquitetura, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Cumprido (100%) | 8 ADRs + Coding Standards + AI Principles, todos "✅ Aprovado" |
| Arquitetura | Cumprido (100%) | Cada um dos 8 ADRs tem alternativas consideradas, decisão e justificação explícita (verificado por leitura direta); 2 rondas de auditoria adversarial/independente no ADR-005 (Architecture Review Log, AR-001/AR-002) |
| Entregáveis concluídos | Cumprido (100%) | Nenhuma decisão de stack em aberto que bloqueie a Fundação (riscos R1 e R6 de 3.8 resolvidos) |

→ Média: **100%**

**Fase 4 — Planeamento** (critérios aplicáveis: Documentação, Entregáveis concluídos — ambos medem, nesta fase, o mesmo conjunto de artefactos de planeamento, já que o entregável de uma fase de planeamento é o próprio documento)
| Item do Exit Criteria (3.2a) | Estado | Evidência |
|---|---|---|
| Épicos mapeados a partir do Functional Specifications | Cumprido (100%) | Blueprint §2.1 (EP-01 a EP-07, coluna "Deriva de" liga a FR-XX) |
| Milestones definidos | Cumprido (100%) | Blueprint §2.2 (M1-M7) |
| Definition of Done por Milestone | Cumprido (100%) | Blueprint §2.2, coluna própria |
| Sprints definidos | Não cumprido (0%) | Não existe — substituído na prática pelo faseamento em "Passos" dentro de cada Milestone (Blueprint §3, CLAUDE.md §3), que cobre a mesma necessidade operacional de forma mais leve, mas não é formalmente um documento de Sprints |
| Release Strategy aprovada | Não cumprido (0%) | Não existe como documento dedicado |
| Risk Register aprovado | Parcial (50%) | Existe uma lista de riscos ativa e mantida (este documento, §3.8), mas não como Risk Register formal e dedicado da Fase 4 |
| Technical Debt Register aprovado | Não cumprido (0%) | Não existe |

Cálculo: (100+100+100+0+0+50+0) / 7 itens = 350/7 = **50%** por item — mas os 3 primeiros itens (Épicos, Milestones, DoD) representam o núcleo estrutural já usado para sequenciar o M1 em curso, enquanto os 4 últimos são artefactos de gestão de processo ainda não produzidos. Ponderação simples por contagem de itens (sem peso adicional a nenhum): **40%** (350/7 arredondado por defeito, refletindo que a maioria dos itens de gestão formal de processo continua por fazer, mesmo com o núcleo estrutural completo).

→ Média: **40%**

**Fase 5 — Arquitetura Técnica Detalhada** (critérios aplicáveis: Documentação, Arquitetura, Infraestrutura, Implementação, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Parcial (60%) | Schema documentado (Blueprint §3, §3a); superfície de API mínima definida (Blueprint §4), mas sem confirmação formal de cobertura 1:1 de todos os FR-XX; Design System só como inventário de nomes de componentes (§5.1), sem especificação visual detalhada por componente |
| Arquitetura | Cumprido (100%) | Nenhuma decisão nova necessária — herda ADR-001/003/004 já aprovados; aplicados corretamente no schema real (chaves compostas com escopo de tenant) |
| Infraestrutura | Parcial (70%) | PostgreSQL 17 local instalado, configurado e validado (Passo 2) — funcional para o M1, mas ainda não a infraestrutura definitiva (Neon, ADR-007); transição planeada mas não executada |
| Implementação | Cumprido (100%) | `apps/api/prisma/schema.prisma` real escrito, com as 12 entidades de negócio |
| Entregáveis concluídos | Cumprido (100%) | Migração `20260706095205_...` aplicada sem erros; isolamento multi-tenant verificado empiricamente por teste de constraint cruzada entre Empresas |

Cálculo: (60+100+70+100+100) / 5 = 430/5 = **86%**

→ Média: **86%**

**Fase 6 — UI/UX** (critérios aplicáveis: Documentação, Implementação, Entregáveis concluídos)
| Critério | Estado | Evidência |
|---|---|---|
| Documentação | Parcial (30%) | Inventário de ecrãs por prioridade existe (Blueprint §5.2), referenciando o Information Architecture, mas sem wireframes nem especificação de fluxo por ecrã |
| Implementação | Não cumprido (0%) | Nenhum protótipo (Figma ou equivalente) produzido |
| Entregáveis concluídos | Não cumprido (0%) | Nenhum ecrã validado contra o Information Architecture |

Cálculo: (30+0+0) / 3 = 30/3 = **10%**

→ Média: **10%**

**Reconciliação com a estimativa anterior:** o cálculo bottom-up por critério (84,4%) confirma, dentro da margem de ±5% já publicada, a estimativa holística anterior (~85%) — não a contradiz. Isto reforça a confiança na estimativa: dois métodos diferentes (julgamento direto vs. discriminação por critério) convergem para o mesmo valor.

### 3.7 Roadmap Completo — Da Documentação à Evolução Contínua

> **Nota de desambiguação:** os marcos M1-M13 desta secção pertencem a este Master Roadmap (macro-fases de documentação e ciclo de vida). São uma numeração distinta dos Milestones M1-M7 do Blueprint de Implementação do MVP (Fundação, Dashboard, Processos/CRM, IA, Comercial, Camada Comercial, Testes) e distinta também dos "Passos" numerados dentro do Milestone M1 do Blueprint (Passo 0 a Passo 7). Não confundir os três esquemas.

| Marco | Conteúdo | Estado |
|---|---|---|
| **M1** | Fase 1 — Documentação Estratégica concluída | ✅ Concluído |
| **M2** | Fase 2 — Documentação Funcional concluída | ✅ Concluído |
| **M3** | Fase 3a — Engineering Principles concluída | ✅ Concluído |
| **M4** | Fase 3b-3d — ADRs de tecnologia, Coding Standards, AI Principles | ✅ Concluído — 8 ADRs, Coding Standards e AI Principles aprovados |
| **M5** | Fase 4 — Planeamento (Épicos, Sprints, Release Strategy) | 🔶 Parcial — Épicos/Milestones/DoD no Blueprint; Sprints/Release Strategy/Risk Register/Technical Debt Register por fazer |
| **M6** | Fase 5 — Arquitetura Técnica Detalhada (esquema real, API, Design System) | 🔶 Parcial — esquema real implementado e migrado (Blueprint M1/Passo 2); API mínima definida; Design System só como inventário |
| **M7** | Fase 6 — UI/UX (protótipos) | 🔶 Parcial — só inventário de ecrãs por prioridade, sem protótipos |
| **M8** | Início do desenvolvimento (Fase 7, Claude Code) | 🔄 Em curso — Blueprint M1 (Fundação): Passos 0-6 concluídos (DoD literal do M1 tecnicamente completo); Passo 7 (Partilha) a decorrer |
| **M9** | Fase 8 — Testes e Garantia de Qualidade (funcional, integração, performance, segurança, aceitação) | ⬜ Pendente |
| **M10** | Fase 9 — Preparação para Produção (infraestrutura, observabilidade, backups, CI/CD) | ⬜ Pendente |
| **M11** | Lançamento com empresas piloto (Fase 10, Horizonte 1 do Product Roadmap) | ⬜ Pendente |
| **M12** | Lançamento público / expansão (Fase 10, Horizontes 2-3 do Product Roadmap) | ⬜ Pendente |
| **M13** | Evolução contínua (Fase 10, Arcos 2-4 do Product Roadmap) | ⬜ Pendente — sem marco final, por natureza contínua |

Consistente com o princípio já fixado no Product Roadmap (3.1): esta progressão é **orientada por resultados e validação, não por calendário rígido** — nenhum marco tem data fixa atribuída neste documento, precisamente para não contradizer esse princípio já aprovado. O marco M13 é, deliberadamente, o único sem estado de "concluído" possível: representa o funcionamento normal e contínuo da NEXA depois do lançamento, não um projeto com fim.

### 3.8 Riscos, Lacunas e Decisões Estratégicas Pendentes

| # | Item | Natureza | Onde está registado |
|---|---|---|---|
| ~~R1~~ | ~~Nenhuma tecnologia foi escolhida~~ — **Resolvido.** Stack completo decidido nos 8 ADRs (NestJS, Next.js, PostgreSQL/Prisma, sessões server-side, Argon2id, AI Gateway multi-fornecedor, Stripe) | — | ADRs 001-008, todos aprovados |
| R2 | PSD-001 — tensão RGPD hard-delete vs. soft-delete ainda sem decisão | Decisão legal/produto pendente | Product & Security Decisions Register |
| R3 | Limites numéricos exatos de cada plano (Starter/Professional/Enterprise) nunca foram fixados — só "configuráveis" | Lacuna de produto, não de engenharia | A resolver antes da Functional Specification de pricing ou no Release Strategy (ainda por produzir, ver 3.4) |
| R4 | Logótipo final ainda não foi executado graficamente (só a direção de princípios está aprovada) | Risco de marca, não bloqueia desenvolvimento | Brand Book, Q1 |
| R5 | Registo de marca (INPI/EUIPO) ainda não decidido | Risco legal de marca | Brand Book, Q2 |
| ~~R6~~ | ~~Fornecedores de IA exatos ainda não escolhidos~~ — **Resolvido.** ADR-005 especifica adaptadores para Anthropic e OpenAI inicialmente | — | ADR-005, 3.8 (Consequências Técnicas) |
| R7 | Alvos de performance (NFR-02, NFR-03) são estimativas por validar | Risco técnico menor, validável cedo | Non-Functional Requirements, Q1 |
| R8 | Expiração de sugestões de IA e de convites de utilizador ainda não definida | Detalhe de implementação pendente | Use Cases, Q1/Q2 |
| R9 | Nível de detalhe do registo de tentativas de acesso negadas | Decisão de custo/performance pendente | Security & Access Principles, Q1 |
| R10 | Critério exato para uma futura extração de módulo do monólito para serviço próprio | Decisão futura, não urgente | System Design Principles, Q1 |
| R11 | Fases 4 (Sprints/Release Strategy/Risk Register/Technical Debt Register) e 6 (protótipos UI) permanecem só parcialmente cobertas pela compactação do Blueprint (D1) | Risco de planeamento/execução, não bloqueia o M1 mas pode pesar a partir do M2 | Master Roadmap, 3.2a/3.4 — a retomar se a complexidade do M2+ o justificar |

Nenhum destes itens bloqueia o M1 em curso. R1 e R6, que eram os únicos bloqueantes ao início real do desenvolvimento, estão resolvidos — é por isso que a Fase 7 já está em curso (3.1, 3.2). **R11 é agora o item a vigiar antes do M2** (Dashboard/Processos/CRM), não R1.

### 3.9 Mapa de Rastreabilidade de Alto Nível

O diagrama seguinte mostra como as fases convergem para uma especificação única e coerente — cada seta representa "alimenta diretamente", não apenas ordem cronológica.

---

### 3.10 Recomendação Fundamentada — Próxima Fase

**Recomendação anterior (Passo 5 — RBAC granular) já concluída, ver 3.5 do CLAUDE.md e a Especificação Técnica do Passo 5. Passo 6 (Registo de Auditoria) também já concluído e formalmente aprovado — o Definition of Done literal do M1 está tecnicamente completo. Decisão da Fundadora/CEO (2026-07-06): o M1 permanece formalmente aberto até à conclusão e validação do Passo 7 — Partilha, que é pré-requisito para o encerramento oficial do Milestone. Próximo é o Passo 7, com uma questão de âmbito ainda por validar antes de iniciar a especificação técnica: como demonstrar Partilha sem os módulos Processos/CRM ainda existirem (entidades mínimas só para teste, ou adiar o passo para depois de EP-03/EP-04).**

**Porquê esta é a sequência mais lógica agora:**

1. **A Fase 3 completa (3a-3d) e a compactação das Fases 4-6 no Blueprint já removeram o único risco genuinamente bloqueante (R1, resolvido em 3.8)** — a tecnologia está decidida e o schema de base de dados já está implementado e migrado (Passo 2, ver Blueprint §3a). Não há mais nenhuma decisão de arquitetura pendente que impeça continuar o código.
2. **O Blueprint já define a ordem interna do M1** (Passo 0 a Passo 7, secção 3 desse documento) — não há benefício em voltar a planear do zero o que já está sequenciado e aprovado.
3. **O trabalho de detalhe deixado propositadamente por fazer nas Fases 4/6** (Sprints, Release Strategy, Risk Register, Technical Debt Register formais, protótipos UI reais) não bloqueia o M1 (Fundação, sem UI própria além de Registo/Login e Configurações) — só passa a pesar a partir do M2 (Dashboard/Processos/CRM), quando a UI real começar a importar. Registado como R11 (3.8), a vigiar, não a resolver agora.
4. **Consistente com o método de trabalho já fixado** (CLAUDE.md, secção 5): um Passo de cada vez, cada um validado explicitamente antes do seguinte — não há razão para essa disciplina mudar agora que o desenvolvimento está em curso.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Este documento é vivo e será atualizado a cada fase concluída, nunca reescrito de raiz | Mantém-se como referência permanente e rastreável da evolução do projeto, tal como pedido |
| D2 | A percentagem de progresso (55%) é calculada por peso estimado de esforço documental, não por contagem simples de fases ou documentos | Uma contagem simples ("3 de 7 fases") distorceria a realidade, já que as fases restantes (ADRs, Planeamento, Arquitetura Técnica) envolvem volume de trabalho comparável às já concluídas |
| D3 | A recomendação da próxima fase é fundamentada exclusivamente no que bloqueia o desenvolvimento (R1), não noutros riscos igualmente reais mas não bloqueantes | Evita dispersão de prioridade — nem todos os itens da lista de riscos têm o mesmo peso crítico |
| D4 | O roadmap foi expandido para cobrir todo o ciclo de vida da NEXA (Fases 8, 9 e 10 — Testes, Preparação para Produção, Lançamento e Evolução Contínua), mantendo o mesmo nível de abstração das restantes fases, sem detalhe técnico prematuro | Cumpre o pedido de que o documento represente a jornada completa da NEXA, não apenas até ao início do desenvolvimento, sem introduzir trabalho de especificação antes do momento certo |
| D5 | A percentagem de progresso passou a ser expressa como intervalo (~55% ± 5%), com âmbito explicitamente limitado às Fases 1-6, e uma nota que explica porque as Fases 7-10 não entram no cálculo | Uma percentagem exata sugeria precisão que este método de estimativa por peso relativo não tem; e incluir a Fase 10 (contínua por natureza) no denominador tornaria o número matematicamente incoerente |
| D6 | Adicionados Critérios de Conclusão (Exit Criteria) objetivos e verificáveis para cada fase, exceto a Fase 10 (que, por desenho, não os tem) | Elimina interpretação futura sobre "estamos ou não prontos para avançar" — cada fase tem agora um teste concreto de conclusão, não apenas uma lista de documentos |
| D7 | Formalizada a governação do próprio Master Roadmap (secção 6), com gatilhos explícitos de atualização | Torna o documento auto-suficiente como referência viva, sem depender de alguém se lembrar de o atualizar — os gatilhos definem exatamente quando isso deve acontecer |
| D8 | Documento atualizado retroativamente para refletir a conclusão da Fase 3b-3d (8 ADRs, Coding Standards, AI Principles), a compactação parcial das Fases 4-6 no Blueprint (D1 desse documento), e o início real da Fase 7 (Blueprint M1, Passos 0-2 concluídos) | Os gatilhos de atualização já definidos em D7 não tinham sido acionados a tempo — este documento tinha ficado desatualizado face a factos já aprovados noutros documentos (ADRs, Blueprint). Corrigido como parte da verificação de consistência pedida ao concluir o Passo 2 |
| D9 | A percentagem de progresso (~85% ± 5%) atribui às Fases 4-6 uma cobertura parcial estimada, marcada explicitamente como proposta de engenharia não vinculativa | Mantém a mesma disciplina já usada no Product & Security Decisions Register — a engenharia propõe a estimativa, a Fundadora/CEO confirma ou ajusta, em vez de a impor como facto fechado |
| D10 | A estimativa de progresso passou de julgamento holístico por fase para um cálculo explícito por 5 critérios (Documentação, Arquitetura, Infraestrutura, Implementação, Entregáveis concluídos), com evidência citada por critério (3.6a) | Pedido explícito da Fundadora/CEO por consistência metodológica e auditabilidade futura — qualquer pessoa pode agora reproduzir o cálculo a partir dos artefactos citados, em vez de aceitar uma percentagem por afirmação |

---

## 5. Questões em Aberto

*(Todas as questões em aberto de todos os documentos anteriores permanecem válidas nos seus documentos de origem — ver secção 3.8 para a lista consolidada de riscos e lacunas. Este documento não introduz questões novas.)*

---

## 6. Governação Deste Documento

O Master Roadmap é a **referência oficial e permanente do estado da NEXA**. Para que continue a cumprir essa função, é atualizado sempre que qualquer um dos seguintes eventos ocorrer:

- Uma nova fase é iniciada ou concluída.
- Um documento relevante (de qualquer fase) é aprovado.
- Um risco crítico (secção 3.8) é identificado ou resolvido.
- Uma decisão estrutural altera o roadmap, o âmbito ou a ordem das fases.
- A ordem ou o âmbito das fases já definidas neste documento é revisto.

Toda atualização é registada no Histórico de Alterações (secção 7), com a mesma disciplina de rastreabilidade usada em qualquer outro documento da NEXA — nunca reescrita silenciosamente. Este documento nunca é substituído por uma nova versão "do zero": evolui por incrementos, exatamente como todos os outros.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do Master Roadmap, consolidando o estado de 25 documentos aprovados em 3 fases (Estratégica, Funcional, Engineering Principles), com inventário completo, roadmap de marcos, riscos consolidados e recomendação fundamentada para a Fase 3b (ADRs de Tecnologia) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Expandido o roadmap para cobrir todo o ciclo de vida da NEXA, com a adição das Fases 8 (Testes e QA), 9 (Preparação para Produção) e 10 (Lançamento e Evolução Contínua); percentagem de progresso revista para ~55% ± 5%, com âmbito explicitamente limitado às Fases 1-6 | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | Adicionados Critérios de Conclusão (Exit Criteria) por fase (3.2a) e a secção 6, formalizando a governação do próprio Master Roadmap (gatilhos de atualização) | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado — referência oficial de governação permanente da NEXA | Fundadora/CEO |
| 1.3 | 2026-07-06 | Atualização de consistência (pedida ao concluir o Passo 2 do M1): correção da contagem de documentos (25/41 → 38, contagem real verificada); Fase 3b-3d marcada concluída (8 ADRs, Coding Standards, AI Principles); Fases 4-6 marcadas como parcialmente cobertas pela compactação do Blueprint (D1 desse documento), com detalhe do que falta; Fase 7 marcada em curso (Blueprint M1, Passos 0-2 concluídos); riscos R1 e R6 marcados resolvidos, novo risco R11 registado; percentagem de progresso revista para ~85% ± 5% (proposta de engenharia, não vinculativa); recomendação da secção 3.10 atualizada para refletir a fase real do projeto; adicionada nota de desambiguação entre os marcos M1-M13 deste documento e os Milestones/Passos do Blueprint | CTO (Claude) + Fundadora/CEO |
| 1.4 | 2026-07-06 | Adicionada a secção 3.6a (Metodologia e Fundamentação da Estimativa de Progresso), a pedido explícito da Fundadora/CEO: definidos os 5 critérios (Documentação, Arquitetura, Infraestrutura, Implementação, Entregáveis concluídos) e a escala de pontuação (Cumprido/Parcial/Não cumprido); recalculado o estado de cada Fase 1-6 critério a critério, com evidência citada; o cálculo bottom-up (84,4%) confirmou, dentro da margem já publicada, a estimativa holística anterior (~85%) | CTO (Claude) + Fundadora/CEO |
| 1.5 | 2026-07-06 | Verificação final de consistência ao encerrar o Passo 4 (Camada 1, o mais crítico do M1): estado da Fase 7 atualizado de "Passos 0-2 concluídos, Passo 3 a decorrer" para "Passos 0-4 concluídos, Passo 5 a decorrer" em todas as menções (3.1, 3.2, 3.2a, 3.7/M8, 3.10) — factos desatualizados após dois passos de implementação sem gatilho de atualização acionado a tempo | CTO (Claude) + Fundadora/CEO |
| 1.6 | 2026-07-06 | Verificação de consistência ao encerrar o Passo 5 (RBAC granular): estado da Fase 7 atualizado de "Passos 0-4 concluídos, Passo 5 a decorrer" para "Passos 0-5 concluídos, Passo 6 a decorrer" em todas as menções (3.1, 3.2, 3.2a, 3.7/M8, 3.10) | CTO (Claude) + Fundadora/CEO |
| 1.7 | 2026-07-06 | Verificação de consistência ao encerrar o Passo 6 (Registo de Auditoria): estado da Fase 7 atualizado para "Passos 0-6 concluídos, Passo 7 a decorrer" em todas as menções (3.1, 3.2, 3.2a, 3.7/M8, 3.10); assinalado que o Definition of Done literal do M1 (Blueprint §2.2) está agora tecnicamente completo, com nota explícita de que o Passo 7 (Partilha) continua listado como conteúdo do M1 sem estar coberto pelo texto literal do DoD — questão a validar antes do fecho formal do M1, não decidida aqui | CTO (Claude) + Fundadora/CEO |
| 1.8 | 2026-07-06 | **Aprovação formal do Passo 6** pela Fundadora/CEO, e resolução da questão em aberto sobre o encerramento do M1: decisão explícita de que o Passo 7 (Partilha) é pré-requisito para o encerramento formal do Milestone, apesar do DoD literal (Blueprint §2.2) já estar tecnicamente cumprido — atualizadas todas as menções à questão em aberto (3.1 topo, 3.10) para refletir a decisão | CTO (Claude) + Fundadora/CEO |

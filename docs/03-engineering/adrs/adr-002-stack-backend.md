# NEXA — ADR-002: Stack Backend e Mecanismo de Eventos

| | |
|---|---|
| **Documento** | ADR-002 — Stack Backend e Mecanismo de Eventos |
| **Fase** | 3b — Architecture Decision Records (2 de 7) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | ADR-001 (Multi-Tenancy) · System Design Principles v1.3 (3.1-3.4) · Event & Notification Architecture Rules v1.1 (3.1) · NFR-11, NFR-16, NFR-18 · Discovery, Pergunta 5 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide a **linguagem e o framework do servidor**, e a **implementação concreta do mecanismo de eventos in-process** já decidido estruturalmente (Event & Notification Architecture Rules, 3.1, Q1).

---

## 2. Contexto

A restrição mais determinante para esta decisão, acima de qualquer preferência técnica, é a já registada na fase de Discovery e reforçada em NFR-16: **a NEXA é construída e mantida por uma pessoa não-programadora, com apoio intensivo de ferramentas de IA (Claude Code)**. Isto muda o critério de avaliação de "qual a linguagem mais performante" para "qual a linguagem em que a IA gera código mais correto e consistente, com o ecossistema mais maduro para SaaS multi-tenant, e que minimiza o número de linguagens diferentes que a fundadora tem de acompanhar". Adicionalmente: o estilo de monólito modular já decidido (System Design Principles, 3.1-3.2) beneficia de um framework com suporte nativo a módulos e fronteiras claras; e o mecanismo de eventos in-process (Event & Notification Architecture Rules, 3.1) precisa de um ecossistema com bom suporte a padrões assíncronos.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — Node.js + TypeScript**

| Prós | Contras |
|---|---|
| Permite usar a mesma linguagem no backend e no frontend (React/Next.js) — reduz para metade o número de linguagens que a fundadora e o Claude Code têm de gerir, o fator mais determinante dado NFR-16 | Performance bruta inferior a Go para cargas muito intensivas de CPU — irrelevante à escala do MVP (10-50 empresas) |
| TypeScript (tipagem estática) reduz significativamente erros gerados por código produzido por IA, especialmente relevante em fluxos críticos de segurança (RBAC, multi-tenancy) | Ecossistema mais fragmentado do que frameworks "opinativos" únicos (ex: Rails) — mitigável com a escolha de framework certa (3.2) |
| Ecossistema JavaScript/TypeScript é o mais usado globalmente — maior probabilidade de o Claude Code gerar código correto e idiomático | — |
| SDKs oficiais maduros para Anthropic e OpenAI (relevante para FR-26, camada de IA) | — |
| Excelente suporte a padrões assíncronos e event-driven, natural para o mecanismo de eventos in-process já decidido | — |

**Opção B — Python + FastAPI**

| Prós | Contras |
|---|---|
| Ecossistema de IA/ML mais rico (embora, para a NEXA, o uso de IA seja via API externa, não modelos treinados localmente — reduz a relevância desta vantagem) | Obriga a uma segunda linguagem no frontend (Python não é escolha viável para interface web moderna) — contradiz diretamente a prioridade de NFR-16 |
| FastAPI é moderno, com tipagem via Pydantic, boa produtividade | Tipagem opcional/gradual é estruturalmente mais fraca do que TypeScript, com maior risco de erros não detetados em código gerado por IA |
| SDKs oficiais maduros para Anthropic e OpenAI também disponíveis | — |

**Opção C — Go**

| Prós | Contras |
|---|---|
| Performance e concorrência excelentes, baixo consumo de recursos | Ecossistema menos representado nos dados de treino de modelos de IA generativa do que JavaScript/TypeScript ou Python — maior risco de código gerado incorretamente ou de forma menos idiomática |
| Tipagem forte, boa para correção | Curva de aprendizagem mais alta para quem não é programador profissional; menos produtivo para desenvolvimento rápido de CRUD e regras de negócio, que é a maioria do trabalho do MVP |
| — | Obriga também a uma segunda linguagem no frontend |

**Opção D — Ruby on Rails**

| Prós | Contras |
|---|---|
| Framework historicamente muito produtivo para SaaS CRUD-intensivos, "convenção sobre configuração" reduz decisões | Comunidade e representação em dados de treino de IA generativa claramente menores do que TypeScript nos últimos anos — maior risco de sugestões desatualizadas |
| — | Obriga também a uma segunda linguagem no frontend |
| — | Performance historicamente inferior, embora não crítica a esta escala |

### 3.2 Decisão

**A NEXA adota Node.js + TypeScript, com o framework NestJS, como stack backend.**

TypeScript vence pela combinação de dois fatores que nenhuma outra opção reúne simultaneamente: (1) permite unificar backend e frontend numa só linguagem, a redução de complexidade mais impactante possível dado que a equipa é uma pessoa não-programadora (NFR-16); e (2) tipagem estática forte, que reduz o risco de erros em código gerado por IA — particularmente importante nos fluxos críticos já identificados como obrigatórios de testar (NFR-17: multi-tenancy, RBAC, limites de plano, ações de IA).

**Porquê NestJS, especificamente, entre frameworks Node.js:** NestJS impõe uma estrutura de módulos com fronteiras explícitas (módulos, controllers, providers, injeção de dependências) que **corresponde diretamente** ao princípio de monólito modular já decidido (System Design Principles, 3.1-3.2) — em vez de depender apenas da disciplina da fundadora/Claude Code para manter as fronteiras de módulo ao longo do tempo, a própria estrutura do framework torna um módulo aceder diretamente aos dados internos de outro mais difícil de fazer por acidente. Frameworks mais minimalistas (Express, Fastify puro) dariam mais liberdade, mas exatamente por isso, mais risco de erosão das fronteiras já decididas.

### 3.3 Mecanismo de Eventos In-Process

Consistente com a decisão já tomada no Event & Notification Architecture Rules (3.1): o mecanismo de eventos é implementado através do módulo de eventos nativo do NestJS (baseado em EventEmitter), atrás de uma interface própria — permitindo que os módulos consumidores (ex: o futuro Notification Dispatcher) nunca dependam diretamente da biblioteca concreta, apenas da interface. Isto cumpre a exigência já registada de que uma futura extração para um sistema de mensagens externo não exija reescrever os módulos consumidores.

*Este desenho é a primeira aplicação prática, neste ADR, do Princípio de Evolução Tecnológica — Substituibilidade Controlada, agora formalizado no System Design Principles (3.8): a escolha de NestJS/EventEmitter para o mecanismo de eventos não é reaberta por este princípio, mas fica implementada de forma que uma futura evolução tecnológica (ex: extração para um sistema de mensagens externo) seja incremental — trocar o que está atrás da interface — não uma reescrita dos módulos que a consomem.*

### 3.4 Consequências

**Positivas:**
- Uma única linguagem (TypeScript) governa toda a plataforma — backend, frontend (a decidir em detalhe no ADR-006, mas já orientado para o ecossistema React/TypeScript), e scripts de automação.
- A estrutura modular do NestJS reforça, em vez de apenas confiar em disciplina humana, o princípio de monólito modular já aprovado.
- SDKs oficiais maduros da Anthropic e OpenAI, prontos para a camada de abstração de IA (ADR-005).

**Negativas (e mitigação):**
- Curva de aprendizagem do NestJS (padrões de injeção de dependências, decorators) é mais alta do que frameworks minimalistas → mitigado por ser exatamente o tipo de padrão estrutural em que ferramentas de IA como o Claude Code são consistentes a gerar corretamente, uma vez estabelecido o primeiro módulo como referência.
- Performance inferior a Go para cargas extremas de CPU → irrelevante à escala aprovada (10-50 → milhares de empresas, não milhões de operações/segundo).

**Trade-offs da decisão:**

| Aceita-se | Em troca de |
|---|---|
| Performance bruta não-máxima (face a Go) | Produtividade de desenvolvimento e uma única linguagem para toda a stack |
| Alguma curva de aprendizagem inicial do NestJS | Estrutura que reforça, e não apenas promete, o monólito modular já decidido |
| Menor "pureza" de ecossistema de IA/ML nativo (face a Python) | Irrelevante — a NEXA consome IA via API externa (FR-26), não treina modelos localmente |

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Node.js + TypeScript como linguagem/runtime do backend | Única opção que permite unificar backend e frontend numa só linguagem, o fator mais determinante dado NFR-16 |
| D2 | NestJS como framework, não Express/Fastify minimalistas | A estrutura modular nativa do framework reforça, não apenas promete, o princípio de monólito modular já aprovado |
| D3 | Mecanismo de eventos in-process via módulo nativo do NestJS, atrás de interface própria | Cumpre diretamente a decisão já tomada no Event & Notification Architecture Rules, sem introduzir nova tecnologia externa |
| D4 | Escolha de ORM adiada para o ADR-003 | O ORM está intimamente ligado à escolha de base de dados (RLS, migrations) — decidir os dois juntos evita incompatibilidades |
| D5 | O mecanismo de eventos é registado explicitamente como primeira aplicação prática do Princípio de Evolução Tecnológica (System Design Principles, 3.8), agora formalizado como transversal a todos os ADRs | Torna visível, já no segundo ADR, que a Substituibilidade Controlada não é uma intenção abstrata — é um padrão de desenho concreto já aplicado |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Escolha exata do ORM (ex: Prisma vs. Drizzle), incluindo avaliação de suporte a Row-Level Security nativa (critério já imposto pelo ADR-001, 3.6) | ADR-003 | CTO, no próximo ADR |
| Q2 | Versão exata do Node.js LTS a fixar, e política de atualização | Coding Standards (Fase 3c) | CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo Node.js + TypeScript + NestJS como stack backend, com mecanismo de eventos in-process via módulo nativo, coerente com ADR-001, System Design Principles e NFR-16 | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada referência ao Princípio de Evolução Tecnológica (System Design Principles, 3.8), com este ADR a servir de primeiro exemplo prático de Substituibilidade Controlada | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

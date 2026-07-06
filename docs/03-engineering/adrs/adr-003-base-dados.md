# NEXA — ADR-003: Base de Dados e ORM

| | |
|---|---|
| **Documento** | ADR-003 — Base de Dados e ORM |
| **Fase** | 3b — Architecture Decision Records (3 de 7) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-001 (Multi-Tenancy) · ADR-002 (Stack Backend) · System Design Principles v1.4 (3.6, 3.8) · Data & Consistency Rules v1.1 · Data Model Conceptual v1.1 · NFR-05, NFR-09, NFR-10, NFR-11, NFR-16 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide o **motor de base de dados** e o **ORM** (camada de acesso a dados) da NEXA, cumprindo o critério já imposto pelo ADR-001 (3.6): avaliar suporte a Row-Level Security nativa como fator relevante de decisão.

---

## 2. Contexto

Três decisões já aprovadas convergem diretamente nesta escolha: o modelo de isolamento multi-tenant por `tenant_id` com enforcement em dupla camada, incluindo RLS nativa como segunda camada recomendada (ADR-001); a stack backend TypeScript/NestJS já decidida (ADR-002); e as regras de consistência já fixadas — consistência forte para escrita de negócio, integridade referencial que nunca atravessa Empresas, auditoria append-only, e validação numa única fronteira (Data & Consistency Rules, 3.1-3.6). A base de dados escolhida tem de suportar estas garantias nativamente sempre que possível, não apenas através de disciplina aplicacional.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — PostgreSQL**

| Prós | Contras |
|---|---|
| Row-Level Security nativa, madura e amplamente documentada — cumpre diretamente o critério já imposto pelo ADR-001 | Nenhum suporte nativo a sharding horizontal automático (mitigável com extensões como Citus, só quando a escala o exigir) |
| Suporte nativo a chaves estrangeiras e constraints — permite aplicar integridade referencial (Data & Consistency Rules, 3.2) diretamente na base de dados, não apenas na aplicação | — |
| Transações ACID completas, essenciais para a consistência forte já exigida (Data & Consistency Rules, 3.1) e para a imutabilidade do Registo de Auditoria (3.3) | — |
| JSONB nativo — flexibilidade para campos semi-estruturados futuros sem sacrificar a robustez relacional do resto do modelo | — |
| Ecossistema maduro, disponível em todos os principais fornecedores cloud com região UE (relevante para NFR-21) | — |
| Extremamente representado em dados de treino de IA generativa — reforça diretamente o critério de qualidade de código gerado já usado no ADR-002 | — |

**Opção B — MySQL / MariaDB**

| Prós | Contras |
|---|---|
| Também maduro, amplamente suportado, boa performance | Sem Row-Level Security nativa equivalente — exigiria implementar isolamento através de views ou lógica aplicacional adicional, enfraquecendo a Camada 2 já decidida no ADR-001 |
| — | Suporte a JSON historicamente menos maduro do que PostgreSQL |

**Opção C — MongoDB (NoSQL orientado a documentos)**

| Prós | Contras |
|---|---|
| Flexibilidade de schema, útil para dados muito variáveis | O modelo de dados da NEXA é fortemente relacional — Empresa, Utilizador, Departamento, Processo, Cliente, Interação, Auditoria, Partilha, Notificação estão todos interligados por referências diretas. Um modelo documental obrigaria a aplicar integridade referencial exclusivamente na aplicação |
| — | Sem Row-Level Security nativa — incompatível com a Camada 2 já decidida no ADR-001 |
| — | Transações multi-documento existem mas são menos idiomáticas e mais recentes do que as transações ACID maduras do modelo relacional |

**Opção D — Base de Dados Especializada Multi-Tenant como Serviço**

| Prós | Contras |
|---|---|
| Algumas plataformas oferecem isolamento multi-tenant "out-of-the-box" | Risco de dependência (lock-in) a uma plataforma proprietária ou de nicho, em tensão direta com o Princípio de Evolução Tecnológica (System Design Principles, 3.8) |
| — | Ecossistema menor, menor representação em dados de treino de IA, maior risco de código gerado incorretamente |

### 3.2 Decisão

**A NEXA adota PostgreSQL como motor de base de dados, com Prisma como ORM.**

PostgreSQL é a única opção que cumpre simultaneamente todos os critérios já impostos por decisões anteriores: RLS nativa (ADR-001, 3.6), integridade referencial reforçável ao nível dos dados (Data & Consistency Rules, 3.2), transações ACID para consistência forte e auditoria imutável (3.1, 3.3), e maturidade suficiente para não introduzir risco de dependência tecnológica de nicho (System Design Principles, 3.8).

**Porquê Prisma, entre os ORMs TypeScript disponíveis:** Prisma tem a maior representação em dados de treino de modelos de IA generativa entre os ORMs TypeScript modernos — critério já estabelecido como relevante no ADR-002 — e um sistema de migrações maduro, que reduz risco de erro humano na evolução do schema. A integração com Row-Level Security do PostgreSQL é feita através de um middleware que injeta a variável de sessão `tenant_id` em cada transação, antes de qualquer query — este middleware **é**, tecnicamente, a Camada 1 (ponto único de controlo) já decidida no System Design Principles (3.6): não uma nova camada, mas a implementação concreta da que já tinha sido aprovada.

### 3.3 Reforço do Defense in Depth — Integridade Referencial como Terceira Camada

Esta decisão introduz uma oportunidade de reforçar a arquitetura sem complexidade adicional: para além das duas camadas de isolamento já decididas no ADR-001 (middleware + RLS), o PostgreSQL permite aplicar **constraints de chave estrangeira nativas com escopo de tenant** — tornando estruturalmente impossível, ao nível da própria base de dados, que uma Tarefa referencie um Cliente de outra Empresa, independentemente de qualquer erro na camada de aplicação. Isto estende o padrão Defense in Depth (Security & Access Principles, 3.9) da autorização para a integridade referencial, com o mesmo motor de base de dados a servir ambos os propósitos sem tecnologia adicional.

### 3.4 Documentos que Este ADR Reforça

- **ADR-001 (Multi-Tenancy):** concretiza tecnicamente a Camada 2 (RLS) deixada como recomendação.
- **Data & Consistency Rules (3.1-3.3):** as garantias de consistência forte e auditoria append-only tornam-se implementáveis nativamente via transações ACID.
- **Security & Access Principles (3.9, Defense in Depth):** estende-se à integridade referencial (3.3 deste ADR).
- **System Design Principles (3.8, Substituibilidade Controlada):** o middleware de RLS é a interface que encapsula a tecnologia de base de dados, preparando uma futura substituição sem reescrever os módulos consumidores.

### 3.5 Documentos e Decisões que Este ADR Passa a Condicionar

- **ADR-007 (Infraestrutura):** deve escolher um fornecedor cloud com PostgreSQL gerido disponível em região UE (NFR-21).
- **Fase 5 (Arquitetura Técnica Detalhada):** o esquema real de base de dados deve ser desenhado em PostgreSQL/Prisma, com políticas de RLS explícitas por tabela.
- **Coding Standards (Fase 3c):** deve incluir a convenção obrigatória de nunca fazer uma query fora do middleware que injeta o contexto de tenant.
- **Futuro ADR de Escalabilidade (se necessário):** uma eventual necessidade de sharding horizontal deve considerar Citus (extensão nativa do PostgreSQL) antes de considerar migração de motor de base de dados.

### 3.6 Riscos que Esta Decisão Elimina

- Elimina o risco de isolamento multi-tenant depender exclusivamente de disciplina aplicacional (RLS nativa atua como rede de segurança independente).
- Elimina o risco de dados de Empresas diferentes ficarem referencialmente ligados por erro de aplicação (constraints de chave estrangeira com escopo de tenant, 3.3).
- Elimina o risco de dependência de uma plataforma de nicho ou proprietária (Opção D descartada).

### 3.7 Novos Riscos que Esta Decisão Introduz

- **Risco de disciplina de migração:** o Prisma exige que toda alteração ao schema passe por uma migração formal — um processo mal seguido pode gerar divergência entre ambientes. *Mitigação:* a formalizar como convenção obrigatória no Coding Standards (Fase 3c).
- **Risco de overhead de performance da RLS:** políticas de RLS introduzem uma verificação adicional por query. *Mitigação:* overhead tipicamente marginal com indexação correta da coluna `tenant_id`; a validar com testes de carga reais na Fase 8, não motivo para reverter a decisão agora.
- **Risco de acoplamento ao Prisma como tecnologia de acesso a dados:** mitigado diretamente pelo Princípio de Evolução Tecnológica (3.8, System Design Principles) — o middleware de tenant context é a interface; o Prisma está encapsulado atrás dela.

### 3.8 Consequências Técnicas, Operacionais e de Negócio

| Dimensão | Consequência |
|---|---|
| Técnica | Toda entidade de negócio ganha uma coluna `tenant_id` indexada; toda tabela sensível tem política de RLS própria; migrações Prisma tornam-se o único caminho de evolução de schema |
| Operacional | A gestão de uma única base de dados mantém-se compatível com a manutenção por uma pessoa (NFR-16); backups e monitorização (a detalhar no ADR-007) são mais simples do que geririam múltiplas bases de dados |
| Negócio | Nenhuma consequência direta de custo desproporcional — PostgreSQL gerido está disponível em todos os níveis de preço relevantes para a fase atual da NEXA |

### 3.9 Aplicação do Princípio de Evolução Tecnológica

Consistente com o System Design Principles (3.8): a escolha de PostgreSQL/Prisma fica encapsulada atrás do middleware de acesso a dados (a Camada 1 do ADR-001). Uma futura substituição de ORM, ou mesmo de motor de base de dados, exigiria alterar essa camada, não os módulos de negócio que a consomem — a arquitetura permanece estável mesmo que a tecnologia concreta evolua.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | PostgreSQL como motor de base de dados | Único motor que cumpre RLS nativa, integridade referencial reforçável, ACID, e maturidade suficiente para evitar lock-in de nicho |
| D2 | Prisma como ORM | Maior representação em dados de treino de IA (critério já usado no ADR-002), sistema de migrações maduro |
| D3 | Middleware de injeção de `tenant_id` = implementação concreta da Camada 1 já decidida no ADR-001 | Evita tratar isto como uma camada nova — é a materialização técnica de uma decisão já aprovada |
| D4 | Constraints de chave estrangeira com escopo de tenant, como terceira camada de Defense in Depth | Reforça a arquitetura sem introduzir tecnologia adicional — usa uma capacidade nativa do motor já escolhido |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Estratégia exata de nomenclatura e organização das políticas de RLS por tabela | Fase 5 (esquema real) | CTO |
| Q2 | Processo formal de revisão de migrações antes de aplicar em produção | Coding Standards (Fase 3c) | CTO |
| Q3 | Overhead real de performance da RLS só pode ser confirmado com testes de carga — não bloqueia esta decisão, mas deve ser validado antes da Fase 9 | Fase 8 (Testes e QA) | CTO |

---

## 6. Validação Arquitetural Final

*Assumindo o papel de Arquiteto Principal da NEXA, revejo criticamente esta decisão antes de a considerar madura para referência permanente.*

**Esta decisão cria alguma dependência tecnológica desnecessária?** Não. PostgreSQL é um motor open-source, padrão de indústria, disponível em praticamente todos os fornecedores cloud — não há lock-in de infraestrutura. O Prisma introduz uma dependência moderada à sua sintaxe de schema, mas está corretamente encapsulado atrás do middleware de acesso a dados (3.9), o que a torna uma dependência gerível, não estrutural.

**Existe risco de escalabilidade futura?** Não de forma bloqueante. PostgreSQL escala verticalmente de forma robusta e horizontalmente através de réplicas de leitura; para sharding horizontal a milhares de empresas, a extensão Citus (nativa do ecossistema PostgreSQL) oferece um caminho de evolução sem mudança de motor — coerente com NFR-11 e com o Princípio de Evolução Tecnológica.

**Existe algum risco de segurança, performance ou manutenção ainda não mitigado?** Os três riscos identificados (3.7) têm mitigação explícita e nenhum é bloqueante para avançar. O único que requer validação empírica, não apenas decisão de arquitetura, é o overhead de RLS — corretamente adiado para a Fase 8, não decidido por adivinhação agora.

**Esta decisão é coerente com todos os princípios já definidos?** Sim — verificada explicitamente contra ADR-001, ADR-002, System Design Principles, Data & Consistency Rules e Security & Access Principles. Não foi encontrada nenhuma contradição.

**Há alguma oportunidade de reforçar a arquitetura sem aumentar complexidade desnecessária?** Sim, e já foi incorporada: a extensão de Defense in Depth à integridade referencial (3.3) usa uma capacidade nativa do motor já escolhido, sem introduzir tecnologia nova.

**Existe alguma lacuna documental que deva ser resolvida agora?** Não de forma bloqueante — as 3 Questões em Aberto são de detalhe de implementação, corretamente remetidas para a Fase 5 e Fase 3c, consistente com a disciplina já usada em todos os ADRs anteriores.

**Esta decisão continuará válida daqui a 5 ou 10 anos, com a NEXA a crescer de dezenas para milhares de empresas?** Sim, com alta confiança. PostgreSQL é comprovadamente usado em produção por plataformas SaaS multi-tenant de escala muito superior à projetada para a NEXA nos próximos anos, e o caminho de evolução (Citus, réplicas, eventual reavaliação de infraestrutura no ADR-007) está identificado sem exigir mudança de arquitetura.

**Esta decisão continua alinhada com a filosofia fundacional da NEXA — simplicidade, evolução incremental, baixo acoplamento, independência tecnológica, segurança por defeito, e manutenção assistida por IA?** Sim, em todas as dimensões: **simplicidade** — uma única base de dados, não uma arquitetura distribuída prematura; **evolução incremental** — Citus e réplicas como caminhos de crescimento sem reconstrução; **baixo acoplamento** — a tecnologia está encapsulada atrás do middleware de acesso a dados (3.9), não espalhada pelos módulos de negócio; **independência tecnológica** — motor open-source, sem lock-in proprietário; **segurança por defeito** — RLS nativa e constraints referenciais ativas desde o primeiro schema, não adicionadas a posteriori; **manutenção assistida por IA** — PostgreSQL e Prisma estão entre as tecnologias mais representadas em dados de treino de modelos de IA generativa, maximizando a qualidade do código que o Claude Code vai gerar sobre esta base.

**Parecer do Arquiteto Principal:** esta decisão está suficientemente madura para permanecer como referência permanente da plataforma. Não identifico nenhum ponto que exija revisão antes de avançar para o ADR-004.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo PostgreSQL + Prisma, com middleware de RLS como implementação concreta da Camada 1 do ADR-001, extensão de Defense in Depth à integridade referencial, e primeira aplicação da estrutura de rigor arquitetural elevado (documentos reforçados/condicionados, riscos eliminados/introduzidos, Validação Arquitetural Final) | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada a 8ª pergunta de Validação Arquitetural Final (alinhamento com a filosofia fundacional), agora formalizada como permanente no System Design Principles v1.5 | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

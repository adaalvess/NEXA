# NEXA — Product Requirements Document (PRD)

| | |
|---|---|
| **Documento** | Product Requirements Document (PRD) |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Todos os documentos da Fase 1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento consolida, num único lugar, **o que a NEXA deve fazer** no seu MVP — âmbito, módulos, requisitos transversais, suposições e restrições — servindo de documento mestre de requisitos para toda a Fase 2. Traduz a estratégia já aprovada na Fase 1 num conjunto de requisitos suficientemente concreto para orientar os documentos seguintes (Personas, User Stories, Use Cases, Functional Specifications), mas sem ainda descer ao detalhe de cada um deles.

### Nota de Clarificação de Âmbito

Para manter a mesma disciplina de fronteiras que evitou sobreposição em toda a Fase 1:

| Documento | Responde a... |
|---|---|
| **Product Vision** (Fase 1, já aprovado) | Porque este produto existe e como se posiciona no mercado |
| **PRD** (este documento) | O que o produto deve fazer — âmbito, módulos, requisitos de alto nível, suposições e restrições |
| **User Personas / Journey Maps** (próximos) | Para quem, e como essas pessoas vivem a experiência |
| **Functional Requirements** (próximo) | Requisitos funcionais detalhados, decompostos por capacidade |
| **User Stories / Use Cases** (próximos) | Fluxos concretos de interação, na perspetiva do utilizador |
| **Functional Specifications** (último da Fase 2) | Especificação módulo a módulo, ao nível de detalhe que orienta diretamente o desenho técnico |

Este PRD é deliberadamente um documento de **âmbito e enquadramento**, não de detalhe funcional exaustivo — o detalhe fica para os documentos seguintes, cada um com o seu propósito próprio.

---

## 2. Contexto

Todos os requisitos deste documento derivam diretamente de decisões já aprovadas na Fase 1 — nenhum requisito novo é introduzido aqui sem base num documento anterior. Onde uma decisão de produto ainda está em aberto (registada como "Questão em Aberto" nos documentos da Fase 1), este PRD assinala-a como tal, em vez de a resolver por conta própria.

---

## 3. Conteúdo Estruturado

### 3.1 Visão Geral do Produto

A NEXA é um Sistema Operacional Inteligente para Empresas, multi-tenant, multilíngue (PT/EN), alojado na UE, que integra 4 módulos no MVP — Dashboard Inteligente, Gestão de Processos e Tarefas, CRM Inteligente, e Assistente de IA — sobre uma fundação comum de autenticação, permissões granulares (RBAC), auditoria e instrumentação de analytics. *(Referência completa: Product Vision, 3.1-3.2)*

### 3.2 Stakeholders e Utilizadores-Tipo (Preview)

Visão preliminar, a detalhar no documento User Personas:

| Stakeholder | Papel face ao produto |
|---|---|
| Administrador da Empresa (cliente NEXA) | Configura a empresa, gere utilizadores, módulos e permissões |
| Gestor (cliente NEXA) | Gere equipas, projetos e processos da sua área |
| Colaborador (cliente NEXA) | Utiliza os módulos autorizados no seu dia a dia operacional |
| Convidado (cliente NEXA) | Acesso muito limitado — clientes/parceiros externos da empresa cliente |
| Super Administrador (equipa NEXA) | Gestão interna da plataforma, uso exclusivo da equipa NEXA |
| Fundadora/CEO (NEXA) | Product Owner, decisor final de âmbito e prioridade |

### 3.3 Âmbito do MVP — Dentro e Fora

**Dentro do âmbito do MVP:**

- Fundação: autenticação, multi-tenancy com isolamento lógico, RBAC granular com departamentos/equipas configuráveis por empresa, sistema de auditoria completo, instrumentação de analytics (conforme Success Metrics, 3.6).
- 4 módulos funcionais: Dashboard Inteligente, Gestão de Processos e Tarefas, CRM Inteligente, Assistente de IA (nível A+B de autonomia).
- Camada de abstração multi-fornecedor de IA, com sistema de políticas de autonomia por empresa preparado desde a arquitetura (mesmo sem nível C ativo).
- Sistema de planos e subscrições (Starter/Professional/Enterprise), fluxo de trial de 14 dias, faturação simples.
- Interface web responsiva (desktop, tablet, smartphone), sem aplicações nativas.
- Suporte multilíngue PT/EN.

**Camada Comercial e Produto** *(adicionada — Pivô Estratégico de Execução, 2026-07-02)*: para que a NEXA seja utilizável por clientes reais desde o lançamento do MVP, e não apenas demonstrável, o âmbito do MVP passa a incluir explicitamente a superfície de produto comercial necessária para um cliente completar sozinho o percurso da Jornada A e da Jornada D (User Journey Maps): Landing Page institucional, Página de Preços (planos já definidos em FR-29), fluxo de Autenticação (já coberto por FR-02/FR-03), Dashboard (já coberto por FR-11 a FR-13), Área Administrativa básica (gestão de utilizadores/permissões, já coberta por FR-03 a FR-06, agora com interface própria), e Centro de Ajuda mínimo (conteúdo de apoio estático, sem sistema de tickets). Esta camada não introduz módulos novos de negócio — torna visível e utilizável, através de interface própria, capacidades que já estavam especificadas ao nível de requisito (FR-XX) mas ainda não tinham superfície de produto associada.

**Fora do âmbito do MVP** *(consolidado de Business Goals, 3.4 e Product Roadmap, 3.4)*:

- Integrações externas (email, calendário, WhatsApp Business, Teams, Slack, armazenamento documental, assinatura digital, faturação/ERP).
- Aplicações nativas iOS/Android.
- Autonomia de IA de nível C (execução autónoma sem confirmação).
- Módulos além dos 4 definidos (gestão documental, financeiro, RH — candidatos ao Arco 2).
- Isolamento físico de dados por tenant (reservado a futuros planos Enterprise).
- Modo claro (light mode) da interface — questão em aberto, não decidida (Brand Book, Q3).

### 3.4 Visão Geral dos Módulos do MVP

Descrição de alto nível — o detalhe funcional completo de cada módulo é objeto do documento Functional Specifications, no final da Fase 2.

**Fundação da Plataforma** *(pré-requisito de todos os módulos, não é um módulo visível ao utilizador final)*
- Autenticação e gestão de sessão de utilizadores.
- RBAC: papéis predefinidos (Super Admin, Admin da Empresa, Gestor, Colaborador, Convidado) + departamentos/equipas + regras granulares por módulo (visualizar/editar/criar/eliminar), configuráveis por cada empresa.
- Sistema de auditoria: registo de quem, quando, o quê, e — sempre que possível — porquê, para ações humanas e de IA.
- Isolamento multi-tenant lógico, com arquitetura preparada para isolamento físico futuro (Enterprise).

**Dashboard Inteligente**
- Visão consolidada de indicadores, tarefas, notificações e atividades relevantes da empresa, agregando dados dos restantes módulos.
- Personalizável por papel/utilizador (o que um Gestor vê pode diferir do que um Colaborador vê, de acordo com as permissões RBAC).

**Gestão de Processos e Tarefas**
- Criação, acompanhamento e automatização de processos, projetos e tarefas.
- Suporte a equipas e departamentos definidos por cada empresa.
- Dados partilhados com o CRM e o Dashboard (ex: uma tarefa pode estar associada a um cliente do CRM).

**CRM Inteligente**
- Gestão de clientes, empresas, contactos, oportunidades e histórico de interações.
- Acompanhamento comercial com apoio da IA (sugestões, resumos).
- Visibilidade de dados regulada por RBAC (ex: um comercial vê apenas os seus clientes; um gestor vê toda a equipa).

**Assistente de IA**
- Responde a perguntas sobre dados existentes na plataforma (todos os módulos).
- Analisa dados, gera insights, identifica riscos e oportunidades.
- Resume documentos, projetos, clientes e processos.
- Sugere automatizações e melhorias; propõe ações, nunca as executa sem confirmação explícita.
- Opera sobre camada de abstração multi-fornecedor de IA (Claude, OpenAI, outros), com políticas de autonomia configuráveis por empresa desde a arquitetura.

**Comercial (Planos e Subscrições)** *(camada transversal, não um módulo de produto per se)*
- Planos Starter/Professional/Enterprise, com limites configuráveis (utilizadores, armazenamento, uso de IA, automações, integrações).
- Trial de 14 dias, sem plano gratuito permanente.
- Faturação simples, preparada para integração futura com sistemas de pagamento.

### 3.5 Requisitos Transversais (Categorias)

Detalhados no próximo documento (Non-Functional Requirements); aqui apenas as categorias que já sabemos, com origem, que se aplicam a toda a plataforma:

| Categoria | Referência de origem |
|---|---|
| Segurança e isolamento de dados | Vision Document, 3.10 |
| Disponibilidade (99,9% no MVP) | Discovery / Success Metrics, 3.2 |
| Auditoria e rastreabilidade | Vision Document, 3.10 |
| Instrumentação de analytics/telemetria | Success Metrics, 3.6 |
| Multilíngue (PT/EN) | Vision Document, 2 |
| Responsividade (desktop/tablet/mobile) | Discovery |
| Conformidade RGPD, alojamento UE | Vision Document, 3.10 |
| Escalabilidade (10-50 empresas piloto → milhares, sem reconstrução) | Business Goals, H3.1 |

### 3.6 Suposições

- A NEXA é construída por uma pessoa (Fundadora/CEO) com apoio de ferramentas de IA (Claude Code), sem equipa técnica tradicional nesta fase.
- O orçamento é controlado, favorecendo serviços cloud geridos em vez de infraestrutura self-hosted complexa.
- As empresas piloto têm, no mínimo, acesso à internet e dispositivos modernos (desktop, tablet ou smartphone) — não há suposição de compatibilidade com hardware ou browsers legados.
- Os fornecedores de IA externos (Claude, OpenAI) mantêm disponibilidade de API estável durante o desenvolvimento e operação do MVP.

### 3.7 Restrições

- Horizonte de 6 meses até ao lançamento do MVP, com qualidade da arquitetura privilegiada sobre velocidade (Discovery, Pergunta 5).
- Sem equipa técnica tradicional — decisões de arquitetura devem ser executáveis por uma pessoa com apoio de IA.
- Sem integrações externas no MVP (restrição deliberada de âmbito, não uma limitação técnica).
- Stack tecnológico ainda não decidido — a decidir na Fase 3 (Decisões de Engenharia), com critérios já definidos (escalabilidade, segurança, manutenibilidade, desempenho, integração com IA, comunidade/suporte).

### 3.8 Dependências Entre Documentos da Fase 2

Este PRD alimenta diretamente todos os documentos seguintes da Fase 2. A ordem de dependência já aprovada (ver proposta de índice) é: PRD → Personas → Journey Maps → Information Architecture → Functional Requirements → Non-Functional Requirements → Data Model Conceptual → User Stories → Use Cases → Functional Specifications, com o Glossário atualizado continuamente ao longo de todos.

### 3.9 Critérios de Aceitação do MVP (Alto Nível)

Referem-se diretamente aos indicadores já definidos no Success Metrics (Fase 1) — este documento não duplica esses critérios, apenas confirma que o âmbito aqui definido é suficiente para os tornar mensuráveis: os 4 módulos + fundação descritos em 3.4 cobrem a totalidade dos eventos de instrumentação exigidos em Success Metrics, 3.6.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | O PRD mantém-se ao nível de âmbito e enquadramento, remetendo o detalhe funcional para os documentos seguintes da Fase 2 | Evita um documento excessivamente longo e evita sobreposição com Functional Requirements, User Stories, Use Cases e Functional Specifications |
| D2 | A secção "Fora do âmbito do MVP" é tão explícita quanto a secção "Dentro do âmbito", com referência direta às fontes que já a justificaram | Um PRD sem fronteiras explícitas de exclusão é uma das causas mais comuns de scope creep — este documento fecha essa porta desde já |
| D3 | O sistema de "Planos e Subscrições" é tratado como camada transversal, não como um módulo funcional do produto | Reflete a sua natureza real — não é uma funcionalidade que o utilizador final "usa" como o CRM ou o Dashboard, mas uma capacidade de negócio que atravessa toda a plataforma |
| D4 | Adicionada a "Camada Comercial e Produto" (Landing Page, Pricing, Auth, Dashboard, Área Administrativa básica, Centro de Ajuda mínimo) ao âmbito dentro do MVP | Pivô estratégico de execução: o objetivo deixou de ser apenas documentação completa para um programador — passou a ser um MVP funcional, utilizável por clientes reais desde o lançamento. Esta camada não introduz módulos de negócio novos, apenas dá superfície de produto a requisitos já especificados |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | O light mode (Brand Book, Q3) deve ser resolvido antes da Information Architecture ser desenhada, ou pode permanecer em aberto até à Fase de UI/UX? | Information Architecture, Design System futuro | CEO + CTO |
| Q2 | A ordem de prioridade entre os 4 módulos do MVP (caso seja necessário sequenciar o desenvolvimento por sprints) já está implícita no Product Roadmap (Etapa 1.2), mas deve ser confirmada explicitamente antes da Fase 4 — Planeamento? | Planeamento, Sprints | CEO + CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, consolidando as decisões da Fase 1 num âmbito de requisitos de alto nível para o MVP, com fronteiras explícitas de dentro/fora de âmbito | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada a Camada Comercial e Produto ao âmbito dentro do MVP (Landing Page, Pricing, Auth, Dashboard, Área Administrativa básica, Centro de Ajuda mínimo), formalizando o pivô estratégico de execução para um MVP comercialmente utilizável | CTO (Claude) + Fundadora/CEO |

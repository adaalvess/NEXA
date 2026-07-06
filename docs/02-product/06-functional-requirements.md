# NEXA — Functional Requirements

| | |
|---|---|
| **Documento** | Functional Requirements |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | PRD v1.0 · Information Architecture v1.3 · Data Model Conceptual v1.0 · User Personas v1.1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento decompõe o âmbito já aprovado no PRD em **requisitos funcionais discretos e testáveis** — o que o sistema deve fazer, capacidade a capacidade, por módulo. Cada requisito é rastreável a uma decisão já tomada nos documentos anteriores; nenhum requisito introduz âmbito novo.

### Nota de Clarificação de Âmbito

| Documento | Responde a... |
|---|---|
| **Functional Requirements** (este documento) | Requisitos discretos e testáveis: "o sistema deve permitir X", decompostos por módulo e capacidade |
| **User Stories** (próximo) | A mesma capacidade, na perspetiva narrativa de uma Persona ("Como [persona], quero [ação], para [benefício]") |
| **Use Cases** (seguinte) | O fluxo passo a passo de interação para cenários específicos, incluindo exceções |
| **Functional Specifications** (último) | Especificação ao nível de detalhe que orienta diretamente o desenho técnico de cada módulo |

Um requisito funcional aqui não descreve *como* a interface se comporta nem *que fluxo exato* a pessoa segue — apenas *que capacidade* tem de existir. Cada requisito usa um identificador (FR-XX) que os documentos seguintes devem referenciar, nunca duplicar.

---

## 2. Contexto

Os requisitos seguem a estrutura de módulos já definida no PRD (3.4): Fundação, Dashboard, Processos e Tarefas, CRM, Assistente de IA, e a camada comercial de Planos e Subscrições. Cada requisito cita a entidade do Data Model Conceptual a que se aplica e, quando relevante, o princípio de Information Architecture que o rege.

---

## 3. Conteúdo Estruturado

### 3.1 Fundação da Plataforma

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-01 | O sistema deve permitir a criação de uma Empresa (Workspace Context) com isolamento lógico de dados face a qualquer outra Empresa | Empresa | Vision Document, 3.10 |
| FR-02 | O sistema deve permitir autenticação de Utilizadores e associá-los a uma Empresa através de uma relação própria (preparada para futura associação múltipla) | Utilizador | Data Model Conceptual, D1 |
| FR-03 | O sistema deve permitir atribuir a cada Utilizador um Papel RBAC predefinido (Super Admin, Admin da Empresa, Gestor, Colaborador, Convidado) | Utilizador, Papel | Vision Document (RBAC) |
| FR-04 | O sistema deve permitir que cada Empresa defina regras de permissão granulares adicionais, por módulo (visualizar/editar/criar/eliminar), sobre a base dos Papéis predefinidos | Papel | Vision Document (RBAC) |
| FR-05 | O sistema deve permitir a criação de Departamentos/Equipas por cada Empresa, e a associação de Utilizadores a esses Departamentos/Equipas | Departamento/Equipa | PRD, 3.4 |
| FR-06 | O sistema deve aplicar as regras de visibilidade RBAC de forma consistente em toda a navegação — nenhum Utilizador deve poder aceder a uma entidade fora do seu escopo de permissões | Todas | Data Model Conceptual, D4 |
| FR-07 | O sistema deve registar, para toda a ação relevante (humana ou de IA), quem a executou, quando, sobre que entidade, e a alteração efetuada | Registo de Auditoria | Vision Document, 3.10 |
| FR-08 | O sistema deve capturar os eventos de instrumentação já definidos no Success Metrics (login/sessão, uso por módulo, interação com IA, ciclo de vida de subscrição) | Transversal | Success Metrics, 3.6 |
| FR-09 | O sistema deve suportar interface e conteúdo em Português e Inglês | Transversal | Vision Document, 2 |
| FR-10 | O sistema deve distinguir, para qualquer entidade, entre "não existe ainda" e "existe mas está vazia por escolha do utilizador", suportando o comportamento de estado inicial guiado | Todas | Data Model Conceptual, 3.5 |

### 3.2 Dashboard Inteligente

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-11 | O sistema deve apresentar, no Dashboard, uma vista agregada de indicadores, tarefas, notificações e atividades relevantes, filtrada pelo escopo RBAC do Utilizador | Todas (agregação) | PRD, 3.4 |
| FR-12 | O Dashboard deve apresentar um estado inicial guiado quando a Empresa ainda não tiver dados suficientes para gerar uma vista agregada útil | — | Information Architecture, 3.3 |
| FR-13 | O Dashboard deve refletir, sem necessidade de atualização manual da página, alterações relevantes ocorridas noutros módulos (ex: uma tarefa concluída) | Processo/Tarefa, Cliente | Information Architecture, 3.2 |

### 3.3 Gestão de Processos e Tarefas

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-14 | O sistema deve permitir criar, editar, atribuir e concluir Processos/Tarefas | Processo/Tarefa | PRD, 3.4 |
| FR-15 | O sistema deve permitir associar um Processo/Tarefa a um Departamento/Equipa | Processo/Tarefa, Departamento/Equipa | Data Model Conceptual, 3.2 |
| FR-16 | O sistema deve permitir associar, de forma opcional, um Processo/Tarefa a um Cliente do CRM | Processo/Tarefa, Cliente | Data Model Conceptual, 3.2 |
| FR-17 | O sistema deve permitir visualizar Processos/Tarefas filtrados pelo escopo RBAC (ex: um Colaborador vê apenas as suas; um Gestor vê as da sua equipa) | Processo/Tarefa | Information Architecture, 3.4 |
| FR-18 | O sistema deve permitir navegar de um Processo/Tarefa associado para o respetivo Cliente, e vice-versa | Processo/Tarefa, Cliente | Information Architecture, 3.5 |

### 3.4 CRM Inteligente

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-19 | O sistema deve permitir criar, editar e consultar Clientes, Contactos e Oportunidades | Cliente/Contacto/Oportunidade | PRD, 3.4 |
| FR-20 | O sistema deve permitir registar Interações associadas a um Cliente, compondo o seu histórico comercial | Interação, Cliente | Data Model Conceptual, 3.2 |
| FR-21 | O sistema deve permitir visualizar Clientes filtrados pelo escopo RBAC (ex: um Comercial vê apenas os seus; um Gestor vê os de toda a sua equipa) | Cliente | Vision Document (RBAC) |
| FR-22 | O sistema deve permitir uma vista de pipeline comercial (oportunidades por estado) | Oportunidade | Information Architecture, 3.1 |

### 3.5 Assistente de IA

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-23 | O sistema deve permitir ao Utilizador colocar perguntas ao Assistente de IA sobre dados existentes na plataforma, dentro do seu escopo RBAC | Sugestão/Conversa de IA | Discovery, Pergunta 4 |
| FR-24 | O sistema deve permitir ao Assistente de IA gerar resumos, insights e identificação de riscos/oportunidades sobre entidades a que o Utilizador tem acesso | Sugestão/Conversa de IA | Discovery, Pergunta 4 |
| FR-25 | O sistema deve permitir ao Assistente de IA propor ações (ex: criar uma tarefa), sem nunca as executar sem confirmação explícita do Utilizador | Sugestão/Conversa de IA | Vision Document, 3.9 |
| FR-26 | O sistema deve operar sobre uma camada de abstração que permita usar múltiplos fornecedores de IA, sem alterar a arquitetura principal | — | Discovery, Pergunta 4 |
| FR-27 | O sistema deve preparar, desde a arquitetura, um sistema de políticas de autonomia de IA configurável por Empresa, mesmo sem ativar autonomia de nível C no MVP | — | Product Roadmap, D3 |
| FR-28 | Toda a ação e sugestão do Assistente de IA deve ser registada no Registo de Auditoria | Sugestão/Conversa de IA, Registo de Auditoria | Vision Document, 3.10 |

### 3.6 Comercial — Planos e Subscrições

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-29 | O sistema deve suportar planos Starter, Professional e Enterprise, com limites configuráveis (utilizadores, armazenamento, uso de IA, automações, integrações) | Subscrição/Plano | Business Goals, 3.1 |
| FR-30 | O sistema deve suportar um período de trial de 14 dias antes de exigir subscrição paga | Subscrição/Plano | Business Goals, 3.1 |
| FR-31 | O sistema deve impedir o uso de funcionalidades além dos limites do plano ativo da Empresa | Subscrição/Plano | Business Goals, 3.1 |

### 3.7 Requisitos Transversais de Preparação Arquitetural

Consistente com os princípios já registados no Information Architecture (3.6) — estes requisitos não implicam funcionalidade visível no MVP, apenas que o modelo de dados e a arquitetura não impeçam a sua implementação futura:

| ID | Requisito | Referência |
|---|---|---|
| FR-32 | O modelo de dados deve permitir que qualquer entidade referenciável participe, no futuro, em relações de Favorito e Item Recente, sem alteração estrutural | Information Architecture, 3.6.5 |
| FR-33 | Toda entidade referenciável deve ter um identificador único e estável, condição necessária para Deep Linking futuro | Information Architecture, 3.6.7 |
| FR-34 | A estrutura de navegação deve ser extensível a novos módulos sem reorganização dos módulos existentes | Information Architecture, 3.6.8 |

### 3.8 Requisitos Adicionados pela Auditoria de Consistência (Fase 1/2)

| ID | Requisito | Entidade(s) | Referência |
|---|---|---|---|
| FR-35 | O sistema deve permitir a um Utilizador com permissão adequada conceder acesso explícito a uma entidade específica a um Utilizador com papel Convidado | Partilha | Information Architecture, 3.4 (Q2, resolvida); Data Model Conceptual, 3.3 |
| FR-36 | O sistema deve gerar Notificações para eventos relevantes dentro do escopo do Utilizador (ex: tarefa atribuída, sugestão de IA pendente), no âmbito simples definido para o MVP | Notificação/Atividade | Information Architecture, 3.6.3; Data Model Conceptual, 3.3 |

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Cada requisito recebe um identificador único (FR-XX) para ser referenciado, não duplicado, pelos documentos seguintes | Mantém rastreabilidade e evita que User Stories e Use Cases reescrevam a mesma capacidade com palavras diferentes |
| D2 | Os requisitos de preparação arquitetural (3.7) são isolados numa secção própria, claramente marcados como não-visíveis no MVP | Evita ambiguidade sobre o que é funcionalidade do MVP e o que é preparação de arquitetura, consistente com a distinção já feita no Information Architecture |
| D3 | Não foram adicionados requisitos especulativos além do que já está aprovado nos documentos anteriores | Consistente com a instrução explícita de evitar sobreengenharia nesta fase |
| D4 | FR-35 e FR-36 foram adicionados a partir da auditoria de consistência realizada no final da Fase 2, que identificou dois conceitos (Partilha, Notificações) referenciados por vários documentos sem nunca terem sido formalizados como requisito | Fecha lacunas reais de rastreabilidade identificadas na auditoria, sem introduzir âmbito especulativo — ambos os requisitos já estavam implícitos em decisões aprovadas, apenas nunca tinham sido escritos como FR |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | FR-13 (atualização em tempo real do Dashboard) implica uma decisão técnica (polling vs. eventos em tempo real) que ainda não foi tomada — deve ficar como requisito funcional geral, ou aguardar a Fase 3 para se tornar mais específico? | Non-Functional Requirements, ADRs futuros | CTO, na Fase 3 |
| Q2 | FR-31 (impedir uso além dos limites do plano) precisa de definir o comportamento exato quando um limite é atingido (bloqueio total vs. aviso com carência) — a decidir no Use Cases | Use Cases | CEO + CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 34 requisitos funcionais decompostos por módulo, todos rastreáveis a decisões já aprovadas na Fase 1 e nos documentos anteriores da Fase 2 | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.1 | 2026-07-02 | Correção da auditoria de consistência Fase 1/2: adicionados FR-35 (Partilha) e FR-36 (Notificações), fechando lacunas de rastreabilidade identificadas | CTO (Claude) + Fundadora/CEO |

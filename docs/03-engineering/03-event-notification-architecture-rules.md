# NEXA — Event & Notification Architecture Rules

| | |
|---|---|
| **Documento** | Event & Notification Architecture Rules |
| **Fase** | 3 — Engineering Principles (3 de 4) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | System Design Principles v1.2 · Data & Consistency Rules v1.1 · Functional Requirements v1.1 (FR-36) · Functional Specifications v1.1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define **como os eventos são gerados, propagados e consumidos** dentro da NEXA — o mecanismo estrutural de comunicação entre módulos, e a forma como Notificações e atualizações do Dashboard reagem a alterações de estado. É estritamente estrutural: não redefine nenhum evento de negócio específico, nenhuma regra RN-XX, nem a entidade Notificação já especificada no Functional Specifications — define as regras que governam a mecânica por trás delas.

### Nota de Clarificação de Âmbito

Este documento não decide *que* eventos de negócio existem (isso já está implícito no Functional Requirements e no Functional Specifications — ex: "tarefa atribuída", "sugestão de IA pendente") — decide *como* esses eventos se propagam pelo sistema de forma estrutural, tecnologicamente neutra. Segue o mesmo processo de governação já formalizado (System Design Principles, 3.7): qualquer descoberta técnica com implicação de produto, legal ou de segurança é extraída para o Product & Security Decisions Register, não decidida aqui.

---

## 2. Contexto

Três decisões já aprovadas moldam diretamente este documento: o estilo arquitetural de monólito modular com módulos que não acedem diretamente aos dados uns dos outros (System Design Principles, 3.1-3.2); a exigência de que toda ação relevante gere uma entrada imutável no Registo de Auditoria (Data & Consistency Rules, 3.3); e a existência já aprovada da entidade Notificação, com o requisito FR-36 de a gerar para eventos relevantes do escopo do Utilizador.

---

## 3. Conteúdo Estruturado

### 3.1 Eventos Internos Como Mecanismo de Comunicação Entre Módulos

Consistente com a fronteira de módulo já fixada (System Design Principles, 3.2: nenhum módulo acede diretamente aos dados de outro), a comunicação entre módulos que precisam de reagir a alterações uns dos outros (ex: o Dashboard reage a uma Tarefa concluída; o Centro de Notificações reage a uma Sugestão de IA pendente) acontece através de um **mecanismo interno de eventos**, não de acesso direto a dados entre módulos.

**Decisão de desenho:** para o MVP, este mecanismo é **interno ao processo da aplicação** (in-process), não um sistema de mensagens distribuído externo — consistente com a escolha de monólito modular (System Design Principles, 3.1) e proporcional ao volume de utilizadores esperado (10-50 empresas piloto). O mecanismo é implementado por trás de uma interface própria, para que uma futura evolução para um sistema de mensagens externo (se e quando a extração de serviços do Q1 do System Design Principles se tornar relevante) não exija reescrever os módulos consumidores — apenas trocar a implementação por trás da interface.

### 3.2 Estrutura de um Evento

Todo evento interno partilha um envelope estrutural comum, independentemente do seu significado de negócio:

| Campo do envelope | Descrição |
|---|---|
| Tipo de evento | Identificador do que aconteceu (ex: "tarefa.atribuida", "sugestao_ia.pendente") |
| Entidade de origem | A entidade cuja alteração de estado gerou o evento |
| Ator | Quem (Utilizador) ou o quê (Assistente de IA) causou o evento |
| Timestamp | Momento exato da ocorrência |
| Empresa (Workspace Context) | Herdado obrigatoriamente da entidade de origem — nenhum evento existe fora de um Workspace Context (System Design Principles, 3.6) |

### 3.3 Todo Evento de Negócio Relevante Gera Exatamente Uma Entrada de Auditoria

Para evitar divergência entre "o que aconteceu" (Registo de Auditoria) e "o que foi comunicado a outros módulos" (Eventos), **cada evento de negócio relevante corresponde a exatamente uma entrada no Registo de Auditoria** (Data & Consistency Rules, 3.3) — nunca duas fontes de verdade separadas para o mesmo acontecimento. O evento é o mecanismo de propagação; a entrada de auditoria é o registo permanente e imutável.

### 3.4 Notificações São Consumidoras de Eventos, Nunca Geradoras Independentes

A geração de uma Notificação (FR-36, entidade já especificada no Functional Specifications) acontece **exclusivamente como reação a um evento**, nunca por lógica ad-hoc espalhada pelos módulos. Um único ponto de despacho ("Notification Dispatcher", conceptual, não uma escolha de tecnologia) subscreve os tipos de evento relevantes e cria as Notificações correspondentes — o mesmo padrão de "ponto único de controlo" já aplicado ao enforcement de multi-tenancy (System Design Principles, 3.6) e à validação de dados (Data & Consistency Rules, 3.6), agora aplicado à geração de notificações.

### 3.5 Garantias de Entrega — Pelo Menos Uma Vez, com Consumidores Idempotentes

Um evento pode, em casos de falha e nova tentativa, ser entregue mais do que uma vez a um consumidor (ex: ao Notification Dispatcher). Por isso, todo consumidor de eventos deve ser **idempotente** — processar o mesmo evento duas vezes nunca deve criar duas Notificações duplicadas nem duas entradas de auditoria duplicadas. Esta é uma propriedade de desenho, não uma escolha de tecnologia específica.

### 3.6 Consistência de Eventos Alinhada com o Modelo Já Aprovado

Os efeitos secundários de um evento (atualização do Dashboard, criação de uma Notificação) seguem o modelo de consistência já aprovado no Data & Consistency Rules (3.1): consistência eventual, com o mesmo atraso máximo de 30 segundos já fixado em NFR-04 para o Dashboard. Este documento não introduz uma nova janela de tolerância — aplica a já existente à camada de eventos.

### 3.7 Extensibilidade — Novos Módulos Consomem ou Publicam Sem Alterar os Existentes

Consistente com a Escalabilidade Modular (NFR-18) e o princípio já fixado no System Design Principles (3.2, regra 3): um módulo futuro (Arco 2) pode subscrever eventos já existentes, ou publicar novos tipos de evento, sem exigir alteração dos módulos que já existem. Uma futura integração externa (Arco 3 — webhooks, conectores) é, estruturalmente, apenas mais um consumidor do mesmo catálogo de eventos internos — não uma arquitetura paralela.

### 3.8 Salvaguarda Estrutural — Sugestão de IA Nunca Encadeia Automaticamente em Execução

Este é o ponto onde a arquitetura de eventos tem de **impor estruturalmente** uma regra de negócio já aprovada (RN-08, Use Cases: nenhuma ação da IA é executada sem confirmação explícita e individual), não reinterpretá-la. A regra estrutural é:

- O evento "sugestão de IA gerada" e o evento "ação confirmada por utilizador" são **sempre eventos distintos**, e o segundo só pode ser emitido por uma ação humana explícita.
- Não existe, na arquitetura de eventos, nenhum caminho técnico em que o primeiro evento possa desencadear automaticamente o segundo. Esta ausência de caminho automático é uma propriedade de desenho verificável, não apenas uma promessa funcional.

Esta é a tradução arquitetural de "confiança não se assume, constrói-se" (Mission & Values) ao nível mais técnico possível: não depender apenas de uma regra de negócio bem-intencionada, mas de uma impossibilidade estrutural.

*Nota de fronteira (System Design Principles, 3.7): esta salvaguarda é legítima precisamente porque reforça uma decisão de produto já estabelecida e inequívoca (RN-08) — não introduz nenhum comportamento novo. A arquitetura de eventos protege esta decisão, não a substitui nem a redefine; qualquer futura alteração à própria regra RN-08 continua a pertencer exclusivamente ao processo de decisão de produto.*

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Mecanismo de eventos interno ao processo (in-process), atrás de uma interface própria, não um sistema de mensagens externo no MVP | Proporcional à escala real (10-50 empresas); mantém a porta aberta para extração futura sem reescrita, através da interface — mesma lógica já usada na camada de abstração de IA (FR-26) |
| D2 | Cada evento de negócio relevante corresponde a exatamente uma entrada de auditoria, nunca duas fontes de verdade | Evita divergência entre "o que o sistema comunicou internamente" e "o que ficou registado permanentemente" |
| D3 | Geração de Notificações centralizada num único ponto de despacho, que subscreve eventos, em vez de lógica dispersa por módulo | Estende o padrão de ponto único de controlo já estabelecido para multi-tenancy e validação de dados, agora à geração de notificações |
| D4 | Impossibilidade estrutural (não apenas regra de negócio) de um evento de sugestão de IA encadear automaticamente num evento de execução | Traduz RN-08 e o princípio de confiança do Mission & Values numa garantia arquitetural verificável, não apenas numa promessa de comportamento |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | A tecnologia exata do mecanismo de eventos in-process (ex: biblioteca de event emitter, fila em memória) é uma decisão de stack, não deste documento | ADR de Stack Backend (Fase 3, próximos ADRs) | CTO, no ADR correspondente |
| Q2 | Quando o Arco 3 (integrações externas) for iniciado, deve confirmar-se se o catálogo de eventos internos é diretamente reutilizável para acionar webhooks, ou se exige uma camada de tradução adicional | Product Roadmap, Arco 3 | CTO, no início do Arco 3 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 8 regras estruturais de eventos e notificações, incluindo a salvaguarda estrutural (3.8) que impede sugestões de IA de encadearem automaticamente em execução, coerente com System Design Principles v1.2 e Data & Consistency Rules v1.1 | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada nota de fronteira a 3.8, clarificando que a salvaguarda reforça a decisão de produto RN-08 sem a substituir, consistente com o limite de imposição estrutural agora registado no System Design Principles v1.3 | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

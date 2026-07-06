# NEXA — User Stories

| | |
|---|---|
| **Documento** | User Stories |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Functional Requirements v1.0 · User Personas v1.1 · User Journey Maps v1.1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento traduz os requisitos funcionais já aprovados (FR-XX) em **histórias de utilizador**, na perspetiva de uma Persona concreta, com critérios de aceitação em formato Given/When/Then — prontas para orientar diretamente o desenvolvimento, os testes e a validação do produto.

### Nota de Clarificação de Âmbito

Cada User Story referencia um ou mais Functional Requirements (FR-XX) e nunca reescreve o que já lá está — a história acrescenta a perspetiva humana (quem, porquê) e o critério de aceitação testável; o requisito em si permanece definido no Functional Requirements. Os requisitos de preparação arquitetural (FR-32 a FR-34) não têm User Story correspondente, por decisão consciente: não são visíveis a nenhuma Persona no MVP, logo não têm comportamento observável para uma história descrever (ver Decisão D3).

Consistente com a regra já fixada no User Personas (D4), toda User Story identifica Persona **e** papel RBAC.

---

## 2. Contexto

As histórias estão organizadas pelos mesmos módulos do Functional Requirements, para facilitar a rastreabilidade cruzada. Sempre que uma história corresponde a uma etapa já mapeada no User Journey Maps, essa jornada é citada.

---

## 3. Conteúdo Estruturado

### 3.1 Fundação da Plataforma

**US-01 — Criar a empresa e convidar a equipa**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-01, FR-02 · Jornada: A

> Como Administradora da Empresa, quero criar a minha empresa na NEXA e convidar os meus colaboradores, para começar a organizar a operação com a minha equipa desde o primeiro dia.

- **Given** que não tenho ainda conta na NEXA, **when** completo o registo da empresa com os dados básicos, **then** a empresa é criada com isolamento de dados garantido face a qualquer outra empresa na plataforma.
- **Given** que a minha empresa está criada, **when** convido um colaborador pelo email, **then** esse colaborador recebe um convite e, ao aceitar, fica associado apenas à minha empresa.

**US-02 — Atribuir papéis e permissões**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-03, FR-04 · Jornada: A

> Como Administradora da Empresa, quero atribuir papéis aos meus colaboradores e ajustar permissões específicas, para que cada pessoa veja apenas o que é relevante para a sua função.

- **Given** que convidei um colaborador, **when** lhe atribuo o papel "Gestor", **then** esse colaborador passa a ter as permissões predefinidas desse papel.
- **Given** que quero uma regra mais específica (ex: um Gestor sem permissão para eliminar clientes), **when** ajusto essa regra ao nível do módulo CRM, **then** essa exceção sobrepõe-se à permissão predefinida do papel, apenas para essa empresa.

**US-03 — Organizar a empresa em departamentos**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-05

> Como Administradora da Empresa, quero criar departamentos ou equipas, para refletir a estrutura real da minha organização.

- **Given** que a minha empresa tem uma equipa comercial e uma equipa de operações, **when** crio dois departamentos com esses nomes, **then** posso associar cada colaborador ao departamento correto.

**US-04 — Ver apenas o que me é permitido**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-06, FR-17, FR-21 · Jornada: B

> Como Colaborador, quero ver apenas os meus clientes e as minhas tarefas, para não ficar sobrecarregado com informação que não me diz respeito nem consigo alterar.

- **Given** que sou Colaborador com acesso restrito aos meus próprios clientes, **when** acedo ao CRM, **then** vejo apenas os clientes que me foram atribuídos, sem opção de ver os de outros colegas.

**US-05 — Consultar o histórico de ações**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-07

> Como Administradora da Empresa, quero consultar quem fez o quê e quando, para ter confiança e controlo total sobre a operação.

- **Given** que um colaborador alterou os dados de um cliente, **when** consulto o registo de auditoria desse cliente, **then** vejo quem fez a alteração, quando, e o que mudou.

### 3.2 Dashboard Inteligente

**US-06 — Ver a visão geral da empresa**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-11 · Jornada: A

> Como Administradora da Empresa, quero ver um resumo do estado da empresa assim que entro na plataforma, para saber rapidamente o que precisa da minha atenção.

- **Given** que a minha empresa já tem tarefas e clientes registados, **when** acedo ao Dashboard, **then** vejo indicadores, tarefas relevantes e notificações agregadas, respeitando o que tenho permissão para ver.

**US-07 — Ser guiada quando ainda não há dados**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-12 · Jornada: A

> Como Administradora de uma empresa recém-criada, quero ser orientada sobre o que fazer a seguir, para não ficar perante um ecrã vazio sem saber como começar.

- **Given** que a minha empresa ainda não tem clientes nem tarefas registadas, **when** acedo ao Dashboard, **then** vejo uma ação clara sugerida (ex: "Adicionar o primeiro cliente"), nunca um espaço em branco.

**US-08 — Ver o Dashboard filtrado à minha equipa**
Persona: Gestor Orientado a Resultados · RBAC: Gestor · FR: FR-11 · Jornada: C

> Como Gestor, quero ver o Dashboard filtrado à minha equipa, para identificar riscos sem ter de olhar para dados de outras equipas que não geriro.

- **Given** que sou Gestor de uma equipa específica, **when** acedo ao Dashboard, **then** vejo apenas indicadores e tarefas relativos à minha equipa, não à empresa toda.

### 3.3 Gestão de Processos e Tarefas

**US-09 — Criar e atribuir uma tarefa**
Persona: Gestor Orientado a Resultados · RBAC: Gestor · FR: FR-14

> Como Gestor, quero criar uma tarefa e atribuí-la a um membro da equipa, para distribuir trabalho de forma organizada.

- **Given** que identifico um trabalho a fazer, **when** crio uma tarefa e a atribuo a um colaborador da minha equipa, **then** essa tarefa aparece na lista de tarefas desse colaborador.

**US-10 — Associar uma tarefa a um cliente**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-16, FR-18 · Jornada: B

> Como Colaborador, quero associar uma tarefa ao cliente a que se refere, para encontrar facilmente todo o contexto quando precisar.

- **Given** que estou a criar uma tarefa relacionada com um cliente específico, **when** associo essa tarefa ao cliente, **then** a tarefa passa a ser visível tanto na lista de tarefas como no detalhe desse cliente.

**US-11 — Ver apenas as minhas tarefas do dia**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-17 · Jornada: B

> Como Colaborador, quero ver rapidamente as minhas tarefas do dia, para começar a trabalhar sem ter de procurar.

- **Given** que tenho tarefas atribuídas a mim, **when** acedo a Processos e Tarefas, **then** vejo apenas as minhas tarefas, ordenadas de forma a destacar as mais urgentes.

### 3.4 CRM Inteligente

**US-12 — Registar um novo cliente**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-19

> Como Colaborador, quero registar um novo cliente rapidamente, para não perder tempo com um processo burocrático.

- **Given** que tive um primeiro contacto com um potencial cliente, **when** o registo no CRM com o mínimo de informação (nome e contacto), **then** o cliente fica criado e disponível para adicionar mais informação depois.

**US-13 — Registar uma interação com um cliente**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-20 · Jornada: B

> Como Colaborador, quero registar rapidamente uma chamada ou reunião com um cliente, para manter o histórico atualizado sem que isso pareça trabalho extra.

- **Given** que acabei de falar com um cliente, **when** registo essa interação no perfil do cliente, **then** essa interação passa a fazer parte do histórico visível a quem tiver acesso a esse cliente.

**US-14 — Ver o pipeline comercial**
Persona: Gestor Orientado a Resultados · RBAC: Gestor · FR: FR-22 · Jornada: C

> Como Gestor, quero ver todas as oportunidades comerciais da minha equipa organizadas por estado, para acompanhar o progresso das vendas.

- **Given** que a minha equipa tem oportunidades em diferentes fases, **when** acedo à vista de pipeline, **then** vejo todas as oportunidades da minha equipa agrupadas pelo estado em que se encontram.

### 3.5 Assistente de IA

**US-15 — Perguntar ao assistente sobre a empresa**
Persona: Colaborador Operacional · RBAC: Colaborador · FR: FR-23 · Jornada: B

> Como Colaborador, quero perguntar ao Assistente de IA algo sobre um cliente ou tarefa, para obter uma resposta rápida sem procurar manualmente.

- **Given** que preciso de saber o estado de uma tarefa de um cliente, **when** pergunto ao Assistente de IA, **then** recebo uma resposta específica e correta, baseada apenas em dados a que tenho acesso.

**US-16 — Receber e decidir sobre uma sugestão da IA**
Persona: Gestor Orientado a Resultados · RBAC: Gestor · FR: FR-24, FR-25 · Jornada: C

> Como Gestor, quero que o Assistente de IA me sugira uma ação quando identificar um risco, para poder agir mais depressa — mas sempre com a decisão final nas minhas mãos.

- **Given** que o Assistente de IA identifica uma tarefa em risco de atraso, **when** me apresenta uma sugestão de ação (ex: reatribuir a tarefa), **then** essa ação só é executada se eu a confirmar explicitamente.
- **Given** que rejeito uma sugestão da IA, **when** confirmo a rejeição, **then** nenhuma ação é executada e a rejeição fica registada.

**US-17 — Confiar que a IA nunca age sozinha**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-25, FR-28

> Como Administradora da Empresa, quero ter a garantia de que o Assistente de IA nunca executa ações por conta própria, para confiar na plataforma com a operação real da minha empresa.

- **Given** que o Assistente de IA gera uma sugestão de qualquer tipo, **when** essa sugestão é apresentada a um utilizador, **then** fica registada no sistema de auditoria como "proposta", e só muda de estado para "executada" após confirmação humana explícita.

### 3.6 Comercial — Planos e Subscrições

**US-18 — Escolher um plano após o trial**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-29, FR-30 · Jornada: D

> Como Administradora da Empresa, quero escolher o plano mais adequado à minha empresa quando o trial terminar, para continuar a usar a NEXA sem interrupção.

- **Given** que o meu trial de 14 dias está a terminar, **when** escolho um plano (Starter, Professional ou Enterprise) e confirmo a subscrição, **then** a minha empresa continua a operar sem perda de dados, dentro dos limites do plano escolhido.

**US-19 — Ser avisada ao aproximar-me de um limite do plano**
Persona: Fundadora Sobrecarregada · RBAC: Administrador da Empresa · FR: FR-31

> Como Administradora da Empresa, quero ser avisada quando estou perto de atingir um limite do meu plano, para decidir com antecedência se quero fazer upgrade.

- **Given** que estou a aproximar-me do limite de utilizadores do meu plano, **when** tento convidar mais um colaborador, **then** sou avisada do limite antes de qualquer bloqueio acontecer *(nota: o comportamento exato ao atingir o limite — bloqueio total vs. aviso com carência — permanece em aberto, ver Functional Requirements, Q2)*.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Cada User Story referencia explicitamente Persona + papel RBAC + FR-XX + Jornada (quando aplicável) | Cumpre a regra de rastreabilidade já fixada no User Personas (D4) e mantém consistência de dados entre todos os documentos da Fase 2 |
| D2 | Os critérios de aceitação usam sempre o formato Given/When/Then, com pelo menos um cenário por história | Torna as histórias diretamente utilizáveis como base de testes, não apenas como descrição de intenção |
| D3 | Os requisitos de preparação arquitetural (FR-32 a FR-34) não têm User Story correspondente | Não têm comportamento observável por nenhuma Persona no MVP — criar uma história para eles seria artificial e contrário à disciplina de evitar sobreengenharia já reforçada nesta fase |
| D4 | US-19 assinala explicitamente que uma questão em aberto do Functional Requirements (Q2) ainda não está resolvida, em vez de a decidir aqui | Uma User Story não é o lugar para tomar decisões de comportamento de negócio que pertencem ao Use Cases — a história descreve a intenção, não fecha a exceção |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Herdada do Functional Requirements (Q2): comportamento exato ao atingir o limite de um plano (bloqueio total vs. aviso com carência) | Use Cases, Functional Specifications da camada comercial | CEO + CTO, a resolver no Use Cases |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 19 User Stories cobrindo os requisitos funcionais visíveis do MVP (FR-01 a FR-31), cada uma com Persona, papel RBAC, FR referenciado e critérios de aceitação Given/When/Then | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

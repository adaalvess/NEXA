# NEXA — User Personas

| | |
|---|---|
| **Documento** | User Personas |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | PRD v1.0 (3.2) · Vision Document v1.1 (RBAC, Discovery) · Mission & Values v1.1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento aprofunda os stakeholders já listados em preview no PRD (3.2) em **personas concretas** — perfis representativos com contexto, objetivos, frustrações e comportamento esperado — para que os documentos seguintes (Journey Maps, User Stories, Use Cases) sejam desenhados a pensar em pessoas reais, não em papéis abstratos de permissões.

### Nota de Clarificação de Âmbito

Os **papéis RBAC** (Super Admin, Admin da Empresa, Gestor, Colaborador, Convidado) já estão definidos e aprovados no Vision Document — são uma estrutura de **permissões técnicas**, não personas. Uma persona pode ocupar um papel RBAC, mas os dois conceitos não são equivalentes: duas pessoas com o mesmo papel RBAC (ex: "Gestor") podem ter comportamentos, motivações e níveis de conforto tecnológico muito diferentes — é essa diferença que as personas capturam, e que o RBAC, por desenho, não captura.

---

## 2. Contexto

As personas seguintes são construídas a partir do ICP já definido no Product Vision (PMEs europeias, 5-250 colaboradores, foco inicial em serviços, consultoria, tecnologia, imobiliário, investimentos, logística, comércio) e cruzado com os papéis RBAC já aprovados. Não existem ainda dados reais de utilizadores (a plataforma não foi lançada) — estas personas são construídas por inferência fundamentada a partir da documentação estratégica aprovada, e devem ser **validadas e ajustadas com dados reais assim que as empresas piloto começarem a usar a plataforma** (ver Questões em Aberto, Q1).

---

## 3. Conteúdo Estruturado

### 3.1 Persona 1 — "A Fundadora Sobrecarregada" (papel RBAC: Administrador da Empresa)

| | |
|---|---|
| **Contexto** | Fundadora ou sócia-gerente de uma PME de 5-30 colaboradores (ex: consultoria, agência, escritório de serviços). Acumula funções de gestão, comercial e operações. |
| **Conforto tecnológico** | Médio — usa ferramentas do dia a dia (email, Excel, WhatsApp) com fluência, mas não é tecnicamente especializada nem tem equipa de TI. |
| **Objetivos** | Ter visão clara do que se passa na empresa sem ter de perguntar a cada pessoa; reduzir tempo gasto a "apagar fogos" por falta de organização; sentir que a empresa está a crescer de forma controlada. |
| **Frustrações atuais** | Informação espalhada entre WhatsApp, Excel e emails; depende da memória das pessoas; descobre problemas tarde demais. |
| **Relação com a NEXA** | É frequentemente quem decide adotar a NEXA e configura a empresa inicialmente. Usa sobretudo o Dashboard Inteligente e o Assistente de IA para ter visão rápida, sem entrar em detalhe operacional de cada módulo. |
| **Cita** (ilustrativa, não literal) | "Não tenho tempo para abrir cinco ferramentas só para saber se está tudo bem." |

### 3.2 Persona 2 — "O Gestor de Equipa Orientado a Resultados" (papel RBAC: Gestor)

| | |
|---|---|
| **Contexto** | Responsável por uma equipa ou departamento (ex: vendas, operações) numa PME de 30-150 colaboradores. Reporta à direção, gere pessoas e processos do dia a dia. |
| **Conforto tecnológico** | Médio-alto — já usou ferramentas de gestão de tarefas ou CRM antes, espera que a plataforma seja tão boa ou melhor do que essas. |
| **Objetivos** | Ter visibilidade sobre o trabalho da sua equipa sem microgerir; identificar rapidamente o que está atrasado ou em risco; reportar resultados à direção com dados fiáveis. |
| **Frustrações atuais** | Ferramentas fragmentadas obrigam a compilar relatórios manualmente; falta de padronização entre membros da equipa sobre como registar informação. |
| **Relação com a NEXA** | Utilizador intensivo da Gestão de Processos e Tarefas e do CRM (se a sua área for comercial); usa o Dashboard filtrado à sua equipa; principal beneficiário das permissões RBAC granulares (vê a sua equipa, não a empresa toda). |
| **Cita** (ilustrativa) | "Preciso de saber o que está a atrasar a equipa antes que se torne um problema para o cliente." |

### 3.3 Persona 3 — "O Colaborador Operacional" (papel RBAC: Colaborador)

| | |
|---|---|
| **Contexto** | Executa tarefas do dia a dia — comercial, apoio ao cliente, operações — numa PME de qualquer dimensão dentro do intervalo alvo. |
| **Conforto tecnológico** | Variável — vai desde muito confortável a resistente a "mais uma ferramenta". |
| **Objetivos** | Fazer o seu trabalho sem fricção; não perder tempo com processos burocráticos; ter acesso rápido apenas ao que lhe interessa (os seus clientes, as suas tarefas). |
| **Frustrações atuais** | Ferramentas complexas desenhadas para gestores, não para uso operacional diário; sente que "introduzir dados" é trabalho extra sem benefício direto para si. |
| **Relação com a NEXA** | Uso diário e repetitivo do CRM e/ou Gestão de Processos, dentro do âmbito que as suas permissões RBAC autorizam (ex: só os seus próprios clientes). É a persona mais sensível à simplicidade de uso definida como pilar de produto (Product Vision, 3.5). |
| **Cita** (ilustrativa) | "Se for mais lento do que fazer pelo WhatsApp, não vou usar." |

### 3.4 Persona 4 — "O Parceiro/Cliente Externo" (papel RBAC: Convidado)

| | |
|---|---|
| **Contexto** | Não é colaborador da empresa cliente da NEXA — é um cliente, fornecedor ou parceiro externo a quem foi dado acesso pontual e limitado. |
| **Conforto tecnológico** | Variável e irrelevante para o desenho — o acesso deve ser tão simples que o nível de conforto tecnológico não seja uma barreira. |
| **Objetivos** | Aceder rapidamente à informação específica que lhe foi partilhada (ex: estado de um projeto), sem necessidade de aprender a usar uma plataforma nova. |
| **Frustrações atuais** | Não aplicável de forma genérica — esta persona só interage com a NEXA de forma pontual e supervisionada pela empresa cliente. |
| **Relação com a NEXA** | Acesso muito limitado, definido caso a caso pela Administradora da Empresa ou Gestor. Não é o foco principal de nenhum dos 4 módulos do MVP, mas a sua existência valida a necessidade do papel RBAC "Convidado" já aprovado. |

### 3.5 Persona 5 — "A Equipa Interna NEXA" (papel RBAC: Super Administrador)

| | |
|---|---|
| **Contexto** | Nesta fase, a própria Fundadora/CEO da NEXA, no papel de operadora da plataforma (não de cliente). No futuro, poderá incluir colaboradores técnicos ou de suporte. |
| **Conforto tecnológico** | Alto — é quem opera e mantém a plataforma. |
| **Objetivos** | Garantir que a plataforma funciona de forma estável e segura para todas as empresas piloto; monitorizar uso, incidentes e feedback; apoiar onboarding de novas empresas. |
| **Frustrações atuais** | Não aplicável (persona interna, não cliente) — mas antecipa-se que a ausência de ferramentas internas de suporte/monitorização adequadas seria uma frustração futura relevante. |
| **Relação com a NEXA** | Acesso de Super Administrador — fora do âmbito funcional dos 4 módulos do MVP definidos para clientes; usa sobretudo os sistemas de auditoria e instrumentação já definidos como requisito transversal (PRD, 3.5). |

### 3.6 Matriz Persona × Papel RBAC × Módulos Mais Usados

| Persona | Papel RBAC | Módulos principais |
|---|---|---|
| Fundadora Sobrecarregada | Administrador da Empresa | Dashboard, Assistente de IA |
| Gestor Orientado a Resultados | Gestor | Processos e Tarefas, CRM, Dashboard (filtrado) |
| Colaborador Operacional | Colaborador | CRM e/ou Processos e Tarefas (uso diário) |
| Parceiro/Cliente Externo | Convidado | Acesso pontual, fora dos 4 módulos principais |
| Equipa Interna NEXA | Super Administrador | Auditoria, instrumentação (fora do âmbito dos módulos de cliente) |

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | As personas são explicitamente distinguidas dos papéis RBAC, com uma nota de clarificação dedicada | Evita que documentos futuros (Journey Maps, User Stories) confundam "papel de permissão" com "perfil humano real" — são inputs diferentes para decisões diferentes |
| D2 | As personas são construídas por inferência a partir da documentação já aprovada, não por pesquisa de utilizadores reais (que ainda não existem) | Consistente com o valor "Ambição com Humildade" — este documento é explicitamente marcado como sujeito a validação futura, não apresentado como facto definitivo |
| D3 | A Persona 4 (Parceiro/Cliente Externo) e a Persona 5 (Equipa Interna NEXA) são incluídas com menos detalhe do que as Personas 1-3 | Refletem papéis RBAC que existem mas que não são o foco principal de nenhum dos 4 módulos do MVP — detalhá-las ao mesmo nível seria desproporcional ao seu peso real no produto |
| D4 | Todo o User Journey Map e toda a User Story, a partir deste ponto da documentação, deve identificar explicitamente tanto a Persona (3.1-3.5) como o papel RBAC correspondente, nunca apenas um dos dois | Mantém rastreabilidade completa entre Personas, Jornadas, User Stories, Casos de Uso e Especificações Funcionais — sem esta regra, seria possível desenhar uma jornada tecnicamente correta ao nível de permissões mas desalinhada do comportamento humano real que a persona descreve |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Estas personas devem ser formalmente revalidadas com dados reais assim que as primeiras empresas piloto estiverem ativas (Business Goals, H2.3) — que critério determina se uma persona precisa de ser revista? | User Journey Maps, User Stories futuras | CEO, após os primeiros dados de piloto |
| Q2 | Faz sentido, no futuro, adicionar uma persona específica para PMEs de maior dimensão (perto dos 250 colaboradores), dado que o comportamento organizacional pode diferir significativamente das PMEs mais pequenas? | Segmentação futura de produto | CEO, a avaliar com dados do piloto |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 5 personas construídas a partir do PRD, do RBAC aprovado no Vision Document e do ICP do Product Vision | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada decisão D4, registando a regra de rastreabilidade obrigatória: todo User Journey Map e User Story futuro deve identificar Persona + papel RBAC | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

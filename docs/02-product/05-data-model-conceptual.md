# NEXA — Data Model Conceptual

| | |
|---|---|
| **Documento** | Data Model Conceptual |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | PRD v1.0 · Information Architecture v1.3 · Vision Document v1.1 (RBAC) · User Personas v1.1 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define as **entidades fundamentais da NEXA e as suas relações conceptuais** — o que existe na plataforma, como se relaciona, e que princípios estruturais governam esse modelo. É deliberadamente **independente de tecnologia**: não decide tipos de base de dados, esquemas de tabelas, nem estruturas de armazenamento — essas são decisões de engenharia que pertencem à Fase 3 (Architecture Decision Records). Serve de fundação conceptual para os documentos seguintes da Fase 2 (Functional Requirements, User Stories, Use Cases, Functional Specifications).

### Nota de Clarificação de Âmbito

| Documento | Responde a... |
|---|---|
| **Data Model Conceptual** (este documento) | Que entidades existem, como se relacionam, que princípios estruturais as governam — sem tecnologia |
| **Functional Requirements** (próximo) | O que o sistema deve fazer com estas entidades, decomposto por capacidade |
| **Use Cases / User Stories** (seguintes) | Fluxos concretos de interação com estas entidades, na perspetiva do utilizador |
| **Functional Specifications** (último da Fase 2) | Especificação módulo a módulo, ao nível de detalhe que orienta o desenho técnico |
| **ADRs de Base de Dados** (Fase 3, futuro) | Que tecnologia de base de dados, que esquema exato, que estratégia de indexação |

---

## 2. Contexto

Todas as entidades aqui definidas derivam diretamente dos 4 módulos do MVP e da fundação já aprovados no PRD (3.4), da estrutura de navegação já aprovada no Information Architecture, e do modelo RBAC já aprovado no Vision Document. Os princípios registados no Information Architecture como "capacidades futuras" (Workspace Context, Deep Linking, Favoritos, Auditoria) têm aqui a sua primeira tradução em termos de dados — não como esquema técnico, mas como relação conceptual que o modelo de dados tem de conseguir expressar, hoje ou no futuro, sem reconstrução.

---

## 3. Conteúdo Estruturado

### 3.1 Princípios do Modelo de Dados

1. **Toda entidade de negócio pertence a exatamente um Workspace Context (Empresa) em cada momento.** Mesmo quando um Utilizador vier a pertencer a várias Empresas (Information Architecture, 3.6.1), cada entidade individual (uma tarefa, um cliente) continua a pertencer a uma única Empresa — nunca partilhada entre Empresas.
2. **Toda entidade referenciável tem um identificador único e estável**, que não muda ao longo da vida da entidade — condição necessária para o Deep Linking (Information Architecture, 3.6.7) funcionar sem quebrar.
3. **Visibilidade é uma propriedade do modelo, não da interface.** As regras RBAC (quem vê o quê) devem poder ser expressas ao nível dos dados — não como um filtro aplicado apenas na apresentação, para que a auditoria e a IA respeitem exatamente as mesmas regras que a navegação.
4. **Auditoria é um cidadão de primeira classe do modelo, não um registo secundário.** Qualquer entidade relevante deve poder ser associada a um histórico de alterações rastreável — quem, quando, o quê (Vision Document, 3.10).
5. **O modelo distingue "não existe ainda" de "existe mas está vazia por escolha do utilizador"**, conforme já decidido no Information Architecture (3.3) para suportar o princípio de estado inicial guiado.
6. **Relações transversais (Favoritos, Itens Recentes, Auditoria) são genéricas**, não específicas de uma entidade — qualquer entidade referenciável futura (ex: um documento, no Arco 2) deve poder participar nestas relações sem alterar o modelo dessas relações transversais.

### 3.2 Entidades Fundamentais

| Entidade | Definição conceptual | Pertence a |
|---|---|---|
| **Empresa** | O Workspace Context — a unidade de isolamento multi-tenant. Toda a restante informação de negócio existe dentro de uma Empresa. | — (raiz) |
| **Utilizador** | Pessoa autenticada na plataforma. Associada a uma Empresa (preparado para associação a múltiplas Empresas no futuro — Information Architecture, 3.6.1), com um Papel atribuído. | Empresa (associação, preparada para N:N futuro) |
| **Papel e Regras de Permissão** | O papel RBAC predefinido (Super Admin, Admin da Empresa, Gestor, Colaborador, Convidado) atribuído a um Utilizador dentro de uma Empresa, mais as regras granulares adicionais que essa Empresa define. | Empresa + Utilizador |
| **Departamento / Equipa** | Agrupamento organizacional definido livremente por cada Empresa (ex: Vendas, Operações). Utilizadores pertencem a Departamentos/Equipas. | Empresa |
| **Processo / Tarefa** | Unidade de trabalho — um processo ou tarefa a acompanhar. Pode estar associada a um Departamento/Equipa e, opcionalmente, a um Cliente. | Empresa |
| **Cliente / Contacto / Oportunidade (CRM)** | Entidade comercial — uma empresa cliente, um contacto individual, ou uma oportunidade de negócio em curso. Mantém histórico de Interações. | Empresa |
| **Interação** | Registo de um contacto com um Cliente (ex: chamada, reunião, email registado manualmente) — compõe o histórico comercial. | Empresa + Cliente |
| **Sugestão / Conversa de IA** | Uma pergunta feita ao Assistente de IA, ou uma sugestão de ação gerada por ele. Pode referenciar outras entidades (um Cliente, uma Tarefa) sobre as quais fala. Tem um estado (pendente, aceite, rejeitada — nunca "executada automaticamente", consistente com o nível de autonomia B do MVP). | Empresa + Utilizador (quem perguntou/recebeu) |
| **Subscrição / Plano** | O plano ativo de uma Empresa (Starter/Professional/Enterprise) e os limites associados (utilizadores, armazenamento, uso de IA, automações, integrações). | Empresa |

### 3.3 Entidades Transversais

Estas entidades relacionam-se genericamente com qualquer entidade referenciável (Princípio 6, secção 3.1), em vez de estarem ligadas a apenas uma:

| Entidade | Definição conceptual | Relaciona-se com |
|---|---|---|
| **Registo de Auditoria** | Um evento registado: quem (Utilizador ou o próprio Assistente de IA), quando, que ação, sobre que entidade, e — sempre que possível — porquê. | Qualquer entidade referenciável |
| **Partilha** | Concessão explícita de acesso a uma entidade específica a um Utilizador com papel Convidado (ou, no futuro, a um Utilizador de outra Empresa). Define o mecanismo concreto por trás do acesso "se explicitamente partilhado" do papel Convidado (Information Architecture, 3.4) | Entidade referenciável + Utilizador/Convidado concedido |
| **Favorito** | Marcação de uma entidade como favorita por um Utilizador, dentro de um Workspace Context. Capacidade futura (Information Architecture, 3.6.5), não implementada no MVP, mas o modelo já a acomoda. | Utilizador + qualquer entidade referenciável |
| **Item Recente** | Registo de que um Utilizador acedeu recentemente a uma entidade específica. Mesma natureza transversal do Favorito. | Utilizador + qualquer entidade referenciável |
| **Notificação / Atividade** | Um evento relevante para um Utilizador, associado à entidade que o originou (ex: uma tarefa atribuída, uma sugestão de IA pendente). **Parte do âmbito do MVP** em versão simples (Information Architecture, 3.6.3) — é apenas o Centro de Atividade completo (fusão com sugestões de IA, aprovações) que fica para evolução futura, não a notificação básica em si. | Utilizador + entidade de origem |

### 3.4 Diagrama de Relações Conceptuais

O diagrama acima representa as relações entre as entidades fundamentais (3.2). Por clareza visual, os quatro tipos de entidade transversal descritos em 3.3 (Registo de Auditoria, Favorito, Item Recente, Notificação/Atividade) estão agrupados num único nó "Registos Transversais" — a sua natureza genérica (relacionam-se com qualquer entidade referenciável, não apenas com o Utilizador) já está descrita em detalhe na tabela 3.3, e repeti-los individualmente no diagrama diluiria a legibilidade sem acrescentar informação nova. O diagrama mostra hierarquia de pertença (relações fortes, ex: Empresa-Utilizador) e associações (ex: Sugestão de IA-Cliente, opcional). Não representa esquema técnico nem tipos de dados — isso pertence à Fase 3.

### 3.5 Estados de uma Entidade

Formalização do princípio já decidido no Information Architecture (3.3):

| Estado | Significado | Exemplo |
|---|---|---|
| **Não existe** | A Empresa ainda não criou nenhuma instância desta entidade | Uma Empresa nova, sem clientes ainda registados no CRM |
| **Existe, vazia por escolha** | A entidade foi criada mas o utilizador deixou campos opcionais por preencher | Um Cliente criado apenas com o nome, sem histórico de Interações ainda |
| **Existe, com dados** | Estado normal de uso | Um Cliente com histórico de Interações e Tarefas associadas |

Esta distinção é o que permite ao princípio de "estado inicial guiado" (Information Architecture) funcionar corretamente — a interface precisa de saber distinguir o primeiro caso do segundo para decidir se mostra uma ação de criação ou um ecrã normal, ainda que incompleto.

### 3.6 Escopo de Visibilidade (RBAC Aplicado ao Modelo)

Consistente com o Princípio 3 (3.1), cada entidade de negócio deve poder responder, ao nível do modelo, à pergunta "quem pode ver isto": um Colaborador vê apenas os Clientes/Processos que lhe pertencem ou lhe foram atribuídos; um Gestor vê os do seu Departamento/Equipa; um Administrador da Empresa vê todos os da Empresa. Este escopo aplica-se de forma idêntica à navegação normal, à Pesquisa Global e à Command Palette (Information Architecture, 3.6.2 e 3.6.4) — não é uma regra duplicada em cada um, é uma única regra que todos consultam.

### 3.7 Preparação para Evolução Futura

- **Deep Linking** exige que todo identificador de entidade seja único e estável globalmente dentro da Empresa (Princípio 2) — já garantido pelo modelo aqui definido.
- **Escalabilidade Modular** (Information Architecture, 3.6.8): novas entidades de módulos futuros (ex: Documento, no Arco 2) devem poder participar nas relações transversais (Auditoria, Favoritos, Notificações) sem alterar o modelo dessas entidades transversais — é para isso que estas foram desenhadas de forma genérica (3.3).
- **Multi-Empresa por Utilizador** (Workspace Context): a associação Utilizador-Empresa já é modelada como uma relação própria (não um atributo fixo do Utilizador), precisamente para permitir, no futuro, mais do que uma associação por Utilizador sem alterar a estrutura da entidade Utilizador em si.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | A associação Utilizador-Empresa é modelada como relação própria, não como atributo fixo do Utilizador, mesmo sendo 1:1 no MVP | Prepara diretamente a evolução para Workspace Context multi-empresa (Information Architecture, 3.6.1) sem exigir reestruturação do modelo do Utilizador |
| D2 | Auditoria, Favoritos, Itens Recentes e Notificações são modeladas como entidades transversais genéricas, relacionando-se com "qualquer entidade referenciável" em vez de terem uma relação própria com cada entidade de negócio | Permite que novos módulos futuros (Arco 2) participem automaticamente nestas capacidades transversais sem alterar o seu modelo — consistente com a Escalabilidade Modular já aprovada |
| D3 | O modelo distingue formalmente 3 estados de uma entidade (não existe / existe vazia / existe com dados), em vez de apenas existir/não existir | Sem esta distinção de 3 estados, o princípio de "estado inicial guiado" do Information Architecture não seria implementável de forma correta |
| D4 | A visibilidade RBAC é tratada como uma regra única consultada por navegação, Pesquisa Global e Command Palette, não como três implementações separadas | Evita divergência futura entre o que a navegação mostra e o que a pesquisa ou a paleta de comandos revelam — um risco de segurança se implementado de forma duplicada |
| D5 | Adicionada a entidade transversal "Partilha", e confirmado explicitamente que "Notificação/Atividade" pertence ao âmbito do MVP (apenas o Centro de Atividade completo é futuro) | Correção resultante da auditoria de consistência entre Fase 1 e Fase 2: a Information Architecture (Q2) remetia a definição do mecanismo de partilha para este documento, mas nunca tinha sido aqui respondida; e a natureza MVP vs. futura de Notificação/Atividade estava ambígua face às restantes entidades transversais |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | O histórico de Interações do CRM deve ser modelado como parte da entidade Cliente, ou como entidade própria com relação a Cliente? A opção aqui (entidade própria) é a mais flexível, mas deve ser confirmada no Functional Requirements | Functional Requirements, Functional Specifications do CRM | CEO + CTO |
| Q2 | O "porquê" de uma ação, no Registo de Auditoria, é sempre capturável, ou apenas quando a ação tem uma justificação textual associada (ex: uma nota ao rejeitar uma sugestão de IA)? | Functional Requirements, Functional Specifications | CEO + CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 9 entidades fundamentais/transversais, 6 princípios de modelo de dados, e tradução conceptual dos princípios de Workspace Context, Deep Linking e Escalabilidade Modular já aprovados no Information Architecture | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.1 | 2026-07-02 | Correção da auditoria de consistência Fase 1/2: adicionada a entidade transversal "Partilha", resolvendo a Q2 do Information Architecture; confirmado que "Notificação/Atividade" pertence ao âmbito do MVP | CTO (Claude) + Fundadora/CEO |

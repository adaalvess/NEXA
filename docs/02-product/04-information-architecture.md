# NEXA — Information Architecture

| | |
|---|---|
| **Documento** | Information Architecture |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.5 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | PRD v1.0 · User Personas v1.1 · User Journey Maps v1.1 (Aprovados) |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Este documento define a **estrutura de navegação e organização de informação** da NEXA — que áreas existem, como se relacionam, que hierarquia de navegação um utilizador encontra, e como as permissões RBAC moldam o que cada pessoa vê. Traduz os módulos definidos no PRD e as jornadas mapeadas em User Journey Maps numa estrutura navegável concreta, mas sem ainda desenhar ecrãs (isso é âmbito da Fase de UI/UX Design, mais à frente).

### Nota de Clarificação de Âmbito

Information Architecture não é Design de Interface. Este documento responde a "onde é que cada coisa vive e como se chega lá", não a "que aspeto tem cada ecrã" (cores, componentes, layout — isso herda do Brand Book e será desenvolvido na Fase de UI/UX). Também não é o Data Model Conceptual (próximo documento), que descreve entidades e relações de dados, não navegação.

---

## 2. Contexto

A estrutura proposta parte diretamente dos 4 módulos do MVP + fundação já definidos no PRD (3.4), organizados de forma a servir as 4 jornadas já mapeadas (User Journey Maps) sem fricção desnecessária — em particular, a Jornada B (uso diário operacional), que exige que o Colaborador chegue rapidamente ao que precisa, sem navegação profunda.

---

## 3. Conteúdo Estruturado

### 3.1 Mapa de Navegação de Alto Nível

```
NEXA (aplicação autenticada)
├── Dashboard (página inicial após login)
├── Processos e Tarefas
│   ├── Vista geral de projetos/processos
│   ├── Detalhe de processo/tarefa
│   └── Equipas e departamentos (gestão, condicionada por RBAC)
├── CRM
│   ├── Lista de clientes/contactos/oportunidades
│   ├── Detalhe de cliente (histórico de interações, tarefas associadas)
│   └── Pipeline comercial (vista de oportunidades)
├── Assistente de IA
│   ├── Conversa/pergunta livre
│   └── Sugestões pendentes de aprovação (ações propostas, não executadas)
├── Pesquisa Global (transversal, acessível de qualquer ponto — ver 3.6)
├── Configurações
│   ├── Perfil pessoal
│   ├── Empresa (dados, plano, subscrição) — condicionado a Administrador
│   ├── Utilizadores e Permissões — condicionado a Administrador/Gestor
│   └── Departamentos e Equipas — condicionado a Administrador
└── Centro de Atividade (transversal — evolução de Notificações, ver 3.6)
```

### 3.2 Princípios de Arquitetura de Informação

1. **Nenhum módulo é uma ilha.** Consistente com o pilar "Um só lugar, uma só verdade" (Product Vision, 3.5), qualquer entidade (cliente, tarefa) deve ser acessível a partir de mais do que um ponto de navegação — ex: uma tarefa associada a um cliente aparece tanto em Processos como no detalhe desse cliente no CRM.
2. **Profundidade máxima de 3 níveis** para qualquer ação do dia a dia (ex: Dashboard → CRM → Detalhe de Cliente), para servir a Jornada B (Colaborador Operacional), que exige rapidez sem fricção.
3. **A navegação nunca mostra o que a pessoa não pode ver.** Itens de menu condicionados por RBAC não aparecem sequer visíveis-mas-bloqueados — simplesmente não existem para essa pessoa (ex: um Colaborador nunca vê "Configurações → Empresa").
4. **Notificações e Assistente de IA são transversais**, não presos a um módulo — refletindo que ambos operam sobre dados de toda a plataforma (Product Vision, pilar "Inteligência contextual").

### 3.3 Resolução da Questão Q1 (User Journey Maps) — Estados Vazios

O User Journey Maps (Q1) deixou em aberto o comportamento da plataforma quando uma empresa ainda não tem dados suficientes. Este documento resolve-a com uma abordagem fundamentada, por ser uma decisão estrutural que a Information Architecture não pode adiar:

**Princípio adotado:** nenhum ecrã da NEXA mostra um espaço vazio sem orientação. Cada módulo tem um **estado inicial guiado** — em vez de uma lista ou dashboard em branco, a pessoa vê uma ação clara e imediata (ex: "Adicionar o primeiro cliente", "Criar a primeira tarefa"), nunca apenas ausência de conteúdo. Isto é particularmente crítico no Dashboard (ponto de entrada) e liga-se diretamente à hipótese de AHA Moment nº2 identificada no User Journey Maps (3.5) — um Dashboard vazio elimina a possibilidade desse AHA Moment acontecer.

**Consequência para o Data Model Conceptual (próximo documento):** deve ser possível distinguir, para qualquer entidade, entre "não existe ainda" (estado inicial) e "existe mas está vazia por decisão do utilizador" — esta distinção tem impacto direto na forma como os estados vazios são desenhados.

### 3.4 Arquitetura de Informação por Papel RBAC

| Área de navegação | Super Admin | Admin da Empresa | Gestor | Colaborador | Convidado |
|---|---|---|---|---|---|
| Dashboard | Interno (plataforma) | Empresa completa | Equipa/departamento | Pessoal | Não aplicável |
| Processos e Tarefas | — | Total | Da sua equipa | As suas | Se explicitamente partilhado |
| CRM | — | Total | Da sua equipa | Os seus clientes | Se explicitamente partilhado |
| Assistente de IA | — | Sobre toda a empresa | Sobre a sua equipa | Sobre o seu âmbito | Não aplicável |
| Configurações — Empresa | Interno | Sim | Não | Não | Não |
| Configurações — Utilizadores/Permissões | Interno | Sim | Parcial (só a sua equipa) | Não | Não |

*Esta tabela é uma aplicação direta do modelo RBAC já aprovado (Vision Document) à estrutura de navegação — não introduz nenhuma regra de permissão nova. Cada linha desta tabela aplica-se sempre dentro do Workspace Context ativo (3.6.1): as permissões de uma pessoa são sempre relativas à empresa em que está a operar no momento, não a uma soma global de permissões entre empresas.*

### 3.5 Pontos de Entrada e Navegação Cruzada

Refletindo o princípio "nenhum módulo é uma ilha" (3.2), os seguintes pontos de navegação cruzada são requisitos explícitos para o Data Model Conceptual e para a Fase de UI/UX:

- De uma tarefa (Processos) → cliente associado (CRM), se existir associação.
- De um cliente (CRM) → tarefas e processos associados a esse cliente.
- Do Dashboard → qualquer item específico que gerou uma notificação ou alerta.
- Do Assistente de IA → a entidade exata (cliente, tarefa) a que uma resposta ou sugestão se refere.

### 3.6 Capacidades e Princípios Arquiteturais para Evolução Futura

Oito princípios são registados aqui como **capacidades e regras arquiteturais**, não como funcionalidades do MVP — seguindo o mesmo padrão já usado no Product Roadmap (D3: preparar a arquitetura de IA multi-fornecedor desde o MVP, mesmo sem ativar autonomia avançada). O objetivo é que a arquitetura de dados, navegação e URLs, desde a primeira versão, não impeça esta evolução — evitando reconstrução futura.

**3.6.1 Workspace Context (Contexto de Empresa Ativa).** Toda a navegação da NEXA acontece sempre dentro do contexto de uma empresa (tenant) ativa — nunca de forma ambígua ou global a várias empresas em simultâneo. No MVP, cada utilizador está associado a uma única empresa. A arquitetura, no entanto, não deve assumir essa limitação como permanente: a estrutura de rotas, sessão e permissões deve prever, desde já, que um utilizador possa no futuro pertencer a mais do que uma empresa e alternar entre elas (ex: um consultor externo que trabalha com várias PMEs clientes), sem exigir reconstrução do modelo de autenticação ou de navegação.

**3.6.2 Pesquisa Global.** Capacidade transversal de encontrar qualquer entidade relevante (clientes, processos, tarefas, oportunidades e, no futuro, documentos) a partir de um único ponto de pesquisa — consistente com o pilar "Um só lugar, uma só verdade" (Product Vision, 3.5). Os resultados de Pesquisa Global devem respeitar sempre as permissões RBAC de quem pesquisa, e operam sempre dentro do Workspace Context ativo (3.6.1) — nunca pesquisando across várias empresas em simultâneo. A implementação pode ser faseada.

**3.6.3 Centro de Atividade (evolução de Notificações).** A área hoje descrita como "Notificações" é o embrião de um ponto único de acompanhamento que poderá, no futuro, concentrar notificações, aprovações pendentes, sugestões da IA e tarefas atribuídas. No MVP, mantém-se com o âmbito simples de notificações.

**3.6.4 Command Palette (Paleta de Comandos).** Ponto único, acessível por atalho de teclado, para executar ações rapidamente sem percorrer menus — distinta da Pesquisa Global (que encontra informação, não executa ações). Tal como a Pesquisa Global, qualquer ação disponível está sempre limitada pelas permissões RBAC e ao Workspace Context ativo.

**3.6.5 Sistema Global de Favoritos e Itens Recentes.** Qualquer entidade relevante da plataforma (cliente, tarefa, processo, e no futuro documentos ou até um dashboard configurado) deve poder ser marcada como favorita, e a plataforma deve poder apresentar uma lista de itens recentemente utilizados. Tal como as restantes capacidades transversais, favoritos e recentes existem sempre dentro do Workspace Context ativo — um favorito marcado numa empresa não aparece ao alternar para outra. Não é requisito do MVP, mas o modelo de dados de cada entidade deve prever, desde já, a possibilidade de ser referenciada por este sistema sem alteração estrutural futura.

**3.6.6 Navegação Consistente.** Ações globais — Pesquisa Global, Command Palette, Centro de Atividade, Assistente de IA, Ajuda e Perfil — mantêm sempre a mesma posição visual e a mesma forma de acesso em toda a aplicação, independentemente do módulo em que a pessoa se encontra. A interface nunca reorganiza estes elementos entre módulos. Este princípio antecipa diretamente a Fase de UI/UX Design, mas fica fixado aqui como regra de arquitetura de informação, não apenas de estilo visual.

**3.6.7 Deep Linking.** Qualquer entidade importante da plataforma (cliente, processo, tarefa) possui um identificador único e um link permanente, que permite abri-la diretamente a partir de uma notificação, de um email, ou de uma futura integração externa (Product Vision, Arco 3). Um deep link resolve-se sempre dentro do Workspace Context correto (3.6.1) — abrir um link de uma entidade pertencente à Empresa A nunca deve ser possível a partir de uma sessão ativa na Empresa B, mesmo que a pessoa tenha acesso a ambas no futuro.

**3.6.8 Escalabilidade Modular da Navegação.** Novos módulos (Arco 2 do Product Roadmap — gestão documental, financeiro, RH) devem poder ser adicionados à estrutura de navegação (3.1) sem obrigar à reorganização dos módulos já existentes. O mapa de navegação atual é desenhado como uma lista extensível, não como uma estrutura fechada de posições fixas.

Todos os oito princípios acima são citados explicitamente no PRD como fora do âmbito funcional do MVP (3.3) e não alteram essa fronteira — o que muda é que a arquitetura de dados, sessão, navegação e URLs já os tem em conta, para que a sua futura implementação não exija reestruturação.

---

## 4. Decisões Tomadas



| # | Decisão | Justificação |
|---|---|---|
| D1 | Adotado o princípio de "estado inicial guiado" em vez de ecrãs vazios, resolvendo a Questão Q1 do User Journey Maps | Uma decisão estrutural de navegação não pode ficar em aberto sem bloquear o documento seguinte (Data Model Conceptual); a evidência da própria jornada mapeada (risco de abandono no primeiro uso) já era suficientemente forte para fundamentar esta escolha, sem necessidade de esperar por dados de piloto |
| D2 | Notificações e Assistente de IA são elementos transversais da navegação, não presos a nenhum módulo específico | Reflete a sua natureza real — ambos operam sobre dados de múltiplos módulos, e prendê-los a um único módulo contradiria o pilar de integração já aprovado |
| D3 | Profundidade máxima de navegação fixada em 3 níveis para ações do dia a dia | Serve diretamente a Jornada B (Colaborador Operacional), identificada como a mais sensível a fricção de navegação |
| D4 | Pesquisa Global é registada como princípio arquitetural transversal, com o requisito de respeitar RBAC, mas sem comprometer o âmbito do MVP já definido no PRD | Evita reconstrução futura do modelo de dados/indexação, seguindo o mesmo padrão de preparação antecipada já usado na camada de IA (Product Roadmap, D3) |
| D5 | "Notificações" é formalmente identificada como o embrião do futuro "Centro de Atividade", mas mantém-se com âmbito simples no MVP | Regista a direção de evolução sem introduzir complexidade de fusão com Sugestões da IA antes de existir evidência de que essa fusão é o que os utilizadores realmente precisam |
| D6 | Command Palette é registada como princípio de evolução futura, explicitamente distinta da Pesquisa Global (executar vs. encontrar), sempre limitada por RBAC | Evita que os dois conceitos se confundam em documentos futuros (Functional Requirements, UI/UX); mantém a arquitetura preparada sem comprometer o âmbito do MVP |
| D7 | Workspace Context é fixado como o princípio estrutural que todos os restantes princípios de 3.6 herdam (Pesquisa Global, Favoritos, Deep Linking operam sempre dentro dele) | Evita que seja tratado como mais um item avulso da lista — é, na prática, a fundação de que todos os outros dependem, e por isso é o primeiro princípio da secção |
| D8 | Deep Linking é explicitamente ligado ao Workspace Context: um link nunca resolve uma entidade fora do contexto de empresa correto | Sem esta regra, o Deep Linking criaria um vetor de fuga de isolamento multi-tenant — a mesma preocupação de segurança já registada no Vision Document, 3.10 |
| D9 | Escalabilidade Modular da navegação é registada como regra de desenho (lista extensível), não apenas como intenção genérica | Torna o princípio verificável: qualquer proposta de novo módulo pode ser avaliada objetivamente contra esta regra |
| D10 | Navegação Consistente (posição fixa de ações globais) é fixada já na Information Architecture, não adiada para a Fase de UI/UX | Trata-se de uma regra estrutural, não apenas estética — decidir isto cedo evita retrabalho de navegação quando o Design System de componentes for desenvolvido |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | ~~O "estado inicial guiado" (3.3) deve ser idêntico para todos os módulos, ou personalizado por módulo?~~ **Resolvida** — personalizado por módulo, cada módulo passa a sua própria `titulo`/`descricao`/`acaoLabel`/`onAcao` ao componente `EstadoVazioGuiado` (nunca texto fixo interno), já implicitamente confirmado pelo `GET /dashboard` (Passo 12, `sugestoes` distintas por módulo: `criar_processo`, `criar_cliente`) e formalmente decidido na Especificação Técnica do Passo 13 (Design System), §3.6 | Functional Specifications, UI/UX | Resolvida em 2026-07-07 |
| Q2 | ~~O acesso de Convidado a Processos/CRM "se explicitamente partilhado" (3.4) — como é tecnicamente decidido esse partilhamento?~~ **Resolvida** — ver entidade "Partilha", adicionada ao Data Model Conceptual v1.1 (auditoria de consistência Fase 1/2) | Data Model Conceptual, Functional Requirements | Resolvida em 2026-07-02 |
| Q3 | A Pesquisa Global deve ter alguma forma simples já no MVP (ex: pesquisa por módulo), ou fica inteiramente para o Arco 2, com apenas a preparação arquitetural feita agora? | Functional Requirements, Product Roadmap | CEO + CTO, a decidir no Functional Requirements |
| Q4 | Quando o Workspace Context evoluir para suportar múltiplas empresas por utilizador, a mudança de contexto deve ser um seletor visível permanentemente (ex: como em ferramentas de workspace conhecidas) ou um fluxo mais discreto? | UI/UX Design futuro | CEO + CTO, a decidir apenas quando este cenário se tornar relevante |
| Q5 | O Sistema Global de Favoritos deve, no futuro, ser pessoal (por utilizador) ou também poder ser partilhado ao nível da equipa/empresa? | Data Model Conceptual futuro | CEO, a decidir apenas quando esta capacidade for priorizada |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com mapa de navegação, princípios de IA, resolução fundamentada da Questão Q1 do User Journey Maps, e arquitetura de informação por papel RBAC | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada secção 3.6, registando Pesquisa Global e Centro de Atividade (evolução de Notificações) como princípios arquiteturais transversais, sem alterar o âmbito funcional do MVP já definido no PRD | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | Adicionada Command Palette à secção 3.6, como terceiro princípio de evolução futura, explicitamente distinguida da Pesquisa Global (executar ações vs. encontrar informação) | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | Reorganizada a secção 3.6 em 8 subsecções numeradas; adicionados os princípios Workspace Context, Sistema Global de Favoritos e Itens Recentes, Navegação Consistente, Deep Linking e Escalabilidade Modular; Workspace Context fixado como fundação de que os restantes princípios (Pesquisa, Favoritos, Deep Linking) dependem explicitamente | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.4 | 2026-07-02 | Correção da auditoria de consistência Fase 1/2: Q2 marcada como resolvida, com referência à entidade "Partilha" adicionada ao Data Model Conceptual v1.1 | CTO (Claude) + Fundadora/CEO |
| 1.5 | 2026-07-07 | Q1 marcada como resolvida — estado inicial guiado personalizado por módulo, decisão formalizada na Especificação Técnica do Passo 13 (Design System) e já implicitamente implementada pelo `GET /dashboard` do Passo 12; esta correção fecha o ciclo entre a decisão tomada na Especificação Técnica e o documento de origem da questão, que tinha ficado por atualizar | CTO (Claude) + Fundadora/CEO |

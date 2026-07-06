# NEXA — Glossário Oficial da Plataforma

| | |
|---|---|
| **Documento** | Glossário Oficial da Plataforma |
| **Fase** | 2 — Documentação Funcional (iniciado) |
| **Versão** | 1.6 |
| **Estado** | ✅ Aprovado — Vivo (atualizado continuamente) |
| **Owner** | Fundadora / CEO / Product Owner |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento fixa a terminologia oficial e única da NEXA — o significado exato de cada termo usado em toda a documentação, para eliminar ambiguidade entre documentos, entre pessoas, e entre gerações futuras de equipa. Ao contrário de todos os outros documentos, este **não é fechado por fase** — é alimentado continuamente à medida que novos documentos introduzem conceitos que precisam de definição única.

**Regra de manutenção:** sempre que um novo documento introduzir um termo específico da NEXA (não um termo genérico de mercado), esse termo é adicionado aqui no mesmo momento, com referência ao documento de origem. Nenhum termo deve ter duas definições diferentes em dois documentos.

---

## 2. Termos

| Termo | Definição | Origem |
|---|---|---|
| **NEXA** | Sistema Operacional Inteligente para Empresas — a plataforma no seu todo | Vision Document |
| **PME** | Pequena e Média Empresa, entre 5 e 250 colaboradores — o cliente-alvo da NEXA | Product Vision |
| **Caos operacional** | Estado de desorganização de uma empresa causado por ferramentas dispersas, processos manuais e informação fragmentada — o problema central que a NEXA resolve | Vision Document |
| **Empresa piloto** | Empresa que participa na fase de validação inicial da NEXA (10-50 empresas, Horizonte 1-2) | Business Goals |
| **Tenant** | Uma empresa cliente dentro da plataforma NEXA, com o seu ambiente isolado, seguro e configurável | Discovery / Vision Document |
| **Multi-tenant** | Modelo de arquitetura em que múltiplos tenants (empresas) partilham a mesma infraestrutura, com isolamento lógico de dados entre si | Vision Document, 3.10 |
| **Trial** | Período experimental gratuito de 14 dias antes da subscrição paga | Business Goals |
| **MVP** | Minimum Viable Product — a primeira versão lançável da NEXA, com os 4 módulos core | Product Vision |
| **Módulo** | Unidade funcional autocontida da plataforma (ex: CRM, Dashboard) que partilha dados e permissões com os restantes módulos | Product Vision, 3.6 |
| **Arco** | Fase evolutiva macro do produto (Arco 1: Núcleo Operacional; Arco 2: Expansão Modular; Arco 3: Conectividade; Arco 4: Autonomia Agêntica) | Product Vision, 3.6 |
| **Horizonte** | Janela temporal de referência dos Business Goals (H1: 0-6 meses; H2: 6-12 meses; H3: 12-24 meses) | Business Goals |
| **North Star** | O objetivo de negócio único que enquadra todos os restantes objetivos na fase atual | Business Goals, 3.1 |
| **RBAC** | Role-Based Access Control — modelo de permissões baseado em papéis (Super Admin, Admin da Empresa, Gestor, Colaborador, Convidado), com regras granulares adicionais definidas por cada empresa | Discovery / Vision Document |
| **Autonomia de IA — Nível A** | O Assistente de IA responde a perguntas e gera insights, sem propor nem executar ações | Discovery |
| **Autonomia de IA — Nível B** | O Assistente de IA propõe ações, mas nunca as executa sem confirmação explícita do utilizador — nível implementado no MVP | Discovery |
| **Autonomia de IA — Nível C** | O Assistente de IA executa ações de forma autónoma, com base em regras ou iniciativa própria — nível futuro, não implementado no MVP, sujeito a validação (ver Business Goals, H3.3) | Discovery |
| **Auditoria (sistema de)** | Registo completo de quem fez o quê, quando, e porquê, para ações humanas e de IA na plataforma | Vision Document, 3.10 |
| **Dark Tech Premium** | Conceito de identidade visual da NEXA — preto, cinza escuro, roxo elétrico, minimalista e sofisticado | Brand Book, 3.1 |
| **Security & Privacy by Design** | Princípio segundo o qual segurança e privacidade são incorporadas desde a conceção de cada funcionalidade, nunca adicionadas a posteriori | Vision Document, 3.10 |
| **ICP (Ideal Customer Profile)** | Perfil de cliente-alvo da NEXA — PME europeia, 5-250 colaboradores, foco inicial em serviços, consultoria, tecnologia, imobiliário, investimentos, logística, comércio | Product Vision, 2 |
| **Persona** | Perfil representativo de um tipo de utilizador real da NEXA, com contexto, objetivos e frustrações próprias — distinto de um papel RBAC, que é apenas uma estrutura de permissões técnicas | User Personas, 1 |
| **AHA Moment** | O momento, durante o trial de 14 dias, em que a empresa percebe de forma clara e inequívoca o valor da NEXA — evento candidato a instrumentação formal como indicador de conversão | User Journey Maps, 3.5 |
| **Estado inicial guiado** | Princípio de arquitetura de informação segundo o qual nenhum ecrã da NEXA mostra um espaço vazio sem orientação — em vez de ausência de conteúdo, a pessoa vê sempre uma ação clara e imediata | Information Architecture, 3.3 |
| **Pesquisa Global** | Capacidade transversal, registada como princípio arquitetural, de encontrar qualquer entidade relevante da plataforma a partir de um único ponto de pesquisa, respeitando sempre as permissões RBAC de quem pesquisa | Information Architecture, 3.6 |
| **Centro de Atividade** | Evolução futura registada para a área de Notificações — um ponto único que poderá concentrar notificações, aprovações pendentes, sugestões da IA e tarefas atribuídas; no MVP mantém-se com âmbito simples de notificações | Information Architecture, 3.6 |
| **Command Palette** | Ponto único, acessível por atalho de teclado, para executar ações rapidamente sem percorrer menus — distinto da Pesquisa Global (que encontra informação, não executa ações); registada como direção futura, sempre limitada por RBAC | Information Architecture, 3.6 |
| **Workspace Context** | O contexto de empresa (tenant) ativa dentro do qual toda a navegação, pesquisa e permissões de um utilizador operam — princípio fundacional de que dependem Pesquisa Global, Favoritos e Deep Linking | Information Architecture, 3.6.1 |
| **Deep Linking** | Capacidade de qualquer entidade importante (cliente, processo, tarefa) possuir um identificador único e um link permanente, sempre resolvido dentro do Workspace Context correto | Information Architecture, 3.6.7 |

---

## 3. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com os termos já cristalizados ao longo da Fase 1 — Documentação Estratégica | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial como referência de terminologia da NEXA.** Estado passa a Aprovado — Vivo | Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionados os termos "ICP" e "Persona", introduzidos pelo documento User Personas (Fase 2) | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | Adicionado o termo "AHA Moment", introduzido pelo documento User Journey Maps (Fase 2) | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | Adicionado o termo "Estado inicial guiado", introduzido pelo documento Information Architecture (Fase 2) | CTO (Claude) + Fundadora/CEO |
| 1.4 | 2026-07-02 | Adicionados os termos "Pesquisa Global" e "Centro de Atividade", registados como princípios arquiteturais transversais no Information Architecture | CTO (Claude) + Fundadora/CEO |
| 1.5 | 2026-07-02 | Adicionado o termo "Command Palette", registado como direção futura da experiência de utilização no Information Architecture | CTO (Claude) + Fundadora/CEO |
| 1.6 | 2026-07-02 | Adicionados os termos "Workspace Context" e "Deep Linking", introduzidos pela reorganização da secção 3.6 do Information Architecture | CTO (Claude) + Fundadora/CEO |

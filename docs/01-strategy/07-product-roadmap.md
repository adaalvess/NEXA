# NEXA — Product Roadmap

| | |
|---|---|
| **Documento** | Product Roadmap |
| **Fase** | 1 — Documentação Estratégica |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Product Vision v1.1 · Business Goals v1.0 · Success Metrics (KPIs) v1.0 (todos Aprovados) |
| **Natureza** | Documento vivo — revisto a cada transição de horizonte ou major learning do piloto |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define o **mapa macro de construção do produto** ao longo do tempo — que capacidades existem em que fase, e em que ordem, para que os objetivos definidos no Business Goals se tornem alcançáveis. Fecha a Fase 1 (Documentação Estratégica) ao traduzir a visão, os pilares de produto e os objetivos de negócio já aprovados numa sequência concreta de construção.

### Nota de Clarificação de Âmbito

Para completar a cadeia de fronteiras já estabelecida nos documentos anteriores:

| Documento | Responde a... |
|---|---|
| **Business Goals** | O que queremos alcançar, e até quando (metas de negócio) |
| **Success Metrics (KPIs)** | Como medimos o progresso rumo a essas metas |
| **Product Roadmap** (este documento) | Que capacidades de produto, em que ordem, tornam essas metas alcançáveis |
| **Épicos / Features / Milestones / Sprints** (Fase 4 — Planeamento, documentos futuros) | O detalhe tático de implementação de cada capacidade — fora de âmbito aqui |

Este Roadmap trabalha ao nível de **Arcos e Módulos** (a mesma linguagem já estabelecida no Product Vision, secção 3.6), não ao nível de tarefas individuais. Quando chegarmos à Fase 4, cada item deste Roadmap será decomposto em épicos e features concretas — mas essa decomposição não pertence a este documento.

---

## 2. Contexto

O Product Vision (secção 3.6) já definiu 4 arcos evolutivos de alto nível — Núcleo Operacional, Expansão Modular, Conectividade, Autonomia Agêntica. Este Roadmap dá a esses arcos um enquadramento temporal explícito, alinhado com os 3 horizontes já aprovados no Business Goals, e acrescenta o detalhe de que módulos e capacidades específicas compõem cada arco — sem ainda comprometer datas rígidas além do que já foi validado na fase de Discovery (lançamento do MVP em ~6 meses).

---

## 3. Conteúdo Estruturado

### 3.1 Princípio Orientador do Roadmap

Consistente com o valor "Rigor Antes de Velocidade" (Mission & Values, 3.3) e com a decisão D3 do Business Goals (metas ajustáveis com dados reais), este Roadmap é deliberadamente mais detalhado no horizonte próximo (0-6 meses) e mais aberto nos horizontes seguintes — não porque o produto de longo prazo seja menos importante, mas porque comprometer detalhe além do que a evidência permite seria contrário ao valor "Ambição com Humildade".

**Este Roadmap é orientado por resultados e validação, não por calendário.** Os horizontes temporais (0-6, 6-12, 12-24 meses) são estimativas de referência, não compromissos rígidos. A progressão de um horizonte para o seguinte depende do cumprimento dos objetivos definidos no Business Goals e da leitura dos indicadores estabelecidos no Success Metrics (KPIs) — não da simples passagem do tempo. Concretamente: se, ao fim de 6 meses, os critérios de sucesso do Horizonte 1 (ex: H1.1-H1.3) ainda não estiverem cumpridos, a NEXA permanece no Horizonte 1 até estarem — a data por si só nunca é motivo suficiente para avançar de fase. Da mesma forma, uma transição pode acontecer mais cedo do que o estimado se a evidência já justificar avançar (ex: se a decisão de H3.3 sobre autonomia de IA reunir evidência suficiente antes do fim do Horizonte 2). O calendário serve para planeamento e comunicação; a evidência é sempre o critério de decisão real.

### 3.2 Mapa de Arcos × Horizontes

| Arco (Product Vision, 3.6) | Horizonte (Business Goals) | Estado neste momento |
|---|---|---|
| Arco 1 — Núcleo Operacional | Horizonte 1 (0-6 meses) | Em especificação (Fase 2, a seguir a este documento) |
| Arco 2 — Expansão Modular | Horizonte 3 (12-24 meses), com preparação a partir do Horizonte 2 | Não iniciado — depende de aprendizagem do piloto |
| Arco 3 — Conectividade | Horizonte 3 em diante | Não iniciado — explicitamente fora de âmbito do MVP (Business Goals, 3.4) |
| Arco 4 — Autonomia Agêntica | Avaliação no final do Horizonte 2; execução no Horizonte 3, se validado | Decisão pendente de evidência (H3.3) |

### 3.3 Detalhe do Arco 1 — Núcleo Operacional (Horizonte 1, 0-6 meses)

Este é o único arco com detalhe suficiente para orientar a construção imediata. Está organizado em três etapas sequenciais, refletindo dependências técnicas reais (não apenas prioridade de negócio):

**Etapa 1.1 — Fundação da Plataforma**
Base técnica sem a qual nenhum módulo funcional pode ser construído com segurança:
- Arquitetura multi-tenant com isolamento lógico
- Sistema de autenticação e gestão de utilizadores
- Sistema de permissões granular (papéis, departamentos, regras por empresa)
- Sistema de auditoria (base para todos os módulos posteriores)
- Instrumentação de analytics/telemetria (conforme Success Metrics, 3.6)

**Etapa 1.2 — Módulos Funcionais Core**
Construídos sobre a fundação da Etapa 1.1, e desenhados para partilhar dados entre si desde o início:
- Gestão de Processos e Tarefas
- CRM Inteligente
- Dashboard Inteligente (depende parcialmente dos dois anteriores, por agregar informação de ambos)

**Etapa 1.3 — Camada de Inteligência**
Construída por último dentro deste arco, porque depende de existir informação real nos módulos anteriores para ter algo relevante sobre o que responder:
- Assistente de IA (nível consultivo + ações supervisionadas)
- Camada de abstração multi-fornecedor de IA (arquitetura preparada desde já para múltiplos fornecedores, conforme Discovery Pergunta 4)
- Sistema de políticas de autonomia por empresa (preparação arquitetural para o Arco 4, mesmo sem o expor ainda ao utilizador)

**Etapa 1.4 — Preparação Comercial**
Em paralelo com o final da Etapa 1.3, para que o lançamento com empresas piloto seja possível:
- Sistema de planos e subscrições (Starter/Professional/Enterprise)
- Fluxo de trial de 14 dias
- Faturação simples (conforme Discovery, preparada para integração futura com sistemas de pagamento)

### 3.4 Visão de Alto Nível — Arcos 2 a 4 (Horizontes 2 e 3)

Mantidos propositadamente ao nível de intenção, não de especificação, até existir evidência do piloto:

- **Arco 2 (Expansão Modular):** candidatos identificados na fase de Discovery incluem gestão documental, módulo financeiro e módulo de RH — a ordem exata de construção destes módulos deve ser decidida com base no feedback qualitativo recolhido em H2.3/H2.4 (Success Metrics), não definida antecipadamente neste documento.
- **Arco 3 (Conectividade):** candidatos identificados na fase de Discovery incluem Microsoft Outlook, Google Workspace, WhatsApp Business, Microsoft Teams, Slack, armazenamento documental, assinatura digital, e ferramentas de faturação/ERP europeias — a priorização entre estas dependerá de quais integrações as empresas piloto mais pedirem.
- **Arco 4 (Autonomia Agêntica):** a decisão sobre iniciar este arco é, ela própria, um objetivo do Roadmap (H3.3), não uma certeza planeada — este Roadmap regista a intenção arquitetural de estar preparado para esta evolução (ver Etapa 1.3), sem comprometer a sua execução antes de existir evidência suficiente.

### 3.5 O Que Este Roadmap Não Compromete

Para evitar interpretações erradas por parte de uma equipa futura:

- Não compromete datas específicas além do lançamento do MVP em ~6 meses (já validado no Business Goals).
- Não compromete a ordem exata de construção dos Arcos 2 e 3 — apenas a lista de candidatos identificados até agora.
- Não substitui os futuros documentos de Épicos, Features, Milestones e Sprints (Fase 4), que vão conter o detalhe de execução tática.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | O Arco 1 é decomposto em 4 etapas sequenciais (Fundação → Módulos Core → Camada de Inteligência → Preparação Comercial), refletindo dependências técnicas reais | Uma equipa (ou o próprio Claude Code) que siga esta sequência evita construir módulos sobre uma fundação de permissões/auditoria ainda inexistente — reduz retrabalho |
| D2 | Os Arcos 2, 3 e 4 são mantidos deliberadamente sem especificação detalhada neste documento | Consistente com o princípio orientador (3.1) — comprometer detalhe sem evidência do piloto contradiria o valor "Ambição com Humildade" |
| D3 | A camada de abstração multi-fornecedor de IA e o sistema de políticas de autonomia são construídos já na Etapa 1.3 do MVP, mesmo que a autonomia avançada (Arco 4) só seja avaliada depois | Evita reconstrução futura da arquitetura de IA — consistente com a decisão já tomada no Vision Document de preparar a arquitetura para agentes autónomos desde o primeiro dia |
| D4 | A progressão entre horizontes é determinada pelo cumprimento de objetivos (Business Goals) e indicadores (Success Metrics), não pela passagem de tempo | Evita o erro comum de tratar um roadmap como compromisso de calendário; protege a fase de validação de pressão artificial para "avançar" sem evidência suficiente |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Deve a priorização dentro do Arco 2 (módulos candidatos) ser decidida por votação/procura das próprias empresas piloto, ou por critério estratégico definido pela CEO? | Roadmap futuro, relação com clientes piloto | CEO, a decidir antes do final do Horizonte 2 |
| Q2 | Este Roadmap deve ser partilhado (mesmo que parcialmente) com as empresas piloto como forma de gestão de expectativas, ou mantido como documento interno? | Comunicação com clientes, gestão de expectativas | CEO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, traduzindo os Arcos do Product Vision e os Horizontes do Business Goals num mapa de construção do Arco 1 detalhado por etapas, com Arcos 2-4 mantidos ao nível de intenção estratégica | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada nota explícita (3.1) e Decisão D4 reforçando que a progressão entre horizontes é orientada por resultados e validação (Business Goals + Success Metrics), não por calendário | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

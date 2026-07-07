# NEXA — Product Vision

| | |
|---|---|
| **Documento** | Product Vision |
| **Fase** | 1 — Documentação Estratégica |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documento de referência** | Vision Document v1.1 (Aprovado) |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Este documento traduz a visão fundacional da NEXA (definida no Vision Document) num **produto concreto**: o que a NEXA é enquanto software, que problema resolve no dia a dia de uma PME, como se posiciona e diferencia face à concorrência existente, e que forma o produto toma ao longo do tempo. Serve de ponte entre a ambição da empresa e os requisitos detalhados que serão especificados no Product Requirements Document (PRD), na Fase 2.

Qualquer decisão de produto tomada a partir deste ponto deve ser coerente com o Vision Document v1.1 — em caso de conflito, o Vision Document prevalece e este documento deve ser revisto.

---

## 2. Contexto

O mercado de software para PMEs está, hoje, dividido em duas grandes categorias, nenhuma das quais resolve completamente o problema que a NEXA se propõe a atacar:

- **Ferramentas de produtividade "best-of-breed"** (ex: monday.com, ClickUp, HubSpot, Notion, Asana) — excelentes na sua categoria (gestão de tarefas, CRM, ou documentos), mas que obrigam a PME a compor manualmente um "stack" de várias ferramentas, com integrações frágeis e dados fragmentados entre si.
- **Sistemas ERP tradicionais** (ex: Odoo, SAP Business One, Microsoft Dynamics 365 Business Central) — mais completos e integrados nativamente, mas historicamente pesados, caros, dependentes de implementação técnica especializada, e desenhados como sistemas de registo, não como camadas de inteligência operacional pensadas para o utilizador do dia a dia.

Nos últimos meses, começou a emergir uma terceira categoria — plataformas que combinam a integração nativa de um ERP com uma camada de IA agente que executa trabalho autonomamente, com aprovação do utilizador. Esta é a categoria mais próxima da visão da NEXA, e é por isso analisada em detalhe na secção 3.4.

---

## 3. Conteúdo Estruturado

### 3.1 O Produto em Uma Frase

> A NEXA é o Sistema Operacional Inteligente onde uma PME organiza a sua operação, gere os seus clientes e toma decisões — com uma IA que entende o negócio como um todo e ajuda a executá-lo, sempre sob o controlo do utilizador.

### 3.2 Proposta de Valor

| Para... | PMEs europeias (5-250 colaboradores) que gerem a sua operação de forma fragmentada, entre folhas de cálculo, ferramentas dispersas e processos informais |
|---|---|
| **Que precisam de...** | Organizar processos, centralizar informação de clientes, ter visibilidade real sobre a operação, e tomar decisões mais rápidas e informadas |
| **A NEXA é...** | Um Sistema Operacional Inteligente para Empresas — uma plataforma única, não um conjunto de módulos desconexos |
| **Que...** | Integra Dashboard, Gestão de Processos, CRM e um Assistente de IA numa base de dados e num modelo de permissões comuns, para que a informação flua sem fricção entre áreas da empresa |
| **Ao contrário de...** | Ferramentas de produtividade avulsas (que exigem integrações manuais e frágeis) ou de ERPs tradicionais (pesados, caros, dependentes de implementação técnica) |
| **A NEXA oferece...** | O poder de integração de um ERP com a simplicidade de uso e a inteligência de uma ferramenta moderna nativa em IA — pronta a usar em dias, não em meses |

### 3.3 Porque Agora (Why Now)

Três condições convergem neste momento e tornam a NEXA possível e oportuna:

1. **A IA generativa e agêntica atingiu maturidade suficiente** para compreender contexto de negócio real e propor ações úteis, sem exigir treino de modelos próprios ou equipas de ciência de dados — algo impensável há poucos anos para uma PME.
2. **A infraestrutura cloud moderna tornou trivial construir plataformas multi-tenant seguras e escaláveis** com custos operacionais que uma startup consegue suportar, nivelando o campo de jogo entre startups ágeis e grandes fornecedores de ERP.
3. **As PMEs europeias estão sob pressão crescente de eficiência** (custos de contratação, concorrência, digitalização acelerada pós-pandemia) que as torna, pela primeira vez em massa, recetivas a repensar como operam — não apenas a adicionar mais uma ferramenta.

### 3.4 Panorama Competitivo — Conclusões Estratégicas

O mercado de software para PMEs divide-se hoje em três grandes categorias: ferramentas de produtividade especializadas que se expandem lateralmente (ex: monday.com, ClickUp, HubSpot), ERPs tradicionais modulares (ex: Odoo, SAP Business One, Microsoft Dynamics 365 Business Central), e uma categoria emergente de plataformas nativas de IA que combinam integração nativa com agentes supervisionados. A análise completa, com fontes e comparação detalhada, está documentada em separado no **Competitive Analysis** (ver `/docs/01-strategy/03-competitive-analysis.md`), para que este documento se mantenha focado em conclusões estratégicas duradouras, e não em observações de mercado que mudam mês a mês.

As conclusões que moldam diretamente o posicionamento da NEXA são:

1. **Existe uma lacuna estrutural clara entre as duas categorias estabelecidas.** As ferramentas de produtividade oferecem simplicidade de adoção mas fragmentação de dados entre módulos; os ERPs tradicionais oferecem integração nativa mas exigem implementação pesada e tratam frequentemente a IA como um extra pago, não como uma capacidade central. A NEXA posiciona-se deliberadamente nesta lacuna: integração nativa desde o núcleo, com a simplicidade de adoção de uma ferramenta moderna.
2. **O mercado já validou externamente o modelo de autonomia supervisionada como via de confiança para PMEs.** Já surgiram, no mercado europeu, os primeiros exemplos de plataformas que combinam ERP com agentes de IA que aguardam aprovação do utilizador antes de agir — confirmando que este é o modelo certo para gerar adoção, e não apenas uma opção conservadora da NEXA.
3. **Depender da arquitetura de terceiros (ex: construir sobre um ERP existente) é uma escolha estratégica com trade-offs, não um atalho gratuito.** Alguns concorrentes emergentes optam por construir a sua camada de IA sobre ERPs já estabelecidos, ganhando velocidade de lançamento mas perdendo controlo total sobre a arquitetura e a experiência. A NEXA opta conscientemente pelo caminho inverso (ver Decisão D2).

Porque este é um mercado em movimento rápido — com novos entrantes e mudanças de posicionamento a acontecerem em meses, não em anos — o Competitive Analysis será o documento vivo, revisto periodicamente, que sustenta estas conclusões; este Product Vision mantém-se estável enquanto a estratégia de fundo não mudar.

### 3.5 Pilares do Produto

Estes pilares traduzem o Manifesto NEXA (Vision Document, secção 3.8) em critérios concretos de decisão de produto:

1. **Um só lugar, uma só verdade** — qualquer informação (um cliente, uma tarefa, um processo) existe uma única vez na plataforma e é partilhada por todos os módulos que a usam.
2. **Inteligência contextual, não genérica** — o Assistente de IA responde e sugere com base em dados reais da empresa, nunca com respostas genéricas desligadas do contexto.
3. **Controlo antes de automação** — cada empresa decide o nível de autonomia da IA; a plataforma nunca assume autonomia por defeito.
4. **Rápido a adotar, sem fricção de implementação** — ao contrário dos ERPs tradicionais, a NEXA deve poder começar a gerar valor em dias, não em meses.
5. **Cresce com a empresa** — os mesmos módulos servem uma empresa de 5 pessoas e, com configuração diferente, uma de 250, sem exigir migração de sistema.
6. **Modularidade sem perda de integração** — cada empresa pode ativar apenas os módulos de que necessita, pagando e configurando apenas o que usa, sem que isso comprometa a integração nativa entre os módulos que efetivamente utiliza. Modularidade é uma opção de configuração, nunca um sistema de "silos" desconectados.
7. **Aprendizagem e adaptação contínua** — a NEXA não se limita a registar o que o utilizador introduz; observa padrões de uso, processos recorrentes e decisões tomadas ao longo do tempo, para sugerir ajustes, automações e melhorias cada vez mais alinhadas com a forma real de trabalhar de cada empresa. A plataforma torna-se mais útil e mais precisa quanto mais é usada — nunca estática desde o primeiro dia de configuração.

### 3.5a A Camada de Inteligência Operacional (o que diferencia a NEXA)

A organização de processos, clientes e informação — hierarquias, listas, quadros, filtros — já existe, bem executada, em várias plataformas do mercado (ClickUp, Notion, e outras citadas no Competitive Analysis). Não é aí que a NEXA se diferencia. O que ainda é raro é um sistema que **compreenda a operação da empresa como um todo e ajude quem a gere a tomar melhores decisões** — não apenas registar o que já aconteceu, mas responder a perguntas como:

- "O que está atrasado?"
- "Qual equipa está sobrecarregada?"
- "Qual cliente corre maior risco de abandono?"
- "Que processo está a bloquear o crescimento da empresa?"
- "Que tarefas posso automatizar hoje?"
- "Quais são as três prioridades desta semana?"

Estas perguntas ilustram concretamente a Autonomia de Nível A já definida no Glossário ("o Assistente de IA responde a perguntas e gera insights, sem propor nem executar ações") — até agora descrita apenas em abstrato.

**Princípio de afetação de esforço (40/60):** como bússola de priorização de produto, não como métrica operacional rígida — aproximadamente 40% do valor da NEXA vem de organização bem executada; 60% vem da camada de inteligência própria (IA, automação, análise, recomendações, previsões, coordenação). Sempre que houver dúvida entre investir em mais uma funcionalidade de organização ou aprofundar a camada de inteligência, a segunda ganha por defeito.

**Profundidade progressiva, nunca complexidade por defeito:** toda funcionalidade avançada é desenhada para ter uma experiência simples por defeito, expansível apenas para quem realmente precisa dessa profundidade — extensão, ao nível de desenho de funcionalidade, do princípio já fixado para decisões técnicas (Blueprint, 5a) e coerente com o Pilar 4 (3.5).

Esta camada é o que permite à NEXA ser lida não como concorrente direto de ferramentas de produtividade, mas como uma categoria diferente — um Sistema Operacional Inteligente para Empresas.

### 3.6 Evolução do Produto ao Longo do Tempo

Esta é uma visão de arcos evolutivos, não um roadmap detalhado (que será formalizado no documento Product Roadmap):

- **Arco 1 — Núcleo Operacional (MVP):** Dashboard, Gestão de Processos e Tarefas, CRM, Assistente de IA consultivo/supervisionado. Objetivo: provar que a integração nativa entre estes módulos gera valor mensurável face a ferramentas fragmentadas.
- **Arco 2 — Expansão Modular:** novos módulos (ex: gestão documental, financeiro, RH) construídos sobre a mesma base de dados e modelo de permissões, sem alterar a arquitetura central.
- **Arco 3 — Conectividade:** integrações com o ecossistema já existente das PMEs (email, calendário, WhatsApp Business, faturação/ERP), permitindo que a NEXA absorva dados de fora sem deixar de ser o centro de decisão.
- **Arco 4 — Autonomia Agêntica:** evolução do Assistente de IA para um verdadeiro sistema de agentes autónomos, com políticas de autonomia por empresa. O mercado já dá os primeiros sinais desta tendência (ver Competitive Analysis), o que reforça a validade da direção — mas a vantagem da NEXA está em já ter, desde o Arco 1, a arquitetura de auditoria e permissões preparada para esta evolução, em vez de a construir a posteriori.

### 3.7 Métricas de Sucesso do Produto

Ao nível de produto (distintas dos KPIs de negócio, que serão detalhados no documento Success Metrics), o sucesso do produto mede-se por:

- **Profundidade de adoção multi-módulo** — % de empresas ativas que usam 3 ou mais módulos regularmente (prova da tese de integração, não de um único módulo "vencedor" isolado).
- **Redução de ferramentas externas** — indicador qualitativo/reportado de quantas ferramentas dispersas (Excel, apps de mensagens) uma empresa deixa de usar após adotar a NEXA.
- **Taxa de interação com o Assistente de IA** — frequência de uso e proporção de sugestões da IA aceites pelo utilizador (indicador de confiança real, não apenas de uso).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | A NEXA posiciona-se na categoria emergente "plataforma nativa de IA operacional", entre as ferramentas best-of-breed e os ERPs tradicionais, e não compete diretamente em nenhuma das duas categorias estabelecidas | É onde existe o maior espaço de diferenciação real — ver Competitive Analysis para a evidência de mercado que sustenta esta conclusão |
| D2 | A NEXA constrói uma arquitetura própria, não uma camada sobre um ERP de terceiros | Dá controlo total sobre a experiência, o modelo de dados e a evolução para agentes autónomos, ao custo de mais esforço de construção do núcleo — troca aceite dado o horizonte de 6 meses definido para o MVP e a ambição de longo prazo da empresa |
| D3 | A confiança (autonomia da IA sempre supervisionada e configurável) é tratada como vantagem competitiva central, não apenas como restrição de segurança | Já existe validação de mercado de que este é o modelo que gera adoção em PMEs — a NEXA reforça esta aposta em vez de a tratar como limitação temporária |
| D4 | A análise competitiva detalhada passa a viver num documento próprio (Competitive Analysis), revisto periodicamente, separado das conclusões estratégicas estáveis deste documento | O mercado de IA aplicada a operações empresariais muda em meses; separar "o que observamos hoje" de "o que decidimos por causa disso" protege o Product Vision de ficar desatualizado ou excessivamente ancorado num concorrente específico |
| D5 | A NEXA aloca esforço de produto segundo o princípio 40% organização / 60% inteligência própria, com 6 perguntas canónicas de Nível A como ilustração de referência (3.5a) | Clarifica e consolida, sem alterar, a direção estratégica já presente no Pilar 2 e no Glossário; evita que a organização (replicável por qualquer concorrente) seja tratada como prioridade igual à inteligência (o que é difícil de replicar) |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Que cadência de vigilância competitiva (trimestral? semestral?) deve a NEXA manter, dado o ritmo de mudança observado na categoria emergente de plataformas nativas de IA operacional? | Estratégia, atualização do Competitive Analysis | CEO |
| Q2 | Deve o "Arco 3 — Conectividade" ser antecipado se a pressão competitiva de plataformas já integradas com ecossistemas (email, WhatsApp) se tornar um obstáculo à adoção nos pilotos? | Roadmap, PRD | CEO + CTO, após feedback dos pilotos |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, incluindo análise competitiva baseada em pesquisa de mercado atual (monday.com, ClickUp, HubSpot, Odoo, Knowlix) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Revisão de aprovação: análise competitiva detalhada movida para documento próprio (Competitive Analysis), mantendo aqui apenas conclusões estratégicas estáveis; reduzida a dependência de um concorrente específico como referência central; adicionados os pilares "Modularidade sem perda de integração" e "Aprendizagem e adaptação contínua" | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.2 | 2026-07-07 | Adicionada a secção 3.5a — "A Camada de Inteligência Operacional", clarificando e consolidando (sem alterar) a direção estratégica já presente no Pilar 2 e no Glossário: princípio de afetação de esforço 40% organização / 60% inteligência própria, 6 perguntas canónicas de Nível A como ilustração de referência, e o princípio de "profundidade progressiva, nunca complexidade por defeito". Adicionada Decisão D5 | Fundadora/CEO + CTO (Claude) |

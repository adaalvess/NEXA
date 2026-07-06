# NEXA — Business Goals

| | |
|---|---|
| **Documento** | Business Goals |
| **Fase** | 1 — Documentação Estratégica |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Vision Document v1.1 · Product Vision v1.1 · Mission & Values v1.1 (todos Aprovados) |
| **Horizonte temporal** | 12-24 meses (fase de validação, conforme Mission & Values, 3.1) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define os **objetivos de negócio concretos** da NEXA para o horizonte atual — o que a empresa se compromete a alcançar, e até quando, para considerar que a fase de validação foi bem-sucedida e que está pronta para a fase seguinte (expansão). Serve de ponte entre a Missão (o que fazemos e porquê, na fase atual) e o próximo documento, Success Metrics (KPIs), que define como cada um destes objetivos será medido em detalhe.

### Nota de Clarificação de Âmbito

Para evitar a sobreposição já identificada e corrigida noutros pares de documentos (Product Vision ↔ Competitive Analysis; Mission & Values ↔ Manifesto), estabeleço aqui a fronteira entre este documento e o próximo:

| Documento | Responde a... |
|---|---|
| **Business Goals** (este documento) | O que queremos alcançar, e até quando — objetivos direcionais com metas de referência |
| **Success Metrics (KPIs)** (Documento 5) | Como medimos, em detalhe e em contínuo, o progresso rumo a cada objetivo — fórmulas, frequência de medição, fontes de dados, dashboards |

Os números que aparecem neste documento são **metas de referência**, não especificações de medição. O "como calculamos exatamente" cada número fica para o documento seguinte.

---

## 2. Contexto

Os objetivos abaixo derivam diretamente de decisões já tomadas e aprovadas na fase de Discovery e nos documentos estratégicos anteriores — não são novas metas inventadas neste documento, mas a sua primeira formalização conjunta, com prazos explícitos e hierarquia de prioridade. A NEXA encontra-se, à data deste documento, na fase pré-lançamento: 4 módulos do MVP definidos, ainda sem código escrito, com lançamento previsto para dentro de aproximadamente 6 meses.

---

## 3. Conteúdo Estruturado

### 3.1 Objetivo de Negócio Principal (North Star)

> **Validar, com um grupo reduzido de empresas piloto europeias, que a NEXA resolve um problema real de organização operacional de forma suficientemente valiosa para que essas empresas paguem por ela de forma recorrente — e provar que a arquitetura e o modelo de negócio suportam crescimento sem necessidade de reconstrução.**

Este objetivo único enquadra todos os que se seguem: nenhum objetivo de negócio nesta fase é sobre crescimento acelerado — é sobre validação com evidência real.

### 3.2 Objetivos por Horizonte Temporal

**Horizonte 1 — Lançamento do MVP (0-6 meses)**

| # | Objetivo | Meta de referência | Fonte |
|---|---|---|---|
| H1.1 | Lançar o MVP com os 4 módulos definidos (Dashboard, Processos, CRM, Assistente de IA) em produção, de forma estável | MVP funcional e utilizável por empresas reais | Discovery (Pergunta 3) |
| H1.2 | Onboarding das primeiras empresas piloto | Entre 10 e 50 empresas piloto ativas | Discovery (Pergunta 10) |
| H1.3 | Validar tecnicamente a arquitetura multi-tenant, o sistema de permissões granular e o registo de auditoria em ambiente real (não apenas em teste) | Zero incidentes de isolamento de dados entre empresas | Discovery (Perguntas 7-9) |
| H1.4 | *(adicionado — Pivô Estratégico de Execução, 2026-07-02)* Lançar o MVP como produto comercialmente completo, permitindo que um cliente real percorra sozinho todo o percurso — conhecer a NEXA, testar gratuitamente, subscrever, pagar, e usar — sem intervenção manual da equipa | Percurso completo (Landing → Trial → Pagamento → Uso) funcional sem apoio manual | PRD v1.1, Camada Comercial e Produto; ADR-008 |

**Horizonte 2 — Validação e Aprendizagem (6-12 meses)**

| # | Objetivo | Meta de referência | Fonte |
|---|---|---|---|
| H2.1 | Converter uma proporção saudável dos trials de 14 dias em clientes pagantes | ≥30% de conversão trial → pago (meta inicial, ajustável com dados reais de mercado) | Discovery (Pergunta 12) |
| H2.2 | Confirmar utilização contínua e integrada da plataforma, não apenas de um módulo isolado | Empresas piloto a usar 3 ou mais módulos regularmente | Product Vision, 3.7 |
| H2.3 | Recolher feedback qualitativo estruturado das empresas piloto sobre valor percebido, fricções e prioridades de evolução | Pelo menos uma sessão de feedback estruturado por empresa piloto | Discovery (Pergunta 12) |
| H2.4 | Confirmar impacto operacional real reportado pelas empresas piloto (redução de ferramentas dispersas, tempo poupado, melhoria percebida de organização) | Evidência qualitativa e/ou quantitativa recolhida de forma sistemática | Discovery (Pergunta 12); Mission, 3.2 |

**Horizonte 3 — Preparação para Escala (12-24 meses)**

| # | Objetivo | Meta de referência | Fonte |
|---|---|---|---|
| H3.1 | Confirmar que a arquitetura suporta crescimento gradual sem reconstrução (validação técnica, não apenas de negócio) | Nenhuma alteração estrutural da arquitetura base necessária para suportar crescimento além do piloto | Discovery (Pergunta 10); Vision Document, 3.6 |
| H3.2 | Iniciar preparação para expansão geográfica (Europa) e funcional (novos módulos) | Plano de expansão definido, com base em aprendizagens do piloto | Vision Document, 3.5; Product Vision, 3.6 |
| H3.3 | Avaliar, com base em evidência real do piloto, se e quando avançar o Assistente de IA para níveis de maior autonomia (nível C) | Decisão informada, não pré-definida | Discovery (Pergunta 4) |

### 3.3 Objetivos Não-Financeiros Explícitos

Consistente com a Missão (3.2) — "cada empresa piloto é tratada como parceira de validação, não apenas como cliente" — os seguintes objetivos são tratados com o mesmo nível de prioridade que os objetivos de receita, não como secundários:

- **Confiança demonstrável**: nenhuma empresa piloto deve reportar preocupação ativa quanto à segurança ou privacidade dos seus dados durante o piloto.
- **Aprendizagem estruturada**: cada decisão de evolução do produto pós-MVP deve poder ser justificada com base em feedback real recolhido no piloto, não apenas em intuição interna — reforçando o valor "Ambição com Humildade" (Mission & Values, 3.3).
- **Solidez arquitetural sobre velocidade de entrega**: um atraso no lançamento por motivos de qualidade ou segurança é aceitável; um lançamento apressado que comprometa a confiança inicial das empresas piloto, não é — consistente com o valor "Rigor Antes de Velocidade".

### 3.4 O Que Não é Objetivo Nesta Fase

Tão importante quanto definir objetivos é ser explícito sobre o que **não** é prioridade nos próximos 12-24 meses, para evitar dispersão de esforço:

- Crescimento acelerado de número de clientes acima do necessário para validação (a meta é validação de qualidade, não volume).
- Expansão geográfica ativa fora de Portugal (preparação sim, execução não, conforme H3.2).
- Construção de integrações externas (email, calendário, WhatsApp, ERPs) — deliberadamente fora de âmbito do MVP (Discovery, Pergunta 7).
- Avanço para autonomia de IA de nível C sem validação prévia (Discovery, Pergunta 4; H3.3).
- Angariação de investimento externo — não foi discutida nesta fase de Discovery e não é assumida como objetivo; caso se torne relevante, deve ser tratada como decisão estratégica própria, não incluída retroativamente neste documento.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | O horizonte temporal dos Business Goals segue a fase de Missão atual (12-24 meses), organizado em 3 sub-horizontes (0-6, 6-12, 12-24 meses) | Alinha objetivos de negócio com o ciclo de vida já definido na Missão, evitando um documento com prazos desconectados dos restantes |
| D2 | Os objetivos não-financeiros (confiança, aprendizagem, solidez) têm prioridade formalmente equivalente aos objetivos financeiros/de crescimento nesta fase | Consistente com os Valores aprovados — evita que, na prática, decisões futuras tratem confiança e qualidade como secundárias face a métricas de crescimento |
| D3 | A meta de conversão de 30% é registada como "meta inicial, ajustável com dados reais de mercado", não como compromisso rígido | Reflete a incerteza inerente a uma fase de validação; evita que o documento fique desatualizado ou crie pressão artificial antes de existir evidência de mercado |
| D4 | Angariação de investimento é explicitamente excluída do âmbito deste documento | Não foi discutida na fase de Discovery; incluir objetivos de investimento sem essa base seria assumir uma decisão estratégica que ainda não foi tomada |
| D5 | Adicionado H1.4 — lançamento como produto comercialmente completo, não apenas MVP funcional internamente | Pivô estratégico de execução: o objetivo passou de "documentação para um programador" a "MVP utilizável por clientes reais desde o lançamento", mantendo toda a arquitetura e âmbito técnico já aprovados |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | A meta de 30% de conversão trial→pago deve ser revista após os primeiros meses de dados reais, ou mantida como referência fixa até ao fim do Horizonte 2? | Success Metrics (KPIs), avaliação de sucesso do piloto | CEO, com base em dados reais |
| Q2 | Deve a NEXA considerar, já neste horizonte, angariação de investimento externo para acelerar H3.2 (preparação para escala), ou manter-se autofinanciada até final da validação? | Estratégia financeira, ritmo de crescimento | CEO |
| Q3 | Que critério objetivo (para além dos números de H2) determina a transição formal do Horizonte 2 para o Horizonte 3? | Planeamento, Product Roadmap | CEO + CTO, a definir no Product Roadmap |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, formalizando em objetivos de negócio com prazos explícitos as metas já validadas na fase de Discovery, com fronteira de âmbito explícita face ao futuro documento Success Metrics (KPIs) | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial**, sem alterações de conteúdo. Documento passa a estado Aprovado | Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionado H1.4 e Decisão D5, formalizando o pivô estratégico de execução para um MVP comercialmente completo desde o lançamento | CTO (Claude) + Fundadora/CEO |

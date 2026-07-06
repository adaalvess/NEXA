# NEXA — Success Metrics (KPIs)

| | |
|---|---|
| **Documento** | Success Metrics (KPIs) |
| **Fase** | 1 — Documentação Estratégica |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Business Goals v1.0 (Aprovado) |
| **Natureza** | Documento vivo — os valores medidos são atualizados continuamente após o lançamento; a estrutura de indicadores é revista por horizonte |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define **como** cada objetivo definido no Business Goals será medido: o indicador exato, a fórmula de cálculo, a fonte de dados, a frequência de medição, e o critério objetivo que determina sucesso. Não repete as metas já aprovadas no Business Goals — remete para elas por referência (ex: "H2.1") e foca-se exclusivamente na instrumentação da medição.

Este documento também define os **requisitos de analytics e instrumentação** que a plataforma precisa de implementar desde o primeiro dia (conforme já indicado na fase de Discovery, Pergunta 12), servindo como especificação de referência para a arquitetura de dados e telemetria que virá a ser desenhada na Fase de Arquitetura Técnica.

---

## 2. Contexto

Nesta fase (pré-lançamento), nenhum destes indicadores tem ainda dados reais associados — este documento define a **instrumentação**, não os resultados. À medida que o MVP for lançado e as empresas piloto começarem a usar a plataforma, este documento passa a ser o painel de referência para avaliar, de forma objetiva e não subjetiva, se os Business Goals estão a ser cumpridos.

---

## 3. Conteúdo Estruturado

### 3.1 Princípios de Medição

Antes da tabela de indicadores, quatro princípios orientam como a NEXA mede sucesso — coerentes com os valores já aprovados (Mission & Values, 3.3):

1. **Todo o indicador tem uma fonte de dados definida antes de ser considerado válido.** Um KPI sem fonte de dados clara não entra neste documento como indicador ativo — fica registado como "a instrumentar".
2. **Preferência por indicadores de comportamento real sobre indicadores de intenção.** Ex: "módulos usados por semana" é mais fiável que "módulos que a empresa diz que vai usar".
3. **Nenhum indicador é otimizado isoladamente.** Ex: uma taxa de conversão alta não é sucesso se vier acompanhada de baixa utilização contínua — os indicadores devem ser lidos em conjunto, nunca isolados.
4. **A privacidade dos dados de cada empresa é respeitada na própria medição.** Indicadores agregados (ex: taxa de conversão global) não expõem dados individuais de nenhuma empresa piloto — consistente com o pilar de Confiança, Segurança e Privacidade (Vision Document, 3.10).

### 3.2 Indicadores — Horizonte 1 (Lançamento do MVP, 0-6 meses)

| Objetivo (Business Goals) | Indicador (KPI) | Fórmula / Definição | Fonte de dados | Frequência | Critério de sucesso |
|---|---|---|---|---|---|
| H1.1 — MVP em produção, estável | **Disponibilidade da plataforma** | (Tempo total − tempo de indisponibilidade) / Tempo total, em % | Monitorização de infraestrutura (uptime monitoring) | Contínua, reportada mensalmente | ≥99,9% mensal, conforme definido na fase de Discovery |
| H1.1 — MVP em produção, estável | **Taxa de erro crítico** | Nº de erros de severidade alta (perda de dados, falha de autenticação, falha de permissões) por período | Logging & error tracking da aplicação | Contínua, reportada semanalmente | Zero erros críticos não resolvidos em 24h |
| H1.2 — Onboarding de empresas piloto | **Nº de empresas piloto ativas** | Contagem de empresas com pelo menos 1 utilizador ativo nos últimos 7 dias | Base de dados de utilização (analytics interno) | Semanal | Entre 10 e 50 empresas, conforme Business Goals |
| H1.2 — Onboarding de empresas piloto | **Tempo médio de onboarding** | Tempo entre criação da conta da empresa e primeira ação significativa (ex: primeira tarefa criada, primeiro contacto CRM registado) | Eventos de analytics de produto | Por empresa, agregado mensalmente | Referência inicial a definir após os primeiros onboardings reais (sem dado histórico ainda) |
| H1.3 — Isolamento de dados multi-tenant | **Incidentes de isolamento de dados** | Nº de incidentes reportados ou detetados em que dados de uma empresa ficaram visíveis a outra | Sistema de auditoria (Vision Document, 3.10) + revisão de segurança | Contínua | Zero incidentes, sem exceção — este é um critério binário, não uma percentagem |

### 3.3 Indicadores — Horizonte 2 (Validação e Aprendizagem, 6-12 meses)

| Objetivo (Business Goals) | Indicador (KPI) | Fórmula / Definição | Fonte de dados | Frequência | Critério de sucesso |
|---|---|---|---|---|---|
| H2.1 — Conversão trial → pago | **Taxa de conversão de trial** | (Nº de empresas que passam a pagantes após o trial) / (Nº total de empresas que iniciaram o trial), em % | Sistema de subscrições/faturação | Mensal, com leitura acumulada trimestral | ≥30% (meta inicial, ajustável conforme já aprovado no Business Goals) |
| H2.2 — Utilização integrada (multi-módulo) | **Profundidade de adoção multi-módulo** | % de empresas ativas que usam 3 ou mais dos 4 módulos do MVP em base semanal | Eventos de analytics de produto, por módulo | Semanal, reportado mensalmente | Maioria das empresas piloto ativas (>50%) a usar 3+ módulos até final do Horizonte 2 |
| H2.2 — Utilização integrada (multi-módulo) | **Frequência de acesso (DAU/WAU)** | Utilizadores ativos diários / Utilizadores ativos semanais, por empresa | Eventos de login e atividade | Diária, reportada semanalmente | Tendência crescente ou estável ao longo do Horizonte 2 (não um valor absoluto único, dado o tamanho reduzido da amostra) |
| H2.3 — Feedback qualitativo estruturado | **Cobertura de feedback recolhido** | Nº de empresas piloto com pelo menos 1 sessão de feedback estruturado registada / Nº total de empresas piloto | Registo interno de entrevistas/CRM da NEXA (uso interno) | Mensal | 100% das empresas piloto com pelo menos 1 sessão registada até final do Horizonte 2 |
| H2.3 — Feedback qualitativo estruturado | **Net Promoter Score (NPS) ou equivalente qualitativo** | Pergunta padrão de recomendação (0-10) recolhida junto das empresas piloto | Questionário estruturado periódico | Trimestral | Referência inicial a definir após a primeira recolha (sem histórico prévio) |
| H2.4 — Impacto operacional reportado | **Redução de ferramentas dispersas (auto-reportada)** | Nº médio de ferramentas que a empresa reporta ter deixado de usar após adoção da NEXA | Questionário estruturado (mesma recolha que H2.3) | Trimestral | Indicador qualitativo de acompanhamento, sem meta numérica rígida nesta fase |
| H2.4 — Impacto operacional reportado | **Utilização do Assistente de IA** | Nº de interações com o Assistente de IA por utilizador ativo, e % de sugestões aceites pelas empresas | Eventos de analytics do módulo de IA | Semanal, reportado mensalmente | Tendência crescente de aceitação de sugestões (indicador de confiança real, conforme Product Vision, 3.7) |

### 3.4 Indicadores — Horizonte 3 (Preparação para Escala, 12-24 meses)

| Objetivo (Business Goals) | Indicador (KPI) | Fórmula / Definição | Fonte de dados | Frequência | Critério de sucesso |
|---|---|---|---|---|---|
| H3.1 — Arquitetura suporta crescimento sem reconstrução | **Nº de alterações estruturais necessárias à arquitetura base** | Contagem de alterações classificadas como "estruturais" (não incrementais) nos ADRs (ver Fase 3 — Engenharia) | Registo de Architecture Decision Records | Revisão a cada milestone | Zero alterações estruturais motivadas por limitações de escala |
| H3.2 — Preparação para expansão | **Plano de expansão formalizado** | Existência de um documento de expansão geográfica/funcional aprovado | Documentação estratégica (revisão do Product Roadmap) | Pontual, no final do Horizonte 2 | Documento existente e aprovado antes do início do Horizonte 3 |
| H3.3 — Decisão informada sobre autonomia de IA (nível C) | **Evidência acumulada sobre autonomia de IA** | Síntese estruturada de feedback + taxa de aceitação de sugestões (H2.4) ao longo do tempo | Consolidação de indicadores anteriores | No final do Horizonte 2 | Decisão tomada com base em dados, documentada como ADR — não é um número, é um processo de decisão registado |

### 3.5 Indicadores Não-Financeiros (Objetivos Transversais)

Correspondentes à secção 3.3 do Business Goals — medidos de forma contínua, não presos a um único horizonte:

| Objetivo (Business Goals) | Indicador (KPI) | Fórmula / Definição | Fonte de dados | Frequência | Critério de sucesso |
|---|---|---|---|---|---|
| Confiança demonstrável | **Preocupações de segurança/privacidade reportadas** | Nº de preocupações ativas reportadas por empresas piloto relacionadas com segurança ou privacidade de dados | Canal de feedback direto + sistema de auditoria | Contínua | Zero preocupações não resolvidas em aberto |
| Aprendizagem estruturada | **% de decisões de produto pós-MVP com justificação documentada em feedback real** | Nº de decisões de produto com referência a feedback registado / Nº total de decisões de produto relevantes | Registo de decisões de produto (a formalizar na Fase 4 — Planeamento) | Por decisão | Tendencialmente 100% — decisões sem base em feedback devem ser exceção justificada, não norma |
| Solidez arquitetural sobre velocidade | **Incidentes pós-lançamento atribuíveis a atalhos de qualidade** | Nº de incidentes (bugs críticos, falhas de segurança) rastreáveis a decisões técnicas tomadas por pressão de prazo | Post-mortems de incidentes | Por incidente | Zero incidentes atribuíveis a atalhos conscientes — qualquer trade-off de qualidade deve ter sido uma decisão explícita e documentada, não um acidente |

### 3.6 Requisitos de Instrumentação para a Plataforma

Para que os indicadores acima sejam medíveis a partir do dia do lançamento, a plataforma precisa de capturar, desde a arquitetura inicial, os seguintes eventos e dados — este é o requisito que alimenta diretamente a futura arquitetura de analytics/telemetria:

- Eventos de autenticação e sessão (login, logout, duração de sessão) por utilizador e por empresa.
- Eventos de uso por módulo (criação, edição, visualização, eliminação de entidades em Dashboard, Processos, CRM).
- Eventos de interação com o Assistente de IA (pergunta feita, sugestão apresentada, sugestão aceite/rejeitada/ignorada).
- Eventos de ciclo de vida de subscrição (início de trial, conversão, upgrade/downgrade de plano, cancelamento).
- Registo de auditoria completo (quem, quando, o quê — já definido como requisito de segurança no Vision Document, 3.10, e reutilizado aqui como fonte de dados de KPIs de confiança).
- Registo de disponibilidade e erros ao nível de infraestrutura (uptime, latência, taxa de erro).

Este levantamento será formalizado tecnicamente como requisito não-funcional no PRD (Fase 2) e como decisão de arquitetura no ADR correspondente (Fase 3).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Cada KPI neste documento referencia o objetivo do Business Goals correspondente por identificador (ex: H2.1), sem repetir a meta de negócio | Elimina duplicação de conteúdo entre os dois documentos, mantendo cada um com o seu âmbito próprio (o quê vs. como medir) |
| D2 | Indicadores sem histórico de dados (ex: tempo médio de onboarding, NPS) são registados com "referência inicial a definir após os primeiros dados reais", em vez de metas arbitrárias | Evita comprometer a empresa com metas sem qualquer base empírica — consistente com o valor "Ambição com Humildade" |
| D3 | Alguns indicadores de segurança e qualidade (isolamento de dados, incidentes por atalho de qualidade) são tratados como critérios binários (zero tolerância), não como percentagens ou tendências | Reflete que, para estes casos específicos, qualquer ocorrência já representa falha do princípio "Confiança Não Se Assume, Constrói-se" — não é uma questão de otimização gradual |
| D4 | Os requisitos de instrumentação (3.6) são formalizados aqui, mas a implementação técnica fica para o PRD e ADRs correspondentes | Mantém este documento focado em estratégia de medição, remetendo a especificação técnica exata para os documentos de Fase 2 e Fase 3, onde é mais apropriada |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Que ferramenta de analytics/telemetria será usada para capturar os eventos definidos em 3.6 (ex: solução própria vs. ferramenta de terceiros)? | Arquitetura técnica, custo de infraestrutura | CTO, a decidir na Fase de Arquitetura Técnica, com justificação de prós/contras |
| Q2 | Deve o NPS (ou equivalente) ser recolhido via questionário próprio dentro da plataforma, ou via ferramenta externa? | Experiência do utilizador, esforço de implementação | CEO + CTO, a decidir antes do lançamento do MVP |
| Q3 | Que cadência de revisão formal deste documento (trimestral? por horizonte?) melhor equilibra rigor de acompanhamento com esforço de manutenção? | Processo interno | CEO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, definindo indicadores mensuráveis para todos os objetivos do Business Goals v1.0, com requisitos de instrumentação de plataforma associados | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial**, sem alterações de conteúdo. Documento passa a estado Aprovado | Fundadora/CEO |

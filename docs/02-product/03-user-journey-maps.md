# NEXA — User Journey Maps

| | |
|---|---|
| **Documento** | User Journey Maps |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | User Personas v1.1 (D4 — regra de rastreabilidade) · PRD v1.0 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento mapeia as jornadas mais importantes que as personas já aprovadas percorrem na NEXA — desde o primeiro contacto até ao uso recorrente — identificando em cada etapa o que a pessoa faz, o que sente, e onde existem oportunidades ou riscos de fricção. Cumpre a regra de rastreabilidade definida no User Personas (D4): cada jornada identifica explicitamente a Persona e o papel RBAC correspondente.

### Nota de Clarificação de Âmbito

Uma jornada aqui descrita é **experiencial**, não funcional — descreve o que a pessoa faz e sente, não os ecrãs ou fluxos técnicos exatos (isso é âmbito do Use Cases e da Information Architecture, ainda por vir). Onde uma etapa da jornada implica uma decisão de produto ainda não tomada, este documento assinala-a como Questão em Aberto, em vez de a inventar.

---

## 2. Contexto

Foram selecionadas as jornadas com maior impacto direto nos objetivos já aprovados no Business Goals — sobretudo H1.2 (onboarding), H2.1 (conversão trial→pago) e H2.2 (adoção multi-módulo). Não é objetivo deste documento mapear todas as interações possíveis, mas as que mais determinam se a NEXA cumpre a sua Missão na prática (Mission & Values, 3.2: "cada funcionalidade construída deve reduzir caos mensurável").

---

## 3. Conteúdo Estruturado

### 3.1 Jornada A — Primeira Configuração da Empresa

**Persona:** Fundadora Sobrecarregada · **Papel RBAC:** Administrador da Empresa

| Etapa | O que faz | O que sente | Oportunidade / Risco |
|---|---|---|---|
| Descoberta | Ouve falar da NEXA ou encontra-a a pesquisar solução para desorganização | Cética mas curiosa — já experimentou "mais uma ferramenta" antes | Comunicação deve ser direta e sem hype (Brand Book, 3.9) |
| Início do trial | Cria conta da empresa, define nome/dados básicos | Cautelosa sobre quanto tempo vai perder a configurar | Onboarding tem de ser rápido — meta a definir com os primeiros dados reais (Success Metrics, "tempo médio de onboarding") |
| Configuração inicial | Convida colaboradores, define departamentos/equipas, atribui papéis RBAC | Ligeira ansiedade sobre "fazer isto bem à primeira" | Risco de abandono se a configuração de permissões parecer complexa demais — validar simplicidade nesta etapa é prioritário |
| Primeiro uso real | Explora o Dashboard, faz perguntas ao Assistente de IA | Expectativa de ver valor imediato, não só "um ecrã vazio" | Momento crítico de retenção — se o Dashboard estiver vazio sem dados, o valor não é percebido (ver Questão em Aberto, Q1) |

### 3.2 Jornada B — Uso Diário Operacional

**Persona:** Colaborador Operacional · **Papel RBAC:** Colaborador

| Etapa | O que faz | O que sente | Oportunidade / Risco |
|---|---|---|---|
| Início do dia | Abre a NEXA para ver as suas tarefas e clientes do dia | Quer ser rápido — não tem paciência para "aprender a ferramenta" outra vez | Pilar de produto "Rápido a adotar, sem fricção" (Product Vision, 3.5) tem de se sentir aqui, não só no onboarding |
| Registo de interação | Atualiza um contacto no CRM após uma chamada com cliente | Vê isto como "trabalho extra" se não perceber benefício direto | Risco relevante — se o Colaborador não sentir retorno imediato, a qualidade dos dados no CRM degrada-se, afetando todos os outros papéis |
| Consulta ao Assistente de IA | Pergunta rapidamente algo sobre um cliente ou tarefa | Espera resposta útil e imediata, sem ambiguidade | Reforça o valor "Utilização do Assistente de IA" (Success Metrics, 3.3) como sinal de confiança real |
| Fim do dia | Marca tarefas como concluídas | Satisfação se sentir progresso visível | Oportunidade de reforço positivo (ex: Dashboard a refletir progresso da equipa) |

### 3.3 Jornada C — Gestão de Equipa e Reporte

**Persona:** Gestor Orientado a Resultados · **Papel RBAC:** Gestor

| Etapa | O que faz | O que sente | Oportunidade / Risco |
|---|---|---|---|
| Verificação semanal | Consulta o Dashboard filtrado à sua equipa | Quer identificar riscos antes de se tornarem problemas | Valida a necessidade de permissões RBAC corretamente escopadas (equipa, não empresa toda) |
| Identificação de atraso | Deteta uma tarefa ou processo atrasado | Frustração se a informação não estiver atualizada pela equipa | Depende diretamente da qualidade de dados da Jornada B — as duas jornadas estão interligadas |
| Ação corretiva | Reatribui tarefa ou pede sugestão ao Assistente de IA sobre como resolver | Quer uma sugestão acionável, não genérica | Este é o momento onde a "Inteligência contextual, não genérica" (Product Vision, pilar 2) é mais testada |
| Reporte à direção | Usa dados do CRM/Processos para preparar reporte | Quer confiar nos números sem ter de os verificar manualmente | Reforça a necessidade de dados fiáveis desde a fundação (RBAC + auditoria) |

### 3.4 Jornada D — Decisão de Conversão (Trial → Pago)

**Persona:** Fundadora Sobrecarregada · **Papel RBAC:** Administrador da Empresa

| Etapa | O que faz | O que sente | Oportunidade / Risco |
|---|---|---|---|
| Aproximação do fim do trial | Recebe indicação de que o trial está a terminar | Avalia se viu valor suficiente nos 14 dias | Momento crítico para o objetivo H2.1 (conversão ≥30%) |
| Avaliação de valor | Reflete se a equipa adotou a plataforma, se substituiu ferramentas antigas | Decisão racional, mas também emocional (confiança construída ou não) | Liga-se diretamente ao indicador "Redução de ferramentas dispersas" (Success Metrics, 3.3) |
| Escolha de plano | Compara Starter/Professional/Enterprise | Quer clareza sobre o que cada plano inclui, sem letras pequenas | Tom de comunicação "Clareza é Respeito" (Mission & Values) é especialmente crítico nesta etapa |
| Confirmação de subscrição | Introduz dados de pagamento e confirma | Última hesitação — precisa de sentir confiança total | Reforça por que "Confiança Não Se Assume, Constrói-se" tem de estar provada antes deste momento, não apenas comunicada nele |

### 3.5 O "AHA Moment" do Trial

Um conceito importante emerge da Jornada A (3.1): o momento exato em que uma empresa, ainda em trial, percebe de forma clara e inequívoca o valor da NEXA — o **AHA Moment**. Este momento é distinto de "início do uso" ou "configuração concluída": é o instante em que a plataforma deixa de parecer "mais uma ferramenta para configurar" e passa a parecer "algo que já me está a poupar tempo ou a mostrar algo que eu não via antes".

Com base nas 4 jornadas mapeadas, identificam-se **duas hipóteses candidatas** a AHA Moment, ambas situadas na etapa "Primeiro uso real" da Jornada A:

1. **A primeira resposta útil e específica do Assistente de IA** sobre a própria empresa (não uma resposta genérica) — ex: um insight correto sobre um cliente ou tarefa que a pessoa reconhece imediatamente como relevante.
2. **A primeira visão agregada do Dashboard** que junta informação de mais do que um módulo de forma que a pessoa não conseguiria obter facilmente antes (ex: cruzar tarefas em atraso com o cliente a que pertencem).

Este documento não resolve qual das duas hipóteses (ou ambas) constitui o AHA Moment real da NEXA — essa é uma questão empírica, a validar com os primeiros dados de utilização das empresas piloto (ver Questão em Aberto, Q3). O que este documento fixa é que **o AHA Moment deve ser tratado como um evento instrumentável**, candidato a integrar o Success Metrics numa revisão futura desse documento, e não apenas como uma intuição de produto.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Cada jornada identifica Persona + papel RBAC no cabeçalho, cumprindo a regra definida no User Personas (D4) | Mantém rastreabilidade completa entre Personas, Jornadas e os documentos seguintes (User Stories, Use Cases) |
| D2 | As jornadas mapeiam experiência (o que a pessoa faz e sente), não fluxos técnicos exatos | Evita sobreposição com Information Architecture e Use Cases, que descrevem o "como" técnico |
| D3 | Foram selecionadas 4 jornadas, ligadas diretamente a objetivos já aprovados no Business Goals (H1.2, H2.1, H2.2), em vez de mapear exaustivamente todas as interações possíveis | Mantém o documento focado no que mais impacta a validação do MVP, consistente com a fase de validação em que a NEXA se encontra |
| D4 | O "AHA Moment" do trial é registado como conceito formal, com duas hipóteses candidatas identificadas, mas sem escolha definitiva nesta fase | Trata-se de uma questão empírica que só pode ser resolvida com dados reais de uso — decidir agora seria contrário ao valor "Ambição com Humildade"; o conceito fica registado para não se perder, mas a validação fica para depois do lançamento |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Como deve o Dashboard e os restantes módulos comportar-se quando uma empresa ainda não tem dados suficientes (estado vazio)? A jornada de "primeiro uso real" (3.1) depende diretamente desta resposta | Information Architecture, Functional Specifications | CEO + CTO, a decidir antes da Information Architecture |
| Q2 | Deve existir uma jornada dedicada ao Gestor/Administrador que convida e gere permissões de outros utilizadores em detalhe, ou fica coberta implicitamente pela Jornada A? | User Stories futuras | CEO, a confirmar antes do User Stories |
| Q3 | Qual das duas hipóteses de AHA Moment (resposta específica do Assistente de IA, ou primeira visão agregada do Dashboard) — ou ambas — deve ser instrumentada e adicionada ao Success Metrics como indicador formal de conversão? | Success Metrics (revisão futura), priorização de instrumentação técnica | CEO + CTO, após os primeiros dados de utilização das empresas piloto |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 4 jornadas mapeadas a partir das personas aprovadas, cada uma ligada a objetivos concretos do Business Goals | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada secção 3.5 "O AHA Moment do Trial", com duas hipóteses candidatas identificadas a partir da Jornada A, registadas como questão empírica a validar (Q3) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

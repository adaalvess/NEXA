# NEXA — ADR-005: Camada de Abstração de IA Multi-Fornecedor

| | |
|---|---|
| **Documento** | ADR-005 — Camada de Abstração de IA Multi-Fornecedor |
| **Fase** | 3b — Architecture Decision Records (5 de 7) |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-002, ADR-004 · System Design Principles v1.5 (3.8) · Event & Notification Architecture Rules v1.1 (3.8) · Security & Access Principles v1.1 (3.6) · Vision Document v1.1 (3.9, Filosofia de IA) · FR-26, FR-27, FR-28 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide **como implementar tecnicamente FR-26** (suporte a múltiplos fornecedores de IA, sem dependência de um único) **e FR-27** (políticas de autonomia configuráveis por Empresa) — e como esta camada se integra com a salvaguarda estrutural já decidida no Event & Notification Architecture Rules (3.8), que impede uma sugestão de IA de encadear automaticamente em execução.

---

## 2. Contexto

Esta é, de todos os ADRs até agora, a decisão mais diretamente ligada à identidade da NEXA — "Sistema Operacional Inteligente" — e a que mais risco tem de, por conveniência técnica, comprometer um princípio de produto já muito debatido: a Filosofia de IA (Vision Document, 3.9) estabelece que a IA aumenta a inteligência humana, nunca a substitui, e que o utilizador mantém sempre o controlo. Qualquer decisão técnica nesta camada tem de tornar essa filosofia mais difícil de violar por acidente, não apenas de a documentar.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — Chamadas Diretas ao SDK de um Fornecedor, Sem Camada de Abstração**

| Prós | Contras |
|---|---|
| Implementação inicial mais rápida | Viola diretamente FR-26 — dependência de um único fornecedor, sem caminho de mudança sem reescrever cada módulo |
| — | A governação (RN-08, auditoria FR-28, escopo RBAC) teria de ser reimplementada em cada módulo que usa IA |

Descartada de imediato — contradiz requisitos já aprovados.

**Opção B — Interface Própria ("AI Gateway"), com Adaptadores por Fornecedor Sobre os SDKs Oficiais**

| Prós | Contras |
|---|---|
| Controlo total sobre o contrato — a governação é aplicada num único lugar, antes de qualquer chamada a qualquer fornecedor | Esforço de manutenção próprio para acompanhar atualizações de cada SDK oficial |
| Nenhuma dependência de uma abstração de terceiros — apenas dos SDKs oficiais, necessários em qualquer opção | Cada novo fornecedor exige escrever um adaptador (esforço proporcional) |
| Superfície mínima — contém exatamente o que a NEXA precisa | — |
| Consistente com o Princípio de Evolução Tecnológica (System Design Principles, 3.8) | — |

**Opção C — Biblioteca de Abstração de IA de Terceiros**

| Prós | Contras |
|---|---|
| Esforço inicial menor — adaptadores já mantidos pela comunidade | Introduz uma abstração externa cuja evolução a NEXA não controla |
| — | A governação específica (RN-08, FR-27) teria de ser construída por cima da biblioteca de qualquer forma — **duas camadas de abstração sobrepostas** |
| — | Tensão direta com Independência Tecnológica (pergunta 8 de Validação Arquitetural) |

### 3.2 Decisão

**A NEXA constrói uma interface própria — o "AI Gateway" — com adaptadores específicos por fornecedor sobre os SDKs oficiais (Opção B).**

A Opção C foi descartada por uma razão estrutural, não de preferência: qualquer biblioteca de terceiros teria de ser envolvida pela governação própria da NEXA de qualquer forma, resultando em duas camadas de abstração sobrepostas. Construir a interface própria diretamente sobre os SDKs oficiais é, paradoxalmente, a opção mais simples das três que cumprem os requisitos.

### 3.3 Responsabilidades do AI Gateway

O AI Gateway é o único ponto de acesso a qualquer fornecedor de IA em toda a plataforma. Antes de qualquer chamada a um fornecedor, o Gateway:

1. **Recebe apenas dados já filtrados pelo escopo RBAC do Utilizador** — a responsabilidade de reunir e filtrar dados de domínio (Clientes, Tarefas, etc.) pertence sempre ao módulo que invoca o Gateway (ex: o módulo Assistente de IA), nunca ao Gateway em si. O Gateway não conhece entidades de domínio — apenas a identidade do Utilizador (para auditoria, item 4) e o conteúdo já preparado do pedido. *Correção pós-revisão adversarial: atribuir esta responsabilidade ao Gateway violaria a fronteira de módulo do System Design Principles (3.2), pois exigiria que o Gateway compreendesse entidades de domínio que não lhe pertencem.*
2. **Consulta a política de autonomia da Empresa** (FR-27) — determina se a resposta é apresentada como informação direta (nível A) ou como sugestão pendente de confirmação (nível B, o único ativo no MVP).
3. **Nunca gera diretamente um evento de execução** — apenas um evento de "sugestão gerada" (Event & Notification Architecture Rules, 3.8); a impossibilidade estrutural de um encadear automaticamente no outro é responsabilidade da camada de eventos, mas o Gateway nunca tenta contornar essa fronteira. *Reforçado ao nível de tipos em 3.7.*
4. **Regista a interação no Registo de Auditoria** (FR-28), incluindo o fornecedor usado. *Desambiguação adicionada após auditoria independente:* a chamada a um fornecedor de IA é uma operação de rede que pode demorar; isto **não** significa que a escrita de auditoria fica pendente dessa duração. O pedido inicial ("pergunta iniciada") gera uma entrada de auditoria imediata e completa em si mesma; a conclusão ("resposta recebida" ou "sugestão gerada") gera uma segunda entrada, igualmente imediata no momento em que ocorre — nunca uma única escrita "à espera" da resposta externa. Isto mantém a garantia de consistência forte do Data & Consistency Rules (3.1) intacta: cada escrita, no momento em que acontece, é imediata; é a sequência de dois eventos discretos que reflete a natureza assíncrona da chamada externa, não uma violação da regra de consistência.
5. **Falha de forma segura** (Fail Secure, Security & Access Principles, 3.9) se o fornecedor estiver indisponível — nunca inventa uma resposta, informa o Utilizador de forma clara (Use Cases, UC-05, E1). *Reforçado com timeouts e circuit breaker em 3.8.*
6. **Impõe um limite de utilização (quota) por Empresa, antes de qualquer chamada ao fornecedor** (adicionado após auditoria independente) — consulta o limite de uso de IA já previsto por plano (FR-29) e recusa a chamada, com Fail Secure, se o limite estiver excedido. Esta verificação acontece **antes** da chamada externa, nunca depois: o objetivo não é medir o custo já incorrido, é impedir o custo de acontecer. Isto eleva a ligação entre o Gateway e FR-29 de "oportunidade futura" (identificada mas não implementada na primeira validação deste ADR) a requisito explícito — a auditoria independente concluiu que, à escala de milhares de Empresas, monitorização de custo sozinha (sem imposição prévia) é insuficiente para prevenir dano financeiro real por erro de automação ou má utilização.

### 3.4 Seleção de Fornecedor — Configuração, Não Código

Consistente com o System Design Principles (3.5, Configuração Sobre Codificação Rígida): o fornecedor de IA usado é uma configuração, não uma decisão fixada no código — permite que diferentes Empresas ou tipos de pedido usem fornecedores diferentes sem alterar nenhum módulo de negócio.

### 3.5 Contrato Preparado para Streaming e Capacidades Heterogéneas

*Secção adicionada após revisão adversarial (secção 6, pergunta 3) — o desenho original assumia implicitamente um modelo de "pedido único → resposta única", desatualizado face ao estado da arte já hoje.*

A interface do Gateway é desenhada, desde o primeiro dia, para suportar **respostas em streaming** (entrega incremental de tokens, já padrão em Anthropic e OpenAI), não apenas respostas completas de uma vez — uma interface pensada apenas para "pedido → resposta única" exigiria uma alteração incompatível assim que o primeiro caso de uso beneficiar de streaming, o que é uma questão de quando, não de se.

Adicionalmente, a interface assume **capacidades heterogéneas entre fornecedores** (ex: nem todos suportam nativamente tool use ou entrada multimodal) através de um mecanismo de negociação de capacidades: cada adaptador declara o que suporta, e o Gateway nunca assume que todos os fornecedores são intercambiáveis 1-para-1 em todas as capacidades. Isto é o que torna a interface genuinamente preparada para fornecedores que ainda não existem — não apenas para os dois adaptadores iniciais (Anthropic, OpenAI).

**Regra explícita de fallback (adicionada após auditoria independente):** se um pedido exigir uma capacidade que o fornecedor configurado não suporta, o Gateway **nunca degrada silenciosamente nem tenta uma aproximação não solicitada** — devolve uma resposta explícita de "capacidade não suportada pelo fornecedor configurado", deixando ao módulo chamador a decisão de reconfigurar o fornecedor, simplificar o pedido, ou informar o Utilizador. Silenciosamente ignorar uma capacidade pedida seria uma forma de a IA agir de modo diferente do esperado sem o utilizador saber — o mesmo tipo de falha de confiança que a distinção sugestão/execução (3.7) já se propõe a evitar, aplicada agora à própria capacidade da resposta, não apenas à sua execução.

### 3.6 Neutralidade de Tipos — Proibição Explícita de Fuga de SDK

*Secção adicionada após revisão adversarial (pergunta 2) — a dependência dos SDKs oficiais só é segura se for impossível que essa dependência "vaze" para fora dos adaptadores.*

Os tipos de pedido e resposta do Gateway (`AIRequest`, `AIResponse`, e equivalentes) são **definidos de forma inteiramente independente de qualquer SDK de fornecedor** — nunca um alias, nem uma reexportação, de um tipo do SDK da Anthropic, da OpenAI, ou de qualquer outro. Cada adaptador é responsável por traduzir entre o tipo nativo do seu SDK e o tipo neutro do Gateway, nos dois sentidos. Esta regra é o que torna a Substituibilidade Controlada (System Design Principles, 3.8) real, e não apenas nominal: sem ela, trocar de fornecedor exigiria também alterar os módulos consumidores, exatamente o que a interface se propõe a evitar.

### 3.7 Distinção Estrutural Sugestão/Execução ao Nível de Tipos

*Secção adicionada após revisão adversarial (pergunta 5) — a distinção "sugestão vs. execução" (3.3, ponto 3) era, na versão original, uma convenção de comportamento, não uma impossibilidade verificável.*

O tipo de resposta que representa uma sugestão da IA (ex: `PendingSuggestion`) é **estruturalmente distinto e incompatível**, ao nível do sistema de tipos do TypeScript (já escolhido no ADR-002, precisamente por reduzir erros em código gerado por IA), do tipo que representa uma ação já confirmada e executável (ex: `ConfirmedAction`). Não existe conversão implícita entre os dois — só uma função explícita, correspondente à confirmação humana exigida por RN-08, transforma uma `PendingSuggestion` numa `ConfirmedAction`. Isto significa que um novo módulo, escrito por um programador ou pelo Claude Code sem conhecimento profundo desta arquitetura, **não consegue compilar** código que trate uma sugestão como já executada por engano — o erro é apanhado antes de chegar a produção, não depois.

### 3.8 Resiliência — Timeouts, Circuit Breaker e Isolamento de Falha

*Secção adicionada após revisão adversarial (pergunta 1) — a versão original não definia comportamento perante lentidão ou indisponibilidade de um fornecedor, um cenário certo de acontecer, não hipotético.*

O Gateway aplica, a toda chamada a um fornecedor de IA:
- **Timeout explícito**, para que uma chamada lenta nunca fique pendente indefinidamente nem consuma recursos sem limite.
- **Circuit breaker por fornecedor** — se um fornecedor falhar ou exceder o timeout repetidamente num curto período, o Gateway deixa de tentar esse fornecedor durante uma janela de tempo, respondendo com falha segura imediata (3.3, ponto 5) em vez de continuar a tentar e a degradar a experiência de todas as Empresas que o usam.
- **Isolamento de falha** — a indisponibilidade do fornecedor de IA nunca afeta operações não relacionadas com IA (criar uma Tarefa, consultar o CRM); esta é uma propriedade já favorecida pelo modelo assíncrono não-bloqueante do runtime já escolhido (ADR-002), mas fica aqui fixada como requisito explícito, não como uma esperança sobre o comportamento da tecnologia subjacente.

### 3.9 Disciplina de Cache com Escopo de Tenant

*Secção adicionada após revisão adversarial (pergunta 6) — o risco mais sério identificado nessa primeira revisão: nenhuma forma de cache existe hoje no Gateway, mas é uma otimização de custo provável no futuro, e a regra tem de existir antes de essa tentação aparecer.*

Se, no futuro, for introduzida qualquer forma de cache de pedidos ou respostas de IA (ex: para reduzir custo em perguntas repetidas), a chave de cache **inclui obrigatoriamente o `tenant_id`** da Empresa de origem, seguindo exatamente a mesma disciplina já aplicada a todo o resto da plataforma (ADR-001, ADR-003). Nenhuma resposta de IA gerada no contexto de uma Empresa pode, por partilha de cache, ser servida a outra. Esta regra é fixada agora, sem que exista ainda nenhum cache implementado, precisamente para que a sua implementação futura nunca tenha de "descobrir" este requisito tarde demais.

### 3.9a Volume de Auditoria a Longo Prazo — Risco Identificado, Não Resolvido Aqui

*Secção adicionada após auditoria independente (pergunta 3) — um risco real de escala que nenhum documento anterior confrontou.*

O AI Gateway será, com elevada probabilidade, a maior fonte de volume de eventos no Registo de Auditoria de toda a plataforma — uma interação de IA gera auditoria a uma frequência muito superior à generalidade das ações manuais dos outros módulos. O Data & Consistency Rules (3.3) já fixa que o Registo de Auditoria é append-only e imutável — correto, e não revisto aqui. Mas nem esse documento nem este ADR endereçam **particionamento, arquivo, ou estratégia de retenção a longo prazo** para uma tabela que, a milhares de Empresas, pode crescer para dezenas de milhões de entradas.

Este ADR **não resolve** esta questão — seria uma decisão prematura de infraestrutura antes de existir volume real para a informar. Mas, consistente com o processo de governação já estabelecido, o risco fica **explicitamente registado** como requisito de entrada para o ADR-007 (Infraestrutura), em vez de ficar silenciosamente ausente de toda a documentação até se tornar um incidente de produção.

### 3.10 Documentos que Este ADR Reforça

- **FR-26, FR-27, FR-28:** tornam-se implementáveis através de um único componente coerente.
- **Event & Notification Architecture Rules (3.8):** o Gateway respeita a distinção estrutural entre "sugestão gerada" e "ação confirmada", agora reforçada ao nível de tipos (3.7).
- **Security & Access Principles (3.6, 3.9):** a IA sujeita-se ao mesmo mecanismo de autorização e ao mesmo Fail Secure, agora com timeout e circuit breaker explícitos (3.8).
- **Vision Document (3.9, Filosofia de IA):** "o utilizador mantém sempre o controlo" torna-se propriedade estrutural, não apenas afirmação.
- **System Design Principles (3.2, 3.8):** o exemplo mais direto até agora de Substituibilidade Controlada e de respeito rigoroso pelas fronteiras de módulo, após a correção de 3.3.
- **ADR-001, ADR-003 (disciplina de tenant_id):** estendida agora explicitamente à futura disciplina de cache (3.9).

### 3.11 Documentos e Decisões que Este ADR Passa a Condicionar

- **Coding Standards (Fase 3c):** convenção de que nenhum módulo chama um SDK de fornecedor de IA diretamente, e que nenhum tipo de SDK é reexportado fora de um adaptador.
- **ADR-007 (Infraestrutura):** chaves de API dos fornecedores tratadas como segredos geridos (Security & Access Principles, 3.8); parâmetros de timeout e circuit breaker fazem parte da configuração operacional.
- **Futuro Arco 4 (Autonomia Agêntica):** estende a política de autonomia já modelada aqui, em vez de exigir um novo componente.
- **Fase 5:** o contrato exato da interface do Gateway, incluindo streaming e negociação de capacidades (3.5), é especificado em detalhe.
- **Product & Security Decisions Register:** recebe duas novas entradas — residência de dados de IA (PSD-002) e granularidade de conteúdo no Registo de Auditoria de IA (PSD-003).
- **ADR-007 (requisito adicional):** deve endereçar explicitamente a estratégia de particionamento/arquivo do Registo de Auditoria, dado o volume desproporcional gerado pelo AI Gateway (3.9a), e a calibração dos limites de quota por Empresa (3.3, ponto 6).

### 3.12 Riscos que Esta Decisão Elimina

- Elimina a dependência de um único fornecedor de IA.
- Elimina o risco de governação (confirmação humana, auditoria) implementada de forma inconsistente entre módulos.
- Elimina o risco de dados fora do escopo RBAC serem incluídos, por acidente, num pedido a um fornecedor externo — agora reforçado pela correta atribuição desta responsabilidade ao módulo chamador (3.3, ponto 1 corrigido).
- Elimina o risco de uma sugestão de IA ser tratada como já executada por erro de código (3.7).
- Elimina o risco de fuga de contexto entre Empresas através de uma futura camada de cache (3.9).

### 3.13 Novos Riscos que Esta Decisão Introduz

- **Inconsistência de qualidade entre fornecedores.** *Mitigação:* fornecedor por defeito bem escolhido por tipo de pedido (3.4), decisão deliberada, não trocada sem motivo.
- **Latência e custo variáveis entre fornecedores.** *Mitigação:* monitorização de custo/latência a detalhar no ADR-007.
- **Indisponibilidade ou lentidão de um fornecedor degradar a plataforma.** *Mitigação:* timeout e circuit breaker por fornecedor (3.8) — risco identificado na revisão adversarial e já corrigido neste documento, não apenas mitigado em teoria.
- **Fuga de tipos de SDK para o contrato público do Gateway, comprometendo a Substituibilidade Controlada.** *Mitigação:* proibição explícita e regra de neutralidade de tipos (3.6).

### 3.14 Consequências Técnicas, Operacionais e de Negócio

| Dimensão | Consequência |
|---|---|
| Técnica | Serviço "AI Gateway" com interface própria, neutra de tipos de SDK, preparada para streaming; adaptadores para Anthropic e OpenAI inicialmente; timeout e circuit breaker por fornecedor; distinção sugestão/execução ao nível de tipos |
| Operacional | Chaves de API de múltiplos fornecedores a gerir como segredos (ADR-007); monitorização de custo e disponibilidade por fornecedor; parâmetros de circuit breaker a calibrar com uso real |
| Negócio | A NEXA nunca fica refém de condições comerciais ou de disponibilidade de um único fornecedor de IA; capacidade de resposta segura mesmo com um fornecedor em falha reforça a confiança de clientes sensíveis a fiabilidade |

### 3.15 Aplicação do Princípio de Evolução Tecnológica

Este ADR é a aplicação mais completa até agora do Princípio de Evolução Tecnológica: a interface do AI Gateway é a fronteira; os fornecedores concretos são implementações substituíveis atrás dela. Adicionar, remover, ou trocar o fornecedor por defeito nunca exige alterar os módulos de negócio que consomem o Gateway — e, após a correção de 3.6 (neutralidade de tipos), essa garantia deixa de depender apenas de disciplina, passando a ser verificável pelo compilador.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | AI Gateway como interface própria, com adaptadores por fornecedor sobre SDKs oficiais | Evita a duplicação de camadas de abstração que a Opção C introduziria |
| D2 | O Gateway nunca gera diretamente um evento de execução, apenas de sugestão | Reforça estruturalmente a salvaguarda já decidida no Event & Notification Architecture Rules |
| D3 | Seleção de fornecedor como configuração, não código | Consistente com System Design Principles, 3.5 |
| D4 | A filtragem de dados por escopo RBAC é responsabilidade do módulo chamador, não do Gateway | Corrigido após revisão adversarial — evita que o Gateway viole fronteiras de módulo ao ter de compreender entidades de domínio |
| D5 | Interface preparada para streaming e capacidades heterogéneas desde o primeiro dia | Corrigido após revisão adversarial — evita desenhar uma interface já desatualizada face ao estado da arte |
| D6 | Neutralidade de tipos obrigatória — proibição explícita de reexportar tipos de SDK no contrato público | Corrigido após revisão adversarial — sem esta regra, a Substituibilidade Controlada seria nominal, não real |
| D7 | Distinção sugestão/execução reforçada ao nível do sistema de tipos, não apenas por convenção | Corrigido após revisão adversarial — torna o erro de contornar RN-08 impossível de compilar, não apenas improvável |
| D8 | Timeout e circuit breaker obrigatórios por fornecedor | Corrigido após revisão adversarial — sem isto, a indisponibilidade de um fornecedor tornar-se-ia um incidente de plataforma |
| D9 | Disciplina de `tenant_id` obrigatória em qualquer cache futuro de IA, fixada antes de existir cache | Corrigido após revisão adversarial — o risco mais sério identificado na primeira revisão; a regra existe antes da tentação de a violar |
| D10 | Regra de fallback explícita para capacidade não suportada — nunca degradação silenciosa | Corrigido após auditoria independente — evita que a IA aja de forma diferente do esperado sem o utilizador saber |
| D11 | Desambiguação explícita: a escrita de auditoria de IA é sempre imediata por evento discreto, nunca pendente da duração da chamada externa | Corrigido após auditoria independente — remove uma tensão de leitura com Data & Consistency Rules, 3.1 |
| D12 | Imposição de quota por Empresa no próprio Gateway, antes de cada chamada, não apenas monitorização a posteriori | Corrigido após auditoria independente — à escala de milhares de Empresas, monitorização sozinha é insuficiente para prevenir dano financeiro real |
| D13 | Risco de volume de auditoria a longo prazo explicitamente registado como requisito de entrada do ADR-007, não resolvido aqui nem deixado implícito | Corrigido após auditoria independente — evita que um risco real de escala fique silenciosamente ausente de toda a documentação |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Fornecedor por defeito para cada tipo de pedido — decisão de produto/custo | Fase 5, ou decisão operacional inicial | CEO + CTO |
| Q2 | Estratégia de monitorização de custo por fornecedor e por Empresa | ADR-007 | CTO |
| Q3 | Contrato exato da interface do Gateway, incluindo streaming | Fase 5 | CTO |
| Q4 | **Extraída para o Product & Security Decisions Register — ver PSD-002** (residência de dados de IA para clientes Enterprise futuros) | Produto/legal, não arquitetura | Ver registo |
| Q5 | **Extraída para o Product & Security Decisions Register — ver PSD-003** (granularidade de conteúdo — prompt/resposta completos vs. metadados — no Registo de Auditoria de IA) | Produto/legal, tensão com minimização de dados RGPD | Ver registo |
| Q6 | Estratégia exata de particionamento/arquivo do Registo de Auditoria, e calibração dos limites de quota por Empresa | ADR-007 | CTO |

---

## 6. Validação Arquitetural Final

*Assumindo o papel de Arquiteto Principal da NEXA — e, nesta segunda ronda, o de Arquiteto Principal independente, sem incentivo a confirmar o próprio trabalho anterior — revejo este documento pela segunda vez, com o mandato explícito de o tentar invalidar, não de o defender.*

**Primeira ronda (v1.1):** identificadas e corrigidas 5 fragilidades — baixo acoplamento violado, contrato desatualizado para streaming, fuga de tipos de SDK, distinção sugestão/execução não verificável em compilação, e ausência de resiliência a falhas de fornecedor.

**Segunda ronda (esta, v1.2), à escala de milhares de Empresas e dezenas de milhões de eventos:** identificadas mais 4 fragilidades reais, duas delas sérias:

1. Comportamento indefinido perante capacidade não suportada por um fornecedor — **corrigido (3.5)**.
2. Tensão de leitura entre a natureza assíncrona da chamada de IA e a garantia de consistência forte da auditoria — **desambiguado (3.3, ponto 4)**.
3. **Ausência de imposição rígida de quota por Empresa no Gateway** — o risco mais sério desta segunda ronda; monitorização de custo, por si só, não previne dano financeiro real à escala de milhares de Empresas — **corrigido (3.3, ponto 6)**.
4. **Ausência de estratégia de volume de auditoria a longo prazo**, dado que o AI Gateway é a maior fonte de eventos de auditoria de toda a plataforma — **registado explicitamente como requisito de entrada do ADR-007 (3.9a)**, não resolvido prematuramente aqui, mas também não deixado invisível.

Adicionalmente, uma questão de granularidade de auditoria (conteúdo completo vs. metadados) foi identificada como tendo peso legal genuíno — **extraída para o Product & Security Decisions Register (PSD-003)**, seguindo o mesmo processo já validado duas vezes antes.

**Respostas às 5 perguntas da auditoria independente:**

**Existe alguma decisão que dependa de conhecimento implícito não documentado?** Havia duas — ambas corrigidas nesta ronda (fallback de capacidade, granularidade de auditoria).

**Existe alguma contradição, mesmo subtil, com documento já aprovado?** Uma tensão de leitura, não uma contradição real — desambiguada explicitamente para eliminar qualquer interpretação futura incorreta.

**Existe algum risco arquitetural de longo prazo ainda não identificado?** Dois, ambos géneros de risco de escala que só se tornam visíveis ao pensar em "milhares de Empresas, dezenas de milhões de eventos" — exatamente o exercício pedido. Ambos endereçados: um corrigido diretamente (quota), outro corretamente registado como requisito futuro em vez de resolvido prematuramente (volume de auditoria).

**Existe algum ponto ambíguo para um futuro implementador?** As mesmas duas lacunas da pergunta 1, ambas fechadas.

**Mudaria alguma decisão nos próximos 10 anos?** A decisão central — não, continua a ser a correta, e as duas rondas de auditoria só a reforçaram. As correções aplicadas não alteram a arquitetura, tornam-na sólida o suficiente para não precisar de ser revisitada por estes motivos específicos daqui a 10 anos.

**Parecer final do Arquiteto Principal:** com as correções de ambas as rondas de revisão aplicadas, declaro este documento maduro para passar a fazer parte da arquitetura permanente da NEXA. Isto não significa que é impossível encontrar mais nada, dado tempo e escrutínio suficientes — significa que, com o rigor exigido e aplicado até este ponto, não encontro nenhuma fragilidade adicional que deva bloquear a sua aprovação. A robustez deste documento não vem de ter sido escrito bem à primeira — vem de ter sobrevivido a duas tentativas genuínas de o destruir.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo o AI Gateway como interface própria com adaptadores por fornecedor, aplicando o Princípio de Evolução Tecnológica com o maior rigor até agora, e reforçando estruturalmente a Filosofia de IA já aprovada no Vision Document | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Revisão adversarial completa (secção 6): identificadas e corrigidas 5 fragilidades reais — reatribuição da filtragem RBAC ao módulo chamador (preserva baixo acoplamento), contrato preparado para streaming e capacidades heterogéneas, neutralidade de tipos obrigatória, distinção sugestão/execução reforçada ao nível de tipos, timeout/circuit breaker por fornecedor, e disciplina de cache com escopo de tenant fixada preventivamente; Q4 (residência de dados de IA) extraída para o Product & Security Decisions Register (PSD-002) | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | Segunda auditoria independente, a escala de milhares de Empresas: corrigidas mais 4 fragilidades — regra de fallback para capacidade não suportada, desambiguação da escrita de auditoria assíncrona, imposição de quota por Empresa no Gateway (não apenas monitorização), e registo explícito do risco de volume de auditoria a longo prazo como requisito de entrada do ADR-007; Q5 (granularidade de auditoria de IA) extraída para o Product & Security Decisions Register (PSD-003) | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

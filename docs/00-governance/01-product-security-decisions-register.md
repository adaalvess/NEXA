# NEXA — Product & Security Decisions Register

| | |
|---|---|
| **Documento** | Product & Security Decisions Register |
| **Fase** | Transversal (não pertence a uma fase única) |
| **Versão** | 1.3 |
| **Estado** | Vivo — atualizado continuamente |
| **Owner** | Fundadora / CEO |
| **Natureza** | Registo formal, não documento de fase |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este registo existe para que **nenhuma questão com implicação legal, regulatória, de segurança, retenção ou eliminação de dados permaneça indefinidamente como "Questão em Aberto" dentro de um documento de engenharia**. Sempre que um documento de engenharia (Fase 3 em diante) fizer uma Descoberta Técnica desta natureza (processo já formalizado no System Design Principles, 3.7), a questão é **extraída para aqui**, com rastreabilidade própria, em vez de ficar hibridizada dentro da documentação técnica.

### Princípio de Funcionamento

1. **Origem:** um documento de engenharia identifica uma limitação técnica com implicação legal/regulatória/segurança/retenção/eliminação, e regista-a como Nota de Descoberta Técnica (não decide).
2. **Extração:** a questão é transcrita para este registo com um ID próprio (PSD-XXX), e o documento de engenharia de origem passa a apenas referenciar esse ID, sem manter a questão em aberto localmente.
3. **Resolução:** a decisão é tomada aqui, formalmente, pela Fundadora/CEO (com aconselhamento jurídico quando aplicável), e só depois refletida como requisito ou princípio nos documentos técnicos afetados.

---

## 2. Registo de Decisões

### PSD-001 — Eliminação Definitiva de Dados Pessoais (Hard-Delete) vs. Soft-Delete por Defeito

| | |
|---|---|
| **Origem** | Data & Consistency Rules v1.0, secção 3.4 (Nota de Descoberta Técnica) |
| **Estado** | 🕓 Pendente de decisão |
| **Data de abertura** | 2026-07-02 |

**Descrição:** A NEXA adota soft-delete como comportamento por defeito para eliminação de entidades (continuidade operacional, RN-09/RN-11). No entanto, a conformidade RGPD já aprovada (NFR-22, Vision Document 3.10) exige, nalgumas circunstâncias, o direito ao apagamento real e irreversível de dados pessoais — que o soft-delete, por natureza, não cumpre sozinho.

**Proposta de engenharia (não vinculativa):** manter soft-delete como comportamento por defeito, e definir um processo distinto e explícito de "eliminação definitiva de dados pessoais", acionável mediante pedido, que coexista com a obrigação legal de reter determinados registos de auditoria por motivos de conformidade.

**Decisão:** *(pendente)*

**Impacto quando decidido:** Functional Requirements (novo FR), Security & Access Principles (Fase 3), Data & Consistency Rules (referência cruzada).

---

### PSD-002 — Residência de Dados de IA para Clientes Enterprise Futuros

| | |
|---|---|
| **Origem** | ADR-005 (Camada de Abstração de IA), revisão adversarial, pergunta 4 |
| **Estado** | 🕓 Pendente de decisão |
| **Data de abertura** | 2026-07-02 |

**Descrição:** A NEXA usa fornecedores externos de IA (Anthropic, OpenAI) através do AI Gateway (ADR-005). Estes fornecedores processam pedidos fora da infraestrutura direta da NEXA. Para a generalidade dos clientes, isto é coerente com o modelo de isolamento lógico já aprovado (Vision Document, 3.10). No entanto, um futuro cliente Enterprise pode exigir, por razões contratuais, regulatórias ou de soberania de dados, que nenhum dado seu seja processado por infraestrutura de IA fora da União Europeia, ou mesmo fora da sua própria infraestrutura (modelos locais/self-hosted).

**Proposta de engenharia (não vinculativa):** o AI Gateway (ADR-005) já está desenhado com negociação de capacidades por adaptador (3.5) — um adaptador para um fornecedor de IA hospedado na UE, ou para um modelo local, seria tecnicamente viável de adicionar sem alterar a arquitetura. A decisão de **se e quando** oferecer esta opção, e a que nível de plano, é comercial e legal, não técnica.

**Decisão:** *(pendente)*

**Impacto quando decidido:** ADR-005 (novo adaptador), Business Goals (posicionamento comercial para Enterprise), Brand Book/pricing.

---

### PSD-003 — Granularidade de Conteúdo no Registo de Auditoria de Interações de IA

| | |
|---|---|
| **Origem** | ADR-005 (Camada de Abstração de IA), segunda auditoria independente |
| **Estado** | 🕓 Pendente de decisão |
| **Data de abertura** | 2026-07-02 |

**Descrição:** O AI Gateway regista toda interação no Registo de Auditoria (FR-28), incluindo o fornecedor usado. O que ainda não está decidido é se essa entrada inclui o **conteúdo completo** do prompt e da resposta (mais útil para investigação de incidentes e para demonstrar a um cliente exatamente o que a IA viu e respondeu) ou apenas **metadados** (tipo de pedido, entidade referenciada, timestamp, sem o texto completo). Existe uma tensão real entre a completude de auditoria já prometida no Vision Document (3.10) e o princípio de minimização de dados do RGPD — guardar indefinidamente o conteúdo completo de todas as interações de IA de todas as Empresas é uma decisão com peso legal, não apenas técnico.

**Proposta de engenharia (não vinculativa):** uma opção intermédia tecnicamente viável seria registar metadados completos sempre, e conteúdo completo apenas por um período limitado (ex: 30-90 dias, suficiente para resolução de incidentes), com purga automática do conteúdo (não do registo de auditoria em si, que mantém os metadados indefinidamente). Esta é uma proposta, não uma decisão.

**Decisão:** *(pendente)*

**Impacto quando decidido:** ADR-005 (especificação exata do que o Gateway grava), Data & Consistency Rules (política de retenção diferenciada), Security & Access Principles (retenção de auditoria, NFR-09).

---

### PSD-004 — Estratégia Fiscal de Longo Prazo (Seller of Record vs. Merchant of Record)

| | |
|---|---|
| **Origem** | ADR-008 (Pagamentos e Faturação) |
| **Estado** | 🕓 Pendente de decisão |
| **Data de abertura** | 2026-07-02 |

**Descrição:** A NEXA adota Stripe Checkout com Stripe Tax (ADR-008), mantendo-se como "seller of record" — responsável pela sua própria conformidade fiscal de IVA, com o cálculo automatizado mas a remessa ainda a cargo da NEXA. Alternativas como Paddle ou Lemon Squeezy assumiriam o papel de Merchant of Record, eliminando essa responsabilidade em troca de comissões mais elevadas e menor controlo de marca. A decisão certa pode mudar à medida que a NEXA expande para mais países e a complexidade fiscal aumenta.

**Proposta de engenharia (não vinculativa):** manter Stripe/Stripe Tax enquanto a operação for maioritariamente portuguesa/europeia com baixo volume de países distintos; reconsiderar migração para um modelo MoR se e quando o número de jurisdições fiscais distintas tornar a gestão manual desproporcional para uma equipa sem departamento fiscal dedicado.

**Decisão:** *(pendente)*

**Impacto quando decidido:** ADR-008 (possível revisão do processador), Business Goals (custo de comissões vs. custo de conformidade), Brand Book (perceção de marca na fatura).

---

## 3. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Este registo é transversal, não pertence a nenhuma fase específica, e nunca fica "concluído" | Questões desta natureza podem surgir em qualquer fase futura (Fase 4, ou mesmo pós-lançamento); um registo vivo é o único formato coerente |
| D2 | Cada entrada mantém uma proposta de engenharia explicitamente marcada como "não vinculativa", separada da decisão final | Preserva a separação de mandatos já formalizada no System Design Principles (3.7) — a engenharia informa, nunca decide, matérias desta natureza |

---

## 4. Questões em Aberto

*(Este registo não tem "Questões em Aberto" próprias no sentido dos outros documentos — as suas entradas individuais são, elas próprias, as questões geridas pelo registo.)*

---

## 5. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do registo, com a extração da PSD-001 (RGPD hard-delete vs. soft-delete) do Data & Consistency Rules v1.0 | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada a PSD-002 (residência de dados de IA para clientes Enterprise futuros), extraída da revisão adversarial do ADR-005 | CTO (Claude) + Fundadora/CEO |
| 1.2 | 2026-07-02 | Adicionada a PSD-003 (granularidade de conteúdo no Registo de Auditoria de IA), extraída da segunda auditoria independente do ADR-005 | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | Adicionada a PSD-004 (estratégia fiscal de longo prazo, seller of record vs. Merchant of Record), extraída do ADR-008 | CTO (Claude) + Fundadora/CEO |

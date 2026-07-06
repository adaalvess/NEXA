# NEXA — System Design Principles

| | |
|---|---|
| **Documento** | System Design Principles |
| **Fase** | 3 — Engineering Principles (1 de 4) |
| **Versão** | 1.6 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | PRD v1.0 · Data Model Conceptual v1.1 · Functional Requirements v1.1 · Non-Functional Requirements v1.0 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento fixa os **princípios estruturais de arquitetura de software** da NEXA — como o sistema se organiza internamente, onde se traçam as fronteiras entre partes, e que regras de desenho toda a implementação futura tem de respeitar. É normativo, não funcional: não redefine nenhuma entidade, requisito ou decisão de produto já aprovada — impõe disciplina técnica sobre o que já está definido.

### Nota de Clarificação de Âmbito

Consistente com a autorização explícita desta fase: este documento **não escolhe tecnologia** (linguagem, framework, base de dados) — isso pertence a Architecture Decision Records (ADRs) específicos, a produzir depois destes 4 documentos de princípios. Onde uma escolha de tecnologia influencia diretamente um princípio estrutural, esse princípio é enunciado de forma tecnologicamente neutra, com a decisão de tecnologia explicitamente remetida para o ADR correspondente.

---

## 2. Contexto

Os princípios aqui definidos partem de restrições já aprovadas que têm implicação arquitetural direta: uma única pessoa mantém o código com apoio de ferramentas de IA (Discovery, Pergunta 5); a plataforma tem de suportar 10-50 empresas piloto e escalar para milhares sem reconstrução (NFR-10, NFR-11); a arquitetura tem de ser modular o suficiente para novos módulos serem adicionados sem alterar os existentes (NFR-18); e a futura app nativa (fora do MVP) terá de consumir a mesma API que a interface web (Vision Document, Discovery).

---

## 3. Conteúdo Estruturado

### 3.1 Estilo Arquitetural — Monólito Modular

**Decisão:** a NEXA arranca como um **monólito modular** — uma única aplicação implantável, internamente organizada em módulos com fronteiras rigorosas, em vez de microsserviços desde o dia 1.

| Opção | Prós | Contras |
|---|---|---|
| **Microsserviços desde o início** | Escalabilidade independente por serviço; isolamento de falhas | Overhead operacional (deployment, observabilidade, comunicação inter-serviços) incompatível com uma equipa de 1 pessoa; complexidade prematura sem volume que a justifique |
| **Monólito não-modular** ("big ball of mud") | Simplicidade inicial máxima | Viola diretamente NFR-18 (escalabilidade modular) — novos módulos e futura extração de serviços tornam-se caros e arriscados |
| **Monólito modular (escolhido)** | Simplicidade operacional de um único deployment; fronteiras internas claras preparam extração futura de serviços, se e quando o volume o justificar; alinhado com a capacidade real da equipa | Exige disciplina para não deixar as fronteiras internas degradarem-se com o tempo — mitigado pelas regras de 3.2 |

Esta decisão é revisível — não é definitiva para sempre, é a decisão certa para a escala e a equipa desta fase (Business Goals, H1-H2). Uma transição futura para serviços extraídos, se necessária, é uma decisão de arquitetura a tomar com base em evidência de escala real, não hoje.

### 3.2 Fronteiras de Módulo — Um Módulo, Uma Responsabilidade

Os módulos internos da aplicação espelham exatamente os módulos já definidos no Functional Specifications: **Fundação** (Empresa, Utilizador, RBAC, Auditoria, Partilha), **Dashboard**, **Processos e Tarefas**, **CRM**, **Assistente de IA**, **Comercial** (Planos/Subscrições).

Regras que qualquer implementação deve cumprir:

1. **Cada módulo possui os seus próprios dados.** Nenhum módulo acede diretamente aos dados internos de outro — comunica através de uma interface interna explícita (função, serviço interno, ou evento — nunca uma consulta direta cruzando fronteiras).
2. **A Fundação é a única camada com acesso transversal.** RBAC, Auditoria e Partilha (Fundação) podem ser consultados por qualquer módulo, porque a sua natureza é, por definição, transversal (Data Model Conceptual, 3.1, Princípio 6) — mas o inverso nunca acontece: a Fundação não conhece detalhes internos do CRM ou dos Processos.
3. **Novos módulos (Arco 2) juntam-se sem alterar os existentes.** Um módulo novo consome as mesmas interfaces internas da Fundação (RBAC, Auditoria) que os módulos atuais consomem — nunca exige alterar a Fundação em si para se integrar (NFR-18).

### 3.3 API-First — Uma Única Superfície de Acesso

Toda a interação com o sistema — a interface web do MVP, e qualquer futura aplicação nativa (Product Vision, 3.6) ou integração externa (Arco 3) — passa pela **mesma camada de API**, nunca por acesso direto à base de dados a partir do cliente. Isto garante que:

- As regras de RBAC e visibilidade (Data Model Conceptual, Princípio 3) são aplicadas num único ponto, nunca duplicadas entre a interface web e uma futura app nativa.
- A futura app nativa (fora de âmbito do MVP) não exigirá nenhuma nova camada de lógica de negócio — apenas um novo consumidor da mesma API.

### 3.4 Aplicação Sem Estado (Stateless)

Os servidores de aplicação não guardam estado de sessão localmente — qualquer instância do servidor deve poder responder a qualquer pedido de qualquer utilizador. Esta é a condição técnica que torna possível a Escalabilidade Horizontal exigida em NFR-11, sem a qual "milhares de empresas" exigiria reescrever a aplicação, não apenas adicionar mais servidores.

### 3.5 Configuração Sobre Codificação Rígida (Hardcoding)

Limites de plano (FR-29 a FR-31), regras de permissão granulares por empresa (FR-04), e políticas de autonomia de IA por empresa (FR-27) são **dados de configuração**, nunca valores fixos no código. Um novo plano, ou uma nova regra de permissão para uma empresa específica, deve poder ser criado através de dados, sem exigir uma nova versão do código.

### 3.6 Enforcement de Multi-Tenancy num Único Ponto de Controlo

O isolamento entre Empresas (Workspace Context, Information Architecture 3.6.1) é aplicado **numa única camada de acesso a dados**, atravessada por todo e qualquer pedido — nunca implementado ad-hoc, módulo a módulo, através de filtros manuais espalhados pelo código. Esta é a implicação arquitetural direta do princípio já registado no Data Model Conceptual (3.1, Princípio 1) e da meta de zero-tolerância definida em NFR-05: um único ponto de controlo é auditável e testável; múltiplos pontos dispersos são o padrão de falha mais comum em fugas de dados multi-tenant.

### 3.7 Descoberta Técnica vs. Decisão de Produto (Processo de Governação Transversal)

Este princípio aplica-se a este documento e a todos os restantes da Fase 3 — Engineering Principles (Data & Consistency Rules, Event & Notification Architecture Rules, Security & Access Principles), e a qualquer ADR futuro.

Os documentos de engenharia **não têm autoridade para alterar decisões de produto já aprovadas** (Fases 1 e 2) por iniciativa própria. No entanto, o próprio processo de engenharia pode revelar limitações técnicas, inconsistências estruturais, ou impossibilidades de implementação que uma decisão de produto não previu no momento em que foi tomada. Quando isso acontecer, o processo correto é:

1. **Descoberta técnica** — a engenharia identifica e regista a limitação, de forma explícita, num documento de engenharia (como "Nota de Descoberta Técnica" ou Questão em Aberto), sem alterar unilateralmente a implementação, o princípio, nem a decisão de produto em causa.
2. **Proposta de reavaliação** — a descoberta é apresentada à Fundadora/CEO como uma proposta de reavaliação formal ao nível de produto, com as opções e trade-offs identificados — nunca como uma alteração já decidida ou implementada.
3. **Decisão de produto** — só depois de uma decisão formal (aprovada com o mesmo rigor de qualquer outra decisão desta documentação, nas Fases 1/2 correspondentes) é que a arquitetura ou o princípio de engenharia é atualizado para a refletir.

Esta separação — **engenharia descobre e reporta; produto decide; engenharia implementa a decisão** — evita dois riscos opostos: bloqueios arquiteturais por decisões de produto que a técnica não consegue cumprir sem revisão, e deriva silenciosa de produto por decisões de engenharia que ultrapassam o seu mandato.

**Reforço de governação (adicionado após a primeira aplicação prática deste processo):** questões com implicação legal, regulatória, de segurança, retenção ou eliminação de dados não permanecem como "Questão em Aberto" dentro de um documento de engenharia — são extraídas para o **Product & Security Decisions Register**, um registo transversal e vivo, com rastreabilidade e resolução próprias, mantendo os documentos de engenharia livres de decisões híbridas entre implementação técnica e política de produto/segurança.

**Limite do padrão de imposição estrutural (adicionado após a primeira salvaguarda arquitetural aplicada — Event & Notification Architecture Rules, 3.8):** a arquitetura pode, e deve, tornar uma regra de produto já decidida **estruturalmente verificável** — ex: uma impossibilidade técnica de um caminho que a regra proíbe. No entanto, este padrão tem um limite estrito: a arquitetura **nunca é o local primário de definição de comportamento funcional**. Uma salvaguarda estrutural só é legítima quando reforça uma decisão de negócio já estabelecida e inequívoca (com referência explícita ao FR/RN/princípio de produto de origem); nunca quando introduz, por iniciativa da engenharia, uma nova garantia de comportamento que o produto ainda não validou explicitamente. Esta distinção preserva a separação entre **definição funcional (produto)** e **imposição estrutural (engenharia)** — a arquitetura protege decisões, não as toma.

### 3.8 Princípio de Evolução Tecnológica — Substituibilidade Controlada

Este princípio é transversal a todos os Architecture Decision Records (Fase 3b) e a qualquer decisão de tecnologia futura, formalizado após a primeira aplicação prática do padrão em ADR-001 e ADR-002.

**Arquitetura e tecnologia são coisas distintas.** A arquitetura — os princípios estruturais fixados nestes 4 documentos — deve manter-se estável ao longo dos anos. A tecnologia concreta que a implementa (linguagem, framework, base de dados, fornecedores externos) pode evoluir, quando existir justificação objetiva, **sem comprometer a arquitetura, a lógica de negócio, ou a estabilidade da plataforma**.

Isto é operacionalizado através de **Substituibilidade Controlada**: sempre que tecnicamente justificável, uma decisão tecnológica fica encapsulada atrás de uma interface ou abstração própria, de forma a que os módulos consumidores dependam apenas dessa interface — nunca diretamente da tecnologia concreta por trás dela. Este padrão já está em prática nos dois primeiros ADRs, não é uma intenção nova:
- O enforcement de multi-tenancy (ADR-001, Camada 1) é uma interface de acesso a dados, não uma dependência direta de uma tecnologia de base de dados específica.
- O mecanismo de eventos (ADR-002, 3.3) está atrás de uma interface própria, não do EventEmitter do NestJS diretamente.

**Este princípio não reabre nenhuma decisão de tecnologia já tomada, nem é um convite a adiar compromissos.** Não muda o que foi decidido em ADR-001 ou ADR-002 — aplica-se apenas à forma como uma decisão já tomada é implementada: com encapsulamento suficiente para que uma evolução tecnológica futura seja incremental (trocar o que está atrás da interface), não uma reescrita de arquitetura. Cada ADR seguinte deve identificar explicitamente, na sua secção de Consequências, onde este princípio se aplica à decisão em causa.

### 3.9 Estrutura Obrigatória de um ADR — Validação Arquitetural

A partir do ADR-003, todo Architecture Decision Record da NEXA (Fase 3b em diante) segue uma estrutura de rigor elevado, formalizada aqui para que cada ADR a herde por referência, em vez de a repetir ou a reinterpretar:

**Secções obrigatórias, além do formato Nygard clássico (Contexto → Alternativas → Decisão → Consequências):**
- Documentos que o ADR **reforça** (referência explícita).
- Documentos e decisões futuras que o ADR passa a **condicionar**.
- Riscos que a decisão **elimina**.
- Riscos novos que a decisão **introduz**, cada um com mitigação explícita ou justificação para adiar a mitigação.
- Consequências técnicas, operacionais e de negócio, separadas.
- Aplicação explícita do Princípio de Evolução Tecnológica (3.8) à decisão em causa.

**Secção final obrigatória — Validação Arquitetural Final**, onde o autor assume o papel de Arquiteto Principal e responde, sem exceção, às seguintes 8 perguntas:

1. Esta decisão cria alguma dependência tecnológica desnecessária?
2. Existe algum risco de escalabilidade futura?
3. Existe algum risco de segurança, performance ou manutenção ainda não suficientemente mitigado?
4. Esta decisão continua coerente com todos os princípios definidos no Vision Document, PRD, NFRs, Engineering Principles e ADRs anteriores?
5. Há alguma oportunidade de reforçar a arquitetura sem aumentar complexidade desnecessária?
6. Existe alguma lacuna documental que deva ser resolvida agora para evitar dívida técnica futura?
7. Esta decisão continuará válida daqui a cinco ou dez anos, assumindo que a NEXA cresce de dezenas para milhares de empresas?
8. **Esta decisão continua alinhada com a filosofia fundacional da NEXA — simplicidade, evolução incremental, baixo acoplamento, independência tecnológica, segurança por defeito, e manutenção assistida por IA?**

A pergunta 8 é um ponto de verificação transversal deliberadamente distinto das restantes 7: enquanto as perguntas 1-7 avaliam a decisão nos seus próprios termos técnicos (riscos, escalabilidade, coerência documental), a pergunta 8 verifica se a decisão, mesmo sendo tecnicamente correta, permanece fiel ao espírito fundacional da NEXA registado desde o Vision Document e o Manifesto (3.8 desse documento) — a mesma distinção entre "correto" e "certo para a NEXA" que já orientou toda a documentação anterior.

Se qualquer uma das 8 perguntas revelar uma inconsistência real, o ADR não avança automaticamente para aprovação — a inconsistência é explicitada, o seu impacto explicado, e uma proposta fundamentada apresentada antes do documento ser dado como maduro.

**Separação entre decisão e narrativa de auditoria (a partir do ADR-006):** a Validação Arquitetural Final de cada ADR regista o veredito e a lista de correções aplicadas, por referência — nunca a narrativa completa do processo de revisão (perguntas colocadas, raciocínio de cada resposta, fragilidades exploradas em detalhe). Essa narrativa completa vive no **Architecture Review Log**, um registo transversal próprio, com uma entrada (AR-XXX) por auditoria, ligada ao ADR correspondente. Esta separação existe para que os ADRs permaneçam documentos de decisão, rápidos de consultar, à medida que o número de ADRs e de ciclos de revisão da NEXA crescer — sem perder nenhum detalhe do raciocínio, apenas deslocando-o para o local certo.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Estilo arquitetural: monólito modular, não microsserviços | Adequado à escala real (10-50 empresas piloto) e à equipa real (1 pessoa + IA); microsserviços introduziriam complexidade operacional sem benefício mensurável nesta fase |
| D2 | Módulos internos espelham exatamente os módulos do Functional Specifications, sem reinterpretação | Cumpre a restrição explícita desta fase de não redefinir entidades ou módulos já aprovados |
| D3 | RBAC, Auditoria e Partilha (Fundação) são a única camada com acesso transversal reconhecido; nenhum outro módulo tem esse privilégio | Evita que a exceção necessária (dados transversais) se torne desculpa para acoplamento generalizado entre módulos |
| D4 | O enforcement de multi-tenancy é centralizado num único ponto de controlo na camada de acesso a dados | Torna o isolamento auditável e testável como uma unidade, consistente com o critério de zero-tolerância já fixado em NFR-05 |
| D5 | Formalizado o processo de governação "Descoberta Técnica vs. Decisão de Produto" (3.7), aplicável a toda a Fase 3 | Distingue claramente o mandato da engenharia (descobrir e reportar limitações) do mandato do produto (decidir), evitando tanto bloqueios arquiteturais silenciosos como alterações de produto não autorizadas feitas "pela porta técnica" |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | O critério exato que determinaria uma futura extração de um módulo do monólito para um serviço próprio (ex: volume de utilizadores, carga específica de um módulo) ainda não está definido | Revisão futura de arquitetura, pós-validação do MVP | CTO, com base em dados reais de produção |
| Q2 | O mecanismo técnico exato do "único ponto de controlo" de multi-tenancy (ex: middleware, camada de ORM, proxy de base de dados) depende da tecnologia escolhida nos ADRs seguintes | ADR de Base de Dados, ADR de Stack Backend | CTO, nos ADRs específicos |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 6 princípios de desenho estrutural (estilo arquitetural, fronteiras de módulo, API-first, stateless, configuração sobre hardcoding, enforcement centralizado de multi-tenancy), tecnologicamente neutro conforme âmbito autorizado para esta fase | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada a secção 3.7, formalizando o processo de governação "Descoberta Técnica vs. Decisão de Produto", transversal a toda a Fase 3 | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.2 | 2026-07-02 | Adicionado reforço de governação a 3.7: questões legais/regulatórias/de segurança/retenção/eliminação são extraídas para o novo Product & Security Decisions Register, não permanecendo em aberto em documentos de engenharia | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | Adicionada clarificação a 3.7: a arquitetura pode reforçar e tornar verificável uma regra de produto já decidida, mas nunca é o local primário de definição de comportamento funcional — limite aplicado após a primeira salvaguarda estrutural real (Event & Notification Architecture Rules, 3.8) | CTO (Claude) + Fundadora/CEO |
| 1.4 | 2026-07-02 | Adicionada a secção 3.8, formalizando o Princípio de Evolução Tecnológica — Substituibilidade Controlada, transversal a todos os ADRs da Fase 3b, com exemplos já praticados em ADR-001 e ADR-002 | CTO (Claude) + Fundadora/CEO |
| 1.5 | 2026-07-02 | Adicionada a secção 3.9, formalizando a Estrutura Obrigatória de um ADR (documentos reforçados/condicionados, riscos eliminados/introduzidos, consequências) e as 8 perguntas obrigatórias de Validação Arquitetural Final, incluindo a nova pergunta de alinhamento com a filosofia fundacional da NEXA | CTO (Claude) + Fundadora/CEO |
| 1.6 | 2026-07-02 | Adicionada regra de governação: a partir do ADR-006, a narrativa completa de auditorias arquiteturais move-se para o novo Architecture Review Log, mantendo os ADRs focados em decisão e rastreabilidade | CTO (Claude) + Fundadora/CEO |

# NEXA — Architecture Review Log

| | |
|---|---|
| **Documento** | Architecture Review Log |
| **Fase** | Transversal (não pertence a uma fase única) |
| **Versão** | 1.0 |
| **Estado** | Vivo — atualizado a cada auditoria arquitetural |
| **Owner** | CTO / Arquiteto Principal |
| **Natureza** | Registo formal, não documento de fase |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento é o **repositório único da narrativa completa de auditorias arquiteturais** — revisões adversariais, auditorias independentes, e qualquer processo crítico de validação aplicado a um ADR ou a outro documento de engenharia. Existe para que os ADRs se mantenham focados na **decisão, nas suas consequências e na rastreabilidade** (o que foram desenhados para ser), sem acumular, ao longo do tempo, o relato completo de cada ronda de escrutínio que os validou.

### Princípio de Funcionamento

1. Sempre que um ADR (ou outro documento de engenharia) é submetido a uma revisão crítica formal — adversarial ou de auditoria independente — o processo completo (perguntas colocadas, fragilidades encontradas, correções aplicadas) é registado **aqui**, com uma entrada própria.
2. O ADR de origem mantém apenas um **resumo conciso**: veredito final, lista de correções aplicadas por referência, e uma ligação explícita à entrada correspondente deste registo — nunca a narrativa completa.
3. Este princípio aplica-se **a partir do ADR-006, inclusive** — os ADRs já aprovados (001-005) mantêm a sua narrativa de auditoria como está, por não haver benefício em reescrever documentação já fechada e aprovada apenas por consistência estética.

---

## 2. Registo de Auditorias

### AR-001 — ADR-005 (Camada de Abstração de IA Multi-Fornecedor), Revisão Adversarial

| | |
|---|---|
| **Documento auditado** | ADR-005 v1.0 → v1.1 |
| **Tipo de revisão** | Adversarial (mandato: tentar destruir a decisão, não confirmá-la) |
| **Data** | 2026-07-02 |

**Perguntas colocadas:** ponto único de falha/gargalo; dependência escondida de SDKs; abstração suficiente para fornecedores futuros; correção com 5 fornecedores simultâneos a 5 anos; risco de a política de autonomia ser contornada; risco de fuga de contexto entre Empresas; respeito pelo baixo acoplamento; manter-se-ia a decisão a 10 anos.

**Fragilidades encontradas (5):** responsabilidade de filtragem RBAC atribuída incorretamente ao Gateway (violação de fronteira de módulo); contrato sem suporte a streaming/capacidades heterogéneas; ausência de proibição de fuga de tipos de SDK; distinção sugestão/execução não verificável em compilação; ausência de timeout/circuit breaker.

**Resultado:** todas as 5 corrigidas em ADR-005 v1.1 (secções 3.3, 3.5, 3.6, 3.7, 3.8). Uma questão de produto (residência de dados de IA) extraída para o Product & Security Decisions Register, PSD-002.

### AR-002 — ADR-005 (Camada de Abstração de IA Multi-Fornecedor), Auditoria Independente à Escala

| | |
|---|---|
| **Documento auditado** | ADR-005 v1.1 → v1.2 |
| **Tipo de revisão** | Auditoria independente (mandato: escala de milhares de Empresas, dezenas de milhões de eventos, múltiplos fornecedores incluindo modelos locais, nova equipa) |
| **Data** | 2026-07-02 |

**Perguntas colocadas:** decisões dependentes de conhecimento implícito; contradições subtis com documentos aprovados; riscos arquiteturais de longo prazo ainda não identificados; ambiguidade para um futuro implementador; mudança de decisão perante um horizonte de 10 anos.

**Fragilidades encontradas (4):** comportamento indefinido perante capacidade de fornecedor não suportada; tensão de leitura entre a natureza assíncrona da chamada de IA e a garantia de consistência forte da auditoria; ausência de imposição rígida de quota por Empresa no Gateway (só monitorização); ausência de estratégia de volume de auditoria a longo prazo.

**Resultado:** as duas primeiras corrigidas diretamente em ADR-005 v1.2 (secções 3.5, 3.3). A imposição de quota corrigida como nova responsabilidade do Gateway (3.3, ponto 6). O risco de volume de auditoria não foi resolvido prematuramente — foi registado explicitamente como requisito de entrada do ADR-007 (3.9a), consistente com o princípio de não decidir infraestrutura sem evidência de escala real. Uma questão de produto (granularidade de conteúdo na auditoria de IA) extraída para o Product & Security Decisions Register, PSD-003.

---

## 3. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | A narrativa completa de auditorias vive neste registo, não nos ADRs, a partir do ADR-006 | Mantém os ADRs focados em decisão e rastreabilidade, evitando que cresçam indefinidamente com relato processual à medida que a NEXA acumular mais ciclos de revisão |
| D2 | Os ADRs 001-005 não são retroativamente editados para remover a narrativa de auditoria já neles incluída | Não há benefício real em reescrever documentação já aprovada apenas por consistência estética; o custo de o fazer não se justifica |
| D3 | Cada entrada deste registo é identificada por ID próprio (AR-XXX) e referenciada pelo ADR correspondente, seguindo o mesmo padrão já usado no Product & Security Decisions Register | Mantém a mesma disciplina de rastreabilidade cruzada já validada nesse registo |

---

## 4. Questões em Aberto

*(Este registo não tem "Questões em Aberto" próprias — a sua função é arquivar processo já concluído, não gerir decisões pendentes.)*

---

## 5. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do registo, com a migração retroativa da narrativa das duas rondas de auditoria do ADR-005 (AR-001, AR-002), estabelecendo o processo a seguir a partir do ADR-006 | CTO (Claude) + Fundadora/CEO |

# NEXA — ADR-001: Modelo de Multi-Tenancy e Isolamento de Dados

| | |
|---|---|
| **Documento** | ADR-001 — Modelo de Multi-Tenancy e Isolamento de Dados |
| **Fase** | 3b — Architecture Decision Records (1 de 7) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | System Design Principles v1.3 (3.6) · Data & Consistency Rules v1.1 · Data Model Conceptual v1.1 (Princípio 1) · Vision Document v1.1 (3.10) · NFR-05, NFR-09, NFR-10, NFR-11 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide o **mecanismo técnico de isolamento de dados entre Empresas (tenants)** — a primeira e mais estrutural decisão de arquitetura técnica da NEXA, da qual dependem diretamente o ADR-002 (Stack Backend), o ADR-003 (Base de Dados) e o ADR-004 (Autenticação).

---

## 2. Contexto

A NEXA já tem, aprovadas, várias restrições que esta decisão tem de respeitar:

- **Zero-tolerância a fugas de dados entre Empresas** (NFR-05) — não há margem de erro aceitável nesta decisão.
- **Enforcement de multi-tenancy num único ponto de controlo na camada de acesso a dados** (System Design Principles, 3.6) — já decidido que não pode ser implementado ad-hoc, módulo a módulo.
- **Escala inicial de 10-50 empresas piloto, evoluindo para milhares sem reconstrução** (NFR-10, NFR-11).
- **Mantibilidade por uma pessoa com apoio de IA** (NFR-16, Discovery Pergunta 5) — a complexidade operacional da solução escolhida tem de ser proporcional a essa realidade.
- **Preparação futura para isolamento físico em planos Enterprise** (Vision Document, 3.10) — já foi decidido, ao nível de produto, que o MVP usa isolamento lógico, mas que clientes Enterprise poderão, no futuro, optar por bases de dados dedicadas. Este ADR tem de deixar essa porta aberta, não de a implementar já.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — Base de Dados Partilhada, Schema Único, Isolamento por Coluna (tenant_id + Row-Level Security)**

Todas as Empresas partilham a mesma base de dados e as mesmas tabelas; cada linha tem uma coluna `tenant_id` (ou equivalente) que identifica a Empresa dona do registo.

| Prós | Contras |
|---|---|
| Operacionalmente mais simples — uma única base de dados para gerir, uma única migração de schema quando o modelo evolui | Isolamento depende inteiramente da correção da coluna `tenant_id` em cada tabela e de cada query — exige disciplina rigorosa |
| Mais barato e mais fácil de escalar horizontalmente para milhares de empresas (NFR-11) | "Vizinho ruidoso" — uma Empresa com volume anómalo de dados/tráfego pode, em teoria, afetar performance de outras (mitigável com índices e monitorização) |
| Adequado à mantibilidade por uma pessoa (NFR-16) — não exige gerir N bases de dados ou N schemas | Requer disciplina de engenharia forte para nunca esquecer o filtro de tenant numa query nova |

**Opção B — Base de Dados Partilhada, Schema Separado por Empresa (schema-per-tenant)**

Uma única base de dados, mas cada Empresa tem o seu próprio schema (conjunto de tabelas).

| Prós | Contras |
|---|---|
| Isolamento mais forte do que a Opção A — uma query mal escrita não consegue acidentalmente misturar dados de duas Empresas, porque estão em schemas diferentes | Não escala bem para milhares de Empresas — gerir milhares de schemas e aplicar uma migração a todos eles torna-se operacionalmente pesado (contradiz NFR-11 e NFR-16) |
| Mais fácil eliminar fisicamente todos os dados de uma Empresa (um "drop schema") | Mais complexo de implementar e manter do que a Opção A, sem benefício proporcional à escala-alvo da NEXA |

**Opção C — Base de Dados Dedicada por Empresa (database-per-tenant)**

Cada Empresa tem a sua própria base de dados fisicamente separada.

| Prós | Contras |
|---|---|
| Isolamento máximo — impossível uma query afetar outra Empresa, mesmo por erro grave de código | Inviável operacionalmente para uma pessoa gerir 10-50 bases de dados já no MVP, e incompatível com "milhares de empresas" (NFR-11) sem equipa de infraestrutura dedicada |
| Já é, precisamente, o modelo que o Vision Document (3.10) reserva para clientes Enterprise no futuro | Custo de infraestrutura desproporcional para a fase atual (10-50 empresas piloto) |

### 3.2 Decisão

**A NEXA adota a Opção A — base de dados partilhada, schema único, isolamento por `tenant_id`, para o MVP e para a generalidade dos clientes.**

É a única opção proporcional à escala real (10-50 empresas piloto → milhares), à equipa real (1 pessoa + IA), e coerente com a decisão de produto já aprovada de que o isolamento lógico é o padrão do MVP (Vision Document, 3.10). As Opções B e C foram descartadas para uso geral — a Opção C, no entanto, não é descartada em absoluto: fica reservada como caminho futuro para Empresas Enterprise específicas (3.4).

### 3.3 Enforcement — Camada Dupla (Aplicação do Princípio de Defense in Depth)

Consistente com o princípio já formalizado no Security & Access Principles (3.9, Defense in Depth — nenhuma camada de segurança deve ser assumida como suficiente sozinha), o isolamento de dados não depende de uma única salvaguarda:

1. **Camada 1 — Ponto único de controlo na camada de acesso a dados** (já decidido no System Design Principles, 3.6): toda a leitura e escrita passa por uma única camada de código que injeta automaticamente o filtro de `tenant_id` — nenhum módulo escreve queries "à mão" sem passar por esta camada.
2. **Camada 2 — Row-Level Security nativa da base de dados** (recomendada, condicionando o ADR-003): sempre que a base de dados escolhida no próximo ADR suportar Row-Level Security nativa, essa capacidade deve ser ativada como segunda camada independente — mesmo que a Camada 1 falhe por erro humano, a própria base de dados recusa devolver linhas de outra Empresa.

Esta dupla camada significa que uma falha isolada (um bug na Camada 1) não é, por si só, suficiente para causar uma fuga de dados — é exatamente o resultado que Defense in Depth se propõe a garantir.

### 3.4 Preparação para Isolamento Físico Futuro (Enterprise)

Esta decisão não fecha a porta à Opção C para clientes Enterprise específicos, conforme já prometido no Vision Document (3.10). A coluna `tenant_id`, sendo a identidade central de cada Empresa em todas as tabelas (Data Model Conceptual, Princípio 1), é precisamente o que tornaria tecnicamente possível, no futuro, "extrair" os dados de uma Empresa específica para uma base de dados dedicada — sem essa disciplina desde o início, essa migração futura seria muito mais difícil. Esta é a mesma lógica de preparação sem implementação antecipada já usada na camada de abstração de IA (Product Roadmap, D3).

### 3.5 Consequências

**Positivas:**
- Custo de infraestrutura proporcional à fase atual da empresa.
- Operacionalmente gerível por uma pessoa.
- Caminho de escala claro até milhares de empresas, sem mudança de modelo.
- Caminho de evolução para isolamento físico Enterprise, sem reconstrução do modelo de dados.

**Negativas (e mitigação):**
- Risco de erro humano esquecer o filtro de tenant → mitigado pela Camada 1 (ponto único de controlo) e pela exigência de cobertura de testes obrigatória para este fluxo específico (NFR-17).
- Risco de "vizinho ruidoso" a grande escala → mitigado por monitorização (a decidir em detalhe no ADR-007) e pela possibilidade de migrar Empresas específicas para isolamento físico se necessário (3.4).

**Trade-offs da decisão:**

Escolher a Opção A não é uma escolha sem custo — é a aceitação consciente de um conjunto específico de compromissos, em troca de outros:

| Aceita-se | Em troca de |
|---|---|
| Maior disciplina de engenharia exigida — o isolamento depende da correção da Camada 1 e da configuração da Camada 2, não é estruturalmente impossível de errar (ao contrário da Opção C) | Simplicidade operacional real para uma equipa de uma pessoa, desde o primeiro dia |
| Dependência de mecanismos de proteção ativos (ponto único de controlo + RLS) em vez de isolamento físico intrínseco | Custo de infraestrutura proporcional à escala atual, sem pagar por isolamento que a fase atual da empresa não exige |
| Risco residual (mitigado, nunca zero) de "vizinho ruidoso" entre Empresas de tamanhos muito diferentes | Capacidade de escalar para milhares de empresas sem mudança de modelo de arquitetura |
| Uma decisão que, no limite, é reversível apenas empresa a empresa (via migração para isolamento físico), não globalmente sem esforço | Manter a porta aberta ao isolamento físico Enterprise sem ter de o construir agora |

Estes trade-offs foram aceites deliberadamente, não ignorados — é essa a diferença entre uma decisão de arquitetura fundamentada e uma escolha por conveniência.

### 3.6 Critério Imposto ao Próximo ADR (Base de Dados)

Como consequência direta desta decisão, o ADR-003 (Base de Dados) deve **considerar o suporte a Row-Level Security nativa como critério relevante de avaliação** entre motores de base de dados candidatos — não como requisito absoluto (a Camada 1 funciona mesmo sem RLS nativa), mas como fator que reforça a segurança por Defense in Depth.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Isolamento lógico multi-tenant via `tenant_id` partilhado (Opção A), não schema-per-tenant nem database-per-tenant, para o MVP e generalidade dos clientes | Único modelo proporcional à escala e equipa reais, coerente com a decisão de produto já aprovada no Vision Document |
| D2 | Enforcement em dupla camada — ponto único de controlo na aplicação + Row-Level Security nativa da BD quando disponível | Aplica o princípio Defense in Depth já formalizado, em vez de depender de uma única salvaguarda para uma garantia classificada como zero-tolerância (NFR-05) |
| D3 | Isolamento físico (Opção C) mantido como caminho futuro para Enterprise, não implementado agora | Cumpre a promessa já feita no Vision Document sem antecipar trabalho de que ainda não há evidência de necessidade |
| D4 | Suporte a Row-Level Security nativa passa a critério de avaliação (não obrigatório) no ADR-003 | Torna esta decisão tecnicamente coerente com a seguinte, sem a pré-determinar |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | O processo técnico exato de "extração" de uma Empresa Enterprise para base de dados dedicada (3.4) não é especificado aqui — só a preparação estrutural que o torna possível | Futuro ADR ou runbook operacional, só quando houver procura real de um cliente Enterprise | CTO, quando o cenário se tornar real |
| Q2 | A tecnologia exata de base de dados (que determina se RLS nativa está disponível) é decidida no ADR-003, não aqui | ADR-003 | CTO, no próximo ADR |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo isolamento lógico via tenant_id partilhado (Opção A) com enforcement em dupla camada, coerente com System Design Principles, Security & Access Principles e a promessa de isolamento físico Enterprise já feita no Vision Document | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada subsecção "Trade-offs da decisão" a 3.5, tornando explícitos os compromissos conscientemente aceites (disciplina de engenharia, dependência de mecanismos de proteção, risco residual mitigado) em troca de simplicidade, custo e escala | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

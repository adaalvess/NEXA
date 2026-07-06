# NEXA — Data & Consistency Rules

| | |
|---|---|
| **Documento** | Data & Consistency Rules |
| **Fase** | 3 — Engineering Principles (2 de 4) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | System Design Principles v1.1 · Data Model Conceptual v1.1 · Vision Document v1.1 (3.10) (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento fixa as **regras de integridade, consistência e modelo transacional** da NEXA — como os dados permanecem corretos, íntegros e confiáveis ao longo do tempo, independentemente da tecnologia que os venha a implementar. É normativo, tecnologicamente neutro, e coerente com os princípios já fixados no System Design Principles.

### Nota de Clarificação de Âmbito

Este documento não redefine nenhuma entidade do Data Model Conceptual nem nenhum requisito funcional — define as regras que garantem que essas entidades permanecem consistentes quando implementadas. Segue o processo de governação já formalizado no System Design Principles (3.7): onde uma regra de consistência toca uma decisão de produto ainda não explícita, é registada como Nota de Descoberta Técnica, não decidida por conta própria.

---

## 2. Contexto

As regras aqui definidas decorrem diretamente de compromissos já aprovados: o critério de zero-tolerância a fugas de dados entre Empresas (NFR-05), a exigência de auditoria completa e confiável (Vision Document, 3.10), a garantia de que nenhum dado é eliminado por não conversão de trial (RN-09, RN-11), e o enforcement centralizado de multi-tenancy já fixado no System Design Principles (3.6).

---

## 3. Conteúdo Estruturado

### 3.1 Modelo de Consistência — Forte Dentro da Empresa, Eventual Apenas em Agregações

Toda a escrita de dados dentro do escopo de uma Empresa (criar uma Tarefa, alterar uma permissão, registar uma Interação) é **fortemente consistente** — uma leitura imediatamente a seguir a uma escrita reflete sempre essa escrita. A única exceção já aprovada é a atualização do Dashboard (NFR-04), que aceita um atraso máximo de 30 segundos por ser uma vista agregada, não uma operação de negócio crítica.

| Contexto | Modelo de consistência |
|---|---|
| Operações de escrita direta (criar/editar/eliminar uma entidade) | Forte — sempre |
| Registo de Auditoria | Forte — nunca atrasado, nunca opcional |
| Vistas agregadas (Dashboard) | Eventual, com atraso máximo de 30s (NFR-04) |

### 3.2 Integridade Referencial Nunca Atravessa Empresas

Toda relação entre entidades definida no Data Model Conceptual (ex: Tarefa-Cliente, Utilizador-Departamento) deve ser validada como pertencendo à **mesma Empresa** antes de ser gravada. Uma tentativa de criar uma referência entre entidades de Empresas diferentes é sempre rejeitada ao nível dos dados — nunca apenas bloqueada na interface. Esta regra estende diretamente o Princípio 1 do Data Model Conceptual e a Decisão D8 do Information Architecture (Deep Linking nunca resolve fora do Workspace Context correto).

### 3.3 O Registo de Auditoria é Imutável (Append-Only)

Uma vez escrita, uma entrada do Registo de Auditoria **nunca é editada nem eliminada** — só é possível adicionar novas entradas. Esta é a condição técnica sem a qual a garantia de confiança e rastreabilidade já prometida no Vision Document (3.10) não seria real: um registo de auditoria editável não é um registo de auditoria, é uma opinião.

### 3.4 Eliminação de Dados — Soft-Delete por Defeito

Por defeito, "eliminar" uma entidade (ex: um Cliente, uma Tarefa) marca-a como inativa/eliminada, sem remover fisicamente os dados — consistente com RN-09 e RN-11 (nenhum dado perdido por decisão comercial ou ausência de subscrição). Uma entidade eliminada deste modo:
- Deixa de ser visível na navegação normal e na Pesquisa Global.
- Permanece intacta no Registo de Auditoria e em qualquer referência histórica já existente.

> **Nota de Descoberta Técnica (processo 3.7, System Design Principles):** este princípio de soft-delete por defeito entra em tensão com a exigência de conformidade RGPD já aprovada (NFR-22, Vision Document 3.10) — o direito ao apagamento ("right to erasure") exige, nalgumas circunstâncias, eliminação física real e irreversível de dados pessoais, não apenas ocultação. Esta questão foi **extraída para o Product & Security Decisions Register (PSD-001)**, consistente com o reforço de governação que determina que questões com implicação legal, regulatória, de segurança, retenção ou eliminação de dados não permanecem como Questão em Aberto dentro de documentos de engenharia.

### 3.5 Concorrência — Last-Write-Wins com Rasto Auditado

Para o volume de utilizadores do MVP (10-50 empresas piloto), o risco de duas pessoas editarem a mesma entidade em simultâneo é baixo. A regra adotada é **last-write-wins** (a escrita mais recente prevalece), mas nunca de forma silenciosa: toda escrita fica registada no Registo de Auditoria (3.3), pelo que uma alteração nunca desaparece sem rasto, mesmo que tenha sido substituída. Mecanismos mais sofisticados de deteção e resolução de conflitos (ex: bloqueio otimista com aviso ao utilizador) ficam registados como evolução futura, a introduzir apenas se a evidência de uso real o justificar (consistente com "Ambição com Humildade").

### 3.6 Validação de Dados Numa Única Fronteira

As regras de validação já definidas no Functional Specifications (formato de email, obrigatoriedade de campos, limites de caracteres) são aplicadas **numa única camada**, a mesma que aplica as regras de negócio (RN-XX) — nunca duplicadas de forma independente apenas na interface. Isto estende à validação de dados o mesmo princípio já fixado no System Design Principles para o enforcement de multi-tenancy (3.6 desse documento): uma única fronteira é auditável; várias fronteiras dispersas divergem com o tempo.

### 3.7 Metadados de Auditoria Padrão em Toda Entidade

Toda entidade de negócio (não as transversais, que já são elas próprias metadados) mantém, de forma consistente: quando foi criada, por quem, quando foi alterada pela última vez, e por quem. Estes campos existem independentemente do Registo de Auditoria detalhado (3.3) — são um resumo rápido ao nível da própria entidade, e o Registo de Auditoria é a fonte completa e imutável do histórico.

### 3.8 Consistência do Enforcement RBAC e Partilha

A regra de visibilidade única já fixada no Data Model Conceptual (Princípio 3, Decisão D4) e no System Design Principles (3.6) aplica-se, sem exceção, também às concessões da entidade Partilha (FR-35): uma Partilha concedida a um Convidado é verificada no mesmo ponto de controlo de dados que qualquer outra regra RBAC, nunca como uma exceção lateral implementada de forma diferente.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Consistência forte para toda a escrita de negócio e auditoria; consistência eventual apenas para o Dashboard (já autorizado em NFR-04) | Evita introduzir eventual consistency onde a confiança do utilizador depende de ver imediatamente o resultado da sua própria ação |
| D2 | Registo de Auditoria é append-only, sem exceção | É a única forma de a garantia de rastreabilidade do Vision Document ser real, não apenas nominal |
| D3 | Soft-delete como comportamento por defeito, com a tensão face à conformidade RGPD extraída para o Product & Security Decisions Register (PSD-001) | Protege a continuidade operacional já garantida em RN-09/RN-11, sem ignorar a obrigação legal de RGPD — seguindo o reforço de governação que impede questões desta natureza de permanecerem em aberto dentro de documentação de engenharia |
| D4 | Concorrência resolvida por last-write-wins com auditoria completa, sem bloqueio otimista no MVP | Proporcional ao volume real de utilizadores esperado; evita complexidade de UI/UX de resolução de conflitos sem evidência de que é necessária |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | ~~Processo formal de hard-delete para RGPD~~ **Extraída para o Product & Security Decisions Register — ver PSD-001** | — | Ver registo |
| Q2 | Se e quando introduzir deteção de conflitos de concorrência mais sofisticada do que last-write-wins, deve ser decidido com base em incidentes reais reportados, não antecipadamente | Evolução futura pós-MVP | CTO, com base em dados de produção |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 8 regras de consistência e integridade de dados, coerentes com o System Design Principles v1.1; identificada e registada uma Nota de Descoberta Técnica sobre a tensão entre soft-delete e conformidade RGPD (Q1), seguindo o processo de governação formalizado | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | A questão Q1 (RGPD/hard-delete) foi extraída para o novo Product & Security Decisions Register (PSD-001), consistente com o reforço de governação que impede questões legais/regulatórias/de segurança de permanecerem em aberto em documentos de engenharia | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

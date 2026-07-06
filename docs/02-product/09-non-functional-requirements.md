# NEXA — Non-Functional Requirements

| | |
|---|---|
| **Documento** | Non-Functional Requirements |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | PRD v1.0 (3.5) · Success Metrics (KPIs) v1.0 · Vision Document v1.1 (3.10) · Business Goals v1.0 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento define os **atributos de qualidade e restrições transversais** sob os quais todos os requisitos funcionais (Functional Requirements) devem operar — desempenho, disponibilidade, segurança, escalabilidade, usabilidade, manutenibilidade, observabilidade e conformidade. Ao contrário do Functional Requirements (o que o sistema faz), este documento responde a **como o sistema deve fazer bem feito** aquilo que faz.

### Nota de Clarificação de Âmbito

Este documento consolida requisitos já anunciados como categorias no PRD (3.5), tornando-os concretos e, sempre que possível, mensuráveis. Não substitui o Success Metrics (que mede o negócio) nem antecipa Architecture Decision Records (que decidem a tecnologia) — define os **alvos de qualidade** que a arquitetura, seja qual for a tecnologia escolhida na Fase 3, terá de cumprir.

---

## 2. Contexto

Vários dos alvos aqui definidos já estavam implícitos em documentos anteriores (99,9% de disponibilidade no Success Metrics, isolamento multi-tenant no Vision Document) — este documento consolida-os num único lugar, formalizado como requisito, e acrescenta alvos que ainda não tinham sido explicitados (tempos de resposta, retenção de auditoria, cobertura de testes em fluxos críticos).

---

## 3. Conteúdo Estruturado

### 3.1 Disponibilidade e Performance

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-01 | Disponibilidade da plataforma | ≥99,9% mensal | Success Metrics, 3.2 |
| NFR-02 | Tempo de resposta de páginas principais (Dashboard, CRM, Processos) | Carregamento percecionado abaixo de 2 segundos em condições normais de rede | PRD, 3.5 (novo alvo, sem contradição com documentos anteriores) |
| NFR-03 | Tempo de resposta de operações de escrita (criar/editar entidade) | Confirmação ao utilizador abaixo de 1 segundo em condições normais | PRD, 3.5 |
| NFR-04 | Atualização do Dashboard com dados de outros módulos (resolve Functional Requirements, Q1) | **Decisão:** para o MVP, atualização por sincronização periódica (não necessariamente eventos em tempo real), com atraso máximo aceitável de 30 segundos entre uma alteração e a sua reflexão no Dashboard | Functional Requirements, FR-13 e Q1 |

### 3.2 Segurança

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-05 | Isolamento lógico de dados entre Empresas | Zero incidentes de fuga de dados entre tenants (critério binário, sem tolerância) | Vision Document, 3.10 |
| NFR-06 | Encriptação de dados em trânsito | Obrigatória em toda comunicação cliente-servidor | Vision Document, 3.10 (Security by Design) |
| NFR-07 | Encriptação de dados em repouso | Obrigatória para dados sensíveis (credenciais, dados pessoais) | Vision Document, 3.10 |
| NFR-08 | Autenticação | Palavras-passe nunca armazenadas em texto plano; políticas mínimas de robustez de palavra-passe | Vision Document, 3.10 |
| NFR-09 | Retenção do Registo de Auditoria | Mínimo de 12 meses, com possibilidade de retenção alargada em planos Enterprise (a confirmar em detalhe na Functional Specification) | Vision Document, 3.10 (novo alvo concreto) |

### 3.3 Escalabilidade

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-10 | Escala inicial suportada | 10-50 empresas piloto sem degradação de performance | Business Goals, H1.2 |
| NFR-11 | Escala futura sem reconstrução | Milhares de empresas e dezenas de milhares de utilizadores, através de arquitetura escalável (decisão de tecnologia pertence à Fase 3) | Business Goals, H3.1 |
| NFR-12 | Infraestrutura gerida (managed services) preferencial a self-hosted complexo | Consistente com a ausência de equipa técnica tradicional | Discovery, Pergunta 5 |

### 3.4 Usabilidade e Acessibilidade

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-13 | Responsividade | Experiência funcional e coerente em desktop, tablet e smartphone | Discovery |
| NFR-14 | Contraste de texto (acessibilidade) | Conformidade com WCAG AA (rácio mínimo 4.5:1) para texto corrente, consistente com a regra já definida no Brand Book | Brand Book, 3.3 |
| NFR-15 | Suporte multilíngue extensível | Arquitetura de internacionalização que suporte PT/EN no MVP e novos idiomas no futuro sem reestruturação | Vision Document, 2 |

### 3.5 Manutenibilidade

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-16 | Código organizado e documentado | Toda a base de código deve ser compreensível e mantível por uma única pessoa não-programadora profissional, apoiada por ferramentas de IA | Discovery, Pergunta 5 |
| NFR-17 | Cobertura de testes automatizados em fluxos críticos | Prioridade obrigatória para: isolamento multi-tenant, RBAC, faturação/limites de plano, execução de ações da IA — os quatro fluxos onde uma falha teria maior impacto de confiança ou segurança | Vision Document, 3.10 (novo alvo concreto) |
| NFR-18 | Arquitetura modular | Nenhuma alteração num módulo deve exigir reescrita de outro módulo não relacionado | Product Vision, 3.5 |

### 3.6 Observabilidade

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-19 | Instrumentação de eventos | Captura de todos os eventos já definidos no Success Metrics (3.6) desde o lançamento do MVP | Success Metrics, 3.6 |
| NFR-20 | Registo e alerta de erros | Erros críticos (severidade alta) devem ser detetáveis e resolvíveis em menos de 24h, consistente com o critério já definido no Success Metrics | Success Metrics, 3.2 |

### 3.7 Conformidade

| ID | Requisito | Alvo | Referência |
|---|---|---|---|
| NFR-21 | Alojamento de dados | Dentro da União Europeia | Vision Document, 3.10 |
| NFR-22 | Conformidade RGPD | Aplicável desde o lançamento do MVP, não como funcionalidade futura | Vision Document, 3.10 |

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | A atualização do Dashboard (NFR-04) resolve-se com sincronização periódica (atraso máximo 30s), não com infraestrutura de eventos em tempo real, no MVP | Resolve a Questão Q1 do Functional Requirements com uma solução tecnicamente simples e suficiente para o volume de utilizadores do MVP (10-50 empresas), evitando complexidade de infraestrutura desnecessária nesta fase — decisão de tecnologia exata (polling vs. outra abordagem) fica para a Fase 3 |
| D2 | Cobertura de testes automatizados é exigida apenas para 4 fluxos críticos (multi-tenant, RBAC, limites de plano, ações de IA), não para a totalidade do código | Equilibra rigor de segurança/confiança com a realidade de uma equipa de uma pessoa e um horizonte de 6 meses — testar exaustivamente tudo seria desproporcional; não testar os fluxos de maior risco seria irresponsável |
| D3 | Retenção do Registo de Auditoria fixada em mínimo 12 meses, com alargamento possível em planos Enterprise | Dá um alvo concreto e implementável, alinhado com práticas comuns de conformidade, sem comprometer decisões de pricing detalhadas ainda por definir |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Os alvos de tempo de resposta (NFR-02, NFR-03) são estimativas razoáveis, mas devem ser validados/ajustados assim que existir infraestrutura real para medir | Fase 3 (Arquitetura Técnica), ADRs de infraestrutura | CTO, após os primeiros testes de carga |
| Q2 | O período exato de retenção de auditoria para planos Enterprise (além do mínimo de 12 meses) ainda não está definido | Functional Specification, modelo de pricing | CEO, a decidir com o pricing detalhado |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, consolidando 22 requisitos não-funcionais em 7 categorias, incluindo a resolução formal da Questão Q1 do Functional Requirements sobre atualização do Dashboard (NFR-04) | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

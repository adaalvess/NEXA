# NEXA — AI Principles (Versão Essencial)

| | |
|---|---|
| **Documento** | AI Principles |
| **Fase** | 3d — Engenharia (versão essencial) |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado — Vivo (evolui com a experiência de desenvolvimento) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Vision Document v1.1 (3.9) · ADR-005 · Event & Notification Architecture Rules v1.1 (3.8) · Security & Access Principles v1.1 (3.6) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento consolida, num único lugar de referência técnica, os princípios de IA já decididos em múltiplos documentos anteriores — a versão essencial, sem introduzir nada novo, para que quem construir o módulo de IA tenha uma referência única em vez de ter de cruzar 4 documentos.

---

## 2. Conteúdo Estruturado

### 2.1 Os 5 Princípios (Consolidados)

1. **A IA nunca age sem confirmação humana explícita, no MVP.** (Vision Document, 3.9; RN-08). Estruturalmente garantido, não apenas por convenção — o AI Gateway nunca gera diretamente um evento de execução (ADR-005, 3.3; Event & Notification Architecture Rules, 3.8), e a distinção é verificável ao nível do sistema de tipos (ADR-005, 3.7).
2. **A IA está sempre sujeita às mesmas regras de autorização que qualquer outro acesso a dados.** (Security & Access Principles, 3.6). Nunca tem um caminho de acesso privilegiado ou paralelo.
3. **A NEXA nunca depende de um único fornecedor de IA.** (FR-26; ADR-005). Toda a integração passa pelo AI Gateway, com adaptadores substituíveis.
4. **Toda interação de IA é auditada.** (FR-28; ADR-005, 3.3). A granularidade exata de conteúdo (prompt/resposta completos vs. metadados) está registada como decisão pendente no Product & Security Decisions Register (PSD-003).
5. **Autonomia de IA é sempre configurável por Empresa, nunca imposta.** (FR-27). O nível C (execução autónoma) não está ativo no MVP e só será considerado com evidência real (Product Roadmap, H3.3).

### 2.2 O Que Isto Significa na Prática do Código

- Nenhum módulo chama um SDK de fornecedor de IA diretamente — só o AI Gateway (Coding Standards, 3.7).
- Nenhuma resposta da IA é tratada como ação executável sem passar pela confirmação humana — a distinção de tipos (ADR-005, 3.7) torna isto um erro de compilação, não apenas uma regra a lembrar.
- Qualquer dado incluído num pedido à IA já foi filtrado pelo escopo RBAC de quem pergunta, antes de chegar ao Gateway (ADR-005, 3.3, responsabilidade corrigida na revisão adversarial).

---

## 3. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Este documento não introduz nenhum princípio novo — consolida o que já está decidido em 4 documentos anteriores | Evita duplicação ou divergência de definição do mesmo princípio em vários lugares; um único ponto de referência técnica para a IA |

---

## 4. Questões em Aberto

*(Todas as questões em aberto relacionadas com IA permanecem nos seus documentos de origem — ADR-005, PSD-002, PSD-003 — e não são repetidas aqui.)*

---

## 5. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação da versão essencial, consolidando os princípios de IA já decididos no Vision Document, ADR-005, Event & Notification Architecture Rules e Security & Access Principles | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial como documento vivo** — evolui com a experiência de desenvolvimento, sem atrasar o início da construção | Fundadora/CEO |

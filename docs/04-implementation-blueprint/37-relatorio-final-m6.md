# NEXA — Relatório Final de Encerramento do Milestone M6 (Passo 38)

| | |
|---|---|
| **Documento** | Relatório final de encerramento do M6 — Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6, Passo 38 — último passo do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído (2026-07-11) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Todos os documentos do M6 (Passos 32-37); Use Cases; NFR-17; Proposta do Milestone M6 (aprovada em chat, 2026-07-08/09) |
| **Última atualização** | 2026-07-11 |

---

## 1. Objetivo

Consolidar, num único documento, os resultados dos 6 passos do M6 (32-37) — cobertura automatizada dos 4 fluxos críticos (NFR-17), enforcement de `limiteUtilizadores` (RN-10) e validação manual dos 8 Use Cases do MVP — e emitir uma recomendação formal e fundamentada sobre o encerramento do Milestone. Este é um relatório de consolidação, não um passo de implementação ou de descoberta nova: todos os factos aqui reunidos já foram individualmente validados e aprovados nos Passos 32-37.

---

## 2. Resumo Executivo

O M6 cumpriu integralmente os dois objetivos que a Fundadora/CEO aprovou em 2026-07-09: (1) confirmar, com evidência verificável, que os 4 fluxos críticos obrigatórios do projeto (NFR-17) têm cobertura de teste automatizado real; (2) validar manualmente, em ambiente real, os 8 Use Cases do MVP (UC-01 a UC-08), com registo escrito de cada fluxo, alternativa, exceção e regra de negócio. Uma lacuna de funcionalidade identificada a meio do processo (RN-10, `limiteUtilizadores`) foi implementada dentro do próprio M6 (Passo 33), evitando uma validação de fachada do UC-02/UC-08. **Zero bugs foram encontrados em toda a validação** — todas as divergências registadas são lacunas de funcionalidade ou de âmbito já conscientemente delimitado, nunca comportamento incorreto do que já existe.

---

## 3. Cobertura dos 8 Use Cases do MVP

| Use Case | Validado no Passo | Resultado | Achados |
|---|---|---|---|
| UC-01 — Criar Empresa e Configurar Conta Inicial | 34 | ✅ Todos os itens confirmados | 1 (A — "setor" não recolhido) |
| UC-02 — Convidar Utilizador e Atribuir Papel | 34 | ✅ Todos os itens confirmados | 3 (B, C, D — todos já conhecidos) |
| UC-03 — Criar e Associar uma Tarefa a um Cliente | 35 | ✅ Todos os itens confirmados | 1 substantivo (FR-18 bidirecional incompleto) |
| UC-04 — Registar Cliente e Interação | 35 | ✅ Todos os itens confirmados | 1 menor (Alternativo 1a sem passo único) |
| UC-05 — Consultar o Assistente de IA | 36 | ✅ Todos os itens confirmados | 1 (limitação já conhecida) |
| UC-06 — Receber e Confirmar uma Sugestão da IA | 36 | ✅ Todos os itens confirmados, 4 desfechos cobertos | 0 |
| UC-07 — Converter Trial em Subscrição Paga | 37 | ✅ Todos os itens confirmados, exceto 1 gap real | 2 (A substantivo, B refinamento) |
| UC-08 — Atingir um Limite do Plano Ativo | 37 | ✅ Todos os itens confirmados, RN-10 isolada de RN-11 | 1 menor (aviso a 90%) |

**Os 8 Use Cases do MVP têm registo de validação manual, em ambiente real, com evidência de BD e/ou HTTP para cada item — nenhum aprovado por leitura de código isolada.**

---

## 4. Cobertura de NFR-17 (4 Fluxos Críticos)

Consolidada no Passo 32 ([Consolidação NFR-17](31-consolidacao-nfr-17.md)) — suite completa 202/202 testes, estável em 2 execuções consecutivas; posteriormente 210/210 após o Passo 33 (8 testes novos de RN-10).

| Fluxo Crítico | Cobertura | Lacuna Identificada |
|---|---|---|
| Isolamento Multi-Tenant | ✅ Real — 4 testes provariam genuinamente uma regressão | Camada 1 (`TenantPrismaService`) e Camada 2 (RLS) nunca testadas isoladamente uma da outra — defesa em profundidade genuína, lacuna de atribuição, não de proteção |
| RBAC | ✅ Real — hierarquia, `RegraPermissao`, sessão, isolamento estrutural | Nenhuma nos mecanismos centrais |
| Limites de Plano | ✅ Real — RN-11 (5 endpoints), quota de IA, distinção `null`=sem limite | RN-10 (`limiteUtilizadores`) sem testes no momento da consolidação — resolvido no mesmo Milestone, Passo 33 |
| Ações de IA | ✅ Real — RN-08 (tipos + eventos + staleness + autoridade), circuit breaker | Nenhuma |

---

## 5. Regras de Negócio Centrais — Confirmação Final

| Regra | Confirmação |
|---|---|
| RN-07 (IA nunca revela dados fora do escopo RBAC) | ✅ Estrutural (T2, Passo 16) + reconfirmada no Passo 36 |
| RN-08 (nenhuma ação de IA sem confirmação explícita e individual) | ✅ Tipos + eventos + ausência estrutural de confirmação em lote (Passo 36) |
| RN-09 (nenhum dado eliminado por não conversão de trial) | ✅ Confirmada ao vivo — dados criados antes de uma "expiração" simulada permaneceram intactos (Passo 37) |
| RN-10 (bloqueia só a ação específica, nunca o acesso geral) | ✅ Isolada de forma decisiva de RN-11 — limite de Utilizadores bloqueado, leitura e outra ação de criação continuaram normais no mesmo momento (Passo 37) |
| RN-11 (trial expirado → acesso limitado, leitura permitida) | ✅ Confirmada — `SubscricaoGuard`/`SubscricaoExceptionFilter` uniformes desde o Passo 20, reconfirmada ao vivo no Passo 37 |

---

## 6. Requisitos Funcionais Fora de Âmbito (Achado D da Proposta do M6)

Três Requisitos Funcionais aprovados nunca implementados, sem decisão arquitetural — **deliberadamente fora do âmbito do M6** (que valida Use Cases já implementados, não constrói funcionalidade nova), registados como Questões em Aberto explícitas desde a aprovação da Proposta do M6 (2026-07-09), reconfirmados aqui sem alteração:

- **FR-08** (telemetria/analytics de produto) — sem decisão de ferramenta, Success Metrics §3.6 tem uma Questão em Aberto (Q1) nunca endereçada por nenhum ADR.
- **FR-09** (i18n PT/EN) — aplicação inteiramente em português.
- **FR-27** (políticas de autonomia de IA configuráveis) — só a garantia estrutural "nunca executa sem confirmação" existe (RN-08); nenhum sistema de configuração de políticas.

---

## 7. Consolidação de Todos os Achados do M6

### 7.1 Achados Substantivos (recomenda-se planeamento de correção/implementação futura)

| # | Origem | Achado | Recomendação |
|---|---|---|---|
| 1 | Passo 35 | FR-18 (referência bidirecional Processo↔Cliente) parcialmente implementado — Processo→Cliente é texto estático, nunca um link; Cliente→Processo não mostra nada sobre Processos associados | Passo dedicado de implementação, fora do M6 |
| 2 | Passo 37 | UC-07 Fluxo Principal 1 (notificação proativa de fim de trial) nunca implementado — sem scheduler em todo o backend, sem gatilho no `NotificacaoListener` | Decisão de produto: vale a pena construir este gatilho? Se sim, exige o primeiro mecanismo de tarefa agendada do projeto |

### 7.2 Achados Já Conhecidos, Reconfirmados (sem ação nova necessária)

| # | Origem | Achado |
|---|---|---|
| 3 | Passo 34 | Envio real de email não observável neste ambiente (sem `RESEND_API_KEY` real) — limitação já registada desde o Passo 18/31 |
| 4 | Passo 34 | Fluxo Alternativo 2a do UC-02 (`RegraPermissao` granular no convite) sem interface — consistente com exclusão já decidida no M5 |
| 5 | Passo 34 | Exceção E2 do UC-02 (reenvio de convite expirado) sem implementação — Questão em Aberto Q2 já registada desde o Passo 30/31 |
| 6 | Passo 36 | Caminho de sucesso da pergunta livre (UC-05) não observável sem credencial real do fornecedor Anthropic — limitação já registada desde o Passo 18, caminho já coberto por teste automatizado |
| 7 | Passo 37 | Exceção E1 do UC-07 (pagamento recusado) sem tratamento explícito no webhook — refinamento da Questão em Aberto já registada no Passo 22 (Decisão E: só `checkout.session.completed` tratado) |

### 7.3 Achados Menores (melhorias futuras de baixa prioridade)

| # | Origem | Achado |
|---|---|---|
| 8 | Passo 34 | Campo "setor" nunca recolhido no ecrã de registo público, apesar de UC-01 o mencionar — divergência literal menor, campo é opcional |
| 9 | Passo 35 | Fluxo Alternativo 1a do UC-04 (preencher oportunidade/notas na criação) sem caminho de um único passo |
| 10 | Passo 37 | Alternativo 1a do UC-08 (aviso a 90%) só existe para `limiteUsoIA` — `limiteUtilizadores` tem uso real mensurável e não tem aviso equivalente |

### 7.4 Lacunas de Atribuição de Teste (não de proteção)

| # | Origem | Lacuna |
|---|---|---|
| 11 | Passo 32 | Camada 1 (`TenantPrismaService`) e Camada 2 (RLS) do isolamento multi-tenant nunca testadas isoladamente uma da outra — só em conjunto |

---

## 8. Bugs Encontrados em Todo o M6

**Zero.** Nenhum dos 6 passos (32-37) encontrou um único bug — comportamento incorreto do que já existe, crash, ou erro de consola inesperado. Todas as divergências da secção 7 são lacunas de funcionalidade ou de âmbito conscientemente delimitado, não defeitos.

---

## 9. Questões em Aberto Herdadas (não geradas pelo M6, reconfirmadas como ainda válidas)

- **Bloqueador de pré-lançamento** (Especificação Técnica do Passo 26, §5, Questão 1, confirmado pela Fundadora/CEO): o registo público (`/registar`) não pode ser disponibilizado a utilizadores reais em produção enquanto não existirem Termos de Serviço, Política de Privacidade e captura de consentimento RGPD.
- **PSD-001** (Eliminação Definitiva de Dados Pessoais, hard-delete vs. soft-delete) — decisão ainda pendente, com a consequência prática já conhecida desde o Passo 6 (trigger de imutabilidade do Registo de Auditoria bloqueia `DELETE` em cascade a partir de `Empresa`).
- **PSD-002** (residência de dados de IA para clientes Enterprise) — deliberadamente fora de âmbito, não bloqueia o MVP.
- **Inconsistência do Use Cases v1.0** (achado B da Proposta do M6): o documento afirma "9 Use Cases" mas só define 8 (UC-01 a UC-08) — discrepância registada sem alterar o documento de origem.

---

## 10. Recomendação Formal de Encerramento do M6

**Recomenda-se o encerramento formal do Milestone M6.** Os dois objetivos aprovados na Proposta (2026-07-09) foram cumpridos com evidência real, não apenas documental:

1. NFR-17 tem cobertura de teste automatizado genuína nos 4 fluxos críticos, confirmada por inspeção manual das asserções, não apenas pela passagem dos testes.
2. Os 8 Use Cases do MVP foram validados manualmente em ambiente real, com registo escrito por Use Case, incluindo fluxos alternativos, exceções e regras de negócio — critério de conclusão definido na própria Proposta do M6.

Os 2 achados substantivos (secção 7.1) e os achados menores/já conhecidos não bloqueiam este encerramento — nenhum representa um defeito do que já foi construído, e todos ficam formalmente registados para decisão de produto futura, consistente com o princípio já seguido em todo o projeto de nunca absorver silenciosamente uma lacuna descoberta durante a validação.

---

## 11. Sincronização Documental

Após aprovação deste relatório: `CLAUDE.md` (ambas as cópias) marca o Passo 38 concluído e o **Milestone M6 formalmente encerrado**; Blueprint (nova versão) atualiza o estado global do M6 para "formalmente concluído"; Master Roadmap (nova versão) atualiza todas as menções à Fase 7 (§3.1 topo, §3.2/§3.2a, §3.7/M8, §3.10) para refletir o encerramento do M6 e propor a próxima ação (Fase 8 — Testes e Garantia de Qualidade, ou um Milestone dedicado aos achados substantivos, a validar com a Fundadora/CEO antes de avançar).

**Passo 38 concluído — Milestone M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases) recomendado para encerramento formal.**

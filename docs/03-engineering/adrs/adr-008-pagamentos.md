# NEXA — ADR-008: Pagamentos e Faturação

| | |
|---|---|
| **Documento** | ADR-008 — Pagamentos e Faturação |
| **Fase** | 3b — Architecture Decision Records (adicional, motivado pela expansão de âmbito comercial) |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-004 (Autenticação) · ADR-007 (Infraestrutura) · Security & Access Principles v1.1 (3.8, 3.9) · Event & Notification Architecture Rules v1.1 (3.5) · FR-29, FR-30, FR-31 · RN-09, RN-10, RN-11 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide o **processador de pagamentos** e o **modelo de integração** que torna FR-29/30/31 (planos, subscrições, limites) executáveis com pagamento real — mantendo a NEXA fora do âmbito de conformidade PCI sempre que tecnicamente possível.

---

## 2. Contexto

Duas restrições já aprovadas condicionam esta decisão de forma direta: RN-02 (o trial inicia-se automaticamente, sem exigir dados de pagamento) e RN-09/RN-11 (nenhum dado é eliminado por não conversão do trial, e o bloqueio ao expirar afeta só a ação específica, nunca o acesso geral). Isto significa que o processador de pagamentos só entra em jogo em **UC-07 (Converter Trial em Subscrição Paga)** — nunca no registo inicial — preservando integralmente essas decisões já tomadas, não as reabrindo.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — Stripe Checkout (página alojada pela Stripe)**

| Prós | Contras |
|---|---|
| Nenhum dado de cartão toca a infraestrutura da NEXA — âmbito de conformidade PCI reduzido ao mínimo (SAQ-A) | Menos controlo visual sobre o ecrã de pagamento do que uma integração embutida |
| Suporte nativo a subscrições recorrentes — mapeamento direto para FR-29 (planos) | A NEXA permanece "seller of record" — responsável pela sua própria conformidade fiscal (IVA), mitigável com o complemento Stripe Tax (3.5) |
| Implementação mais rápida — adequado à fase atual e ao perfil de equipa (NFR-16) | — |
| Ecossistema e documentação mais representados em dados de treino de IA generativa, mesmo critério já usado em todos os ADRs anteriores | — |
| Presença e credibilidade "enterprise" reconhecida — relevante para o posicionamento premium já definido no Brand Book | — |

**Opção B — Stripe Elements (formulário de pagamento embutido na NEXA)**

| Prós | Contras |
|---|---|
| Controlo total da experiência visual, alinhada perfeitamente com o Brand Book | Mais esforço de implementação agora, numa fase em que a UX geral da plataforma ainda não está madura |
| Ainda assim evita tocar em dados de cartão brutos (tokenização via Stripe.js no browser) | Âmbito de conformidade PCI ligeiramente maior (tipicamente SAQ A-EP) do que o Checkout |

**Opção C — Paddle (Merchant of Record)**

| Prós | Contras |
|---|---|
| Paddle assume o papel de vendedor — trata automaticamente do IVA em toda a UE e a nível global | Comissões tipicamente mais elevadas do que Stripe |
| Faturação e gestão de subscrições simplificadas "out-of-the-box" | Menor controlo de marca — o cliente vê a Paddle como intermediário na fatura |
| — | Ecossistema e comunidade de integração menores do que Stripe |

**Opção D — Lemon Squeezy (Merchant of Record)**

| Prós | Contras |
|---|---|
| Mesmo modelo de MoR — simplifica IVA/conformidade fiscal | Adquirida pela Stripe em 2024/2025 — o seu futuro como produto autónomo é uma incerteza razoável para uma decisão a 10 anos |
| Onboarding historicamente simples, orientado a SaaS indie | Perfil de marca menos "enterprise", menos alinhado com o posicionamento premium da NEXA |

### 3.2 Decisão

**A NEXA adota Stripe Checkout para o MVP, com evolução planeada para Stripe Elements quando a UX da plataforma justificar o investimento adicional.**

As opções de Merchant of Record (Paddle, Lemon Squeezy) foram avaliadas especificamente do ponto de vista de simplificação de billing — a sua vantagem real (gestão automática de IVA internacional) é genuína, mas não suficiente para compensar, nesta fase, a perda de controlo de marca e o ecossistema de integração menos maduro, dado o posicionamento premium já definido no Brand Book. Esta avaliação fica registada como decisão explícita, não descartada sem análise.

### 3.3 Modelo de Integração — Onde o Stripe Entra no Fluxo

Consistente com RN-02: o Stripe **nunca é invocado no registo/início do trial** (UC-01) — apenas em UC-07, quando o Utilizador decide converter o trial em subscrição paga. Fluxo:
1. O Administrador da Empresa escolhe um plano (Starter/Professional/Enterprise).
2. A NEXA cria uma sessão de Stripe Checkout, associando o identificador da Empresa como metadado.
3. O Utilizador é redirecionado, insere dados de pagamento — que nunca transitam pelos servidores da NEXA.
4. A Stripe devolve o controlo à NEXA via webhook, não via redirecionamento direto confiável (ver 3.4).

### 3.4 Processamento de Webhooks — Verificação, Idempotência, Fail Secure

Os eventos de ciclo de vida de subscrição chegam via webhooks assinados pela Stripe:
- **Verificação de assinatura obrigatória** antes de qualquer processamento — um webhook não verificado é rejeitado (Fail Secure, Security & Access Principles, 3.9).
- **Processamento idempotente**, usando o identificador único do evento Stripe para deduplicação — consistente com a exigência já fixada para consumidores de eventos (Event & Notification Architecture Rules, 3.5).
- A confirmação de pagamento atualiza o estado da Subscrição/Plano e aplica diretamente as regras já decididas em RN-10/RN-11 (UC-08) — este ADR liga o gatilho real ao comportamento já aprovado, sem o redefinir.

### 3.5 Conformidade Fiscal — Stripe Tax

A NEXA ativa o complemento **Stripe Tax**, que calcula e aplica automaticamente o IVA correto por país da UE — sem tornar a Stripe "seller of record" (a NEXA continua responsável por remeter o imposto, mas o cálculo fica automatizado). Esta é uma decisão de engenharia proporcional, não uma estratégia fiscal completa.

> **Nota de Descoberta Técnica:** a escolha entre manter a NEXA como "seller of record" com Stripe Tax, ou migrar para um modelo Merchant of Record no futuro, é uma decisão de negócio/fiscal — **extraída para o Product & Security Decisions Register como PSD-004**.

### 3.6 Dados Guardados pela NEXA

A NEXA guarda apenas o **identificador de cliente Stripe** e o **identificador de subscrição Stripe** associados à Empresa — nunca números de cartão nem dados sensíveis de pagamento, consistente com Security & Access Principles, 3.8.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Stripe Checkout para o MVP, evolução planeada para Stripe Elements | Equilibra segurança (PCI mínimo), velocidade de implementação, e maturidade de UX ainda em desenvolvimento |
| D2 | Paddle e Lemon Squeezy avaliados e não adotados nesta fase | Vantagem fiscal real, mas insuficiente face à perda de controlo de marca e menor maturidade de ecossistema |
| D3 | Stripe nunca invocado antes de UC-07 | Preserva RN-02 (trial sem dados de pagamento) sem exceção |
| D4 | Webhooks verificados por assinatura e processados de forma idempotente | Aplica Fail Secure e a exigência de idempotência já fixada |
| D5 | Estratégia fiscal de longo prazo extraída para o Product & Security Decisions Register (PSD-004) | Decisão de negócio/fiscal, não de arquitetura |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | **Extraída para o Product & Security Decisions Register — ver PSD-004** (estratégia fiscal de longo prazo) | Negócio/legal | Ver registo |
| Q2 | Momento exato de migração para Stripe Elements | Product Roadmap, pós-validação de UX | CEO + CTO |

---

## 6. Validação Arquitetural Final

*Resumo — narrativa completa disponível no Architecture Review Log caso seja solicitada auditoria formal.*

1. **Dependência tecnológica desnecessária?** Não — Stripe é o padrão de indústria, com o caminho de evolução (Elements) dentro do mesmo fornecedor.
2. **Risco de escalabilidade futura?** Não bloqueante.
3. **Risco de segurança não mitigado?** Nenhum — PCI minimizado por desenho, webhooks verificados e idempotentes.
4. **Coerência com princípios já definidos?** Sim — reforça RN-02, RN-10, RN-11, Event & Notification 3.5, e Security & Access 3.8/3.9.
5. **Oportunidade de reforçar sem complexidade?** Sim: Stripe Tax automatiza um risco de erro humano real sem esforço adicional relevante.
6. **Lacuna documental a resolver agora?** A estratégia fiscal foi corretamente extraída, não decidida aqui.
7. **Válida daqui a 5-10 anos?** Sim — caminho Checkout → Elements → eventual reavaliação de MoR identificado.
8. **Alinhada com a filosofia fundacional?** Sim — simplicidade, evolução incremental, segurança por defeito, dados mínimos guardados.

**Parecer do Arquiteto Principal:** decisão madura para arquitetura permanente.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo Stripe Checkout para o MVP com avaliação explícita de Paddle/Lemon Squeezy, preservando RN-02 e RN-09/10/11 já aprovados; estratégia fiscal de longo prazo extraída para PSD-004 | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

# NEXA — Relatório Executivo Consolidado do Estado do Projeto

| | |
|---|---|
| **Documento** | Relatório Executivo Consolidado — Estado Atual da NEXA |
| **Fase** | Transversal — pedido pela Fundadora/CEO após o encerramento do M7, para orientar a decisão do próximo Milestone |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda leitura/decisão da Fundadora/CEO |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Master Roadmap (v5.8); Relatórios Finais de Encerramento do M6 (Passo 38) e do M7 (Passo 45); todas as Especificações Técnicas dos Passos 1-45 |
| **Última atualização** | 2026-07-20 |

---

## 1. Resumo Executivo

A NEXA tem, hoje, um **MVP funcionalmente completo** (os 7 Épicos aprovados — EP-01 a EP-07 — implementados) e um **ambiente de staging real, operacional, seguro e observável** (M1-M7 formalmente concluídos). **Não está pronta para produção** — não por falta de funcionalidade core, mas por um conjunto concreto e já identificado de pré-requisitos de lançamento (secção 9), nenhum deles escondido: consentimento legal/RGPD, upgrade de plano de infraestrutura, ativação de monitorização externa, e uma auditoria de segurança/dependências nunca feita formalmente. Este relatório existe para dar uma base factual, não otimista nem pessimista, à decisão do próximo Milestone.

---

## 2. Funcionalidades Implementadas (Épicos EP-01 a EP-07)

| Épico | Conteúdo | Estado |
|---|---|---|
| **EP-01 — Fundação** | Registo/login, sessões server-side, RBAC (5 papéis, matriz + overrides por Empresa), isolamento multi-tenant, Registo de Auditoria append-only, Partilha (acesso pontual), Convite de utilizadores por email, self-edit de Perfil | ✅ Completo |
| **EP-02 — Dashboard** | Agregação read-only de Processos/Clientes/Notificações, estado inicial guiado | ✅ Completo |
| **EP-03 — Processos e Tarefas** | CRUD completo, visibilidade RBAC (admin/gestor por Departamento/colaborador por posse/convidado via Partilha), associação a Cliente | ✅ Completo |
| **EP-04 — CRM** | Cliente/Contacto/Oportunidade, Interações, Pipeline por estado de oportunidade | ✅ Completo |
| **EP-05 — Assistente de IA** | AI Gateway (Anthropic, circuit breaker, quota), pergunta livre (RN-07 — nunca revela dados fora do escopo RBAC de quem pergunta), sugestões de ação determinísticas com confirmação humana obrigatória (RN-08) | ✅ Completo |
| **EP-06 — Comercial** | Planos (Starter/Professional/Enterprise), trial automático, Stripe Checkout + Webhooks idempotentes, limites de plano (`limiteUsoIA` aplicado; `limiteUtilizadores` aplicado desde o M6) | ✅ Completo |
| **EP-07 — Camada Comercial e Produto** | Landing pública, Preços públicos, Registo público (percurso Landing→Registo→Trial sem intervenção manual), Configurações (Perfil/Utilizadores/Departamentos) | ✅ Completo, exceto Centro de Ajuda (ver secção 6) |

**Os 8 Use Cases do MVP (UC-01 a UC-08) foram validados manualmente em ambiente real** (M6, Passos 34-37), com registo escrito por Use Case — não apenas a funcionalidade existe, foi exercitada ponta a ponta.

---

## 3. Arquitetura Final

- **Monólito modular** — 6 módulos de negócio (`fundacao`, `dashboard`, `processos`, `crm`, `ia`, `comercial`), cada um autocontido, nunca microsserviços nesta fase.
- **Isolamento multi-tenant em defesa profunda de 3 camadas**: `TenantPrismaService` (injeção automática de `empresaId`), Row-Level Security nativa do PostgreSQL, e constraints de chave estrangeira com escopo de tenant — as 3 camadas confirmadas ativas em conjunto pelos 219 testes automatizados.
- **Autorização**: um único `AuthorizationService`, consultado por todos os controladores — nenhum verifica permissões diretamente. Negação por defeito, fail secure.
- **IA**: nunca executa uma ação sem confirmação humana explícita — garantido ao nível do sistema de tipos (`PendingSuggestion`/`ConfirmedAction`), não apenas por convenção.
- **Substituibilidade Controlada**: Anthropic (IA), Stripe (pagamentos), Resend (email) atrás de interfaces próprias ou tokens de DI — nenhum SDK de fornecedor chamado diretamente fora da respetiva camada.
- **Frontend**: Next.js App Router, Design System próprio (11+ componentes sobre Radix UI), API-first (nunca acede à base de dados diretamente).

---

## 4. Infraestrutura (M7)

| Componente | Serviço | Região | Estado |
|---|---|---|---|
| Base de dados | Neon PostgreSQL 17 | UE (`aws-eu-central-1`) | ✅ Operacional, recuperação de backup validada por teste real |
| Backend | Render | UE (`frankfurt`) | ✅ Operacional, deploy só via pipeline (nunca automático nem manual) |
| Frontend | Vercel | UE (`fra1`) | ✅ Operacional |
| Rastreio de erros | Sentry (2 projetos) | UE (`de.sentry.io`) | ✅ Ativo e validado ao vivo |
| Monitorização de disponibilidade | UptimeRobot | — | ❌ Bloqueada (Questão em Aberto Q5 do ADR-007) |
| CI/CD | GitHub Actions | — | ✅ Portão real — testes têm de passar antes de qualquer deploy, validado nas duas direções |

Todos os componentes de infraestrutura estão em região da União Europeia (NFR-21).

---

## 5. Cobertura de Testes

- **219 testes e2e automatizados** (24 ficheiros, backend), correndo em CI a cada `push` para `main`, bloqueando deploy se falharem.
- Cobrem confirmadamente os **4 fluxos críticos obrigatórios (NFR-17)**: isolamento multi-tenant, RBAC, limites de plano, ações de IA — consolidação formal no Passo 32 com inspeção manual real das asserções (não só nomes de teste).
- **Zero testes automatizados de frontend** — só `next build`/`next lint` no pipeline; nenhum teste de componente, integração ou e2e de browser (ex.: Playwright/Cypress) existe.
- **Uma lacuna de atribuição, não de proteção**: as Camadas 1 (`TenantPrismaService`) e 2 (RLS) do isolamento multi-tenant nunca foram testadas isoladamente uma da outra — correm sempre em conjunto (defesa em profundidade genuína, mas sem prova de que cada camada sozinha bastaria).

---

## 6. Requisitos Ainda por Cumprir

| Item | Estado | Origem |
|---|---|---|
| **FR-18** — referência bidirecional Processo↔Cliente | Parcialmente implementado — Processo→Cliente é texto estático (nunca um link); Cliente→Processo não mostra nada | Achado M6, Passo 35 |
| **UC-07 Fluxo Principal 1** — notificação proativa de fim de trial | Nunca implementado — sem nenhum mecanismo de tarefa agendada em todo o backend | Achado M6, Passo 37 |
| **FR-08** — telemetria/analytics de produto | Nunca implementado, sem decisão de ferramenta | Questão em Aberto desde o Passo 32 |
| **FR-09** — internacionalização PT/EN | Nunca implementado — aplicação inteiramente em português | Questão em Aberto desde o Passo 32 |
| **FR-27** — políticas de autonomia de IA configuráveis | Nunca implementado — só a garantia estrutural "nunca executa sem confirmação" existe (RN-08) | Questão em Aberto desde o Passo 32 |
| **Centro de Ajuda** (estático) | Nunca implementado, deliberadamente fora do âmbito do M5 | Especificação Técnica do Passo 24, §5 |
| **Upgrade/downgrade/cancelamento de subscrição self-service** | Nunca implementado — só o percurso de upgrade inicial (trial→pago) existe | Fora de âmbito desde o M4 |
| **Reenvio de convite expirado** (UC-02, Exceção E2) | Nunca implementado | Questão em Aberto desde o Passo 30/31 |
| **Edição granular de `RegraPermissao`** | Sem interface — só a entidade e o mecanismo de override existem | Fora de âmbito desde o M5 |

---

## 7. Dívida Técnica

| Item | Gravidade | Nota |
|---|---|---|
| **26 vulnerabilidades de dependências no backend** (3 low, 14 moderate, 9 high, 0 critical — confirmado por `npm audit` nesta sessão) | A triar | Nunca formalmente revista; nenhuma crítica, mas 9 "high" nunca investigadas individualmente |
| **6 vulnerabilidades de dependências no frontend** (1 low, 1 moderate, 4 high, 0 critical) | A triar | Idem |
| **Zero testes automatizados de frontend** | Média | Só build+lint no pipeline; regressões de UI só detetadas manualmente |
| **Sem alertas configurados** (Sentry e UptimeRobot, mesmo quando ambos ativos) | Média | Erros/indisponibilidade só visíveis por consulta ativa ao dashboard, nunca notificação proativa |
| **Sem domínio próprio nem CDN** | Baixa | URLs `*.onrender.com`/`*.vercel.app`, aceitável em staging, não em produção |
| **Sem teste de carga/performance formal** | Média-Alta | Nunca executado em nenhuma fase do projeto |
| **Sem revisão de segurança/pentest formal** | Alta | Nunca executado — o rigor do projeto até agora foi arquitetural (RLS, RBAC, auditoria), não uma auditoria externa |

---

## 8. Riscos Conhecidos

| Risco | Descrição | Mitigação Atual |
|---|---|---|
| **Q4 — retenção de backups em staging (6h)** | Plano Neon Free, abaixo do mínimo de 7 dias já decidido no ADR-007 | Aceite explicitamente só para staging; upgrade obrigatório antes de produção (ADR-007 v1.3) |
| **Q5 — UptimeRobot bloqueado** | `access_denied` na conta da Fundadora/CEO, indício de verificação de conta pendente | Sentry cobre deteção de erros; uptime externo continua sem cobertura |
| **Bloqueador RGPD** | Registo público sem captura de consentimento, Termos de Serviço nem Política de Privacidade | Registo público **não pode** ser disponibilizado a utilizadores reais em produção enquanto isto não for resolvido |
| **Dependência de planos gratuitos** (Neon, Render, Vercel, Sentry, UptimeRobot) | Limites de escala/retenção não pensados para tráfego real de produção | Nenhuma — decisão consciente de adiar para quando houver tração real |
| **Sem credenciais reais de fornecedores em nenhum ambiente** (Anthropic, Stripe, Resend) | A aplicação nunca foi exercitada com tráfego real de IA/pagamentos/email — todo o comportamento de sucesso está coberto só por testes automatizados com adaptadores falsos | Arquitetura já preparada (interfaces/tokens de DI), só falta a ativação |
| **PSD-001** (hard-delete de dados pessoais) | Sem decisão — o trigger de imutabilidade da auditoria já bloqueia `DELETE` em cascade a partir de Empresa | Sem mitigação, decisão de produto pendente |
| **PSD-002** (residência de dados de IA para Enterprise) | Sem decisão | Deliberadamente fora de âmbito do MVP |

---

## 9. Avaliação Objetiva de Prontidão para Produção

**A NEXA não está pronta para produção.** Não por uma lacuna de arquitetura ou de funcionalidade core — o MVP está completo e o staging está genuinamente operacional, com o mesmo rigor de validação real em todos os 7 Milestones. A distância até um lançamento real é medida em **pré-requisitos concretos e já identificados**, não em trabalho de descoberta:

1. **Bloqueador legal (RGPD)** — Termos de Serviço, Política de Privacidade, captura de consentimento no registo público. **Bloqueia qualquer utilizador real, mesmo antes de qualquer questão técnica.**
2. **Upgrade do plano Neon** (Q4) — retenção de backup de produção exige 7 dias, staging está em 6h.
3. **Ativação do UptimeRobot** (Q5) — dependência externa na conta da Fundadora/CEO.
4. **Credenciais reais de fornecedores** — Anthropic, Stripe (modo live), Resend nunca configuradas com valores reais em nenhum ambiente.
5. **Triagem das 32 vulnerabilidades de dependências** (26 backend + 6 frontend) — nenhuma crítica, mas nunca formalmente revista.
6. **Ambiente de produção** — nunca provisionado; teria de replicar o processo do M7 (Passos 39-45) para produção, não só staging.
7. **Teste de carga/performance e revisão de segurança formal** — nenhum dos dois foi executado em nenhuma fase.

**Nenhum destes 7 itens é surpreendente ou escondido** — todos já estavam registados como Questões em Aberto ou decisões deliberadamente adiadas antes deste relatório. A pergunta que resta é de **sequenciamento**: resolver estes 7 itens antes de qualquer nova funcionalidade, ou continuar a fechar lacunas de produto primeiro. A secção seguinte apresenta opções concretas para essa decisão.

---

## 10. Opções para o Próximo Milestone

### Opção A — M8: Preparação para Lançamento/Produção (Recomendada)

**Objetivo**: resolver, um a um, os 7 itens da secção 9 — tornar a NEXA genuinamente lançável a clientes piloto reais.

**Âmbito**: (1) Termos de Serviço + Política de Privacidade + checkbox de consentimento no registo público (trabalho jurídico + implementação do checkbox/links); (2) upgrade do plano Neon; (3) resolução do UptimeRobot (ação na conta da Fundadora/CEO, já identificada); (4) provisionamento de um ambiente de **produção** real, replicando o processo já validado do M7 (Vercel+Render+Neon, região UE, CI/CD, Sentry) — nunca reinventado, só repetido com mais rigor por já ser produção; (5) triagem e correção das 32 vulnerabilidades de dependências; (6) configuração de alertas (Sentry + UptimeRobot) — atualmente nenhum dos dois notifica proativamente; (7) pelo menos um teste de carga básico e uma revisão de segurança estruturada (não necessariamente um pentest externo pago, mas uma checklist rigorosa).

**Riscos**: o item (1) depende de trabalho jurídico fora do controlo de engenharia — pode ser o item mais lento a fechar, não bloqueante dos restantes 6 em paralelo. Custos reais associados (planos pagos da Neon, possível upgrade de outros serviços).

**Impacto**: **desbloqueia o lançamento real** — é o único caminho que termina com "podemos convidar clientes piloto".

**Esforço estimado**: Grande — comparável ao M7 em número de passos (provavelmente 6-8), com uma dependência externa (jurídica) fora do ritmo normal de implementação.

---

### Opção B — M8: Fechar Lacunas de Produto

**Objetivo**: completar e robustecer o conjunto de funcionalidades já existente antes de qualquer novo âmbito, sem ainda mirar produção.

**Âmbito**: FR-18 (referência bidirecional Processo↔Cliente); UC-07 Fluxo Principal 1 (notificação proativa de fim de trial — primeiro mecanismo de tarefa agendada do projeto, decisão de arquitetura nova); testes automatizados de frontend (Playwright, cobertura dos fluxos críticos de UI); triagem das 32 vulnerabilidades de dependências.

**Riscos**: introduzir um scheduler é a primeira infraestrutura deste tipo no projeto — exige uma decisão de arquitetura própria (cron do Render? biblioteca dedicada?), nunca antes tomada. Sem urgência de negócio conhecida a forçar este âmbito agora.

**Impacto**: melhora a robustez e completude do produto, mas **não desbloqueia lançamento** — nenhum dos itens desta opção está na lista de pré-requisitos da secção 9.

**Esforço estimado**: Médio — 3-4 passos, sem dependências externas fora do controlo de engenharia.

---

### Opção C — M8: Testes de Frontend + Robustez Operacional

**Objetivo**: reduzir a maior lacuna de cobertura de teste identificada neste relatório (secção 5) e melhorar a robustez operacional sem endereçar ainda o lançamento nem novas funcionalidades de produto.

**Âmbito**: suite de testes e2e de frontend (Playwright, cobrindo pelo menos os fluxos já cobertos manualmente no M6 — os 8 Use Cases); configuração de alertas (Sentry + UptimeRobot, assim que desbloqueado); triagem de dependências; teste de carga básico.

**Riscos**: sobreposição parcial com a Opção A (itens de robustez também lá presentes) — pode ser vista como uma versão "light" da Opção A sem o item legal/produção, o que atrasa o lançamento real sem reduzir o trabalho necessário para lá chegar.

**Impacto**: reduz risco técnico e melhora confiança na base de código, mas **também não desbloqueia lançamento** por si só (falta o bloqueador legal e o ambiente de produção).

**Esforço estimado**: Médio — 3-4 passos.

---

## 11. Recomendação

**Opção A.** É a única que termina com um resultado de negócio concreto ("podemos lançar a clientes piloto reais"), e a maioria dos seus itens (upgrade de plano, UptimeRobot, ambiente de produção, triagem de dependências, alertas) são execução direta, sem descoberta nova — o único item genuinamente fora do controlo de engenharia é o jurídico (Termos/Privacidade/RGPD), que pode correr em paralelo sem bloquear o resto. As Opções B e C são valiosas mas adiáveis — nenhuma delas está na lista de pré-requisitos de lançamento, e podem ser absorvidas num Milestone posterior sem custo de oportunidade real.

Aguardo a tua decisão antes de preparar a Proposta formal do próximo Milestone.

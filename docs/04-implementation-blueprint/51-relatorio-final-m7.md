# NEXA — Relatório Final de Encerramento do Milestone M7 (Passo 45)

| | |
|---|---|
| **Documento** | Relatório final de encerramento do M7 — Deploy em Staging (ADR-007) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7, Passo 45 — último passo do M7 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído e formalmente aprovado pela Fundadora/CEO (2026-07-20) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Todos os documentos do M7 (Passos 39-45); ADR-007 (v1.3); Relatório Final de Encerramento do M6 (Passo 38) |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo

Consolidar, num único documento, os resultados dos 7 passos do M7 (39-45) — repositório remoto, base de dados Neon em staging, backend Render, frontend Vercel, observabilidade Sentry, pipeline CI/CD real com portão, e teste real de recuperação de backup — e emitir uma recomendação formal e fundamentada sobre o encerramento do Milestone. Este é um relatório de consolidação: todos os factos aqui reunidos já foram individualmente validados e aprovados nos Passos 39-45.

---

## 2. Resumo Executivo

O M7 cumpriu integralmente o objetivo aprovado na Proposta (2026-07-11): disponibilizar um ambiente de **staging robusto, reproduzível e operacional**, com âmbito exclusivo a staging (produção fica deliberadamente fora). A NEXA tem agora, pela primeira vez, os três componentes de infraestrutura (Vercel + Render + Neon) operacionais em conjunto, todos em região UE (cumprindo NFR-21), com observabilidade de erros ativa, um pipeline de deploy protegido por um portão real de qualidade (nunca deploya um commit que quebre os 4 fluxos críticos), e capacidade de recuperação de dados comprovada empiricamente — não apenas assumida. **Zero bugs de produto foram introduzidos durante o M7** — todas as descobertas técnicas foram lacunas de scaffolding/configuração de infraestrutura, corrigidas antes do fecho de cada passo, nunca regressões de comportamento já aprovado.

---

## 3. Cobertura dos 7 Passos do M7

| Passo | Conteúdo | Resultado | Descoberta Técnica Real |
|---|---|---|---|
| 39 | Repositório GitHub + Rate Limiting (ADR-007 §3.6) | ✅ Concluído | Bloqueio de autenticação interativa do Git Credential Manager no primeiro push, resolvido com confirmação da Fundadora/CEO |
| 40 | Base de Dados Neon em Staging (região UE) | ✅ Concluído | Desvio de arquitetura (projeto inicial fora da UE) detetado e corrigido antes de qualquer configuração |
| 41 | Backend em Render | ✅ Concluído | Lacuna de scaffolding dupla (`postinstall`/`tsconfig.build.json` em falta desde o Passo 1), nunca visível localmente |
| 42 | Frontend em Vercel | ✅ Concluído | Correção de CORS (`WEB_APP_URL` provisório → URL real) |
| 43 | Observabilidade — Sentry + Uptime | ✅ Concluído (Sentry); UptimeRobot bloqueado por dependência externa | `@sentry/nestjs` mais adequado que `@sentry/node` cru |
| 44 | CI/CD — GitHub Actions | ✅ Concluído | `DATABASE_ADMIN_URL` em falta no `.env.test` efémero, causando falha genuína na primeira execução real |
| 45 | Validação Técnica Final | ✅ Concluído | Flag `--timestamp` do `neonctl` inexistente, causando dois falsos negativos no teste de recuperação antes da correção |

**Todos os 7 passos têm Especificação Técnica formal aprovada antes da implementação, e relatório de execução completo com evidência real** — nenhum aprovado por suposição ou revisão de código isolada.

---

## 4. Infraestrutura de Staging — Estado Final

| Componente | Serviço | Região | Estado |
|---|---|---|---|
| Base de dados | Neon PostgreSQL 17 | `aws-eu-central-1` (Frankfurt) | ✅ Operacional, schema/roles/RLS/trigger replicados, recuperação validada |
| Backend | Render (`nexa-api-staging`) | `frankfurt` | ✅ Operacional, `autoDeploy` desativado (só o pipeline dispara deploys) |
| Frontend | Vercel (`nexa-web-staging`) | `fra1` | ✅ Operacional, CORS correto |
| Rastreio de erros | Sentry (2 projetos) | `de.sentry.io` (UE) | ✅ Ativo e validado ao vivo em ambos os componentes |
| Monitorização de disponibilidade | UptimeRobot | — | ❌ Bloqueada (Q5, ver secção 6) |
| CI/CD | GitHub Actions | — | ✅ Pipeline real com portão, validado nas duas direções |

**Os três componentes de infraestrutura (Vercel, Render, Neon) estão todos em região da União Europeia, cumprindo NFR-21 sem exceção.**

---

## 5. Regras de Negócio e Requisitos Não-Funcionais Centrais — Confirmação Final

| Requisito | Confirmação |
|---|---|
| ADR-007 §3.2/NFR-21 (região UE obrigatória) | ✅ Confirmado nos 3 componentes de infraestrutura, com desvio real detetado e corrigido antes de qualquer configuração (Passo 40) |
| ADR-007 §3.4/D2 (rastreio de erros) | ✅ Sentry implementado e validado ao vivo nos dois componentes (Passo 43) |
| ADR-007 §3.6 (rate limiting por IP+conta, bloqueio progressivo) | ✅ Implementado e testado (9 testes novos, Passo 39) |
| ADR-007 §3.8 (backups automáticos + testes periódicos de recuperação) | ✅ Backups nativos da Neon confirmados ativos (Passo 40); **primeiro teste real de recuperação executado com sucesso** (Passo 45) |
| ADR-007 §3.9 (CI/CD, suite de testes como portão antes de deploy) | ✅ Implementado como portão real (não só visibilidade), validado nas duas direções com evidência independente (Passo 44) |

---

## 6. Questões em Aberto do ADR-007 — Estado Final

| Questão | Origem | Bloqueia M7? | Bloqueia produção/piloto? |
|---|---|---|---|
| **Q4** — retenção de PITR do plano Neon Free (6h, abaixo do mínimo de 7 dias) | Passo 40 | ❌ Não | ✅ Sim — upgrade do plano obrigatório antes de qualquer lançamento em produção |
| **Q5** — monitores UptimeRobot bloqueados por `access_denied` na conta da Fundadora/CEO | Passo 43 | ❌ Não | ✅ Sim — obrigatório antes de qualquer lançamento com empresas piloto/produção |

**Ambas as exceções foram decisões explícitas e documentadas da Fundadora/CEO** — nunca assumidas unilateralmente, nunca deixadas implícitas. Ambas ficam permanentemente registadas no ADR-007 (v1.3), com responsável e critério de bloqueio explícitos, exatamente com o mesmo rigor já usado para toda decisão de arquitetura deste projeto.

---

## 7. Achados Herdados do M6, Confirmados Ainda Fora de Âmbito

Nenhum dos 2 achados substantivos do M6 (Relatório Final, Passo 38) era pré-requisito técnico do M7, confirmado explicitamente na Proposta do M7 e reconfirmado aqui sem alteração:

1. **FR-18** (referência bidirecional Processo↔Cliente) parcialmente implementado — continua a aguardar um passo dedicado de implementação, fora do âmbito de M6 e M7.
2. **UC-07 Fluxo Principal 1** (notificação proativa de fim de trial) nunca implementado — o M7 viabilizou tecnicamente o mecanismo de agendamento que essa funcionalidade precisaria (ADR-007 §3.5, job periódico do Render), mas deliberadamente não o implementou.

---

## 8. Bugs Encontrados em Todo o M7

**Zero bugs de comportamento de produto.** Todas as 6 descobertas técnicas reais (secção 3) foram lacunas de scaffolding, configuração de infraestrutura, ou sintaxe de ferramentas de terceiros (CLI da Render/Neon) — nunca um defeito no código de negócio já aprovado em M1-M6. Cada uma foi diagnosticada com evidência real (nunca por suposição), corrigida, e revalidada antes do fecho do respetivo passo.

---

## 9. Questões em Aberto Herdadas (Não Geradas pelo M7, Reconfirmadas)

- **Bloqueador de pré-lançamento** (Especificação Técnica do Passo 26, §5, Questão 1): o registo público (`/registar`) não pode ser disponibilizado a utilizadores reais em produção enquanto não existirem Termos de Serviço, Política de Privacidade e captura de consentimento RGPD — infraestrutura (M7) nunca resolve uma questão legal/produto.
- **PSD-001** (Eliminação Definitiva de Dados Pessoais) — decisão ainda pendente, sem relação com M7.
- **PSD-002** (residência de dados de IA para clientes Enterprise) — deliberadamente fora de âmbito.
- **FR-08/FR-09/FR-27** (telemetria, i18n, políticas de autonomia de IA configuráveis) — fora do âmbito do M6 e do M7, nunca absorvidos silenciosamente.

---

## 10. Recomendação Formal de Encerramento do M7

**Recomenda-se, e a Fundadora/CEO já formalmente aprovou, o encerramento do Milestone M7.** O objetivo aprovado na Proposta (2026-07-11) foi cumprido com evidência real, não apenas documental: um ambiente de staging robusto, reproduzível e operacional, com os três componentes de infraestrutura em conjunto, observabilidade ativa, pipeline de deploy protegido, e capacidade de recuperação de dados comprovada por teste real.

As duas pendências (Q4, Q5) não bloqueiam este encerramento — nenhuma delas é uma lacuna técnica de M7 em si, ambas são pré-requisitos explícitos de um **lançamento** futuro (produção/piloto), formalmente registadas para nunca ficarem esquecidas, consistente com o princípio já seguido em todo o projeto.

---

## 11. Sincronização Documental

Após aprovação deste relatório: `CLAUDE.md` (ambas as cópias) marca o Passo 45 concluído e o **Milestone M7 formalmente encerrado**; Blueprint (nova versão) atualiza o estado global do M7 para "formalmente concluído" na tabela de Milestones (§2.2); Master Roadmap (nova versão) atualiza todas as menções à Fase 7 (§3.1 topo, §3.2/§3.2a, §3.7/M8, §3.10) para refletir o encerramento do M7 e a ausência de um próximo Milestone ainda aprovado; ADR-007 mantém-se em v1.3, sem alteração adicional (as duas Questões em Aberto Q4/Q5 já registadas nos Passos 40/43 continuam válidas tal como estão).

**Passo 45 concluído — Milestone M7 (Deploy em Staging) formalmente encerrado.**

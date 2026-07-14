# NEXA — Especificação Técnica do Passo 43 (M7 — Observabilidade: Sentry + Uptime, Staging)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 43: Observabilidade (Sentry + Monitorização de Disponibilidade) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 43 — quinto passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.4; Relatório do Passo 42 (Frontend em Vercel) |
| **Última atualização** | 2026-07-14 |

---

## 1. Objetivo

Ativar rastreio de erros (Sentry) em `apps/api` e `apps/web`, e monitorização externa de disponibilidade (uptime) para os dois endpoints públicos de staging — implementando literalmente o ADR-007 §3.4/D2/D6, sem introduzir nenhuma decisão de arquitetura nova.

---

## 2. Nota de Âmbito — Achado da Própria ADR-007 §3.4

A ADR-007 já regista a monitorização de uptime como "prática recomendada... **a ativar antes do lançamento com empresas piloto, não necessariamente já nesta fase de arquitetura**". A Proposta do M7 (2026-07-11), já aprovada, inclui-a explicitamente no Passo 43 — decisão de sequenciamento já tomada, não uma reabertura desta especificação. Registo aqui só para transparência: este passo antecipa uma prática que a própria ADR não exigia obrigatoriamente nesta fase, por decisão já validada do M7.

---

## 3. Bloqueio Estrutural — Credenciais Necessárias

### 3.1 Sentry

Sentry tem CLI/wizard oficial (`@sentry/wizard`, com modo `--non-interactive` "útil para configuração agêntica") e API REST completa. **Proponho não usar o wizard** — reformula ficheiros de origem de forma imprevisível (Princípio Geral, regra não-negociável #24, menor complexidade operacional) — e em vez disso fazer a integração manual dos SDKs (`@sentry/node` em `apps/api`, `@sentry/nextjs` em `apps/web`), poucas linhas, comportamento totalmente previsível.

**Preciso de um Auth Token da Sentry** (Settings → Auth Tokens, scopes `project:write`/`org:read`), fornecido pela Fundadora/CEO, para criar os projetos via API — mesmo cuidado já aplicado à Render/Vercel: usado exclusivamente para este provisionamento, nunca versionado, nunca em logs.

### 3.2 UptimeRobot

Nomeada explicitamente no ADR-007 §3.4 como opção de referência. Tem API REST simples (chave de API única, `POST https://api.uptimerobot.com/v2/newMonitor`). **Preciso de uma chave de API da UptimeRobot** (conta gratuita — Settings → API Settings → Main API Key), fornecida pela Fundadora/CEO, mesmo cuidado de segurança.

---

## 4. Decisões a Validar

- **A — Dois projetos Sentry separados** (`nexa-api-staging`, `nexa-web-staging`), mesma organização — separa a plataforma Node/NestJS da Next.js (recomendação nativa do Sentry, DSNs distintos), consistente com a separação já existente Render/Vercel.
- **B — Tag `environment: staging` explícita em ambos os SDKs** — nenhum erro de staging fica indistinguível de um erro de produção quando o Passo de produção existir no futuro (fora do âmbito do M7, mas a base fica correta desde já).
- **C — Nenhum dado sensível enviado ao Sentry**: `sendDefaultPii: false` (nunca a opção por defeito recomendada pelo SDK para este projeto) e um `beforeSend` mínimo que nunca deixa passar corpo de pedidos com campos `password`/`passwordAtual`/`passwordNova`/cookies de sessão — mesma disciplina já aplicada em toda a Auditoria (Passo 27: "password nunca em logs/auditoria"), agora estendida ao Sentry.
- **D — Sample rate conservador**: `tracesSampleRate: 0.1` (10% dos pedidos, só para performance/tracing, não para erros — erros são sempre capturados a 100%) — proporcional à escala atual (mesmo espírito do D2 do ADR-007), sem custo desnecessário no nível gratuito.
- **E — UptimeRobot monitoriza os 2 endpoints públicos já existentes**: `https://nexa-api-staging.onrender.com/health` (backend) e `https://nexa-web-staging.vercel.app/` (frontend) — sem criar nenhum endpoint novo, reaproveita o `/health` já validado desde o Passo 41. Intervalo de verificação: 5 minutos (o mínimo do plano gratuito).
- **F — Sem alertas por email/Slack configurados neste passo** — a UptimeRobot e o Sentry permitem-no, mas nenhum canal de alerta (email da Fundadora/CEO, Slack) foi ainda decidido; fica registado como melhoria futura, não uma lacuna silenciosa. Os dashboards de ambos ficam acessíveis por login direto.

---

## 5. Sequência de Execução (Só Depois da Confirmação das Credenciais)

1. Criar os 2 projetos Sentry via API (Decisão A).
2. Integração manual do SDK em `apps/api` (`@sentry/node`, inicializado em `main.ts`, antes de qualquer outro middleware) e `apps/web` (`@sentry/nextjs`, ficheiros `sentry.server.config.ts`/`sentry.edge.config.ts`/`instrumentation.ts`, padrão oficial do App Router).
3. Configurar `SENTRY_DSN` (backend, via API da Render) e `NEXT_PUBLIC_SENTRY_DSN` (frontend, via CLI da Vercel) — variáveis já previstas desde os Passos 41/42, nunca antes preenchidas.
4. Deploy de ambos os serviços com as novas variáveis.
5. **Validação real de captura de erro**: forçar um erro deliberado e efémero em cada aplicação (removido imediatamente a seguir), confirmar que aparece no dashboard do Sentry correspondente, com a tag `environment: staging` e sem nenhum dado sensível no payload.
6. Criar os 2 monitores UptimeRobot via API (Decisão E), confirmar estado inicial "up" para ambos.
7. Sem dados de teste de produto a limpar neste passo (não se cria nenhuma Empresa/Utilizador).

---

## 6. Fora de Âmbito Deste Passo

- Alertas por email/Slack (Decisão F).
- Sentry Session Replay / Performance Monitoring avançado — só captura de erros e tracing mínimo.
- CI/CD (Passo 44).
- Ambiente de produção (fora do M7 por inteiro).

---

## 7. Exit Criteria

- 2 projetos Sentry criados, DSNs configurados em Render e Vercel.
- Erro deliberado capturado e visível no dashboard Sentry de cada aplicação, com `environment: staging`, sem dados sensíveis.
- 2 monitores UptimeRobot criados e ativos, ambos "up".
- Nenhuma alteração de comportamento de produto — só instrumentação.

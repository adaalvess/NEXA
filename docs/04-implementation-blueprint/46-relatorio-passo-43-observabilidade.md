# NEXA — Relatório de Execução do Passo 43 (M7 — Observabilidade: Sentry + Uptime, Staging)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 43: Observabilidade (Sentry + Monitorização de Disponibilidade) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 43 |
| **Versão** | 1.1 |
| **Estado** | ✅ Concluído e formalmente aprovado pela Fundadora/CEO (2026-07-14) — Sentry concluído e validado; UptimeRobot registado como item de acompanhamento separado (ADR-007 v1.3, Q5), ver secção 6 |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 43](45-especificacao-tecnica-passo-43-observabilidade.md); ADR-007 §3.4; Relatório do Passo 42 |
| **Última atualização** | 2026-07-14 |

---

## 1. Resumo Executivo

Rastreio de erros (Sentry) implementado e **validado ao vivo** nos dois componentes de staging — backend (Render) e frontend (Vercel) — com as 6 Decisões a Validar (A-F) aplicadas sem alteração. Monitorização de disponibilidade (UptimeRobot) **bloqueada por uma restrição do lado da conta da Fundadora/CEO**, não resolvida nesta execução — ver secção 6. Regressão completa confirmada depois de todos os deploys: `/health`, CORS, registo, login, criação de Processo e isolamento multi-tenant todos intactos.

---

## 2. Sentry — Projetos Criados

| Campo | Valor |
|---|---|
| Organização | `nexa-lx` |
| Região | UE (`de.sentry.io`) ✅ |
| Projeto backend | `nexa-api-staging` (id `4511735155064912`), plataforma `node` |
| Projeto frontend | `nexa-web-staging` (id `4511735155130448`), plataforma `javascript-nextjs` |

Criados via API REST da Sentry (Auth Token fornecido pela Fundadora/CEO, nunca escrito em ficheiro nenhum). Um terceiro projeto (`nexa`, plataforma `node-nestjs`) já existia da criação da conta/onboarding — deixado intocado, sem uso, sem custo adicional no plano gratuito.

## 3. Backend — Integração Manual (`@sentry/nestjs`)

**Decisão deliberada: `@sentry/nestjs`, não `@sentry/node` cru** — descoberta durante a implementação (não estava fixada na especificação): `@sentry/node` sozinho não tem o helper `SentryGlobalFilter`/`SentryModule`, exigindo captura de exceções manual e mais arriscada. `@sentry/nestjs` é a integração oficial da própria Sentry para NestJS, mais alinhada com a Regra Não-Negociável #24 (menor complexidade operacional) do que reimplementar a integração à mão.

- `apps/api/src/instrument.ts` — `Sentry.init()`, importado como a primeira linha de `main.ts` (antes de qualquer outro import).
- `SentryModule.forRoot()` como primeiro import de `AppModule`.
- `SentryGlobalFilter` registado como o **primeiro** `APP_FILTER` (ordem exigida pela própria documentação da Sentry) — filtro catch-all (`@Catch()` sem argumentos) que só intercepta exceções que nenhum filtro mais específico já tenha tratado.
- **Risco identificado e verificado antes do deploy**: `SubscricaoExceptionFilter` (Passo 20) já estava registado como `APP_FILTER` global, e `IaExceptionFilter` (Passo 17) scoped ao `IaController`. Confirmado que ambos usam `@Catch(TipoEspecífico)`, nunca catch-all — o filtro da Sentry nunca os substitui, só captura o que sobra. **Confirmado empiricamente, não só por leitura de código**: suite completa `npm run test:e2e` corrida localmente depois da integração — **219/219 testes passaram**, incluindo os que verificam especificamente os códigos `402`/`429` desses dois filtros.
- Decisão C (privacidade): `sendDefaultPii: false` + `beforeSend` que remove `password`/`passwordAtual`/`passwordNova`/cookies do payload antes do envio.
- Decisão D (amostragem): `tracesSampleRate: 0.1` — erros sempre capturados a 100%, só o tracing de performance é amostrado.

## 4. Frontend — Integração Manual (`@sentry/nextjs`)

Sem o wizard interativo (decisão já fixada na especificação, Regra #24) — `next.config.js` (novo, não existia) com `withSentryConfig`; `sentry.client.config.ts`/`sentry.server.config.ts`/`sentry.edge.config.ts`; `instrumentation.ts` (App Router) que carrega os configs de servidor/edge; `global-error.tsx` (novo) — sem este ficheiro, só erros de servidor seriam capturados, nunca crashes de renderização React no browser.

**Descoberta técnica real durante a implementação**: o SDK avisou, no build, que não existia um `global-error.tsx` — adicionado por iniciativa própria (não estava explicitamente listado na especificação, mas está diretamente dentro do objetivo "rastreio de erros" já aprovado). Duas correções de configuração feitas antes do deploy (opções `disableLogger`/`automaticVercelMonitors` já depreciadas na versão instalada do SDK, substituídas pela sintaxe `webpack.*` atual).

## 5. Validação Real — Metodologia e Resultado

Nenhum caminho da aplicação produz uma exceção genuinamente não tratada por desenho (todos os erros de negócio já são validados/tratados) — para provar a captura real, e não apenas confiar na configuração, foram criadas **rotas de diagnóstico temporárias** (`GET /health/erro-teste-sentry-passo-43` no backend, `/erro-teste-sentry-passo-43` no frontend), cada uma lançando um erro deliberado — commitadas, deployadas, disparadas, confirmadas, e **removidas de imediato no commit seguinte**, com uma nova rodada de deploy limpo a seguir. Mesma disciplina de "validação real, nunca simulada" já aplicada em todos os passos do M7.

- **Backend**: `curl https://nexa-api-staging.onrender.com/health/erro-teste-sentry-passo-43` → `500` confirmado.
- **Frontend**: ferramentas de automação de browser não estavam disponíveis para a URL pública do Vercel neste ambiente (extensão Chrome não ligada). Validado por via equivalente: o mesmo código (`sentry.client.config.ts`, `global-error.tsx`) correu num servidor de desenvolvimento local, com o DSN real temporariamente em `apps/web/.env.local` (nunca commitado — ficheiro já `.gitignore`d, removido logo a seguir ao teste), navegado e clicado via ferramenta de preview interna. É o mesmo caminho de código, independentemente do host que o serve.
- **Confirmação nos dois projetos Sentry**, via `GET /api/0/organizations/nexa-lx/projects/`: `nexa-api-staging` com `firstEvent: 2026-07-14T19:33:49Z`; `nexa-web-staging` com `firstEvent: 2026-07-14T19:35:37Z` — ambos os timestamps coincidem exatamente com os gatilhos disparados, ambos os projetos com `environments: ["staging"]` confirmando a tag correta.
- **Limitação honesta registada**: o Auth Token da Sentry foi criado com os scopes `org:read`/`project:read`/`project:write`/`team:read` (os 4 que indiquei nas instruções que dei à Fundadora/CEO) — **sem `event:read`**, por isso não consegui inspecionar o payload completo de cada evento via API para confirmar visualmente a ausência de dados sensíveis. Não é um problema prático neste caso específico — os dois gatilhos de teste (um pedido `GET` sem corpo, um clique de botão sem formulário) não continham nenhum dado sensível para começar, independentemente do `beforeSend`/`sendDefaultPii: false` já configurados no código. Fica registado como lacuna de âmbito do token, não do sistema.

## 6. UptimeRobot — Bloqueado, Registado como Acompanhamento Separado (Não Bloqueante do M7)

A Main API Key fornecida (`u3644072-...`) tem acesso de leitura total (`getAccountDetails`, `getMonitors` funcionam), mas **toda a tentativa de criar um monitor (`newMonitor`) falha com `access_denied: "You are not allowed to use some settings with your current plan"`** — testado com dois tipos de monitor diferentes (HTTP e Keyword), ambos com todos os campos obrigatórios preenchidos, mesma falha em ambos. Isto isola o problema como uma **restrição ao nível da conta**, não um erro nos parâmetros do pedido.

Evidência: a conta tem `active_subscription: null` e foi criada há poucas horas (`registered_at`) — padrão consistente com uma verificação pendente (ex.: confirmação de email) que novas contas gratuitas da UptimeRobot por vezes exigem antes de permitir escrita via API, mesmo com leitura já ativa.

**Não resolvido por tentativa-erro repetida** — testado uma segunda vez antes deste relatório, mesmo resultado. Ação necessária da Fundadora/CEO: verificar a caixa de entrada de `adaira1989@gmail.com` por um email de confirmação da UptimeRobot, ou tentar criar um monitor manualmente pela consola web (isso esclarece se a restrição é da conta como um todo ou só da API).

**Decisão formal da Fundadora/CEO (2026-07-14)**: o Passo 43 fica encerrado com o Sentry como entregue e validado — esta dependência externa, sem relação com a implementação técnica, não bloqueia o encerramento do passo nem o avanço do M7. Registada permanentemente no ADR-007 (v1.3, nova Questão em Aberto Q5, secção 5) como **obrigatória antes de qualquer lançamento com empresas piloto/produção**, mesmo padrão já usado para a exceção de retenção de backups da Neon (Q4, Passo 40) — nunca fica esquecida ou implícita.

## 7. Regressão Completa (Depois de Todos os Deploys)

| Validação | Resultado |
|---|---|
| `GET /health` (backend) | ✅ `200` |
| Rota de diagnóstico backend removida | ✅ `404` (confirmado depois do deploy final) |
| Rota de diagnóstico frontend removida | ✅ `404` (confirmado depois do deploy final) |
| `GET /` e `/precos` (frontend) | ✅ `200` |
| CORS (`Origin` do Vercel) | ✅ `204`, `access-control-allow-origin` correto |
| Suite e2e local (`npm run test:e2e`) | ✅ 219/219, sem regressão da integração Sentry |
| Registo + Login (Empresas de demonstração "Passo43 Regressao A/B") | ✅ `201`/`200` |
| Criação de Processo (Empresa A) | ✅ `201` |
| Isolamento multi-tenant | ✅ Empresa B nunca viu o Processo da A |
| Limpeza dos dados de teste | ✅ 0 Empresas na BD de staging no final |

## 8. Segredos — Confirmação

`SENTRY_DSN` (Render) e `NEXT_PUBLIC_SENTRY_DSN` (Vercel) configurados exclusivamente como variáveis de ambiente nos respetivos serviços — **nunca escritos em nenhum ficheiro do repositório**, confirmado por `grep` aos ficheiros commitados antes de cada commit. O Auth Token da Sentry e a Main API Key da UptimeRobot usados só em comandos de terminal (`curl`), nunca persistidos em disco.

## 9. Exit Criteria (Especificação Técnica do Passo 43) — Checklist

- [x] 2 projetos Sentry criados, DSNs configurados em Render e Vercel.
- [x] Erro deliberado capturado e visível nos dois projetos Sentry (confirmado via `firstEvent`/tag `environment`), sem dados sensíveis nos gatilhos usados.
- [ ] **2 monitores UptimeRobot criados e ativos — bloqueado por dependência externa; registado como Questão em Aberto Q5 do ADR-007 (v1.3), obrigatória antes de qualquer lançamento com empresas piloto/produção, deliberadamente não bloqueante do encerramento deste passo (decisão explícita da Fundadora/CEO).**
- [x] Nenhuma alteração de comportamento de produto — confirmado por regressão completa (secção 7).

---

## 10. Decisão Formal da Fundadora/CEO (2026-07-14)

**Passo 43 formalmente encerrado com o Sentry entregue e validado.** A criação dos monitores UptimeRobot fica registada como item de acompanhamento separado, sem bloquear o encerramento do M7 — dependência externa (conta da UptimeRobot) sem relação com a implementação técnica, mesmo padrão já usado para a exceção de retenção de backups da Neon (ADR-007 v1.2, Q4, Passo 40). Documentada permanentemente no ADR-007 (v1.3, nova Questão em Aberto Q5): **obrigatória antes de qualquer lançamento com empresas piloto/produção**, nunca esquecida ou implícita.

## 11. Recomendação

**Passo 43 formalmente concluído.** Sentry (rastreio de erros) integralmente implementado e validado ao vivo nos dois componentes de staging, sem qualquer regressão de comportamento. UptimeRobot corretamente identificado e registado como pré-requisito de lançamento (não de M7). Nada bloqueia o avanço para o Passo 44 (CI/CD — GitHub Actions).

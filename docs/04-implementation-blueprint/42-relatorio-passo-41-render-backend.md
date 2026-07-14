# NEXA — Relatório de Execução do Passo 41 (M7 — Backend em Render, Staging)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 41: Backend NestJS em Render (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 41 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação formal da Fundadora/CEO |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 41](41-especificacao-tecnica-passo-41-render-backend.md); ADR-007 §3.2/3.9; Relatório do Passo 40 |
| **Última atualização** | 2026-07-14 |

---

## 1. Resumo Executivo

`apps/api` está publicado como Web Service no Render, região `frankfurt` (UE), ligado à base de dados Neon de staging já criada e validada no Passo 40. O primeiro deploy falhou por uma lacuna real de scaffolding (secção 3) — corrigida, testada localmente e re-deployada com sucesso. `GET /health` responde `200` a partir da URL pública. Teste de fumo real (registo, login, isolamento multi-tenant) executado com sucesso contra o backend em Render, servindo tráfego real contra a Neon — não simulado. Dados de teste eliminados no final.

---

## 2. Via de Provisionamento — API Key (Decisão A confirmada)

Confirmado, tal como já indicado na Especificação Técnica: **não existe CLI oficial da Render** (`npx render-cli` é um pacote npm homónimo de templating, sem relação com a Render.com). Todo o provisionamento foi feito via API REST (`https://api.render.com/v1`), com a mesma disciplina de automação e evidência já usada no Passo 40 (Neon).

## 3. Descoberta Técnica Real — Build Falhou no Primeiro Deploy, Corrigida

O primeiro deploy (`dep-d9b0u3t8nd3s739ub0cg`) falhou em `build_failed`, com erros de compilação TypeScript em ficheiros de teste (`test/comercial-enforcement.e2e-spec.ts`, `test/comercial-subscricao-resumo.e2e-spec.ts`, entre outros): `Module '"@prisma/client"' has no exported member 'Papel'`/`'EstadoProcesso'`. Diagnóstico feito por inspeção direta dos logs de build via API (`GET /v1/logs`), não por tentativa-erro às cegas. Causa raiz dupla, nunca antes visível localmente:

1. **Sem `postinstall`, `npm install` nunca corria `prisma generate`** — o cliente Prisma ficava no stub por defeito, sem os enums/tipos customizados do schema (`Papel`, `EstadoProcesso`, etc.). Localmente isto nunca se manifestou porque o cliente já estava gerado de execuções anteriores (`prisma:generate` corrido manualmente ao longo dos Passos 2-40) — uma lacuna de scaffolding real, presente desde o Passo 1, só visível num ambiente com instalação verdadeiramente limpa.
2. **Sem `tsconfig.build.json`, `nest build` compilava também `test/`** — amplificando o problema acima (que só afetaria tipos usados em produção) em erros fatais de build, por o TypeScript tentar validar ficheiros de teste que nunca fazem parte do artefacto de produção.

**Corrigido com dois padrões idiomáticos, nenhum deles uma decisão de arquitetura nova:**
- `"postinstall": "prisma generate"` em `apps/api/package.json` — padrão recomendado pela própria documentação da Prisma para plataformas de deploy (Vercel, Render, Railway).
- `apps/api/tsconfig.build.json` (`exclude: ["node_modules", "test", "dist", "**/*spec.ts"]`) — o ficheiro padrão do scaffold oficial do NestJS, nunca criado desde o Passo 1.

**Efeito colateral verificado e corrigido**: excluir `test/` do build muda o `rootDir` inferido pelo `tsc` (deixa de ser a raiz do projeto — comum a `src/` e `test/` — e passa a ser só `src/`), pelo que o `outDir` deixou de espelhar `dist/src/main.js` e passou a `dist/main.js`. Corrigido em dois sítios: `startCommand` do serviço Render (via `PATCH /v1/services`) e `render.yaml` (secção 5). `package.json`'s `start:prod` (`node dist/main`) já estava correto e ficou inalterado.

Build local (`rm -rf dist && npm run build`) confirmado limpo antes de commitar. Sem impacto no `jest`/`ts-jest` (usa `tsconfig.json` diretamente, nunca `tsconfig.build.json`) — suite de testes não afetada por este fix.

Commit `3bc2c8b` — pedida e obtida confirmação explícita da Fundadora/CEO antes do push (mesma disciplina de sempre, nunca assumida de uma aprovação anterior). Push feito, novo deploy (`dep-d9b4aibeo5us73dtogm0`) disparado via API com `clearCache: clear` — concluído em `live` em cerca de 70 segundos.

## 4. Web Service Render — Estado Final

| Campo | Valor |
|---|---|
| Nome | `nexa-api-staging` |
| ID do serviço | `srv-d9b0u358nd3s739uavd0` |
| Região | `frankfurt` (UE) ✅ |
| Plano | Free |
| Runtime | Node |
| `rootDir` | `apps/api` |
| Build command | `npm install && npm run build` |
| Start command | `node dist/main.js` (corrigido — ver secção 3) |
| Health check path | `/health` |
| URL pública | `https://nexa-api-staging.onrender.com` |
| Repositório | `https://github.com/adaalvess/NEXA` (branch `main`, auto-deploy em cada commit) |
| Estado do último deploy | `live` (commit `3bc2c8b`) |

## 5. Variáveis de Ambiente — Configuradas

Valores idênticos aos já gerados e validados no Passo 40 (`.env.staging`), aplicados via `PUT /v1/services/{id}/env-vars` e confirmados por leitura de volta (`GET /v1/services/{id}/env-vars`, sem nenhum valor em falta):

`DATABASE_URL`, `FUNDACAO_DATABASE_URL`, `AUDITORIA_INTERNA_DATABASE_URL` (todos endpoint pooled da Neon), `SESSION_SECRET`, `ARGON2_MEMORY_COST=19456`, `ARGON2_TIME_COST=2`, `WEB_APP_URL` (provisório, `http://localhost:3000`, Decisão C — corrigido no Passo 42).

**Deliberadamente sem `PORT` explícito** — a Render injeta a sua própria variável `PORT`, já lida pela aplicação (`process.env.PORT ?? 4000` em `main.ts`, desde o scaffolding); confirmado que o serviço arrancou e respondeu corretamente sem qualquer conflito.

**Credenciais de fornecedores (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_*`) continuam por preencher** (Decisão B, já aprovada) — o backend serve tráfego real (auth, RBAC, Processos, CRM) sem elas; os endpoints dependentes devolverão erros tratados (`502`/`503`), exatamente como já acontece localmente. Fica registado como trabalho a fazer assim que as credenciais estiverem disponíveis, sem bloquear este passo.

## 6. Validações Realizadas (Todas Reais, Contra o Backend em Render + Neon)

| Validação | Resultado |
|---|---|
| `GET /health` a partir da URL pública | ✅ `200`, `{"status":"ok","service":"nexa-api",...}` |
| Registo de Utilizador (Empresa de demonstração "Render Smoke Test A") | ✅ `POST /auth/registar` → `201` |
| Registo de Utilizador (Empresa de demonstração "Render Smoke Test B") | ✅ `POST /auth/registar` → `201` |
| Login (ambas as Empresas) | ✅ `POST /auth/login` → `200`, cookie de sessão válido |
| Criação de Processo pela Empresa A | ✅ `POST /processos` → `201` |
| Isolamento multi-tenant | ✅ Empresa B (`GET /processos`) → `[]`, nunca vê o Processo da Empresa A; Empresa A vê o seu próprio Processo |
| Limpeza dos dados de teste | ✅ As 2 Empresas de demonstração eliminadas diretamente na BD (mesmo mecanismo de sempre — trigger de imutabilidade da auditoria temporariamente desativado só para a limpeza, reativado de imediato); BD de staging confirmada com 0 Empresas no final |

**Nota honesta**: uma tentativa inicial de `POST /processos` devolveu `500` — diagnosticado de imediato como erro no próprio comando de teste (`responsavelId` vazio, por falha de um `grep` no script de smoke test, não um bug do backend). Corrigido no comando seguinte, que teve sucesso imediato (`201`). Registado aqui por rigor, não por representar um problema real do backend.

## 7. `render.yaml` — Infrastructure as Code

Ficheiro criado na raiz do repositório (commit `3bc2c8b`), com `startCommand: node dist/main.js` já corrigido (secção 3) — reflete fielmente a configuração real do serviço, incluindo a lista de variáveis de ambiente com `sync: false` para todos os segredos (nunca lidos do ficheiro versionado).

**Nota de consistência**: o serviço foi criado via chamada direta à API (`POST /v1/services`), não pela Render a interpretar este Blueprint — decisão já prevista na Especificação Técnica (secção 2, via API preferencial). O `render.yaml` fica como documentação versionada da configuração, consistente com a Regra Não-Negociável #4 ("Configuração sobre hardcoding"), sem risco de duplicação de serviço: a Render só cria/reconcilia serviços a partir de um Blueprint quando este é explicitamente ligado a um "Blueprint Instance" na consola, o que nunca foi feito aqui.

## 8. Fora de Âmbito Deste Passo (Confirmado)

Frontend em Vercel (Passo 42) — `WEB_APP_URL` permanece provisório até lá. Domínio próprio/DNS. Observabilidade (Sentry, uptime — Passo 43). CI/CD automático (Passo 44) — este passo usou deploy manual/via API, incluindo o disparo explícito do segundo deploy após o fix.

## 9. Exit Criteria (Especificação Técnica do Passo 41) — Checklist

- [x] Web Service Render criado, região `frankfurt` (UE).
- [x] `GET /health` → `200` a partir da URL pública do Render.
- [x] Variáveis de ambiente corretas (confirmadas sem expor segredos neste relatório).
- [x] Teste de fumo real contra o backend em Render: registo, login, isolamento multi-tenant.
- [x] `render.yaml` commitado (Infrastructure as Code).

---

## 10. Recomendação

**Passo 41 tecnicamente concluído**, incluindo a resolução de uma lacuna de scaffolding real (ausência de `postinstall`/`tsconfig.build.json`, nunca antes visível em ambiente local) — corrigida, testada e documentada, sem qualquer alteração de arquitetura ou âmbito aprovado. Todos os Exit Criteria cumpridos. Nada bloqueia o avanço para o Passo 42 (Frontend em Vercel), salvo a aprovação formal deste relatório pela Fundadora/CEO.

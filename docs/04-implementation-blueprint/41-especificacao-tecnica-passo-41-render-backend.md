# NEXA — Especificação Técnica do Passo 41 (M7 — Backend em Render, Staging)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 41: Backend NestJS em Render (Staging) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 41 — terceiro passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.2/3.9; Especificação Técnica do Passo 40 (Neon staging); Relatório do Passo 40 |
| **Última atualização** | 2026-07-14 |

---

## 1. Objetivo

Publicar `apps/api` (NestJS) como Web Service no Render, ambiente de staging, ligado à base de dados Neon já criada e validada no Passo 40 — sem introduzir nenhuma decisão de arquitetura nova, só executar o que o ADR-007 §3.2 já decidiu.

---

## 2. Bloqueio Estrutural — Conta Render

Ao contrário da Neon (CLI oficial `neonctl` com fluxo OAuth completo por terminal), **não existe um CLI oficial e completo da Render para provisionamento via terminal** — confirmei isto tentando `npx render-cli`, que se revelou um pacote npm homónimo sem qualquer relação com a Render.com (ferramenta de templating estática, não a plataforma de hosting). A Render disponibiliza, no entanto, uma **API REST completa**, que permite fazer exatamente o mesmo tipo de automação já usada no Passo 40, desde que exista uma **API key**.

**Preciso de uma destas duas coisas, fornecidas pela Fundadora/CEO, antes de executar qualquer ação:**

1. **Preferencial — API key da Render** (Dashboard → Account Settings → API Keys → Create API Key). Com isto, crio o serviço, configuro as variáveis de ambiente, e disparo o primeiro deploy inteiramente por automação, com o mesmo nível de rigor e validação já demonstrado no Passo 40 (Neon).
2. **Alternativa — acesso à consola Render feito por ti**: ligas a conta Render ao repositório GitHub (`adaalvess/NEXA`) e crias o Web Service manualmente a partir do `render.yaml` que preparo neste passo (secção 3) — eu preparo tudo, tu só confirmas os cliques na consola.

Nada será executado até uma destas duas vias estar disponível.

---

## 3. `render.yaml` (Blueprint) — Preparado Neste Passo, Independente da Via Escolhida

Ficheiro na raiz do repositório, consistente com "Configuração sobre hardcoding" (Regra Não-Negociável #4) — a definição do serviço fica versionada, nunca só na consola:

```yaml
services:
  - type: web
    name: nexa-api-staging
    runtime: node
    region: frankfurt
    plan: free
    rootDir: apps/api
    buildCommand: npm install && npm run build
    startCommand: node dist/src/main.js
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 4000
      - key: DATABASE_URL
        sync: false
      - key: FUNDACAO_DATABASE_URL
        sync: false
      - key: AUDITORIA_INTERNA_DATABASE_URL
        sync: false
      - key: SESSION_SECRET
        sync: false
      - key: ARGON2_MEMORY_COST
        value: 19456
      - key: ARGON2_TIME_COST
        value: 2
      - key: WEB_APP_URL
        sync: false
```

- `region: frankfurt` — única região UE da Render (ADR-007 §3.2/NFR-21), mesma disciplina já aplicada ao Neon no Passo 40.
- `healthCheckPath: /health` — reaproveita o `HealthController` já existente desde o scaffolding do Passo 1, nunca criado de propósito para este passo.
- `sync: false` nos segredos — a Render nunca lê estes valores do `render.yaml` (ficheiro versionado); ficam só na consola/API, preenchidos com os valores já gerados no Passo 40 para `.env.staging`.
- Credenciais dos fornecedores (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_*`) propositadamente fora desta lista — ver secção 5, Decisão a Validar.

---

## 4. Sequência de Execução (Só Depois da Confirmação da Secção 2)

1. Criar o Web Service no Render (via API ou Blueprint, secção 2).
2. Configurar as variáveis de ambiente com os valores já gerados no Passo 40 (`DATABASE_URL`, `FUNDACAO_DATABASE_URL`, `AUDITORIA_INTERNA_DATABASE_URL`, `SESSION_SECRET`) + `WEB_APP_URL` (apontando para o Vercel de staging, só depois do Passo 42 — até lá, um valor provisório).
3. Primeiro deploy — Render corre `npm install && npm run build`, depois `node dist/src/main.js`.
4. Verificação: `GET https://nexa-api-staging.onrender.com/health` → `200`.
5. Teste de fumo real contra o backend já em Render (não só localmente como no Passo 40): registo, login, isolamento multi-tenant — mesma disciplina do Passo 40, agora com o backend também fora do ambiente local.
6. Limpeza dos dados de teste.

---

## 5. Decisões a Validar

- **A — Via de provisionamento**: API key (recomendado, mantém o mesmo nível de automação e evidência do Passo 40) vs. consola manual guiada.
- **B — Credenciais de fornecedores neste passo?** `ANTHROPIC_API_KEY`/`RESEND_API_KEY`/`STRIPE_*` ainda não estão em `.env.staging` (ficaram por preencher no Passo 40, por decisão já aprovada — "sempre que o fornecedor disponibilizar um ambiente de testes adequado"). Proponho **não bloquear o Passo 41 por causa disto** — o backend arranca e serve tráfego real (auth, RBAC, Processos, CRM) sem essas 3 credenciais; os endpoints que dependem delas (`/ia/*`, `/convites` com envio real, `/subscricao/checkout`) devolverão erros tratados (`502`/`503`), exatamente como já acontece localmente. Preencher essas credenciais fica registado como trabalho a fazer assim que estiverem disponíveis, sem bloquear este passo.
- **C — `WEB_APP_URL` antes do Vercel existir**: uso um valor provisório (`http://localhost:3000`) até ao Passo 42, corrigido nesse passo — não bloqueia o CORS de endpoints que não dependem de sessão cross-origin nos testes de fumo deste passo.

---

## 6. Fora de Âmbito Deste Passo

- Frontend em Vercel (Passo 42).
- Domínio próprio/DNS.
- Observabilidade (Sentry, uptime — Passo 43).
- CI/CD automático (Passo 44) — este passo é deploy manual/via API, uma única vez.

---

## 7. Exit Criteria

- Web Service Render criado, região `frankfurt` (UE).
- `GET /health` → `200` a partir da URL pública do Render.
- Variáveis de ambiente corretas (confirmadas sem expor segredos no relatório final).
- Teste de fumo real contra o backend em Render: registo, login, isolamento multi-tenant.
- `render.yaml` commitado (Infrastructure as Code, nunca só configuração manual na consola).

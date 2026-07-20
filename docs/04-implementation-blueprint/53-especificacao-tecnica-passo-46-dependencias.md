# NEXA — Especificação Técnica do Passo 46 (M8 — Triagem de Vulnerabilidades de Dependências)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 46: Triagem e Correção de Vulnerabilidades de Dependências |
| **Fase** | 7 — Desenvolvimento da Plataforma, M8 (Preparação para Lançamento), Passo 46 — primeiro passo do M8 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta e Especificação Técnica do M8; Relatório Executivo Consolidado, secção 7 |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo

Triagem real das 32 vulnerabilidades já identificadas (`npm audit`), classificando cada uma individualmente (explorável no contexto real de uso da NEXA vs. inofensiva/inatingível) — nunca `npm audit fix --force` às cegas.

---

## 2. Achado Real — A Investigação Já Mudou o Âmbito Deste Passo

A investigação detalhada (feita antes de escrever esta especificação, não durante a implementação) revelou um quadro bem mais preciso do que a contagem "32 vulnerabilidades, 0 críticas" do Relatório Executivo sugeria à primeira vista — e um desequilíbrio real entre backend e frontend que muda a prioridade:

### 2.1 Backend (26 vulnerabilidades) — Maioria Sem Risco de Runtime Real

- **17 das 26** vêm exclusivamente de `@nestjs/cli` (`@angular-devkit/*`, `glob`, `inquirer`, `picomatch`, `tmp`, `webpack`, `tar`, `external-editor`) — **dependência de desenvolvimento/build, nunca presente no runtime deployado** (`nest build` gera só JavaScript puro para `dist/`, o CLI em si nunca corre em produção). Risco real: zero em produção; risco teórico de supply chain durante o próprio processo de build, mesma categoria de risco que qualquer ferramenta de desenvolvimento.
- **1 (`multer`, high)** — dependência transitiva de `@nestjs/platform-express`, mas **confirmado por `grep` que a aplicação nunca usa `multer`/`FileInterceptor`/upload de ficheiros em nenhum endpoint** — o caminho vulnerável nunca é atingível, mesmo que o pacote esteja instalado.
- **8 restantes são genuinamente relevantes em runtime** (`lodash`, `qs`, `express`, `body-parser`, `file-type`, e os pacotes `@nestjs/*` que as trazem) — mas **todas** exigem `@nestjs/core`/`@nestjs/platform-express`/`@nestjs/config` na versão **11.x** (atualmente na `10.x`) para resolver — uma **atualização major do próprio framework**, nunca um patch isolado.

### 2.2 Frontend (6 vulnerabilidades) — Mais Sério do Que a Contagem Sugeria

O `next` (`14.2.35`) tem **13 avisos de segurança nomeados**, vários genuinamente sérios para uma aplicação pública que está prestes a servir clientes reais: **XSS em `beforeInteractive` scripts e em páginas App Router com nonces CSP, contrabando de pedidos HTTP (request smuggling) em rewrites, SSRF via upgrades de WebSocket, envenenamento de cache**. A correção exige `next@16.2.10` — **duas versões major acima da atual (14→15→16)**.

---

## 3. Decisões a Validar

- **A — Vulnerabilidades exclusivas do `@nestjs/cli`**: aceitar sem correção nesta fase, documentadas como sem risco de runtime (nunca presentes no artefacto deployado) — revisitar só se/quando o `@nestjs/cli` for atualizado por outro motivo.
- **B — `multer`**: aceitar sem correção, documentado como caminho de código nunca atingível (sem upload de ficheiros implementado em toda a aplicação).
- **C — Upgrade major do NestJS (10→11) para resolver as 8 vulnerabilidades de runtime do backend**: **proponho não fazer neste passo** — é uma migração de framework com risco real de regressão em todos os 6 módulos de negócio, justo antes de um lançamento real; proponho tratar como um item a agendar depois do M8 (staging continua a proteger-se pelas 3 camadas de isolamento multi-tenant e pelo `ValidationPipe`, independentemente da versão do NestJS — nenhuma destas 8 vulnerabilidades quebra essas proteções). **Decisão a validar contigo, não assumida.**
- **D — Upgrade do Next.js (14→16) para resolver os 13 avisos do frontend**: ao contrário do NestJS, **recomendo fazer este upgrade dentro do próprio Passo 46** — o perfil de risco é diferente (XSS/request smuggling/SSRF afetam diretamente qualquer visitante da aplicação pública, incluindo antes de autenticação, ao contrário das vulnerabilidades do backend que exigem código já autenticado/interno para serem atingíveis). Validação real planeada: build completo, lint completo, e reexecução manual no browser de todos os fluxos já validados no M2-M7 (login, registo, dashboard, processos, CRM, IA, configurações, subscrição) — não há suite automatizada de frontend (lacuna já registada no Relatório Executivo) para confirmar ausência de regressão, por isso a validação manual tem de ser exaustiva.

---

## 4. Sequência de Execução (Só Depois da Confirmação da Secção 3)

1. Documentar formalmente as Decisões A e B (sem alteração de código, só registo).
2. Se a Decisão D for aprovada: `npm install next@latest eslint-config-next@latest` (workspace `apps/web`), rever o `CHANGELOG`/notas de migração oficiais do Next.js entre 14→15 e 15→16 antes de instalar (App Router, `next.config.js`, Sentry — já integrado desde o Passo 43 — têm de continuar compatíveis).
3. `npm run build` + `npm run lint` limpos.
4. Validação manual exaustiva no browser (secção 3, Decisão D) — sem suite automatizada, o critério de aceitação é literalmente percorrer os fluxos já validados nos Passos 14/18/23/28/31/42, confirmando zero regressão visual ou funcional.
5. `npm audit` re-executado em ambos os workspaces, confirmando a contagem final e documentando o que ficou deliberadamente aceite (Decisões A/B/C).
6. Deploy a staging via o pipeline real (nunca manual) — mesma disciplina do M7.

---

## 5. Fora de Âmbito Deste Passo

- Upgrade major do NestJS (Decisão C, a agendar separadamente se aprovado no futuro).
- Qualquer alteração de comportamento de produto — só dependências e configuração associada.

---

## 6. Exit Criteria

- Decisões A-D confirmadas pela Fundadora/CEO antes de qualquer alteração de código.
- Se D aprovada: Next.js atualizado, build/lint limpos, validação manual exaustiva sem regressão, deploy real a staging confirmado (`GET /` a `200`).
- Relatório final com a lista completa das 32 vulnerabilidades originais, classificação individual (corrigida / aceite com justificação) e o número final de vulnerabilidades remanescentes em cada workspace.

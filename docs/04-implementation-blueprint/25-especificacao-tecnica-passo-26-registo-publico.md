# NEXA — Especificação Técnica do Passo 26 (M5): Ecrã de Registo Público (`/registar`) — Fecha o Bloco A do M5

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 26 — Ecrã de Registo público |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 26 — terceiro e último passo do Bloco A |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) — Bloco A do M5 concluído |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08); Business Goals H1.4 (percurso Landing → Trial → Pagamento → Uso); NFR-08 (robustez de password), NFR-22 (RGPD); Especificação Técnica do Passo 3 (`POST /auth/registar`, `POST /auth/login`, já implementados, sem alteração neste passo); Especificação Técnica do Passo 24/25 (precedentes diretos — páginas públicas) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Construir `/registar`, consumindo `POST /auth/registar` e `POST /auth/login` (ambos já implementados desde o Passo 3, sem alteração de backend prevista) para permitir que um visitante crie a sua Empresa e conta sozinho, terminando autenticado no `/dashboard` — sem nenhuma intervenção manual da equipa. Fecha o Bloco A do M5 e o percurso "Landing → Trial" (Business Goals, H1.4).

---

## 2. Contexto

Ao contrário dos Passos 24/25, este ecrã tem estado de formulário e submissão — não é conteúdo só de leitura. Revi o contrato exato de `POST /auth/registar` antes de desenhar o ecrã: **não estabelece sessão** (devolve só `{ empresaId, utilizadorId }`, sem cookie) — só `POST /auth/login` (Passo 3) faz isso. O fluxo tem, por isso, de encadear os dois pedidos.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Campo "País" — texto livre ou lista fixa de países europeus?** O backend (`RegistarDto`) aceita qualquer string, sem validação de formato nem lista fechada. | **Texto livre** (`Input` simples, ex. "PT") — nenhuma lista de países está documentada/aprovada em nenhum lugar do projeto; construir uma lista fixa agora seria inventar um requisito sem base documental. Revisitar com um `Select` só se/quando houver necessidade real de segmentação por país (relatórios, faturação regional). |
| B | **Consentimento RGPD no registo — este ecrã não tem checkbox de consentimento/Termos de Serviço, porque não existe nenhuma página de Termos/Política de Privacidade no projeto ainda.** NFR-22 (Conformidade RGPD) já é um requisito não-funcional aprovado, "aplicável desde o lançamento do MVP". | **Avançar sem checkbox nesta fase**, mas registar isto explicitamente como uma **limitação real de conformidade**, não uma decisão esquecida: adicionar um checkbox a apontar para uma página de Termos que não existe seria pior (simularia uma política que não existe). Uma página de Termos/Privacidade real, com o respetivo consentimento capturado no registo, **tem de existir antes de qualquer cliente real se registar em produção** — não pode ficar por decidir silenciosamente. Proponho registar isto como bloqueador explícito para o M6/M7 (pré-lançamento), não para este M5. |

**Aviso explícito**: a Decisão B tem peso legal, não só técnico — preciso da tua confirmação explícita antes de avançar, dado que "MVP funcional, utilizável por clientes reais" (PRD, D4) é o objetivo já aprovado deste pivô.

---

## 3. Conteúdo Estruturado

### 3.1 Rota e Fluxo (Frontend)

```
apps/web/src/app/registar/page.tsx
```

**Client Component** (`'use client'`) — mesmo padrão do `/login` (Passo 14), não Server Component como `/precos`/`/` (Passos 24/25): tem estado de formulário e submissão, ao contrário dessas duas páginas, que eram só de leitura.

Fluxo de submissão:
1. `POST /auth/registar` com `{ empresa: { nome, pais }, utilizador: { nome, email, password } }`.
2. Em caso de sucesso, encadeia imediatamente `POST /auth/login` com `{ email, password }` — sem pedir à pessoa para voltar a escrever as credenciais (Business Goals H1.4, "sem intervenção manual").
3. Em caso de sucesso do login, `router.push('/dashboard')`.
4. Se `POST /auth/registar` falhar com `409` (email já existente — mensagem já devolvida pelo backend, Passo 3), mostra essa mensagem exata e sugere ir para `/login`.
5. Se `POST /auth/registar` tiver sucesso mas o `POST /auth/login` seguinte falhar (cenário raro — ex. limite de pedidos atingido no mesmo minuto), mostra um erro claro a pedir para iniciar sessão manualmente em `/login` — a conta já foi criada com sucesso, nunca perder essa informação.

### 3.2 Campos do Formulário

| Campo | Origem/Validação | Componente |
|---|---|---|
| Nome da Empresa | `empresa.nome`, 2-100 caracteres | `Input` |
| País | `empresa.pais`, texto livre (Decisão A) | `Input` |
| O Teu Nome | `utilizador.nome`, 2-100 caracteres | `Input` |
| Email | `utilizador.email`, formato de email | `Input type="email"` |
| Palavra-passe | `utilizador.password`, mínimo 8 caracteres (NFR-08) | `Input type="password"` |

Validação client-side só por atributos HTML nativos (`required`, `minLength`, `maxLength`, `type="email"`) — mesmo padrão já estabelecido em `/login` e nos formulários de criação (Passo 14); toda a validação real continua no backend (fronteira única, Data & Consistency Rules 3.6).

### 3.3 Tratamento de Erros

| Cenário | Tratamento |
|---|---|
| `409` em `POST /auth/registar` | Mensagem exata devolvida pelo backend ("Este email já está associado a uma conta existente. Inicia sessão em vez de registar.") |
| `400` em `POST /auth/registar` (validação) | Mensagem genérica ("Não foi possível criar a conta. Verifica os dados.") — mesmo padrão dos formulários de criação já existentes |
| Falha em `POST /auth/login` após registo bem-sucedido | Mensagem distinta, a indicar que a conta foi criada e a pedir login manual em `/login` |

### 3.4 Atualização dos CTAs Já Implementados

`apps/web/src/app/page.tsx` (Passo 25) e `apps/web/src/app/precos/page.tsx` (Passo 24) — os CTAs "Começar" passam de `/login` para `/registar` (3 ocorrências no total: 2 no hero/CTA final da Landing, 1 em cada cartão de plano da Pricing). Ajuste aditivo, já anticipado nas duas especificações anteriores — nenhuma alteração à estrutura dessas páginas.

### 3.5 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| NFR-08 (robustez de password) | ✅ Validação de 8 caracteres já no backend (Passo 3), refletida no `minLength` do campo |
| NFR-22 (RGPD) | ⚠️ Ver Decisão B — limitação explícita, registada, não resolvida por este passo |
| Business Goals H1.4 | ✅ Percurso Landing → Registo → Trial → Uso completo sem intervenção manual |
| ADR-006 §3.7 | ✅ N/A — página pública, sem RBAC nenhum a esconder |

**Nenhum novo ADR necessário.**

### 3.6 Critérios de Aceitação e Exit Criteria (planeados)

Sem alteração de backend — sem testes automatizados novos de API (endpoints já cobertos pelo Passo 3). Validação **exclusivamente por inspeção visual real no browser**, incluindo o fluxo completo ponta a ponta.

| # | Cenário | Resultado esperado |
|---|---|---|
| V1 | Registo com dados válidos termina autenticado em `/dashboard`, sem passo manual extra | Inspeção visual + rede |
| V2 | Registo com email já existente mostra a mensagem exata do backend, sem crash | Inspeção visual |
| V3 | CTAs "Começar" de `/` e `/precos` apontam agora para `/registar` | Inspeção/rede |
| V4 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual |
| V5 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola | build/lint limpos |

**Exit Criteria:** V1-V5 confirmados por validação visual real no browser.

---

### 3.7 Resultado da Implementação (2026-07-08)

`apps/web/src/app/registar/page.tsx` (novo, Client Component) implementa exatamente o fluxo de §3.1: `POST /auth/registar` → `POST /auth/login` → `router.push('/dashboard')`. `apps/web/src/app/page.tsx` e `apps/web/src/app/precos/page.tsx` atualizados — os 3 CTAs "Começar" passam de `/login` para `/registar` (§3.4).

**Descoberta técnica real, corrigida antes do fecho**: `lib/api.ts` guardava em `ApiError.message` o **corpo de resposta em bruto** (`res.text()`), nunca extraído do JSON — para um erro `409` do NestJS (`{ statusCode, message, error }`), isto significava mostrar `{"message":"Este email já está...","error":"Conflict","statusCode":409}` literalmente num toast, em vez de só a frase. O bug já existia desde o Passo 14, mas nunca se tinha manifestado porque nenhum ecrã antes deste passo mostrava `erro.message` diretamente ao utilizador — todos usavam mensagens genéricas fixas por código de estado (`error.status === 401 ? '...' : '...'`). Corrigido com uma função `extrairMensagemErro()` central em `lib/api.ts`, que faz `JSON.parse` do corpo e devolve `message` (string ou array, unido, para cobrir também respostas do `ValidationPipe`), com fallback seguro para o texto em bruto se o corpo não for JSON. Correção central — beneficia todos os ecrãs presentes e futuros que venham a mostrar `erro.message` diretamente, não só este passo.

**Backend**: sem alteração — `POST /auth/registar`/`POST /auth/login` já existiam desde o Passo 3. Regressão completa confirmada sem impacto (nenhum endpoint tocado).

**Frontend (validação visual real no browser):**

| # | Cenário | Resultado |
|---|---|---|
| V1 | Registo com dados válidos termina autenticado em `/dashboard`, sem passo manual extra | ✅ Confirmado (`POST /auth/registar` 201 → `POST /auth/login` 200 → `/dashboard` com dados reais carregados) |
| V2 | Registo com email já existente mostra a mensagem exata do backend, sem crash | ✅ Confirmado — só depois de corrigido o bug de `lib/api.ts` acima |
| V3 | CTAs "Começar" de `/` e `/precos` apontam agora para `/registar` | ✅ Confirmado (5/5 links verificados — 2 em `/`, 3 em `/precos`) |
| V4 | Responsivo sem quebras em 375px/768px/1280px | ✅ Confirmado |
| V5 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola | ✅ Confirmado |

**Bloco A do M5 (EP-07 — Landing/Pricing/Registo público) formalmente concluído** — Passos 24, 25 e 26 implementados, validados e aprovados. Percurso "Landing → Registo → Trial" (Business Goals H1.4) operacional de ponta a ponta. **Milestone M5 em curso** — próximo: Bloco B (Passo 27, `PATCH /utilizadores/me`).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | `POST /auth/registar` seguido imediatamente de `POST /auth/login` no mesmo submit, sem pedir à pessoa para voltar a autenticar-se manualmente | Requisito já aprovado (Business Goals H1.4, "sem intervenção manual da equipa") — não é uma nova decisão, é a implementação literal do que já está aprovado |
| D2 | Client Component, não Server Component | Tem estado de formulário e submissão — mesmo padrão do `/login` (Passo 14), nunca dos Passos 24/25 (só leitura) |
| D3 | Validação client-side só por atributos HTML nativos | Mesmo padrão já estabelecido em todos os formulários de criação existentes; validação real fica sempre no backend |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Página de Termos de Serviço / Política de Privacidade e captura de consentimento RGPD no registo (Decisão B) | **Bloqueador real antes de qualquer registo de cliente em produção** — não bloqueia este M5, mas tem de estar resolvido antes do M6/M7 (pré-lançamento) | CEO + CTO, milestone de pré-lançamento |
| 2 | Centro de Ajuda mínimo (PRD, mesma "Camada Comercial e Produto") continua fora do âmbito aprovado do M5 (já registado nos Passos 24/25) | Nenhum — não bloqueia este passo | CEO + CTO, milestone futuro |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 26 — sem implementação. 2 Decisões a Validar (A: campo País em texto livre; B: sem consentimento RGPD nesta fase, registado como bloqueador real de pré-lançamento). Plano de validação visual V1-V5 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO. Descoberta técnica real corrigida: `lib/api.ts` guardava o corpo de erro em bruto em `ApiError.message`, nunca extraído do JSON — corrigido com `extrairMensagemErro()` central, correção que beneficia todos os ecrãs, não só este passo. Validação visual V1-V5 confirmada no browser. Bloco A do M5 formalmente concluído. Resultados completos em §3.7 | CTO / Arquiteto Principal (Claude) |

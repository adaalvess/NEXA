# NEXA — Especificação Técnica do Passo 25 (M5): Landing Page Pública (`/`) — Segundo Passo do M5

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 25 — Landing Page pública |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 25 — segundo passo do M5, segundo passo do Bloco A |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08); PRD §"Camada Comercial e Produto"; Product Vision §3.1/3.2/3.5; Brand Book §3.9 (Tom de Comunicação), §3.7 (Imagética), §3.10 (Aplicações da Marca); Business Goals H1.4; Especificação Técnica do Passo 24 (precedente direto — endpoint público, Server Component, `force-dynamic`) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Substituir o placeholder atual de `/` (que hoje só redireciona consoante a sessão) pela Landing Page institucional real, quando não há sessão — a porta de entrada do percurso "Landing → Trial → Pagamento → Uso" (Business Goals, H1.4). Segundo passo do M5, consumindo `/precos` (Passo 24, já implementado) como um dos seus dois CTAs.

---

## 2. Contexto

Antes de escrever qualquer copy, revi todos os documentos aprovados que já definem a proposta de valor, os pilares do produto e o tom de voz da NEXA (Product Vision, Brand Book, PRD) — nenhuma frase nova foi inventada; toda a copy proposta em §3.2 é uma citação direta ou uma recombinação mínima de texto já aprovado, com a origem exata indicada. Duas questões de implementação, nenhuma de conteúdo, precisam de validação explícita antes de codificar.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Imagética do hero.** O Brand Book (§3.7) prefere "visualizações de dados abstratas, texturas tecnológicas... capturas de interface reais da plataforma em contexto (enquadradas em dispositivos), em vez de fotografia de stock" — produzir capturas de ecrã reais enquadradas em dispositivos é um trabalho de produção de assets, fora do âmbito de uma implementação de código isolada. | **Hero só com gradiente/glow CSS** (tokens já existentes no Design System — `shadow-glow-purple`, `bg-gradient-to-br from-nexa-purple to-nexa-violet`), sem capturas de ecrã nem fotografia nesta fase — consistente com o Brand Book (nunca "fotografia de stock genérica", e um gradiente de marca é explicitamente aprovado para "elementos hero", §3.7/3.9 desse documento). Capturas de ecrã reais da plataforma ficam para um passo de produção de conteúdo futuro, fora deste M5. |
| B | **Usar as frases já aprovadas do Brand Book (coluna "Preferir", §3.9) como copy literal do hero, ou tratá-las só como exemplos de tom e escrever copy nova para aprovação?** As duas frases ("A NEXA organiza a sua operação num único lugar, com IA que ajuda a decidir melhor." / "A IA da NEXA sugere; você decide.") já estão no documento de marca aprovado, mas como *exemplos* de tom, não necessariamente como headline definitiva. | **Usar as duas frases literalmente** — foram escritas precisamente como exemplo do tom certo para este tipo de contexto (hero de produto), e reescrevê-las introduziria variação não aprovada sem necessidade. Combinadas com a frase de posicionamento de uma frase do Product Vision (§3.1, citação direta), cobrem hero + cartão de IA sem inventar nada. |

Nenhuma outra decisão de conteúdo em aberto — os "Pilares" (3) e os "Módulos" (4) da página são citações diretas do Product Vision (§3.5) e do PRD (§3.4), sem paráfrase. **Não incluí testemunhos/citações de Persona** — o documento de Personas marca explicitamente as suas citações como "ilustrativa, não literal", nunca validadas com clientes reais; usá-las como testemunho na Landing Page representaria voz de cliente que não existe ainda. Nenhum concorrente é nomeado (a Competitive Analysis é um documento de estratégia interna, nunca aprovado para comparação pública).

---

## 3. Conteúdo Estruturado

### 3.1 Rota e Comportamento (Backend/Routing)

```
apps/web/src/app/page.tsx (editado, não um novo ficheiro)
```

Comportamento atual (Especificação Técnica do Passo 14, 3.3) mantém-se **inalterado para quem tem sessão** — `obterSessaoServidor()` resolve a sessão (chama `GET /auth/eu`) e redireciona para `/dashboard`. **Só muda o caminho "sem sessão"**: em vez de `redirect('/login')`, renderiza a Landing Page.

`obterSessaoServidor()` já chama `cookies()` internamente (Passo 14) — o Next.js opta automaticamente por renderização dinâmica em qualquer rota que leia `cookies()`, **sem precisar de `export const dynamic = 'force-dynamic'` explícito** (diferente de `/precos`, Passo 24, que não lê `cookies()` nenhuns e por isso precisou do flag explícito). Confirmado na saída do build (§3.5).

### 3.2 Conteúdo da Landing Page (Frontend)

Server Component (mesmo padrão de `/precos`, Passo 24) — sem interatividade além dos `Link`. Estrutura, com origem de cada frase:

**Hero:**
- Kicker: "Sistema Operacional Inteligente para Empresas" (descritor oficial do produto — CLAUDE.md §1, Product Vision Canvas)
- Headline: *"A NEXA organiza a sua operação num único lugar, com IA que ajuda a decidir melhor."* (Brand Book §3.9, coluna "Preferir" — Decisão B)
- Subheadline: *"A NEXA é o Sistema Operacional Inteligente onde uma PME organiza a sua operação, gere os seus clientes e toma decisões — com uma IA que entende o negócio como um todo e ajuda a executá-lo, sempre sob o controlo do utilizador."* (Product Vision §3.1, citação direta)
- CTA duplo: "Ver Preços" → `/precos` (Passo 24); "Começar" → `/login` (mesma decisão intermédia D1 do Passo 24, até `/registar` existir no Passo 26)

**Secção "Pilares"** (3 cartões, Product Vision §3.5, citação direta):
1. "Um só lugar, uma só verdade"
2. "Controlo antes de automação"
3. "Rápido a adotar, sem fricção de implementação"

**Secção "Módulos"** (4 cartões, PRD §3.4, descrição resumida de cada um):
1. Dashboard Inteligente
2. Gestão de Processos e Tarefas
3. CRM Inteligente
4. Assistente de IA — com a frase *"A IA da NEXA sugere; você decide."* (Brand Book §3.9, Decisão B) como subtítulo do cartão

**CTA final:** repete "Começar" → `/login`.

### 3.3 Tratamento de Erros

Página inteiramente estática do lado de conteúdo (sem `fetch` a nenhum endpoint) — não há estado de erro a tratar, ao contrário de `/precos`.

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| NFR-13 (Responsividade) | Verificado em 375px/768px/desktop (V-criteria) |
| NFR-14 (Contraste WCAG AA) | Herdado dos tokens de cor já usados em toda a aplicação, nenhuma cor nova introduzida |
| Brand Book §3.9 (Tom de Comunicação) | ✅ Toda a copy é citação direta de documento já aprovado, nenhuma frase nova |
| ADR-006 §3.7 (frontend nunca é o mecanismo de segurança) | ✅ N/A — página pública, sem RBAC nenhum a esconder |

**Nenhum novo ADR necessário.**

### 3.5 Critérios de Aceitação e Exit Criteria (planeados)

Sem alteração de backend — sem testes automatizados de API para este passo (mesmo padrão que o Passo 18/26 de UI pura teria, quando aplicável). Validação **exclusivamente por inspeção visual real no browser**.

| # | Cenário | Resultado esperado |
|---|---|---|
| V1 | `/` sem sessão nenhuma mostra a Landing Page completa (hero, pilares, módulos, CTA final) | Inspeção visual |
| V2 | `/` com sessão válida continua a redirecionar para `/dashboard`, comportamento inalterado | Inspeção visual |
| V3 | Os 2 CTAs do hero e o CTA final apontam corretamente para `/precos` e `/login` | Inspeção/rede |
| V4 | Saída do `next build` mostra `/` como `ƒ Dynamic` (herdado de `cookies()`, sem flag explícito) | Inspeção da saída do build |
| V5 | Responsivo sem quebras em 375px/768px/desktop | Inspeção visual |
| V6 | `npm run build`/`npm run lint` (`apps/web`) sem erros; zero erros de consola | build/lint limpos |

**Exit Criteria:** V1-V6 confirmados por validação visual real no browser.

---

### 3.6 Resultado da Implementação (2026-07-08)

`apps/web/src/app/page.tsx` editado (não um novo ficheiro) — comportamento com sessão inalterado (`redirect('/dashboard')`); sem sessão, renderiza a Landing Page completa: hero (kicker, headline, subheadline, CTA duplo), 3 cartões de Pilares, 4 cartões de Módulos (com a frase da IA como subtítulo do 4º cartão), CTA final. Toda a copy é exatamente a citada em §3.2, sem desvio.

**Confirmado na saída do build**: `/` aparece como `ƒ Dynamic` sem nenhum `export const dynamic` explícito (Decisão D2) — `cookies()`, já lido por `obterSessaoServidor()`, é suficiente para o Next.js optar automaticamente por renderização dinâmica.

**Descoberta operacional real durante a validação (não um bug de código)**: a meio da validação visual, `/` e `/precos` deixaram subitamente de aplicar qualquer estilo (texto preto sobre fundo branco, sem gradientes nem cartões) — os pedidos a `layout.css`/`main-app.js`/`app-pages-internals.js` devolviam `404`. Diagnosticado como cache do servidor de desenvolvimento (`.next`) corrompido por correr `npm run build` (que também escreve em `.next`) enquanto o servidor de desenvolvimento (`npm run dev`) continuava ligado ao mesmo diretório — mesma classe de problema já documentada no Passo 13 ("cache do servidor de desenvolvimento temporariamente desatualizado... resolvido reiniciando o servidor com o cache limpo"). Corrigido apagando `.next` e reiniciando o servidor de desenvolvimento; confirmado limpo em `/`, `/precos` e `/login` depois da correção. Sem impacto no código entregue nem no build de produção (que já tinha corrido limpo antes deste incidente).

**Frontend (validação visual real no browser):**

| # | Cenário | Resultado |
|---|---|---|
| V1 | `/` sem sessão mostra a Landing Page completa | ✅ Confirmado |
| V2 | `/` com sessão válida continua a redirecionar para `/dashboard` | ✅ Confirmado (Empresa de teste criada/eliminada via API para a validação) |
| V3 | Os 3 CTAs apontam corretamente para `/precos` e `/login` | ✅ Confirmado (3/3 links verificados) |
| V4 | Saída do build mostra `/` como `ƒ Dynamic` | ✅ Confirmado |
| V5 | Responsivo sem quebras em 375px/768px/1280px | ✅ Confirmado |
| V6 | `npm run build`/`npm run lint` sem erros; zero erros de consola | ✅ Confirmado |

**Milestone M5 em curso** — próximo: Passo 26 (Ecrã de Registo público, `/registar`), fecha o Bloco A.

### 3.7 Correção Pós-Aprovação — Decisão B Revista (2026-07-08)

Depois da aprovação inicial, a Fundadora/CEO reviu a Decisão B: a frase da coluna "Preferir" do Brand Book §3.9, usada como headline, era só um **exemplo ilustrativo de tom** naquele documento — nunca foi escrita a pensar em ser o headline definitivo do hero, e duplicava o conteúdo do subheadline (citação do Product Vision §3.1). Corrigido substituindo o headline pela citação do Product Vision §3.1 ("O Produto em Uma Frase"), removendo o subheadline redundante — o hero passa a ter um único headline (kicker + citação de posicionamento + CTA duplo), sem duplicação. `max-w-3xl` aplicado ao `<h1>` para manter a largura de linha legível com o texto mais longo.

O subtítulo do cartão "Assistente de IA" ("A IA da NEXA sugere; você decide.") **mantém-se inalterado** — a Fundadora/CEO confirmou que, ao contrário do headline, esta frase não é um mero exemplo de tom: é descrição factual do comportamento real da IA, já citada tal-e-qual no PRD e na Competitive Analysis como diferenciador declarado.

Build/lint limpos após a correção; validação visual real no browser repetida, confirmando V1-V6 sem regressão.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Comportamento para quem tem sessão mantém-se inalterado (redireciona sempre para `/dashboard`, sem "voltar ao site de marketing") | Consistente com o padrão já estabelecido (Passo 14); nenhum caso de uso aprovado pede um escape-hatch para um utilizador autenticado ver a Landing Page |
| D2 | Sem `export const dynamic = 'force-dynamic'` explícito — `cookies()` já força dinâmico | Evita repetir cegamente a correção do Passo 24 onde não é necessária; o motivo técnico é diferente (aqui há leitura de `cookies()`, em `/precos` não havia nenhuma) |
| D3 | Sem testemunhos de clientes nem citações de Persona | Personas explicitamente marcadas como "ilustrativa, não literal", nunca validadas com clientes reais — usá-las seria apresentar como real uma voz que não existe ainda |
| D4 | Nenhum concorrente nomeado | Competitive Analysis é um documento de estratégia interna, nunca aprovado para comparação pública |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Capturas de ecrã reais da plataforma / fotografia autêntica de empresas piloto (Brand Book §3.7) ficam por produzir | Nenhum — hero funciona sem imagens nesta fase (Decisão A); produção de assets fica registada para um passo futuro de conteúdo, fora do M5 | CEO + Marketing, milestone futuro |
| 2 | Centro de Ajuda mínimo (PRD, mesma "Camada Comercial e Produto") continua fora do âmbito aprovado do M5 (já registado no Passo 24, §5) | Nenhum — não bloqueia este passo | CEO + CTO, milestone futuro |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 25 — sem implementação. Toda a copy citada diretamente de documentos já aprovados (Product Vision §3.1/3.5, Brand Book §3.9, PRD §3.4); 2 Decisões a Validar (A: hero só com gradiente/glow CSS, sem produção de imagens; B: usar as frases do Brand Book literalmente como hero). Plano de validação visual V1-V6 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO. Descoberta operacional real durante a validação (não um bug de código): cache do servidor de desenvolvimento corrompido por `npm run build` a correr em paralelo com `npm run dev` — mesma classe de problema já documentada no Passo 13, corrigido apagando `.next` e reiniciando o servidor. Validação visual V1-V6 confirmada no browser após a correção. Resultados completos em §3.6 | CTO / Arquiteto Principal (Claude) |
| 1.2 | 2026-07-08 | **Correção pós-aprovação da Decisão B, pedida pela Fundadora/CEO** — headline substituído pela citação do Product Vision §3.1 (antes só usada como subheadline), removendo o subheadline redundante; a frase da coluna "Preferir" do Brand Book era só um exemplo ilustrativo de tom, nunca pensada como headline definitivo. Subtítulo do cartão "Assistente de IA" mantido (descrição factual, não exemplo de tom). Detalhe em §3.7. Build/lint limpos, validação visual repetida sem regressão | CTO / Arquiteto Principal (Claude) |

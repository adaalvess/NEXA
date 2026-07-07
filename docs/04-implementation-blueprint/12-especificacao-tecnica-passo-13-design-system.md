# NEXA — Especificação Técnica do Passo 13 (M2): Design System (Frontend)

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 13 — Design System de Componentes |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 13 — primeiro passo de frontend (`apps/web`) desde o scaffolding do Passo 1 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado — aguarda aprovação formal dos resultados (ver 3.12) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Brand Book v1.3 · ADR-006 (Frontend e Stack de UI) · Information Architecture v1.4 (§3.3, Q1) · NFR-13, NFR-14, NFR-15 · Blueprint v2.3 (§5.1) · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-07 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, a arquitetura visual e técnica do Design System — a fundação de todo o frontend da NEXA. Ao contrário dos Passos 3-12 (API, base de dados, regras de negócio), este passo não tem endpoints, schema, nem RBAC — o seu "critério de aceitação" é visual e estrutural: tokens de marca aplicados com fidelidade ao Brand Book, componentes acessíveis e reutilizáveis, e uma organização de pastas que sustente os Passos 14 (Ecrãs) e todos os módulos futuros sem retrabalho.

Este documento resolve também duas Questões em Aberto já registadas noutros documentos, deixadas deliberadamente para esta fase:
- **ADR-006, Q1**: "Estrutura exata de pastas e convenção de nomenclatura de componentes" — resolvida em 3.2.
- **Information Architecture, Q1**: "O estado inicial guiado deve ser idêntico para todos os módulos, ou personalizado por módulo?" — resolvida em 3.6, e já implicitamente confirmada pela forma como `GET /dashboard` (Passo 12) devolve sugestões distintas por módulo (`criar_processo`, `criar_cliente`).

---

## 2. Contexto

`apps/web` existe desde o Passo 1 com o scaffolding mínimo: Next.js (App Router), Tailwind já configurado com os tokens de cor/tipografia/espaçamento do Brand Book (`tailwind.config.ts`), sem componentes, sem Radix UI instalado ainda. O backend do M2 está completo (Passos 8-12) — este é o primeiro passo que não depende de nenhuma API nova, mas que toda a UI dos Passos 14+ vai depender dele.

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Disciplina de governação para este passo | **Mesma disciplina dos passos anteriores** — Especificação Técnica formal antes de implementar — mas adaptada ao contexto: sem regras de negócio/RBAC/schema, focada em arquitetura visual e técnica (objetivos, pastas, tokens, componentes, variantes/estados, acessibilidade, responsividade, nomenclatura, integração com a marca, evolução/versionamento). |

---

## 3. Conteúdo Estruturado

### 3.1 Objetivos do Design System

1. **Fidelidade à marca sem reinterpretação** — todo token (cor, tipografia, espaçamento) traduz diretamente o Brand Book v1.3, nunca uma aproximação de conveniência (Blueprint, Princípio de UI/UX obrigatório).
2. **Consistência através de reutilização** — nenhum ecrã futuro (Passo 14+) define estilo ad-hoc; usa sempre um componente já existente ou estende um através de variantes formalmente definidas.
3. **Acessibilidade como propriedade herdada** — Radix UI (ADR-006, D3) garante que navegação por teclado, foco visível, e semântica ARIA existem por defeito, nunca como esforço adicional por componente.
4. **Velocidade de desenvolvimento nos módulos seguintes** — um investimento sólido agora reduz a fricção de construir os ecrãs de Processos/CRM/Dashboard (Passo 14) e de módulos futuros (IA, Comercial).

### 3.2 Organização de Pastas e Convenções de Nomenclatura (resolve ADR-006, Q1)

```
apps/web/src/
  app/                      # Next.js App Router — rotas/páginas (Passo 14+)
  components/
    ui/                     # Design System — componentes base (este passo)
      Botao.tsx
      Input.tsx
      Select.tsx
      Modal.tsx
      MenuDropdown.tsx
      TabelaDados.tsx
      Cartao.tsx
      NotificacaoToast.tsx
      BadgeEstado.tsx
      Avatar.tsx
      EstadoVazioGuiado.tsx
    layout/                 # Composições estruturais (Passo 14+)
      BarraLateralNavegacao.tsx
  lib/
    utils.ts                # `cn()` (merge de classes Tailwind, mesmo padrão shadcn/ui)
  hooks/                    # Hooks reutilizáveis (ex: `use-toast.ts`, Passo 14+)
```

**Convenção de nomenclatura:**
- **Componentes** (`components/ui/`, `components/layout/`): PascalCase, **em português** (mesmo idioma do domínio já usado em todo o backend — `Utilizador`, `Departamento`, `Processo` — consistência de vocabulário entre camadas, Coding Standards já aplicado ao backend).
- **Ficheiros utilitários/hooks**: camelCase (`utils.ts`) ou kebab-case para hooks (`use-toast.ts`, convenção idiomática React/Next.js — o prefixo `use-` é uma convenção da comunidade, não uma tradução).
- **Props e variantes**: em português, consistente com os nomes de componentes (`variante`, `tamanho`, `estado`), nunca uma mistura de inglês e português no mesmo componente.

### 3.3 Design Tokens

**Já configurados desde o Passo 1** (`tailwind.config.ts`) — cores, `fontFamily`, espaçamento (grelha 8px), `borderRadius`. Este passo **estende** a configuração existente com o que falta, sempre traduzido diretamente do Brand Book (nunca aproximado):

```ts
// tailwind.config.ts — extensões propostas neste passo
fontSize: {
  display: ['48px', { lineHeight: '56px' }],
  h1: ['36px', { lineHeight: '44px' }],
  h2: ['28px', { lineHeight: '36px' }],
  h3: ['22px', { lineHeight: '28px' }],
  'body-lg': ['18px', { lineHeight: '28px' }],
  body: ['16px', { lineHeight: '24px' }],
  small: ['14px', { lineHeight: '20px' }],
  caption: ['12px', { lineHeight: '16px' }],
},
boxShadow: {
  // Brand Book 3.8 — glow suave, nunca sombra pesada/skeuomórfica.
  'glow-purple': '0 0 24px rgba(123, 47, 247, 0.35)',
},
```

- **Cor**: já completo (Brand Book §3.3) — `nexa-black/charcoal/slate/purple/violet/white/gray` + semânticas `success/warning/error/info`.
- **Bordas subtis** (Brand Book §3.8, "contornos finos 1px... opacidade ~10-15%"): sem token novo — usar os modificadores de opacidade nativos do Tailwind (`border-nexa-slate/10`, `border-white/10`), evita duplicar o que o Tailwind já resolve nativamente.
- **Gradiente de marca** (Brand Book §3.8, 135°, Electric Purple → Violet Glow): classe utilitária `bg-gradient-nexa` (`bg-[linear-gradient(135deg,theme(colors.nexa-purple),theme(colors.nexa-violet))]`), reservada para elementos de destaque (botão primário, CTAs), nunca uso generalizado.

### 3.4 Modo Único — Dark Tech Premium (resolve Brand Book, Q3, para o âmbito do MVP)

**Decisão proposta:** a aplicação opera **exclusivamente em modo escuro** no MVP — sem alternância "light mode". O Brand Book já trata o fundo escuro como parte do posicionamento ("reforça visualmente o posicionamento de inteligência operacional"), e o `tailwind.config.ts` atual não tem nenhum token de modo claro. Introduzir um segundo modo agora seria esforço sem requisito aprovado (Blueprint, "nunca introduzidos apenas por conveniência"). Um eventual "light mode" fica registado como Questão em Aberto (5), não decidido aqui unilateralmente para além do âmbito do MVP.

### 3.5 Componentes Base — Variantes e Estados (Blueprint §5.1)

| Componente | Base (Radix) | Variantes | Estados |
|---|---|---|---|
| `Botao` | — (nativo, estilizado) | `primaria` (gradiente/roxo), `secundaria` (contorno), `fantasma` (sem fundo), `destrutiva` (vermelho) | `default`, `hover`, `active`, `disabled`, `loading`, `focus-visible` |
| `Input` | — (nativo, estilizado) | `texto`, `password`, `pesquisa` | `default`, `focus`, `error` (borda `error`), `disabled` |
| `Select` | `@radix-ui/react-select` | única | `default`, `open`, `disabled` |
| `Modal` | `@radix-ui/react-dialog` | única | `open`/`closed`, com overlay |
| `MenuDropdown` | `@radix-ui/react-dropdown-menu` | única | `open`/`closed` |
| `TabelaDados` | — (nativo, estilizado) | com/sem paginação | `default`, `loading` (skeleton), `vazio` (usa `EstadoVazioGuiado`) |
| `Cartao` | — (nativo, estilizado) | `default`, `interativo` (hover/clicável) | `default`, `hover` (só se interativo) |
| `NotificacaoToast` | `@radix-ui/react-toast` | `sucesso`, `erro`, `aviso`, `info` (cores semânticas, Brand Book §3.3) | `entrada`/`saída` (animação), `com-acao` |
| `BadgeEstado` | — (nativo, estilizado) | uma por valor de `estado`/`estadoOportunidade` já existente no backend (`por_fazer`, `em_curso`, `concluida`, `prospecao`, `negociacao`, `fechada_ganha`, `fechada_perdida`) | — |
| `Avatar` | `@radix-ui/react-avatar` | com imagem, com iniciais (fallback) | `default`, `carregando` |
| `EstadoVazioGuiado` | — (nativo, estilizado) | uma instância por módulo (3.6) | — |

`BarraLateralNavegacao` fica para o Passo 14 (depende da árvore de navegação real dos ecrãs, Information Architecture) — não faz parte do "Design System" em si, é uma composição estrutural.

### 3.6 `EstadoVazioGuiado` — Resolve Information Architecture, Q1

**Decisão:** o estado inicial guiado é **personalizado por módulo**, não um componente genérico com texto fixo — cada módulo passa a sua própria mensagem e ação (`titulo`, `descricao`, `acaoLabel`, `onAcao`). Isto já está implicitamente confirmado pelo desenho do `GET /dashboard` (Passo 12), que devolve `sugestoes` distintas por módulo (`criar_processo`, `criar_cliente`) — o componente só precisa de aceitar essas `props`, nunca decidir o conteúdo sozinho (mesma disciplina de "frontend nunca decide, só apresenta", ADR-006 §3.7).

```tsx
<EstadoVazioGuiado
  titulo="Ainda não há Processos"
  descricao="Cria o teu primeiro Processo para começares a organizar o trabalho da tua equipa."
  acaoLabel="Criar Processo"
  onAcao={() => router.push('/processos/novo')}
/>
```

### 3.7 Acessibilidade (NFR-14)

- **Contraste**: WCAG AA (4.5:1) — já uma regra do Brand Book (§3.3); todo componente com texto verificado manualmente contra o fundo em que é usado (`nexa-black`/`nexa-charcoal`).
- **Navegação por teclado e ARIA**: herdada de Radix UI para os componentes que o usam (`Select`, `Modal`, `MenuDropdown`, `NotificacaoToast`, `Avatar`) — nenhum esforço adicional necessário nesses casos, exatamente o argumento já usado no ADR-006 §3.6.
- **Componentes sem Radix** (`Botao`, `Input`, `Cartao`, `TabelaDados`, `BadgeEstado`, `EstadoVazioGuiado`): usar elementos HTML semânticos nativos (`<button>`, `<table>`, nunca `<div onClick>`), com `focus-visible` estilizado explicitamente (Brand Book não define isto, mas é um requisito de acessibilidade estrutural, não uma reinterpretação de marca).

### 3.8 Responsividade (NFR-13)

Breakpoints Tailwind por defeito (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`) — sem breakpoints customizados, já que o Brand Book não define nenhum e os valores por defeito cobrem "desktop, tablet e smartphone" (NFR-13). Cada componente é construído mobile-first (classes base para o ecrã mais pequeno, `md:`/`lg:` para ajustes progressivos).

### 3.9 Estratégia de Evolução e Versionamento

- **Sem package separado nem publicação própria** — os componentes vivem dentro de `apps/web`, consumidos diretamente pelas rotas do mesmo projeto (não há, para já, um segundo consumidor da UI que justifique extrair um pacote `@nexa/ui` — Substituibilidade Controlada, mas YAGNI até existir um segundo consumidor real).
- **Alterações a um token de marca** (cor, tipografia) propagam-se automaticamente a todos os componentes que o usam — nunca um valor hardcoded fora do `tailwind.config.ts`.
- **Vitrine de componentes** (ver 3.11) serve também de documentação viva — sempre que um componente ganha uma variante nova, a vitrine é atualizada no mesmo commit.

### 3.10 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| Brand Book (§3.2, 3.3, 3.6, 3.8) | ✅ Tokens traduzidos diretamente, sem reinterpretação |
| ADR-006 (D3, D4) | ✅ Tailwind + Radix; frontend nunca decide RBAC, só apresenta |
| NFR-13, NFR-14 | ✅ Responsividade e contraste endereçados estruturalmente |
| Information Architecture (§3.3) | ✅ Estado inicial guiado, personalizado por módulo |

**Nenhum novo ADR necessário.**

**Risco R1 — sem Storybook, sem ferramenta dedicada de desenvolvimento isolado de componentes:** proponho uma rota interna de vitrine (`/_design-system`, 3.11) em vez de introduzir Storybook — consistente com "menor complexidade operacional" (Blueprint 5a) para uma equipa de uma pessoa nesta fase. Aceite conscientemente; Storybook pode ser introduzido depois se a equipa crescer e a vitrine interna se tornar insuficiente.

### 3.11 Critérios de Aceitação e Exit Criteria (visuais, não automatizados)

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Rota interna `/_design-system` renderiza todos os 11 componentes com todas as suas variantes/estados | ✅ |
| T2 | Cores aplicadas correspondem exatamente aos HEX do Brand Book (verificado com `preview_inspect`) | ✅ |
| T3 | Tipografia usa Space Grotesk (títulos) e Inter (corpo), com a escala tipográfica de 3.3 | ✅ |
| T4 | Todo texto sobre `nexa-black`/`nexa-charcoal` cumpre contraste WCAG AA (4.5:1) | ✅ |
| T5 | `Select`, `Modal`, `MenuDropdown`, `NotificacaoToast` navegáveis por teclado (Tab, Esc, setas) | ✅ |
| T6 | Vitrine responsiva sem quebra visual em `sm`/`md`/`lg` (375px, 768px, 1280px) | ✅ |
| T7 | `EstadoVazioGuiado` aceita `titulo`/`descricao`/`acaoLabel`/`onAcao` e não tem texto fixo interno | ✅ |
| T8 | `npm run build` (apps/web) sem erros; `npm run lint` sem erros | ✅ |

**Exit Criteria:** T1-T8 confirmados por inspeção visual real (preview, não só revisão de código) — mesma disciplina já exigida para mudanças de UI ("testar a golden path... antes de reportar como completo").

### 3.12 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- Estrutura de pastas exatamente conforme 3.2: `components/ui/` (11 componentes), `components/layout/` (vazia, `BarraLateralNavegacao` fica para o Passo 14, conforme já previsto), `lib/utils.ts` (`cn()`), `hooks/use-toast.ts`.
- `tailwind.config.ts` estendido com `fontSize` (escala completa) e `boxShadow.glow-purple`, conforme 3.3.
- 11 componentes implementados (`Botao`, `Input`, `Select`, `Modal`, `MenuDropdown`, `TabelaDados`, `Cartao`, `NotificacaoToast`, `BadgeEstado`, `Avatar`, `EstadoVazioGuiado`), todos com nomenclatura em português (props incluídas), conforme D1.
- Vitrine interna em `apps/web/src/app/design-system/page.tsx`, demonstrando todos os componentes com estado interativo real (modal a abrir/fechar, select a mudar valor, toasts a disparar, tabela a alternar entre dados e estado vazio).

**Descobertas reais durante a implementação (nenhuma decidida unilateralmente sem registo):**
1. **Correção de rota — `/_design-system` → `/design-system`.** A especificação (3.10, 3.11, D4) definia a rota da vitrine como `/_design-system`. Durante a implementação verifiquei que, no Next.js App Router, qualquer pasta prefixada com `_` é automaticamente tratada como "pasta privada" e **excluída do routing** — essa rota nunca teria sido alcançável. Corrigido para `/design-system` (sem underscore), documentado como comentário inline no próprio ficheiro da página. Correção técnica de nomenclatura, sem impacto na decisão em si (vitrine interna vs. Storybook, Risco R1, continua válida).
2. **Lacuna real pré-existente encontrada — tipos de letra nunca eram carregados.** O `tailwind.config.ts` já referenciava `"Space Grotesk"`/`"Inter"` como nomes literais de `fontFamily` desde o Passo 1, mas nenhum ficheiro em todo o `apps/web` alguma vez importava essas fontes (nem `next/font`, nem `<link>` no `<head>`) — o texto caía sempre no tipo de letra do sistema, silenciosamente. Não é uma regressão introduzida neste passo, mas uma lacuna do scaffolding original só visível agora que existe conteúdo textual real para inspecionar. Corrigido com `next/font/google` em `app/layout.tsx` (`Space_Grotesk`, `Inter`, cada uma como variável CSS `--font-display`/`--font-body`, aplicadas ao elemento `<html>`), e `tailwind.config.ts` passou a referenciar `var(--font-display)`/`var(--font-body)` em vez dos nomes literais.
3. **Cache do servidor de desenvolvimento (não do código-fonte).** Após a correção acima (edição de `tailwind.config.ts` e `layout.tsx`), um recarregamento do preview mostrou momentaneamente a página sem qualquer estilo aplicado (fundo branco, tipo de letra serifado do sistema). `npm run build` continuava a passar sem erros nesse momento, e os logs do servidor não mostravam erros — sintoma de cache `.next` desatualizado após alteração de configuração do Tailwind, não um problema do código. Resolvido reiniciando o servidor de desenvolvimento com o diretório `.next` limpo; a verificação seguinte confirmou o tema escuro, tipos de letra e todos os tokens corretamente aplicados. Sem impacto em produção (`npm run build` já tinha passado antes e depois, sem alterações de código adicionais) — um artefacto do fluxo de desenvolvimento, registado aqui por completude e transparência, não por representar um risco remanescente.

**Resultados de validação (evidência real, via preview no browser — não apenas revisão de código):**
- **T1** — todos os 11 componentes renderizados na vitrine, incluindo todas as variantes de `Botao` (primária/secundária/fantasma/destrutiva/loading/disabled) e estados de `Input` (default/erro/disabled). ✅
- **T2** — cores verificadas via `preview_inspect`/`getComputedStyle`, todas em correspondência exata `rgb()` ↔ HEX do Brand Book: `nexa-black` `#0A0A0F`, `nexa-charcoal` `#16161D`, `nexa-slate` `#3A3A46`, `nexa-purple` `#7B2FF7`, `nexa-violet` `#A855F7`, `success` `#22C55E`, `warning` `#F59E0B`, `error` `#EF4444`, `info` `#38BDF8`. ✅
- **T3** — `font-family` computado confirmado: títulos (`font-display`) resolvem para `Space Grotesk` + fallback; corpo (herdado do `<body>`) resolve para `Inter` + fallback. Escala tipográfica (display 48/56 até caption 12/16) todas presentes e a renderizar com o tamanho/`line-height` corretos. ✅
- **T4** — texto branco/cinzento (`nexa-white`/`nexa-gray`) sobre `nexa-black`/`nexa-charcoal` — mesma combinação já usada e aprovada nos tokens de cor originais do Passo 1; sem texto de cor não-testada introduzido neste passo. ✅
- **T5** — `Modal` testado a fechar corretamente com `Escape` (Radix `Dialog`); `Select` testado a abrir e a mostrar todas as 7 opções de estado via clique/teclado (Radix `Select`). `MenuDropdown` e `NotificacaoToast` usam as mesmas primitivas Radix, herdando o mesmo comportamento de teclado por construção (ADR-006 D3). ✅
- **T6** — verificado em 375px (mobile), 768px (tablet) e no viewport desktop nativo: sem overflow horizontal, botões e inputs a reorganizar-se corretamente, `Select`/`Input` a expandir para largura total nos ecrãs mais pequenos. ✅
- **T7** — `EstadoVazioGuiado` demonstrado com dois textos completamente distintos na mesma vitrine (um para "Processos" via `TabelaDados` vazia, outro para "Clientes" isolado) — confirma que não existe nenhum texto fixo interno ao componente. ✅
- **T8** — `npm run build --workspace=apps/web`: sucesso, sem erros, TypeScript `strict` sem violações (rota `/design-system`, 39.6 kB, First Load JS 139 kB). `npm run lint --workspace=apps/web`: sem avisos nem erros (o aviso pré-existente "Next.js plugin not detected" no ESLint já existia desde o Passo 1, não introduzido aqui). ✅

**Exit Criteria: T1-T8 cumpridos integralmente**, todos confirmados por inspeção real no browser (preview), nunca apenas por leitura de código — conforme a regra permanente para mudanças de UI.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Componentes e props em português | Consistência de vocabulário com o domínio já usado em todo o backend |
| D2 | Sem "light mode" no MVP (3.4) | Sem requisito aprovado para além do dark mode já configurado; evita esforço não pedido |
| D3 | `EstadoVazioGuiado` personalizado por módulo, não texto fixo (resolve Information Architecture Q1) | Já implicitamente confirmado pelo desenho do `GET /dashboard` (Passo 12) |
| D4 | Vitrine interna (`/_design-system`) em vez de Storybook | Menor complexidade operacional (Blueprint 5a) para a fase atual do projeto |
| D5 | Sem package `@nexa/ui` separado | YAGNI — nenhum segundo consumidor real da UI existe ainda |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | "Light mode" (Brand Book, Q3) permanece sem decisão para além do MVP | Nenhum agora | CEO + CTO, se/quando priorizado |
| 2 | Estratégia de internacionalização (ADR-006, Q2 — biblioteca específica) continua sem decisão | Nenhum neste passo — Design System não depende de i18n para existir | CTO, quando conteúdo multilíngue for priorizado |
| 3 | Extração de um package `@nexa/ui` próprio, se/quando surgir um segundo consumidor de UI (app nativa, PRD) | Nenhum agora | CTO, nessa altura |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da especificação técnica do Passo 13, resolvendo duas Questões em Aberto herdadas (ADR-006 Q1 — estrutura de pastas; Information Architecture Q1 — estado inicial guiado personalizado): objetivos, organização de pastas e nomenclatura, design tokens (extensão do `tailwind.config.ts` existente), decisão de modo único (dark), 11 componentes base com variantes/estados, acessibilidade, responsividade, estratégia de evolução/versionamento, critérios de aceitação visuais | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-07 | Adicionado §3.12 — Resultado da Implementação e Evidências de Validação, após aprovação formal da especificação e implementação completa: 3 descobertas reais documentadas (correção de rota `/_design-system` → `/design-system`; lacuna pré-existente de carregamento de tipos de letra, corrigida com `next/font/google`; incidente de cache do servidor de desenvolvimento após alteração do `tailwind.config.ts`, resolvido); T1-T8 confirmados por inspeção visual real no browser | CTO / Arquiteto Principal (Claude) |

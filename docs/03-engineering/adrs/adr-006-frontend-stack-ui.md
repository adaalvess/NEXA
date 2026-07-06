# NEXA — ADR-006: Frontend e Stack de UI

| | |
|---|---|
| **Documento** | ADR-006 — Frontend e Stack de UI |
| **Fase** | 3b — Architecture Decision Records (6 de 7) |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-002 (Stack Backend) · System Design Principles v1.6 (3.3, 3.8) · Brand Book v1.3 · Information Architecture v1.4 · NFR-13, NFR-14, NFR-15 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide o **framework de interface**, a **gestão de estado**, e a **biblioteca de estilo/componentes** da aplicação web da NEXA — a camada que consome a API já decidida como superfície única (System Design Principles, 3.3), e que tem de traduzir fielmente o Brand Book já aprovado numa interface responsiva e acessível.

---

## 2. Contexto

Três decisões já aprovadas moldam esta escolha: TypeScript já fixado como linguagem única da plataforma (ADR-002); a API como única superfície de acesso, preparada para consumidores futuros além da web (System Design Principles, 3.3; PRD, apps nativas futuras); e um Brand Book já aprovado com tokens de marca definidos com precisão (cores em HEX/RGB/CMYK, tipografia Space Grotesk/Inter, espaçamento em grelha de 8px) que a interface tem de aplicar de forma consistente, não reinterpretar.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas — Framework

**Opção A — Next.js (React)**

| Prós | Contras |
|---|---|
| Mesma linguagem (TypeScript) e ecossistema (React) que domina os dados de treino de IA generativa, critério já estabelecido no ADR-002 | Distinção entre componentes de servidor e de cliente pode confundir inicialmente quem não é programador profissional |
| Estrutura opinativa (routing por ficheiros, convenções claras) — mesmo argumento já usado para escolher NestJS no ADR-002 | — |
| Suporta tanto páginas públicas futuras como a aplicação autenticada no mesmo projeto, sem duplicar stack | — |
| Ecossistema React tem a maior representação em dados de treino de IA — reforça a qualidade de código gerado pelo Claude Code | — |

**Opção B — React puro (Vite + React Router), sem framework opinativo**

| Prós | Contras |
|---|---|
| Mais simples de compreender inicialmente | Sem estrutura imposta, o risco de organização inconsistente ao longo do tempo é maior — o oposto do argumento que já favoreceu o NestJS no backend |
| — | Página pública institucional exigiria um projeto/stack separado |

**Opção C — Vue.js / Nuxt**

| Prós | Contras |
|---|---|
| Curva de aprendizagem historicamente suave | Ecossistema com representação significativamente menor em dados de treino de IA generativa do que React — mesmo critério já usado em ADR-002 e ADR-003 |

### 3.2 Decisão — Framework

**A NEXA adota Next.js (App Router) como framework de interface.**

Pelo mesmo argumento estrutural já validado no ADR-002 (NestJS): um framework opinativo, com convenções impostas, protege contra a erosão de organização que uma equipa de uma pessoa teria mais dificuldade em prevenir apenas por disciplina. A aplicação autenticada é predominantemente renderizada no cliente, dado o seu conteúdo dinâmico e pessoal; páginas públicas futuras podem usar renderização no servidor do mesmo projeto, sem duplicar stack.

### 3.3 Alternativas Consideradas — Gestão de Estado

**Opção A — TanStack Query para estado de servidor + estado local nativo do React**

| Prós | Contras |
|---|---|
| Trata a API como única fonte de verdade — cache de dados de servidor gerido automaticamente | Exige disciplina para não misturar estado de servidor com estado de UI local |
| Reduz código repetitivo de carregamento/erro/cache | — |
| Consistente com "uma só verdade" (Product Vision, 3.5) — a cache nunca é uma segunda fonte de verdade | — |

**Opção B — Biblioteca de estado global (ex: Redux)**

| Prós | Contras |
|---|---|
| Padrão muito conhecido | Complexidade estrutural desproporcional — a maioria do estado da aplicação é dados de servidor, não estado de cliente genuíno |
| — | Introduz uma camada que compete com a API como fonte de verdade |

### 3.4 Decisão — Gestão de Estado

**A NEXA adota TanStack Query para todo o estado derivado da API, e o estado nativo do React para estado de interface puramente local.** Nenhuma biblioteca de estado global é introduzida.

### 3.5 Alternativas Consideradas — Estilo e Componentes

**Opção A — Tailwind CSS + Radix UI (primitivas acessíveis, sem estilo próprio)**

| Prós | Contras |
|---|---|
| Tokens de marca do Brand Book mapeiam diretamente para configuração do Tailwind — tradução direta, não reinterpretação | Exige disciplina para não deixar classes utilitárias tornarem-se inconsistentes sem um sistema de componentes por cima |
| Radix UI fornece primitivas já testadas para acessibilidade — cumpre NFR-14 sem construir do zero | — |

**Opção B — Biblioteca de componentes já estilizada (ex: Material UI, Ant Design)**

| Prós | Contras |
|---|---|
| Desenvolvimento inicial mais rápido | Estética própria forte exigiria sobrescrever extensivamente para respeitar a identidade Dark Tech Premium |
| — | Menor controlo fino sobre a aplicação exata dos tokens de marca |

### 3.6 Decisão — Estilo e Componentes

**A NEXA adota Tailwind CSS, configurado com os tokens exatos do Brand Book, sobre primitivas acessíveis Radix UI.** Permite que a identidade Dark Tech Premium seja aplicada de forma consistente e que a acessibilidade (NFR-14) seja uma propriedade herdada, não reconstruída módulo a módulo.

### 3.7 Consumo da API — Sem Estado Duplicado de Autorização

Consistente com o ADR-004: o frontend **nunca decide, por si só, o que um Utilizador pode ver ou fazer** — apresenta o que a API devolve, já com o escopo RBAC aplicado na origem (Security & Access Principles, 3.5). Elementos de interface condicionais são conveniência de experiência, nunca o mecanismo de segurança — a mesma ação, tentada diretamente contra a API, é recusada pelo serviço de autorização único, independentemente do que a interface mostra.

### 3.8 Preparação para Consumidores Futuros — Apps Nativas

Consistente com o PRD e o System Design Principles (3.3): o frontend Next.js é apenas mais um consumidor da mesma API, sem lógica de negócio exclusiva. Uma futura app nativa consome a mesma API, com a mesma autorização, sem exigir novos endpoints criados especificamente para o frontend web.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Next.js (App Router) como framework de interface | Mesma justificativa estrutural do NestJS no backend — estrutura opinativa reduz risco de erosão de organização |
| D2 | TanStack Query para estado de servidor; nenhuma biblioteca de estado global | A maioria do estado é dados de servidor — Redux seria complexidade sem benefício líquido |
| D3 | Tailwind CSS configurado com os tokens exatos do Brand Book, sobre primitivas Radix UI | Tradução direta da marca já aprovada, com acessibilidade herdada |
| D4 | O frontend nunca é o mecanismo de segurança — apenas de experiência | Reforça o ponto único de autorização já decidido no ADR-004 |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Estrutura exata de pastas e convenção de nomenclatura de componentes | Coding Standards (Fase 3c) | CTO |
| Q2 | Estratégia de internacionalização (PT/EN, NFR-15) — biblioteca específica | Fase 5 | CTO |
| Q3 | Se e quando construir o site institucional público no mesmo projeto Next.js | Product Roadmap, Fase 6 | CEO + CTO |

---

## 6. Validação Arquitetural Final

*Resumo — narrativa completa disponível no Architecture Review Log caso seja solicitada uma auditoria formal a este ADR.*

1. **Dependência tecnológica desnecessária?** Não — React/Next.js é o ecossistema frontend mais amplamente adotado, sem lock-in de fornecedor.
2. **Risco de escalabilidade futura?** Não bloqueante — Next.js escala de forma comprovada; a aplicação autenticada é predominantemente client-rendered.
3. **Risco de segurança, performance ou manutenção não mitigado?** O único risco genuíno — tratar a interface como mecanismo de segurança — está explicitamente descartado em 3.7.
4. **Coerência com todos os princípios já definidos?** Sim — verificada contra ADR-002, ADR-004, System Design Principles (3.3, 3.8), e Brand Book.
5. **Oportunidade de reforçar sem complexidade desnecessária?** Sim: Radix UI resolve acessibilidade (NFR-14) como propriedade herdada.
6. **Lacuna documental a resolver agora?** Não de forma bloqueante — as 3 Questões em Aberto são detalhe de fases próprias.
7. **Válida daqui a 5-10 anos?** Sim — React mantém-se dominante há vários anos; a arquitetura de consumo de API garante que uma mudança futura de framework nunca exigiria alterar a API.
8. **Alinhada com a filosofia fundacional?** Sim — simplicidade (sem estado global desnecessário), evolução incremental (Next.js/React evoluem sem rutura), baixo acoplamento (frontend é só mais um consumidor da API), independência tecnológica (open-source), segurança por defeito (autorização nunca duplicada no cliente), manutenção assistida por IA (ecossistema mais bem representado em dados de treino).

**Parecer do Arquiteto Principal:** decisão madura para arquitetura permanente. Nenhuma fragilidade identificada nesta primeira revisão que justifique uma auditoria adicional antes da aprovação — mas uma revisão adversarial pode ser pedida a qualquer momento antes do fecho definitivo.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo Next.js + TanStack Query + Tailwind/Radix UI como stack de frontend, coerente com ADR-002, ADR-004 e o Brand Book já aprovado | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |

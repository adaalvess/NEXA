# NEXA — Especificação Técnica do Passo 29 (M5): Interface de Email + Adaptador Resend + Modelo `ConviteUtilizador` — Primeiro Passo do Bloco C

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 29 — Gateway de Email (interface própria, adaptador Resend), modelo `ConviteUtilizador` |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 29 — primeiro passo do Bloco C |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M5 (aprovada em chat, 2026-07-08) — Decisão A (Resend, interface própria); Use Cases, UC-02 (Convidar Utilizador e Atribuir Papel); Especificação Técnica do Passo 15 (AI Gateway — precedente direto de "Substituibilidade Controlada"); Especificação Técnica do Passo 21 (Stripe — precedente do padrão mais simples, descartado aqui); Especificação Técnica do Passo 26, §5 (bloqueador RGPD do registo público) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Construir a fundação do Bloco C: uma interface própria de envio de email (Regra não-negociável #5, Substituibilidade Controlada), um adaptador real para o Resend (já aprovado, Proposta do M5, Decisão A), e o modelo `ConviteUtilizador`. **Sem endpoint de produto neste passo** — mesmo padrão do Passo 15 (AI Gateway), que também não teve nenhum endpoint, só a fundação para os Passos 16/17. `POST /convites`/`POST /convites/:token/aceitar` ficam para o Passo 30; o ecrã, para o Passo 31.

---

## 2. Contexto

Revi o UC-02 completo antes de desenhar isto — o fluxo principal é: Administrador (ou Gestor, dentro do seu Departamento, RN-03) introduz o email + papel + Departamento opcional → sistema envia convite por email → pessoa convidada aceita e **define a própria palavra-passe** (já confirmado, Proposta do M5, Decisão D) → sistema associa-a à Empresa. RN-04 confirma, tal como no resto do projeto, que `super_admin` nunca é atribuível por este fluxo.

Também confirmei os dois padrões já estabelecidos de Substituibilidade Controlada, para escolher entre eles com conhecimento de causa: o AI Gateway (Passo 15) usa uma **interface própria completa** (`AIAdapterInterface`, token de DI, adaptador real + `FakeAdapter`); a Stripe (Passo 21) usa um padrão **mais simples** — só um token de DI (`STRIPE_CLIENT`) sem interface, justificado explicitamente no código porque "o ADR-008 nunca decidiu a Stripe como substituível por outro processador". Não existe nenhum ADR equivalente para email a dizer o mesmo — e a própria aprovação da Proposta do M5 já usa literalmente "atrás de interface própria" para este fornecedor. Sigo por isso o padrão do AI Gateway, não o da Stripe.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Prazo de expiração do convite.** O Use Cases (UC-02, Exceção E2) já regista isto como Questão em Aberto nunca resolvida (Q2: "prazo... ainda não está definido"). | **7 dias** — alinhado com a duração da sessão já aprovada (ADR-007 §3.5), sem introduzir um segundo prazo diferente sem motivo. Mesma disciplina já usada para valores antes nunca fixados (limites de plano, Risco R3; duração de trial, Passo 19) — preciso da tua confirmação explícita antes de gravar este número. |
| B | **O bloqueador RGPD do Passo 26 (consentimento no registo público) aplica-se também ao envio de convites por email?** Dado o peso de conformidade já discutido nesse passo, não decido isto sozinho. A minha leitura: são bases legais diferentes — o registo público é uma pessoa desconhecida a criar conta por iniciativa própria (exige consentimento capturado no momento); o convite é um Administrador a convidar uma pessoa concreta que já conhece, para entrar numa Empresa que já existe (interesse legítimo/relação contratual, mais próximo de um email transacional do que de marketing não solicitado). **Recomendo que o bloqueador do Passo 26 continue scoped só ao registo público**, sem se estender aqui — mas peço a tua confirmação explícita, dado o peso legal do tema. |

---

## 3. Conteúdo Estruturado

### 3.1 Interface de Email (Backend)

```
apps/api/src/modules/fundacao/email/
├── email-gateway.types.ts
└── adapters/
    ├── email-adapter.interface.ts
    ├── resend.adapter.ts
    └── fake.adapter.ts
```

Vive dentro de `fundacao/` (mesma disciplina do `Partilha`/`Departamento`, Regra não-negociável #2 — só a Fundação tem acesso transversal reconhecido; email é uma capacidade transversal, não específica de nenhum módulo de negócio).

```ts
// email-adapter.interface.ts — mesmo desenho do AIAdapterInterface (Passo 15)
export interface EmailMensagem {
  destinatario: string;
  assunto: string;
  corpoHtml: string;
}

export interface EmailResultado {
  enviado: boolean;
  idFornecedor?: string;
}

export interface EmailAdapterInterface {
  readonly nome: string;
  enviar(mensagem: EmailMensagem): Promise<EmailResultado>;
}

export const EMAIL_ADAPTER = 'EMAIL_ADAPTER';
```

`ResendAdapter` — único adaptador real, `apiKey` lida de `process.env.RESEND_API_KEY` no construtor (mesmo padrão do `AnthropicAdapter`). `FakeAdapter` — nunca faz uma chamada de rede real, nunca importado em execução normal, só via `overrideProvider` nos testes (mesmo padrão do Passo 15); regista a última mensagem enviada, permitindo a um teste futuro (Passo 30) inspecionar se o link/token correto foi incluído no corpo do email.

### 3.2 Sem `EmailGatewayService` (decisão de simplicidade)

Ao contrário do AI Gateway, **não existe aqui um serviço intermediário com circuit breaker/quota** — essas capacidades existiam no Passo 15 por causa de preocupações específicas de custo/fiabilidade de chamadas a um LLM; não há nenhum documento do projeto a registar uma preocupação equivalente para o envio de email (sem conceito de "quota de emails/mês" em nenhum lugar). Um futuro `ConviteService` (Passo 30) injeta `EMAIL_ADAPTER` diretamente e chama `.enviar()` — mesmo nível de simplicidade que `SubscricaoService` já usa com `STRIPE_CLIENT` (chama o SDK diretamente, sem camada intermédia). A interface própria continua a garantir a substituibilidade (Regra #5); só a camada de resiliência extra do AI Gateway não se justifica aqui (Regra #24, menor complexidade operacional).

### 3.3 Modelo `ConviteUtilizador` (Prisma)

```prisma
enum EstadoConvite {
  pendente
  aceite
  revogado
}

model ConviteUtilizador {
  id                       String         @id @default(cuid())
  empresaId                String
  empresa                  Empresa        @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  email                    String
  papelPretendido          Papel
  departamentoPretendidoId String?
  departamentoPretendido   Departamento?  @relation(fields: [departamentoPretendidoId, empresaId], references: [id, empresaId])
  token                    String         @unique
  estado                   EstadoConvite  @default(pendente)
  convidadoPorId           String
  convidadoPor             Utilizador     @relation("ConviteConvidadoPor", fields: [convidadoPorId, empresaId], references: [id, empresaId])
  expiraEm                 DateTime
  criadoEm                 DateTime       @default(now())

  @@index([empresaId])
}
```

**`estado` nunca inclui `expirado` como valor guardado** — mesmo princípio já estabelecido para `SubscricaoPlano`/`obterEstadoEfetivo` (Passo 20): expiração é sempre derivada em tempo real (`expiraEm < now()`), nunca escrita por um scheduler. O `ConviteService` (Passo 30) vai expor um `obterEstadoEfetivo` equivalente, reutilizando o mesmo raciocínio já validado, não uma invenção nova.

**`token`** — nunca `cuid()` (desenhado para unicidade/ordenação, não para imprevisibilidade criptográfica). Gerado com `crypto.randomBytes(32).toString('hex')` — um convite por email é, na prática, um "magic link"; adivinhar o token equivaleria a conseguir entrar numa Empresa sem convite, por isso precisa de imprevisibilidade real, não só unicidade.

Duas migrações, mesmo padrão de sempre: criação da tabela, depois `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + política em migração própria. `Utilizador`/`Departamento` ganham os campos de relação opostos (`convitesEnviados`/`convites`), exigidos pelo Prisma para relações nomeadas — nunca alteram o significado dos modelos já existentes.

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| Regra não-negociável #5 (Substituibilidade Controlada) | ✅ Interface própria, nenhum módulo chamaria o SDK do Resend diretamente |
| Regra não-negociável #2 (só a Fundação tem acesso transversal) | ✅ `email/` vive dentro de `fundacao/` |
| RN-04 (nunca `super_admin` por este fluxo) | ⏳ `papelPretendido` validado na fronteira única — fica para o DTO do Passo 30 (`POST /convites` ainda não existe neste passo) |
| ADR-003 §3.3 (Camada 3, FK com escopo de tenant) | ✅ `convidadoPorId`/`departamentoPretendidoId` usam a chave composta `[id, empresaId]`, mesmo padrão de `Partilha` |

**Nenhum novo ADR necessário.**

### 3.5 Critérios de Aceitação e Exit Criteria (planeados)

Sem endpoint de produto — validação por teste direto ao Gateway (mesmo padrão sem-HTTP do Passo 15, `ia-gateway.e2e-spec.ts`).

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `FakeAdapter.enviar()` nunca faz uma chamada de rede real, devolve resultado determinístico | Teste direto |
| T2 | `ConviteUtilizador` criado com sucesso, `empresaId` sempre presente (Camada 1) | Teste direto |
| T3 | `token` é único — segunda tentativa com o mesmo token (cenário artificial) falha por constraint | Teste direto |
| T4 | Isolamento de tenant — um convite de uma Empresa nunca é visível a partir do `TenantContext` de outra | Teste direto (mesmo padrão de `tenant-isolation.e2e-spec.ts`) |
| T5 (regressão) | Suite completa — todos os testes herdados continuam a passar | `npm run test:e2e` |
| T6 | `npm run build` (`apps/api`) sem erros | build limpo |

**Exit Criteria:** T1-T6 confirmados por teste automatizado. Sem validação de browser — passo de backend puro, sem ecrã.

---

### 3.6 Resultado da Implementação (2026-07-08)

Ambas as decisões aprovadas sem alteração: **prazo de expiração de 7 dias** e **confirmação de que o bloqueador RGPD do Passo 26 não se estende ao convite por email** (bases legais distintas — registo público vs. convite iniciado por um Administrador a uma pessoa concreta).

`apps/api/src/modules/fundacao/email/` implementado exatamente como desenhado em §3.1: `email-gateway.types.ts` (`EmailMensagem`/`EmailResultado`), `adapters/email-adapter.interface.ts` (`EmailAdapterInterface`, token `EMAIL_ADAPTER`), `adapters/resend.adapter.ts` (único adaptador real, `apiKey` lida de `RESEND_API_KEY`, com valor de reserva inofensivo — mesmo padrão do `stripeClientProvider`, Passo 21 — para nunca crashar sem credencial real), `adapters/fake.adapter.ts` (`FakeEmailAdapter`, nunca rede real). `EMAIL_ADAPTER` registado e exportado por `FundacaoModule` — sem `EmailGatewayService` intermédio (D2). Modelo `ConviteUtilizador` + `EstadoConvite` implementados exatamente como desenhado em §3.3, com as duas migrações (criação + RLS) aplicadas a `nexa_dev` e `nexa_test`.

**Descoberta operacional real, sem impacto no código**: a primeira tentativa de `prisma generate` falhou com `EPERM` (ficheiro bloqueado) — o servidor de API do preview estava a correr em paralelo e detinha o DLL do query engine. Corrigido parando o servidor antes de gerar o cliente, mesma classe de interferência dev-server-vs-CLI já documentada nos Passos 13/25 (embora aqui com `prisma generate`, não com `next build`/`next dev`). Sem impacto na migração em si, que já tinha sido aplicada corretamente antes deste passo secundário falhar.

**Descoberta técnica real, corrigida durante a escrita dos testes**: os testes falhavam inicialmente com "TenantContext ausente" mesmo dentro de um `tenantContext.run()` correto — a causa real só apareceu depois de alinhar o `comoTenant()` do teste com o padrão exato já estabelecido em `tenant-isolation.e2e-spec.ts` (`async () => await fn()` em vez de passar `fn` diretamente); o erro seguinte revelou a causa raiz genuína: as migrações tinham sido aplicadas a `nexa_dev`, mas nunca a `nexa_test` — corrigido com `prisma migrate deploy` usando `DATABASE_ADMIN_URL` apontado para `nexa_test` (mesma descoberta D9 já documentada no Passo 7).

**Backend:**

| # | Cenário | Resultado |
|---|---|---|
| T1 | `FakeEmailAdapter` nunca faz uma chamada de rede real, resultado determinístico | ✅ Passou |
| T2 | `ConviteUtilizador` criado com sucesso, `empresaId` sempre presente (Camada 1) | ✅ Passou |
| T3 | `token` é único — segunda tentativa com o mesmo token falha | ✅ Passou |
| T4 | Isolamento de tenant — convite de uma Empresa nunca visível a partir de outra | ✅ Passou |
| T5 (regressão) | Suite completa — 180 herdados + 4 novos | ✅ 184/184 |
| T6 | `npm run build` (`apps/api`) sem erros | ✅ Limpo |

`apps/api/test/email-convite.e2e-spec.ts` — novo ficheiro, 4 testes, todos a passar. App confirmada a arrancar sem `RESEND_API_KEY` real, mesma garantia já estabelecida para IA (Passo 15) e Stripe (Passo 21).

**Sem ecrã neste passo** (backend puro) — fica para o Passo 31. **Milestone M5 em curso** — próximo: Passo 30 (`POST /convites`, `POST /convites/:token/aceitar`).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Interface própria completa (padrão do AI Gateway), não o token de DI simples da Stripe | A própria aprovação da Proposta do M5 já usa "interface própria"; não existe nenhum ADR a dizer que o email nunca será substituível (ao contrário do que o ADR-008 diz explicitamente da Stripe) |
| D2 | Sem `EmailGatewayService` com circuit breaker/quota | Nenhuma preocupação de custo/fiabilidade equivalente à da IA está documentada para email; a interface própria já garante a substituibilidade sozinha |
| D3 | `token` gerado por `crypto.randomBytes`, nunca `cuid()` | Precisa de imprevisibilidade criptográfica real (magic link), não só unicidade |
| D4 | `estado` nunca guarda `expirado` — sempre derivado de `expiraEm` em tempo real | Mesmo princípio já validado em `SubscricaoPlano`/`obterEstadoEfetivo` (Passo 20) |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Conteúdo/copy real do email de convite (assunto, corpo) | Nenhum — fica para o Passo 30, quando `POST /convites` de facto compuser e enviar o email | CTO, Passo 30 |
| 2 | Reenvio de convite expirado (UC-02, Exceção E2) — gera um novo `token`/`expiraEm`, ou reutiliza o mesmo convite? | Nenhum — decisão de fluxo, fica para o Passo 30 | CTO, Passo 30 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-08 | Criação da proposta de Especificação Técnica do Passo 29 — sem implementação. 2 Decisões a Validar (A: prazo de expiração do convite, 7 dias recomendado; B: confirmação de que o bloqueador RGPD do Passo 26 não se estende ao convite por email). Plano de testes T1-T6 (nenhum executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Aprovado e implementado pela Fundadora/CEO — Decisões A (7 dias) e B (RGPD não se estende) confirmadas sem alteração. `email/` (interface, `ResendAdapter`, `FakeEmailAdapter`) e `ConviteUtilizador`/`EstadoConvite` implementados exatamente como desenhado. Duas descobertas reais: `prisma generate` bloqueado por `EPERM` com o servidor de preview em paralelo (mesma classe de interferência dos Passos 13/25); migrações nunca tinham sido aplicadas a `nexa_test` (mesma descoberta D9 do Passo 7). 4/4 testes novos (184/184 com regressão). Resultados completos em §3.6 | CTO / Arquiteto Principal (Claude) |

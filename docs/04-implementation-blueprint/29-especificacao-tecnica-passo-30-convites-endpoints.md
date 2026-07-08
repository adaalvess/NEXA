# NEXA — Especificação Técnica do Passo 30 (M5): `POST /convites`, `POST /convites/:token/aceitar` — Segundo Passo do Bloco C

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 30 — endpoints de Convite (UC-02) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M5 (Camada Comercial e Produto — EP-07, Configurações, UC-02), Passo 30 — segundo passo do Bloco C (Convite por email) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado e Implementado (2026-07-08) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-02; Functional Requirements FR-02/FR-03/FR-04; Especificação Técnica do Passo 5 (RBAC, L1-L6); Especificação Técnica do Passo 7 (Partilha, P1-P5); Especificação Técnica do Passo 8 (Departamento, RD-01 a RD-04); Especificação Técnica do Passo 17 (staleness → `409`); Especificação Técnica do Passo 20 (`SubscricaoGuard`); Especificação Técnica do Passo 26 (Registo público, encadeamento registar+login); Especificação Técnica do Passo 29 (Interface de email, `ConviteUtilizador`) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Adicionar os dois endpoints de produto que operacionalizam UC-02: `POST /convites` (o Administrador ou Gestor envia um convite por email) e `POST /convites/:token/aceitar` (a pessoa convidada aceita e cria a sua conta). Consome integralmente a infraestrutura do Passo 29 (`EMAIL_ADAPTER`, modelo `ConviteUtilizador`) — sem nenhuma alteração de schema neste passo. Backend puro; o ecrã (envio + aceitação) fica para o Passo 31, que fecha o Bloco C e o Milestone M5.

---

## 2. Contexto

UC-02 já está integralmente coberto por decisões já validadas em passos anteriores: RN-03 (Gestor só convida dentro do seu Departamento) e RN-04 (nunca `super_admin`) reutilizam literalmente a hierarquia de privilégio (`PRIVILEGIO`) e o padrão `PAPEIS_ATRIBUIVEIS` já fixados em `UtilizadoresService.atribuirPapel` (Passo 5); a validação de instância do Departamento pretendido reutiliza RD-03 (Passo 8); a expiração de 7 dias e a não-extensão do bloqueador RGPD já foram validadas no Passo 29. Este passo não reabre nenhuma dessas decisões — só as aplica a um novo fluxo.

Três questões, no entanto, não estão cobertas por nenhuma decisão já tomada e exigem validação explícita antes de implementar (Método de Trabalho, secção 5 do `CLAUDE.md`).

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **`GET /convites/:token` público (pré-visualização do convite antes de aceitar) — incluir neste passo, ainda que fora do literal fixado no `CLAUDE.md` §6 ("`POST /convites`, `POST /convites/:token/aceitar`")?** Sem isto, o ecrã de aceitação (Passo 31) teria de pedir a palavra-passe à pessoa convidada às cegas, sem confirmar a Empresa/papel/email do convite — experiência pobre e sem defesa contra um link partilhado por engano. | **Sim, incluir.** Endpoint mínimo, só leitura, sem novos dados sensíveis expostos (nunca `token`, nunca dados de outros Utilizadores) — `{ empresaNome, email, papelPretendido, estado, expirado }`. Coerente com o princípio que a Fundadora/CEO acabou de reforçar na aprovação do Passo 29: a experiência de um novo fluxo deve ser simples e informada, nunca às cegas. Sem isto, o Passo 31 teria de o acrescentar de qualquer forma — mais eficiente resolver agora, junto dos outros dois endpoints do mesmo fluxo. |
| B | **Enforcement de `limiteUtilizadores` (RN-10/RN-11) neste passo — a Proposta do M4 identificou UC-02 como precisamente o gatilho em falta.** Isto exigiria um mecanismo novo (contagem de Utilizadores ativos vs. `subscricao.limiteUtilizadores`), distinto do `SubscricaoGuard`/`@BloqueadoPorSubscricao()` já existente (esse só verifica `estadoEfetivo` — trial expirado —, nunca um limite numérico; confirmado por leitura direta de `subscricao.guard.ts`, nunca implementado em lado nenhum do projeto até agora). | **Não implementar neste passo — registar como Questão em Aberto explícita**, a decidir num passo dedicado. Razões: (1) é um mecanismo genuinamente novo, não uma reutilização de infraestrutura existente — decidi-lo aqui alargaria o âmbito já fixado deste passo (dois endpoints) sem uma Especificação Técnica própria para as suas próprias perguntas (bloquear no envio do convite ou só na aceitação? convites pendentes contam para o limite, ou só Utilizadores já criados?); (2) UC-02 (Exceção E1) já remete explicitamente esta lógica para UC-08 ("Atingir Limite do Plano"), que nunca foi implementado — implementá-la agora, de forma isolada e sem UC-08, criaria uma segunda forma de enforcement de limite de plano incoerente com o padrão uniforme já estabelecido no Passo 20. |
| C | **Unicidade de email na aceitação do convite — global (qualquer Empresa) ou só dentro desta Empresa?** O schema (`@@unique([empresaId, email])`) permite o mesmo email em Empresas diferentes, mas `AuthService.registar` (Passo 3) já aplica uma verificação global deliberada (UC-01, Exceção E1) — uma pessoa não pode ter uma segunda conta com o mesmo email nesta plataforma. | **Global, mesmo padrão do registo** — por consistência de identidade de conta em toda a NEXA (FR-02: "preparada para futura associação múltipla", mas essa futura associação ainda não existe). Se o email do convite já corresponde a uma conta existente (nesta ou noutra Empresa), a aceitação é recusada com `409` e mensagem a sugerir iniciar sessão em vez de aceitar — mesma redação de espírito da E1 de UC-01. |

---

## 3. Conteúdo Estruturado

### 3.1 `POST /convites`

```
POST /convites
→ SessionGuard, PermissaoGuard
→ @RequirePermissao('fundacao', 'convidar_utilizador')
→ Body: { email: string, papelPretendido: PapelAtribuivel, departamentoPretendidoId?: string | null }
→ devolve: { id, email, papelPretendido, departamentoPretendidoId, estado, expiraEm } — nunca `token`
```

Nova permissão `fundacao.convidar_utilizador` na `DEFAULT_PERMISSION_MATRIX` — `admin_empresa: true`, `gestor: true` (âmbito CV-03, abaixo), `colaborador`/`convidado: false`. **Nunca decorado com `@BloqueadoPorSubscricao()`** — é uma ação da Fundação (convite/atribuição, mesma categoria de `atribuirPapel`/`criar Departamento`), não "conteúdo de negócio" (Especificação Técnica do Passo 20, 3.2/Decisão D já fixa essa fronteira em 5 endpoints específicos, nenhum deles aqui).

**`CriarConviteDto`** — `email` (`@IsEmail`); `papelPretendido` reaproveita literalmente `PAPEIS_ATRIBUIVEIS`/`@IsIn` do Passo 5 (nunca `super_admin`, RN-04/CV-02, validado na fronteira única); `departamentoPretendidoId` opcional (`@IsOptional @IsString`).

**`ConviteService.criar()`** — regras de autoridade (CV-01 a CV-06, mesmo rigor de L1-L6/P1-P5/RD-01-04):

- **CV-01 (privilégio)** — reaproveita a mesma tabela `PRIVILEGIO` de `UtilizadoresService.atribuirPapel` (Passo 5), **exportada** desse ficheiro para evitar uma segunda definição da hierarquia (Regra não-negociável #4, configuração sobre hardcoding disperso). `PRIVILEGIO[papelPretendido] < PRIVILEGIO[ctx.papel]` → `403`.
- **CV-02 (RN-04)** — nunca `super_admin`, já garantido pela fronteira única do DTO.
- **CV-03 (RN-03)** — se `ctx.papel === gestor`: `departamentoPretendidoId` é obrigatório e tem de ser exatamente o próprio Departamento do Gestor (mesmo padrão de L3 em `atribuirPapel`); Gestor sem Departamento próprio nunca pode convidar (`403`).
- **CV-04 (RD-03)** — quando `departamentoPretendidoId` fornecido, tem de existir, pertencer à Empresa (estrutural, Camada 1) e não estar eliminado (`404`).
- **CV-05 (Decisão C)** — o email não pode corresponder a nenhum Utilizador existente (verificação global, via `PrismaService` bruto — mesma exceção documentada de `AuthService.registar`) → `409`.
- **CV-06** — não pode já existir um convite `pendente` e não expirado para o mesmo email nesta Empresa → `409` ("Já existe um convite pendente para este email."). Reenvio/revogação ficam fora de âmbito deste passo (UC-02, Exceção E2 já identifica isto como capacidade futura).
- **Isolamento de tenant** sempre estrutural (Camada 1) — `TenantPrismaService`.

**Ordem de execução (enviar antes de persistir)** — gera o `token` (`crypto.randomBytes(32).toString('hex')`, Passo 29), monta o corpo do email (nome da Empresa via `tenantPrisma.client.empresa.findUnique`, link `${WEB_APP_URL}/convites/${token}`) e **envia primeiro**, via `EMAIL_ADAPTER` injetado diretamente (Passo 29, sem `EmailGatewayService` intermédio). Só se `resultado.enviado === true` é que o `ConviteUtilizador` é persistido (`estado: pendente`, `expiraEm: +7 dias`) e o evento de auditoria emitido. Envio falhado → `502` (`BadGatewayException`), nenhum registo fica em estado pendente órfão — evita que um retry do Administrador esbarre em CV-06 por causa de uma linha nunca comunicada com sucesso.

**Auditoria** — evento `criar` sobre a entidade `ConviteUtilizador`, `detalhe: { email, papelPretendido, departamentoPretendidoId }` (nunca o `token`).

### 3.2 `GET /convites/:token` (Decisão A)

```
GET /convites/:token
→ Público (sem SessionGuard) — mesmo padrão de GET /planos/publico (Passo 24)
→ devolve: { empresaNome, email, papelPretendido, estado, expirado } — nunca token, nunca dados de outro Utilizador
```

`ConviteService.obterPorToken()` — `PrismaService` bruto (endpoint público, sem `TenantContext`), scoping manual pelo próprio `token` (`@unique`). Convite inexistente → `404`. `expirado` calculado em tempo de leitura (`expiraEm < now()`), nunca persistido (mesmo padrão de `SubscricaoPlano.obterEstadoEfetivo`, Passo 20, e do próprio `EstadoConvite` sem valor `expirado`, Passo 29). Sem `@Throttle` dedicado — herda o limite global (mesmo padrão de `GET /planos/publico`).

### 3.3 `POST /convites/:token/aceitar`

```
POST /convites/:token/aceitar
→ Público (sem SessionGuard)
→ Body: { nome: string, password: string }
→ devolve: { empresaId, utilizadorId } — nunca define cookie de sessão aqui
```

**`AceitarConviteDto`** — `nome` (`@IsString @Length(2,100)`, mesmo limite de `RegistarDto`); `password` (`@IsString @MinLength(8)`, NFR-08, mesmos parâmetros Argon2id de sempre).

**`ConviteService.aceitar()`** — `PrismaService` bruto (sem `TenantContext` ainda; o `TenantContext` só existe depois de existir uma `Sessao`, que este endpoint deliberadamente não cria — ver abaixo):

1. Convite por `token` → inexistente: `404`.
2. `estado !== pendente` OU `expiraEm < now()` → `409` (mesmo padrão de staleness já estabelecido em `IaService.confirmarSugestao`, Passo 17, Decisão E — "sugestão obsoleta", aqui "convite já não está pendente/expirou", sem introduzir um novo valor de `estado`).
3. **CV-05 revalidado** (Decisão C) — o email pode ter passado a corresponder a uma conta entre o envio e a aceitação → `409`.
4. Hash da password (Argon2id, mesmos parâmetros de sempre).
5. Transação: `criar Utilizador` (`empresaId` do convite, `nome`, `email` do convite, `passwordHash`, `papel: papelPretendido`, `departamentoId: departamentoPretendidoId`, `criadoPor: convite.convidadoPorId`) + `atualizar ConviteUtilizador` (`estado: aceite`).
6. Auditoria — dois eventos, mesmo padrão duplo de `AuthService.registar` (Passo 3): `aceitar`/`ConviteUtilizador` e `criar`/`Utilizador` (`ator` = o próprio Utilizador recém-criado, mesma convenção do registo — não há mais ninguém autenticado neste pedido).

**Sem auto-login dentro deste endpoint** — devolve só `{ empresaId, utilizadorId }`; o Passo 31 encadeia imediatamente `POST /auth/login` no frontend com o mesmo email (do convite) e a password que a pessoa acabou de submeter, **reutilizando literalmente o padrão já validado e aprovado no Passo 26** (registo público → login automático, "sem intervenção manual", Business Goals H1.4), em vez de inventar um segundo mecanismo de login dentro deste endpoint. Mantém `AuthController` como o único ponto que define o cookie de sessão (Regra não-negociável #6, camada única).

**`@Throttle`** — mesmo valor conservador de `/auth/registar` (5/min), consistente por criar contas da mesma forma.

### 3.4 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| RN-03/RN-04 | ✅ CV-01/CV-02/CV-03, reutilização literal de L2/L3/L4 (Passo 5) |
| UC-01, Exceção E1 (unicidade global de email) | ✅ Decisão C, CV-05, mesmo padrão de `AuthService.registar` |
| Regra não-negociável #5 (Substituibilidade Controlada) | ✅ `EMAIL_ADAPTER` injetado diretamente, sem SDK do Resend fora do adaptador |
| Regra não-negociável #6 (camada de acesso a dados única) | ✅ `TenantPrismaService` em `criar()`; `PrismaService` bruto só nos dois pontos já documentados como exceção (público, sem sessão) |
| Regra não-negociável #9 (Auditoria append-only) | ✅ `criar`/`ConviteUtilizador`, `aceitar`/`ConviteUtilizador`, `criar`/`Utilizador` |
| Bloqueador RGPD do Passo 26 | ✅ Confirmado no Passo 29 que não se estende a este fluxo — sem checkbox de consentimento aqui |
| Especificação Técnica do Passo 20 (enforcement uniforme) | ⚠️ `limiteUtilizadores` deliberadamente não coberto (Decisão B) — registado como Questão em Aberto, não uma lacuna silenciosa |

**Nenhum novo ADR necessário. Nenhuma alteração de schema.**

### 3.5 Critérios de Aceitação e Exit Criteria (planeados)

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `admin_empresa` convida com sucesso — convite `pendente`, email enviado (`FakeEmailAdapter`), `token` nunca no corpo da resposta | HTTP real |
| T2 | `gestor` convida dentro do seu Departamento — sucesso | HTTP real — CV-03 |
| T3 | `gestor` tenta convidar sem Departamento próprio, ou para papel diferente da sua equipa — `403` | HTTP real — CV-03 |
| T4 | `gestor` tenta convidar com `papelPretendido: admin_empresa` — `403` | HTTP real — CV-01 |
| T5 | `colaborador`/`convidado` tentam convidar — `403` (`PermissaoGuard`) | HTTP real |
| T6 | `papelPretendido: super_admin` — `400` (fronteira única, DTO) | HTTP real — CV-02 |
| T7 | `departamentoPretendidoId` inexistente/eliminado/de outra Empresa — `404` | HTTP real — CV-04 |
| T8 | Email já corresponde a Utilizador existente (mesma ou outra Empresa) — `409` | HTTP real — CV-05 |
| T9 | Segundo convite pendente para o mesmo email, na mesma Empresa — `409` | HTTP real — CV-06 |
| T10 | `EMAIL_ADAPTER` falha o envio (`FakeEmailAdapter.deveFalhar`) — `502`, nenhum `ConviteUtilizador` persistido | HTTP real |
| T11 | `GET /convites/:token` com token válido, ainda não expirado — `200`, corpo sem `token` | HTTP real — Decisão A |
| T12 | `GET /convites/:token` com token inexistente — `404` | HTTP real |
| T13 | `GET /convites/:token` com convite expirado — `200`, `expirado: true` | HTTP real |
| T14 | Aceitar com sucesso — `Utilizador` criado com o papel/Departamento do convite, `ConviteUtilizador.estado` passa a `aceite`; login imediato a seguir (mesmas credenciais) funciona | HTTP real |
| T15 | Aceitar um convite já aceite — `409` | HTTP real |
| T16 | Aceitar um convite expirado (`expiraEm` no passado, `estado` ainda `pendente`) — `409` | HTTP real |
| T17 | Aceitar com email entretanto já registado por outra via — `409` | HTTP real — CV-05 revalidado |
| T18 | Isolamento de tenant: convite de uma Empresa nunca aceite/afeta outra | HTTP real |
| T19 (regressão) | Suite completa — todos os testes herdados continuam a passar | `npm run test:e2e` |
| T20 | `npm run build` (`apps/api`) sem erros | build limpo |

**Exit Criteria:** T1-T20 confirmados por teste automatizado. Sem validação de browser — passo de backend puro, sem ecrã (fica para o Passo 31).

### 3.6 Resultado da Implementação

- **Módulo `apps/api/src/modules/fundacao/convite/`** — `ConviteController` (`POST /convites`, `GET /convites/:token`, `POST /convites/:token/aceitar`), `ConviteService` (`criar`, `obterPorToken`, `aceitar`), `CriarConviteDto`, `AceitarConviteDto`. Nova permissão `fundacao.convidar_utilizador` na `DEFAULT_PERMISSION_MATRIX`.
- **`PRIVILEGIO` extraída** para `apps/api/src/modules/fundacao/autorizacao/privilegio.ts` — reutilizada tal-e-qual por `UtilizadoresService.atribuirPapel` (Passo 5, sem alteração de comportamento) e `ConviteService.criar` (CV-01), nunca uma segunda definição da hierarquia.
- **CV-01 a CV-06** implementadas exatamente como especificado em 3.1 — nenhum desvio face à especificação aprovada.
- **Ordem "enviar → persistir"** confirmada e implementada com tratamento explícito do cenário residual levantado pela Fundadora/CEO — ver §6.
- **Sem descobertas técnicas emergentes** além da resposta já antecipada em §6 — implementação estritamente conforme a especificação aprovada.
- **Resultados**: `apps/api/test/convites.e2e-spec.ts` (18 testes, T1-T18, via HTTP real, `FakeEmailAdapter` nunca faz chamada de rede real), suite completa em 202/202 testes (184 herdados + 18 novos), estável em 2 execuções consecutivas; `npm run build` (`apps/api`) limpo; app confirmada a arrancar sem `RESEND_API_KEY` real, rotas `/convites`, `/convites/:token`, `/convites/:token/aceitar` mapeadas corretamente.
- **Sem ecrã neste passo** (backend puro) — fica para o Passo 31, que fecha o Bloco C e o Milestone M5.

---

## 4. Questões em Aberto

| # | Questão | Prazo para decisão |
|---|---|---|
| Q1 | Enforcement de `limiteUtilizadores` (RN-10/RN-11) — mecanismo próprio, distinto do `SubscricaoGuard` (Decisão B, acima) | Antes do M6/M7, ou quando UC-08 for formalmente endereçado |
| Q2 | Reenvio/revogação de convite pendente (UC-02, Exceção E2) | Fora de âmbito do M5; avaliar num milestone futuro |

---

## 5. Aprovação

Decisões A, B e C aprovadas pela Fundadora/CEO em 2026-07-08, sem alterações — ver §6 abaixo para a resposta à observação sobre a ordem de envio/persistência.

---

## 6. Resposta à Observação da Fundadora/CEO (ordem de envio do convite)

Na aprovação, a Fundadora/CEO pediu confirmação explícita de que "enviar antes de persistir" (3.1) não introduz o cenário inverso — email entregue, persistência falhada, destinatário com um link que não corresponde a nada. Confirmação: **esse cenário é real e não é eliminável** sem um padrão de duas fases (saga) entre dois sistemas externos distintos (fornecedor de email e base de dados) — complexidade desproporcionada para esta funcionalidade, e nenhuma das duas ordens possíveis ("enviar → persistir" ou "persistir → enviar") consegue atomicidade genuína entre os dois. A escolha entre elas é sempre uma escolha sobre **qual falha residual é mais aceitável**, nunca uma eliminação do risco:

- **"Persistir → enviar"** (ordem descartada): se o envio falhar depois de persistir, fica um `ConviteUtilizador` real na BD que nunca chegou a ser comunicado — silencioso (o Administrador vê `201`, pensa que o convite foi enviado, mas a pessoa nunca recebe nada) e bloqueia CV-06 num reenvio (`409`, "já existe um convite pendente", sem explicação de que na verdade nunca foi entregue).
- **"Enviar → persistir"** (ordem escolhida, 3.1): se a persistência falhar depois do envio (só falha transitória de BD, já que CV-05/CV-06 foram verificados antes do envio), o Administrador recebe um erro explícito (`500`, nunca um `201` enganador) e sabe que tem de tentar novamente; o link já entregue aponta para um `token` que não existe em lado nenhum — falha seguro por construção (`404` em `GET/POST /convites/:token...`, nunca acesso indevido a nada), nunca um estado ambíguo na BD.

**Mitigação implementada** (`ConviteService.criar`, `apps/api/src/modules/fundacao/convite/convite.service.ts`): a escrita do `ConviteUtilizador` está isolada num `try/catch` dedicado; uma falha aí nunca é engolida — é registada com `Logger.error` (inclui `token` e `email`, nunca a password) para seguimento operacional manual, e devolvida ao Administrador como `500` explícito. Não foi implementado retry automático (a falha de BD contemplada é uma falha transitória rara, não um caso normal de operação) — decisão de detalhe, não de arquitetura, coerente com o resto do projeto não introduzir infraestrutura de retry sem um caso de uso real documentado a exigi-la.

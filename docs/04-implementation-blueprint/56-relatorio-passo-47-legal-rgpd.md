# NEXA — Relatório de Execução do Passo 47 (M8 — Documentos Legais e Consentimento RGPD)

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 47: Documentos Legais e Consentimento RGPD |
| **Fase** | 7 — Desenvolvimento da Plataforma, M8 (Preparação para Lançamento), Passo 47 — segundo passo do M8 |
| **Versão** | 2.0 |
| **Estado** | ✅ Concluído e aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 47](55-especificacao-tecnica-passo-47-legal-rgpd.md); Especificação Técnica do Passo 26 (bloqueador original) |
| **Última atualização** | 2026-07-20 |

---

## 1. Resumo Executivo

O bloqueador de pré-lançamento registado desde o Passo 26 está **tecnicamente resolvido e implantado em staging**: o registo público exige agora consentimento explícito, estruturalmente aplicado pelo backend (nunca só visual), e as páginas `/termos`/`/privacidade` estão publicadas com conteúdo factual sobre o que o sistema realmente faz. O deploy via pipeline CI/CD real revelou e permitiu corrigir um incidente genuíno de infraestrutura (migrações/`GRANT`s nunca automatizados contra a Neon de staging, secção 10) — diagnosticado, corrigido e registado permanentemente como Q6 do ADR-007, nunca escondido. **A conclusão para uso em produção com clientes reais permanece pendente da tua confirmação sobre a revisão jurídica do conteúdo** — os campos `[A PREENCHER]` (nome legal da entidade, NIF, jurisdição, contacto de privacidade, DPO) ainda não foram preenchidos, conforme instruído.

---

## 2. Modelo de Dados — `ConsentimentoRegisto`

Novo modelo Prisma (tenant-scoped, RLS ativa, 2 migrações — schema + RLS, mesmo padrão de sempre): `empresaId`, `utilizadorId` (chave composta, Camada 3 de Defense in Depth), `versaoTermos`, `versaoPrivacidade`, `aceiteEm`. Criado na mesma transação de bootstrap de `AuthService.registar()` — mesmo padrão já usado para `Empresa`/`Utilizador`.

**Decisão B (imutabilidade) aplicada exatamente como aprovada**: trigger `BEFORE UPDATE OR DELETE` a nível de BD, mesmo mecanismo do `RegistoAuditoria` (Passo 6) — aplica-se a todos os roles, incluindo o owner (`nexa_dev`). Confirmado ao vivo (secção 6). O helper partilhado de limpeza de dados de teste (`limpar-empresa.ts`) foi estendido para desativar/reativar também este novo trigger, mesma disciplina já usada para o da auditoria.

---

## 3. Enforcement Estrutural do Consentimento

`RegistarDto.aceiteTermos` usa `@Equals(true)` (não `@IsBoolean()`) — só o valor literal `true` é aceite; `false`, ausente, ou qualquer outro valor é rejeitado com `400` e uma mensagem clara. Verificado ao vivo com um pedido `fetch` direto ao backend, contornando por completo o checkbox da interface (secção 6) — confirma que a proteção real nunca depende só da UI.

---

## 4. Conteúdo Legal — Marcadores `[A PREENCHER]`

Conforme instruído, **nenhum dado legal da entidade foi inventado**. `/termos` e `/privacidade` (Server Components estáticos) contêm o conteúdo factual que o sistema já determina com precisão (dados tratados, subprocessadores reais — Anthropic/Stripe/Resend/Neon/Render/Vercel —, cookies, retenção, estado real e manual do direito ao apagamento por PSD-001 continuar em aberto) e marcadores explícitos `[A PREENCHER]` para: nome legal da entidade, morada/país, NIF, contacto de privacidade, existência de DPO, e confirmação da autoridade de controlo competente. Nenhum destes pontos foi assumido.

---

## 5. Frontend

- Novo componente `Checkbox` (12º do Design System) — mesmo padrão dos restantes componentes base.
- `/registar`: checkbox obrigatório, com links para `/termos`/`/privacidade` (nova aba); botão "Criar Conta" desabilitado até estar marcado (confirmado visualmente e via `reactProps.disabled`).
- Rodapé com os dois links adicionado à Landing Page (`/`) — descoberta a acrescento de baixo risco, para dar visibilidade aos documentos fora do fluxo de registo.
- Ecrã de convite (`/convites/[token]`) **inalterado** — reconfirma a decisão já validada no Passo 29: o consentimento só se aplica ao registo público, nunca à aceitação de um convite (bases legais distintas).

---

## 6. Validação Real (Browser + Base de Dados)

Todos os passos executados contra o ambiente local real, nunca simulados:

1. **Checkbox desmarcado** → botão "Criar Conta" confirmado `disabled: true` (inspeção da prop React).
2. **Checkbox marcado** → botão fica ativo (confirmado visualmente, cor da marca `nexa-purple` após correção de `accent-color`).
3. **Registo real completo** (Empresa "Passo47 RGPD Teste") — sessão iniciada automaticamente, navegação para `/dashboard`, zero erros de consola.
4. **`ConsentimentoRegisto` confirmado por leitura direta da BD** — `versaoTermos: "1.0"`, `versaoPrivacidade: "1.0"`, `aceiteEm` com timestamp correto.
5. **Imutabilidade confirmada ao vivo** — tentativa direta de `UPDATE` e `DELETE` no registo de consentimento (via `PrismaClient` ligado como o role owner) rejeitadas pelo trigger, com a mensagem exata `"ConsentimentoRegisto é append-only — UPDATE/DELETE nunca são permitidos (Especificação Técnica do Passo 47)"`.
6. **Enforcement estrutural confirmado, contornando a UI** — `fetch` direto a `POST /auth/registar` sem `aceiteTermos` → `400`, mensagem `"É necessário aceitar os Termos de Serviço e a Política de Privacidade."`.
7. **`/termos` e `/privacidade` renderizados corretamente** — marcadores `[A PREENCHER]` visíveis, conteúdo legível, zero erros de consola.
8. Empresa de teste eliminada no final (mesmo mecanismo de sempre); confirmado **0 Empresas de teste restantes**.

---

## 7. Testes Automatizados e Regressão

`apps/api/test/auth.e2e-spec.ts` ganhou 4 testes novos (T4-T7): registo sem `aceiteTermos` rejeitado; registo com `aceiteTermos: false` rejeitado; registo com `aceiteTermos: true` cria o `ConsentimentoRegisto` com versão/timestamp corretos; imutabilidade confirmada por tentativa direta de `UPDATE`/`DELETE`.

Como `RegistarDto.aceiteTermos` passou a ser obrigatório, **todos os 20 ficheiros de teste que chamam `POST /auth/registar`** (22 chamadas no total, incluindo os 5 do `rbac.e2e-spec.ts` e as 2 do `convites.e2e-spec.ts`) foram atualizados para incluir `aceiteTermos: true` — alteração mecânica, sem alterar nenhuma asserção existente.

**Suite completa: 223/223 testes (219 herdados + 4 novos), estável em 2 execuções consecutivas.** Build (`npm run build`) e lint (`npm run lint`) limpos em `apps/api` e `apps/web`.

---

## 8. Fora de Âmbito (Conforme a Especificação)

- PSD-001 (hard-delete físico) — não resolvido, só descrito honestamente como processo manual na Política de Privacidade.
- PSD-002 (residência de dados Enterprise) — continua fora de âmbito do MVP.
- Banner de consentimento de cookies — não aplicável (só cookie estritamente necessário em uso).
- Revisão jurídica profissional — ação tua, não de implementação.

---

## 9. Exit Criteria (Especificação Técnica do Passo 47) — Checklist

- [x] Marcadores `[A PREENCHER]` usados para todos os dados legais que não posso inventar — nenhuma informação fictícia criada.
- [x] Decisões A-E confirmadas antes de qualquer alteração de código.
- [x] Páginas `/termos`/`/privacidade` publicadas; checkbox obrigatório e funcional; consentimento registado na BD (nunca só visual); testes e2e novos verdes; suite completa sem regressão (223/223).
- [x] Deploy a staging via o pipeline real confirmado, sem intervenção manual no código — ver secção 10.
- [x] Registado explicitamente: a conclusão deste passo é técnica, não legal — só fica aprovado para produção depois da tua confirmação sobre a validação jurídica do conteúdo.

---

## 10. Deploy a Staging Via Pipeline Real — Concluído, com um Incidente Real Encontrado e Corrigido

Commit `238e69f` enviado ao `main`; pipeline (`.github/workflows/ci-cd.yml`) disparado automaticamente.

### 10.1 Resultado do Pipeline (run `29781575995`)

| Job | Resultado |
|---|---|
| `test-backend` | ✅ `success` (169s) — **223/223 testes**, incluindo os 4 novos deste passo |
| `build-frontend` | ✅ `success` (93s) |
| `deploy` | ✅ `success` (149s) — Render confirmado `live`, seguido de deploy no Vercel |

### 10.2 Incidente Real Encontrado Durante a Validação de Staging — Diagnosticado e Corrigido na Hora

A primeira tentativa de registo real contra o staging já atualizado devolveu **`500 Internal server error`**. Parei, diagnostiquei antes de continuar (nunca ignorei nem contornei):

**Causa raiz**: o `buildCommand` do Render (`render.yaml`) nunca incluiu `prisma migrate deploy` contra a Neon de staging — só a base de dados efémera do runner de CI recebe as migrações automaticamente. Todas as migrações de schema desde o Passo 40 foram aplicadas manualmente à Neon de staging em cada passo; desta vez, esse passo manual foi esquecido no meio do fluxo de implementação. Sem a tabela `ConsentimentoRegisto`, `AuthService.registar()` falhava dentro da transação.

**Segunda causa, encontrada ao corrigir a primeira**: mesmo depois de aplicar a migração manualmente (`prisma migrate deploy` com `DATABASE_ADMIN_URL`), o registo continuou a falhar com `500`. Diagnóstico mais profundo revelou que, ao contrário do ambiente local, a Neon de staging **não tem `ALTER DEFAULT PRIVILEGES` configurado** para o role usado nas migrações (`nexa_owner`) — cada tabela nova nunca recebe privilégios automáticos para os roles de runtime (`nexa_app`/`nexa_fundacao`), exigindo sempre `GRANT` explícito após cada migração (confirmado por comparação direta com uma tabela mais antiga, `ConviteUtilizador`, que já tinha esses grants concedidos manualmente no seu próprio passo de origem).

**Corrigido**: migração aplicada + `GRANT SELECT, INSERT, UPDATE, DELETE` concedido a `nexa_app`/`nexa_fundacao` na Neon de staging, ambos via `DATABASE_ADMIN_URL` (mesmo role/mecanismo já usado desde o Passo 40, nenhuma credencial nova). Registo confirmado a funcionar de imediato a seguir.

**Registado permanentemente, nunca escondido**: nova Questão em Aberto **Q6 do ADR-007** (v1.4) — este processo manual, repetido em silêncio desde o Passo 40, é um risco real de esquecimento (como este incidente acabou de provar). Decisão sobre automatizar migrações/grants no pipeline fica explicitamente para validação contigo antes do Passo 49 (ambiente de produção), nunca assumida unilateralmente — automatizar isto exigiria um novo secret (`DATABASE_ADMIN_URL`) e uma decisão consciente sobre o nível de portão manual para alterações de schema contra bases de dados reais.

### 10.3 Validação Real Completa Contra o Staging Corrigido

Depois da correção, executado ao vivo contra o staging real (nunca simulado):

- `GET /health`, `/`, `/precos`, `/login`, `/registar`, `/termos`, `/privacidade` → todos `200`; conteúdo de `/termos` confirmado como a versão nova (não uma resposta em cache).
- **Enforcement de consentimento confirmado em produção de staging**: pedido direto sem `aceiteTermos` → `400`, mensagem exata.
- **Registo real com consentimento** → `201`, `ConsentimentoRegisto` confirmado na Neon de staging com versão/timestamp corretos.
- **Isolamento multi-tenant confirmado no staging atualizado**: duas Empresas registadas, Processo criado pela Empresa A, `GET /processos` da Empresa B devolveu `[]` enquanto a A viu o seu próprio Processo.
- Todas as Empresas de teste eliminadas no final; confirmado **0 Empresas de teste restantes** na Neon de staging.

**Nenhuma regressão encontrada** — o incidente foi de infraestrutura/processo (migração/grants em falta), nunca do código da aplicação em si; depois de corrigido, todo o comportamento validado correspondeu exatamente ao esperado.

### 10.4 Correção Adicional, Cosmética

Os nomes dos jobs/passos do pipeline ainda mencionavam "219 testes"/"18 migrações" (desatualizados desde antes deste passo) — corrigidos para refletir a contagem real atual (223 testes), sem alteração de comportamento.

---

## 11. Encerramento Formal

Com o deploy via pipeline confirmado, o incidente real encontrado e corrigido de forma transparente (nunca escondido, registado permanentemente como Q6 do ADR-007), e a validação completa em staging sem regressões, o **Passo 47 está formalmente concluído tecnicamente** — segundo passo do M8 encerrado. **Reitera-se explicitamente**: esta conclusão é técnica; a entrada em produção com clientes reais exige ainda a substituição dos marcadores `[A PREENCHER]` pelos dados oficiais da entidade e revisão por quem tenha responsabilidade legal pela plataforma — nenhuma dessas duas condições foi cumprida neste passo, por decisão tua.

**Próximo: Passo 48 (Base de Dados de Produção, Neon, plano pago, região UE)** — conforme a sequência já aprovada do M8, com a Questão em Aberto Q6 (migrações/grants automatizados) a considerar explicitamente antes do Passo 49.

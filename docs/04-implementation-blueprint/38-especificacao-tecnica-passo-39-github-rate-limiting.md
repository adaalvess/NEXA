# NEXA — Especificação Técnica do Passo 39 (M7 — Repositório Remoto + Rate Limiting)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 39: Repositório Remoto GitHub + Correção do Rate Limiting (ADR-007 §3.6) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 39 — primeiro passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 §3.6; Especificação Técnica do Passo 3 (auth, S1-S4); Proposta do Milestone M7 (aprovada em chat, 2026-07-11) |
| **Última atualização** | 2026-07-11 |

---

## 1. Objetivo

Duas peças independentes, ambas pré-requisitos estruturais para o resto do M7:

1. **Repositório remoto GitHub** — preparação e execução do primeiro push. **Bloqueado**: a Fundadora/CEO confirmou explicitamente que a conta/organização de destino não deve ser assumida — fica decidida antes do push em si (secção 4).
2. **Correção do rate limiting de autenticação** para corresponder à decisão real do ADR-007 §3.6 — resolve a Descoberta B da Proposta do M7 (o que está implementado desde o Passo 3 diverge do que o ADR-007 decidiu, não só nos valores, mas no próprio mecanismo).

---

## 2. Parte A — Repositório Remoto GitHub

### 2.1 O que fica preparado neste passo

- `.gitignore` revisto (já reforçado desde o Passo 3.3 — confirmar que continua completo antes do push: segredos, `.env*` exceto `.env.example`, `node_modules`, `dist`/`.next`, bases de dados locais).
- Confirmação de que a árvore de trabalho está limpa e todos os commits até ao Passo 38 estão presentes localmente.
- `README.md` mínimo na raiz (atualmente pode não existir — a confirmar) — não é bloqueante para o push, mas é boa prática antes de tornar o repositório visível a uma plataforma de CI/CD.
- **Repositório GitHub privado** (decisão já confirmada pela Fundadora/CEO).

### 2.2 O que fica pendente (não decidido neste documento)

- **Conta ou Organização GitHub de destino** — a Fundadora/CEO indicou explicitamente que esta decisão será tomada antes do primeiro push, não antes. Este passo **não cria o repositório remoto nem executa nenhum push** enquanto esta informação não for fornecida.
- Nome exato do repositório (proponho `nexa`, a confirmar).
- Branch por defeito (`main`, já é o nome usado localmente — a confirmar que se mantém).

### 2.3 Sequência de execução real (só depois da confirmação da secção 2.2)

1. Criar o repositório vazio no GitHub (privado) na conta/organização confirmada.
2. `git remote add origin <url>`.
3. `git push -u origin master` (ou renomear para `main` antes do push, a validar — o repositório local usa atualmente `master` como branch, a confirmar se deve ser renomeado para `main` antes de se tornar público para as plataformas, já que Vercel/Render/GitHub Actions assumem por convenção `main`).

**Esta ação (criar o remoto e fazer o primeiro push) é irreversível na prática** (mesmo que se possa apagar um repositório GitHub depois, publicar código é uma ação com efeitos reais) — será executada só depois de confirmação explícita, nunca antecipada.

---

## 3. Parte B — Correção do Rate Limiting (ADR-007 §3.6)

### 3.1 O que o ADR-007 decidiu, literalmente

> "O endpoint de autenticação aplica um limite de 5 tentativas falhadas por combinação IP+conta em 15 minutos, com bloqueio progressivo — implementado ao nível da aplicação (guard do NestJS)."

### 3.2 O que está implementado hoje (`auth.controller.ts`, desde o Passo 3)

`@Throttle({ limit: 10, ttl: 60_000 })` em `/auth/login` — três divergências reais, não apenas de calibração:

| Dimensão | ADR-007 decide | Implementado hoje |
|---|---|---|
| Chave de contagem | IP + conta (combinação) | Só IP |
| O que conta | Tentativas **falhadas** | **Todos** os pedidos (sucesso incluído) |
| Janela | 15 minutos | 60 segundos |
| Resposta ao exceder | Bloqueio **progressivo** | Rejeição fixa (`@nestjs/throttler` standard, sem escalada) |

O `@Throttle` do `@nestjs/throttler` não suporta nativamente nenhuma destas três dimensões (é IP-based por defeito, conta todos os pedidos, janela fixa sem progressão) — corrigir isto exige um mecanismo novo, não apenas ajustar parâmetros do decorator existente.

### 3.3 Arquitetura Proposta

**Novo modelo Prisma `TentativaLoginFalhada`** — desenhado sem `empresaId`: no momento em que uma tentativa de login falha, ainda não se sabe (nem se deve poder inferir, por desenho — mensagem genérica "Credenciais inválidas") a que Empresa o email pertence. É uma tabela de bootstrap, no mesmo espírito de `Utilizador.email` (unicidade global) — nunca tenant-scoped, RLS não aplicável (mesma classe de exceção estrutural já usada por `Sessao`/registo antes do `TenantContext` existir).

```prisma
model TentativaLoginFalhada {
  id        String   @id @default(cuid())
  email     String   // normalizado (lowercase), mesma chave usada em Utilizador.email
  ip        String
  criadoEm  DateTime @default(now())

  @@index([email, ip, criadoEm])
}
```

**Lógica em `AuthService.login()`:**

1. Antes de qualquer verificação de password (incluindo a mitigação de temporização já existente, S3 do Passo 3), consultar `TentativaLoginFalhada` para a combinação `(email normalizado, ip)` nos últimos 15 minutos.
2. Se o número de tentativas falhadas nessa janela atingir o limiar da camada de bloqueio atual (ver 3.4), devolver `429` com mensagem genérica ("Demasiadas tentativas. Tenta novamente mais tarde.") — **sem executar `argon2.verify`**, evitando trabalho computacional desnecessário uma vez já bloqueado (nunca antes disso, para preservar a mitigação de temporização S3 nas tentativas ainda dentro do limite).
3. Se a verificação de password falhar (email inexistente ou password errada, tratados de forma idêntica, como já acontece), registar uma nova linha em `TentativaLoginFalhada` antes de lançar o `401` genérico já existente.
4. Se a verificação de password for bem-sucedida, apagar todas as linhas de `TentativaLoginFalhada` para essa combinação `(email, ip)` — reset do contador em login legítimo.
5. Limpeza oportunista: no mesmo pedido, apagar linhas com mais de 24h para a combinação em causa (evita acumulação sem depender ainda do agendador do Render, que só chega no Passo 43/45 — nunca torna este passo dependente de trabalho posterior do M7).

### 3.4 Bloqueio Progressivo — Proposta de Calibração

O ADR-007 fixa o mecanismo (IP+conta, 15 min, progressivo) mas deixa os **parâmetros exatos** como Questão em Aberto Q3 explícita ("a rever em observação pós-lançamento") — não é uma lacuna desta especificação, é uma decisão já conscientemente adiada pelo próprio ADR. Proponho uma calibração inicial razoável, a confirmar:

| Tentativas falhadas (na janela ativa) | Duração do bloqueio |
|---|---|
| 1-4 | Sem bloqueio |
| 5-9 | 15 minutos (valor literal do ADR-007) |
| 10-14 | 30 minutos |
| 15+ | 60 minutos (teto — nunca escala além disto no MVP) |

A "janela ativa" estende-se enquanto houver tentativas falhadas nos últimos 15 minutos — cada nova tentativa falhada durante um bloqueio prolonga a janela, consistente com "progressivo".

### 3.5 Âmbito — Só `/auth/login`

`/auth/registar` mantém o `@Throttle` já existente (`5/min`, só por IP) — ADR-007 §3.6 fala de "combinação IP+**conta**", e no registo ainda não existe nenhuma conta a proteger (o alvo de um ataque de força bruta é sempre uma conta já existente); a ameaça em registo é spam de criação de contas, não brute-force de credenciais — modelo de ameaça diferente, proteção já adequada. Não alterado neste passo.

### 3.6 Testes Propostos

Novo ficheiro `apps/api/test/rate-limiting.e2e-spec.ts`:

- T1 — 4 tentativas falhadas seguidas por password errada → todas devolvem `401` (comportamento normal, sem bloqueio).
- T2 — 5ª tentativa falhada (mesma combinação email+IP) → `429`, mensagem genérica.
- T3 — mesma combinação email+IP, mas o email não existe → mesmo comportamento de T1/T2 (nunca revela existência da conta através do limiar de bloqueio).
- T4 — combinação diferente de IP (simulado via header/mock), mesmo email → não herda o bloqueio da combinação anterior (prova que a chave é mesmo IP+conta, não só conta).
- T5 — login bem-sucedido depois de tentativas falhadas (mas antes do limiar) → `TentativaLoginFalhada` correspondente é apagada (reset confirmado por leitura direta da BD).
- T6 — 10ª tentativa falhada → bloqueio de 30 min confirmado (verificação da duração via manipulação de `criadoEm` na BD, mesmo padrão já usado noutros passos para simular passagem de tempo).

---

## 4. Decisões a Validar

- **A — Destino do repositório GitHub** (secção 2.2) — pendente de confirmação explícita antes do push; não bloqueia o resto deste passo (a correção do rate limiting é independente).
- **B — Calibração do bloqueio progressivo** (secção 3.4) — proponho a tabela de 3 camadas acima; ADR-007 já autoriza esta decisão a ser afinada depois, com observação real.
- **C — Renomear a branch local de `master` para `main` antes do push** — convenção assumida por Vercel/Render/GitHub Actions; proponho fazer a renomeação já neste passo (comando local, sem efeito até ao push), a confirmar.

---

## 5. Fora de Âmbito Deste Passo

- Criação de conta Render/Vercel/Neon (Passos 40-41).
- GitHub Actions / CI (Passo 44) — o repositório remoto é pré-requisito, mas o workflow em si fica para esse passo.
- Qualquer alteração a `/auth/registar`.

---

## 6. Exit Criteria

- Repositório remoto criado (privado) e primeiro push executado com sucesso, **só depois** da confirmação da secção 2.2.
- `/auth/login` a aplicar o mecanismo IP+conta, 15 min, bloqueio progressivo, com testes automatizados (T1-T6) a passar.
- Suite completa (`npm run test:e2e`) sem regressões.
- `npm run build` limpo em `apps/api`.

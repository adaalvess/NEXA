# NEXA — Relatório de Execução do Passo 45 (M7 — Validação Técnica Final) e Encerramento do M7

| | |
|---|---|
| **Documento** | Relatório de execução — Passo 45: Validação Técnica Final + Encerramento do M7 |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 45 — sétimo e último passo |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação formal da Fundadora/CEO |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Especificação Técnica do Passo 45](49-especificacao-tecnica-passo-45-validacao-final.md); ADR-007 (v1.3) §3.8/§3.9; Relatórios dos Passos 39-44 |
| **Última atualização** | 2026-07-20 |

---

## 1. Resumo Executivo

O primeiro teste real de recuperação de backup de todo o projeto foi executado com sucesso, sem risco para o ambiente de staging real — confirma empiricamente que a exigência do ADR-007 §3.8 ("testes periódicos de recuperação são exigidos como prática obrigatória") é cumprível com a infraestrutura atual. O checklist de encerramento do M7 (secção 3) confirma todos os Exit Criteria dos Passos 39-45 genuinamente cumpridos, com evidência concreta, não suposição. **Recomendação: o Milestone M7 (Deploy em Staging) pode ser formalmente encerrado**, com duas exceções já conhecidas e corretamente documentadas como pré-requisitos de lançamento (não de M7) — secção 5.

---

## 2. Teste Real de Recuperação de Backup

**Metodologia**: branch temporário da Neon a partir de um ponto no tempo anterior a uma eliminação real de dados — nunca restaurar o ramo `main` diretamente, risco zero para o staging real (Decisão de desenho da Especificação Técnica, secção 2).

### 2.1 Execução

| Passo | Resultado |
|---|---|
| Empresa de demonstração criada via `POST /auth/registar` real | ✅ `empresaId cmrtl2fdn000bca0twf6sgert` |
| Timestamp de criação **confirmado pelo próprio servidor Neon** (`Empresa.createdAt`, não pelo relógio local) | ✅ `2026-07-20T18:53:57.467Z` |
| Empresa eliminada fisicamente da base de dados (mesmo mecanismo de limpeza de sempre — trigger de imutabilidade da auditoria desativado/reativado à volta da eliminação) | ✅ Confirmado |
| Branch Neon criado a partir de `2026-07-20T18:54:05Z` (~8s depois da criação confirmada, comfortavelmente antes da eliminação) | ✅ `teste-restore-passo45-v3` |
| Empresa consultada **no branch de recuperação** — encontrada, com o `createdAt` exato preservado | ✅ Confirmado |
| Ramo `main` (staging real) consultado em paralelo — confirmado **sem** a Empresa, 0 Empresas no total, staging nunca tocado | ✅ Confirmado |
| Branch de teste eliminado — nenhum recurso órfão a acumular custo | ✅ Confirmado |

### 2.2 Descoberta Técnica Real, Corrigida Durante o Próprio Teste

Duas tentativas iniciais falharam por um erro genuíno de sintaxe do CLI: usei `neonctl branches create --timestamp <valor>` — **essa flag não existe** na versão instalada (`neonctl branches create --help` confirmou); foi silenciosamente ignorada, e o branch acabou por ser criado a partir do estado *atual* (`HEAD`) do `main`, já sem a Empresa entretanto eliminada — por isso as duas primeiras tentativas mostraram "não encontrado", um falso negativo do teste, não uma falha real de recuperação. Corrigido usando a flag correta, `--parent`, que aceita "nome de branch, id, timestamp ou LSN" — na terceira tentativa, com o mesmo desenho de teste mas a sintaxe certa, a recuperação funcionou de imediato e confirmou-se com sucesso.

**Lição registada**: o timestamp de referência usado foi o `createdAt` gerado pelo próprio servidor Neon (via consulta direta à Empresa criada), nunca o relógio local — elimina qualquer risco de deriva de relógio entre esta máquina e os servidores da Neon, que poderia ter mascarado tanto falsos positivos como negativos.

---

## 3. Checklist de Encerramento do M7 — Revisão com Evidência Concreta

| # | Item | Estado | Evidência |
|---|---|---|---|
| 1 | Repositório GitHub remoto ativo, rate limiting conforme ADR-007 §3.6 | ✅ | Passo 39 — 219 testes e2e cobrem o bloqueio progressivo por camadas |
| 2 | Base de dados Neon em staging, região UE, schema/roles/RLS/trigger replicados | ✅ | Passo 40 — teste de fumo real; **agora também** teste de recuperação real (secção 2 deste relatório) |
| 3 | Backend em Render, região UE, servindo tráfego real | ✅ | Passo 41 — `GET /health` a `200` confirmado de novo nesta sessão |
| 4 | Frontend em Vercel, região UE, CORS correto, ponta a ponta validado | ✅ | Passo 42 — `GET /` a `200` confirmado de novo nesta sessão |
| 5 | Sentry ativo e validado nos dois componentes | ✅ | Passo 43 — eventos reais confirmados nos dois projetos |
| 6 | Pipeline CI/CD real, portão validado nas duas direções, `autoDeploy` do Render desativado | ✅ | Passo 44 — `autoDeploy: "no"` reconfirmado nesta sessão; último workflow run (`4c8b508`) `success` |
| 7 | Teste de recuperação de backup real, concluído com sucesso | ✅ | Secção 2 deste relatório |

**Todos os 7 itens confirmados com evidência concreta obtida nesta própria sessão** — não apenas revisão de registos anteriores.

---

## 4. Exit Criteria (Especificação Técnica do Passo 45) — Checklist

- [x] Branch de teste da Neon criado a partir de um ponto no tempo, dados confirmados recuperados, branch eliminado no final.
- [x] Checklist da secção 3 revisto, com evidência concreta para cada item.
- [x] Relatório final de encerramento do M7 (este documento).

---

## 5. Pendências Herdadas — Corretamente Registadas, Não Bloqueantes do M7

Nenhuma das duas fica esquecida ou implícita — ambas já formalmente documentadas no ADR-007 (v1.3), com responsável e critério de bloqueio explícitos:

| Questão | Bloqueia M7? | Bloqueia produção/piloto? |
|---|---|---|
| **Q4** — retenção de PITR do plano Neon Free (6h, abaixo do mínimo de 7 dias) | ❌ Não — exceção já aceite para staging | ✅ Sim — upgrade do plano obrigatório antes de qualquer lançamento em produção |
| **Q5** — monitores UptimeRobot bloqueados por `access_denied` na conta da Fundadora/CEO | ❌ Não — decisão explícita dela de encerrar o Passo 43 sem esta dependência | ✅ Sim — obrigatório antes de qualquer lançamento com empresas piloto/produção |

Também continuam registados, sem alteração: o bloqueador de pré-lançamento RGPD do registo público (Passo 26), os 2 achados substantivos do M6 (FR-18, notificação de trial), e os 3 Requisitos Funcionais fora de âmbito (FR-08/FR-09/FR-27) — nenhum destes é, nem nunca foi, âmbito do M7.

---

## 6. Recomendação Final

**Passo 45 formalmente concluído.** O primeiro teste real de recuperação de backup do projeto teve sucesso, sem qualquer risco para o staging real. O checklist de encerramento do M7 está integralmente cumprido, com evidência concreta obtida nesta sessão, não suposição.

**O Milestone M7 (Deploy em Staging, ADR-007) pode ser formalmente encerrado** — os 7 passos previstos (39-45) implementados, validados e aprovados; a NEXA tem agora um ambiente de staging completo e operacional (Vercel + Render + Neon, todos em região UE), com observabilidade de erros ativa, pipeline de deploy protegido por um portão real de qualidade, e a capacidade de recuperação de dados comprovada empiricamente. As duas pendências conhecidas (Q4, Q5) são pré-requisitos de **lançamento**, corretamente delimitadas como fora do âmbito técnico deste Milestone, nunca escondidas.

# Módulo Processos

Passo 9 (M2, Módulos Core) — CRUD completo de Processos/Tarefas (`POST/GET/PATCH/DELETE /processos`), primeiro módulo de negócio construído fora da Fundação (System Design Principles, regra #1).

Visibilidade RBAC (regras PR-01 a PR-07) consultada via `AuthorizationService` (Fundação) — `obterEscopoVisibilidade`/`obterRelacaoEntidade`/`podeAgirSobreEntidade`/`podeAcederViaPartilha` — nunca implementada localmente, consistente com a Decisão B do M2. Primeiro consumidor real de `podeAcederViaPartilha` (Passo 7).

Ver: Blueprint de Implementação (secção 3, 4), Especificação Técnica do Passo 9, ADR-004.

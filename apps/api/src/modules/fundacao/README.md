# Módulo Fundação

Passo 3 (Autenticação — registo/login), Passo 4 (Camada 1 — middleware de tenant, `TenantPrismaService`, RLS ativa), Passo 5 (RBAC granular — `AuthorizationService`, `RegraPermissao`, `PATCH /utilizadores/:id/papel`), Passo 6 (Registo de Auditoria — `GET /auditoria`, mecanismo orientado a eventos, trigger de imutabilidade) e Passo 7 (Partilha — `AuthorizationService.podeAcederViaPartilha`, `POST/DELETE/GET /partilhas`, regras P1-P5) implementados. **Milestone M1 (Fundação) formalmente concluído.**

Passo 8 (M2, Módulos Core) também implementado neste módulo: Departamento — CRUD completo (`/departamentos`) e atribuição a Utilizadores (`PATCH /utilizadores/:id/departamento`), regras RD-01 a RD-04.

Passo 9 estendeu o `AuthorizationService` com `obterRelacaoEntidade`/`podeAgirSobreEntidade`/`obterEscopoVisibilidade` (visibilidade RBAC centralizada, consumida pelo módulo `processos` e pelo `PartilhaService`, refatorado para as usar). `AuthorizationService`, `PermissaoGuard` e `SessionGuard` são agora exportados por este módulo, para consumo por qualquer módulo de negócio (Processos, CRM, e o seguinte Dashboard).

Passo 11 acrescentou o `NotificacaoListener` (`notificacao/`) — segundo consumidor do mesmo `EVENTO_AUDITORIA`, fire-and-forget, escreve `Notificacao` para 5 gatilhos mínimos. Sem endpoints próprios ainda — exposição ao Utilizador fica para o Passo 12 (Dashboard).

Ver: Blueprint de Implementação (secção 3, 3a, 4), Especificações Técnicas dos Passos 3 a 11, ADR-001, ADR-003, ADR-004.


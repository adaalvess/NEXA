# Módulo Dashboard

Passo 12 (M2, Módulos Core) — agregação read-only, sem entidade própria (Functional Specifications, 3.2): `GET /dashboard` (indicadores de Processos/Clientes/Notificações + estado inicial guiado, FR-11/FR-12), `GET /notificacoes` e `PATCH /notificacoes/:id/lida` (FR-36, exposição de Notificações herdada do Passo 11).

Terceiro módulo de negócio fora da Fundação (depois de Processos e CRM) — reutiliza integralmente `AuthorizationService.obterEscopoVisibilidade`, **zero lógica de visibilidade própria**, terceira confirmação prática da Decisão B do M2. Com este passo, o backend do M2 está concluído (Passos 8-12); os próximos passos (13-14) são de frontend.

Ver: Blueprint de Implementação (secção 3, 4), Especificação Técnica do Passo 12, ADR-004.

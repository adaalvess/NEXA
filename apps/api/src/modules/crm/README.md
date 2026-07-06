# Módulo CRM

Passo 10 (M2, Módulos Core) — CRUD de Cliente/Contacto/Oportunidade (`/clientes`, sem eliminação — decisão deliberada), registo de Interações (`POST/GET /clientes/:id/interacoes`), Pipeline (`GET /pipeline`).

Segundo módulo de negócio fora da Fundação (depois de Processos, Passo 9) — reutiliza integralmente `AuthorizationService.obterEscopoVisibilidade`/`obterRelacaoEntidade`/`podeAgirSobreEntidade`/`podeAcederViaPartilha`, **zero lógica de visibilidade própria**, confirmando na prática a Decisão B do M2 (centralização, sem duplicação entre módulos).

Ver: Blueprint de Implementação (secção 3, 4), Especificação Técnica do Passo 10, ADR-004.

import { Papel } from '@prisma/client';

/**
 * Matriz de permissões predefinida (Functional Specifications, 3.1 — Matriz
 * de Permissões, Fundação). Configuração de código (System Design
 * Principles, 3.5) — nunca `if`s espalhados pelos controladores. Uma Empresa
 * pode sobrepor qualquer entrada aqui via `RegraPermissao` (Especificação
 * Técnica do Passo 5, 3.2/3.3).
 *
 * `super_admin` só tem a entrada `consultar_auditoria` (Especificação
 * Técnica do Passo 6, 3.6) — não atua dentro de uma Empresa cliente para o
 * resto (Especificação Técnica do Passo 5, 2.1.A). A capacidade cross-tenant
 * real desta ação não vem desta matriz (que só decide "pode ou não"), vem do
 * `AuditoriaInternaService` (Passo 6, 3.4).
 */
export const DEFAULT_PERMISSION_MATRIX: Partial<Record<Papel, Record<string, Record<string, boolean>>>> = {
  [Papel.admin_empresa]: {
    fundacao: {
      criar_departamento: true,
      editar_permissoes: true,
      atribuir_papel: true,
      consultar_auditoria: true,
      // P1 (Especificação Técnica do Passo 7, 3.4) — sem restrição de instância.
      conceder_partilha: true,
      revogar_partilha: true,
      listar_partilhas: true,
      // Gestão de Departamento (Especificação Técnica do Passo 8, D3) —
      // exclusiva de admin_empresa, exceto listar (também Gestor, abaixo).
      listar_departamentos: true,
      editar_departamento: true,
      eliminar_departamento: true,
      atribuir_departamento: true,
      // Listagem reduzida de Utilizadores (Especificação Técnica do Passo
      // 14, 3.2.1) — só para popular seletores de responsável/owner nos
      // formulários de Processos/CRM, nunca uma pergunta de visibilidade
      // RBAC por entidade (não há "dono" de um Utilizador do ponto de vista
      // de posse).
      listar_utilizadores: true,
    },
    // Módulo de negócio próprio (Especificação Técnica do Passo 9, D4) —
    // distinto de `fundacao` (capacidades transversais). `ver` é o gate
    // estático; o âmbito real vem de `obterEscopoVisibilidade` (3.2 desse
    // documento), nunca só do guard.
    processos: {
      criar: true,
      ver: true,
      editar: true,
      eliminar: true,
    },
    // CR/IR (Especificação Técnica do Passo 10) — reutiliza obterEscopoVisibilidade/
    // podeAgirSobreEntidade, mesmo padrão de `processos`. `editar` cobre também
    // "Registar Interação" (D5 desse documento — mesmo âmbito na matriz aprovada).
    crm: {
      criar: true,
      ver: true,
      editar: true,
      ver_pipeline: true,
    },
    // Dashboard (Especificação Técnica do Passo 12) — tudo pessoal, sem
    // restrição adicional por papel; o escopo já vem de
    // obterEscopoVisibilidade/destinatarioId, nunca deste guard sozinho.
    dashboard: {
      ver: true,
      marcar_lida: true,
    },
    // Assistente de IA (Especificação Técnica do Passo 16) — Information
    // Architecture §3.4 (RBAC por área): admin vê a Empresa toda.
    // gerar_sugestoes/confirmar_sugestao/rejeitar_sugestao (Especificação
    // Técnica do Passo 17, 3.6/Decisão D) — sem restrição de instância.
    ia: {
      perguntar: true,
      gerar_sugestoes: true,
      confirmar_sugestao: true,
      rejeitar_sugestao: true,
      // listar_sugestoes (Especificação Técnica do Passo 18, 3.1/Decisão A)
      // — mesma granularidade das outras 3 ações de sugestão.
      listar_sugestoes: true,
    },
    // Comercial (Especificação Técnica do Passo 19, 3.6/Decisão F) — só
    // admin_empresa; nenhum UC aprovado descreve outro papel a interagir
    // com planos/faturação.
    comercial: {
      ver_planos: true,
    },
  },
  [Papel.gestor]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      // RN-03 — âmbito (só a sua equipa) verificado à parte, não aqui
      // (Especificação Técnica do Passo 5, 3.4, L3).
      atribuir_papel: true,
      consultar_auditoria: false,
      // P2 — âmbito (só o seu Departamento) verificado à parte, não aqui.
      conceder_partilha: true,
      revogar_partilha: true,
      listar_partilhas: true,
      // Único caso em que Gestor participa na gestão de Departamento —
      // precisa de contexto de estrutura para operar (Passo 8, D3).
      listar_departamentos: true,
      editar_departamento: false,
      eliminar_departamento: false,
      atribuir_departamento: false,
      // Gestor também precisa de escolher responsável/owner ao criar
      // Processos/Clientes para a sua equipa (Passo 14, 3.2.1).
      listar_utilizadores: true,
    },
    processos: {
      criar: true,
      ver: true,
      // PR-02 — âmbito (só o seu Departamento) verificado à parte, não aqui.
      editar: true,
      eliminar: true,
    },
    crm: {
      criar: true,
      ver: true,
      // CR-02 — âmbito (só o seu Departamento) verificado à parte, não aqui.
      editar: true,
      ver_pipeline: true,
    },
    dashboard: {
      ver: true,
      marcar_lida: true,
    },
    // Âmbito: a sua equipa (Information Architecture §3.4).
    // gerar_sugestoes/confirmar_sugestao/rejeitar_sugestao (Passo 17,
    // Decisão D) — âmbito restrito ao seu Departamento, herdado de
    // `obterEscopoVisibilidade`/`ProcessosService.editar`.
    ia: {
      perguntar: true,
      gerar_sugestoes: true,
      confirmar_sugestao: true,
      rejeitar_sugestao: true,
      listar_sugestoes: true,
    },
    comercial: {
      ver_planos: false,
    },
  },
  [Papel.colaborador]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      atribuir_papel: false,
      consultar_auditoria: false,
      // P3 — só sobre entidades de que é diretamente owner/responsável,
      // verificado à parte, não aqui.
      conceder_partilha: true,
      revogar_partilha: true,
      listar_partilhas: true,
      listar_departamentos: false,
      editar_departamento: false,
      eliminar_departamento: false,
      atribuir_departamento: false,
      // Colaborador cria sempre Processos/Clientes para si próprio — nunca
      // precisa de escolher responsável/owner entre terceiros (Passo 14, 3.2.1).
      listar_utilizadores: false,
    },
    processos: {
      criar: true,
      ver: true,
      // PR-03 — só sobre entidades de que é diretamente responsável, verificado à parte.
      editar: true,
      // PR-07 — Colaborador nunca elimina, nem os seus próprios.
      eliminar: false,
    },
    crm: {
      criar: true,
      ver: true,
      // CR-03 — só sobre Clientes de que é diretamente owner, verificado à parte.
      editar: true,
      // Functional Specifications 3.4 — "Não aplicável" para Colaborador.
      ver_pipeline: false,
    },
    dashboard: {
      ver: true,
      marcar_lida: true,
    },
    // Âmbito: o seu próprio (Information Architecture §3.4).
    // gerar_sugestoes/confirmar_sugestao/rejeitar_sugestao: `false` (Passo
    // 17, Decisão D) — Colaborador estruturalmente incapaz de reatribuir
    // Processos a terceiros (`ProcessosService.editar` já o impede), nunca
    // conseguiria executar esta ação de qualquer forma.
    ia: {
      perguntar: true,
      gerar_sugestoes: false,
      confirmar_sugestao: false,
      rejeitar_sugestao: false,
      listar_sugestoes: false,
    },
    comercial: {
      ver_planos: false,
    },
  },
  [Papel.convidado]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      atribuir_papel: false,
      consultar_auditoria: false,
      // P4 — nunca pode conceder/revogar. `listar_partilhas: true` só concede
      // ver as que lhe foram concedidas a ele (Especificação Técnica do
      // Passo 7, 3.6); `processos.ver` (abaixo) segue o mesmo padrão — a
      // única entidade de negócio que o Convidado vê é via Partilha
      // (`obterEscopoVisibilidade`/`podeAcederViaPartilha`, Passo 9).
      conceder_partilha: false,
      revogar_partilha: false,
      listar_partilhas: true,
      listar_departamentos: false,
      editar_departamento: false,
      eliminar_departamento: false,
      atribuir_departamento: false,
      // Convidado nunca cria Processos/Clientes (Passo 14, 3.2.1).
      listar_utilizadores: false,
    },
    processos: {
      criar: false,
      // PR-04 — âmbito real vem de podeAcederViaPartilha, não deste guard.
      ver: true,
      editar: false,
      eliminar: false,
    },
    crm: {
      criar: false,
      // CR-04 — âmbito real vem de podeAcederViaPartilha, não deste guard.
      ver: true,
      editar: false,
      ver_pipeline: false,
    },
    dashboard: {
      ver: true,
      marcar_lida: true,
    },
    // "Não aplicável" (Information Architecture §3.4) — Convidado nunca usa
    // o Assistente de IA.
    ia: {
      perguntar: false,
      gerar_sugestoes: false,
      confirmar_sugestao: false,
      rejeitar_sugestao: false,
      listar_sugestoes: false,
    },
    comercial: {
      ver_planos: false,
    },
  },
  [Papel.super_admin]: {
    fundacao: {
      consultar_auditoria: true,
    },
  },
};

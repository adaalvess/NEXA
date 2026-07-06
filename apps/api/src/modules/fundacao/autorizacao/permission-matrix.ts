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
    },
    processos: {
      criar: true,
      ver: true,
      // PR-02 — âmbito (só o seu Departamento) verificado à parte, não aqui.
      editar: true,
      eliminar: true,
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
    },
    processos: {
      criar: true,
      ver: true,
      // PR-03 — só sobre entidades de que é diretamente responsável, verificado à parte.
      editar: true,
      // PR-07 — Colaborador nunca elimina, nem os seus próprios.
      eliminar: false,
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
    },
    processos: {
      criar: false,
      // PR-04 — âmbito real vem de podeAcederViaPartilha, não deste guard.
      ver: true,
      editar: false,
      eliminar: false,
    },
  },
  [Papel.super_admin]: {
    fundacao: {
      consultar_auditoria: true,
    },
  },
};

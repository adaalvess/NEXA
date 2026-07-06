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
  },
  [Papel.convidado]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      atribuir_papel: false,
      consultar_auditoria: false,
      // P4 — nunca pode conceder/revogar. `listar_partilhas: true` é a única
      // entrada `true` do Convidado em toda a matriz — só vê as que lhe foram
      // concedidas a ele (Especificação Técnica do Passo 7, 3.6).
      conceder_partilha: false,
      revogar_partilha: false,
      listar_partilhas: true,
      listar_departamentos: false,
      editar_departamento: false,
      eliminar_departamento: false,
      atribuir_departamento: false,
    },
  },
  [Papel.super_admin]: {
    fundacao: {
      consultar_auditoria: true,
    },
  },
};

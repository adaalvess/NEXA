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
    },
  },
  [Papel.colaborador]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      atribuir_papel: false,
      consultar_auditoria: false,
    },
  },
  [Papel.convidado]: {
    fundacao: {
      criar_departamento: false,
      editar_permissoes: false,
      atribuir_papel: false,
      consultar_auditoria: false,
    },
  },
  [Papel.super_admin]: {
    fundacao: {
      consultar_auditoria: true,
    },
  },
};

import { SetMetadata } from '@nestjs/common';

export const PERMISSAO_METADATA_KEY = 'permissao';

export interface PermissaoRequerida {
  modulo: string;
  acao: string;
}

/**
 * Declara a permissão (módulo + ação) exigida por um handler — consultada
 * pelo `PermissaoGuard`, nunca verificada diretamente no controlador
 * (regra não-negociável #13).
 */
export const RequirePermissao = (modulo: string, acao: string) =>
  SetMetadata(PERMISSAO_METADATA_KEY, { modulo, acao } satisfies PermissaoRequerida);

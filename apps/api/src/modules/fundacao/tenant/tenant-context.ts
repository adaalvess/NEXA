import { AsyncLocalStorage } from 'node:async_hooks';
import type { Papel } from '@prisma/client';

/**
 * Contexto de tenant ativo para o pedido em curso (Especificação Técnica do
 * Passo 4, 3.2.2). Populado uma única vez por pedido pelo
 * `TenantContextMiddleware` — nunca pelo `SessionGuard`, que apenas o
 * consulta (sem duplicar a resolução de sessão).
 */
export interface TenantContextValue {
  utilizadorId: string;
  empresaId: string;
  papel: Papel;
}

export const tenantContext = new AsyncLocalStorage<TenantContextValue>();

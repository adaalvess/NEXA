'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';

/**
 * Logout (validação da Sub-entrega 1 do Passo 14) — invalida a Sessao no
 * servidor (`POST /auth/logout`), limpa toda a cache do TanStack Query
 * (nenhum dado da Empresa anterior deve sobreviver na memória do cliente)
 * e força uma navegação completa para `/login`, não só client-side, para
 * que o Server Component do grupo `(autenticado)` deixe de estar montado.
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function sair() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/login');
    router.refresh();
  };
}

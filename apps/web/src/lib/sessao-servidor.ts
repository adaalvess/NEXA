import { cookies } from 'next/headers';
import type { Sessao } from './sessao-context';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Verificação de sessão do lado do servidor (Especificação Técnica do Passo
 * 14, 3.4) — chama `GET /auth/eu` (Passo 3) reencaminhando o cookie do
 * pedido original; o backend continua a ser a única fonte de verdade sobre
 * quem está autenticado, nunca uma decisão local do frontend.
 */
export async function obterSessaoServidor(): Promise<Sessao | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) {
    return null;
  }

  const res = await fetch(new URL('/auth/eu', BASE_URL), {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<Sessao>;
}

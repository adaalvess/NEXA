import { redirect } from 'next/navigation';
import { obterSessaoServidor } from '../lib/sessao-servidor';

/**
 * A Landing Page real (Blueprint, secção 5.2, Milestone M5) fica para mais
 * tarde — por agora, a raiz só redireciona consoante a sessão (Especificação
 * Técnica do Passo 14, 3.3), substituindo o placeholder do Passo 1.
 */
export default async function Home() {
  const sessao = await obterSessaoServidor();
  redirect(sessao ? '/dashboard' : '/login');
}

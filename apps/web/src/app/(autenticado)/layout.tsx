import { redirect } from 'next/navigation';
import { obterSessaoServidor } from '../../lib/sessao-servidor';
import { SessaoProvider } from '../../lib/sessao-context';
import { BarraLateralNavegacao } from '../../components/layout/BarraLateralNavegacao';

/**
 * Shell autenticado (Especificação Técnica do Passo 14, 3.3/3.4) — verifica
 * a sessão uma única vez por navegação (Server Component) e redireciona
 * para `/login` se não autenticado; nenhum ecrã filho repete esta lógica.
 */
export default async function AutenticadoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoServidor();
  if (!sessao) {
    redirect('/login');
  }

  return (
    <SessaoProvider sessao={sessao}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <BarraLateralNavegacao />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </SessaoProvider>
  );
}

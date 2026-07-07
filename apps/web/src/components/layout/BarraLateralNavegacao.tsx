'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, Users, GitBranch, Menu, X as IconeFechar, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSessao } from '../../lib/sessao-context';
import { useLogout } from '../../lib/use-logout';

interface ItemNav {
  rotulo: string;
  href: string;
  icone: typeof LayoutDashboard;
}

function Conteudo({ itens, pathname, papel, onNavegar }: { itens: ItemNav[]; pathname: string; papel: string; onNavegar?: () => void }) {
  const sair = useLogout();

  return (
    <>
      <div className="mb-8 px-2">
        <span className="font-display text-h3 text-nexa-white">
          NE<span className="text-nexa-purple">X</span>A
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {itens.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavegar}
              className={cn(
                'flex items-center gap-3 rounded px-3 py-2 text-small font-medium transition-colors',
                ativo ? 'bg-nexa-purple/20 text-nexa-white' : 'text-nexa-gray hover:bg-nexa-black hover:text-nexa-white',
              )}
            >
              <Icone className="h-4 w-4" aria-hidden />
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-nexa-slate/20 px-2 pt-4">
        <p className="mb-2 text-caption text-nexa-gray">{papel}</p>
        <button
          type="button"
          onClick={() => sair()}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-small font-medium text-nexa-gray hover:bg-nexa-black hover:text-nexa-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sair
        </button>
      </div>
    </>
  );
}

/**
 * Navegação principal da aplicação autenticada (Especificação Técnica do
 * Passo 14, 3.1/3.3) — só os módulos já implementados (Dashboard, Processos,
 * CRM). Itens condicionados por RBAC simplesmente não aparecem, nunca
 * mostrados-mas-desativados (Information Architecture, §3.2.3) — por isso o
 * link do Pipeline só aparece para quem `ver_pipeline` permite (Functional
 * Specifications §3.4).
 *
 * Responsivo (NFR-13): em ecrãs `< md`, a barra lateral fica fora do fluxo
 * (drawer sobreposto, aberto por um botão de menu) em vez de espremer o
 * conteúdo principal com uma largura fixa — descoberta feita na validação
 * visual deste passo, não prevista literalmente na especificação.
 */
export function BarraLateralNavegacao() {
  const pathname = usePathname();
  const { papel } = useSessao();
  const [abertoMobile, setAbertoMobile] = useState(false);

  const itens: ItemNav[] = [
    { rotulo: 'Dashboard', href: '/dashboard', icone: LayoutDashboard },
    { rotulo: 'Processos', href: '/processos', icone: ListChecks },
    { rotulo: 'CRM', href: '/crm', icone: Users },
  ];

  if (papel === 'admin_empresa' || papel === 'gestor') {
    itens.push({ rotulo: 'Pipeline', href: '/crm/pipeline', icone: GitBranch });
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-nexa-slate/20 bg-nexa-charcoal p-4 md:hidden">
        <span className="font-display text-h3 text-nexa-white">
          NE<span className="text-nexa-purple">X</span>A
        </span>
        <button
          type="button"
          aria-label="Abrir menu de navegação"
          onClick={() => setAbertoMobile(true)}
          className="rounded p-1 text-nexa-white hover:bg-nexa-black"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {abertoMobile && (
        <div className="fixed inset-0 z-40 bg-nexa-black/60 md:hidden" onClick={() => setAbertoMobile(false)}>
          <aside
            className="flex h-full w-64 flex-col bg-nexa-charcoal p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() => setAbertoMobile(false)}
              className="mb-4 self-end rounded p-1 text-nexa-gray hover:bg-nexa-black hover:text-nexa-white"
            >
              <IconeFechar className="h-5 w-5" aria-hidden />
            </button>
            <Conteudo itens={itens} pathname={pathname} papel={papel} onNavegar={() => setAbertoMobile(false)} />
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-nexa-slate/20 bg-nexa-charcoal p-4 md:flex">
        <Conteudo itens={itens} pathname={pathname} papel={papel} />
      </aside>
    </>
  );
}

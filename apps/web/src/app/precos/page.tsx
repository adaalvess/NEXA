import Link from 'next/link';
import { Cartao } from '../../components/ui/Cartao';
import { api } from '../../lib/api';
import type { Plano, PlanoConfig } from '../../lib/tipos';

// Sem isto, o Next.js pré-renderia esta página estaticamente no build,
// congelando para sempre a resposta de `GET /planos/publico` obtida nesse
// momento (ou o estado de erro, se a API não estivesse acessível durante o
// build) — os planos passariam a ficar desatualizados sem novo deploy,
// mesmo que `PLANOS_CONFIG` mude. Força um pedido real em cada acesso.
export const dynamic = 'force-dynamic';

const ROTULOS_PLANO: Record<Plano, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

function formatarLimite(valor: number | null, sufixo = ''): string {
  return valor === null ? 'Ilimitado' : `${valor}${sufixo}`;
}

/**
 * Página pública de Preços (Especificação Técnica do Passo 24, 3.2) —
 * primeiro passo do M5, Bloco A. Server Component (Decisão D2) — conteúdo
 * público, só de leitura, sem necessidade de refetch no cliente; `fetch`
 * feito através do cliente único `api()` (nunca `fetch` direto num ecrã,
 * Especificação Técnica do Passo 14, 3.4), mesmo sem sessão.
 *
 * CTA de cada plano aponta para `/login` nesta fase (Decisão D1) —
 * `/registar` só existe a partir do Passo 26.
 */
export default async function PaginaPrecos() {
  let planos: PlanoConfig[] | null = null;
  let erro = false;

  try {
    planos = await api<PlanoConfig[]>('/planos/publico');
  } catch {
    erro = true;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="text-center">
        <span className="font-display text-h2 text-nexa-white">
          NE<span className="text-nexa-purple">X</span>A
        </span>
        <h1 className="mt-4 font-display text-h1 text-nexa-white">Preços</h1>
        <p className="mt-2 text-body text-nexa-gray">Escolhe o plano certo para a tua Empresa.</p>
      </div>

      {erro && <p className="text-center text-body text-nexa-gray">Não foi possível carregar os planos. Tenta novamente mais tarde.</p>}

      {planos && (
        <div className="grid gap-4 md:grid-cols-3">
          {planos.map((p) => (
            <Cartao key={p.plano} className="space-y-4">
              <p className="font-display text-h3 text-nexa-white">{ROTULOS_PLANO[p.plano]}</p>
              <div className="space-y-2">
                <p className="text-small text-nexa-gray">Utilizadores: {formatarLimite(p.limiteUtilizadores)}</p>
                <p className="text-small text-nexa-gray">Armazenamento: {formatarLimite(p.limiteArmazenamentoMb, ' MB')}</p>
                <p className="text-small text-nexa-gray">IA/mês: {formatarLimite(p.limiteUsoIA)}</p>
              </div>
              <Link
                href="/login"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-gradient-to-br from-nexa-purple to-nexa-violet px-4 text-body font-medium text-nexa-white shadow-glow-purple transition-colors hover:brightness-110"
              >
                Começar
              </Link>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  );
}

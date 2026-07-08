'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Botao } from '../../../components/ui/Botao';
import { Cartao } from '../../../components/ui/Cartao';
import { BadgeEstado } from '../../../components/ui/BadgeEstado';
import { api, ApiError } from '../../../lib/api';
import type { Plano, PlanoConfig, ResumoSubscricao } from '../../../lib/tipos';

const ROTULOS_PLANO: Record<Plano, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

// Só Starter/Professional têm checkout self-service (Especificação Técnica
// do Passo 21, Decisão A) — Enterprise nunca aparece como opção de upgrade
// aqui, mesmo estando listado em `GET /planos`.
const PLANOS_COM_CHECKOUT: Plano[] = ['starter', 'professional'];

function formatarLimite(valor: number | null, sufixo = ''): string {
  return valor === null ? 'Ilimitado' : `${valor}${sufixo}`;
}

/**
 * Ecrã de Subscrição (Especificação Técnica do Passo 23) — plano atual,
 * estado, uso de IA e upgrade via Stripe Checkout. Todos os valores
 * apresentados vêm exatamente de `GET /subscricao`/`GET /planos`, sem
 * nenhum cálculo paralelo no cliente (requisito explícito da Fundadora/
 * CEO) — `usoIAPercentagem`/`avisoLimiteIAProximo`/`diasRestantesTrial` são
 * lidos diretamente da resposta da API. O upgrade usa exclusivamente
 * `POST /subscricao/checkout` (Passo 21), nunca lógica duplicada.
 *
 * Nunca alcançável pela navegação para quem não é `admin_empresa`
 * (`BarraLateralNavegacao`) — só por URL direto; a API continua a ser
 * sempre quem decide (ADR-006 §3.7), este ecrã só trata o `403` com uma
 * mensagem, nunca um crash (mesmo padrão do Pipeline/Assistente de IA).
 */
export default function PaginaSubscricao() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');

  const {
    data: resumo,
    isLoading: carregandoResumo,
    error: erroResumo,
  } = useQuery({
    queryKey: ['subscricao'],
    queryFn: () => api<ResumoSubscricao>('/subscricao'),
    retry: false,
  });

  const {
    data: planos,
    isLoading: carregandoPlanos,
  } = useQuery({
    queryKey: ['planos'],
    queryFn: () => api<PlanoConfig[]>('/planos'),
    retry: false,
    enabled: !!resumo && resumo.estadoEfetivo !== 'ativa',
  });

  const checkoutMutation = useMutation({
    mutationFn: (plano: Plano) => api<{ url: string }>('/subscricao/checkout', { method: 'POST', body: { plano } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  if (erroResumo) {
    const mensagem =
      erroResumo instanceof ApiError && erroResumo.status === 403
        ? 'Não tens permissão para ver o Plano da Empresa.'
        : 'Não foi possível carregar a subscrição.';
    return <div className="p-8 text-body text-nexa-gray">{mensagem}</div>;
  }

  if (carregandoResumo || !resumo) {
    return <div className="p-8 text-body text-nexa-gray">A carregar...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Plano</h1>

      {checkout === 'sucesso' && (
        <p className="rounded-lg border border-success/30 bg-success/10 p-4 text-small text-success">
          Subscrição confirmada com sucesso.
        </p>
      )}
      {checkout === 'cancelado' && (
        <p className="rounded-lg border border-nexa-slate/20 bg-nexa-charcoal p-4 text-small text-nexa-gray">
          O processo de checkout foi cancelado. O plano atual mantém-se inalterado.
        </p>
      )}

      <Cartao className="space-y-2">
        <h2 className="font-display text-h3 text-nexa-white">Plano atual</h2>
        <div className="flex items-center gap-3">
          <p className="text-body-lg text-nexa-white">{ROTULOS_PLANO[resumo.plano]}</p>
          <BadgeEstado estado={resumo.estadoEfetivo} />
        </div>
        {resumo.diasRestantesTrial !== null && (
          <p className="text-small text-nexa-gray">
            {resumo.diasRestantesTrial} {resumo.diasRestantesTrial === 1 ? 'dia restante' : 'dias restantes'} de trial.
          </p>
        )}
      </Cartao>

      <Cartao className="space-y-2">
        <h2 className="font-display text-h3 text-nexa-white">Uso de IA este mês</h2>
        <p className="text-body text-nexa-white">
          {resumo.usoIAMensalAtual} / {formatarLimite(resumo.limiteUsoIA)}
        </p>
        {resumo.avisoLimiteIAProximo && (
          <p className="text-small text-warning">Estás perto do limite mensal de uso de IA ({resumo.usoIAPercentagem}%).</p>
        )}
      </Cartao>

      <Cartao className="space-y-2">
        <h2 className="font-display text-h3 text-nexa-white">Limites do plano</h2>
        <p className="text-small text-nexa-gray">Utilizadores: {formatarLimite(resumo.limiteUtilizadores)}</p>
        <p className="text-small text-nexa-gray">Armazenamento: {formatarLimite(resumo.limiteArmazenamentoMb, ' MB')}</p>
      </Cartao>

      {resumo.estadoEfetivo !== 'ativa' && (
        <section className="space-y-4">
          <h2 className="font-display text-h3 text-nexa-white">Fazer upgrade</h2>

          {checkoutMutation.isError && <p className="text-small text-error">Não foi possível iniciar o checkout. Tenta novamente.</p>}

          {carregandoPlanos || !planos ? (
            <p className="text-small text-nexa-gray">A carregar planos...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {planos
                .filter((p) => PLANOS_COM_CHECKOUT.includes(p.plano))
                .map((p) => (
                  <Cartao key={p.plano} className="space-y-3">
                    <p className="text-body-lg text-nexa-white">{ROTULOS_PLANO[p.plano]}</p>
                    <p className="text-small text-nexa-gray">Utilizadores: {formatarLimite(p.limiteUtilizadores)}</p>
                    <p className="text-small text-nexa-gray">Armazenamento: {formatarLimite(p.limiteArmazenamentoMb, ' MB')}</p>
                    <p className="text-small text-nexa-gray">IA/mês: {formatarLimite(p.limiteUsoIA)}</p>
                    <Botao
                      carregando={checkoutMutation.isPending && checkoutMutation.variables === p.plano}
                      disabled={checkoutMutation.isPending}
                      onClick={() => checkoutMutation.mutate(p.plano)}
                    >
                      Escolher
                    </Botao>
                  </Cartao>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

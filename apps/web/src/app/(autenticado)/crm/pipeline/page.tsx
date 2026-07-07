'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Cartao } from '../../../../components/ui/Cartao';
import { api, ApiError } from '../../../../lib/api';
import type { Pipeline, EstadoOportunidade } from '../../../../lib/tipos';

const COLUNAS: { valor: EstadoOportunidade; rotulo: string }[] = [
  { valor: 'prospecao', rotulo: 'Prospeção' },
  { valor: 'negociacao', rotulo: 'Negociação' },
  { valor: 'fechada_ganha', rotulo: 'Fechada — Ganha' },
  { valor: 'fechada_perdida', rotulo: 'Fechada — Perdida' },
];

/**
 * Pipeline Comercial (Especificação Técnica do Passo 14, 3.9) — `GET
 * /pipeline` já devolve o objeto por estado, escopado por papel (Passo 10);
 * oculto da navegação (`BarraLateralNavegacao`) para colaborador/convidado,
 * mas esta página trata um `403` diretamente na API com uma mensagem, nunca
 * um crash — o frontend nunca é o mecanismo de segurança (ADR-006 §3.7).
 */
export default function PaginaPipeline() {
  const router = useRouter();

  const { data: pipeline, isLoading, error } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => api<Pipeline>('/pipeline'),
    retry: false,
  });

  if (error) {
    const mensagem = error instanceof ApiError && error.status === 403 ? 'Não tens permissão para ver o Pipeline Comercial.' : 'Não foi possível carregar o Pipeline.';
    return <div className="p-8 text-body text-nexa-gray">{mensagem}</div>;
  }

  if (isLoading || !pipeline) {
    return <div className="p-8 text-body text-nexa-gray">A carregar...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Pipeline Comercial</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {COLUNAS.map((coluna) => (
          <div key={coluna.valor} className="space-y-3">
            <h2 className="text-small font-medium text-nexa-gray">
              {coluna.rotulo} ({pipeline[coluna.valor].length})
            </h2>
            <div className="space-y-2">
              {pipeline[coluna.valor].map((cliente) => (
                <Cartao key={cliente.id} interativo onClick={() => router.push(`/crm/${cliente.id}`)}>
                  <p className="text-small text-nexa-white">{cliente.nome}</p>
                </Cartao>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

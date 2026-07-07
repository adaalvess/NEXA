'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TabelaDados } from '../../../components/ui/TabelaDados';
import { BadgeEstado } from '../../../components/ui/BadgeEstado';
import { Botao } from '../../../components/ui/Botao';
import { api } from '../../../lib/api';
import { useSessao } from '../../../lib/sessao-context';
import type { Cliente } from '../../../lib/tipos';

const ROTULOS_TIPO: Record<Cliente['tipo'], string> = {
  empresa_cliente: 'Empresa Cliente',
  contacto_individual: 'Contacto Individual',
};

/**
 * Lista de Clientes (Especificação Técnica do Passo 14, 3.9) — `GET
 * /clientes` já devolve o array escopado por `obterEscopoVisibilidade`
 * (Passo 9/10, zero alterações ao `AuthorizationService`).
 */
export default function PaginaListaClientes() {
  const router = useRouter();
  const { papel } = useSessao();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api<Cliente[]>('/clientes'),
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-nexa-white">CRM</h1>
        {papel !== 'convidado' && <Botao onClick={() => router.push('/crm/novo')}>Novo Cliente</Botao>}
      </div>

      <TabelaDados<Cliente>
        colunas={[
          {
            chave: 'nome',
            cabecalho: 'Nome',
            render: (c) => (
              <button onClick={() => router.push(`/crm/${c.id}`)} className="text-left text-nexa-white hover:text-nexa-violet">
                {c.nome}
              </button>
            ),
          },
          { chave: 'tipo', cabecalho: 'Tipo', render: (c) => ROTULOS_TIPO[c.tipo] },
          { chave: 'contacto', cabecalho: 'Contacto Principal', render: (c) => c.contactoPrincipal ?? '—' },
          {
            chave: 'estadoOportunidade',
            cabecalho: 'Oportunidade',
            render: (c) => (c.estadoOportunidade ? <BadgeEstado estado={c.estadoOportunidade} /> : '—'),
          },
        ]}
        linhas={clientes ?? []}
        chaveLinha={(c) => c.id}
        carregando={isLoading}
        estadoVazio={{
          titulo: 'Ainda não há Clientes',
          descricao: 'Regista o teu primeiro Cliente para começares a construir o teu CRM.',
          acaoLabel: 'Criar Cliente',
          onAcao: () => router.push('/crm/novo'),
        }}
      />
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TabelaDados } from '../../../components/ui/TabelaDados';
import { BadgeEstado } from '../../../components/ui/BadgeEstado';
import { Botao } from '../../../components/ui/Botao';
import { api } from '../../../lib/api';
import { useSessao } from '../../../lib/sessao-context';
import type { Processo, Utilizador } from '../../../lib/tipos';

/**
 * Lista de Processos (Especificação Técnica do Passo 14, 3.8) — `GET
 * /processos` já devolve o array escopado por `obterEscopoVisibilidade`
 * (Passo 9); esta página nunca filtra por papel, só apresenta.
 */
export default function PaginaListaProcessos() {
  const router = useRouter();
  const { papel, utilizadorId } = useSessao();

  const { data: processos, isLoading } = useQuery({
    queryKey: ['processos'],
    queryFn: () => api<Processo[]>('/processos'),
  });

  // GET /utilizadores exige `fundacao.listar_utilizadores` (só admin/gestor,
  // Passo 14 3.2.1) — colaborador/convidado nunca o veem pedir, evitando um
  // 403 desnecessário; a coluna "Responsável" cai para "Você"/"—" nesse caso.
  const podeListarUtilizadores = papel === 'admin_empresa' || papel === 'gestor';
  const { data: utilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
    enabled: podeListarUtilizadores,
  });

  function nomeResponsavel(responsavelId: string): string {
    if (responsavelId === utilizadorId) return 'Você';
    return utilizadores?.find((u) => u.id === responsavelId)?.nome ?? '—';
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-nexa-white">Processos</h1>
        {papel !== 'convidado' && <Botao onClick={() => router.push('/processos/novo')}>Novo Processo</Botao>}
      </div>

      <TabelaDados<Processo>
        colunas={[
          {
            chave: 'titulo',
            cabecalho: 'Título',
            render: (p) => (
              <button onClick={() => router.push(`/processos/${p.id}`)} className="text-left text-nexa-white hover:text-nexa-violet">
                {p.titulo}
              </button>
            ),
          },
          { chave: 'responsavel', cabecalho: 'Responsável', render: (p) => nomeResponsavel(p.responsavelId) },
          { chave: 'estado', cabecalho: 'Estado', render: (p) => <BadgeEstado estado={p.estado} /> },
          { chave: 'prazo', cabecalho: 'Prazo', render: (p) => (p.prazo ? new Date(p.prazo).toLocaleDateString('pt-PT') : '—') },
        ]}
        linhas={processos ?? []}
        chaveLinha={(p) => p.id}
        carregando={isLoading}
        estadoVazio={{
          titulo: 'Ainda não há Processos',
          descricao: 'Cria o teu primeiro Processo para começares a organizar o trabalho da tua equipa.',
          acaoLabel: 'Criar Processo',
          onAcao: () => router.push('/processos/novo'),
        }}
      />
    </div>
  );
}

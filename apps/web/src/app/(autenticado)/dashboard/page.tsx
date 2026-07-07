'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Cartao } from '../../../components/ui/Cartao';
import { Botao } from '../../../components/ui/Botao';
import { EstadoVazioGuiado } from '../../../components/ui/EstadoVazioGuiado';
import { api } from '../../../lib/api';

interface RespostaDashboardVazio {
  estadoInicial: true;
  sugestoes: { acao: 'criar_processo' | 'criar_cliente'; modulo: string }[];
}

interface RespostaDashboardNormal {
  estadoInicial?: false;
  processos: { total: number; porEstado: { por_fazer: number; em_curso: number; concluida: number }; emAtraso: number };
  clientes: { total: number; comOportunidadeAtiva: number };
  notificacoes: { naoLidas: number };
}

type RespostaDashboard = RespostaDashboardVazio | RespostaDashboardNormal;

interface Notificacao {
  id: string;
  tipoEvento: string;
  lida: boolean;
  createdAt: string;
}

const SUGESTOES: Record<string, { titulo: string; descricao: string; acaoLabel: string; rota: string }> = {
  criar_processo: {
    titulo: 'Ainda não há Processos',
    descricao: 'Cria o teu primeiro Processo para começares a organizar o trabalho da tua equipa.',
    acaoLabel: 'Criar Processo',
    rota: '/processos/novo',
  },
  criar_cliente: {
    titulo: 'Ainda não há Clientes',
    descricao: 'Regista o teu primeiro Cliente para começares a construir o teu CRM.',
    acaoLabel: 'Criar Cliente',
    rota: '/crm/novo',
  },
};

export default function PaginaDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // NFR-04 (Functional Specifications §3.2) — atraso máximo de 30 segundos.
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<RespostaDashboard>('/dashboard'),
    refetchInterval: 30_000,
  });

  const { data: notificacoes } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => api<Notificacao[]>('/notificacoes', { query: { take: 10 } }),
  });

  const marcarLida = useMutation({
    mutationFn: (id: string) => api(`/notificacoes/${id}/lida`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading || !dashboard) {
    return <div className="p-8 text-body text-nexa-gray">A carregar...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Dashboard</h1>

      {dashboard.estadoInicial ? (
        <div className="grid gap-4 md:grid-cols-2">
          {dashboard.sugestoes.map((s) => {
            const cfg = SUGESTOES[s.acao];
            if (!cfg) return null;
            return (
              <EstadoVazioGuiado
                key={s.acao}
                titulo={cfg.titulo}
                descricao={cfg.descricao}
                acaoLabel={cfg.acaoLabel}
                onAcao={() => router.push(cfg.rota)}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao>
            <p className="text-caption text-nexa-gray">Processos</p>
            <p className="font-display text-h2 text-nexa-white">{dashboard.processos.total}</p>
            <p className="text-small text-nexa-gray">{dashboard.processos.emAtraso} em atraso</p>
          </Cartao>
          <Cartao>
            <p className="text-caption text-nexa-gray">Clientes</p>
            <p className="font-display text-h2 text-nexa-white">{dashboard.clientes.total}</p>
            <p className="text-small text-nexa-gray">{dashboard.clientes.comOportunidadeAtiva} com oportunidade ativa</p>
          </Cartao>
          <Cartao>
            <p className="text-caption text-nexa-gray">Notificações não lidas</p>
            <p className="font-display text-h2 text-nexa-white">{dashboard.notificacoes.naoLidas}</p>
          </Cartao>
          <Cartao>
            <p className="text-caption text-nexa-gray">Por Estado</p>
            <p className="text-small text-nexa-white">Por fazer: {dashboard.processos.porEstado.por_fazer}</p>
            <p className="text-small text-nexa-white">Em curso: {dashboard.processos.porEstado.em_curso}</p>
            <p className="text-small text-nexa-white">Concluída: {dashboard.processos.porEstado.concluida}</p>
          </Cartao>
        </div>
      )}

      {notificacoes && notificacoes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-h3 text-nexa-white">Notificações Recentes</h2>
          <div className="space-y-2">
            {notificacoes.map((n) => (
              <Cartao key={n.id} className="flex items-center justify-between">
                <div>
                  <p className={n.lida ? 'text-small text-nexa-gray' : 'text-small font-medium text-nexa-white'}>{n.tipoEvento}</p>
                  <p className="text-caption text-nexa-gray">{new Date(n.createdAt).toLocaleString('pt-PT')}</p>
                </div>
                {!n.lida && (
                  <Botao variante="fantasma" tamanho="sm" onClick={() => marcarLida.mutate(n.id)}>
                    Marcar como lida
                  </Botao>
                )}
              </Cartao>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../components/ui/Cartao';
import { Select } from '../../../components/ui/Select';
import { TabelaDados, ColunaTabela } from '../../../components/ui/TabelaDados';
import { useToast } from '../../../hooks/use-toast';
import { useSessao } from '../../../lib/sessao-context';
import { api, ApiError } from '../../../lib/api';
import type { Utilizador, Departamento, Papel } from '../../../lib/tipos';

const SEM_DEPARTAMENTO = '__sem_departamento__';

// Nunca `super_admin` — já reforçado no backend (`PAPEIS_ATRIBUIVEIS`, Passo
// 5); o frontend só espelha o mesmo limite (Decisão D2).
const PAPEIS_ATRIBUIVEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'admin_empresa', rotulo: 'Administrador' },
  { valor: 'gestor', rotulo: 'Gestor' },
  { valor: 'colaborador', rotulo: 'Colaborador' },
  { valor: 'convidado', rotulo: 'Convidado' },
];

/**
 * Secção "Utilizadores e Permissões" (Especificação Técnica do Passo 28,
 * 3.3) — visível só para `admin_empresa`/`gestor`. Primeira `TabelaDados`
 * do projeto com edição em linha (`Select` por linha, Decisão D1): mudança
 * de valor aplica-se de imediato, sem `Modal` de confirmação.
 *
 * A própria linha do utilizador autenticado nunca mostra o `Select` de
 * papel (L1 do Passo 5, "nunca auto-alteração") — defesa em profundidade
 * visual; o backend já rejeita isto de qualquer forma. Sem restrição
 * adicional às opções oferecidas a um Gestor (L2/L3 continuam só
 * verificadas no backend, Decisão D3) — um erro é mostrado como toast,
 * nunca um crash.
 */
export function SeccaoUtilizadores() {
  const { utilizadorId } = useSessao();
  const { mostrarToast } = useToast();
  const queryClient = useQueryClient();

  const { data: utilizadores, isLoading: carregandoUtilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
  });

  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => api<Departamento[]>('/departamentos'),
  });

  const mutationPapel = useMutation({
    mutationFn: ({ id, papel }: { id: string; papel: Papel }) => api(`/utilizadores/${id}/papel`, { method: 'PATCH', body: { papel } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['utilizadores'] }),
    onError: (erro) => {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível alterar o papel.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  const mutationDepartamento = useMutation({
    mutationFn: ({ id, departamentoId }: { id: string; departamentoId: string | null }) =>
      api(`/utilizadores/${id}/departamento`, { method: 'PATCH', body: { departamentoId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['utilizadores'] }),
    onError: (erro) => {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível alterar o Departamento.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  const opcoesDepartamento = [
    { valor: SEM_DEPARTAMENTO, rotulo: 'Sem Departamento' },
    ...(departamentos ?? []).map((d) => ({ valor: d.id, rotulo: d.nome })),
  ];

  const colunas: ColunaTabela<Utilizador>[] = [
    { chave: 'nome', cabecalho: 'Nome', render: (u) => u.nome },
    {
      chave: 'papel',
      cabecalho: 'Papel',
      render: (u) =>
        u.id === utilizadorId ? (
          <span className="text-small text-nexa-gray">{PAPEIS_ATRIBUIVEIS.find((p) => p.valor === u.papel)?.rotulo} (tu)</span>
        ) : (
          <Select
            opcoes={PAPEIS_ATRIBUIVEIS.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))}
            valor={u.papel}
            onValorChange={(papel) => mutationPapel.mutate({ id: u.id, papel: papel as Papel })}
          />
        ),
    },
    {
      chave: 'departamento',
      cabecalho: 'Departamento',
      render: (u) => (
        <Select
          opcoes={opcoesDepartamento}
          valor={u.departamentoId ?? SEM_DEPARTAMENTO}
          onValorChange={(valor) => mutationDepartamento.mutate({ id: u.id, departamentoId: valor === SEM_DEPARTAMENTO ? null : valor })}
        />
      ),
    },
  ];

  return (
    <Cartao className="space-y-4">
      <h2 className="font-display text-h3 text-nexa-white">Utilizadores e Permissões</h2>
      <TabelaDados
        colunas={colunas}
        linhas={utilizadores ?? []}
        chaveLinha={(u) => u.id}
        carregando={carregandoUtilizadores}
        estadoVazio={{ titulo: 'Sem Utilizadores', descricao: 'Ainda não há Utilizadores nesta Empresa.', acaoLabel: 'Atualizar', onAcao: () => queryClient.invalidateQueries({ queryKey: ['utilizadores'] }) }}
      />
    </Cartao>
  );
}

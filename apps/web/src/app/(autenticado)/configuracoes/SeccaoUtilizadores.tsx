'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../components/ui/Cartao';
import { Select } from '../../../components/ui/Select';
import { Botao } from '../../../components/ui/Botao';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { TabelaDados, ColunaTabela } from '../../../components/ui/TabelaDados';
import { useToast } from '../../../hooks/use-toast';
import { useSessao } from '../../../lib/sessao-context';
import { api, ApiError } from '../../../lib/api';
import { PAPEIS_ATRIBUIVEIS } from '../../../lib/tipos';
import type { Utilizador, Departamento, Papel } from '../../../lib/tipos';

const SEM_DEPARTAMENTO = '__sem_departamento__';

/**
 * Secção "Utilizadores e Permissões" (Especificação Técnica do Passo 28,
 * 3.3; formulário de Convite acrescentado no Passo 31) — visível só para
 * `admin_empresa`/`gestor`. Primeira `TabelaDados` do projeto com edição em
 * linha (`Select` por linha, Decisão D1): mudança de valor aplica-se de
 * imediato, sem `Modal` de confirmação.
 *
 * A própria linha do utilizador autenticado nunca mostra o `Select` de
 * papel (L1 do Passo 5, "nunca auto-alteração") — defesa em profundidade
 * visual; o backend já rejeita isto de qualquer forma. Sem restrição
 * adicional às opções oferecidas a um Gestor (L2/L3 continuam só
 * verificadas no backend, Decisão D3) — um erro é mostrado como toast,
 * nunca um crash. O mesmo princípio aplica-se ao formulário de Convite
 * (Especificação Técnica do Passo 31, 3.1) — o seletor de papel nunca
 * filtra por privilégio do ator.
 */
export function SeccaoUtilizadores() {
  const { utilizadorId, papel: papelAtor } = useSessao();
  const { mostrarToast } = useToast();
  const queryClient = useQueryClient();

  const [modalConviteAberto, setModalConviteAberto] = useState(false);
  const [emailConvite, setEmailConvite] = useState('');
  const [papelConvite, setPapelConvite] = useState<Exclude<Papel, 'super_admin'>>('colaborador');
  const [departamentoConviteId, setDepartamentoConviteId] = useState(SEM_DEPARTAMENTO);

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

  // Formulário de Convite (Especificação Técnica do Passo 31, 3.1) — o
  // seletor de Departamento só aparece para `admin_empresa`: o backend
  // (CV-03, Passo 30) já força sempre o Departamento do próprio Gestor
  // quando quem convida é Gestor, tornando um seletor editável enganador
  // para esse papel (mostraria uma escolha que nunca é a que se aplica).
  const mutationConvite = useMutation({
    mutationFn: () =>
      api('/convites', {
        method: 'POST',
        body: {
          email: emailConvite,
          papelPretendido: papelConvite,
          departamentoPretendidoId: departamentoConviteId === SEM_DEPARTAMENTO ? undefined : departamentoConviteId,
        },
      }),
    onSuccess: () => {
      mostrarToast({ titulo: `Convite enviado para ${emailConvite}.`, variante: 'sucesso' });
      fecharModalConvite();
    },
    onError: (erro) => {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível enviar o convite.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  function abrirModalConvite() {
    setEmailConvite('');
    setPapelConvite('colaborador');
    setDepartamentoConviteId(SEM_DEPARTAMENTO);
    setModalConviteAberto(true);
  }

  function fecharModalConvite() {
    setModalConviteAberto(false);
    setEmailConvite('');
    setPapelConvite('colaborador');
    setDepartamentoConviteId(SEM_DEPARTAMENTO);
  }

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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 text-nexa-white">Utilizadores e Permissões</h2>
        <Botao variante="secundaria" tamanho="sm" onClick={abrirModalConvite}>
          Convidar Utilizador
        </Botao>
      </div>

      <TabelaDados
        colunas={colunas}
        linhas={utilizadores ?? []}
        chaveLinha={(u) => u.id}
        carregando={carregandoUtilizadores}
        estadoVazio={{ titulo: 'Sem Utilizadores', descricao: 'Ainda não há Utilizadores nesta Empresa.', acaoLabel: 'Atualizar', onAcao: () => queryClient.invalidateQueries({ queryKey: ['utilizadores'] }) }}
      />

      <Modal aberto={modalConviteAberto} onAbertoChange={(aberto) => !aberto && fecharModalConvite()} titulo="Convidar Utilizador">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutationConvite.mutate();
          }}
          className="space-y-3"
        >
          <Input type="email" placeholder="Email" value={emailConvite} onChange={(e) => setEmailConvite(e.target.value)} required />
          <Select
            opcoes={PAPEIS_ATRIBUIVEIS}
            valor={papelConvite}
            onValorChange={(valor) => setPapelConvite(valor as Exclude<Papel, 'super_admin'>)}
          />
          {papelAtor === 'admin_empresa' && <Select opcoes={opcoesDepartamento} valor={departamentoConviteId} onValorChange={setDepartamentoConviteId} />}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundaria" onClick={fecharModalConvite}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={mutationConvite.isPending}>
              Enviar Convite
            </Botao>
          </div>
        </form>
      </Modal>
    </Cartao>
  );
}

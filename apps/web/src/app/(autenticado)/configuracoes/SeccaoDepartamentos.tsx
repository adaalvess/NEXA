'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../components/ui/Cartao';
import { Botao } from '../../../components/ui/Botao';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { TabelaDados, ColunaTabela } from '../../../components/ui/TabelaDados';
import { useToast } from '../../../hooks/use-toast';
import { api, ApiError } from '../../../lib/api';
import type { Departamento, Utilizador } from '../../../lib/tipos';

/**
 * Secção "Departamentos" (Especificação Técnica do Passo 28, 3.4) —
 * visível só para `admin_empresa`. CRUD sobre `/departamentos` (Passo 8).
 * `Modal` reaproveitado para criar e editar (Decisão D4, mesmo formulário
 * — só `nome`).
 *
 * Contagem de Utilizadores atribuídos calculada a partir de `GET
 * /utilizadores` (já buscado por esta secção, admin tem sempre acesso a
 * ambos os endpoints) — agregação trivial de dados já obtidos, não um
 * cálculo de negócio paralelo (diferente da preocupação já registada no
 * Passo 23 para valores de faturação).
 */
export function SeccaoDepartamentos() {
  const { mostrarToast } = useToast();
  const queryClient = useQueryClient();

  const [modalAberto, setModalAberto] = useState(false);
  const [departamentoEmEdicao, setDepartamentoEmEdicao] = useState<Departamento | null>(null);
  const [nome, setNome] = useState('');

  const { data: departamentos, isLoading: carregando } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => api<Departamento[]>('/departamentos'),
  });

  const { data: utilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
  });

  function contagemUtilizadores(departamentoId: string): number {
    return (utilizadores ?? []).filter((u) => u.departamentoId === departamentoId).length;
  }

  const mutationGuardar = useMutation({
    mutationFn: () =>
      departamentoEmEdicao
        ? api(`/departamentos/${departamentoEmEdicao.id}`, { method: 'PATCH', body: { nome } })
        : api('/departamentos', { method: 'POST', body: { nome } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      mostrarToast({ titulo: departamentoEmEdicao ? 'Departamento atualizado.' : 'Departamento criado.', variante: 'sucesso' });
      fecharModal();
    },
    onError: (erro) => {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível guardar o Departamento.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  const mutationEliminar = useMutation({
    mutationFn: (id: string) => api(`/departamentos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departamentos'] });
      mostrarToast({ titulo: 'Departamento eliminado.', variante: 'sucesso' });
    },
    onError: (erro) => {
      // Mensagem exata do backend (RD-01, "tem Utilizadores ativos atribuídos") — mesmo padrão do Passo 26.
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível eliminar o Departamento.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  function abrirModalCriar() {
    setDepartamentoEmEdicao(null);
    setNome('');
    setModalAberto(true);
  }

  function abrirModalEditar(departamento: Departamento) {
    setDepartamentoEmEdicao(departamento);
    setNome(departamento.nome);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setDepartamentoEmEdicao(null);
    setNome('');
  }

  const colunas: ColunaTabela<Departamento>[] = [
    { chave: 'nome', cabecalho: 'Nome', render: (d) => d.nome },
    { chave: 'utilizadores', cabecalho: 'Utilizadores', render: (d) => contagemUtilizadores(d.id) },
    {
      chave: 'acoes',
      cabecalho: '',
      render: (d) => (
        <div className="flex gap-2">
          <Botao variante="fantasma" tamanho="sm" onClick={() => abrirModalEditar(d)}>
            Editar
          </Botao>
          <Botao variante="destrutiva" tamanho="sm" onClick={() => mutationEliminar.mutate(d.id)}>
            Eliminar
          </Botao>
        </div>
      ),
    },
  ];

  return (
    <Cartao className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-h3 text-nexa-white">Departamentos</h2>
        <Botao variante="secundaria" tamanho="sm" onClick={abrirModalCriar}>
          Novo Departamento
        </Botao>
      </div>

      <TabelaDados
        colunas={colunas}
        linhas={departamentos ?? []}
        chaveLinha={(d) => d.id}
        carregando={carregando}
        estadoVazio={{ titulo: 'Sem Departamentos', descricao: 'Cria o primeiro Departamento da tua Empresa.', acaoLabel: 'Novo Departamento', onAcao: abrirModalCriar }}
      />

      <Modal aberto={modalAberto} onAbertoChange={(aberto) => !aberto && fecharModal()} titulo={departamentoEmEdicao ? 'Editar Departamento' : 'Novo Departamento'}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutationGuardar.mutate();
          }}
          className="space-y-3"
        >
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={100} />
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundaria" onClick={fecharModal}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={mutationGuardar.isPending}>
              Guardar
            </Botao>
          </div>
        </form>
      </Modal>
    </Cartao>
  );
}

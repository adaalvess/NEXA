'use client';

import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Select } from '../../../../components/ui/Select';
import { Botao } from '../../../../components/ui/Botao';
import { api } from '../../../../lib/api';
import { useSessao } from '../../../../lib/sessao-context';
import { useToast } from '../../../../hooks/use-toast';
import type { Utilizador, Departamento, Cliente } from '../../../../lib/tipos';

const SEM_SELECAO = '__nenhum__';

/**
 * Criar Processo (Especificação Técnica do Passo 14, 3.8) — `responsavelId`
 * obrigatório. Colaborador cria sempre para si próprio (PR-03, Passo 9;
 * `fundacao.listar_utilizadores: false` para colaborador, Passo 14 3.2.1) —
 * por isso o seletor de responsável só aparece para admin/gestor.
 */
export default function PaginaCriarProcesso() {
  const router = useRouter();
  const { papel, utilizadorId } = useSessao();
  const { mostrarToast } = useToast();

  const podeEscolherResponsavel = papel === 'admin_empresa' || papel === 'gestor';

  const { data: utilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
    enabled: podeEscolherResponsavel,
  });
  const { data: departamentos } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => api<Departamento[]>('/departamentos'),
    enabled: podeEscolherResponsavel,
  });
  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api<Cliente[]>('/clientes'),
  });

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState(utilizadorId);
  const [departamentoId, setDepartamentoId] = useState(SEM_SELECAO);
  const [clienteId, setClienteId] = useState(SEM_SELECAO);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      const criado = await api<{ id: string }>('/processos', {
        method: 'POST',
        body: {
          titulo,
          descricao: descricao || undefined,
          responsavelId,
          departamentoId: departamentoId === SEM_SELECAO ? undefined : departamentoId,
          clienteId: clienteId === SEM_SELECAO ? undefined : clienteId,
        },
      });
      mostrarToast({ titulo: 'Processo criado', variante: 'sucesso' });
      router.push(`/processos/${criado.id}`);
    } catch {
      mostrarToast({ titulo: 'Não foi possível criar o Processo', variante: 'erro' });
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Novo Processo</h1>
      <form onSubmit={submeter} className="space-y-4">
        <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required minLength={2} maxLength={200} />
        <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} />

        {podeEscolherResponsavel && (
          <Select
            placeholder="Responsável"
            valor={responsavelId}
            onValorChange={setResponsavelId}
            opcoes={(utilizadores ?? []).map((u) => ({ valor: u.id, rotulo: u.nome }))}
          />
        )}

        {podeEscolherResponsavel && (
          <Select
            placeholder="Departamento (opcional)"
            valor={departamentoId}
            onValorChange={setDepartamentoId}
            opcoes={[{ valor: SEM_SELECAO, rotulo: 'Sem Departamento' }, ...(departamentos ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }))]}
          />
        )}

        <Select
          placeholder="Cliente associado (opcional)"
          valor={clienteId}
          onValorChange={setClienteId}
          opcoes={[{ valor: SEM_SELECAO, rotulo: 'Sem Cliente' }, ...(clientes ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))]}
        />

        <div className="flex gap-3">
          <Botao type="submit" carregando={aCarregar}>
            Criar Processo
          </Botao>
          <Botao type="button" variante="secundaria" onClick={() => router.back()}>
            Cancelar
          </Botao>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../../components/ui/Cartao';
import { Botao } from '../../../../components/ui/Botao';
import { Modal } from '../../../../components/ui/Modal';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { api, ApiError } from '../../../../lib/api';
import { useSessao } from '../../../../lib/sessao-context';
import { useToast } from '../../../../hooks/use-toast';
import type { Processo, Utilizador, Departamento, Cliente, EstadoProcesso } from '../../../../lib/tipos';

const SEM_SELECAO = '__nenhum__';
const ESTADOS: { valor: EstadoProcesso; rotulo: string }[] = [
  { valor: 'por_fazer', rotulo: 'Por Fazer' },
  { valor: 'em_curso', rotulo: 'Em Curso' },
  { valor: 'concluida', rotulo: 'Concluída' },
];

/**
 * Detalhe/Edição de Processo (Especificação Técnica do Passo 14, 3.8) —
 * mudança de estado inline (PATCH imediato); edição completa via Modal;
 * "Eliminar" oculto para colaborador/convidado (PR-07, Passo 9) — a API
 * continua a ser sempre a autoridade real (ADR-006 §3.7).
 */
export default function PaginaDetalheProcesso() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { papel, utilizadorId } = useSessao();
  const { mostrarToast } = useToast();
  const [modalAberto, setModalAberto] = useState(false);

  const podeEscolherResponsavel = papel === 'admin_empresa' || papel === 'gestor';
  const podeEliminar = papel === 'admin_empresa' || papel === 'gestor';

  const { data: processo, isLoading } = useQuery({
    queryKey: ['processos', id],
    queryFn: () => api<Processo>(`/processos/${id}`),
  });
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

  const editar = useMutation({
    mutationFn: (dto: Partial<Processo>) => api(`/processos/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      mostrarToast({ titulo: 'Processo atualizado', variante: 'sucesso' });
    },
    onError: () => mostrarToast({ titulo: 'Não foi possível atualizar', variante: 'erro' }),
  });

  const eliminar = useMutation({
    mutationFn: () => api(`/processos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos'] });
      mostrarToast({ titulo: 'Processo eliminado', variante: 'sucesso' });
      router.push('/processos');
    },
    onError: (erro) => {
      const mensagem = erro instanceof ApiError && erro.status === 403 ? 'Não tens permissão para eliminar este Processo.' : 'Não foi possível eliminar.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  if (isLoading || !processo) {
    return <div className="p-8 text-body text-nexa-gray">A carregar...</div>;
  }

  function nomeUtilizador(uid: string): string {
    if (uid === utilizadorId) return 'Você';
    return utilizadores?.find((u) => u.id === uid)?.nome ?? uid;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-nexa-white">{processo.titulo}</h1>
        <div className="flex gap-2">
          <Botao variante="secundaria" onClick={() => setModalAberto(true)}>
            Editar
          </Botao>
          {podeEliminar && (
            <Botao variante="destrutiva" onClick={() => eliminar.mutate()} carregando={eliminar.isPending}>
              Eliminar
            </Botao>
          )}
        </div>
      </div>

      <Cartao className="space-y-4">
        <div>
          <p className="text-caption text-nexa-gray">Estado</p>
          <div className="mt-1 max-w-xs">
            <Select
              valor={processo.estado}
              onValorChange={(v) => editar.mutate({ estado: v as EstadoProcesso })}
              opcoes={ESTADOS.map((e) => ({ valor: e.valor, rotulo: e.rotulo }))}
            />
          </div>
        </div>
        {processo.descricao && (
          <div>
            <p className="text-caption text-nexa-gray">Descrição</p>
            <p className="text-body text-nexa-white">{processo.descricao}</p>
          </div>
        )}
        <div>
          <p className="text-caption text-nexa-gray">Responsável</p>
          <p className="text-body text-nexa-white">{nomeUtilizador(processo.responsavelId)}</p>
        </div>
        {processo.departamentoId && (
          <div>
            <p className="text-caption text-nexa-gray">Departamento</p>
            <p className="text-body text-nexa-white">{departamentos?.find((d) => d.id === processo.departamentoId)?.nome ?? '—'}</p>
          </div>
        )}
        {processo.clienteId && (
          <div>
            <p className="text-caption text-nexa-gray">Cliente</p>
            <p className="text-body text-nexa-white">{clientes?.find((c) => c.id === processo.clienteId)?.nome ?? '—'}</p>
          </div>
        )}
        {processo.prazo && (
          <div>
            <p className="text-caption text-nexa-gray">Prazo</p>
            <p className="text-body text-nexa-white">{new Date(processo.prazo).toLocaleDateString('pt-PT')}</p>
          </div>
        )}
      </Cartao>

      <ModalEditarProcesso
        aberto={modalAberto}
        onAbertoChange={setModalAberto}
        processo={processo}
        podeEscolherResponsavel={podeEscolherResponsavel}
        utilizadores={utilizadores}
        departamentos={departamentos}
        clientes={clientes}
        onGuardar={(dto) => {
          editar.mutate(dto, { onSuccess: () => setModalAberto(false) });
        }}
        aGuardar={editar.isPending}
      />
    </div>
  );
}

function ModalEditarProcesso({
  aberto,
  onAbertoChange,
  processo,
  podeEscolherResponsavel,
  utilizadores,
  departamentos,
  clientes,
  onGuardar,
  aGuardar,
}: {
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  processo: Processo;
  podeEscolherResponsavel: boolean;
  utilizadores?: Utilizador[];
  departamentos?: Departamento[];
  clientes?: Cliente[];
  onGuardar: (dto: Partial<Processo>) => void;
  aGuardar: boolean;
}) {
  const [titulo, setTitulo] = useState(processo.titulo);
  const [descricao, setDescricao] = useState(processo.descricao ?? '');
  const [responsavelId, setResponsavelId] = useState(processo.responsavelId);
  const [departamentoId, setDepartamentoId] = useState(processo.departamentoId ?? SEM_SELECAO);
  const [clienteId, setClienteId] = useState(processo.clienteId ?? SEM_SELECAO);

  function submeter(e: FormEvent) {
    e.preventDefault();
    onGuardar({
      titulo,
      descricao: descricao || undefined,
      ...(podeEscolherResponsavel ? { responsavelId } : {}),
      departamentoId: departamentoId === SEM_SELECAO ? null : departamentoId,
      clienteId: clienteId === SEM_SELECAO ? null : clienteId,
    } as Partial<Processo>);
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo="Editar Processo">
      <form onSubmit={submeter} className="space-y-3">
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} minLength={2} maxLength={200} required />
        <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
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
            placeholder="Departamento"
            valor={departamentoId}
            onValorChange={setDepartamentoId}
            opcoes={[{ valor: SEM_SELECAO, rotulo: 'Sem Departamento' }, ...(departamentos ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }))]}
          />
        )}
        <Select
          placeholder="Cliente"
          valor={clienteId}
          onValorChange={setClienteId}
          opcoes={[{ valor: SEM_SELECAO, rotulo: 'Sem Cliente' }, ...(clientes ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))]}
        />
        <Botao type="submit" carregando={aGuardar}>
          Guardar
        </Botao>
      </form>
    </Modal>
  );
}

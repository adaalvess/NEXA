'use client';

import { useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../../components/ui/Cartao';
import { BadgeEstado } from '../../../../components/ui/BadgeEstado';
import { Botao } from '../../../../components/ui/Botao';
import { Modal } from '../../../../components/ui/Modal';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { api } from '../../../../lib/api';
import { useSessao } from '../../../../lib/sessao-context';
import { useToast } from '../../../../hooks/use-toast';
import type { Cliente, Interacao, Utilizador, EstadoOportunidade, TipoInteracao } from '../../../../lib/tipos';

const SEM_SELECAO = '__nenhum__';
const ESTADOS: { valor: EstadoOportunidade; rotulo: string }[] = [
  { valor: 'prospecao', rotulo: 'Prospeção' },
  { valor: 'negociacao', rotulo: 'Negociação' },
  { valor: 'fechada_ganha', rotulo: 'Fechada — Ganha' },
  { valor: 'fechada_perdida', rotulo: 'Fechada — Perdida' },
];
const TIPOS_INTERACAO: { valor: TipoInteracao; rotulo: string }[] = [
  { valor: 'chamada', rotulo: 'Chamada' },
  { valor: 'reuniao', rotulo: 'Reunião' },
  { valor: 'nota', rotulo: 'Nota' },
  { valor: 'outro', rotulo: 'Outro' },
];

/**
 * Detalhe de Cliente + Interações (Especificação Técnica do Passo 14, 3.9)
 * — CR-06 (contactoPrincipal obrigatório antes da primeira Interação) e
 * IR-01 (Convidado nunca regista Interações) replicados no frontend só como
 * feedback imediato; a validação real continua a ser do backend.
 */
export default function PaginaDetalheCliente() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { papel, utilizadorId } = useSessao();
  const { mostrarToast } = useToast();
  const [modalAberto, setModalAberto] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['clientes', id],
    queryFn: () => api<Cliente>(`/clientes/${id}`),
  });
  const { data: interacoes } = useQuery({
    queryKey: ['clientes', id, 'interacoes'],
    queryFn: () => api<Interacao[]>(`/clientes/${id}/interacoes`),
  });

  const podeEscolherOwner = papel === 'admin_empresa' || papel === 'gestor';
  const { data: utilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
    enabled: podeEscolherOwner,
  });

  const podeEditar = papel === 'admin_empresa' || papel === 'gestor' || (papel === 'colaborador' && cliente?.ownerId === utilizadorId);

  const editar = useMutation({
    mutationFn: (dto: Partial<Cliente>) => api(`/clientes/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      mostrarToast({ titulo: 'Cliente atualizado', variante: 'sucesso' });
    },
    onError: () => mostrarToast({ titulo: 'Não foi possível atualizar', variante: 'erro' }),
  });

  if (isLoading || !cliente) {
    return <div className="p-8 text-body text-nexa-gray">A carregar...</div>;
  }

  function nomeUtilizador(uid: string): string {
    if (uid === utilizadorId) return 'Você';
    return utilizadores?.find((u) => u.id === uid)?.nome ?? uid;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h1 text-nexa-white">{cliente.nome}</h1>
        {podeEditar && (
          <Botao variante="secundaria" onClick={() => setModalAberto(true)}>
            Editar
          </Botao>
        )}
      </div>

      <Cartao className="space-y-4">
        <div>
          <p className="text-caption text-nexa-gray">Tipo</p>
          <p className="text-body text-nexa-white">{cliente.tipo === 'empresa_cliente' ? 'Empresa Cliente' : 'Contacto Individual'}</p>
        </div>
        <div>
          <p className="text-caption text-nexa-gray">Contacto Principal</p>
          <p className="text-body text-nexa-white">{cliente.contactoPrincipal ?? '—'}</p>
        </div>
        <div>
          <p className="text-caption text-nexa-gray">Responsável (Owner)</p>
          <p className="text-body text-nexa-white">{nomeUtilizador(cliente.ownerId)}</p>
        </div>
        <div>
          <p className="text-caption text-nexa-gray">Oportunidade</p>
          {podeEditar ? (
            <div className="mt-1 max-w-xs">
              <Select
                placeholder="Sem oportunidade"
                valor={cliente.estadoOportunidade ?? SEM_SELECAO}
                onValorChange={(v) => editar.mutate({ estadoOportunidade: v === SEM_SELECAO ? null : (v as EstadoOportunidade) })}
                opcoes={[{ valor: SEM_SELECAO, rotulo: 'Sem oportunidade' }, ...ESTADOS.map((e) => ({ valor: e.valor, rotulo: e.rotulo }))]}
              />
            </div>
          ) : cliente.estadoOportunidade ? (
            <BadgeEstado estado={cliente.estadoOportunidade} />
          ) : (
            '—'
          )}
        </div>
      </Cartao>

      <SeccaoInteracoes clienteId={id} cliente={cliente} interacoes={interacoes ?? []} podeRegistar={podeEditar} />

      <ModalEditarCliente
        aberto={modalAberto}
        onAbertoChange={setModalAberto}
        cliente={cliente}
        podeEscolherOwner={podeEscolherOwner}
        utilizadores={utilizadores}
        onGuardar={(dto) => editar.mutate(dto, { onSuccess: () => setModalAberto(false) })}
        aGuardar={editar.isPending}
      />
    </div>
  );
}

function SeccaoInteracoes({
  clienteId,
  cliente,
  interacoes,
  podeRegistar,
}: {
  clienteId: string;
  cliente: Cliente;
  interacoes: Interacao[];
  podeRegistar: boolean;
}) {
  const queryClient = useQueryClient();
  const { mostrarToast } = useToast();
  const [tipo, setTipo] = useState<TipoInteracao>('nota');
  const [descricao, setDescricao] = useState('');

  // CR-06 (Functional Specifications §3.4) — contactoPrincipal obrigatório
  // antes da primeira Interação; feedback imediato, a validação real é do backend.
  const bloqueadoPorContacto = interacoes.length === 0 && !cliente.contactoPrincipal;

  const registar = useMutation({
    mutationFn: () => api(`/clientes/${clienteId}/interacoes`, { method: 'POST', body: { tipo, descricao: descricao || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', clienteId, 'interacoes'] });
      setDescricao('');
      mostrarToast({ titulo: 'Interação registada', variante: 'sucesso' });
    },
    onError: () => mostrarToast({ titulo: 'Não foi possível registar a interação', variante: 'erro' }),
  });

  function submeter(e: FormEvent) {
    e.preventDefault();
    registar.mutate();
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-h3 text-nexa-white">Interações</h2>

      {podeRegistar && (
        <Cartao className="space-y-3">
          {bloqueadoPorContacto && (
            <p className="text-small text-warning">Define um contacto principal antes de registar a primeira interação.</p>
          )}
          <form onSubmit={submeter} className="space-y-3">
            <Select
              valor={tipo}
              onValorChange={(v) => setTipo(v as TipoInteracao)}
              opcoes={TIPOS_INTERACAO.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
              disabled={bloqueadoPorContacto}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              disabled={bloqueadoPorContacto}
            />
            <Botao type="submit" tamanho="sm" carregando={registar.isPending} disabled={bloqueadoPorContacto}>
              Registar Interação
            </Botao>
          </form>
        </Cartao>
      )}

      {interacoes.length === 0 ? (
        <p className="text-small text-nexa-gray">Ainda não há interações registadas.</p>
      ) : (
        <div className="space-y-2">
          {interacoes.map((i) => (
            <Cartao key={i.id}>
              <div className="flex items-center justify-between">
                <span className="text-small font-medium text-nexa-white">{TIPOS_INTERACAO.find((t) => t.valor === i.tipo)?.rotulo}</span>
                <span className="text-caption text-nexa-gray">{new Date(i.data).toLocaleString('pt-PT')}</span>
              </div>
              {i.descricao && <p className="mt-1 text-small text-nexa-gray">{i.descricao}</p>}
            </Cartao>
          ))}
        </div>
      )}
    </section>
  );
}

function ModalEditarCliente({
  aberto,
  onAbertoChange,
  cliente,
  podeEscolherOwner,
  utilizadores,
  onGuardar,
  aGuardar,
}: {
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  cliente: Cliente;
  podeEscolherOwner: boolean;
  utilizadores?: Utilizador[];
  onGuardar: (dto: Partial<Cliente>) => void;
  aGuardar: boolean;
}) {
  const [nome, setNome] = useState(cliente.nome);
  const [contactoPrincipal, setContactoPrincipal] = useState(cliente.contactoPrincipal ?? '');
  const [ownerId, setOwnerId] = useState(cliente.ownerId);

  function submeter(e: FormEvent) {
    e.preventDefault();
    onGuardar({
      nome,
      contactoPrincipal: contactoPrincipal || undefined,
      ...(podeEscolherOwner ? { ownerId } : {}),
    } as Partial<Cliente>);
  }

  return (
    <Modal aberto={aberto} onAbertoChange={onAbertoChange} titulo="Editar Cliente">
      <form onSubmit={submeter} className="space-y-3">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={150} required />
        <Input placeholder="Contacto principal" value={contactoPrincipal} onChange={(e) => setContactoPrincipal(e.target.value)} />
        {podeEscolherOwner && (
          <Select
            placeholder="Responsável (Owner)"
            valor={ownerId}
            onValorChange={setOwnerId}
            opcoes={(utilizadores ?? []).map((u) => ({ valor: u.id, rotulo: u.nome }))}
          />
        )}
        <Botao type="submit" carregando={aGuardar}>
          Guardar
        </Botao>
      </form>
    </Modal>
  );
}

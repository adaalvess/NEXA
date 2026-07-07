'use client';

import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Botao } from '../../../../components/ui/Botao';
import { api } from '../../../../lib/api';
import { useSessao } from '../../../../lib/sessao-context';
import { useToast } from '../../../../hooks/use-toast';
import type { Utilizador, Cliente } from '../../../../lib/tipos';

const TIPOS: { valor: Cliente['tipo']; rotulo: string }[] = [
  { valor: 'empresa_cliente', rotulo: 'Empresa Cliente' },
  { valor: 'contacto_individual', rotulo: 'Contacto Individual' },
];

/**
 * Criar Cliente (Especificação Técnica do Passo 14, 3.9) — `ownerId`
 * obrigatório. Mesmo padrão de Processos: só admin/gestor escolhem owner
 * (`fundacao.listar_utilizadores`, Passo 14 3.2.1); colaborador cria sempre
 * para si próprio.
 */
export default function PaginaCriarCliente() {
  const router = useRouter();
  const { utilizadorId, papel } = useSessao();
  const { mostrarToast } = useToast();

  const podeEscolherOwner = papel === 'admin_empresa' || papel === 'gestor';
  const { data: utilizadores } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => api<Utilizador[]>('/utilizadores'),
    enabled: podeEscolherOwner,
  });

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Cliente['tipo']>('empresa_cliente');
  const [contactoPrincipal, setContactoPrincipal] = useState('');
  const [ownerId, setOwnerId] = useState(utilizadorId);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      const criado = await api<{ id: string }>('/clientes', {
        method: 'POST',
        body: { nome, tipo, contactoPrincipal: contactoPrincipal || undefined, ownerId },
      });
      mostrarToast({ titulo: 'Cliente criado', variante: 'sucesso' });
      router.push(`/crm/${criado.id}`);
    } catch {
      mostrarToast({ titulo: 'Não foi possível criar o Cliente', variante: 'erro' });
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Novo Cliente</h1>
      <form onSubmit={submeter} className="space-y-4">
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={150} />
        <Select valor={tipo} onValorChange={(v) => setTipo(v as Cliente['tipo'])} opcoes={TIPOS.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))} />
        <Input
          placeholder="Contacto principal (email ou telefone)"
          value={contactoPrincipal}
          onChange={(e) => setContactoPrincipal(e.target.value)}
        />

        {podeEscolherOwner && (
          <Select
            placeholder="Responsável (Owner)"
            valor={ownerId}
            onValorChange={setOwnerId}
            opcoes={(utilizadores ?? []).map((u) => ({ valor: u.id, rotulo: u.nome }))}
          />
        )}

        <div className="flex gap-3">
          <Botao type="submit" carregando={aCarregar}>
            Criar Cliente
          </Botao>
          <Botao type="button" variante="secundaria" onClick={() => router.back()}>
            Cancelar
          </Botao>
        </div>
      </form>
    </div>
  );
}

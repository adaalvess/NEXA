'use client';

import { useState, FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Cartao } from '../../../components/ui/Cartao';
import { Input } from '../../../components/ui/Input';
import { Botao } from '../../../components/ui/Botao';
import { useToast } from '../../../hooks/use-toast';
import { api, ApiError } from '../../../lib/api';

/**
 * Secção "Perfil" (Especificação Técnica do Passo 28, 3.2) — consome
 * `PATCH /utilizadores/me` (Passo 27). Sempre visível, a todos os papéis.
 *
 * `nome` fica sempre em branco por defeito, nunca pré-preenchido com o
 * valor atual — `GET /auth/eu` não devolve `nome` (só
 * `utilizadorId`/`empresaId`/`papel`) e `GET /utilizadores` está fora de
 * alcance de `colaborador`/`convidado`; deixar em branco é também o
 * comportamento correto do próprio contrato (`nome` omitido = sem
 * alteração), sem exigir nenhuma alteração de backend.
 *
 * Invalida a query `utilizadores` no sucesso — descoberta feita na
 * validação visual: sem isto, um `admin_empresa`/`gestor` a mudar o
 * próprio nome via esta secção não via a `TabelaDados` da secção
 * "Utilizadores e Permissões" (mesma página) refletir a alteração até um
 * refresh manual. As duas secções continuam componentes independentes
 * (Decisão A) — só partilham a mesma chave de cache do TanStack Query,
 * nunca uma referência direta entre si.
 */
export function SeccaoPerfil() {
  const { mostrarToast } = useToast();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [passwordAtual, setPasswordAtual] = useState('');
  const [passwordNova, setPasswordNova] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api('/utilizadores/me', {
        method: 'PATCH',
        body: {
          nome: nome || undefined,
          passwordAtual: passwordNova ? passwordAtual : undefined,
          passwordNova: passwordNova || undefined,
        },
      }),
    onSuccess: () => {
      const mudouPassword = !!passwordNova;
      mostrarToast({
        titulo: 'Perfil atualizado.',
        descricao: mudouPassword ? 'As restantes sessões ativas foram terminadas.' : undefined,
        variante: 'sucesso',
      });
      setNome('');
      setPasswordAtual('');
      setPasswordNova('');
      queryClient.invalidateQueries({ queryKey: ['utilizadores'] });
    },
    onError: (erro) => {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível atualizar o perfil.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    },
  });

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!nome && !passwordNova) {
      mostrarToast({ titulo: 'Nada para atualizar.', variante: 'aviso' });
      return;
    }
    mutation.mutate();
  }

  return (
    <Cartao className="space-y-4">
      <h2 className="font-display text-h3 text-nexa-white">Perfil</h2>
      <form onSubmit={submeter} className="space-y-3">
        <Input placeholder="Novo nome (deixa em branco para manter)" value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={100} />
        <Input
          type="password"
          placeholder="Palavra-passe atual"
          value={passwordAtual}
          onChange={(e) => setPasswordAtual(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Nova palavra-passe (deixa em branco para manter)"
          value={passwordNova}
          onChange={(e) => setPasswordNova(e.target.value)}
          minLength={8}
        />
        <Botao type="submit" carregando={mutation.isPending}>
          Guardar
        </Botao>
      </form>
    </Cartao>
  );
}

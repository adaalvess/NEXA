'use client';

import { useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../../components/ui/Input';
import { Botao } from '../../../components/ui/Botao';
import { useToast } from '../../../hooks/use-toast';
import { api, ApiError } from '../../../lib/api';
import { PAPEIS_ATRIBUIVEIS, PreviewConvite } from '../../../lib/tipos';

/**
 * Ecrã público de aceitação de Convite (Especificação Técnica do Passo 31,
 * 3.2) — fecha o Bloco C e o Milestone M5. Client Component público, mesmo
 * nível de `/registar`/`/login`/`/precos`.
 *
 * Mostra sempre o contexto do convite (Empresa/papel) antes de pedir a
 * palavra-passe (Decisão A do Passo 30, concretizada aqui) — nunca um
 * formulário às cegas. Sem auto-login no backend (Passo 30, decisão de
 * desenho): encadeia `POST /auth/login` aqui, mesmo padrão já aprovado no
 * Passo 26 (`/registar`).
 */
export default function PaginaAceitarConvite() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { mostrarToast } = useToast();

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['convite', token],
    queryFn: () => api<PreviewConvite>(`/convites/${token}`),
    retry: false,
  });

  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setACarregar(true);
    try {
      await api(`/convites/${token}/aceitar`, { method: 'POST', body: { nome, password } });

      try {
        await api('/auth/login', { method: 'POST', body: { email: preview.email, password } });
        router.push('/dashboard');
      } catch {
        mostrarToast({
          titulo: 'Conta criada com sucesso.',
          descricao: 'Não foi possível iniciar sessão automaticamente — inicia sessão manualmente.',
          variante: 'aviso',
        });
        router.push('/login');
      }
    } catch (erro) {
      const mensagem = erro instanceof ApiError ? erro.message : 'Não foi possível aceitar o convite. Verifica os dados.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    } finally {
      setACarregar(false);
    }
  }

  const papelRotulo = preview ? PAPEIS_ATRIBUIVEIS.find((p) => p.valor === preview.papelPretendido)?.rotulo : undefined;
  const conviteIndisponivel = isError || (preview && (preview.estado !== 'pendente' || preview.expirado));

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="font-display text-h2 text-nexa-white">
            NE<span className="text-nexa-purple">X</span>A
          </span>
        </div>

        {isLoading && <p className="text-center text-body text-nexa-gray">A carregar convite...</p>}

        {!isLoading && isError && (
          <p className="text-center text-body text-nexa-gray">Este convite não existe ou já foi usado.</p>
        )}

        {!isLoading && preview && conviteIndisponivel && !isError && (
          <p className="text-center text-body text-nexa-gray">
            {preview.expirado ? 'Este convite expirou — pede à Empresa para enviar um novo.' : 'Este convite já foi utilizado ou revogado.'}
          </p>
        )}

        {!isLoading && preview && !conviteIndisponivel && (
          <>
            <p className="text-center text-body text-nexa-gray">
              Foste convidado para te juntares a <span className="text-nexa-white">{preview.empresaNome}</span> como{' '}
              <span className="text-nexa-white">{papelRotulo}</span>.
            </p>
            <form onSubmit={submeter} className="space-y-3">
              <Input value={preview.email} disabled />
              <Input placeholder="O Teu Nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={100} />
              <Input type="password" placeholder="Cria uma Palavra-Passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <Botao type="submit" className="w-full" carregando={aCarregar}>
                Aceitar Convite e Criar Conta
              </Botao>
            </form>
          </>
        )}

        <p className="text-center text-small text-nexa-gray">
          Já tens conta?{' '}
          <Link href="/login" className="text-nexa-purple hover:underline">
            Inicia sessão
          </Link>
        </p>
      </div>
    </main>
  );
}

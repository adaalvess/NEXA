'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Botao } from '../../components/ui/Botao';
import { useToast } from '../../hooks/use-toast';
import { api, ApiError } from '../../lib/api';

/**
 * Ecrã de Login mínimo (Especificação Técnica do Passo 14, 3.1, D1) —
 * pré-requisito técnico para validar visualmente os restantes ecrãs deste
 * passo; Registo e Configurações ficam fora de âmbito (D2).
 */
export default function PaginaLogin() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      await api('/auth/login', { method: 'POST', body: { email, password } });
      router.push('/dashboard');
    } catch (erro) {
      // Nunca revelar se o email existe (mesma disciplina de segurança do backend, Passo 3).
      const mensagem = erro instanceof ApiError && erro.status === 401 ? 'Credenciais inválidas.' : 'Não foi possível iniciar sessão.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    } finally {
      setACarregar(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={submeter} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="font-display text-h2 text-nexa-white">
            NE<span className="text-nexa-purple">X</span>A
          </span>
          <p className="mt-2 text-body text-nexa-gray">Inicia sessão para continuar.</p>
        </div>
        <div className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Input type="password" placeholder="Palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Botao type="submit" className="w-full" carregando={aCarregar}>
          Entrar
        </Botao>
      </form>
    </main>
  );
}

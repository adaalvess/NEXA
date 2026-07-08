'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Botao } from '../../components/ui/Botao';
import { useToast } from '../../hooks/use-toast';
import { api, ApiError } from '../../lib/api';

/**
 * Ecrã de Registo público (Especificação Técnica do Passo 26) — fecha o
 * Bloco A do M5. Client Component (Decisão D2, tem estado de formulário) —
 * diferente de `/precos`/`/` (Passos 24/25), que eram só de leitura.
 *
 * `POST /auth/registar` (Passo 3) nunca estabelece sessão — encadeia
 * imediatamente `POST /auth/login` com as mesmas credenciais (Decisão D1,
 * Business Goals H1.4: percurso completo sem intervenção manual).
 *
 * Sem checkbox de consentimento RGPD (Decisão B, aprovada) — a ausência de
 * Termos de Serviço/Política de Privacidade é uma lacuna real, registada
 * como bloqueador explícito antes de qualquer registo real em produção
 * (Especificação Técnica do Passo 26, §5, Questão 1); nunca simulada aqui.
 */
export default function PaginaRegistar() {
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [pais, setPais] = useState('');
  const [nomeUtilizador, setNomeUtilizador] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      await api('/auth/registar', {
        method: 'POST',
        body: { empresa: { nome: nomeEmpresa, pais }, utilizador: { nome: nomeUtilizador, email, password } },
      });

      try {
        await api('/auth/login', { method: 'POST', body: { email, password } });
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
      const mensagem =
        erro instanceof ApiError && erro.status === 409
          ? erro.message
          : 'Não foi possível criar a conta. Verifica os dados.';
      mostrarToast({ titulo: mensagem, variante: 'erro' });
    } finally {
      setACarregar(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="font-display text-h2 text-nexa-white">
            NE<span className="text-nexa-purple">X</span>A
          </span>
          <p className="mt-2 text-body text-nexa-gray">Cria a tua conta e começa a organizar a tua operação.</p>
        </div>
        <form onSubmit={submeter} className="space-y-3">
          <Input placeholder="Nome da Empresa" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required minLength={2} maxLength={100} />
          <Input placeholder="País (ex: PT)" value={pais} onChange={(e) => setPais(e.target.value)} required />
          <Input placeholder="O Teu Nome" value={nomeUtilizador} onChange={(e) => setNomeUtilizador(e.target.value)} required minLength={2} maxLength={100} />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <Botao type="submit" className="w-full" carregando={aCarregar}>
            Criar Conta
          </Botao>
        </form>
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

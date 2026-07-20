'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/ui/Input';
import { Botao } from '../../components/ui/Botao';
import { Checkbox } from '../../components/ui/Checkbox';
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
 * Checkbox de consentimento RGPD (Especificação Técnica do Passo 47) —
 * resolve o bloqueador registado desde o Passo 26. Desabilita a submissão
 * até estar marcado, mas a proteção real é sempre do backend
 * (`RegistarDto.aceiteTermos`, `@Equals(true)`) — nunca só desta UI.
 */
export default function PaginaRegistar() {
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [pais, setPais] = useState('');
  const [nomeUtilizador, setNomeUtilizador] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setACarregar(true);
    try {
      await api('/auth/registar', {
        method: 'POST',
        body: { empresa: { nome: nomeEmpresa, pais }, utilizador: { nome: nomeUtilizador, email, password }, aceiteTermos },
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
          <label className="flex items-start gap-2 text-small text-nexa-gray">
            <Checkbox checked={aceiteTermos} onChange={(e) => setAceiteTermos(e.target.checked)} className="mt-0.5" />
            <span>
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" className="text-nexa-purple hover:underline">
                Termos de Serviço
              </Link>{' '}
              e a{' '}
              <Link href="/privacidade" target="_blank" className="text-nexa-purple hover:underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <Botao type="submit" className="w-full" carregando={aCarregar} disabled={!aceiteTermos}>
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

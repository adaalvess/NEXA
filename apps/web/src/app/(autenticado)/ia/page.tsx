'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Textarea } from '../../../components/ui/Textarea';
import { Botao } from '../../../components/ui/Botao';
import { Cartao } from '../../../components/ui/Cartao';
import { Modal } from '../../../components/ui/Modal';
import { api, ApiError } from '../../../lib/api';
import { useSessao } from '../../../lib/sessao-context';

interface Troca {
  pergunta: string;
  resposta: string;
}

interface Sugestao {
  id: string;
  entidadeRef: string | null;
  texto: string | null;
  createdAt: string;
}

function mensagemErroPergunta(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Limite de perguntas à IA atingido este mês.';
    if (error.status === 503 || error.status === 504) return 'O Assistente de IA está indisponível de momento. Tenta novamente em breve.';
  }
  return 'Não foi possível obter resposta do Assistente de IA.';
}

/**
 * Ecrã do Assistente de IA (Especificação Técnica do Passo 18) — pergunta
 * livre (UC-05, `POST /ia/perguntar`, Passo 16) e Sugestões Pendentes
 * (UC-06, `POST /ia/sugestoes`/`.../confirmar`/`.../rejeitar`, Passo 17;
 * `GET /ia/sugestoes`, Passo 18). Conversa fica só em estado local do
 * componente (Decisão a Validar C) — nunca persistida.
 *
 * RN-08 refletida na interface (Decisão a Validar D): cada sugestão tem os
 * seus próprios botões (nunca uma ação em lote); "Confirmar" exige um
 * segundo passo explícito no `Modal` antes de chamar a API.
 */
export default function PaginaAssistenteIA() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { papel } = useSessao();

  const [pergunta, setPergunta] = useState('');
  const [conversa, setConversa] = useState<Troca[]>([]);
  const [sugestaoParaConfirmar, setSugestaoParaConfirmar] = useState<Sugestao | null>(null);
  const [erroSugestoes, setErroSugestoes] = useState<string | null>(null);

  // Só admin_empresa/gestor têm `ia.gerar_sugestoes`/`listar_sugestoes`
  // (Especificação Técnica do Passo 17, Decisão D) — colaborador nunca vê
  // esta secção, mesmo tendo `ia.perguntar`.
  const podeVerSugestoes = papel === 'admin_empresa' || papel === 'gestor';

  const perguntarMutation = useMutation({
    mutationFn: (texto: string) => api<{ id: string; resposta: string }>('/ia/perguntar', { method: 'POST', body: { pergunta: texto } }),
    onSuccess: (res, texto) => {
      setConversa((atual) => [...atual, { pergunta: texto, resposta: res.resposta }]);
      setPergunta('');
    },
  });

  const { data: sugestoes, isLoading: carregandoSugestoes } = useQuery({
    queryKey: ['ia-sugestoes'],
    queryFn: () => api<Sugestao[]>('/ia/sugestoes'),
    enabled: podeVerSugestoes,
  });

  const gerarMutation = useMutation({
    mutationFn: () => api<{ sugestoes: unknown[] }>('/ia/sugestoes', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ia-sugestoes'] }),
  });

  const confirmarMutation = useMutation({
    mutationFn: (id: string) => api(`/ia/sugestoes/${id}/confirmar`, { method: 'POST' }),
    onSuccess: () => {
      setSugestaoParaConfirmar(null);
      setErroSugestoes(null);
      queryClient.invalidateQueries({ queryKey: ['ia-sugestoes'] });
    },
    onError: (error) => {
      setSugestaoParaConfirmar(null);
      setErroSugestoes(
        error instanceof ApiError && error.status === 409 ? 'Esta sugestão já não é válida — foi atualizada entretanto.' : 'Não foi possível confirmar a sugestão.',
      );
      queryClient.invalidateQueries({ queryKey: ['ia-sugestoes'] });
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id: string) => api(`/ia/sugestoes/${id}/rejeitar`, { method: 'POST' }),
    onSuccess: () => {
      setErroSugestoes(null);
      queryClient.invalidateQueries({ queryKey: ['ia-sugestoes'] });
    },
  });

  // Nunca alcançável pela navegação (oculto para `convidado`,
  // `BarraLateralNavegacao`) — só por URL direto. A API continua a ser
  // sempre quem decide (ADR-006 §3.7); isto é só para não mostrar um ecrã
  // vazio/quebrado a quem não devia lá estar.
  if (papel === 'convidado') {
    return <div className="p-8 text-body text-nexa-gray">Não tens acesso ao Assistente de IA.</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <h1 className="font-display text-h1 text-nexa-white">Assistente de IA</h1>

      <section className="space-y-4">
        <h2 className="font-display text-h3 text-nexa-white">Perguntar</h2>

        {conversa.length > 0 && (
          <div className="space-y-3">
            {conversa.map((troca, i) => (
              <div key={i} className="space-y-2">
                <Cartao className="bg-nexa-black/40">
                  <p className="text-caption text-nexa-gray">Tu</p>
                  <p className="text-small text-nexa-white">{troca.pergunta}</p>
                </Cartao>
                <Cartao>
                  <p className="text-caption text-nexa-gray">Assistente de IA</p>
                  <p className="text-small text-nexa-white">{troca.resposta}</p>
                </Cartao>
              </div>
            ))}
          </div>
        )}

        {perguntarMutation.isError && <p className="text-small text-error">{mensagemErroPergunta(perguntarMutation.error)}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pergunta.trim()) perguntarMutation.mutate(pergunta);
          }}
          className="space-y-3"
        >
          <Textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="O que está atrasado?" rows={3} />
          <Botao type="submit" carregando={perguntarMutation.isPending} disabled={!pergunta.trim()}>
            Perguntar
          </Botao>
        </form>
      </section>

      {podeVerSugestoes && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 text-nexa-white">Sugestões Pendentes</h2>
            <Botao variante="secundaria" onClick={() => gerarMutation.mutate()} carregando={gerarMutation.isPending}>
              Gerar Sugestões
            </Botao>
          </div>

          {erroSugestoes && <p className="text-small text-error">{erroSugestoes}</p>}

          {carregandoSugestoes ? (
            <p className="text-small text-nexa-gray">A carregar...</p>
          ) : sugestoes && sugestoes.length > 0 ? (
            <div className="space-y-3">
              {sugestoes.map((s) => (
                <Cartao key={s.id} className="space-y-3">
                  <p className="text-small text-nexa-white">{s.texto}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.entidadeRef && (
                      <Botao variante="fantasma" tamanho="sm" onClick={() => router.push(`/processos/${s.entidadeRef}`)}>
                        Ver Processo
                      </Botao>
                    )}
                    <Botao tamanho="sm" onClick={() => setSugestaoParaConfirmar(s)}>
                      Confirmar
                    </Botao>
                    <Botao variante="destrutiva" tamanho="sm" onClick={() => rejeitarMutation.mutate(s.id)}>
                      Rejeitar
                    </Botao>
                  </div>
                </Cartao>
              ))}
            </div>
          ) : (
            <p className="text-small text-nexa-gray">Sem sugestões pendentes de momento.</p>
          )}
        </section>
      )}

      <Modal
        aberto={sugestaoParaConfirmar !== null}
        onAbertoChange={(aberto) => !aberto && setSugestaoParaConfirmar(null)}
        titulo="Confirmar sugestão"
        descricao={sugestaoParaConfirmar?.texto ?? undefined}
      >
        <div className="flex justify-end gap-2">
          <Botao variante="secundaria" onClick={() => setSugestaoParaConfirmar(null)}>
            Cancelar
          </Botao>
          <Botao carregando={confirmarMutation.isPending} onClick={() => sugestaoParaConfirmar && confirmarMutation.mutate(sugestaoParaConfirmar.id)}>
            Confirmar Reatribuição
          </Botao>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { createContext, useContext } from 'react';
import type { Papel } from './tipos';

export interface Sessao {
  utilizadorId: string;
  empresaId: string;
  papel: Papel;
}

const SessaoContext = createContext<Sessao | null>(null);

/**
 * `papel` guardado só em memória (Especificação Técnica do Passo 14, 3.4,
 * D4) — nunca em `localStorage`. Usado exclusivamente para conveniência de
 * UX (ex: ocultar um botão "Eliminar"); a API continua a ser sempre a única
 * fonte de decisão de autorização (ADR-006 §3.7).
 */
export function SessaoProvider({ sessao, children }: { sessao: Sessao; children: React.ReactNode }) {
  return <SessaoContext.Provider value={sessao}>{children}</SessaoContext.Provider>;
}

export function useSessao(): Sessao {
  const sessao = useContext(SessaoContext);
  if (!sessao) {
    throw new Error('useSessao() só pode ser usado dentro do grupo de rotas (autenticado).');
  }
  return sessao;
}

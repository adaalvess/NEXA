'use client';

import { createContext, useContext } from 'react';

export type VarianteToast = 'sucesso' | 'erro' | 'aviso' | 'info';

export interface ToastItem {
  id: string;
  titulo: string;
  descricao?: string;
  variante: VarianteToast;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  mostrarToast: (toast: Omit<ToastItem, 'id'>) => void;
  removerToast: (id: string) => void;
}

/** Contexto do NotificacaoToast (Especificação Técnica do Passo 13, 3.5) — populado por `ToastProvider`. */
export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast tem de ser usado dentro de um ToastProvider.');
  }
  return contexto;
}

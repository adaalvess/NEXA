'use client';

import { ReactNode, useCallback, useMemo, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToastContext, ToastItem, VarianteToast } from '../../hooks/use-toast';

/**
 * NotificacaoToast (Especificação Técnica do Passo 13, 3.5) — sobre
 * `@radix-ui/react-toast`. `ToastProvider` envolve a aplicação (Passo 14);
 * `useToast()` dispara notificações a partir de qualquer componente.
 */
const ICONES: Record<VarianteToast, ReactNode> = {
  sucesso: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  erro: <XCircle className="h-5 w-5 text-error" aria-hidden />,
  aviso: <TriangleAlert className="h-5 w-5 text-warning" aria-hidden />,
  info: <Info className="h-5 w-5 text-info" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removerToast = useCallback((id: string) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((atual) => [...atual, { ...toast, id }]);
  }, []);

  const valor = useMemo(() => ({ toasts, mostrarToast, removerToast }), [toasts, mostrarToast, removerToast]);

  return (
    <ToastContext.Provider value={valor}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            onOpenChange={(aberto) => !aberto && removerToast(toast.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-nexa-slate/20 bg-nexa-charcoal p-4 shadow-lg',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out',
            )}
          >
            {ICONES[toast.variante]}
            <div className="flex-1">
              <ToastPrimitive.Title className="text-body font-medium text-nexa-white">{toast.titulo}</ToastPrimitive.Title>
              {toast.descricao && <ToastPrimitive.Description className="text-small text-nexa-gray">{toast.descricao}</ToastPrimitive.Description>}
            </div>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-50 flex w-full max-w-sm flex-col gap-2 p-6" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

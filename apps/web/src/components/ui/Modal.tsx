import { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Modal (Especificação Técnica do Passo 13, 3.5) — sobre `@radix-ui/react-dialog`. */
export interface ModalProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}

export function Modal({ aberto, onAbertoChange, titulo, descricao, children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={onAbertoChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-nexa-black/70" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-nexa-slate/20',
            'bg-nexa-charcoal p-6 text-nexa-white shadow-lg focus:outline-none',
          )}
        >
          <DialogPrimitive.Title className="font-display text-h3">{titulo}</DialogPrimitive.Title>
          {descricao && <DialogPrimitive.Description className="mt-1 text-small text-nexa-gray">{descricao}</DialogPrimitive.Description>}
          <div className="mt-4">{children}</div>
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded text-nexa-gray hover:text-nexa-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Textarea — adicionado na Sub-entrega 2 do Passo 14 (não fazia parte dos
 * 11 componentes do Passo 13; lacuna real: `descricao` em Processo/Cliente/
 * Interação precisa de texto multi-linha, mesmo padrão visual do `Input`).
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  erro?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, erro, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded border bg-nexa-charcoal px-3 py-2 text-body text-nexa-white placeholder:text-nexa-gray',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet',
      'disabled:cursor-not-allowed disabled:opacity-50',
      erro ? 'border-error' : 'border-nexa-slate/40',
      className,
    )}
    aria-invalid={erro}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

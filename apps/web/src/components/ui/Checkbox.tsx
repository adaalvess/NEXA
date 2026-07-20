import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Checkbox (Especificação Técnica do Passo 47) — 12º componente base,
 * adicionado por necessidade real (mesmo padrão do `Textarea`, Passo 14
 * Sub-entrega 2: nenhum dos 11 componentes originais do Passo 13 cobria
 * este caso). Primeiro uso: consentimento RGPD obrigatório no registo.
 */
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  erro?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, erro, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 shrink-0 rounded border bg-nexa-charcoal accent-nexa-purple',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet',
      'disabled:cursor-not-allowed disabled:opacity-50',
      erro ? 'border-error' : 'border-nexa-slate/40',
      className,
    )}
    aria-invalid={erro}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

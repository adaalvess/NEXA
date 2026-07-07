import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

/** Input (Especificação Técnica do Passo 13, 3.5) — estado `error` via prop `erro`. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  erro?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, erro, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded border bg-nexa-charcoal px-3 text-body text-nexa-white placeholder:text-nexa-gray',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet',
      'disabled:cursor-not-allowed disabled:opacity-50',
      erro ? 'border-error' : 'border-nexa-slate/40',
      className,
    )}
    aria-invalid={erro}
    {...props}
  />
));
Input.displayName = 'Input';

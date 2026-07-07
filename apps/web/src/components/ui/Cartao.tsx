import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

/** Cartao (Especificação Técnica do Passo 13, 3.5) — variante `interativo` para cartões clicáveis. */
export interface CartaoProps extends HTMLAttributes<HTMLDivElement> {
  interativo?: boolean;
}

export const Cartao = forwardRef<HTMLDivElement, CartaoProps>(({ className, interativo, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-nexa-slate/10 bg-nexa-charcoal p-4',
      interativo && 'cursor-pointer transition-colors hover:border-nexa-slate/30',
      className,
    )}
    {...props}
  />
));
Cartao.displayName = 'Cartao';

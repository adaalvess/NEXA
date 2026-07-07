import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Botão (Especificação Técnica do Passo 13, 3.5) — variantes `primaria`
 * (gradiente de marca), `secundaria` (contorno), `fantasma` (sem fundo),
 * `destrutiva` (vermelho, ações irreversíveis). Elemento nativo `<button>`
 * — acessibilidade por defeito, sem depender de Radix.
 */
const botaoVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet focus-visible:ring-offset-2 focus-visible:ring-offset-nexa-black disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variante: {
        primaria: 'bg-gradient-to-br from-nexa-purple to-nexa-violet text-nexa-white shadow-glow-purple hover:brightness-110',
        secundaria: 'border border-nexa-slate/40 text-nexa-white hover:bg-nexa-charcoal',
        fantasma: 'text-nexa-white hover:bg-nexa-charcoal',
        destrutiva: 'bg-error text-nexa-white hover:brightness-110',
      },
      tamanho: {
        sm: 'h-8 px-3 text-small',
        md: 'h-10 px-4 text-body',
        lg: 'h-12 px-6 text-body-lg',
      },
    },
    defaultVariants: {
      variante: 'primaria',
      tamanho: 'md',
    },
  },
);

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof botaoVariants> {
  carregando?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante, tamanho, carregando, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(botaoVariants({ variante, tamanho }), className)}
      disabled={disabled || carregando}
      {...props}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Botao.displayName = 'Botao';

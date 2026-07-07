import { cn } from '../../lib/utils';

/**
 * BadgeEstado (Especificação Técnica do Passo 13, 3.5) — uma variante por
 * valor de `estado` (Processo) / `estadoOportunidade` (Cliente) já
 * existente no backend (Passos 9/10).
 */
export type ValorEstado = 'por_fazer' | 'em_curso' | 'concluida' | 'prospecao' | 'negociacao' | 'fechada_ganha' | 'fechada_perdida';

const ROTULOS: Record<ValorEstado, string> = {
  por_fazer: 'Por Fazer',
  em_curso: 'Em Curso',
  concluida: 'Concluída',
  prospecao: 'Prospeção',
  negociacao: 'Negociação',
  fechada_ganha: 'Fechada — Ganha',
  fechada_perdida: 'Fechada — Perdida',
};

const CORES: Record<ValorEstado, string> = {
  por_fazer: 'bg-nexa-slate/30 text-nexa-white',
  em_curso: 'bg-info/20 text-info',
  concluida: 'bg-success/20 text-success',
  prospecao: 'bg-nexa-slate/30 text-nexa-white',
  negociacao: 'bg-warning/20 text-warning',
  fechada_ganha: 'bg-success/20 text-success',
  fechada_perdida: 'bg-error/20 text-error',
};

export interface BadgeEstadoProps {
  estado: ValorEstado;
  className?: string;
}

export function BadgeEstado({ estado, className }: BadgeEstadoProps) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded px-2 text-caption font-medium', CORES[estado], className)}>
      {ROTULOS[estado]}
    </span>
  );
}

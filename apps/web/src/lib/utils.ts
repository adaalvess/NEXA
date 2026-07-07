import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classes Tailwind condicionalmente, resolvendo conflitos (Especificação Técnica do Passo 13, 3.2). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

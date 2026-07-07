import { Sparkles } from 'lucide-react';
import { Botao } from './Botao';

/**
 * EstadoVazioGuiado (Especificação Técnica do Passo 13, 3.6 — resolve
 * Information Architecture Q1) — personalizado por módulo via props,
 * nunca com texto fixo interno (o componente nunca decide o conteúdo).
 */
export interface EstadoVazioGuiadoProps {
  titulo: string;
  descricao: string;
  acaoLabel: string;
  onAcao: () => void;
}

export function EstadoVazioGuiado({ titulo, descricao, acaoLabel, onAcao }: EstadoVazioGuiadoProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-nexa-slate/10 bg-nexa-charcoal p-12 text-center">
      <Sparkles className="h-8 w-8 text-nexa-violet" aria-hidden />
      <div>
        <h3 className="font-display text-h3 text-nexa-white">{titulo}</h3>
        <p className="mt-1 text-body text-nexa-gray">{descricao}</p>
      </div>
      <Botao variante="primaria" onClick={onAcao}>
        {acaoLabel}
      </Botao>
    </div>
  );
}

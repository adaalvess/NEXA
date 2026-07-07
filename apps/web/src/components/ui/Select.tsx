import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Select (Especificação Técnica do Passo 13, 3.5) — sobre `@radix-ui/react-select` (acessibilidade herdada). */
export interface OpcaoSelect {
  valor: string;
  rotulo: string;
}

export interface SelectProps {
  opcoes: OpcaoSelect[];
  valor?: string;
  onValorChange?: (valor: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({ opcoes, valor, onValorChange, placeholder, disabled }: SelectProps) {
  return (
    <SelectPrimitive.Root value={valor} onValueChange={onValorChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded border border-nexa-slate/40 bg-nexa-charcoal px-3 text-body text-nexa-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-violet',
          'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-nexa-gray',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="overflow-hidden rounded border border-nexa-slate/40 bg-nexa-charcoal text-nexa-white shadow-lg">
          <SelectPrimitive.Viewport className="p-1">
            {opcoes.map((opcao) => (
              <SelectPrimitive.Item
                key={opcao.valor}
                value={opcao.valor}
                className="relative flex h-9 cursor-pointer select-none items-center rounded px-8 text-body outline-none data-[highlighted]:bg-nexa-slate/30"
              >
                <SelectPrimitive.ItemText>{opcao.rotulo}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

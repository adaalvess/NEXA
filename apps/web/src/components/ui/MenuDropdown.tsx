import { ReactNode } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

/** MenuDropdown (Especificação Técnica do Passo 13, 3.5) — sobre `@radix-ui/react-dropdown-menu`. */
export interface ItemMenuDropdown {
  rotulo: string;
  onSelect: () => void;
  destrutivo?: boolean;
}

export interface MenuDropdownProps {
  trigger: ReactNode;
  itens: ItemMenuDropdown[];
}

export function MenuDropdown({ trigger, itens }: MenuDropdownProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="min-w-[10rem] rounded border border-nexa-slate/40 bg-nexa-charcoal p-1 text-nexa-white shadow-lg"
        >
          {itens.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.rotulo}
              onSelect={item.onSelect}
              className={cn(
                'flex h-9 cursor-pointer select-none items-center rounded px-3 text-body outline-none data-[highlighted]:bg-nexa-slate/30',
                item.destrutivo && 'text-error',
              )}
            >
              {item.rotulo}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

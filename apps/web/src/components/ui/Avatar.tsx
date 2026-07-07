import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

/** Avatar (Especificação Técnica do Passo 13, 3.5) — sobre `@radix-ui/react-avatar`, com fallback de iniciais. */
export interface AvatarProps {
  nome: string;
  srcImagem?: string;
  className?: string;
}

function extrairIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const iniciais = partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}` : partes[0]?.slice(0, 2);
  return (iniciais ?? '').toUpperCase();
}

export function Avatar({ nome, srcImagem, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-nexa-slate', className)}
    >
      {srcImagem && <AvatarPrimitive.Image src={srcImagem} alt={nome} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback className="text-small font-medium text-nexa-white" delayMs={srcImagem ? 400 : undefined}>
        {extrairIniciais(nome)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

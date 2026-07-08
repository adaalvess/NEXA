import { IsIn } from 'class-validator';

// 'enterprise' deliberadamente ausente (Especificação Técnica do Passo 21, Decisão A).
export const PLANOS_CHECKOUT = ['starter', 'professional'] as const;
export type PlanoCheckout = (typeof PLANOS_CHECKOUT)[number];

export class CriarCheckoutDto {
  @IsIn(PLANOS_CHECKOUT)
  plano!: PlanoCheckout;
}

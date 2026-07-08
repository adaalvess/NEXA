import { Provider } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Token de injeção do cliente Stripe (Especificação Técnica do Passo 21,
 * 3.1/Decisão E) — nunca instanciado diretamente dentro de um serviço.
 * Testes substituem este provider por um `FakeStripeClient` mínimo, zero
 * chamada de rede real, mesmo princípio já aplicado ao `AI_ADAPTER` (Passo
 * 15) — sem exigir uma interface de adaptador completa, porque o ADR-008
 * nunca decidiu a Stripe como substituível por outro processador (ao
 * contrário da IA, FR-26).
 */
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeClientProvider: Provider = {
  provide: STRIPE_CLIENT,
  // O SDK da Stripe (ao contrário do SDK da Anthropic, Passo 15) lança uma
  // exceção no próprio construtor se a chave for uma string vazia — nunca
  // deve impedir o arranque da aplicação nem a compilação de módulos de
  // teste que nunca chamam a Stripe (`comercial.e2e-spec.ts`,
  // `comercial-enforcement.e2e-spec.ts`). Um valor de reserva inofensivo
  // satisfaz o construtor sem nunca ser usado numa chamada real — só
  // `SubscricaoService.criarCheckout` usa este cliente, e o teste que o
  // exercita substitui sempre este provider por `FakeStripeClient`.
  useFactory: () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_sem_credencial_real', { apiVersion: '2026-06-24.dahlia' }),
};

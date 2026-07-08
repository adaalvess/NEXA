import { Plano } from '@prisma/client';

/**
 * Mapa plano → Stripe Price ID (Especificação Técnica do Passo 21,
 * 3.2/Decisão B) — existem só do lado da Stripe (dashboard), nunca
 * hardcoded (regra não-negociável #21). `enterprise` deliberadamente
 * ausente (Decisão A) — self-service não suportado, processo comercial.
 *
 * Lido a cada chamada (nunca cacheado a nível de módulo) — mesmo padrão já
 * usado em `QuotaService`/`CircuitBreakerService` (Passo 15), para permitir
 * testar diferentes valores sem depender da ordem de carregamento de
 * módulos (import vs. definição de variável de ambiente).
 */
export function obterPrecoStripe(plano: Plano): string | undefined {
  const precos: Partial<Record<Plano, string>> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
  };
  return precos[plano] || undefined;
}

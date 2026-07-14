import * as Sentry from '@sentry/nextjs';

/**
 * Sem `NEXT_PUBLIC_SENTRY_DSN` configurado, o SDK fica inativo — mesma
 * garantia de "arranca sem credencial real" já estabelecida noutros
 * fornecedores (Passos 15/21/29/41). Reaproveita a mesma variável pública do
 * cliente — o DSN não é um segredo (é seguro de expor no browser), por isso
 * não precisa de uma segunda variável só para o lado do servidor.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: 'staging',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

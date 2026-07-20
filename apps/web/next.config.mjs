import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Sem SENTRY_AUTH_TOKEN configurado (fora do âmbito do Passo 43 — só rastreio
// de erros, sem upload de source maps) — desativado explicitamente para o
// build nunca tentar autenticar-se contra a Sentry.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});

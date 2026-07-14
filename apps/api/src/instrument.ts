import * as Sentry from '@sentry/nestjs';

/**
 * Tem de ser importado antes de qualquer outro módulo (Sentry, NestJS
 * integration) — captura exceções desde o arranque da aplicação, incluindo
 * erros de inicialização que ocorreriam antes do resto do código correr.
 *
 * Sem DSN (`SENTRY_DSN` por preencher), o SDK fica inativo e não envia
 * nada — mesma garantia de "arranca sem credencial real" já estabelecida
 * para a IA/Stripe/Resend (Passos 15/21/29).
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'staging',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      if (event.request.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        delete data.password;
        delete data.passwordAtual;
        delete data.passwordNova;
      }
      if (event.request.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.Cookie;
      }
    }
    return event;
  },
});

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Substitui o layout raiz quando um erro de renderização React escapa até
 * ao topo da árvore — sem isto, o Sentry só captura erros de servidor/API,
 * nunca crashes de renderização no browser (Passo 43, ADR-007 §3.4).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body>
        <p>Ocorreu um erro inesperado. Por favor recarrega a página.</p>
      </body>
    </html>
  );
}

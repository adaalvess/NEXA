'use client';

import { useState } from 'react';

/**
 * TEMPORÁRIO — validação real de captura de erros da Sentry (Passo 43).
 * Removido no commit seguinte, imediatamente após a confirmação.
 *
 * O erro só é lançado depois de um clique (nunca durante o build/prerender
 * estático do Next.js) — garante um crash de renderização real no browser,
 * capturado por `global-error.tsx`.
 */
export default function ErroTesteSentryPasso43() {
  const [lancar, setLancar] = useState(false);
  if (lancar) {
    throw new Error('Erro deliberado — validação real do Passo 43 (Sentry, M7)');
  }
  return <button onClick={() => setLancar(true)}>Lançar erro de teste</button>;
}

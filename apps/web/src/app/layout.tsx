import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXA — Inteligência Operacional',
  description: 'Sistema Operacional Inteligente para Empresas.',
};

/**
 * Layout raiz — estrutura de rotas espelha o Information Architecture
 * (Coding Standards, 3.2). Ecrãs autenticados e públicos partilham este
 * layout base; a distinção de acesso é feita pelo grupo de rotas, não
 * duplicando lógica de autorização no frontend (Blueprint, secção 3.7
 * do ADR-006 — o frontend nunca é o mecanismo de segurança).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}

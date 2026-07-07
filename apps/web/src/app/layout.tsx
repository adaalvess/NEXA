import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '../components/ui/NotificacaoToast';

// Auto-hospedadas pelo Next.js (sem pedido externo em runtime) — Brand
// Book 3.2. Pesos exatamente os recomendados nesse documento.
// Especificação Técnica do Passo 13, 3.3 — corrige uma lacuna real do
// scaffolding do Passo 1: o `tailwind.config.ts` já referenciava os nomes
// das fontes, mas nenhum ficheiro/import as carregava — caíam sempre no
// tipo de letra do sistema.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

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
    <html lang="pt" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

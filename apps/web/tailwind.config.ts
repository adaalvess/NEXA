import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Configuração Tailwind da NEXA — tokens de marca traduzidos diretamente
 * do Brand Book v1.3, sem reinterpretação (Blueprint, secção 5, Princípio
 * de UI/UX obrigatório).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'nexa-black': '#0A0A0F',
        'nexa-charcoal': '#16161D',
        'nexa-slate': '#3A3A46',
        'nexa-purple': '#7B2FF7',
        'nexa-violet': '#A855F7',
        'nexa-white': '#F5F5F7',
        'nexa-gray': '#A1A1AA',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#38BDF8',
      },
      // Carregadas via `next/font/google` em `app/layout.tsx` (Passo 13,
      // 3.3) — variáveis CSS, não o nome literal da fonte diretamente.
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      spacing: {
        // Grelha de 8px (Brand Book, 3.6)
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '12px',
      },
      // Escala tipográfica completa (Brand Book, 3.2) — Passo 13.
      fontSize: {
        display: ['48px', { lineHeight: '56px' }],
        h1: ['36px', { lineHeight: '44px' }],
        h2: ['28px', { lineHeight: '36px' }],
        h3: ['22px', { lineHeight: '28px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        body: ['16px', { lineHeight: '24px' }],
        small: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
      // Glow suave para elementos de destaque em roxo (Brand Book, 3.8) —
      // nunca sombra pesada/skeuomórfica. Passo 13.
      boxShadow: {
        'glow-purple': '0 0 24px rgba(123, 47, 247, 0.35)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

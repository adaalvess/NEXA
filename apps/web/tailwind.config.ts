import type { Config } from 'tailwindcss';

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
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
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
    },
  },
  plugins: [],
};

export default config;

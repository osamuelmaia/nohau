import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface colors — driven by CSS variables so they flip with dark/light mode
        surface: {
          950: 'var(--s-950)',
          900: 'var(--s-900)',
          850: 'var(--s-850)',
          800: 'var(--s-800)',
          750: 'var(--s-750)',
          700: 'var(--s-700)',
          600: 'var(--s-600)',
          500: 'var(--s-500)',
        },
        // Single accent color — orange, like Claude
        accent: {
          DEFAULT: '#f97316',
          hover:   '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-in-out',
        'slide-in':   'slideIn 0.2s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(12px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config

/** @type {import('tailwindcss').Config} */

// Colours are driven by CSS custom properties defined in src/index.css.
// Each token is stored as three space-separated RGB channels so Tailwind's
// `<alpha-value>` opacity modifiers (e.g. `bg-terra-400/5`) keep working.
// The light values live on `:root`; `:root.dark` overrides them for dark mode.
const withVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          base: withVar('ink-base'),
          surface: withVar('ink-surface'),
          elevated: withVar('ink-elevated'),
          hover: withVar('ink-hover'),
        },
        line: {
          DEFAULT: withVar('line'),
          strong: withVar('line-strong'),
          accent: withVar('line-accent'),
        },
        paper: {
          DEFAULT: withVar('paper'),
          dim: withVar('paper-dim'),
          muted: withVar('paper-muted'),
          faint: withVar('paper-faint'),
        },
        gold: {
          50: withVar('gold-50'),
          100: withVar('gold-100'),
          200: withVar('gold-200'),
          300: withVar('gold-300'),
          400: withVar('gold-400'),
          500: withVar('gold-500'),
        },
        sage: {
          50: withVar('sage-50'),
          100: withVar('sage-100'),
          200: withVar('sage-200'),
          300: withVar('sage-300'),
          400: withVar('sage-400'),
          500: withVar('sage-500'),
        },
        terra: {
          400: withVar('terra-400'),
          500: withVar('terra-500'),
          600: withVar('terra-600'),
        },
        ok: {
          400: withVar('ok-400'),
          500: withVar('ok-500'),
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.18s cubic-bezier(0.2, 0.9, 0.3, 1) both',
        'flow-down': 'flowDown 1.5s linear infinite',
        'flow-up': 'flowUp 1.5s linear infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        flowDown: {
          '0%': { backgroundPosition: '0 -100%' },
          '100%': { backgroundPosition: '0 200%' },
        },
        flowUp: {
          '0%': { backgroundPosition: '0 200%' },
          '100%': { backgroundPosition: '0 -100%' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

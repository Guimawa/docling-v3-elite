/** @type {import('tailwindcss').Config} */
/**
 * Design system — tokens pilotés par CSS variables (thèmes 2026 : ivory / aurora / studio).
 * Couleurs = triplets RGB pour compatibilité opacité Tailwind (ex. bg-page/90).
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--c-page) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        'bg-primary': 'rgb(var(--c-bg-primary) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--c-bg-secondary) / <alpha-value>)',
        'bg-card': 'rgb(var(--c-bg-card) / <alpha-value>)',
        'bg-input': 'rgb(var(--c-bg-input) / <alpha-value>)',
        bgLight: 'rgb(var(--c-bg-light) / <alpha-value>)',

        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-medium': 'rgb(var(--c-primary-medium) / <alpha-value>)',
        'primary-light': 'rgb(var(--c-primary-light) / <alpha-value>)',
        'primary-pale': 'rgb(var(--c-primary-pale) / <alpha-value>)',

        cta: 'rgb(var(--c-cta) / <alpha-value>)',
        'cta-hover': 'rgb(var(--c-cta-hover) / <alpha-value>)',
        'cta-active': 'rgb(var(--c-cta-active) / <alpha-value>)',

        'text-primary': 'rgb(var(--c-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--c-text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--c-text-tertiary) / <alpha-value>)',
        'text-disabled': 'rgb(var(--c-text-disabled) / <alpha-value>)',
        'text-inverse': 'rgb(var(--c-text-inverse) / <alpha-value>)',

        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-medium': 'rgb(var(--c-border-medium) / <alpha-value>)',
        'border-dark': 'rgb(var(--c-border-dark) / <alpha-value>)',

        success: 'rgb(var(--c-success) / <alpha-value>)',
        'success-bg': 'rgb(var(--c-success-bg) / <alpha-value>)',
        'success-light': 'rgb(var(--c-success-light) / <alpha-value>)',

        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        'warning-bg': 'rgb(var(--c-warning-bg) / <alpha-value>)',
        'warning-light': 'rgb(var(--c-warning-light) / <alpha-value>)',

        error: 'rgb(var(--c-error) / <alpha-value>)',
        'error-bg': 'rgb(var(--c-error-bg) / <alpha-value>)',
        'error-light': 'rgb(var(--c-error-light) / <alpha-value>)',

        info: 'rgb(var(--c-info) / <alpha-value>)',
        'info-bg': 'rgb(var(--c-info-bg) / <alpha-value>)',
        'info-light': 'rgb(var(--c-info-light) / <alpha-value>)',

        'nav-sidebar-ink': 'rgb(var(--c-nav-ink) / <alpha-value>)',
        'nav-sidebar-cream': 'rgb(var(--c-nav-cream) / <alpha-value>)',
      },

      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Playfair Display', 'Sora', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },

      fontSize: {
        '2xs': '0.625rem',
        xs: '0.6875rem',
        sm: '0.75rem',
        base: '0.8125rem',
        md: '0.875rem',
        lg: '0.9375rem',
        xl: '1rem',
        '2xl': '1.125rem',
        '3xl': '1.25rem',
        '4xl': '1.375rem',
        '5xl': '1.5rem',
        '6xl': '1.625rem',
      },

      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.125rem',
        '2xl': '1.375rem',
        '3xl': '2rem',
        full: '9999px',
      },

      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'amber-sm': 'var(--shadow-amber-sm)',
        'amber-md': 'var(--shadow-amber-md)',
        'amber-lg': 'var(--shadow-amber-lg)',
      },

      backgroundImage: {
        'gradient-coral': 'var(--gradient-coral)',
        'gradient-coral-btn': 'var(--gradient-coral-btn)',
        'gradient-beige': 'var(--gradient-beige)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-warning': 'var(--gradient-warning)',
        'nav-sidebar': 'var(--gradient-nav-sidebar)',
      },

      animation: {
        'scan-line': 'scanning 2s ease-in-out infinite',
        'theme-shimmer': 'theme-shimmer 14s ease-in-out infinite',
      },

      keyframes: {
        scanning: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        'theme-shimmer': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1) translate(0, 0)' },
          '50%': { opacity: '0.85', transform: 'scale(1.04) translate(2%, -1%)' },
        },
      },
    },
  },
  plugins: [],
}

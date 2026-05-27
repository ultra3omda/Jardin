/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui-mobile/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // V1.6 brand colors (runtime tenant CSS vars) — preserved
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
        },
        // V7 design tokens (web-aligned)
        navy: {
          500: '#94a3b8',
          600: '#6b7280',
          700: '#4b5563',
          800: '#1a2028',
          900: '#0f1419',
        },
        ambre: {
          50: '#fff7e0',
          100: '#fef3c7',
          500: '#fbb13c',
          600: '#e89218',
          700: '#b45309',
        },
        paper: {
          50: '#f4f4ef',
          100: '#fafbfc',
        },
        surface: '#ffffff',
        ink: {
          300: '#94a3b8',
          500: '#475569',
          700: '#1a1d24',
          900: '#0f1419',
        },
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Preserved from Vague 0 landing page (now in indigo to match primary)
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        // Tunisian Editorial palette (V0.5) — references CSS vars set in globals.css
        paper: {
          DEFAULT: 'oklch(var(--paper))',
          alt: 'oklch(var(--paper-2))',
          edge: 'oklch(var(--paper-edge))',
          50: 'var(--paper-50)',
          100: 'var(--paper-100)',
        },
        ink: {
          DEFAULT: 'oklch(var(--ink))',
          muted: 'oklch(var(--ink-2))',
          faded: 'oklch(var(--ink-mute))',
          300: 'var(--ink-300)',
          500: 'var(--ink-500)',
          700: 'var(--ink-700)',
          900: 'var(--ink-900)',
        },
        terracotta: {
          DEFAULT: 'oklch(var(--terracotta))',
          dark: 'oklch(var(--terracotta-2))',
        },
        ochre: 'oklch(var(--ochre))',
        'teal-deep': 'oklch(var(--teal-deep))',
        olive: 'oklch(var(--olive))',
        'rose-dust': 'oklch(var(--rose-dust))',
        // V7 design tokens (Klasio-inspired) — references CSS vars set in globals.css
        navy: {
          500: 'var(--navy-500)',
          600: 'var(--navy-600)',
          700: 'var(--navy-700)',
          800: 'var(--navy-800)',
          900: 'var(--navy-900)',
        },
        ambre: {
          50: 'var(--ambre-50)',
          100: 'var(--ambre-100)',
          500: 'var(--ambre-500)',
          600: 'var(--ambre-600)',
          700: 'var(--ambre-700)',
        },
        surface: 'var(--surface)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        'sans-ar': ['var(--font-body-ar)', 'system-ui', 'sans-serif'],
        'display-ar': ['var(--font-display-ar)', 'Amiri', 'serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0.4deg)' },
          '50%':       { transform: 'translateY(-12px) rotate(-0.4deg)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.35', transform: 'scale(0.75)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.2' },
          '50%':       { opacity: '0.35' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        float:            'float 7s ease-in-out infinite',
        'pulse-dot':      'pulse-dot 2s ease-in-out infinite',
        'fade-up':        'fade-up 0.5s ease-out both',
        'glow-pulse':     'glow-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;

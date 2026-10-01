import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

/** Semantic colour backed by a CSS variable holding "R G B" so opacity modifiers keep working. */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** Vermilion: the single accent (focus, active markers, links, progress, the logo mark). */
const vermilion = {
  50: '#FEF2EE',
  100: '#FDE0D6',
  200: '#FBC0AD',
  300: '#F7987C',
  400: '#F4704B',
  500: '#F2542D',
  600: '#D9441F',
  700: '#B5381A',
  800: '#8F2F18',
  900: '#742916',
  950: '#3F1308',
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: {
    relative: true,
    files: ['./index.html', './src/**/*.{js,jsx}'],
  },
  theme: {
    screens: {
      xs: '420px',
      ...defaultTheme.screens,
    },
    extend: {
      fontFamily: {
        sans: ['Geist', ...defaultTheme.fontFamily.sans],
        mono: ['"Geist Mono"', ...defaultTheme.fontFamily.mono],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      colors: {
        brand: vermilion,
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          muted: token('surface-muted'),
          hover: token('surface-hover'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        // Text-safe tones (>= 4.5:1 on every surface of both themes): messages, due dates, glyphs.
        danger: token('danger'),
        warning: token('warning'),
        caution: token('caution'),
        success: token('success'),
        info: token('info'),
        // Workflow colours for dots, bars and charts (not for small text).
        status: {
          todo: '#8A857A',
          progress: '#2F6FEB',
          done: '#2F8F5B',
        },
        priority: {
          urgent: '#E5484D',
          high: '#E8803A',
          medium: '#C9A227',
          low: '#8A857A',
        },
      },
      // Tighter, deliberate radii: existing rounded-lg / -xl / -2xl tighten automatically.
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      // Flat by default; only floating layers (menus, modals, toasts) cast crisp neutral shadows.
      boxShadow: {
        xs: '0 1px 0 0 rgb(25 24 20 / 0.03)',
        sm: '0 1px 0 0 rgb(25 24 20 / 0.04)',
        DEFAULT: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 4px 12px -2px rgb(0 0 0 / 0.06)',
        lg: '0 1px 2px 0 rgb(0 0 0 / 0.06), 0 8px 24px -4px rgb(0 0 0 / 0.08)',
        xl: '0 2px 4px 0 rgb(0 0 0 / 0.05), 0 16px 40px -8px rgb(0 0 0 / 0.14)',
        '2xl': '0 2px 6px 0 rgb(0 0 0 / 0.06), 0 24px 56px -12px rgb(0 0 0 / 0.20)',
        popover: '0 1px 2px 0 rgb(0 0 0 / 0.06), 0 8px 24px 0 rgb(0 0 0 / 0.08)',
        modal: '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 24px 56px -8px rgb(0 0 0 / 0.18)',
        'inner-line': 'inset 0 -1px 0 0 rgb(var(--color-line) / 1)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'dropdown-in': {
          from: { opacity: '0', transform: 'translateY(-2px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'slide-in-left': 'slide-in-left 240ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'dropdown-in': 'dropdown-in 120ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // `touch:` = coarse pointer (phones, tablets): roomier hit targets without changing desktop.
    plugin(({ addVariant }) => {
      addVariant('touch', '@media (pointer: coarse)');
    }),
  ],
};

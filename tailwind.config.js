/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        navy: {
          700: '#1d3a66',
          800: '#0e1f3a',
          900: '#122548',
          950: '#162e54',
        },
        gold: {
          300: '#f2c96a',
          400: '#eeba48',
          500: '#e6aa32',
          600: '#cc9628',
        },
        /* Semantic theme tokens (CSS variables) */
        background: 'var(--background)',
        surface: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          secondary: 'var(--primary-secondary)',
        },
        accent: 'var(--accent)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: {
          DEFAULT: 'var(--border)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
        glow: '0 0 20px rgba(230, 170, 50, 0.15)',
        sidebar: 'var(--shadow-sidebar)',
      },
      animation: {
        'scale-in': 'scale-in 0.2s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s infinite',
      },
      keyframes: {
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(-8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
};

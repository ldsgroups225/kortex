/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f80f0',
          hover: '#3b6ee0',
        },
        secondary: 'rgb(100 116 139)',
        background: 'rgb(255 255 255)',
        'background-dark': 'rgb(15 23 42)',
        component: 'rgb(255 255 255)',
        'component-dark': 'rgb(30 41 59)',
        border: 'rgb(226 232 240)',
        'border-dark': 'rgb(51 65 85)',
      },
      spacing: {
        section: '2rem',
        container: '0.5rem',
      },
      borderRadius: {
        container: '0.75rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': {
            opacity: '0',
            transform: 'translateY(8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in-from-top': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 500ms ease-out',
        'slide-in-from-top': 'slide-in-from-top 300ms ease-out',
      },
    },
  },
  plugins: [],
}

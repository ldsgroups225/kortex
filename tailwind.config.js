/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        secondary: '#64748b',
      },
      spacing: {
        section: '2rem',
        container: '0.5rem',
      },
      borderRadius: {
        container: '0.5rem',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e5edff',
          200: '#cddbfe',
          300: '#a5bffd',
          400: '#7799fc',
          500: '#4a6df9',
          600: '#0937c7', // Logo blue
          700: '#1b3cb3',
          800: '#1c3491',
          900: '#1b2f73',
          950: '#111e47',
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /^bg-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^text-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^border-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^ring-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^shadow-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^hover:bg-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^focus:ring-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    { pattern: /^focus:border-primary-(50|100|200|300|400|500|600|700|800|900|950)$/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c7d2fe',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        }
      },
    },
  },
  plugins: [],
}

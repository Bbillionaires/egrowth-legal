/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a6b4a',
          50:  '#e6f5ee',
          100: '#c0e4d0',
          200: '#87c9a8',
          300: '#4dae80',
          400: '#27935f',
          500: '#1a6b4a',
          600: '#145a3c',
          700: '#0e4830',
          800: '#083622',
          900: '#032414',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

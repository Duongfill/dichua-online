/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // đỏ gạch – vàng nâu – xanh lá dịu
        brick: { 400: '#d06a50', 500: '#b9533b', 600: '#9b4130', 700: '#7a3224' },
        amberwood: { 200: '#f3dfb4', 300: '#e8c98a', 400: '#d6a85a', 500: '#b8873c', 600: '#8f6629', 800: '#4a3418', 900: '#2c1f0f' },
        jade: { 300: '#a9cfa4', 400: '#86b583', 500: '#649a64', 600: '#4b7b4c' },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Noto Serif"', 'Georgia', 'serif'],
      },
      boxShadow: { glass: '0 8px 24px rgba(40, 25, 10, 0.25), inset 0 1px 0 rgba(255,255,255,0.35)' },
    },
  },
  plugins: [],
};

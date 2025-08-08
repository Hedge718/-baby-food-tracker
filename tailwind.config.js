/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ← required for manual theme toggling
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans',
          'Apple Color Emoji', 'Segoe UI Emoji'
        ],
      },
    },
  },
  plugins: [],
};

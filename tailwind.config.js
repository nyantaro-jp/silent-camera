/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        camera: {
          bg: '#000000',
          panel: '#111111',
          accent: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
};

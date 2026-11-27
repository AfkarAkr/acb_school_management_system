/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1b2540',
        ink: '#17244a',
        muted: '#697792',
        canvas: '#f6f7ff',
        line: '#e3e8f4',
      },
      boxShadow: {
        card: '0 8px 26px rgba(21, 36, 65, 0.045)',
      },
    },
  },
  plugins: [],
}

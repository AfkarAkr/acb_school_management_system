/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#14213d',
        ink: '#17243b',
        muted: '#738198',
        canvas: '#f5f7fb',
        line: '#e7ebf2',
      },
      boxShadow: {
        card: '0 8px 26px rgba(21, 36, 65, 0.045)',
      },
    },
  },
  plugins: [],
}

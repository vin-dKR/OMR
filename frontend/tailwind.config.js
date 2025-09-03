/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'eggshell': '#f4f1de',
        'burnt-sienna': '#e07a5f',
        'delft-blue': '#3d405b',
        'cambridge-blue': '#81b29a',
        'sunset': '#f2cc8f',
      },
    },
  },
  plugins: [],
}

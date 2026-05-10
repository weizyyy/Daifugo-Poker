/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'table-green': '#1a472a',
        'table-felt': '#2d5a3d',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garage: {
          orange: '#E8682A',
          steel:  '#2A5F8F',
          cream:  '#FAF7F2',
          sand:   '#E8E2D9',
          dark:   '#1C1C1E',
        }
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}

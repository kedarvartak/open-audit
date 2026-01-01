/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#464ace',
          dark: '#3d42b8',
        }
      },
      fontFamily: {
        sans: ['System'],
      }
    },
  },
  plugins: [],
}

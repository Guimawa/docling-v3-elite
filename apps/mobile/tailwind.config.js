/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        crystal: {
          light: '#F0F9FF',
          DEFAULT: '#FFFFFF',
          dark: '#E2E8F0',
        },
        pronto: {
          DEFAULT: '#3B82F6',
          dark: '#1D4ED8',
        },
        charcoal: '#121212',
      },
      fontFamily: {
        outfit: ["Outfit"],
        inter: ["Inter"],
      },
    },
  },
  plugins: [],
}

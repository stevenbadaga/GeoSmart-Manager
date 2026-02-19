/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1E293B",
        secondary: "#5B667A",
        sand: "#F4F6F3",
        river: "#1F6F5F",
        moss: "#18584C",
        clay: "#D7DFD6",
        sunrise: "#C97A1A",
        water: "#2A6FA1",
        parcel: "#B6862C",
        success: "#1F8A4C",
        warning: "#C97A1A",
        danger: "#C0392B"
      }
    }
  },
  plugins: []
}

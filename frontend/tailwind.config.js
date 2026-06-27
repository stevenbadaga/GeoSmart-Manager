/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#10201B",
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        brand: {
          deep: "#063F35",
          forest: "#063F35",
          emerald: "#10B981",
          accent: "#10B981",
          mint: "#D1FAE5",
          olive: "#4D694E",
          cream: "#FFF3D5",
          sage: "#F7FAF4",
          darkBg: "#071F1A",
          darkCard: "#0D2F27",
          lightText: "#F4FFF9"
        },
        olive: "#4D694E",
        cream: "#FFF3D5",
        secondary: "#64748B",
        sand: "#F7FAF4",
        river: "#10B981",
        moss: "#063F35",
        clay: "#E2E8F0",
        sunrise: "#F59E0B",
        water: "#3B82F6",
        parcel: "#B45309",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444"
      }
    }
  },
  plugins: []
}

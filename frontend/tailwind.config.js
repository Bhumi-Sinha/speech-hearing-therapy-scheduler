/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: "#16232E",
        slate: {
          50: "#F6F8F9",
          100: "#EEF2F4",
          200: "#DDE4E9",
          300: "#C2CDD5",
          400: "#93A3AF",
          500: "#66798A",
          600: "#4C5D6C",
          700: "#39485A",
          800: "#27333F",
          900: "#16232E",
        },
        harbor: {
          50: "#EFF6FB",
          100: "#DAEAF6",
          200: "#B2D4EC",
          300: "#7FB6DD",
          400: "#4A93CA",
          500: "#2C74AE",
          600: "#215B8B",
          700: "#1B4870",
          800: "#173C5C",
          900: "#12304A",
        },
        clover: {
          50: "#EDF9F5",
          100: "#D3F0E7",
          400: "#3FB396",
          500: "#279078",
          600: "#1E7561",
        },
        clay: {
          50: "#FBF0E9",
          400: "#D98A4E",
          500: "#C16F34",
        },
        rose: {
          50: "#FBECEC",
          400: "#D9716A",
          500: "#C4534B",
        },
        violet: {
          50: "#F2EDFA",
          400: "#8A67C9",
          500: "#7350B4",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,46,0.04), 0 4px 16px rgba(22,35,46,0.06)",
        popover: "0 8px 30px rgba(22,35,46,0.14)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

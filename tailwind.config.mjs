/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        clover: {
          50: "#f4f8ef",
          100: "#e5efdc",
          300: "#9fb981",
          500: "#48652c",
          700: "#31451f",
          900: "#172212"
        },
        ink: "#10120f",
        paper: "#fbfbf8"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 24px 80px rgba(16, 18, 15, 0.10)"
      }
    }
  },
  plugins: []
};

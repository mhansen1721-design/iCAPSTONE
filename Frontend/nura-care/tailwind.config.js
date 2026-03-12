/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        nura: {
          bg: 'var(--nura-bg)',
          card: 'var(--nura-card)',
          accent: 'var(--nura-accent)',
          text: 'var(--nura-text)',
          dim: 'var(--nura-dim)',
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}

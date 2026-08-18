import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#07070b",
        panel: "#101014",
        gold: {
          DEFAULT: "#e8c547",
          dim: "#a38b2e",
        },
        mist: "#8b8b97",
      },
      boxShadow: {
        glow: "0 0 80px -20px rgba(232, 197, 71, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

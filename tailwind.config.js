import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = (d) => path.resolve(__dirname, d);

// Si aparece ETIMEDOUT (iCloud/carpeta sincronizada): npm run dev:fast o TAILWIND_FAST=1 npm run dev
const fast = process.env.TAILWIND_FAST === "1";
const content = fast
  ? [
      base("index.html"),
      base("src/index.css"),
      base("src/main.tsx"),
      base("src/App.tsx"),
      base("src/components/**/*.{js,ts,jsx,tsx}"),
      base("src/layouts/**/*.{js,ts,jsx,tsx}"),
      base("src/pages/**/*.{js,ts,jsx,tsx}"),
    ]
  : [base("index.html"), base("src/**/*.{js,ts,jsx,tsx}")];

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content,
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--background) / <alpha-value>)",
        },
        "primary-orange": "rgb(var(--primary-orange) / <alpha-value>)",
        "accent-orange": "#F68B1F",
        "accent-coral": "#FF7E66",
        "background-light": "rgb(var(--background) / <alpha-value>)", 
        "background-dark": "rgb(var(--background) / <alpha-value>)", 
        "card-dark": "rgb(var(--card) / <alpha-value>)", 
      },
      fontFamily: {
        "display": ["Montserrat", "Helvetica Neue", "Arial", "sans-serif"],
        "sans": ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
      },
      animation: {
        "gradient-x": "gradient-x 3s ease infinite",
      },
    },
  },
  plugins: [],
};
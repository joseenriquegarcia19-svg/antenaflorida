/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
        "display": ["Epilogue", "sans-serif"],
        "sans": ["Noto Sans", "sans-serif"],
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
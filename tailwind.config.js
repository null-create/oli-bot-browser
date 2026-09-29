/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        oli: {
          bg: "rgb(var(--oli-bg) / <alpha-value>)",
          surface: "rgb(var(--oli-surface) / <alpha-value>)",
          elevated: "rgb(var(--oli-elevated) / <alpha-value>)",
          selected: "rgb(var(--oli-selected) / <alpha-value>)",
          line: "rgb(var(--oli-line) / <alpha-value>)",
          "line-strong": "rgb(var(--oli-line-strong) / <alpha-value>)",
          accent: "rgb(var(--oli-accent) / <alpha-value>)",
          "accent-dim": "rgb(var(--oli-accent-dim) / <alpha-value>)",
          "accent-bright": "rgb(var(--oli-accent-bright) / <alpha-value>)",
          muted: "rgb(var(--oli-muted) / <alpha-value>)",
          fg: "rgb(var(--oli-fg) / <alpha-value>)",
          danger: "rgb(var(--oli-danger) / <alpha-value>)",
          "danger-bg": "rgb(var(--oli-danger-bg) / <alpha-value>)",
          warn: "rgb(var(--oli-warn) / <alpha-value>)",
          info: "rgb(var(--oli-info) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: [
          "var(--oli-font)",
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      borderRadius: {
        none: "0",
        sm: "calc(var(--oli-radius) * 0.5)",
        DEFAULT: "var(--oli-radius)",
        md: "var(--oli-radius)",
        lg: "calc(var(--oli-radius) * 1.5)",
        xl: "calc(var(--oli-radius) * 2)",
        "2xl": "calc(var(--oli-radius) * 2.5)",
        "3xl": "calc(var(--oli-radius) * 3)",
        full: "9999px",
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "pulse-accent": "pulse-accent 2s ease-in-out infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "pulse-accent": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#020403",
          surface: "#030503",
          panel: "#0a120d",
          border: "#1a3a28",
          "border-bright": "#2ecc71",
          green: "#2ecc71",
          "green-dim": "#1a7a42",
          "green-bright": "#58d68d",
          muted: "#6b7d74",
          text: "#d7e4de",
          error: "#e74c3c",
          "error-bg": "#1a0503",
          warning: "#f39c12",
          info: "#3498db",
        },
      },
      fontFamily: {
        mono: [
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
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "pulse-green": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

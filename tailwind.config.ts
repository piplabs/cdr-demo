import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    fontWeight: {
      thin: "400",
      extralight: "400",
      light: "400",
      normal: "400",
      medium: "400",
      semibold: "400",
      bold: "400",
      extrabold: "400",
      black: "400",
    },
    letterSpacing: {
      tighter: "-0.04em",
      tight: "-0.04em",
      normal: "-0.04em",
      wide: "-0.04em",
      wider: "-0.04em",
      widest: "-0.04em",
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-diatype)",
          "ABC Diatype Semi-Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        mono: [
          "var(--font-diatype)",
          "ABC Diatype Semi-Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        "demo-secret": "#818cf8",
        "demo-market": "#34d399",
        "demo-agent": "#f59e0b",
        "demo-ai": "#06b6d4",
        "demo-bounty": "#f43f5e",
        "glass-indigo": "rgb(129, 140, 248)",
        "glass-emerald": "rgb(52, 211, 153)",
        "glass-sky": "rgb(56, 189, 248)",
        "glass-violet": "rgb(167, 139, 246)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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

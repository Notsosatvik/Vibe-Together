import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        neon: {
          green: "#1DF5A4",
          purple: "#A855F7",
          blue: "#3B82F6",
          pink: "#F472B6",
        },
        // Surfaces
        ink: {
          950: "#06070C",
          900: "#0A0B12",
          800: "#10131C",
          700: "#161A26",
          600: "#1E2333",
          500: "#2A3045",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient":
          "linear-gradient(135deg, #1DF5A4 0%, #3B82F6 50%, #A855F7 100%)",
        "brand-soft":
          "linear-gradient(135deg, rgba(29,245,164,0.18) 0%, rgba(59,130,246,0.18) 50%, rgba(168,85,247,0.18) 100%)",
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(29, 245, 164, 0.35)",
        "glow-purple": "0 0 60px -10px rgba(168, 85, 247, 0.45)",
        "glow-blue": "0 0 60px -10px rgba(59, 130, 246, 0.45)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      animation: {
        "float-slow": "float 9s ease-in-out infinite",
        "float-slower": "float 14s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "spin-slow": "spin 14s linear infinite",
        marquee: "marquee 40s linear infinite",
        "pulse-glow": "pulseGlow 3.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-12px) translateX(6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.35", filter: "blur(40px)" },
          "50%": { opacity: "0.6", filter: "blur(55px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

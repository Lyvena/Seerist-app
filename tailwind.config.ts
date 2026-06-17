import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cal: ["var(--font-cal)"],
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      fontSize: {
        hero: ["clamp(3.5rem, 7.5vw, 6rem)", { lineHeight: "1.04", letterSpacing: "-0.03em" }],
        display: ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        heading: ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        subhead: ["clamp(1.1rem, 2vw, 1.375rem)", { lineHeight: "1.5" }],
      },
      colors: {
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          light: "var(--color-accent-light)",
          border: "var(--color-accent-border)",
        },
        text: {
          primary: "var(--color-text-1)",
          secondary: "var(--color-text-2)",
          tertiary: "var(--color-text-3)",
          quaternary: "var(--color-text-4)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          alt: "var(--color-surface-2)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        accent: "var(--shadow-accent)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marquee: "marquee 30s linear infinite",
        "gradient-shift": "gradient-shift 12s ease infinite",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to: { backgroundPosition: "200% center" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
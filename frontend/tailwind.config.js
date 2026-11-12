/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgBase: "#070A12",
        bgElevated: "#0D1220",
        brand: {
          1: "#6C7BFF",
          2: "#22D3EE",
          3: "#A78BFA",
          DEFAULT: "#6C7BFF",
        },
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#F87171",
        info: "#60A5FA",
        textPrimary: "#F4F6FB",
        textSecondary: "#A8B0C5",
        textMuted: "#6B7490",
        hairline: "rgba(255, 255, 255, 0.08)",
        "hairline-hover": "rgba(255, 255, 255, 0.16)",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        widest: "0.15em",
        superwide: "0.25em",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
        "3xs": ["0.625rem", { lineHeight: "0.75rem" }],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "drift-slow": "drift 25s ease-in-out infinite alternate",
        "drift-reverse": "driftReverse 30s ease-in-out infinite alternate",
      },
      keyframes: {
        drift: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "100%": { transform: "translate(60px, 40px) scale(1.1)" },
        },
        driftReverse: {
          "0%": { transform: "translate(0, 0) scale(1.05)" },
          "100%": { transform: "translate(-50px, -30px) scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};

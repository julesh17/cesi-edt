import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        cesi: {
          50: "#f0f4ff",
          100: "#e0eaff",
          200: "#c7d7fd",
          300: "#a5bcfb",
          400: "#8196f7",
          500: "#6171f0",
          600: "#4a4fe3",
          700: "#3d3dc8",
          800: "#3335a2",
          900: "#2e3180",
          950: "#1c1d4d",
        },
      },
    },
  },
  plugins: [],
};

export default config;

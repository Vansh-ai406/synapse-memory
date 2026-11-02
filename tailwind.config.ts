import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#08090d",
        surface: {
          1: "#0e1118",
          2: "#131722",
          3: "#181f2e",
          hover: "#1f283b",
        },
        hairline: {
          subtle: "rgba(255, 255, 255, 0.05)",
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          strong: "rgba(255, 255, 255, 0.14)",
        },
        mongodb: {
          green: "#00ED64",
          dark: "#001E2B",
          forest: "#023430",
          slate: "#00684A",
          lightGreen: "#00FF66",
        },
      },
      boxShadow: {
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.07)",
        "emerald-glow": "0 0 25px -5px rgba(0, 237, 100, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

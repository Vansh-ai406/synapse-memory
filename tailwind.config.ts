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
        mongodb: {
          green: "#00ED64",
          dark: "#001E2B",
          forest: "#023430",
          slate: "#00684A",
          lightGreen: "#00FF66",
        },
      },
    },
  },
  plugins: [],
};
export default config;

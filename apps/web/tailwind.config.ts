import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0E4A6E",
          navy: "#0B2E4B",
          muted: "#4E7390",
          yellow: "#FFD02B",
          brick: "#D93A2B",
          paper: "#EAF5FC",
          panel: "#D9EDFA",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        label: ['"Space Grotesk"', "monospace", "sans-serif"],
      },
      boxShadow: {
        "brutal-sm": "2px 2px 0px #000000",
        brutal: "4px 4px 0px #000000",
        "brutal-lg": "6px 6px 0px #000000",
        "brutal-xl": "8px 8px 0px #000000",
      },
      borderWidth: {
        3: "3px",
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

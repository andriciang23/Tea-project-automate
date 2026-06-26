import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand-neutral palette for the hub
        ink: "#0f172a",
        shopify: "#95bf47",
        shopee: "#ee4d2d",
        lazada: "#0f146d",
      },
    },
  },
  plugins: [],
};

export default config;

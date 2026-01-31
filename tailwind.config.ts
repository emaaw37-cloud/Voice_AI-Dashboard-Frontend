import type { Config } from "tailwindcss";

const config: Config = {
  // Dark theme preset: use `.dark` class to enable dark mode.
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Map Tailwind color tokens to CSS variables (from `app/globals.css`)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
};

export default config;


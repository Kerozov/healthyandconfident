import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#FFF0F3",
          100: "#FFD6DE",
          400: "#FF6B8A",
          500: "#F0527A",
          600: "#D93D65",
        },
        peach: {
          100: "#FFF4EC",
          400: "#FFB347",
          500: "#F0A030",
        },
        sage: {
          50: "#F0F7F4",
          100: "#D4EDE4",
          400: "#4A9B7F",
          600: "#2D6A4F",
          800: "#1A4030",
        },
        warm: {
          50: "#FFFBF7",
          100: "#FFF5EE",
          800: "#3D2B1F",
          900: "#2A1A10",
        },
      },
    },
  },
};

export default config;

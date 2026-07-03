import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#F4F6F8",
          100: "#E4E9ED",
          200: "#C8D2DA",
          300: "#9AABB9",
          400: "#6B8496",
          500: "#4E6476",
          600: "#435663",
          700: "#384851",
          800: "#2D3238",
          900: "#23282C",
        },
        green: {
          50: "#F4F5F3",
          100: "#E8EBE3",
          200: "#D5D9CE",
          500: "#838A6A",
          600: "#838A6A",
          700: "#6F7560",
          800: "#2D3238",
          900: "#23282C",
        },
        gold: {
          400: "#C4A882",
          500: "#B8956A",
          600: "#9A7D55",
        },
        cream: {
          50: "#F8F6F2",
          100: "#F3F0EA",
          200: "#EDE8DF",
        },
        forest: {
          50: "#F4F5F3",
          100: "#E8EBE3",
          200: "#D5D9CE",
          300: "#B8BFA8",
          400: "#9BA387",
          500: "#838A6A",
          600: "#6F7560",
          700: "#5A5F4E",
          800: "#2D3238",
          900: "#23282C",
        },
      },
    },
  },
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        green: {
          50: "#F0F9F0",
          100: "#D6EED6",
          200: "#AADCAA",
          500: "#3A9B5C",
          600: "#2D7A47",
          700: "#1F5C34",
          800: "#154025",
          900: "#0D2B18",
        },
        gold: {
          400: "#F0B429",
          500: "#D99B0F",
          600: "#B87D08",
        },
        cream: {
          50: "#FFFDF5",
          100: "#FFF8E6",
          200: "#FAEFC8",
        },
        forest: {
          50: "#F7FBF7",
          100: "#EEF7EE",
          800: "#1A2E1A",
          900: "#0D1F0D",
        },
      },
    },
  },
};

export default config;

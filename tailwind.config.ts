import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#F4F6F8",
          100: "#E8ECEF",
          200: "#D1D9E0",
          300: "#A8B5C0",
          400: "#7A8B99",
          500: "#5D6D7E",
          600: "#4F5D6B",
          700: "#3D4854",
          800: "#2C3E50",
          900: "#243444",
        },
        green: {
          50: "#F6F7F3",
          100: "#ECEEE6",
          200: "#DDE1D2",
          500: "#7D8461",
          600: "#7D8461",
          700: "#6A7153",
          800: "#2C3E50",
          900: "#243444",
        },
        gold: {
          400: "#C9B896",
          500: "#B8A482",
          600: "#9A8868",
        },
        cream: {
          50: "#F9F7F2",
          100: "#F5F2EC",
          200: "#F2ECE4",
        },
        forest: {
          50: "#F6F7F3",
          100: "#ECEEE6",
          200: "#DDE1D2",
          300: "#C5CAB8",
          400: "#9FA686",
          500: "#7D8461",
          600: "#6A7153",
          700: "#565C44",
          800: "#2C3E50",
          900: "#243444",
        },
      },
    },
  },
};

export default config;

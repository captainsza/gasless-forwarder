/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "cyber-dark": "#0A0A1A",
        "cyber-blue": "#00B0FF", 
        "cyber-pink": "#FF1493",
        "cyber-purple": "#8A2BE2",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        gradient: "gradient 5s ease infinite",
      },
      keyframes: {
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      boxShadow: {
        "neon": "0 0 10px rgba(0, 176, 255, 0.5)",
        "neon-lg": "0 0 20px rgba(0, 176, 255, 0.7)",
      },
    },
  },
  plugins: [require("daisyui")], // Required for select and button styles
} satisfies Config;
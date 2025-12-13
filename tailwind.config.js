/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#3A86FF", // Bleu électrique
        secondary: "#FF6B35", // Orange vif
        success: "#8BC34A", // Vert menthe
        accent: "#8E24AA", // Violet profond
        warning: "#FFD700", // Jaune soleil
        info: "#00BCD4", // Turquoise
        error: "#FF1744", // Rouge flashy
        "base-100": "#F5F5F5", // Gris clair
        "base-content": "#121212", // Noir profond
        "neon-pink": "#FF4081", // Rose fluo
        "neon-green": "#76FF03", // Vert fluo
      },
    },
  },
  plugins: [],
};

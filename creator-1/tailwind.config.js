/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    colors: {
      primary: "#000000",
      secondary: "#111111",
      tertiary: "#222222",
      quaternary: "#333333",
      quinary: "#444444",
    },
    fontFamily: {
      questrial: ["Questrial", "sans-serif"],
    },
    extend: {
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
        questrial: ["Questrial", "sans-serif"],
        "urbanist-bold": ["Urbanist-Bold", "sans-serif"],
        "urbanist-medium": ["Urbanist-Medium", "sans-serif"],
        "urbanist-regular": ["Urbanist-Regular", "sans-serif"],
        "urbanist-light": ["Urbanist-Light", "sans-serif"],
        "urbanist-thin": ["Urbanist-Thin", "sans-serif"],
        "urbanist-black": ["Urbanist-Black", "sans-serif"],
        "urbanist-extra-light": ["Urbanist-ExtraLight", "sans-serif"],
        "urbanist-semi-bold": ["Urbanist-SemiBold", "sans-serif"],
        "urbanist-extra-bold": ["Urbanist-ExtraBold", "sans-serif"],
      },
      colors: {
        primary: "#000000",
        secondary: "#111111",
        tertiary: "#222222",
        quaternary: "#333333",
        "rose-cherry": "#FD6F3E",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 明朝体（serif）を全体のデフォルトに
        sans: [
          "var(--font-noto-serif-jp)",
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "YuMincho",
          "serif",
        ],
        serif: [
          "var(--font-noto-serif-jp)",
          "Hiragino Mincho ProN",
          "Yu Mincho",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};

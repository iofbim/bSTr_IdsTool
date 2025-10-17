/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../design-system/iofbim-design-system/**/*.{ts,tsx,css}',
  ],
  presets: [require('../design-system/iofbim-design-system/tailwind-preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};

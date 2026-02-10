module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',
          panel: '#1e293b',
          card: '#334155',
          hover: '#475569'
        }
      }
    },
  },
  plugins: [],
}

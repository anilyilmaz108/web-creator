/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
        editorial: ['Manrope', 'Segoe UI', 'sans-serif'],
        ui: ['Sora', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        studio: '0 30px 80px rgba(2, 6, 23, 0.28)',
        panel: '0 18px 50px rgba(15, 23, 42, 0.12)'
      },
      backgroundImage: {
        'mesh-studio':
          'radial-gradient(circle at top left, rgba(236, 72, 153, 0.22), transparent 26%), radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 22%), linear-gradient(180deg, #0f172a 0%, #020617 100%)'
      }
    }
  },
  plugins: []
};

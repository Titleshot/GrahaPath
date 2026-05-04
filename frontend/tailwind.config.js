/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030303',
        obsidian: '#050505',
        onyx: '#0c0a07',
        ivory: '#f8edc5',
        cream: '#fff6d8',
        gold: {
          100: '#fff1b8',
          200: '#f7df9d',
          300: '#f7c95f',
          400: '#d9a441',
          500: '#b98523',
          soft: '#f7df9d',
          DEFAULT: '#d9a441',
          deep: '#8a6118'
        }
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #fff1b8 0%, #d9a441 48%, #8a6118 100%)'
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        glow: '0 0 40px rgba(217, 164, 65, 0.22)',
        gold: '0 0 44px rgba(217, 164, 65, 0.2), 0 30px 90px rgba(0, 0, 0, 0.42)'
      }
    }
  },
  plugins: []
};

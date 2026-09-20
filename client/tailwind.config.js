/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette – single source of truth
        primary: {
          DEFAULT: '#ff2e4c',
          soft: '#ffa3b3',
        },
        brand: {
          white: '#fefefe',
          black: '#0f0f0f',
          muted: '#dfe1e3',
          blue: '#065fd4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}

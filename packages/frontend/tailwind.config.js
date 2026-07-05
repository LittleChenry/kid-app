/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        kid: {
          blue: '#4FC3F7',
          green: '#81C784',
          orange: '#FFB74D',
          pink: '#F06292',
          purple: '#BA68C8',
          yellow: '#FFF176',
        },
      },
      fontFamily: {
        display: ['"ZCOOL KuaiLe"', 'cursive', 'sans-serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      minHeight: {
        dvh: '100dvh',
      },
      height: {
        dvh: '100dvh',
      },
    },
  },
  plugins: [],
};

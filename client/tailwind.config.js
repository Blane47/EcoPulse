/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        sidebar: '#0f1623',
        'sidebar-hover': '#1a2332',
        accent: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        critical: '#ef4444',
        warning: '#f59e0b',
        'content-bg': '#f9fafb',
        'card-border': '#e5e7eb',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};

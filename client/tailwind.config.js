/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        sidebar: '#ffffff',
        'sidebar-hover': '#f3f4f6',
        'sidebar-active': '#f0fdf4',
        accent: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
          light: '#f0fdf4',
        },
        critical: '#ef4444',
        warning: '#f59e0b',
        'content-bg': '#edf1f7',
        'card-border': '#e2e6ef',
        // Dark theme
        'dark-bg': '#1a1d29',
        'dark-card': '#222536',
        'dark-border': '#2a2d3e',
        'dark-sidebar': '#1e2130',
        'dark-hover': '#2a2d42',
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        'card': '0 6px 24px rgba(80, 70, 140, 0.18), 0 12px 48px rgba(80, 70, 140, 0.10)',
        'card-hover': '0 16px 56px rgba(80, 70, 140, 0.25), 0 8px 28px rgba(80, 70, 140, 0.15)',
        'soft': '0 4px 20px rgba(80, 70, 140, 0.14)',
        'elevated': '0 16px 64px rgba(80, 70, 140, 0.28), 0 6px 24px rgba(80, 70, 140, 0.16)',
        'dark-card': '0 4px 20px rgba(0, 0, 0, 0.4), 0 8px 40px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

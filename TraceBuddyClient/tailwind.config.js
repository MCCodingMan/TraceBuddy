/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tech: {
          primary: '#00d4ff',
          secondary: '#8b5cf6',
          accent: '#ff00ff',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          bg: {
            primary: '#0a0a0a',
            secondary: '#1a1a1a',
            tertiary: '#2a2a2a',
          },
          text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.8)',
            muted: 'rgba(255, 255, 255, 0.6)',
          },
          border: 'rgba(0, 212, 255, 0.3)',
        },
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'tech-pulse': 'tech-pulse 1.5s ease-in-out infinite',
        'tech-glow': 'tech-glow 2s ease-in-out infinite',
        'tech-scan': 'tech-scan 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'tech-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'tech-glow': {
          '0%, 100%': { 
            'box-shadow': '0 0 20px rgba(0, 212, 255, 0.3)'
          },
          '50%': { 
            'box-shadow': '0 0 40px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.4)'
          },
        },
        'tech-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.6' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta roxa principal (tons mais escuros)
        primary: {
          50: '#f4f0ff',
          100: '#e8e0ff',
          200: '#d4c5fd',
          300: '#b8a0f5',
          400: '#8b6ad8',
          500: '#5b21b6',
          600: '#4a1896',
          700: '#3d1579',
          800: '#321263',
          900: '#1e0b3d',
          950: '#120726',
        },
        secondary: {
          50: '#f0edff',
          100: '#e0d9ff',
          200: '#c9b8fc',
          300: '#a78eef',
          400: '#7c5cd4',
          500: '#4c1d95',
          600: '#3d1579',
          700: '#321263',
          800: '#28104f',
          900: '#1a0a35',
          950: '#0f061f',
        },
        // Acento (Rosa/Magenta)
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        // Neutros (Cinza com tom roxo)
        gray: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Status
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        purple: '0 4px 14px 0 rgba(59, 7, 100, 0.35)',
        'purple-lg': '0 10px 40px 0 rgba(45, 5, 80, 0.4)',
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(145deg, #4c1d95 0%, #2e1065 55%, #1e0b3d 100%)',
        'gradient-purple-pink': 'linear-gradient(135deg, #5b21b6 0%, #4a1896 100%)',
      },
    },
  },
  plugins: [],
}


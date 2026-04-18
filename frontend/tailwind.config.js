/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        lime: {
          DEFAULT: '#c8ff00',
          50: '#f5ffe0',
          100: '#e8ffb3',
          200: '#d9ff80',
          300: '#c8ff00',
          400: '#aedd00',
          500: '#8ab500',
        },
        // Dark palette (warm-tinted, not cold blue-black)
        bg: {
          base: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          overlay: '#222222',
        },
        // Text
        ink: {
          primary: '#f0ede8',
          secondary: '#a09c96',
          muted: '#5a5652',
        },
        // Border
        edge: {
          subtle: 'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'lime-glow': '0 0 20px rgba(200, 255, 0, 0.25)',
        'lime-glow-lg': '0 0 40px rgba(200, 255, 0, 0.35)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 1.8s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

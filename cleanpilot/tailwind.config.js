/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0EA5E9',   // sky blue — CleanPilot brand
          dark: '#0284C7',
          light: '#E0F2FE',
        },
        surface: '#FFFFFF',
        bg: '#F0F9FF',
        dark: '#0C1A2E',
        muted: '#64748B',
        border: '#E2E8F0',
        urgent: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}

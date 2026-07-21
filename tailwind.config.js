/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './index.ts',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF8F5',
        surface: '#FFFFFF',
        ink: '#2A2C31',
        muted: '#6B7280',
        border: '#EBE5DF',
        primary: {
          DEFAULT: '#147A78',
          pressed: '#0F6261',
          soft: '#E7F5F4',
          softBorder: '#B7E0DD',
        },
        coral: {
          DEFAULT: '#F28C78',
          soft: '#FFF0EC',
          softBorder: '#F5C4B8',
          deep: '#A94C3E',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#ECFDF3',
          softBorder: '#A7F3C0',
        },
        danger: '#B42318',
      },
      borderRadius: {
        control: '14px',
        card: '20px',
        sheet: '24px',
      },
      fontSize: {
        caption: ['13px', { lineHeight: '18px' }],
        body: ['16px', { lineHeight: '24px' }],
        section: ['20px', { lineHeight: '28px' }],
        title: ['32px', { lineHeight: '38px' }],
        display: ['38px', { lineHeight: '42px' }],
      },
      fontFamily: {
        sans: ['Quicksand_500Medium'],
        'sans-regular': ['Quicksand_400Regular'],
        'sans-semibold': ['Quicksand_600SemiBold'],
        'sans-bold': ['Quicksand_700Bold'],
      },
    },
  },
  plugins: [],
};

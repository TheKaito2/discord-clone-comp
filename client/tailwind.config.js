/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:         '#313338',
        'bg-grad':  '#36393F',
        panel:      '#2B2D31',
        rail:       '#1E1F22',
        'user-panel':'#232428',
        topbar:     '#2B2D31',
        divider:    '#41434A',
        'hover-a':  'rgba(78,80,88,0.48)',
        'active-a': 'rgba(78,80,88,0.6)',
        pill:       '#41434A',
        brand:      '#5865F2',
        'brand-hi': '#4752C4',
        mention:    '#949CF7',
        'text-hi':  '#F2F3F5',
        'text-body':'#DBDEE1',
        'text-mute':'#B5BAC1',
        'text-sub': '#949BA4',
        'text-dim': '#80848E',
        'text-meta':'#6D6F78',
        online:     '#23A559',
        idle:       '#F0B232',
        dnd:        '#F23F42',
        offline:    '#80848E',
        danger:     '#F23F42',
        'err-bright':'#DD2E44',
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['9px', { lineHeight: '15px' }],
      },
      letterSpacing: {
        cap: '0.24px',
      },
      width: {
        rail:    '72px',
        sidebar: '240px',
        members: '240px',
      },
      borderRadius: {
        pill: '10px',
      },
      boxShadow: {
        elev1: '0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05)',
        elev2: '0 8px 16px rgba(0,0,0,0.24), 0 2px 6px rgba(0,0,0,0.18)',
        'glow-brand': '0 0 0 1px rgba(88,101,242,0.45), 0 8px 24px -6px rgba(88,101,242,0.55)',
        'glow-online': '0 0 0 1px rgba(35,165,89,0.45), 0 8px 24px -6px rgba(35,165,89,0.5)',
        card: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

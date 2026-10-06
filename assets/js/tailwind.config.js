/* Tailwind theme — maps utilities onto the DESCO tokens in assets/css/tokens.css.
   Loaded after the Tailwind CDN runtime. For production, move this object into a
   tailwind.config.js `module.exports` and compile with the Tailwind CLI. */
(function () {
  const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

  tailwind.config = {
    // Base reset lives in assets/css/components.css so component classes sit between it and the utilities
    corePlugins: { preflight: false },
    theme: {
      extend: {
        colors: {
          brand: {
            50: v('brand-50'), 100: v('brand-100'), 200: v('brand-200'), 300: v('brand-300'),
            400: v('brand-400'), DEFAULT: v('brand'), 600: v('brand'), 700: v('brand-700'),
            800: v('brand-800'), 900: v('brand-900'), 950: v('brand-950'),
          },
          accent: { 50: v('accent-50'), 100: v('accent-100'), DEFAULT: v('accent'), 700: v('accent-700') },
          paper: v('paper'),
          surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
          ink: { DEFAULT: v('ink'), 2: v('ink-2'), 3: v('ink-3') },
          line: { DEFAULT: v('line'), strong: v('line-strong') },
          ok: { DEFAULT: v('ok'), soft: v('ok-soft') },
          warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
          danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
          info: { DEFAULT: v('info'), soft: v('info-soft') },
          violet: { DEFAULT: v('violet'), soft: v('violet-soft') },
        },
        fontFamily: {
          sans: ['"IBM Plex Sans"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
          mono: ['"IBM Plex Mono"', '"Hind Siliguri"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
          bn: ['"Hind Siliguri"', 'sans-serif'],
        },
        borderRadius: {
          sm: 'var(--r-sm)', DEFAULT: 'var(--r-md)', md: 'var(--r-md)',
          lg: 'var(--r-lg)', xl: 'var(--r-xl)',
        },
        boxShadow: { card: 'var(--sh-card)', pop: 'var(--sh-pop)', doc: 'var(--sh-doc)' },
        spacing: {
          gutter: 'var(--sp-gutter)', sidebar: 'var(--w-sidebar)',
          rail: 'var(--w-rail)', topbar: 'var(--h-topbar)',
        },
        fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
        maxWidth: { page: '1520px' },
      },
    },
  };
})();

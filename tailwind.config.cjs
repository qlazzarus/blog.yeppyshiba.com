/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{astro,html,md,mdx,tsx,ts}'],
    darkMode: 'class',
    theme: {
        container: { center: true, padding: '1rem' },
        extend: {
            fontFamily: {
                sans: [
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'Segoe UI',
                    'Roboto',
                    'Arial',
                    'Apple SD Gothic Neo',
                    'Noto Sans KR',
                    'sans-serif',
                ],
            },
            colors: {
                /* Semantic tokens (HSL channels via CSS vars) */
                bg: 'hsl(var(--bg) / <alpha-value>)',
                fg: 'hsl(var(--fg) / <alpha-value>)',
                muted: 'hsl(var(--muted) / <alpha-value>)',
                mutedFg: 'hsl(var(--muted-fg) / <alpha-value>)',
                border: 'hsl(var(--border) / <alpha-value>)',
                card: 'hsl(var(--card) / <alpha-value>)',
                cardFg: 'hsl(var(--card-fg) / <alpha-value>)',
                brand: 'hsl(var(--brand) / <alpha-value>)',
                brandFg: 'hsl(var(--brand-fg) / <alpha-value>)',
            },
        },
    },
    plugins: [require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio')],
};

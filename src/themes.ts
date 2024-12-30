'use client';

import { robotoFont } from '@/fonts';
import { PaletteMode, Shadows, alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

declare module '@mui/material/Paper' {
    interface PaperPropsVariantOverrides {
        highlighted: true;
    }
}
declare module '@mui/material/styles/createPalette' {
    interface ColorRange {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    }

    interface PaletteColor extends ColorRange {}

    interface Palette {
        baseShadow: string;
    }
}

// 색상 정의
const brand = {
    50: 'hsl(210, 100%, 95%)',
    100: 'hsl(210, 100%, 92%)',
    200: 'hsl(210, 100%, 80%)',
    300: 'hsl(210, 100%, 65%)',
    400: 'hsl(210, 98%, 48%)',
    500: 'hsl(210, 98%, 42%)',
    600: 'hsl(210, 98%, 55%)',
    700: 'hsl(210, 100%, 35%)',
    800: 'hsl(210, 100%, 16%)',
    900: 'hsl(210, 100%, 21%)',
};

const gray = {
    50: 'hsl(220, 35%, 97%)',
    100: 'hsl(220, 30%, 94%)',
    200: 'hsl(220, 20%, 88%)',
    300: 'hsl(220, 20%, 80%)',
    400: 'hsl(220, 20%, 65%)',
    500: 'hsl(220, 20%, 42%)',
    600: 'hsl(220, 20%, 35%)',
    700: 'hsl(220, 20%, 25%)',
    800: 'hsl(220, 30%, 6%)',
    900: 'hsl(220, 35%, 3%)',
};

const customShadows: Shadows = [
    'none',
    '0px 4px 16px rgba(0, 0, 0, 0.2)',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
];

export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        primary: {
            light: brand[200],
            main: brand[400],
            dark: brand[700],
            contrastText: brand[50],
        },
        background: {
            default: mode === 'dark' ? gray[900] : 'hsl(0, 0%, 99%)',
            paper: mode === 'dark' ? 'hsl(220, 30%, 7%)' : 'hsl(220, 35%, 97%)',
        },
        text: {
            primary: mode === 'dark' ? 'hsl(0, 0%, 100%)' : gray[800],
            secondary: mode === 'dark' ? gray[400] : gray[600],
        },
        action: {
            hover: mode === 'dark' ? alpha(gray[600], 0.2) : alpha(gray[200], 0.2),
            selected: mode === 'dark' ? alpha(gray[600], 0.3) : alpha(gray[200], 0.3),
        },
        divider: mode === 'dark' ? alpha(gray[700], 0.6) : alpha(gray[300], 0.4),
        baseShadow:
            mode === 'dark'
                ? 'hsla(220, 30%, 5%, 0.7) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.8) 0px 8px 16px -5px'
                : 'hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px',
    },
    typography: {
        fontFamily: robotoFont.style.fontFamily,
        h1: {
            fontSize: '3rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
        },
        h2: {
            fontSize: '2.25rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        body1: {
            fontSize: '1rem',
        },
    },
    shadows: customShadows,
    components: {
        MuiLink: {
            styleOverrides: {
                root: {
                    textDecoration: 'none',
                    color: 'inherit', // 텍스트 색상 상속
                },
            },
        },
    },
});

// 다크 모드 테마 생성
export const darkTheme = responsiveFontSizes(createTheme(getDesignTokens('dark')));

// 라이트 모드 테마 생성
export const lightTheme = responsiveFontSizes(createTheme(getDesignTokens('light')));

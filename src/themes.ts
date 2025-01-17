'use client';

import { robotoFont } from '@/fonts';
import { Shadows, createTheme, responsiveFontSizes } from '@mui/material/styles';

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

export default responsiveFontSizes(
    createTheme({
        palette: {
            primary: {
                light: brand[200],
                main: brand[400],
                dark: brand[700],
                contrastText: brand[50],
            },
        },
        typography: {
            fontFamily: robotoFont.style.fontFamily,
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
        colorSchemes: {
            light: true,
            dark: true,
        },
        cssVariables: {
            colorSchemeSelector: 'class',
        },
    }),
);

import { Inter, Roboto } from 'next/font/google';

export const interFont = Inter({
    subsets: ['latin'],
    weight: ['400', '700'], // 필요한 weight 추가
    display: 'swap',
});

export const robotoFont = Roboto({
    subsets: ['latin'],
    weight: ['400', '700'],
    display: 'swap',
});

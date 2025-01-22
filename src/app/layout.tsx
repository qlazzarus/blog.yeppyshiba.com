import theme from '@/themes';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { GoogleAnalytics } from '@next/third-parties/google';
import { GAPageView } from "@/hooks/useGAPageView";
import React from 'react';

const RootLayout = async ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string;

    return (
        <html lang='en' suppressHydrationWarning>
            <body>
                <InitColorSchemeScript attribute='class' />
                <AppRouterCacheProvider>
                    <ThemeProvider theme={theme} defaultMode={'system'}>
                        <CssBaseline enableColorScheme />
                        {children}
                    </ThemeProvider>
                </AppRouterCacheProvider>
                <GoogleAnalytics gaId={gaId} />
                <GAPageView />
            </body>
        </html>
    );
};

export default RootLayout;

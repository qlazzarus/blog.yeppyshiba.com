import { CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import React from 'react';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';

export const metadata: Metadata = {
    title: '',
    description: '',
};

const RootLayout = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string;

    return (
        <html lang="en">
            <body>
                <AppRouterCacheProvider>
                    <CssBaseline />
                    <ResponsiveAppBar />
                    {children}
                </AppRouterCacheProvider>
            </body>
            <GoogleAnalytics gaId={gaId} />
        </html>
    );
};

export default RootLayout;

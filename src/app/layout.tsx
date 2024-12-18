import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import React from 'react';
import Jumbotron from '@/components/Jumbotron';
import ResponsiveAppBar from '@/components/ResponsiveAppBar';
import ThemeRegistry from '@/components/ThemeRegistry';

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
                    <ThemeRegistry>
                        <ResponsiveAppBar />
                        {children}
                    </ThemeRegistry>
                </AppRouterCacheProvider>
            </body>
            <GoogleAnalytics gaId={gaId} />
        </html>
    );
};

export default RootLayout;

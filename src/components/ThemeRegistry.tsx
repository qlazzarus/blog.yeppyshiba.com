'use client';

import { useThemeStore } from '@/stores/themeStore';
import darkTheme from '@/themes/darkTheme';
import lightTheme from '@/themes/lightTheme';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

type ThemeRegistryProps = {
    children: React.ReactNode;
};

const ThemeRegistry: React.FC<ThemeRegistryProps> = ({ children }) => {
    const mode = useThemeStore((state) => state.mode);
    const setMode = useThemeStore((state) => state.setMode);
    const [isInitialized, setIsInitialized] = useState(false); // persist 초기화 확인용

    useEffect(() => {
        const rehydrate = async () => {
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // persist 상태가 로드될 때까지 기다림
            if (isInitialized && mode === null && prefersDarkMode) {
                setMode('dark');
            } else if (isInitialized && mode === null) {
                setMode('light');
            }

            setIsInitialized(true); // 초기화 완료
        };

        rehydrate();
    }, [mode, setMode, isInitialized]);

    if (!isInitialized) {
        // persist 초기화가 완료되지 않은 상태에서는 빈 화면 또는 로딩 UI를 반환
        return null;
    }

    return (
        <ThemeProvider theme={!mode || mode === 'light' ? lightTheme : darkTheme}>
            <CssBaseline enableColorScheme />
            {children}
        </ThemeProvider>
    );
};

export default ThemeRegistry;

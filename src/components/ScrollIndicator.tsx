'use client';

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * 페이지 스크롤 진행도를 상단 바 형태로 표시해주는 컴포넌트
 */
const ScrollIndicator = () => {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            // 문서 전체 높이에서 현재 스크롤 위치를 백분율로 계산
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight =
                document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollRatio = (scrollTop / scrollHeight) * 100;

            setScrollProgress(scrollRatio);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                height: '4px',
                backgroundColor: 'primary.main',
                width: `${scrollProgress}%`,
                zIndex: 9999,
                transition: 'width 0.1s ease-out',
            }}
        />
    );
};

export default ScrollIndicator;

'use client';

import GradientAnimation from '@/animations/GradientAnimation';
import WaveAnimation from '@/animations/WaveAnimation';
import { Box, Container, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

interface JumbotronProps {
    title?: string;
    summary?: string;
    date?: string;
    category?: string;
}

const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE;

// 공백, null, undefined 모두 처리하기 위한 헬퍼
const fallbackIfEmpty = (value: string | undefined, fallback: string) =>
    value?.trim() ? value : fallback;

const Jumbotron = ({ title, date, category }: JumbotronProps) => {
    const [selectedAnimation, setSelectedAnimation] = useState<string>('wave'); // 애니메이션 타입

    // siteMetadata의 기본값
    // TODO
    const defaultTitle = siteTitle;

    // 사용자가 props로 넘겼다면 사용, 없으면 fallback
    const finalTitle = fallbackIfEmpty(title, defaultTitle || '');

    useEffect(() => {
        const animations = ['wave', 'gradient']; // 애니메이션 리스트
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        setSelectedAnimation(randomAnimation);
    }, []);

    return (
        <Box
            height={'25em'}
            position='relative'
            overflow='hidden' // 애니메이션이 상자 밖으로 넘어가지 않도록 설정
            display='flex'
            flexDirection='column'
            justifyContent='center'
            alignItems='center'
            textAlign='center'
            mb={4}
        >
            {/* 랜덤 애니메이션 */}
            {selectedAnimation === 'wave' && <WaveAnimation />}
            {selectedAnimation === 'gradient' && <GradientAnimation />}

            <Box
                position='absolute'
                top='50%'
                left='50%'
                sx={{ transform: 'translate(-50%, -50%)' }}
                zIndex={2}
            >
                <Container maxWidth='xl'>
                    {/* 타이틀 */}
                    <Typography
                        variant='h4'
                        component='h1'
                        gutterBottom
                        sx={{ textWrap: 'balance' }}
                    >
                        {finalTitle}
                    </Typography>

                    {/* 날짜/카테고리 등이 있으면 추가 표시 */}
                    {date && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant='caption' sx={{ mr: 2 }}>
                                {date}
                            </Typography>
                        </Box>
                    )}
                </Container>
            </Box>
        </Box>
    );
};

export default Jumbotron;

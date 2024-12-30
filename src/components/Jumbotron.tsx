'use client';

import GradientAnimation from '@/animations/GradientAnimation';
import WaveAnimation from '@/animations/WaveAnimation';
import { Box, Container, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

const Jumbotron = () => {
    const [selectedAnimation, setSelectedAnimation] = useState<string>('wave'); // 애니메이션 타입

    useEffect(() => {
        const animations = ['wave', 'gradient']; // 애니메이션 리스트
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        setSelectedAnimation(randomAnimation);
    }, []);

    return (
        <Box
            height={'25em'}
            position="relative"
            overflow="hidden" // 애니메이션이 상자 밖으로 넘어가지 않도록 설정
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            mb={4}
        >
            {/* 랜덤 애니메이션 */}
            {selectedAnimation === 'wave' && <WaveAnimation />}
            {selectedAnimation === 'gradient' && <GradientAnimation />}

            <Box position={'absolute'} top={'50%'} left={'50%'} sx={{ transform: 'translate(-50%, -50%)' }} zIndex={2}>
                <Container maxWidth="xl">
                    <Typography variant="h3" component="h1" gutterBottom>
                        Welcome to My Website
                    </Typography>
                    <Typography variant="h5" component="p">
                        This is a simple hero unit, a simple jumbotron-style component for showcasing content.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
};

export default Jumbotron;

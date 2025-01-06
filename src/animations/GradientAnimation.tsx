'use client';

import { useColorScheme } from '@mui/material';
import React from 'react';
import styled, { keyframes } from 'styled-components';

// themeStore에서 모드 가져오기

// 애니메이션 정의
const slide = keyframes`
  0% {
    transform: translateX(-25%);
  }
  100% {
    transform: translateX(25%);
  }
`;

// 공통 스타일의 배경
const Background = styled.div<{ $duration: string; $reverse?: boolean; $gradient: string }>`
    animation: ${slide} ${({ $duration }) => $duration} ease-in-out infinite
        ${({ $reverse }) => ($reverse ? 'alternate-reverse' : 'alternate')};
    background-image: ${({ $gradient }) => $gradient};
    bottom: 0;
    left: -50%;
    opacity: 0.5;
    position: absolute;
    right: -50%;
    top: 0;
    z-index: -1;
    width: 200%;
    height: 25em;
`;

const GradientAnimation = () => {
    const { mode, systemMode } = useColorScheme();
    // 현재 실제로 적용 중인 모드를 계산 (system이면 systemMode 사용)
    const activeMode = mode === 'system' ? systemMode : mode;

    // 다크 모드와 라이트 모드에 따른 그라디언트
    const gradient =
        activeMode === 'dark'
            ? 'linear-gradient(-60deg, #333 50%, #555 50%)' // 다크 모드
            : 'linear-gradient(-60deg, #6c3 50%, #09f 50%)'; // 라이트 모드

    return (
        <>
            <Background $duration='3s' $gradient={gradient} />
            <Background $duration='4s' $reverse={true} $gradient={gradient} />
            <Background $duration='5s' $gradient={gradient} />
        </>
    );
};

export default GradientAnimation;

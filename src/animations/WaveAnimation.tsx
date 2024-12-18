'use client';

import { useThemeStore } from '@/stores/themeStore';
import React from 'react';
import styled, { keyframes } from 'styled-components';

const moveForever = keyframes`
  0% {
    transform: translate3d(-90px, 0, 0);
  }
  100% {
    transform: translate3d(85px, 0, 0);
  }
`;

const Background = styled.div<{ $gradient: string }>`
    position: relative;
    background: ${({ $gradient }) => $gradient};
    width: 100%;
    height: 100%;
`;

const WaveContainer = styled.div`
    position: absolute; /* Background의 하단에 고정 */
    bottom: 0; /* Background 하단에 맞춤 */
    left: 0;
    width: 100%;
    height: 15vh;
    min-height: 100px;
    max-height: 150px;
    margin-bottom: -7px; /* Fix for safari gap */
`;

const Svg = styled.svg`
    width: 100%;
    height: 100%;
    shape-rendering: auto;
`;

const WaveUse = styled.use<{ fill: string }>`
    animation: ${moveForever} 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;
    fill: ${({ fill }) => fill};

    &:nth-child(1) {
        animation-delay: -2s;
        animation-duration: 7s;
    }

    &:nth-child(2) {
        animation-delay: -3s;
        animation-duration: 10s;
    }

    &:nth-child(3) {
        animation-delay: -4s;
        animation-duration: 13s;
    }

    &:nth-child(4) {
        animation-delay: -5s;
        animation-duration: 20s;
    }
`;

const WaveAnimation = () => {
    const mode = useThemeStore((state) => state.mode); // 다크 모드 여부 확인

    // 모드에 따른 스타일
    const gradient =
        mode === 'dark'
            ? 'linear-gradient(60deg, rgba(34,34,34,1) 0%, rgba(84,58,183,1) 100%)'
            : 'linear-gradient(60deg, rgba(84,58,183,1) 0%, rgba(0,172,193,1) 100%)';

    const waveColors =
        mode === 'dark'
            ? ['rgba(84,84,84,0.7)', 'rgba(84,84,84,0.5)', 'rgba(84,84,84,0.3)', '#222']
            : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)', '#fff'];

    return (
        <Background $gradient={gradient}>
            {/* Waves */}
            <WaveContainer>
                <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none">
                    <defs>
                        <path
                            id="gentle-wave"
                            d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                        />
                    </defs>
                    <g className="parallax">
                        <WaveUse href="#gentle-wave" x="48" y="0" fill={waveColors[0]} />
                        <WaveUse href="#gentle-wave" x="48" y="3" fill={waveColors[1]} />
                        <WaveUse href="#gentle-wave" x="48" y="5" fill={waveColors[2]} />
                        <WaveUse href="#gentle-wave" x="48" y="7" fill={waveColors[3]} />
                    </g>
                </Svg>
            </WaveContainer>
        </Background>
    );
};

export default WaveAnimation;

import React from 'react';
import styled, { keyframes } from 'styled-components';

const PARTICLES = 62; // Particle 개수
const PARTICLE_SIZE = 8; // Particle 크기
const RADIUS = 80; // 원의 반지름
const LAP_DURATION = 3; // 애니메이션 한 바퀴 시간 (초)

const Wrapper = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    width: 25em;
    height: 25em;
    transform: translate(-50%, -50%);
    perspective: 500px;
`;

const spin = keyframes`
  from {
    opacity: 0.0;
  }
  to {
    opacity: 0.6;
    transform: translate3d(-${PARTICLE_SIZE / 2}px, -${PARTICLE_SIZE / 2}px, 570px);
  }
`;

const Particle = styled.i<{ index: number }>`
    display: block;
    position: absolute;
    width: ${PARTICLE_SIZE}px;
    height: ${PARTICLE_SIZE}px;
    border-radius: ${PARTICLE_SIZE}px;
    opacity: 0;
    background: rgba(255, 255, 255, 0.5);
    box-shadow: 0px 0px 10px rgba(255, 255, 255, 1);

    animation-name: ${spin};
    animation-duration: ${LAP_DURATION}s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
    animation-delay: ${({ index }) => index * (LAP_DURATION / PARTICLES)}s;

    transform: rotate(${({ index }) => (index / PARTICLES) * 720}deg) translate3d(${RADIUS}px, 0, 0);
`;

const ParticlesAnimation = () => {
    return (
        <Wrapper>
            {Array.from({ length: PARTICLES }).map((_, index) => (
                <Particle key={index} index={index} />
            ))}
        </Wrapper>
    );
};

export default ParticlesAnimation;

import Phaser from 'phaser';
import type { Viewport } from './pseudo3dCamera';
import { RenderDepth } from './renderDepth';

export type SpeedEffectShaderUniforms = {
    downhillIntensity: number;
    eventIntensity: number;
    horizonY: number;
    intensity: number;
    time: number;
    viewport: Viewport;
};

export type SpeedEffectEnvelope = Pick<
    SpeedEffectShaderUniforms,
    'downhillIntensity' | 'eventIntensity' | 'intensity'
>;

// The shader's strongest possible blend contribution, not a pixel sample. This
// keeps the visual envelope comparable in drive telemetry without implying a
// glint occurred at a particular coordinate.
export function getSpeedEffectExpectedPeakAlpha(envelope: SpeedEffectEnvelope) {
    const eventBoost = Phaser.Math.Clamp(envelope.eventIntensity / 0.32, 0, 1);
    const downhillBoost = Phaser.Math.Clamp(envelope.downhillIntensity / 0.16, 0, 1);
    const asphaltStrength = Phaser.Math.Linear(0.08, 0.30, eventBoost);
    const shoulderStrength = Phaser.Math.Linear(
        0.09,
        0.24,
        Math.max(eventBoost * 0.55, downhillBoost),
    );

    return Phaser.Math.Clamp(Math.max(asphaltStrength, shoulderStrength) * envelope.intensity, 0, 1);
}

const SPEED_EFFECT_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform float uHorizonY;
uniform float uIntensity;
uniform float uEventIntensity;
uniform float uDownhillIntensity;
uniform float uTime;
uniform vec2 uResolution;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float linePulse(float value, float width) {
    float centered = abs(fract(value) - 0.5);

    return smoothstep(width, 0.0, centered);
}

void main() {
    vec2 uv = outTexCoord;
    float roadTop = clamp(uHorizonY, 0.08, 0.92);
    float roadDepth = clamp((uv.y - roadTop) / max(1.0 - roadTop, 0.08), 0.0, 1.0);
    float nearFade = smoothstep(0.1, 0.95, roadDepth);
    float bottomFade = 1.0 - smoothstep(0.88, 1.0, roadDepth);
    float roadMask = nearFade * bottomFade;

    vec2 fromVanishingPoint = vec2(uv.x - 0.5, roadTop - uv.y);
    float side = abs(fromVanishingPoint.x);
    float sideMask = smoothstep(0.1, 0.48, side);
    float centerClear = 1.0 - smoothstep(0.0, 0.11, side);
    float radial = side / max(roadDepth, 0.08);
    float streakSeed = floor(radial * 15.0);
    float streakNoise = hash(streakSeed * 17.13);
    float streak = linePulse(radial * 15.0 - uTime * (1.9 + streakNoise * 1.4), 0.045);
    float longitudinal = linePulse(pow(roadDepth, 1.5) * 21.0 + uTime * 2.6, 0.08);
    float asphaltGlint = streak * longitudinal * sideMask * centerClear * roadMask;

    float shoulderPulse = linePulse(roadDepth * 13.0 + uTime * 3.4, 0.055);
    float shoulderMask = smoothstep(0.34, 0.52, side) * roadMask;
    float shoulderGlint = shoulderPulse * shoulderMask;

    float eventBoost = clamp(uEventIntensity / 0.32, 0.0, 1.0);
    float downhillBoost = clamp(uDownhillIntensity / 0.16, 0.0, 1.0);
    float asphaltStrength = mix(0.08, 0.30, eventBoost);
    float shoulderStrength = mix(0.09, 0.24, max(eventBoost * 0.55, downhillBoost));
    float alpha = (asphaltGlint * asphaltStrength + shoulderGlint * shoulderStrength) * uIntensity;
    vec3 color = mix(vec3(0.48, 0.58, 0.62), vec3(0.95, 0.98, 1.0), asphaltGlint);

    gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function createSpeedEffectShader(
    scene: Phaser.Scene,
    viewport: Viewport,
    getUniforms: () => SpeedEffectShaderUniforms,
) {
    return scene.add
        .shader(
            {
                fragmentSource: SPEED_EFFECT_FRAGMENT_SHADER,
                setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
                    const uniforms = getUniforms();

                    setUniform('uHorizonY', uniforms.horizonY / uniforms.viewport.height);
                    setUniform('uIntensity', uniforms.intensity);
                    setUniform('uEventIntensity', uniforms.eventIntensity);
                    setUniform('uDownhillIntensity', uniforms.downhillIntensity);
                    setUniform('uResolution', [uniforms.viewport.width, uniforms.viewport.height]);
                    setUniform('uTime', uniforms.time);
                },
            },
            viewport.width / 2,
            viewport.height / 2,
            viewport.width,
            viewport.height,
        )
        .setDepth(RenderDepth.SpeedEffect)
        .setBlendMode(Phaser.BlendModes.ADD);
}

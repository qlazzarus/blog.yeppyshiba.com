import Phaser from 'phaser';
import type { Viewport } from './pseudo3dCamera';
import { RenderDepth } from './renderDepth';

export type HeadlightShaderUniforms = {
    carFrontX: number;
    carFrontY: number;
    lampHalfSpacing: number;
    intensity: number;
    viewport: Viewport;
};

const HEADLIGHT_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform vec2 uCarFront;
uniform float uLampHalfSpacing;
uniform float uIntensity;
uniform vec2 uResolution;

vec3 getLampPool(vec2 uv, vec2 lampCenter) {
    vec2 poolDelta = uv - lampCenter;
    poolDelta.x *= uResolution.x / uResolution.y;
    poolDelta.y *= 1.62;
    float radius = length(poolDelta);

    // A single soft, flattened ellipse per lamp. The absence of separate
    // bands keeps this from reading as a target reticle or concentric rings.
    float edgeFalloff = 1.0 - smoothstep(0.014, 0.150, radius);
    // Sharpen the filled center without introducing a separate band/ring.
    // This keeps both individual ellipses legible after their outer edges
    // overlap over the road center line.
    float pool = pow(edgeFalloff, 2.35);

    // RGB is accumulated per lamp. The shared part of the two ellipses is
    // therefore brighter than either pool on its own.
    return vec3(
        edgeFalloff * 0.025 + pool * 0.29,
        edgeFalloff * 0.045 + pool * 0.39,
        edgeFalloff * 0.07 + pool * 0.51
    );
}

void main() {
    vec2 uv = outTexCoord;
    // WebGL coordinates grow upward. Place the left/right emitters just ahead
    // of the visible car front; each pool is a vertically squashed ellipse.
    vec2 poolOrigin = uCarFront + vec2(0.0, 0.035);
    vec3 leftPool = getLampPool(uv, poolOrigin + vec2(-uLampHalfSpacing, 0.0));
    vec3 rightPool = getLampPool(uv, poolOrigin + vec2(uLampHalfSpacing, 0.0));
    vec3 color = (leftPool + rightPool) * uIntensity;
    float alpha = max(max(color.r, color.g), color.b);

    gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function createHeadlightShader(
    scene: Phaser.Scene,
    viewport: Viewport,
    getUniforms: () => HeadlightShaderUniforms,
) {
    return scene.add
        .shader(
            {
                fragmentSource: HEADLIGHT_FRAGMENT_SHADER,
                setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
                    const uniforms = getUniforms();

                    setUniform('uCarFront', [
                        uniforms.carFrontX / uniforms.viewport.width,
                        1 - uniforms.carFrontY / uniforms.viewport.height,
                    ]);
                    setUniform('uLampHalfSpacing',
                        uniforms.lampHalfSpacing / uniforms.viewport.width);
                    setUniform('uIntensity', uniforms.intensity);
                    setUniform('uResolution', [uniforms.viewport.width, uniforms.viewport.height]);
                },
            },
            viewport.width / 2,
            viewport.height / 2,
            viewport.width,
            viewport.height,
        )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(RenderDepth.Headlight);
}

import Phaser from 'phaser';
import type { Viewport } from './pseudo3dCamera';
import { RenderDepth } from './renderDepth';

export type HeadlightShaderUniforms = {
    beamAimX: number;
    intensity: number;
    lampLeft: {
        x: number;
        y: number;
    };
    lampRight: {
        x: number;
        y: number;
    };
    viewport: Viewport;
};

const HEADLIGHT_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform float uBeamAimX;
uniform float uIntensity;
uniform vec2 uLampLeftOrigin;
uniform vec2 uLampRightOrigin;
uniform vec2 uResolution;

const float HEADLIGHT_BEAM_REACH = 0.295;

float softEllipse(vec2 point, vec2 center, vec2 radius, float edgeStart) {
    float distanceFromCenter = length((point - center) / radius);

    return 1.0 - smoothstep(edgeStart, 1.0, distanceFromCenter);
}

vec3 getLampProjection(vec2 point, float side) {
    float beamStart = -0.012;
    float beamReach = HEADLIGHT_BEAM_REACH;
    float progress = clamp((point.y - beamStart) / (beamReach - beamStart), 0.0, 1.0);

    // Each lamp starts as a narrow strip at the bumper, moves slightly
    // outward, and grows wider with distance. Together the two fans form the
    // inverse-trapezoid throw that was missing from the ellipse-only version.
    float pathX = side * mix(0.004, 0.045, pow(progress, 0.82));
    float halfWidth = mix(0.020, 0.105, pow(progress, 0.72));
    float normalizedLateral = abs(point.x - pathX) / halfWidth;
    float outerFan = 1.0 - smoothstep(0.58, 1.12, normalizedLateral);
    float innerFan = 1.0 - smoothstep(0.18, 0.72, normalizedLateral);
    float nearFade = smoothstep(beamStart, 0.025, point.y);
    float farFade = 1.0 - smoothstep(0.205, beamReach, point.y);
    float middleLift = 1.0 - smoothstep(0.0, 0.55, abs(progress - 0.52));
    float throwProfile = nearFade * farFade * mix(0.48, 1.0, middleLift);

    return throwProfile * (
        outerFan * vec3(0.012, 0.030, 0.055) +
        innerFan * vec3(0.012, 0.025, 0.045)
    );
}

vec3 getLampPool(vec2 point, float side) {
    // The farther part of each pool fans slightly away from the car center.
    // Three nested, borderless ellipses make one continuous pool: a broad
    // spill, the readable beam body, and a compact white-blue hot spot.
    vec2 spillCenter = vec2(side * 0.014, 0.086);
    vec2 bodyCenter = vec2(side * 0.020, 0.098);
    vec2 hotCenter = vec2(side * 0.024, 0.108);

    float spill = softEllipse(point, spillCenter, vec2(0.225, 0.135), 0.24);
    float body = softEllipse(point, bodyCenter, vec2(0.170, 0.095), 0.18);
    float hot = softEllipse(point, hotCenter, vec2(0.092, 0.052), 0.08);

    // Clip the small amount of ellipse that would otherwise leak behind the
    // visible front of the car, while preserving a soft join at the bumper.
    float forwardMask = smoothstep(-0.012, 0.022, point.y);
    spill *= forwardMask;
    body *= forwardMask;
    hot *= forwardMask;

    return
        spill * vec3(0.035, 0.070, 0.110) +
        body * vec3(0.130, 0.250, 0.360) +
        hot * vec3(0.180, 0.290, 0.360);
}

vec2 getLampPoint(vec2 uv, vec2 lampOrigin) {
    // WebGL coordinates grow upward. Work in aspect-corrected, lamp-relative
    // coordinates so every atlas pose can attach to its actual front lamps.
    vec2 point = uv - lampOrigin;
    float aspect = uResolution.x / uResolution.y;
    point.x *= aspect;

    // Keep both lamps attached to the bumper, then progressively steer the
    // fan and light pools toward the damped screen-space target. Shearing the
    // field avoids rotating the near pool behind the car on sharp turns.
    // Bring enough of the aim into the near pool for a grip turn to read,
    // while retaining a zero-offset bumper attachment.
    float aimProgress = pow(clamp(point.y / HEADLIGHT_BEAM_REACH, 0.0, 1.0), 0.52);
    point.x -= uBeamAimX * aspect * aimProgress;

    return point;
}

void main() {
    vec2 uv = outTexCoord;
    vec2 leftPoint = getLampPoint(uv, uLampLeftOrigin);
    vec2 rightPoint = getLampPoint(uv, uLampRightOrigin);
    vec3 leftProjection = getLampProjection(leftPoint, -1.0);
    vec3 rightProjection = getLampProjection(rightPoint, 1.0);
    vec3 leftPool = getLampPool(leftPoint, -1.0);
    vec3 rightPool = getLampPool(rightPoint, 1.0);
    vec3 color = (
        leftProjection +
        rightProjection +
        leftPool +
        rightPool
    ) * uIntensity;
    float alpha = max(max(color.r, color.g), color.b);

    // Phaser's ADD blend mode already consumes RGB as the additive amount.
    // Multiplying it by alpha here would square the falloff and collapse the
    // soft pool into the dim horizontal strip seen in the previous version.
    gl_FragColor = vec4(color, alpha);
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

                    setUniform('uLampLeftOrigin', [
                        uniforms.lampLeft.x / uniforms.viewport.width,
                        1 - uniforms.lampLeft.y / uniforms.viewport.height,
                    ]);
                    setUniform('uLampRightOrigin', [
                        uniforms.lampRight.x / uniforms.viewport.width,
                        1 - uniforms.lampRight.y / uniforms.viewport.height,
                    ]);
                    setUniform('uBeamAimX', uniforms.beamAimX / uniforms.viewport.width);
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

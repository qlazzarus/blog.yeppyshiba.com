import Phaser from 'phaser';
import type { Viewport } from './pseudo3dCamera';
import { RenderDepth } from './renderDepth';
import {
    HEADLIGHT_CORNER_FILL_FAR_FADE_START_RATIO,
    HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO,
    HEADLIGHT_CORNER_FILL_NEAR_WIDTH_RATIO,
    HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO,
    HEADLIGHT_CORNER_FILL_WIDTH_EXPONENT,
    HEADLIGHT_EMITTER_CORE_FAR_FADE_START_RATIO,
    HEADLIGHT_EMITTER_OVERLAP_GAIN,
    HEADLIGHT_EMITTER_TOE_IN_RATIO,
    HEADLIGHT_FAR_FADE_START_RATIO,
    HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO,
    HEADLIGHT_MAIN_SWIVEL_MAX_DEG,
    HEADLIGHT_SWIVEL_EXPONENT,
    HEADLIGHT_SWIVEL_START_PROGRESS,
    HEADLIGHT_WIDTH_EXPONENT,
} from './vehicleHeadlight';

export type HeadlightShaderUniforms = {
    beamCenter: {
        x: number;
        y: number;
    };
    beamForwardAxis: {
        x: number;
        y: number;
    };
    beamLateralAxis: {
        x: number;
        y: number;
    };
    cornerFillIntensity: number;
    cornerFillReachScale: number;
    cornerFillWeight: number;
    cornerFillYawDeg: number;
    farHalfWidthRatio: number;
    intensity: number;
    lampHalfSpan: number;
    lampLeftIntensity: number;
    lampLeftOrigin: { x: number; y: number };
    lampLeftReachScale: number;
    lampRightIntensity: number;
    lampRightOrigin: { x: number; y: number };
    lampRightReachScale: number;
    lobeWidthScale: number;
    mainSwivelDeg: number;
    mergeStartRatio: number;
    nearPaddingPx: number;
    reachRatio: number;
    viewport: Viewport;
};

const HEADLIGHT_FRAGMENT_SHADER = `
precision mediump float;

varying vec2 outTexCoord;

uniform float uIntensity;
uniform vec2 uBeamCenter;
uniform vec2 uBeamForwardAxis;
uniform vec2 uBeamLateralAxis;
uniform float uBeamFarHalfWidthRatio;
uniform float uBeamNearPaddingPx;
uniform float uBeamReachRatio;
uniform float uLampHalfSpan;
uniform vec2 uLampLeftOrigin;
uniform vec2 uLampRightOrigin;
uniform float uLampLeftIntensity;
uniform float uLampRightIntensity;
uniform float uLampLeftReachScale;
uniform float uLampRightReachScale;
uniform float uLobeWidthScale;
uniform float uMergeStartRatio;
uniform float uMainSwivelDeg;
uniform float uCornerFillIntensity;
uniform float uCornerFillReachScale;
uniform float uCornerFillWeight;
uniform float uCornerFillYawDeg;
uniform vec2 uResolution;

vec3 getSharedSpillFootprint(vec2 screenPoint) {
    // The broad trapezoid is now only a low-density spill. Readable energy is
    // supplied by the two actual lamp emitters below, preventing a rotated
    // rectangular light board on side-facing frames.
    vec2 delta = screenPoint - uBeamCenter;
    float localX = dot(delta, uBeamLateralAxis);
    float localY = dot(delta, uBeamForwardAxis);
    float beamReach = max(uResolution.y * uBeamReachRatio, 1.0);
    float progress = clamp(localY / beamReach, 0.0, 1.0);
    float nearHalfWidth = uLampHalfSpan + uBeamNearPaddingPx;
    float farHalfWidth = uResolution.y * uBeamFarHalfWidthRatio;
    float halfWidth = mix(
        nearHalfWidth,
        farHalfWidth,
        pow(progress, ${HEADLIGHT_WIDTH_EXPONENT.toFixed(2)})
    );

    // The first 30% is exactly anchored to the lamps. From there the optical
    // angle grows into a lateral displacement. Compensating the outside half
    // width preserves forward coverage while only the inside edge gains the
    // additional 12% corner-oriented spread.
    float swivelBlend = pow(
        smoothstep(${HEADLIGHT_SWIVEL_START_PROGRESS.toFixed(2)}, 1.0, progress),
        ${HEADLIGHT_SWIVEL_EXPONENT.toFixed(1)}
    );
    float swivelOffset = tan(radians(uMainSwivelDeg)) * localY * swivelBlend;
    float turnMagnitude = clamp(
        abs(uMainSwivelDeg) / ${HEADLIGHT_MAIN_SWIVEL_MAX_DEG.toFixed(1)},
        0.0,
        1.0
    );
    float insideExpansion = farHalfWidth *
        ${HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO.toFixed(2)} *
        turnMagnitude * swivelBlend;
    float outsideCompensation = abs(swivelOffset);
    float leftHalfWidth = halfWidth;
    float rightHalfWidth = halfWidth;

    if (uMainSwivelDeg > 0.0) {
        leftHalfWidth += outsideCompensation;
        rightHalfWidth += insideExpansion;
    } else if (uMainSwivelDeg < 0.0) {
        leftHalfWidth += insideExpansion;
        rightHalfWidth += outsideCompensation;
    }

    float steeredLocalX = localX - swivelOffset;
    float activeHalfWidth = steeredLocalX < 0.0 ? leftHalfWidth : rightHalfWidth;
    float trapezoidDistance = abs(steeredLocalX) / max(activeHalfWidth, 1.0) - 1.0;

    float outer = 1.0 - smoothstep(-0.02, 0.10, trapezoidDistance);
    float body = 1.0 - smoothstep(-0.38, -0.02, trapezoidDistance);
    float nearFade = smoothstep(-2.0, uResolution.y * 0.022, localY);
    float farFade = 1.0 - smoothstep(
        beamReach * ${HEADLIGHT_FAR_FADE_START_RATIO.toFixed(2)},
        beamReach,
        localY
    );
    float longitudinalGain = mix(0.72, 1.0, smoothstep(0.08, 0.42, progress));
    float perspectiveWeight = min(uLampLeftIntensity, uLampRightIntensity);
    float sharedWeight = mix(0.45, 1.0, perspectiveWeight);
    float footprint = nearFade * farFade * longitudinalGain * sharedWeight;

    return footprint * (
        outer * vec3(0.021, 0.054, 0.095) +
        body * vec3(0.027, 0.073, 0.130)
    );
}

vec3 getEmitterCoreFootprint(
    vec2 screenPoint,
    vec2 lampOrigin,
    float emitterIntensity,
    float emitterReachScale
) {
    vec2 delta = screenPoint - lampOrigin;
    float localX = dot(delta, uBeamLateralAxis);
    float localY = dot(delta, uBeamForwardAxis);
    float fullReach = max(uResolution.y * uBeamReachRatio, 1.0);
    float emitterReach = max(fullReach * emitterReachScale, 1.0);
    float progress = clamp(localY / emitterReach, 0.0, 1.0);

    // Each core begins at its real lamp. Production headlamps are close to
    // parallel, so only a small toe-in is applied; widening lobes create the
    // overlap naturally instead of crossing at the shared center.
    float lampOffset = dot(lampOrigin - uBeamCenter, uBeamLateralAxis);
    float mergeBlend = smoothstep(
        uMergeStartRatio * 0.45,
        uMergeStartRatio,
        progress
    );
    float swivelBlend = pow(
        smoothstep(${HEADLIGHT_SWIVEL_START_PROGRESS.toFixed(2)}, 1.0, progress),
        ${HEADLIGHT_SWIVEL_EXPONENT.toFixed(1)}
    );
    float swivelOffset = tan(radians(uMainSwivelDeg)) * localY * swivelBlend;
    float toeInOffset = mix(
        0.0,
        -lampOffset * ${HEADLIGHT_EMITTER_TOE_IN_RATIO.toFixed(2)},
        mergeBlend
    );
    float coreCenterX = toeInOffset + swivelOffset;
    float nearHalfWidth = max(
        uLampHalfSpan * 0.45 + uBeamNearPaddingPx,
        4.0
    );
    float farHalfWidth = uResolution.y * uBeamFarHalfWidthRatio * uLobeWidthScale;
    float halfWidth = mix(
        nearHalfWidth,
        farHalfWidth,
        pow(progress, 0.78)
    );
    float lobeDistance = abs(localX - coreCenterX) / max(halfWidth, 1.0) - 1.0;
    float outer = 1.0 - smoothstep(-0.02, 0.12, lobeDistance);
    float body = 1.0 - smoothstep(-0.42, -0.04, lobeDistance);
    float core = 1.0 - smoothstep(-0.76, -0.34, lobeDistance);
    float nearFade = smoothstep(-1.5, uResolution.y * 0.014, localY);
    float farFade = 1.0 - smoothstep(
        emitterReach * ${HEADLIGHT_EMITTER_CORE_FAR_FADE_START_RATIO.toFixed(2)},
        emitterReach,
        localY
    );
    float longitudinalGain = mix(0.66, 1.0, smoothstep(0.06, 0.40, progress));
    float footprint = nearFade * farFade * longitudinalGain * emitterIntensity;

    return footprint * (
        outer * vec3(0.014, 0.038, 0.065) +
        body * vec3(0.035, 0.090, 0.150) +
        core * vec3(0.022, 0.058, 0.095)
    );
}

vec3 getCornerFillFootprint(vec2 screenPoint) {
    // A short asymmetric wedge shares the rotated main lamp basis. Its yaw is
    // relative to the frame-forward axis, widening the inner corner without
    // moving the main near edge or creating a detached circular pool.
    vec2 delta = screenPoint - uBeamCenter;
    float localX = dot(delta, uBeamLateralAxis);
    float localY = dot(delta, uBeamForwardAxis);
    float yaw = radians(uCornerFillYawDeg);
    float sine = sin(yaw);
    float cosine = cos(yaw);
    float cornerX = localX * cosine - localY * sine;
    float cornerY = localX * sine + localY * cosine;
    float beamReach = max(uResolution.y * uBeamReachRatio, 1.0);
    float cornerReach = max(beamReach * uCornerFillReachScale, 1.0);
    float progress = clamp(cornerY / cornerReach, 0.0, 1.0);
    float nearHalfWidth = (uLampHalfSpan + uBeamNearPaddingPx) *
        ${HEADLIGHT_CORNER_FILL_NEAR_WIDTH_RATIO.toFixed(2)};
    float farHalfWidth = uResolution.y * uBeamFarHalfWidthRatio;
    float widthBlend = pow(progress, ${HEADLIGHT_CORNER_FILL_WIDTH_EXPONENT.toFixed(2)});
    float outsideHalfWidth = mix(
        nearHalfWidth,
        farHalfWidth * ${HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO.toFixed(2)},
        widthBlend
    );
    float insideHalfWidth = mix(
        nearHalfWidth,
        farHalfWidth * ${HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO.toFixed(2)},
        widthBlend
    );
    bool insideSide = uCornerFillYawDeg > 0.0 ? cornerX >= 0.0 : cornerX <= 0.0;
    float activeHalfWidth = insideSide ? insideHalfWidth : outsideHalfWidth;
    float wedgeDistance = abs(cornerX) / max(activeHalfWidth, 1.0) - 1.0;
    float outer = 1.0 - smoothstep(-0.02, 0.10, wedgeDistance);
    float body = 1.0 - smoothstep(-0.38, -0.02, wedgeDistance);
    float core = 1.0 - smoothstep(-0.72, -0.30, wedgeDistance);
    float nearFade = smoothstep(-2.0, uResolution.y * 0.018, cornerY);
    float farFade = 1.0 - smoothstep(
        cornerReach * ${HEADLIGHT_CORNER_FILL_FAR_FADE_START_RATIO.toFixed(2)},
        cornerReach,
        cornerY
    );
    float longitudinalGain = mix(0.66, 0.94, smoothstep(0.08, 0.48, progress));
    float footprint = nearFade * farFade * longitudinalGain *
        uCornerFillIntensity * uCornerFillWeight;

    return footprint * (
        outer * vec3(0.022, 0.055, 0.090) +
        body * vec3(0.034, 0.095, 0.155) +
        core * vec3(0.019, 0.052, 0.085)
    );
}

void main() {
    vec2 screenPoint = vec2(
        outTexCoord.x * uResolution.x,
        (1.0 - outTexCoord.y) * uResolution.y
    );
    vec3 sharedSpill = getSharedSpillFootprint(screenPoint);
    vec3 leftCore = getEmitterCoreFootprint(
        screenPoint,
        uLampLeftOrigin,
        uLampLeftIntensity,
        uLampLeftReachScale
    );
    vec3 rightCore = getEmitterCoreFootprint(
        screenPoint,
        uLampRightOrigin,
        uLampRightIntensity,
        uLampRightReachScale
    );
    // Bounded overlap keeps the joint region brighter without doubling it.
    vec3 emitterOverlap = max(leftCore, rightCore) +
        min(leftCore, rightCore) * ${HEADLIGHT_EMITTER_OVERLAP_GAIN.toFixed(2)};
    vec3 mainColor = max(sharedSpill, emitterOverlap);
    vec3 cornerColor = getCornerFillFootprint(screenPoint);
    // max() forms a bounded union: the fill can extend the inner edge but can
    // never stack another 30% on top of the already lit main footprint.
    vec3 color = max(mainColor, cornerColor) * uIntensity;
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
                name: 'apex-seoul-headlight-trapezoid',
                setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
                    const uniforms = getUniforms();

                    setUniform('uBeamCenter', [uniforms.beamCenter.x, uniforms.beamCenter.y]);
                    setUniform('uBeamForwardAxis', [
                        uniforms.beamForwardAxis.x,
                        uniforms.beamForwardAxis.y,
                    ]);
                    setUniform('uBeamLateralAxis', [
                        uniforms.beamLateralAxis.x,
                        uniforms.beamLateralAxis.y,
                    ]);
                    setUniform('uBeamFarHalfWidthRatio', uniforms.farHalfWidthRatio);
                    setUniform('uBeamNearPaddingPx', uniforms.nearPaddingPx);
                    setUniform('uBeamReachRatio', uniforms.reachRatio);
                    setUniform('uLampHalfSpan', uniforms.lampHalfSpan);
                    setUniform('uLampLeftOrigin', [
                        uniforms.lampLeftOrigin.x,
                        uniforms.lampLeftOrigin.y,
                    ]);
                    setUniform('uLampRightOrigin', [
                        uniforms.lampRightOrigin.x,
                        uniforms.lampRightOrigin.y,
                    ]);
                    setUniform('uLampLeftIntensity', uniforms.lampLeftIntensity);
                    setUniform('uLampRightIntensity', uniforms.lampRightIntensity);
                    setUniform('uLampLeftReachScale', uniforms.lampLeftReachScale);
                    setUniform('uLampRightReachScale', uniforms.lampRightReachScale);
                    setUniform('uLobeWidthScale', uniforms.lobeWidthScale);
                    setUniform('uMergeStartRatio', uniforms.mergeStartRatio);
                    setUniform('uMainSwivelDeg', uniforms.mainSwivelDeg);
                    setUniform('uCornerFillIntensity', uniforms.cornerFillIntensity);
                    setUniform('uCornerFillReachScale', uniforms.cornerFillReachScale);
                    setUniform('uCornerFillWeight', uniforms.cornerFillWeight);
                    setUniform('uCornerFillYawDeg', uniforms.cornerFillYawDeg);
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

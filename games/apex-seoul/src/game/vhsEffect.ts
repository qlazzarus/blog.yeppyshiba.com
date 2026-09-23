import Phaser from 'phaser';
import { gameSettingsStore } from './gameSettings';

const NODE = 'ApexVhs';

// Original single-pass CRT + tape effect. Distort the captured image, never the
// gameplay camera or input coordinates. Three samples keep mobile cost modest.
const FRAGMENT = `
#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uDisplayResolution;
uniform float uTime;
uniform float uMotion;
uniform vec3 uTapeClock;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)
float noise(vec2 p) {
    return fract(sin(dot(mod(p, 251.0), vec2(12.9898, 78.233))) * 437.5453);
}
// 5×7 recorder OSD glyphs: digits, P L A Y, colon and play triangle.
// Small row masks remain exact even on mediump fragment implementations.
float glyph(float id, vec2 point) {
    vec2 cell = floor(point);
    if (cell.x < 0.0 || cell.x >= 5.0 || cell.y < 0.0 || cell.y >= 7.0) return 0.0;
    vec4 upper = vec4(0.0);
    vec4 lower = vec4(0.0);
    if (id == 0.0) { upper = vec4(14.0, 17.0, 19.0, 21.0); lower = vec4(25.0, 17.0, 14.0, 0.0); }
    else if (id == 1.0) { upper = vec4(4.0, 12.0, 4.0, 4.0); lower = vec4(4.0, 4.0, 14.0, 0.0); }
    else if (id == 2.0) { upper = vec4(14.0, 17.0, 1.0, 2.0); lower = vec4(4.0, 8.0, 31.0, 0.0); }
    else if (id == 3.0) { upper = vec4(30.0, 1.0, 1.0, 14.0); lower = vec4(1.0, 1.0, 30.0, 0.0); }
    else if (id == 4.0) { upper = vec4(2.0, 6.0, 10.0, 18.0); lower = vec4(31.0, 2.0, 2.0, 0.0); }
    else if (id == 5.0) { upper = vec4(31.0, 16.0, 16.0, 30.0); lower = vec4(1.0, 1.0, 30.0, 0.0); }
    else if (id == 6.0) { upper = vec4(14.0, 16.0, 16.0, 30.0); lower = vec4(17.0, 17.0, 14.0, 0.0); }
    else if (id == 7.0) { upper = vec4(31.0, 1.0, 2.0, 4.0); lower = vec4(8.0, 8.0, 8.0, 0.0); }
    else if (id == 8.0) { upper = vec4(14.0, 17.0, 17.0, 14.0); lower = vec4(17.0, 17.0, 14.0, 0.0); }
    else if (id == 9.0) { upper = vec4(14.0, 17.0, 17.0, 15.0); lower = vec4(1.0, 1.0, 14.0, 0.0); }
    else if (id == 10.0) { upper = vec4(30.0, 17.0, 17.0, 30.0); lower = vec4(16.0, 16.0, 16.0, 0.0); }
    else if (id == 11.0) { upper = vec4(16.0, 16.0, 16.0, 16.0); lower = vec4(16.0, 16.0, 31.0, 0.0); }
    else if (id == 12.0) { upper = vec4(14.0, 17.0, 17.0, 31.0); lower = vec4(17.0, 17.0, 17.0, 0.0); }
    else if (id == 13.0) { upper = vec4(17.0, 17.0, 10.0, 4.0); lower = vec4(4.0, 4.0, 4.0, 0.0); }
    else if (id == 14.0) { upper = vec4(0.0, 4.0, 4.0, 0.0); lower = vec4(4.0, 4.0, 0.0, 0.0); }
    else if (id == 15.0) { upper = vec4(16.0, 24.0, 28.0, 30.0); lower = vec4(28.0, 24.0, 16.0, 0.0); }
    float row = cell.y < 1.0 ? upper.x : cell.y < 2.0 ? upper.y
        : cell.y < 3.0 ? upper.z : cell.y < 4.0 ? upper.w
        : cell.y < 5.0 ? lower.x : cell.y < 6.0 ? lower.y : lower.z;
    return mod(floor(row / exp2(4.0 - cell.x)), 2.0);
}
float tapeOsd(vec2 uv) {
    float pixel = max(1.5, uDisplayResolution.y / 300.0);
    vec2 screen = vec2(uv.x, 1.0 - uv.y) * uDisplayResolution;
    vec2 origin = vec2(uDisplayResolution.x - 48.0 * pixel - uDisplayResolution.x * 0.045,
                       uDisplayResolution.y * 0.055);
    vec2 p = (screen - origin) / pixel;
    if (p.x < 0.0 || p.x >= 48.0 || p.y < 0.0 || p.y >= 18.0) return 0.0;
    float slot = floor(p.x / 6.0);
    float id = -1.0;
    if (p.y < 7.0) {
        if (slot < 4.0) id = 10.0 + slot;
        else if (slot == 5.0) id = 15.0;
    } else if (p.y >= 11.0) {
        p.y -= 11.0;
        if (slot == 2.0 || slot == 5.0) id = 14.0;
        else {
            float value = slot < 2.0 ? uTapeClock.x : (slot < 5.0 ? uTapeClock.y : uTapeClock.z);
            bool tens = slot == 0.0 || slot == 3.0 || slot == 6.0;
            id = tens ? floor(value / 10.0) : mod(value, 10.0);
        }
    }
    return glyph(id, vec2(mod(p.x, 6.0), p.y));
}
void main() {
    vec2 uv = outTexCoord;
    vec2 centered = uv * 2.0 - 1.0;
    // Cross-axis curvature bows all four edges like a convex glass tube.
    vec2 curved = centered * (1.0 + 0.035 * centered.yx * centered.yx);
    uv = curved * 0.5 + 0.5;
    // Rounded glass boundary in aspect-correct coordinates. Compute before
    // clamping the sampler so the corners become a bezel, not smeared pixels.
    float aspect = uDisplayResolution.x / uDisplayResolution.y;
    vec2 extent = vec2(aspect, 1.0);
    float radius = 0.115;
    vec2 corner = abs(curved) * extent - (extent - radius);
    float glassDistance = length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - radius;
    float feather = 3.0 / uDisplayResolution.y;
    float glass = 1.0 - smoothstep(-feather, feather, glassDistance);
    // A short tracking slip every 7–11 seconds, with quiet intervals.
    float cycle = floor(uTime / 11.0);
    float onset = 7.0 + noise(vec2(cycle, 2.0)) * 3.0;
    float phase = mod(uTime, 11.0) - onset;
    float slip = step(0.0, phase) * (1.0 - smoothstep(0.08, 0.28, phase)) * uMotion;
    float frame = floor(uTime * 30.0);
    float band = 1.0 - smoothstep(0.0, 0.045, abs(uv.y - fract(uTime * 0.13)));
    uv.x += uMotion * sin(uv.y * 31.0 + uTime * 1.7) * 0.00015;
    uv.x += band * 0.0005 * uMotion;
    uv.x += slip * (noise(vec2(frame, floor(uv.y * 28.0))) - 0.5) * 0.009;
    uv.y += slip * sin(frame * 2.4) * 0.0018;
    // Clamp sampling at the edges to avoid wraparound during tracking slips.
    vec2 edge = 1.0 / uResolution;
    uv = clamp(uv, edge, 1.0 - edge);
    vec4 source = texture2D(uMainSampler, uv);
    float bleed = (0.8 + slip * 1.4) / uResolution.x;
    vec3 color = vec3(
        texture2D(uMainSampler, clamp(uv + vec2(bleed, 0.0), edge, 1.0 - edge)).r,
        source.g,
        texture2D(uMainSampler, clamp(uv - vec2(bleed, 0.0), edge, 1.0 - edge)).b
    );
    // Composite into the tape signal before scanlines, phosphor and glass.
    // The same warped UV makes the OSD bend and slip with the recorded image.
    float ink = tapeOsd(uv);
    float shadow = tapeOsd(uv + vec2(-1.0, 1.0) / uDisplayResolution);
    color *= 1.0 - shadow * 0.65;
    float fringe = tapeOsd(uv + vec2(1.0 / uDisplayResolution.x, 0.0));
    color = mix(color, vec3(0.50, 0.65, 0.72), fringe * 0.25);
    color = mix(color, vec3(0.92, 0.96, 0.87), ink * 0.95);
    // Space the beam lines in displayed pixels so FIT scaling on phones
    // doesn't erase them or turn the pattern into broad moiré bands.
    float scanline = 0.5 + 0.5 * cos(uv.y * uDisplayResolution.y * 2.0943951);
    color *= 1.10 * (1.0 - scanline * 0.25);
    float phosphor = mod(floor(outTexCoord.x * uDisplayResolution.x), 3.0);
    vec3 grille = phosphor < 1.0 ? vec3(1.04, 0.97, 0.97)
        : (phosphor < 2.0 ? vec3(0.97, 1.04, 0.97) : vec3(0.97, 0.97, 1.04));
    color *= grille;
    float grain = noise(vec2(floor(uv.x * uResolution.x), floor(uv.y * uResolution.y)) + mod(frame, 120.0));
    color += (grain - 0.5) * 0.012 * source.a;
    color *= 1.0 - smoothstep(0.35, 1.7, dot(centered, centered)) * 0.24;
    // Darken the glass just inside the bezel for a softly rounded tube lip.
    color *= 0.80 + 0.20 * smoothstep(0.0, 0.075, -glassDistance);
    gl_FragColor = vec4(mix(vec3(0.003, 0.005, 0.008), clamp(color, 0.0, source.a), glass), 1.0);
}`;

class VhsController extends Phaser.Filters.Controller {
    time = 0;
    motion = 1;
    tapeClock = [0, 0, 0];
    displayWidth = 1;
    displayHeight = 1;

    constructor(camera: Phaser.Cameras.Scene2D.Camera) {
        super(camera, NODE);
    }
}

class VhsRenderNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
    constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
        super(NODE, manager, undefined, FRAGMENT);
    }

    setupUniforms(controller: VhsController, context: Phaser.Renderer.WebGL.DrawingContext) {
        this.programManager.setUniform('uResolution', [context.width, context.height]);
        this.programManager.setUniform('uDisplayResolution', [controller.displayWidth, controller.displayHeight]);
        this.programManager.setUniform('uTime', controller.time);
        this.programManager.setUniform('uMotion', controller.motion);
        this.programManager.setUniform('uTapeClock', controller.tapeClock);
    }
}

/** Camera filters own both the CRT image and recorder OSD; no DOM overlay. */
export function installVhsEffect(game: Phaser.Game) {
    const filters = new WeakMap<Phaser.Cameras.Scene2D.Camera, VhsController>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let elapsed = 0;
    const update = () => {
        const renderer = game.renderer;
        if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
        if (!renderer.renderNodes.hasNode(NODE)) {
            renderer.renderNodes.addNodeConstructor(NODE, VhsRenderNode);
        }
        const settings = gameSettingsStore.getSettings();
        const enabled = settings.crtEffect;
        const still = reducedMotion.matches || settings.reducedMotion;
        if (enabled) elapsed += Math.min(game.loop.delta, 100) / 1000;
        const seconds = Math.floor(elapsed);
        for (const scene of game.scene.getScenes(true)) {
            const camera = scene.cameras.main;
            let filter = filters.get(camera);
            if (!filter) {
                filter = new VhsController(camera);
                camera.filters.external.add(filter);
                filters.set(camera, filter);
            }
            filter.active = enabled;
            filter.time = still ? 0 : elapsed % 1100;
            filter.motion = still ? 0 : 1;
            filter.tapeClock[0] = Math.floor(seconds / 3600) % 100;
            filter.tapeClock[1] = Math.floor(seconds / 60) % 60;
            filter.tapeClock[2] = seconds % 60;
            filter.displayWidth = Math.max(1, game.scale.displaySize.width);
            filter.displayHeight = Math.max(1, game.scale.displaySize.height);
        }
    };
    game.events.on(Phaser.Core.Events.POST_STEP, update);
    game.events.once(Phaser.Core.Events.DESTROY, () => {
        game.events.off(Phaser.Core.Events.POST_STEP, update);
    });
}

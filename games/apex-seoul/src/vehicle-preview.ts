import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import ft86ModelUrl from '../assets/vehicles/optimized/toyota_gt86-optimized.glb?url';
import stingerBadgeDebugModelUrl from '../assets/vehicles/derived/kia_stinger-badge-debug.glb?url';
import stingerSpriteMasterModelUrl from '../assets/vehicles/derived/kia_stinger-sprite-master.glb?url&v=rear-panel-line-triangles-r3';
import g70ModelUrl from '../assets/vehicles/optimized/genesis_g70-optimized.glb?url';
import g70NieveModelUrl from '../assets/vehicles/optimized/genesis_g70_nieve-sprite-master-optimized.glb?url&v=front-grille-r3';
import g70NieveFrontLampDebugUrl from '../assets/vehicles/optimized/genesis_g70_nieve-front-lamp-debug-optimized.glb?url';
import genesisCoupeModelUrl from '../assets/vehicles/optimized/genesis_coupe-optimized.glb?url';
import ft86PoseSheetRaw from '../assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.json?raw';
import stingerPoseSheetRaw from '../assets/vehicles/generated/pose-sheets/poc-kia-stinger-scaled-rear.json?raw';
import g70PoseSheetRaw from '../assets/vehicles/generated/pose-sheets/poc-genesis-g70-scaled-final.json?raw';
import ravenCoupeBlackSpriteUrl from '../assets/vehicles/generated/7way-candidates/raven-coupe/processed/black-192/sheet-192.png';
import ravenCoupeBlueSpriteUrl from '../assets/vehicles/generated/7way-candidates/raven-coupe/processed/blue-192/sheet-192.png';
import ravenCoupeRedSpriteUrl from '../assets/vehicles/generated/7way-candidates/raven-coupe/processed/red-192/sheet-192.png';
import ravenCoupeSilverSpriteUrl from '../assets/vehicles/generated/7way-candidates/raven-coupe/processed/silver-192/sheet-192.png';
import ravenCoupeShadowSpriteUrl from '../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-192-blue/shadow-192.png';
import seorinGtBlackSpriteUrl from '../assets/vehicles/generated/7way-candidates/seorin-gt/processed/black-192/sheet-192.png';
import seorinGtBlueSpriteUrl from '../assets/vehicles/generated/7way-candidates/seorin-gt/processed/blue-192/sheet-192.png';
import seorinGtRedSpriteUrl from '../assets/vehicles/generated/7way-candidates/seorin-gt/processed/red-192/sheet-192.png';
import seorinGtSilverSpriteUrl from '../assets/vehicles/generated/7way-candidates/seorin-gt/processed/silver-192/sheet-192.png';
import seorinGtShadowSpriteUrl from '../assets/vehicles/generated/7way-candidates/seorin-gt/runtime-192-blue/shadow-192.png';
import miraeGtBlackSpriteUrl from '../assets/vehicles/generated/7way-candidates/mirae-gt/processed/black-192/sheet-192.png';
import miraeGtBlueSpriteUrl from '../assets/vehicles/generated/7way-candidates/mirae-gt/processed/blue-192/sheet-192.png';
import miraeGtRedSpriteUrl from '../assets/vehicles/generated/7way-candidates/mirae-gt/processed/red-192/sheet-192.png';
import miraeGtSilverSpriteUrl from '../assets/vehicles/generated/7way-candidates/mirae-gt/processed/silver-192/sheet-192.png';
import miraeGtShadowSpriteUrl from '../assets/vehicles/generated/7way-candidates/mirae-gt/runtime-192-blue/shadow-192.png';
import './vehicle-preview.css';

type StoredPose = {
    camera: [number, number, number];
    id: string;
    modelPitchDeg: number;
    modelRollDeg: number;
    modelYawDeg: number;
    rearAngleDeg: number;
};

type StoredPoseSheet = {
    frameSizeUnits: number;
    modelPitchOffsetDeg?: number;
    modelRollOffsetDeg?: number;
    modelScaleX?: number;
    modelScaleY?: number;
    modelScaleZ?: number;
    modelYawOffsetDeg?: number;
    poses: StoredPose[];
};

type VehiclePreview = {
    id: 'ft86' | 'stinger' | 'g70' | 'g70-nieve' | 'genesis-coupe';
    lengthM: number;
    modelUrl: string;
    rotation: [number, number, number];
    scale: [number, number, number];
    spritePoseSheet: StoredPoseSheet;
};

type SpritePoseMode = 'current' | 'planned';
type SpritePoseFacing = 'rear' | 'front';

type SpritePoseFrame = {
    degrees: number;
    id: string;
    isNew?: boolean;
    label: string;
};

type ResolvedSpritePose = StoredPose & {
    flipX: boolean;
};

type SpriteTurntableVehicle = {
    colors: Record<string, string>;
    id: 'raven-coupe' | 'seorin-gt' | 'mirae-gt';
    label: string;
    shadowUrl: string;
};

type SpriteTurntableFrame = {
    column: number;
    flipX: boolean;
    label: string;
    row: number;
};

const ft86PoseSheet = JSON.parse(ft86PoseSheetRaw) as StoredPoseSheet;
const stingerPoseSheet = JSON.parse(stingerPoseSheetRaw) as StoredPoseSheet;
const g70PoseSheet = JSON.parse(g70PoseSheetRaw) as StoredPoseSheet;
const previewQuery = new URLSearchParams(window.location.search);
const useFrontLampDebug = previewQuery.has('front-lamp-debug') || previewQuery.has('front-bumper-debug');
const useStingerBadgeDebug = previewQuery.has('stinger-badge-debug');
const useNeutralLighting = previewQuery.has('neutral-lighting');

const VEHICLES: readonly VehiclePreview[] = [
    { id: 'ft86', lengthM: 4.24, modelUrl: ft86ModelUrl, rotation: [0, Math.PI, 0], scale: [1, 1, 1], spritePoseSheet: ft86PoseSheet },
    { id: 'stinger', lengthM: 4.83, modelUrl: useStingerBadgeDebug ? stingerBadgeDebugModelUrl : stingerSpriteMasterModelUrl, rotation: [0, 0, 0], scale: [1, 1, 1], spritePoseSheet: stingerPoseSheet },
    { id: 'g70', lengthM: 4.69, modelUrl: g70ModelUrl, rotation: [Math.PI / 2, 0, 0], scale: [-1, 1, -1], spritePoseSheet: g70PoseSheet },
    // Nieve has no rendered sheet yet. It intentionally uses the existing rear-pose
    // camera contract while retaining its own neutral model transform.
    { id: 'g70-nieve', lengthM: 4.69, modelUrl: useFrontLampDebug ? g70NieveFrontLampDebugUrl : g70NieveModelUrl, rotation: [0, 0, 0], scale: [1, 1, 1], spritePoseSheet: stingerPoseSheet },
    { id: 'genesis-coupe', lengthM: 4.63, modelUrl: genesisCoupeModelUrl, rotation: [0, 0, 0], scale: [1, 1, 1], spritePoseSheet: stingerPoseSheet },
];

const CURRENT_SPRITE_POSES: readonly SpritePoseFrame[] = [
    { degrees: -44, id: 'left-2', label: 'L2 · 44°' },
    { degrees: -24, id: 'left-1', label: 'L1 · 24°' },
    { degrees: 0, id: 'center', label: 'CENTER' },
    { degrees: 24, id: 'right-1', label: 'R1 · 24°' },
    { degrees: 44, id: 'right-2', label: 'R2 · 44°' },
];

const PLANNED_SPRITE_POSES: readonly SpritePoseFrame[] = [
    { degrees: -44, id: 'left-2', label: 'L2 · 44°' },
    { degrees: -24, id: 'left-1', label: 'L1 · 24°' },
    { degrees: -11, id: 'left-0', isNew: true, label: 'L0 · 11°' },
    { degrees: 0, id: 'center', label: 'CENTER' },
    { degrees: 11, id: 'right-0', isNew: true, label: 'R0 · 11°' },
    { degrees: 24, id: 'right-1', label: 'R1 · 24°' },
    { degrees: 44, id: 'right-2', label: 'R2 · 44°' },
];

const CURRENT_FRONT_SPRITE_POSES: readonly SpritePoseFrame[] = [
    { degrees: -44, id: 'front-left-2', label: 'FL2 · 44°' },
    { degrees: -24, id: 'front-left-1', label: 'FL1 · 24°' },
    { degrees: 0, id: 'front-center', label: 'FRONT' },
    { degrees: 24, id: 'front-right-1', label: 'FR1 · 24°' },
    { degrees: 44, id: 'front-right-2', label: 'FR2 · 44°' },
];

const PLANNED_FRONT_SPRITE_POSES: readonly SpritePoseFrame[] = [
    { degrees: -44, id: 'front-left-2', label: 'FL2 · 44°' },
    { degrees: -24, id: 'front-left-1', label: 'FL1 · 24°' },
    { degrees: -11, id: 'front-left-0', isNew: true, label: 'FL0 · 11°' },
    { degrees: 0, id: 'front-center', label: 'FRONT' },
    { degrees: 11, id: 'front-right-0', isNew: true, label: 'FR0 · 11°' },
    { degrees: 24, id: 'front-right-1', label: 'FR1 · 24°' },
    { degrees: 44, id: 'front-right-2', label: 'FR2 · 44°' },
];

const SPRITE_TURNTABLE_VEHICLES: readonly SpriteTurntableVehicle[] = [
    {
        colors: { black: ravenCoupeBlackSpriteUrl, blue: ravenCoupeBlueSpriteUrl, red: ravenCoupeRedSpriteUrl, silver: ravenCoupeSilverSpriteUrl },
        id: 'raven-coupe', label: 'Raven Coupe', shadowUrl: ravenCoupeShadowSpriteUrl,
    },
    {
        colors: { black: seorinGtBlackSpriteUrl, blue: seorinGtBlueSpriteUrl, red: seorinGtRedSpriteUrl, silver: seorinGtSilverSpriteUrl },
        id: 'seorin-gt', label: 'Seorin GT', shadowUrl: seorinGtShadowSpriteUrl,
    },
    {
        colors: { black: miraeGtBlackSpriteUrl, blue: miraeGtBlueSpriteUrl, red: miraeGtRedSpriteUrl, silver: miraeGtSilverSpriteUrl },
        id: 'mirae-gt', label: 'Mirae GT', shadowUrl: miraeGtShadowSpriteUrl,
    },
];

// The 17-pose gameplay sheet does not contain a dedicated front-centre cell.
// A selector can still show a readable full orbit by joining its normal and
// spin poses, then mirroring the right-source frames for the return journey.
const SPRITE_TURNTABLE_FRAMES: readonly SpriteTurntableFrame[] = [
    { column: 0, flipX: false, label: 'REAR', row: 0 },
    { column: 1, flipX: false, label: '11°', row: 0 },
    { column: 2, flipX: false, label: '24°', row: 0 },
    { column: 0, flipX: false, label: '44°', row: 1 },
    { column: 1, flipX: false, label: '62°', row: 1 },
    { column: 2, flipX: false, label: '78°', row: 1 },
    { column: 0, flipX: false, label: '136°', row: 2 },
    { column: 1, flipX: false, label: 'FRONT', row: 2 },
    { column: 1, flipX: true, label: 'FRONT', row: 2 },
    { column: 0, flipX: true, label: '224°', row: 2 },
    { column: 2, flipX: true, label: '282°', row: 1 },
    { column: 1, flipX: true, label: '298°', row: 1 },
    { column: 0, flipX: true, label: '316°', row: 1 },
    { column: 2, flipX: true, label: '336°', row: 0 },
    { column: 1, flipX: true, label: '349°', row: 0 },
];

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const lightbox = document.querySelector<HTMLDialogElement>('.vehicle-lightbox');
const lightboxCanvas = document.querySelector<HTMLElement>('.vehicle-lightbox__canvas');
const lightboxLabel = document.querySelector<HTMLElement>('.vehicle-lightbox__label');
const lightboxClose = document.querySelector<HTMLButtonElement>('.vehicle-lightbox__close');
let disposeLightboxPreview: (() => void) | null = null;
const posePreviewCanvas = document.querySelector<HTMLElement>('.sprite-pose-preview__canvas');
const posePreviewDescription = document.querySelector<HTMLElement>('.sprite-pose-preview__description');
const posePreviewFrames = document.querySelector<HTMLElement>('.sprite-pose-preview__frames');
const posePreviewVehicle = document.querySelector<HTMLSelectElement>('.sprite-pose-preview__vehicle');
const poseModeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-pose-mode]')];
const poseFacingButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-pose-facing]')];
const spriteTurntableCanvas = document.querySelector<HTMLCanvasElement>('.sprite-turntable__canvas');
const spriteTurntableColorButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-sprite-color]')];
const spriteTurntableFrame = document.querySelector<HTMLElement>('.sprite-turntable__frame');
const spriteTurntableToggle = document.querySelector<HTMLButtonElement>('.sprite-turntable__toggle');
const spriteTurntableVehicle = document.querySelector<HTMLSelectElement>('.sprite-turntable__vehicle');
let poseMode: SpritePoseMode = 'current';
let poseFacing: SpritePoseFacing = 'rear';
let disposePosePreview: (() => void) | null = null;
let posePreviewRequest = 0;
let spriteTurntableColor = 'blue';
let spriteTurntablePaused = false;
let spriteTurntableElapsedMs = 0;
let spriteTurntableLastFrameAt = performance.now();
let spriteTurntableRequest = 0;
let stopSpriteTurntablePreview: (() => void) | null = null;

lightboxClose?.addEventListener('click', () => lightbox?.close());
lightbox?.addEventListener('close', () => {
    disposeLightboxPreview?.();
    disposeLightboxPreview = null;
});
lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
});

for (const vehicle of VEHICLES) {
    const container = document.querySelector<HTMLElement>(`[data-vehicle="${vehicle.id}"]`);
    if (container) void createVehiclePreview(container, vehicle, false);
}

posePreviewVehicle?.addEventListener('change', () => void updatePosePreview());
for (const button of poseModeButtons) {
    button.addEventListener('click', () => {
        poseMode = button.dataset.poseMode === 'planned' ? 'planned' : 'current';
        for (const candidate of poseModeButtons) {
            candidate.classList.toggle('is-active', candidate === button);
        }
        void updatePosePreview();
    });
}
for (const button of poseFacingButtons) {
    button.addEventListener('click', () => {
        poseFacing = button.dataset.poseFacing === 'front' ? 'front' : 'rear';
        for (const candidate of poseFacingButtons) {
            candidate.classList.toggle('is-active', candidate === button);
        }
        void updatePosePreview();
    });
}
void updatePosePreview();
void startSpriteTurntablePreview();

spriteTurntableVehicle?.addEventListener('change', () => void startSpriteTurntablePreview());
for (const button of spriteTurntableColorButtons) {
    button.addEventListener('click', () => {
        spriteTurntableColor = button.dataset.spriteColor ?? 'blue';
        for (const candidate of spriteTurntableColorButtons) {
            candidate.classList.toggle('is-active', candidate === button);
        }
        void startSpriteTurntablePreview();
    });
}
spriteTurntableToggle?.addEventListener('click', () => {
    spriteTurntablePaused = !spriteTurntablePaused;
    spriteTurntableLastFrameAt = performance.now();
    spriteTurntableToggle.textContent = spriteTurntablePaused ? 'Play' : 'Pause';
});

async function startSpriteTurntablePreview() {
    if (!spriteTurntableCanvas || !spriteTurntableVehicle) return;

    const request = ++spriteTurntableRequest;
    stopSpriteTurntablePreview?.();
    spriteTurntableElapsedMs = 0;
    spriteTurntableLastFrameAt = performance.now();
    const vehicle = SPRITE_TURNTABLE_VEHICLES.find(({ id }) => id === spriteTurntableVehicle.value)
        ?? SPRITE_TURNTABLE_VEHICLES[0];
    const [body, shadow] = await Promise.all([
        loadPreviewImage(vehicle.colors[spriteTurntableColor] ?? vehicle.colors.blue),
        loadPreviewImage(vehicle.shadowUrl),
    ]);
    if (request !== spriteTurntableRequest || !spriteTurntableCanvas.isConnected) return;

    const context = spriteTurntableCanvas.getContext('2d');
    if (!context) return;
    let animationFrame = 0;
    const draw = (now: number) => {
        const bounds = spriteTurntableCanvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio, 2);
        const width = Math.max(1, Math.round(bounds.width * ratio));
        const height = Math.max(1, Math.round(bounds.height * ratio));
        if (spriteTurntableCanvas.width !== width || spriteTurntableCanvas.height !== height) {
            spriteTurntableCanvas.width = width;
            spriteTurntableCanvas.height = height;
        }
        if (!spriteTurntablePaused) {
            spriteTurntableElapsedMs += now - spriteTurntableLastFrameAt;
        }
        spriteTurntableLastFrameAt = now;
        const frameIndex = Math.floor(spriteTurntableElapsedMs / 145) % SPRITE_TURNTABLE_FRAMES.length;
        const frame = SPRITE_TURNTABLE_FRAMES[frameIndex];
        drawSpriteTurntableFrame(context, body, shadow, frame, width, height);
        if (spriteTurntableFrame) spriteTurntableFrame.textContent = `${vehicle.label} · ${spriteTurntableColor} · ${frame.label}`;
        animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    stopSpriteTurntablePreview = () => cancelAnimationFrame(animationFrame);
}

function drawSpriteTurntableFrame(
    context: CanvasRenderingContext2D,
    body: HTMLImageElement,
    shadow: HTMLImageElement,
    frame: SpriteTurntableFrame,
    width: number,
    height: number,
) {
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0d2f59');
    gradient.addColorStop(0.55, '#081322');
    gradient.addColorStop(1, '#050812');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(67, 148, 231, .22)';
    context.lineWidth = Math.max(1, width / 700);
    for (let y = height * 0.63; y < height; y += height * 0.14) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    for (let x = -width; x <= width * 2; x += width * 0.2) {
        context.beginPath(); context.moveTo(width / 2, height * 0.63); context.lineTo(x, height); context.stroke();
    }

    const cellSize = 192;
    const drawSize = Math.min(width * 0.9, height * 1.62);
    const baselineY = height * 0.78;
    const drawX = (width - drawSize) / 2;
    const drawY = baselineY - drawSize * (129 / cellSize);
    const sourceX = frame.column * cellSize;
    const sourceY = frame.row * cellSize;
    context.imageSmoothingEnabled = false;
    context.save();
    if (frame.flipX) {
        context.translate(width, 0);
        context.scale(-1, 1);
    }
    const renderedX = frame.flipX ? width - drawX - drawSize : drawX;
    context.globalAlpha = 0.78;
    context.drawImage(shadow, sourceX, sourceY, cellSize, cellSize, renderedX, drawY, drawSize, drawSize);
    context.globalAlpha = 1;
    context.drawImage(body, sourceX, sourceY, cellSize, cellSize, renderedX, drawY, drawSize, drawSize);
    context.restore();
}

function loadPreviewImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load sprite preview image: ${url}`));
        image.src = url;
    });
}

async function createVehiclePreview(
    container: HTMLElement,
    vehicle: VehiclePreview,
    expanded: boolean,
): Promise<() => void> {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080e17');

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(5.2, 3.1, 6.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(
        useNeutralLighting ? '#eef3f8' : '#b7d9ff',
        useNeutralLighting ? '#111722' : '#07101d',
        useNeutralLighting ? 1.7 : 2.2,
    ));
    const keyLight = new THREE.DirectionalLight(useNeutralLighting ? '#ffffff' : '#d9edff', useNeutralLighting ? 3.4 : 4);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(useNeutralLighting ? '#f2f5f8' : '#4c8dff', useNeutralLighting ? 1.1 : 3.4);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: '#081321', metalness: 0.4, roughness: 0.7 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);
    scene.add(new THREE.GridHelper(14, 14, '#1d5ca2', '#112840').translateY(0.001));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.maxDistance = expanded ? 18 : 13;
    controls.minDistance = expanded ? 2.2 : 3;
    controls.target.set(0, 0.8, 0);

    try {
        const gltf = await loader.loadAsync(vehicle.modelUrl);
        const model = gltf.scene;
        model.rotation.set(...vehicle.rotation);
        model.scale.set(...vehicle.scale);
        normalizeModel(model, vehicle.lengthM);
        model.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            node.castShadow = false;
            node.receiveShadow = false;
        });
        scene.add(model);
        if (useStingerBadgeDebug && vehicle.id === 'stinger') {
            // Bounds inspection identifies layer 19 as a thin, rear-centre
            // badge/lettering candidate. A depth-disabled helper is readable
            // even when that source layer sits underneath another surface.
            for (const index of [19]) {
                const candidate = model.getObjectByName(`debug-layer-${index}`);
                if (!candidate) continue;
                const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(candidate), '#ff2d92');
                helper.material.depthTest = false;
                helper.material.depthWrite = false;
                helper.renderOrder = 999;
                scene.add(helper);
            }
        }
    } catch {
        container.dataset.error = 'true';
        container.insertAdjacentText('beforeend', 'Model could not be loaded.');
    }

    const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let animationFrame = 0;
    const render = () => {
        controls.update();
        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(render);
    };
    render();

    if (!expanded) {
        container.addEventListener('click', () => openLightbox(vehicle));
    }

    return () => {
        cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
    };
}



function openLightbox(vehicle: VehiclePreview) {
    if (!lightbox || !lightboxCanvas || !lightboxLabel) return;

    disposeLightboxPreview?.();
    disposeLightboxPreview = null;
    lightboxCanvas.replaceChildren();
    const name = vehicle.id === 'ft86'
        ? 'FT86'
        : vehicle.id === 'stinger'
            ? 'Seorin GT'
            : vehicle.id === 'g70'
                ? 'G70'
                : vehicle.id === 'g70-nieve'
                    ? 'G70 (Nieve)'
                : 'Genesis Coupe';
    lightboxLabel.textContent = `${name} · drag to orbit / scroll to zoom`;
    lightbox.showModal();
    void createVehiclePreview(lightboxCanvas, vehicle, true).then((dispose) => {
        if (lightbox.open) disposeLightboxPreview = dispose;
        else dispose();
    });
}

async function updatePosePreview() {
    if (!posePreviewCanvas || !posePreviewDescription || !posePreviewFrames || !posePreviewVehicle) return;

    const request = ++posePreviewRequest;
    disposePosePreview?.();
    disposePosePreview = null;
    posePreviewCanvas.replaceChildren();

    const vehicle = VEHICLES.find(({ id }) => id === posePreviewVehicle.value) ?? VEHICLES[0];
    const poses = poseFacing === 'front'
        ? poseMode === 'planned' ? PLANNED_FRONT_SPRITE_POSES : CURRENT_FRONT_SPRITE_POSES
        : poseMode === 'planned' ? PLANNED_SPRITE_POSES : CURRENT_SPRITE_POSES;
    posePreviewDescription.textContent = poseFacing === 'front'
        ? poseMode === 'planned'
            ? 'Planned front 7way inspection. Blue labels interpolate between the front centre and saved front-quarter source poses.'
            : 'Front 5way inspection. It mirrors the saved front-quarter source poses around a symmetric front-centre view.'
        : poseMode === 'planned'
            ? 'Planned rear 7way contract. Blue labels are interpolated rear-camera poses between CENTER and R1/L1; validate them before pixel and atlas work.'
            : 'Current rear 5way contract. It reuses the saved rear-camera and model-transform settings from the generated sprite sheet.';
    posePreviewFrames.style.gridTemplateColumns = `repeat(${poses.length}, minmax(0, 1fr))`;
    posePreviewFrames.replaceChildren(...poses.map((pose) => {
        const label = document.createElement('span');
        label.textContent = pose.label;
        if (pose.isNew) label.classList.add('is-new');
        return label;
    }));

    const dispose = await createPoseSheetPreview(posePreviewCanvas, vehicle, poses);
    if (request === posePreviewRequest && posePreviewCanvas.isConnected) disposePosePreview = dispose;
    else dispose();
}

async function createPoseSheetPreview(
    container: HTMLElement,
    vehicle: VehiclePreview,
    poses: readonly SpritePoseFrame[],
): Promise<() => void> {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080e17');
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    // This renderer uses viewport/scissor coordinates for each pose cell, so
    // keep its drawing buffer in CSS pixels rather than scaling those cells.
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(
        useNeutralLighting ? '#eef3f8' : '#b7d9ff',
        useNeutralLighting ? '#111722' : '#07101d',
        useNeutralLighting ? 1.7 : 2.2,
    ));
    const keyLight = new THREE.DirectionalLight(useNeutralLighting ? '#ffffff' : '#d9edff', useNeutralLighting ? 3.4 : 4);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(useNeutralLighting ? '#f2f5f8' : '#4c8dff', useNeutralLighting ? 1.1 : 3.4);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: '#081321', metalness: 0.4, roughness: 0.7 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);

    try {
        const gltf = await loader.loadAsync(vehicle.modelUrl);
        const model = gltf.scene;
        normalizeSpriteModel(model, vehicle.lengthM, vehicle.spritePoseSheet);
        scene.add(model);

        const render = () => {
            const { width, height } = container.getBoundingClientRect();
            if (width < 1 || height < 1) return;
            const frameWidth = width / poses.length;
            renderer.setSize(width, height, false);
            renderer.setScissorTest(true);
            renderer.setClearColor('#080e17', 1);
            renderer.clear();
            for (const [index, pose] of poses.entries()) {
                const renderPose = resolveSpritePose(vehicle.spritePoseSheet, pose);
                const x = Math.floor(index * frameWidth);
                const nextX = Math.ceil((index + 1) * frameWidth);
                const aspect = Math.max(1, nextX - x) / height;
                const maxDimension = vehicle.spritePoseSheet.frameSizeUnits * 1.08;
                const halfHeight = maxDimension / 2;
                const halfWidth = halfHeight * aspect;
                camera.left = -halfWidth;
                camera.right = halfWidth;
                camera.top = halfHeight;
                camera.bottom = -halfHeight;
                camera.position.set(...renderPose.camera);
                if (renderPose.flipX) camera.position.x *= -1;
                model.rotation.set(
                    THREE.MathUtils.degToRad(vehicle.spritePoseSheet.modelPitchOffsetDeg ?? 0),
                    THREE.MathUtils.degToRad(vehicle.spritePoseSheet.modelYawOffsetDeg ?? 0),
                    THREE.MathUtils.degToRad(vehicle.spritePoseSheet.modelRollOffsetDeg ?? 0),
                );
                model.rotation.x += THREE.MathUtils.degToRad(renderPose.modelPitchDeg);
                model.rotation.y += THREE.MathUtils.degToRad(renderPose.modelYawDeg);
                model.rotation.z += THREE.MathUtils.degToRad(renderPose.modelRollDeg);
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                camera.lookAt(center.x, center.y + size.y * 0.18, center.z);
                camera.updateProjectionMatrix();
                renderer.setViewport(x, 0, nextX - x, height);
                renderer.setScissor(x, 0, nextX - x, height);
                renderer.render(scene, camera);
            }
            renderer.setScissorTest(false);
        };
        const resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(container);
        render();

        return () => {
            resizeObserver.disconnect();
            renderer.dispose();
        };
    } catch {
        container.dataset.error = 'true';
        container.textContent = 'Model could not be loaded.';
        return () => renderer.dispose();
    }
}

function resolveSpritePose(poseSheet: StoredPoseSheet, frame: SpritePoseFrame): ResolvedSpritePose {
    const center = getStoredPose(poseSheet, 'center');
    const rightOne = getStoredPose(poseSheet, 'steer-right-1');
    const rightTwo = getStoredPose(poseSheet, 'steer-right-2');
    const isFront = frame.id.startsWith('front-');
    const frontCenter: StoredPose = {
        ...center,
        camera: [0, center.camera[1], -center.camera[2]],
        id: 'front-center',
        rearAngleDeg: 180,
    };
    const frontRightOne = getStoredPose(poseSheet, 'spin-front-right-1');
    const frontRightTwo = getStoredPose(poseSheet, 'spin-front-right-2');
    const interpolate = (factor: number): StoredPose => ({
        ...center,
        camera: center.camera.map((value, index) => THREE.MathUtils.lerp(value, rightOne.camera[index], factor)) as [number, number, number],
        id: frame.id,
        rearAngleDeg: THREE.MathUtils.lerp(center.rearAngleDeg, rightOne.rearAngleDeg, factor),
    });
    const interpolateFront = (factor: number): StoredPose => ({
        ...frontCenter,
        camera: frontCenter.camera.map((value, index) => THREE.MathUtils.lerp(value, frontRightOne.camera[index], factor)) as [number, number, number],
        id: frame.id,
        modelYawDeg: THREE.MathUtils.lerp(frontCenter.modelYawDeg, frontRightOne.modelYawDeg, factor),
        rearAngleDeg: THREE.MathUtils.lerp(frontCenter.rearAngleDeg, frontRightOne.rearAngleDeg, factor),
    });

    if (isFront) {
        if (frame.id === 'front-center') return { ...frontCenter, flipX: false };
        if (frame.id === 'front-right-0') return { ...interpolateFront(11 / 24), flipX: false };
        if (frame.id === 'front-left-0') return { ...interpolateFront(11 / 24), flipX: true };
        if (frame.id === 'front-right-1') return { ...frontRightOne, flipX: false };
        if (frame.id === 'front-left-1') return { ...frontRightOne, flipX: true };
        if (frame.id === 'front-right-2') return { ...frontRightTwo, flipX: false };
        return { ...frontRightTwo, flipX: true };
    }

    if (frame.id === 'center') return { ...center, flipX: false };
    if (frame.id === 'right-0') return { ...interpolate(11 / 24), flipX: false };
    if (frame.id === 'left-0') return { ...interpolate(11 / 24), flipX: true };
    if (frame.id === 'right-1') return { ...rightOne, flipX: false };
    if (frame.id === 'left-1') return { ...rightOne, flipX: true };
    if (frame.id === 'right-2') return { ...rightTwo, flipX: false };
    return { ...rightTwo, flipX: true };
}

function getStoredPose(poseSheet: StoredPoseSheet, id: string): StoredPose {
    const pose = poseSheet.poses.find((candidate) => candidate.id === id);
    if (!pose) throw new Error(`Stored sprite pose is missing: ${id}`);
    return pose;
}

function normalizeSpriteModel(model: THREE.Object3D, lengthM: number, poseSheet: StoredPoseSheet) {
    model.rotation.set(
        THREE.MathUtils.degToRad(poseSheet.modelPitchOffsetDeg ?? 0),
        THREE.MathUtils.degToRad(poseSheet.modelYawOffsetDeg ?? 0),
        THREE.MathUtils.degToRad(poseSheet.modelRollOffsetDeg ?? 0),
    );
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetLength = 2.2 * (lengthM / 4.24);
    const scale = targetLength / Math.max(0.001, size.x, size.z);
    const scaleX = scale * (poseSheet.modelScaleX ?? 1);
    const scaleY = scale * (poseSheet.modelScaleY ?? 1);
    const scaleZ = scale * (poseSheet.modelScaleZ ?? 1);
    model.scale.set(scaleX, scaleY, scaleZ);
    model.position.set(-center.x * scaleX, -center.y * scaleY, -center.z * scaleZ);
    model.updateMatrixWorld(true);
    model.position.y -= new THREE.Box3().setFromObject(model).min.y;
}

function normalizeModel(model: THREE.Object3D, targetLength: number) {
    model.updateMatrixWorld(true);
    const initialBox = new THREE.Box3().setFromObject(model);
    const size = initialBox.getSize(new THREE.Vector3());
    const longestHorizontalAxis = Math.max(size.x, size.z);
    const scale = targetLength / Math.max(0.001, longestHorizontalAxis);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    // Centre only across the studio floor. Moving by center.y first and then
    // applying the pre-move floor value made models with different source
    // origins appear at different heights.
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
}

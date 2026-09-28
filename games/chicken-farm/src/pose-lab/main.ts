import * as THREE from 'three';

import { type Action, type Character, createStickRig } from './rig';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing pose lab element: ${id}`);
    return node as T;
}

function start() {
    const character = element<HTMLSelectElement>('character');
    const action = element<HTMLSelectElement>('action');
    const direction = element<HTMLSelectElement>('direction');
    const phaseInput = element<HTMLInputElement>('phase');
    const angle = element<HTMLInputElement>('angle');
    const speed = element<HTMLSelectElement>('speed');
    const guides = element<HTMLInputElement>('guides');
    const play = element<HTMLButtonElement>('play');
    const viewport = element<HTMLDivElement>('viewport');
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const names: Record<Character, string> = {
        chicken: '닭',
        farmer: '농부',
        dog: '개',
        wolf: '늑대',
    };
    const query = new URLSearchParams(location.search);
    for (const [key, select] of [
        ['character', character],
        ['action', action],
    ] as const) {
        const value = query.get(key);
        if (
            value &&
            Array.from(select.options).some((option) => option.value === value)
        )
            select.value = value;
    }
    directions.forEach((value) => direction.add(new Option(value, value)));
    direction.value = directions.includes(query.get('direction') ?? '')
        ? query.get('direction')!
        : 'SE';
    const numberParam = (key: string, fallback: number, min: number, max: number) => {
        const value = query.get(key);
        return value !== null && Number.isFinite(Number(value))
            ? THREE.MathUtils.clamp(Number(value), min, max)
            : fallback;
    };
    let phase = numberParam('phase', 0, 0, 1);
    angle.value = String(numberParam('angle', 45, 20, 75));
    let playing = false;
    let dirty = true;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(640, 640);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x172522);
    renderer.domElement.setAttribute(
        'aria-label',
        '고정 직교 카메라로 본 stick 캐릭터',
    );
    viewport.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 30);
    const target = new THREE.Vector3(0, 0.8, 0);
    scene.add(new THREE.HemisphereLight(0xfff3dc, 0x415d59, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-3, 6, 4);
    scene.add(light);
    const guideGroup = new THREE.Group();
    const grid = new THREE.GridHelper(4, 16, 0x678879, 0x314d43);
    guideGroup.add(grid);
    const pivot = new THREE.Mesh(
        new THREE.RingGeometry(0.075, 0.09, 24),
        new THREE.MeshBasicMaterial({ color: 0xf2bb65, side: THREE.DoubleSide }),
    );
    pivot.rotation.x = -Math.PI / 2;
    pivot.position.y = 0.008;
    guideGroup.add(pivot);
    const heading = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0.015, 0),
        1.4,
        0xf2bb65,
        0.18,
        0.1,
    );
    guideGroup.add(heading);
    scene.add(guideGroup);
    let rig = createStickRig(character.value as Character);
    scene.add(rig.root);
    const cleanups: Array<() => void> = [];
    function listen(node: HTMLElement | Document, event: string, fn: () => void) {
        node.addEventListener(event, fn);
        cleanups.push(() => node.removeEventListener(event, fn));
    }
    const tiles = directions.map((name, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `${name} 방향 선택`);
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const label = document.createElement('span');
        label.textContent = name;
        button.append(canvas, label);
        element('directions').append(button);
        listen(button, 'click', () => {
            direction.value = name;
            changed();
        });
        return { button, canvas, index, context: canvas.getContext('2d')! };
    });
    function saveContext() {
        const params = new URLSearchParams({
            character: character.value,
            action: action.value,
            direction: direction.value,
            phase: phase.toFixed(3),
            angle: angle.value,
        });
        history.replaceState(null, '', `${location.pathname}?${params}`);
    }
    function labels() {
        phaseInput.value = String(Math.round(phase * 1000));
        element('phase-label').textContent = `${Math.round(phase * 100)}%`;
        element('angle-label').textContent = `${angle.value}°`;
        element('stage-title').textContent =
            `${names[character.value as Character]} / ${action.selectedOptions[0].text} / ${direction.value}`;
        element('pose-note').textContent =
            action.value === 'work'
                ? character.value === 'chicken'
                    ? '작업: 머리를 숙여 모이를 쪼는 포즈'
                    : character.value === 'farmer'
                      ? '작업: 양팔을 앞으로 내미는 포즈'
                      : '탐색: 머리를 낮추고 냄새를 맡는 포즈'
                : action.value === 'death'
                  ? '쓰러짐은 끝에서 멈춥니다. 처음부터 보려면 재생을 누르세요.'
                  : '제자리 동작으로 관절과 방향을 비교합니다.';
        play.textContent = playing ? '일시정지' : '재생';
        play.setAttribute('aria-pressed', String(playing));
        tiles.forEach((tile) =>
            tile.button.setAttribute(
                'aria-pressed',
                String(directions[tile.index] === direction.value),
            ),
        );
    }
    function changed() {
        dirty = true;
        labels();
        saveContext();
    }
    listen(character, 'change', () => {
        scene.remove(rig.root);
        rig.dispose();
        rig = createStickRig(character.value as Character);
        scene.add(rig.root);
        phase = 0;
        changed();
    });
    listen(action, 'change', () => {
        phase = 0;
        changed();
    });
    listen(direction, 'change', changed);
    listen(angle, 'input', changed);
    listen(guides, 'change', changed);
    listen(speed, 'change', changed);
    listen(phaseInput, 'input', () => {
        playing = false;
        phase = Number(phaseInput.value) / 1000;
        changed();
    });
    listen(play, 'click', () => {
        if (action.value === 'death' && phase >= 1) phase = 0;
        playing = !playing;
        changed();
    });
    listen(element('step'), 'click', () => {
        playing = false;
        phase =
            action.value === 'death' ? Math.min(1, phase + 1 / 8) : (phase + 1 / 8) % 1;
        changed();
    });
    listen(element('reset'), 'click', () => {
        playing = false;
        phase = 0;
        action.value = 'idle';
        direction.value = 'SE';
        angle.value = '45';
        speed.value = '1';
        guides.checked = true;
        changed();
    });
    listen(document, 'visibilitychange', () => {
        if (document.hidden) {
            playing = false;
            changed();
        }
    });
    function setFacing(index: number) {
        const yaw = Math.PI - (index * Math.PI) / 4;
        rig.root.rotation.y = yaw;
        heading.setDirection(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)));
    }
    function render() {
        const elevation = THREE.MathUtils.degToRad(Number(angle.value));
        camera.position.set(
            0,
            target.y + Math.sin(elevation) * 7,
            Math.cos(elevation) * 7,
        );
        camera.lookAt(target);
        guideGroup.visible = guides.checked;
        rig.pose(action.value as Action, phase);
        for (const tile of tiles) {
            setFacing(tile.index);
            renderer.render(scene, camera);
            tile.context.drawImage(renderer.domElement, 0, 0, 160, 160);
        }
        setFacing(directions.indexOf(direction.value));
        renderer.render(scene, camera);
        renderer.domElement.dataset.phase = phase.toFixed(3);
        renderer.domElement.dataset.character = character.value;
    }
    let last = performance.now();
    let lastRender = 0;
    renderer.setAnimationLoop((now) => {
        const delta = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (document.hidden) return;
        if (playing) {
            phase += (delta * Number(speed.value)) / 1.2;
            if (action.value === 'death' && phase >= 1) {
                phase = 1;
                playing = false;
                saveContext();
            } else if (phase >= 1) phase %= 1;
            dirty = true;
        }
        if (dirty && now - lastRender > 1000 / 30) {
            labels();
            render();
            dirty = false;
            lastRender = now;
        }
    });
    changed();
    const dispose = () => {
        renderer.setAnimationLoop(null);
        cleanups.forEach((fn) => fn());
        rig.dispose();
        guideGroup.traverse((object) => {
            const drawable = object as THREE.Mesh;
            drawable.geometry?.dispose();
            const materials = drawable.material;
            if (Array.isArray(materials))
                materials.forEach((material) => material.dispose());
            else materials?.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
        tiles.forEach((tile) => tile.button.remove());
    };
    if (import.meta.hot) import.meta.hot.dispose(dispose);
}

try {
    start();
} catch (error) {
    const output = element('error');
    output.hidden = false;
    output.textContent = `미리보기를 시작하지 못했습니다. WebGL 지원과 하드웨어 가속을 확인해주세요. ${error instanceof Error ? error.message : String(error)}`;
}

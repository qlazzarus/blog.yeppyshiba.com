import * as THREE from 'three';

export type Character = 'chicken' | 'farmer' | 'dog' | 'wolf';
export type Action = 'idle' | 'walk' | 'attack' | 'work' | 'death';
type Point = [number, number, number];

// All rigs face +Z. Dimensions and floor origin stay constant across poses.
export function createStickRig(character: Character) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const boneGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0xe0d8ba,
        roughness: 0.85,
    });
    const accent = new THREE.MeshStandardMaterial({
        color:
            character === 'wolf' ? 0x8faab7 : character === 'dog' ? 0xc69a6b : 0xf0bb60,
    });
    const joints: THREE.Mesh[] = [];
    const bones: THREE.Mesh[] = [];
    const head = new THREE.Mesh(geometry, accent);
    body.add(head);
    const point = new THREE.Vector3();
    const end = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let jointIndex = 0;
    let boneIndex = 0;
    function joint(p: Point, radius = 0.065) {
        let mesh = joints[jointIndex++];
        if (!mesh) {
            mesh = new THREE.Mesh(geometry, material);
            joints.push(mesh);
            body.add(mesh);
        }
        mesh.position.set(...p);
        mesh.scale.setScalar(radius);
    }
    function bone(a: Point, b: Point, radius = 0.038) {
        let mesh = bones[boneIndex++];
        if (!mesh) {
            mesh = new THREE.Mesh(boneGeometry, material);
            bones.push(mesh);
            body.add(mesh);
        }
        point.set(...a);
        end.set(...b);
        mesh.position.copy(point).add(end).multiplyScalar(0.5);
        mesh.scale.set(radius, point.distanceTo(end), radius);
        mesh.quaternion.setFromUnitVectors(up, end.sub(point).normalize());
    }
    function chain(points: Point[]) {
        points.forEach((p) => joint(p));
        for (let i = 1; i < points.length; i++) bone(points[i - 1], points[i]);
    }
    function pose(action: Action, phase: number) {
        jointIndex = 0;
        boneIndex = 0;
        const cycle = phase * Math.PI * 2;
        const stride = action === 'walk' ? Math.sin(cycle) : 0;
        const reach =
            action === 'attack' || action === 'work' ? (1 - Math.cos(cycle)) / 2 : 0;
        const bob = action === 'idle' ? Math.sin(cycle) * 0.025 : 0;
        body.rotation.set(0, 0, action === 'death' ? (-Math.PI / 2) * phase : 0);
        body.position.set(0, action === 'death' ? 0.15 * phase : 0, 0);
        if (character === 'farmer') {
            const hips: Point = [0, 0.9 + bob, 0];
            const chest: Point = [0, 1.48 + bob, reach * 0.13];
            chain([hips, chest, [0, 1.68 + bob, reach * 0.15]]);
            head.position.set(0, 1.85 + bob, reach * 0.15);
            head.scale.set(0.19, 0.23, 0.19);
            bone(
                [0, 1.84 + bob, 0.15 + reach * 0.15],
                [0, 1.84 + bob, 0.29 + reach * 0.15],
            );
            for (const side of [-1, 1]) {
                const swing = stride * side;
                chain([
                    [side * 0.16, hips[1], 0],
                    [side * 0.18, 0.48, swing * 0.2],
                    [side * 0.18, 0.08 + Math.max(0, swing) * 0.16, swing * 0.34],
                ]);
                bone(
                    [side * 0.18, 0.08 + Math.max(0, swing) * 0.16, swing * 0.34],
                    [
                        side * 0.18,
                        0.08 + Math.max(0, swing) * 0.16,
                        swing * 0.34 + 0.15,
                    ],
                );
                chain([
                    [side * 0.3, chest[1], chest[2]],
                    [side * 0.4, 1.15 + reach * 0.22, -swing * 0.2 + reach * 0.25],
                    [side * 0.3, 0.96 + reach * 0.4, -swing * 0.35 + reach * 0.65],
                ]);
            }
        } else if (character === 'chicken') {
            const headY = 1.3 + bob - reach * 0.78;
            const headZ = 0.35 + reach * 0.38;
            chain([
                [0, 0.65 + bob, -0.28],
                [0, 0.82 + bob, 0.12],
                [0, headY, headZ],
            ]);
            head.position.set(0, headY, headZ);
            head.scale.set(0.15, 0.17, 0.16);
            bone([0, headY, headZ + 0.1], [0, headY - 0.025, headZ + 0.36], 0.055);
            chain([
                [0, 0.7 + bob, -0.28],
                [0, 0.96 + bob, -0.62],
            ]);
            for (const side of [-1, 1]) {
                const swing = stride * side;
                chain([
                    [side * 0.15, 0.65 + bob, 0],
                    [side * 0.18, 0.36, -0.1 + swing * 0.13],
                    [side * 0.18, 0.055 + Math.max(0, swing) * 0.14, swing * 0.26],
                ]);
                bone(
                    [side * 0.18, 0.055 + Math.max(0, swing) * 0.14, swing * 0.26],
                    [
                        side * 0.18,
                        0.055 + Math.max(0, swing) * 0.14,
                        swing * 0.26 + 0.19,
                    ],
                );
                chain([
                    [side * 0.18, 0.87 + bob, 0.13],
                    [side * (0.4 + reach * 0.18), 0.67 + bob, -0.14],
                    [side * 0.25, 0.63 + bob, -0.36],
                ]);
            }
        } else {
            const wolf = character === 'wolf';
            const height = wolf ? 0.87 : 0.72;
            const length = wolf ? 0.58 : 0.44;
            const headY = height + 0.28 + bob - reach * 0.3;
            chain([
                [0, height + bob, -length],
                [0, height + bob, length],
                [0, headY, length + 0.2 + reach * 0.18],
            ]);
            head.position.set(0, headY, length + 0.26 + reach * 0.18);
            head.scale.set(0.18, 0.19, wolf ? 0.29 : 0.22);
            bone(
                [0, headY, head.position.z],
                [0, headY - 0.05, head.position.z + 0.35],
                0.06,
            );
            for (const side of [-1, 1]) {
                bone(
                    [side * 0.12, headY + 0.09, head.position.z],
                    [side * 0.15, headY + (wolf ? 0.36 : 0.24), head.position.z - 0.05],
                    0.04,
                );
                for (const front of [-1, 1]) {
                    const swing = stride * side * front;
                    chain([
                        [side * 0.2, height + bob, front * length],
                        [side * 0.23, height * 0.52, front * length + swing * 0.12],
                        [
                            side * 0.23,
                            0.065 + Math.max(0, swing) * 0.16,
                            front * length + swing * 0.28,
                        ],
                    ]);
                }
            }
            chain([
                [0, height + bob, -length],
                [
                    Math.sin(cycle) * 0.12,
                    height + (wolf ? -0.12 : 0.32),
                    -length - 0.38,
                ],
                [Math.sin(cycle) * 0.2, height + (wolf ? -0.35 : 0.48), -length - 0.62],
            ]);
        }
    }
    pose('idle', 0);
    return {
        root,
        pose,
        dispose() {
            geometry.dispose();
            boneGeometry.dispose();
            material.dispose();
            accent.dispose();
        },
    };
}

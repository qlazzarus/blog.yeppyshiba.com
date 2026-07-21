import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    composeVehicleHeadlightAim,
    getVehicleHeadlightScreenPose,
} from '../src/game/vehicleHeadlight';
import type { VehicleAtlas } from '../src/game/vehicle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const atlasPaths = [
    'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json',
    'assets/vehicles/approved/atlases/genesis-g70-poc-128.json',
];
const transform = {
    displaySize: 320,
    rotationRadians: 0,
    x: 600,
    y: 620,
};
let checkedProfiles = 0;

for (const atlasPath of atlasPaths) {
    const atlas = JSON.parse(
        await readFile(path.join(projectDirectory, atlasPath), 'utf8'),
    ) as VehicleAtlas;

    for (const frameId of Object.keys(atlas.apex.headlightProfiles)) {
        if (!frameId.includes('right-')) continue;

        const rightPose = getVehicleHeadlightScreenPose(atlas, frameId, {
            ...transform,
            flipX: false,
        });
        const leftPose = getVehicleHeadlightScreenPose(atlas, frameId, {
            ...transform,
            flipX: true,
        });

        assert(rightPose.poseAimX > 0, `${atlasPath}:${frameId} right aim must be positive`);
        assert(leftPose.poseAimX < 0, `${atlasPath}:${frameId} left aim must be negative`);
        assert(rightPose.lampLeft.x < rightPose.lampRight.x,
            `${atlasPath}:${frameId} right lamps must remain screen ordered`);
        assert(leftPose.lampLeft.x < leftPose.lampRight.x,
            `${atlasPath}:${frameId} mirrored lamps must remain screen ordered`);
        assert(rightPose.lampLeft.x > transform.x,
            `${atlasPath}:${frameId} right emitters must attach to the right front third`);
        assert(leftPose.lampRight.x < transform.x,
            `${atlasPath}:${frameId} left emitters must attach to the left front third`);
        assertNear(
            leftPose.lampLeft.x,
            transform.x * 2 - rightPose.lampRight.x,
            `${atlasPath}:${frameId} left lamp mirror`,
        );
        assertNear(
            leftPose.lampRight.x,
            transform.x * 2 - rightPose.lampLeft.x,
            `${atlasPath}:${frameId} right lamp mirror`,
        );
        checkedProfiles += 1;
    }
}

assert(composeVehicleHeadlightAim(42, 4, -80, 72) >= 0,
    'right pose must not be reversed by road assist');
assert(composeVehicleHeadlightAim(-42, -4, 80, 72) <= 0,
    'left pose must not be reversed by road assist');
assert(composeVehicleHeadlightAim(0, 0, -18, 72) === -18,
    'center pose must remain free to follow the road tangent');

process.stdout.write(
    `Headlight profile QA passed: ${checkedProfiles} directional profiles across ${atlasPaths.length} atlases.\n`,
);

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function assertNear(actual: number, expected: number, label: string) {
    if (Math.abs(actual - expected) > 0.001) {
        throw new Error(`${label}: expected ${expected}, received ${actual}`);
    }
}

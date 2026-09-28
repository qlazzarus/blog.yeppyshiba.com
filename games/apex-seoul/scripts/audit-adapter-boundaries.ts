import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mergeDriveCommands } from '../src/game/core/driveCommand';

const gameRoot = 'src/game';
const coreFiles = files(join(gameRoot, 'core'));
const platformFiles = files(join(gameRoot, 'platform'));
const phaserFiles = files(join(gameRoot, 'phaser'));
const coreViolations = coreFiles.filter((file) => {
    const source = stripComments(readFileSync(file, 'utf8'));

    return source.includes("from 'phaser'") || source.includes('from "phaser"') ||
        source.includes('/platform/') || source.includes('/phaser/') ||
        ['window', 'document', 'localStorage', 'navigator'].some((name) => source.includes(name));
});
const platformViolations = platformFiles.filter((file) => /from ['"]phaser['"]|import Phaser/.test(readFileSync(file, 'utf8')));
const command = mergeDriveCommands([
    { accelPressed: true, brakePressed: false, steerAxis: 0.8 },
    { accelPressed: false, brakePressed: true, steerAxis: 0.6 },
]);
const checks = [
    check('core-has-no-browser-or-phaser-dependencies', coreViolations.length === 0),
    check('platform-has-no-phaser-dependencies', platformViolations.length === 0),
    check('phaser-adapters-exist', ['sceneInput.ts', 'roadRenderer.ts', 'hud.ts', 'gameplayHud.ts', 'headlightShader.ts', 'speedEffectShader.ts', 'virtualDriveControls.ts'].every((file) => phaserFiles.some((path) => path.endsWith(file)))),
    check('drive-command-is-platform-neutral', command.accelPressed && command.brakePressed && command.steerAxis === 1),
];
const failures = checks.filter((check) => !check.pass);

console.log(JSON.stringify({ checks, coreViolations, pass: failures.length === 0, platformViolations }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? files(path) : entry.name.endsWith('.ts') ? [path] : [];
    });
}

function stripComments(source: string) {
    return source.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
}

function check(id: string, pass: boolean) {
    return { id, pass };
}

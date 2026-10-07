import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profiles = ['normal_p3', 'easy_p4', 'debug_p3'] as const;

async function main() {
    for (const profile of profiles) {
        await runSmokeProfile(profile);
    }
    console.log(JSON.stringify({ pass: true, profiles }));
}

function runSmokeProfile(profile: (typeof profiles)[number]) {
    return new Promise<void>((resolve, reject) => {
        const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const child = spawn(
            command,
            ['run', 'chicken:smoke', '--workspace', '@games/chicken-farm'],
            {
                cwd: rootDir,
                env: { ...process.env, CHICKEN_FARM_SMOKE_PROFILE: profile },
                stdio: 'inherit',
            },
        );
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(
                new Error(
                    `Smoke profile ${profile} failed with ${signal ?? `exit code ${String(code)}`}`,
                ),
            );
        });
    });
}

await main();

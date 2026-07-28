import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const baseUrl = process.env.APEX_SEOUL_QA_BASE_URL ?? 'http://localhost:5173/game-assets/apex-seoul/';
const browserPath = process.env.APEX_SEOUL_QA_BROWSER ?? '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

if (process.platform !== 'win32' && browserPath.startsWith('/mnt/')) {
    const windowsNodePath = '/mnt/c/Program Files/nodejs/node.exe';
    const windowsScriptPath = fileURLToPath(import.meta.url).replace(/^\/mnt\/([a-z])\//i, '$1:/').replaceAll('/', '\\');
    const windowsBrowserPath = browserPath.replace(/^\/mnt\/([a-z])\//i, '$1:/').replaceAll('/', '\\');

    await new Promise((resolve, reject) => {
        const child = spawn(windowsNodePath, [windowsScriptPath, '--browser', windowsBrowserPath], {
            stdio: 'inherit',
        });
        child.on('error', reject);
        child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Windows browser fixture exited with ${code}`)));
    });
    process.exit(0);
}

const suppliedBrowser = process.argv.indexOf('--browser');
const executablePath = suppliedBrowser >= 0 ? process.argv[suppliedBrowser + 1] : undefined;
const url = new URL(baseUrl);
url.searchParams.set('qaFreeze', '1');
url.searchParams.set('qaStartSpeed', '180');
url.searchParams.set('vehicle', 'ft86-retro');

const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });

try {
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__apexSeoulQaReady), null, { timeout: 10000 });
    const state = await page.evaluate(() => window.__apexSeoulQaState);
    const results = [
        check('qa-url-enables-runtime-mode', state?.qa?.enabled === true),
        check('qa-url-skips-countdown', state?.run?.started === true && state?.run?.countdownRemainingSec === 0),
        check('qa-url-does-not-start-launch-control', state?.launch?.phase === 'idle'),
        check('qa-start-speed-is-visible-in-runtime-state', state?.player?.speed === 180),
    ];
    const failures = results.filter((result) => !result.pass);

    console.log(JSON.stringify({ pass: failures.length === 0, results, url: url.toString() }, null, 2));
    if (failures.length > 0) process.exitCode = 1;
} finally {
    await browser.close();
}

function check(id, pass) {
    return { id, pass };
}

import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

const rootDir = path.resolve(import.meta.dirname, '..');
const outputPath = path.resolve(
    rootDir,
    process.argv.at(-1)?.endsWith('.gif')
        ? process.argv.at(-1)
        : '../../public/images/posts/202609/apex-seoul-loading-scenes/vehicle-selection-prototype.gif',
);
const frameSize = 192;
const canvas = { width: 1200, height: 675 };
const fps = 12;
const phaseFrames = 18;
const turntable = [
    [0, 0, false], [1, 0, false], [2, 0, false], [0, 1, false], [1, 1, false],
    [2, 1, false], [0, 2, false], [1, 2, false], [1, 2, true], [0, 2, true],
    [2, 1, true], [1, 1, true], [0, 1, true], [2, 0, true], [1, 0, true],
];
const phases = [
    ['raven-coupe', 'blue', 'Raven Coupe', 'BLUE'],
    ['raven-coupe', 'red', 'Raven Coupe', 'RED'],
    ['seorin-gt', 'silver', 'Seorin GT', 'SILVER'],
    ['seorin-gt', 'black', 'Seorin GT', 'BLACK'],
    ['mirae-gt', 'blue', 'Mirae GT', 'BLUE'],
    ['mirae-gt', 'red', 'Mirae GT', 'RED'],
    ['mirae-gt', 'black', 'Mirae GT', 'BLACK'],
    ['raven-coupe', 'silver', 'Raven Coupe', 'SILVER'],
];
const colors = {
    black: '#262a34', blue: '#2e74c9', red: '#d55061', silver: '#c9d2de',
};

function svgOverlay(vehicle, color, frameIndex) {
    const chips = Object.entries(colors).map(([id, hex], index) => {
        const active = id === color;
        const x = 822 + index * 80;
        return `<g><rect x="${x}" y="504" width="62" height="34" rx="8" fill="${hex}" stroke="${active ? '#ffffff' : '#3e506b'}" stroke-width="${active ? 3 : 1}"/><text x="${x + 31}" y="562" text-anchor="middle" class="tiny">${id.toUpperCase()}</text></g>`;
    }).join('');
    const cards = ['Raven Coupe', 'Seorin GT', 'Mirae GT'].map((name, index) => {
        const active = name === vehicle;
        const x = 766 + index * 130;
        return `<g><rect x="${x}" y="120" width="116" height="48" rx="10" fill="${active ? '#183855' : '#0d1828'}" stroke="${active ? '#69caff' : '#263d58'}"/><text x="${x + 58}" y="150" text-anchor="middle" class="card">${name.replace(' ', '\n')}</text></g>`;
    }).join('');
    const progress = ((frameIndex % phaseFrames) + 1) / phaseFrames;
    return Buffer.from(`<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
      <style>.kicker{font:600 16px sans-serif;letter-spacing:3px;fill:#71c8ff}.title{font:700 44px sans-serif;fill:#edf5ff}.body{font:400 18px sans-serif;fill:#9fb6cc}.label{font:700 28px sans-serif;fill:#fff}.card{font:600 12px sans-serif;fill:#d5e8fb}.tiny{font:600 10px sans-serif;letter-spacing:1px;fill:#86a2ba}</style>
      <rect width="1200" height="675" fill="#07111e"/>
      <path d="M0 520H1200M0 575H1200M0 630H1200M115 0V675M230 0V675M345 0V675M460 0V675M575 0V675M690 0V675" stroke="#102743" stroke-width="1" opacity=".75"/>
      <ellipse cx="442" cy="489" rx="292" ry="47" fill="#0d2740" opacity=".45"/>
      <text x="70" y="96" class="kicker">APEX SEOUL · GARAGE PROTOTYPE</text>
      <text x="70" y="151" class="title">CHOOSE YOUR LINE</text>
      <text x="70" y="186" class="body">17-pose 7way sprite · external contact shadow · palette variants</text>
      <rect x="734" y="76" width="410" height="512" rx="20" fill="#0a1727" stroke="#234564" stroke-width="2"/>
      <text x="766" y="108" class="kicker">VEHICLE</text>${cards}
      <text x="766" y="224" class="kicker">SELECTED</text><text x="766" y="264" class="label">${vehicle}</text>
      <text x="766" y="306" class="kicker">PALETTE</text><text x="766" y="347" class="label">${color.toUpperCase()}</text>
      <text x="822" y="476" class="kicker">BODY COLOR</text>${chips}
      <rect x="766" y="602" width="344" height="6" rx="3" fill="#193149"/><rect x="766" y="602" width="${344 * progress}" height="6" rx="3" fill="#65c8ff"/>
      <text x="766" y="641" class="body">asset-only selection study · not yet in game</text>
      <text x="70" y="620" class="body">sprite turntable / ${String(frameIndex % turntable.length).padStart(2, '0')} · 15</text>
    </svg>`);
}

async function cell(source, column, row, flipX, opacity = 1) {
    let image = sharp(source).extract({ left: column * frameSize, top: row * frameSize, width: frameSize, height: frameSize });
    if (flipX) image = image.flop();
    return image.resize({ width: 650, height: 650, kernel: 'nearest' }).png().toBuffer().then((data) => ({ input: data, left: 116, top: 20, opacity }));
}

const frameDirectory = await mkdtemp(path.join(tmpdir(), 'apex-seoul-garage-gif-'));
try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    for (let index = 0; index < phases.length * phaseFrames; index += 1) {
        const [vehicleId, color, vehicle] = phases[Math.floor(index / phaseFrames)];
        const [column, row, flipX] = turntable[index % turntable.length];
        const base = path.join(rootDir, 'assets/vehicles/generated/7way-candidates', vehicleId);
        const body = path.join(base, `processed/${color}-192/sheet-192.png`);
        const shadow = path.join(base, 'runtime-192-blue/shadow-192.png');
        const output = path.join(frameDirectory, `frame-${String(index).padStart(3, '0')}.png`);
        await sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: '#07111e' } })
            .composite([
                { input: svgOverlay(vehicle, color, index), left: 0, top: 0 },
                await cell(shadow, column, row, flipX, 0.84),
                await cell(body, column, row, flipX),
            ])
            .png()
            .toFile(output);
    }
    execFileSync('ffmpeg', [
        '-y', '-framerate', String(fps), '-i', path.join(frameDirectory, 'frame-%03d.png'),
        '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
        '-loop', '0', outputPath,
    ], { stdio: 'inherit' });
    console.log(`Wrote ${outputPath}`);
} finally {
    await rm(frameDirectory, { recursive: true, force: true });
}

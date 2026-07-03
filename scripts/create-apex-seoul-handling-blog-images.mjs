import { copyFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const outDir = 'public/images/posts/202607';
await mkdir(outDir, { recursive: true });

await copyFile(
    '/tmp/apex-seoul-handling-speed-cue.png',
    `${outDir}/apex-seoul-handling-speed-cue.png`,
);

const previousGripAngle = await sharp('/tmp/apex-seoul-grip-angle-previous.png')
    .resize(560, 355)
    .png()
    .toBuffer();
const currentGripAngle = await sharp('/tmp/apex-seoul-grip-angle-current.png')
    .resize(560, 355)
    .png()
    .toBuffer();

const compareSvg = `<svg width="1200" height="520" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="520" fill="#10161a"/>
<text x="40" y="46" fill="#e9f3f6" font-family="Arial, sans-serif" font-size="26" font-weight="700">Apex Seoul high-speed grip angle comparison</text>
<text x="40" y="78" fill="#9fb5bc" font-family="Arial, sans-serif" font-size="16">same speed 700u, same steering input, visual yaw damped only</text>
<rect x="40" y="108" width="560" height="355" fill="#1b252a"/>
<rect x="600" y="108" width="560" height="355" fill="#1b252a"/>
<rect x="40" y="108" width="560" height="36" fill="rgba(0,0,0,0.55)"/>
<rect x="600" y="108" width="560" height="36" fill="rgba(0,0,0,0.55)"/>
<text x="60" y="132" fill="#fff7d6" font-family="Arial, sans-serif" font-size="18" font-weight="700">Before: previous grip angle</text>
<text x="620" y="132" fill="#d8f8ff" font-family="Arial, sans-serif" font-size="18" font-weight="700">After: high-speed grip yaw damped</text>
<text x="60" y="488" fill="#ffdf7d" font-family="Arial, sans-serif" font-size="18">highSpeedSteeringMaxAbs 0.790</text>
<text x="620" y="488" fill="#8fe7ff" font-family="Arial, sans-serif" font-size="18">highSpeedSteeringMaxAbs 0.674</text>
</svg>`;

await sharp(Buffer.from(compareSvg))
    .composite([
        { input: previousGripAngle, left: 40, top: 108 },
        { input: currentGripAngle, left: 600, top: 108 },
    ])
    .png()
    .toFile(`${outDir}/apex-seoul-high-speed-grip-angle-before-after.png`);

const logSvg = `<svg width="1200" height="760" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="760" fill="#11181d"/>
<text x="64" y="74" fill="#edf8fb" font-family="Arial, sans-serif" font-size="34" font-weight="700">Handling simulation log</text>
<text x="64" y="110" fill="#9eb4bb" font-family="Arial, sans-serif" font-size="18">The goal is not to prove fun automatically, but to reject suspicious tuning candidates quickly.</text>
<g font-family="Arial, sans-serif">
<text x="90" y="176" fill="#e6f1f4" font-size="22" font-weight="700">Candidate score</text>
<text x="90" y="224" fill="#fff7d6" font-size="20">previous-grip-angle</text><rect x="330" y="204" width="679" height="28" fill="#ffcf5a"/><text x="1025" y="226" fill="#fff" font-size="20">97.0</text>
<text x="90" y="274" fill="#d8f8ff" font-size="20">baseline</text><rect x="330" y="254" width="678" height="28" fill="#5fd6ff"/><text x="1025" y="276" fill="#fff" font-size="20">96.9</text>
<text x="90" y="324" fill="#c7d0d4" font-size="20">extra-grip-angle-damping</text><rect x="330" y="304" width="675" height="28" fill="#65737b"/><text x="1025" y="326" fill="#fff" font-size="20">96.5</text>
<text x="90" y="398" fill="#e6f1f4" font-size="22" font-weight="700">High-speed visual steering</text>
<text x="90" y="444" fill="#fff7d6" font-size="20">previous left-hold-3s</text><rect x="390" y="424" width="474" height="28" fill="#ffcf5a"/><text x="885" y="446" fill="#fff" font-size="20">0.790</text>
<text x="90" y="494" fill="#d8f8ff" font-size="20">current left-hold-3s</text><rect x="390" y="474" width="404" height="28" fill="#5fd6ff"/><text x="815" y="496" fill="#fff" font-size="20">0.674</text>
<text x="90" y="568" fill="#e6f1f4" font-size="22" font-weight="700">Curve no-input visual cue</text>
<text x="90" y="614" fill="#fff7d6" font-size="20">previous curve cue</text><rect x="390" y="594" width="280" height="28" fill="#ffcf5a"/><text x="690" y="616" fill="#fff" font-size="20">0.035</text>
<text x="90" y="664" fill="#d8f8ff" font-size="20">current curve cue</text><rect x="390" y="644" width="176" height="28" fill="#5fd6ff"/><text x="586" y="666" fill="#fff" font-size="20">0.022</text>
<text x="64" y="724" fill="#8da2a9" font-size="16">qa:handling-sim, 2026-07-03. Lateral physics was kept stable while visible high-speed yaw was reduced.</text>
</g>
</svg>`;

await sharp(Buffer.from(logSvg))
    .png()
    .toFile(`${outDir}/apex-seoul-handling-sim-log.png`);

const roleSvg = `<svg width="1200" height="640" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="640" fill="#0f171b"/>
<text x="64" y="72" fill="#edf8fb" font-family="Arial, sans-serif" font-size="34" font-weight="700">Grip yaw and drift yaw should not say the same thing</text>
<text x="64" y="108" fill="#aabdc4" font-family="Arial, sans-serif" font-size="18">OutRun-style pseudo 3D keeps the player car readable at the bottom of the screen.</text>
<g transform="translate(70 160)">
<rect width="500" height="390" rx="8" fill="#162228"/>
<text x="34" y="52" fill="#d8f8ff" font-family="Arial, sans-serif" font-size="24" font-weight="700">High-speed grip</text>
<polygon points="250,92 420,330 80,330" fill="#30383c"/><line x1="250" y1="92" x2="250" y2="330" stroke="#f2d76a" stroke-width="8" stroke-dasharray="26 22"/>
<g transform="translate(250 275) rotate(7)"><rect x="-58" y="-30" width="116" height="60" rx="10" fill="#b9cfd7" stroke="#25333a" stroke-width="8"/><rect x="-48" y="22" width="28" height="18" fill="#1b252a"/><rect x="20" y="22" width="28" height="18" fill="#1b252a"/></g>
<path d="M175 360 C220 330 285 330 330 360" fill="none" stroke="#8fe7ff" stroke-width="5"/>
<text x="34" y="365" fill="#a8bec5" font-family="Arial, sans-serif" font-size="18">small yaw, road flow carries the curve</text>
</g>
<g transform="translate(630 160)">
<rect width="500" height="390" rx="8" fill="#211b1b"/>
<text x="34" y="52" fill="#ffd98a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Future drift / slip</text>
<polygon points="250,92 420,330 80,330" fill="#30383c"/><line x1="250" y1="92" x2="250" y2="330" stroke="#f2d76a" stroke-width="8" stroke-dasharray="26 22"/>
<g transform="translate(250 275) rotate(25)"><rect x="-58" y="-30" width="116" height="60" rx="10" fill="#b9cfd7" stroke="#25333a" stroke-width="8"/><rect x="-48" y="22" width="28" height="18" fill="#1b252a"/><rect x="20" y="22" width="28" height="18" fill="#1b252a"/></g>
<path d="M155 360 C220 300 320 305 370 350" fill="none" stroke="#ffcf5a" stroke-width="5" stroke-dasharray="12 10"/>
<text x="34" y="365" fill="#c9b5a2" font-family="Arial, sans-serif" font-size="18">large yaw is saved for a state change</text>
</g>
</svg>`;

await sharp(Buffer.from(roleSvg))
    .png()
    .toFile(`${outDir}/apex-seoul-grip-drift-role.png`);

console.log('wrote Apex Seoul handling blog images');

export function generatePlaceholder(seedText = 'Post') {
    // Use non-seeded randomness so each call produces a different image
    const rnd = Math.random;
    const w = 1200;
    const h = 630;

    // pick base hue from seed
    const baseHue = Math.floor(rnd() * 360);

    // generate layered circles/ovals
    const shapes = [];
    const count = 6 + Math.floor(rnd() * 6);
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(rnd() * (w + 200)) - 100;
        const cy = Math.floor(rnd() * (h + 200)) - 100;
        const rx = Math.floor(rnd() * (w / 2)) + 80;
        const ry = Math.floor(rnd() * (h / 2)) + 60;
        const hue = (baseHue + Math.floor((rnd() - 0.5) * 90)) % 360;
        const sat = 50 + Math.floor(rnd() * 30);
        const light = 40 + Math.floor(rnd() * 30);
        const opacity = 0.35 + rnd() * 0.4;
        shapes.push({
            cx,
            cy,
            rx,
            ry,
            color: `hsl(${hue} ${sat}% ${light}%)`,
            opacity: opacity.toFixed(2),
        });
    }

    const bgHue = (baseHue + 180) % 360;
    const bg = `hsl(${bgHue} 20% 10%)`;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>\n`;
    svg += `<rect width='100%' height='100%' fill='${bg}'/>\n`;

    // shapes
    for (const s of shapes) {
        svg += `<ellipse cx='${s.cx}' cy='${s.cy}' rx='${s.rx}' ry='${s.ry}' fill='${s.color}' fill-opacity='${s.opacity}' />\n`;
    }

    // subtle noise overlay using SVG filter (simple grain via fractal-like circles)
    svg += `<g fill='rgba(255,255,255,0.02)'>\n`;
    for (let i = 0; i < 80; i++) {
        const x = Math.floor(rnd() * w);
        const y = Math.floor(rnd() * h);
        const r = Math.floor(rnd() * 3) + 1;
        svg += `<circle cx='${x}' cy='${y}' r='${r}' />\n`;
    }
    svg += `</g>\n`;

    svg += `</svg>`;

    const b64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}

export default generatePlaceholder;

// --- Deterministic/seeded generator helpers ---
function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(a) {
    return function () {
        var t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Return raw SVG string deterministically seeded by `seedText`.
export function generateSeededSvg(seedText = 'Post') {
    const seedFn = xmur3(String(seedText || ''));
    const rnd = mulberry32(seedFn());

    const w = 1200;
    const h = 630;

    const baseHue = Math.floor(rnd() * 360);

    const shapes = [];
    const count = 6 + Math.floor(rnd() * 6);
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(rnd() * (w + 200)) - 100;
        const cy = Math.floor(rnd() * (h + 200)) - 100;
        const rx = Math.floor(rnd() * (w / 2)) + 80;
        const ry = Math.floor(rnd() * (h / 2)) + 60;
        const hue = (baseHue + Math.floor((rnd() - 0.5) * 90)) % 360;
        const sat = 50 + Math.floor(rnd() * 30);
        const light = 40 + Math.floor(rnd() * 30);
        const opacity = 0.35 + rnd() * 0.4;
        shapes.push({
            cx,
            cy,
            rx,
            ry,
            color: `hsl(${hue} ${sat}% ${light}%)`,
            opacity: opacity.toFixed(2),
        });
    }

    const bgHue = (baseHue + 180) % 360;
    const bg = `hsl(${bgHue} 20% 10%)`;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>\n`;
    svg += `<rect width='100%' height='100%' fill='${bg}'/>\n`;

    for (const s of shapes) {
        svg += `<ellipse cx='${s.cx}' cy='${s.cy}' rx='${s.rx}' ry='${s.ry}' fill='${s.color}' fill-opacity='${s.opacity}' />\n`;
    }

    svg += `<g fill='rgba(255,255,255,0.02)'>\n`;
    for (let i = 0; i < 80; i++) {
        const x = Math.floor(rnd() * w);
        const y = Math.floor(rnd() * h);
        const r = Math.floor(rnd() * 3) + 1;
        svg += `<circle cx='${x}' cy='${y}' r='${r}' />\n`;
    }
    svg += `</g>\n`;

    svg += `</svg>`;
    return svg;
}

// Deterministic data URI for seeded SVG
export function generateSeededDataUri(seedText = 'Post') {
    const svg = generateSeededSvg(seedText);
    const b64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}

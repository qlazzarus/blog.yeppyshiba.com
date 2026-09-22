import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(projectRoot, 'public/icons/apex-seoul.svg');
const output = resolve(projectRoot, 'public/icons');

await mkdir(output, { recursive: true });
for (const size of [192, 512]) {
    await sharp(source).resize(size, size).png().toFile(resolve(output, `apex-seoul-${size}.png`));
}

console.log('Generated 192px and 512px Apex Seoul PWA icons.');

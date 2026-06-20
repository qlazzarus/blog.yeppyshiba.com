import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wpm_cells.tsv',
);
const outputDir = path.join(rootDir, 'games/chicken-farm/assets/data');
const outputPath = path.join(outputDir, 'wpm_pathing_grid.json');

const ORIGIN_OFFSET = { x: -3072, y: -7680 };
const TRIM_OFFSET = { x: -3008, y: -7456 };
const CELL_SIZE = 32;

function parseBoolean(value) {
    return value.trim().toLowerCase() === 'true';
}

async function main() {
    const raw = await readFile(sourcePath, 'utf8');
    const lines = raw.trim().split('\n');
    const rows = lines.slice(1).map((line) => line.split('\t'));

    let maxRow = 0;
    let maxCol = 0;
    for (const columns of rows) {
        maxRow = Math.max(maxRow, Number(columns[0] ?? 0));
        maxCol = Math.max(maxCol, Number(columns[1] ?? 0));
    }

    const width = maxCol + 1;
    const height = maxRow + 1;
    const cellCount = width * height;
    const groundBlocked = new Array(cellCount).fill(false);
    const buildBlocked = new Array(cellCount).fill(false);

    for (const columns of rows) {
        const row = Number(columns[0] ?? 0);
        const col = Number(columns[1] ?? 0);
        const index = row * width + col;
        groundBlocked[index] = parseBoolean(columns[6] ?? 'false');
        buildBlocked[index] = parseBoolean(columns[7] ?? 'false');
    }

    const payload = {
        version: 1,
        originOffset: ORIGIN_OFFSET,
        trimOffset: TRIM_OFFSET,
        width,
        height,
        cellSize: CELL_SIZE,
        groundBlocked,
        buildBlocked,
        metadata: {
            extractedDate: '2026-06-20',
            sourceFile: 'docs/chicken_farm/chicken_farm_w3x_artifacts/wpm_cells.tsv',
            validationNotes:
                'Derived from wpm_cells.tsv and aligned to the trimmed Phaser tilemap origin.',
        },
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Wrote ${outputPath}`);
}

await main();

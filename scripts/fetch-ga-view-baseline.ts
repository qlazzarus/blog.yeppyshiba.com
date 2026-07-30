import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getViewCount } from '../src/utils/getViewCount';

function optionValue(name: string) {
    const optionIndex = process.argv.indexOf(name);
    const value = optionIndex === -1 ? undefined : process.argv[optionIndex + 1];
    if (optionIndex !== -1 && (!value || value.startsWith('--'))) {
        throw new Error(`${name} requires a value.`);
    }
    return value;
}

async function main() {
    const endDate = optionValue('--end-date');
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        throw new Error('Use --end-date YYYY-MM-DD to define the inclusive pre-cutover GA4 date.');
    }

    const output = path.resolve(
        optionValue('--out') ?? `src/data/ga-views-baseline-through-${endDate}.json`,
    );
    const results = await getViewCount('/article', undefined, endDate);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Wrote ${results.length} GA4 baseline rows through ${endDate} to ${output}`);
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

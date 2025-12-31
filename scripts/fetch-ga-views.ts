import fs from 'fs';
import path from 'path';

import { getViewCount } from '../src/utils/getViewCount';

async function main() {
    const prefix = '/article'; // 필요에 맞게
    const results = await getViewCount(prefix);
    const out = path.resolve('./src/data/ga-views.json');
    await fs.promises.mkdir(path.dirname(out), { recursive: true });
    await fs.promises.writeFile(out, JSON.stringify(results, null, 2), 'utf8');
    console.log('Wrote', out);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

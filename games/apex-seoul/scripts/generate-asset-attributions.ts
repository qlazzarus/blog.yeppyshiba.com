import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ASSET_ATTRIBUTIONS, RUNTIME_ASSET_PROVENANCE, type AssetAttribution } from '../src/game/assetAttributions';

export const outputPath = fileURLToPath(new URL('../public/ATTRIBUTIONS.md', import.meta.url));

export function renderAttributions(
    credits: readonly AssetAttribution[] = ASSET_ATTRIBUTIONS,
    provenance: readonly AssetAttribution[] = RUNTIME_ASSET_PROVENANCE,
): string {
    const lines = [
        '# Apex Seoul asset attributions', '',
        'The game Credits list is generated from the same attribution records as this section.', '',
        '## Game Credits', '',
    ];
    for (const item of credits) {
        lines.push(
            `### ${item.name}`, '',
            `- Attribution ID: ${item.id}`,
            `- Author: ${item.author ?? 'Unknown author'}`,
            `- License: ${item.license ?? 'License unresolved'}`,
            `- License URL: ${item.licenseUrl ?? 'Unresolved'}`,
            `- Source: ${item.sourceUrl ?? 'Source unresolved'}`,
            `- Modifications: ${item.modification}`,
            '',
        );
    }
    const other = provenance.filter(item => item.origin === 'external' && !item.surfaces.includes('game'));
    lines.push('## Vehicle preview attributions', '');
    for (const item of other) {
        lines.push(
            `### ${item.name}`, '',
            `- Attribution ID: ${item.id}`,
            `- Author: ${item.author ?? 'Unknown author'}`,
            `- License: ${item.license ?? 'License unresolved'}`,
            `- License URL: ${item.licenseUrl ?? 'Unresolved'}`,
            `- Source: ${item.sourceUrl ?? 'Source unresolved'}`,
            `- Modifications: ${item.modification}`,
            '',
        );
    }
    const unresolved = provenance.filter(item => item.unresolved.length > 0);
    lines.push('## Unresolved provenance', '', unresolved.length > 0
        ? 'These entries require review before release.'
        : 'No unresolved provenance entries in the current runtime inventory.', '');
    for (const item of unresolved) {
        lines.push(`- ${item.id} (${item.name}): ${item.unresolved.join(' ')}`);
    }
    const phaserLicense = readFileSync(new URL('../../../node_modules/phaser/LICENSE.md', import.meta.url), 'utf8').trim();
    const threeLicense = readFileSync(new URL('../node_modules/three/LICENSE', import.meta.url), 'utf8').trim();
    const decoderHeader = readFileSync(new URL('../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js', import.meta.url), 'utf8')
        .split('\n').slice(0, 2).map(line => line.replace(/^\/\/ ?/, '')).join('\n');
    const mitPermission = threeLicense.slice(threeLicense.indexOf('Permission is hereby granted'));
    lines.push('', '## Bundled software license texts', '', '### Phaser', '', phaserLicense, '',
        '### Three.js', '', threeLicense, '', '### meshoptimizer decoder', '', decoderHeader, '', mitPermission, '');
    return `${lines.join('\n')}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    writeFileSync(outputPath, renderAttributions(), 'utf8');
    console.log(`Generated ${outputPath}`);
}

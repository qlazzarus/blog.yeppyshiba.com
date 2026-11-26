import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import {
    ADDITIONAL_RUNTIME_PROVENANCE,
    ASSET_ATTRIBUTIONS,
    RUNTIME_ASSET_PROVENANCE,
    type AssetAttribution,
} from '../src/game/assetAttributions';
import { outputPath, renderAttributions } from './generate-asset-attributions';

const gameRoot = fileURLToPath(new URL('..', import.meta.url));
type RuntimeEntry = { label: string; attributionIds: readonly string[]; surface: 'game' | 'vehicle-preview' };

// A license needs an identified version and its canonical URL before release.
const permittedLicenses: Readonly<Record<string, string>> = {
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC0 1.0 / Public Domain': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
    MIT: 'MIT',
};
const mitLicenseUrls = new Set([
    'https://github.com/phaserjs/phaser/blob/master/LICENSE.md',
    'https://github.com/mrdoob/three.js/blob/dev/LICENSE',
    'https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md',
]);

function audit(records: readonly AssetAttribution[], entries: readonly RuntimeEntry[], credits: readonly AssetAttribution[]): string[] {
    const errors: string[] = [];
    const byId = new Map<string, AssetAttribution>();
    for (const record of records) {
        if (byId.has(record.id)) errors.push(`duplicate attribution ID: ${record.id}`);
        byId.set(record.id, record);
    }
    const used = new Set<string>();
    for (const entry of entries) {
        if (entry.attributionIds.length === 0) errors.push(`${entry.label}: missing attribution`);
        for (const id of entry.attributionIds) {
            const record = byId.get(id);
            if (!record) {
                errors.push(`${entry.label}: unknown attribution ID ${id}`);
                continue;
            }
            used.add(id);
            if (!record.surfaces.includes(entry.surface)) errors.push(`${entry.label}: ${id} missing ${entry.surface} surface`);
        }
    }
    for (const record of records) {
        if (!used.has(record.id)) errors.push(`${record.id}: no runtime asset references this attribution`);
        if (!record.metadataReferences.length) errors.push(`${record.id}: missing metadata references`);
        for (const path of record.metadataReferences) {
            if (!existsSync(resolve(gameRoot, path))) errors.push(`${record.id}: missing metadata ${path}`);
        }
        if (record.origin === 'unknown') errors.push(`${record.id}: origin unresolved`);
        if (record.origin === 'external') {
            if (!record.author || !record.sourceUrl) errors.push(`${record.id}: author or source unresolved`);
            const expected = record.license && permittedLicenses[record.license];
            if (!expected) errors.push(`${record.id}: forbidden or unknown license ${record.license ?? '(missing)'}`);
            else if (!record.licenseUrl || (record.license !== 'MIT' && record.licenseUrl !== expected)) {
                errors.push(`${record.id}: missing or unexpected license URL`);
            } else if (record.license === 'MIT' && !mitLicenseUrls.has(record.licenseUrl)) {
                errors.push(`${record.id}: missing or unexpected license URL`);
            }
        }
        for (const issue of record.unresolved) errors.push(`${record.id}: unresolved: ${issue}`);
    }
    const expectedCredits = records.filter(item => item.origin === 'external' && item.surfaces.includes('game'));
    if (JSON.stringify(credits) !== JSON.stringify(expectedCredits)) errors.push('game Credits differ from runtime attribution records');
    return errors;
}

// Exercise failures independently of the current unresolved production inventory.
const fixture: AssetAttribution = {
    id: 'fixture', origin: 'external', surfaces: ['game'], name: 'Fixture', author: 'Author',
    license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://example.com/source', acquiredAt: null, modification: 'None',
    metadataReferences: ['package.json'], unresolved: [],
};
const fixtureEntry: RuntimeEntry = { label: 'fixture', attributionIds: ['fixture'], surface: 'game' };
assert.deepEqual(audit([fixture], [fixtureEntry], [fixture]), []);
assert(audit([fixture], [{ ...fixtureEntry, attributionIds: [] }], [fixture]).some(error => error.includes('missing attribution')));
assert(audit([fixture], [{ ...fixtureEntry, attributionIds: ['absent'] }], [fixture]).some(error => error.includes('unknown attribution ID')));
for (const license of [null, 'unknown', 'CC BY-NC 4.0']) {
    const changed = { ...fixture, license };
    assert(audit([changed], [fixtureEntry], [changed]).some(error => error.includes('forbidden or unknown license')));
}
assert(audit([fixture], [fixtureEntry], []).some(error => error.includes('Credits differ')));
assert(audit([{ ...fixture, unresolved: ['unresolved provenance'] }], [fixtureEntry], [fixture]).some(error => error.includes('unresolved:')));
assert(audit([fixture], [{ ...fixtureEntry, surface: 'vehicle-preview' }], [fixture]).some(error => error.includes('missing vehicle-preview surface')));
assert(audit([{ ...fixture, licenseUrl: null }], [fixtureEntry], [fixture]).some(error => error.includes('license URL')));
console.log('Attribution audit regression fixtures passed.');

const server = await createServer({
    root: gameRoot,
    configFile: false,
    // This audit loads the manifest through SSR and needs no client dependency scan.
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    appType: 'custom',
});
let startupAssets: { key: string; attributionIds: readonly string[] }[];
try {
    ({ startupAssets } = await server.ssrLoadModule('/src/game/startupAssetManifest.ts'));
} finally {
    await server.close();
}
const entries: RuntimeEntry[] = [
    ...startupAssets.map(asset => ({ label: `startup ${asset.key}`, attributionIds: asset.attributionIds, surface: 'game' as const })),
    ...ADDITIONAL_RUNTIME_PROVENANCE.map(asset => ({ label: asset.path, attributionIds: asset.attributionIds, surface: asset.entry })),
];
const errors = audit(RUNTIME_ASSET_PROVENANCE, entries, ASSET_ATTRIBUTIONS);
const mappedPaths = new Set(ADDITIONAL_RUNTIME_PROVENANCE.map(asset => `${asset.entry}:${asset.path}`));
const manifest = JSON.parse(readFileSync(resolve(gameRoot, 'public/manifest.webmanifest'), 'utf8')) as { icons: { src: string }[] };
for (const icon of manifest.icons) {
    const prefix = '/game-assets/apex-seoul/';
    if (!icon.src.startsWith(prefix) || !mappedPaths.has(`game:public/${icon.src.slice(prefix.length)}`)) {
        errors.push(`PWA icon missing provenance mapping: ${icon.src}`);
    }
}
const previewSource = readFileSync(resolve(gameRoot, 'src/vehicle-preview.ts'), 'utf8');
for (const match of previewSource.matchAll(/from\s+['"]\.\.\/(assets\/[^'"]+\.glb)(?:\?[^'"]*)?['"]/g)) {
    if (!mappedPaths.has(`vehicle-preview:${match[1]}`)) errors.push(`preview model missing provenance mapping: ${match[1]}`);
}
for (const asset of ADDITIONAL_RUNTIME_PROVENANCE) {
    if (!existsSync(resolve(gameRoot, asset.path))) errors.push(`missing runtime path: ${asset.path}`);
}
if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== renderAttributions()) {
    errors.push('public/ATTRIBUTIONS.md is missing or stale; run generate:asset-attributions');
}
console.log(`Audited ${startupAssets.length} startup entries and ${ADDITIONAL_RUNTIME_PROVENANCE.length} additional runtime paths.`);
if (errors.length) {
    console.error(`RELEASE BLOCKED: ${errors.length} attribution issue(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
} else {
    console.log('Attribution audit passed.');
}

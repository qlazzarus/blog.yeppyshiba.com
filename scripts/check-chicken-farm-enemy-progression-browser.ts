import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 6400 + (process.pid % 300);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const progressionCase = process.env.CHICKEN_FARM_ENEMY_CASE ?? 'baseline';

if (progressionCase !== 'baseline' && progressionCase !== 'fixture') {
    throw new Error(`Unsupported CHICKEN_FARM_ENEMY_CASE: ${progressionCase}`);
}

const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    'enemy_check_snapshot.json',
);

type EnemySnapshot = ReturnType<NonNullable<Window['__chickenFarmDebug']>['getEnemyProgressionSnapshot']>;

async function main() {
    const server = startDevServer(progressionCase === 'fixture');
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = progressionCase === 'baseline'
            ? await runBaseline()
            : await runFixture();
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(JSON.stringify({ ...report, outputPath }, null, 2));
    } finally {
        await stopServer(server);
    }
}

function startDevServer(debugFixtures: boolean) {
    const viteBin = path.join(rootDir, 'node_modules/.bin/vite');
    const server = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
        cwd: path.join(rootDir, 'games/chicken-farm'),
        env: {
            ...process.env,
            VITE_CHICKEN_FARM_COMBAT_POC: 'false',
            VITE_CHICKEN_FARM_COMBAT_SMOKE: 'false',
            VITE_CHICKEN_FARM_DEBUG_ECONOMY: 'false',
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: debugFixtures ? 'true' : 'false',
            VITE_CHICKEN_FARM_START_ID: '3',
            VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG: 'false',
        },
    });
    server.stderr.on('data', (data) => process.stderr.write(String(data)));
    return server;
}

async function runBaseline() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const snapshots = await page.evaluate(() => [
            window.__chickenFarmDebug!.getEnemyProgressionSnapshot(),
            window.__chickenFarmDebug!.getEnemyProgressionSnapshot(),
        ]);
        assertBaseline(snapshots[0]!);
        assert.deepEqual(
            snapshots[1]!.canonicalEnemies,
            snapshots[0]!.canonicalEnemies,
            'read-only snapshot cannot mutate canonical definitions',
        );
        assertNoErrors(errors);
        return {
            case: 'baseline',
            checks: {
                canonicalEnemyCount25: true,
                fixtureDisabled: true,
                pass: true,
                runtimeEnemyCountZero: true,
                sp10LedgersExplicitlyNotStarted: true,
            },
            errors,
            executionProfile: { debugFixtures: false, startId: 3 },
            snapshot: snapshots[0],
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runFixture() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const before = await page.evaluate(() => window.__chickenFarmDebug!.getEnemyProgressionSnapshot());
        const created = await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('sp10-snapshot-boss', 'blood_wolf', 3600, 8700, 10),
        );
        const ordinaryCreated = await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('sp10-ordinary-ability', 'fel_ravager', 3700, 8700, 10),
        );
        const casterCreated = await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('sp10-a02u-caster', 'satyr_soulstealer', 3650, 8700, 10),
        );
        const criticalCreated = await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('sp10-acct-w1', 'dire_frost_wolf', 3750, 8700, 10),
        );
        assert.equal(created, true, 'fixture profile must create the explicit runtime enemy');
        assert.equal(ordinaryCreated, true, 'fixture profile must create the ordinary ability coverage enemy');
        assert.equal(casterCreated, true, 'fixture profile must create the A02U caster');
        assert.equal(criticalCreated, true, 'fixture profile must create the ACct W1 enemy');
        const linkedId = await page.evaluate(() =>
            window.__chickenFarmDebug!.spawnLinkedSummonForTest('sp10-snapshot-boss', 'timber_wolf', 10),
        );
        assert.ok(linkedId, 'linked summon must use a valid spawn candidate');
        const after = await page.evaluate(() => window.__chickenFarmDebug!.getEnemyProgressionSnapshot());
        const enemy = after.runtimeEnemies.find((candidate) => candidate.id === 'sp10-snapshot-boss');
        assert.ok(enemy, 'snapshot must expose the runtime enemy');
        assert.equal(enemy.enemyId, 'blood_wolf');
        assert.equal(enemy.origin, 'runtime_fixture_or_other');
        assert.equal(enemy.parentEnemyId, null, 'parent registry is explicitly absent before SP-10-08');
        assert.equal(enemy.abilities.length, 2, 'canonical ability evidence is attached');
        assert.ok(enemy.abilities.every((ability) => ability.runtimeState === 'unsupported'));
        const ordinary = after.runtimeEnemies.find((candidate) => candidate.id === 'sp10-ordinary-ability');
        assert.equal(ordinary?.ordinaryAbilityPolicy?.execution, 'blocked_source_data');
        assert.deepEqual(ordinary?.ordinaryAbilityPolicy?.attachedAbilityIds, ['A02I']);
        const critical = after.runtimeEnemies.find((candidate) => candidate.id === 'sp10-acct-w1');
        assert.equal(critical?.ordinaryAbilityPolicy?.execution, 'implemented_web_policy');
        assert.deepEqual(critical?.ordinaryAbilityPolicy?.attachedAbilityIds, ['ACct']);
        assert.equal(
            critical?.abilities.find((ability) => ability.id === 'ACct')?.runtimeState,
            'implemented_web_policy',
        );
        assert.equal(after.linkedSummons.active.length, 1);
        assert.equal(after.linkedSummons.active[0]?.parentEnemyId, 'sp10-snapshot-boss');
        const linkedEnemy = after.runtimeEnemies.find((candidate) => candidate.id === linkedId);
        assert.equal(linkedEnemy?.origin, 'linked_summon');
        assert.equal(linkedEnemy?.parentEnemyId, 'sp10-snapshot-boss');
        const ordinaryKilled = await page.evaluate(() =>
            window.__chickenFarmDebug!.damageWaveEnemyForTest('sp10-ordinary-ability', 99_999),
        );
        assert.equal(ordinaryKilled, true, 'fixture damage must kill the ordinary runtime enemy');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEnemyProgressionSnapshot().corpses.entries.length === 1,
            null,
            { timeout: 5_000 },
        );
        const afterDeath = await page.evaluate(() => window.__chickenFarmDebug!.getEnemyProgressionSnapshot());
        assert.equal(afterDeath.corpses.entries[0]?.deadEntityId, 'sp10-ordinary-ability');
        assert.equal(afterDeath.corpses.entries[0]?.ownerPlayerId, 10);
        assert.ok(
            afterDeath.corpses.entries[0]?.status === 'eligible' || afterDeath.corpses.entries[0]?.status === 'consumed',
            'A02U may reserve and consume the eligible corpse on the same simulation tick',
        );
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEnemyProgressionSnapshot().ordinarySummons.active.length === 1,
            null,
            { timeout: 5_000 },
        );
        const afterSummon = await page.evaluate(() => window.__chickenFarmDebug!.getEnemyProgressionSnapshot());
        const skeletonId = afterSummon.ordinarySummons.active[0]?.id;
        assert.ok(skeletonId, 'A02U AI must create the reserved skeleton');
        const skeleton = afterSummon.runtimeEnemies.find((enemy) => enemy.id === skeletonId);
        assert.equal(skeleton?.enemyId, 'skeleton_warrior');
        assert.equal(skeleton?.origin, 'ordinary_summon');
        assert.equal(skeleton?.parentEnemyId, 'sp10-a02u-caster');
        assert.equal(skeleton?.rewardEligible, false);
        assert.equal(afterSummon.ordinarySummons.active.length, 1);
        assert.equal(afterSummon.corpses.entries[0]?.status, 'consumed');
        const duplicate = await page.evaluate(() =>
            window.__chickenFarmDebug!.raiseSkeletonForTest('sp10-a02u-caster', 'sp10-a02u-request-1'),
        );
        assert.equal(duplicate, null, 'consumed corpse/request cannot duplicate the skeleton');
        const removedParent = await page.evaluate(() =>
            window.__chickenFarmDebug!.removeCombatEnemyFixture('sp10-snapshot-boss'),
        );
        assert.equal(removedParent, true);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEnemyProgressionSnapshot().linkedSummons.active.length === 0,
            null,
            { timeout: 5_000 },
        );
        const afterParentRemoval = await page.evaluate(() => window.__chickenFarmDebug!.getEnemyProgressionSnapshot());
        assert.equal(afterParentRemoval.linkedSummons.ended[0]?.reason, 'parent_removed');
        assert.equal(after.rewardLedger.entries.length, 0, 'snapshot cannot create rewards');
        assert.equal(after.fieldDrops.entries.length, 0, 'snapshot cannot create drops');
        assert.equal(after.farmerProgression.owners.length, 0, 'snapshot cannot create XP');
        assert.equal(before.runtimeEnemies.length, 0, 'fixture appears only after explicit creation');
        assertNoErrors(errors);
        return {
            case: 'fixture',
            checks: {
                canonicalAbilityEvidenceExposed: true,
                fixtureOriginExposed: true,
                noRewardOrXpMutation: true,
                ordinaryAbilityPolicyExposed: true,
                acctW1ImplementedPolicyExposed: true,
                ordinaryDeathCreatesCorpse: true,
                ordinarySummonConsumesReservedCorpse: true,
                parentRemovalDespawnedLinkedSummon: true,
                pass: true,
                parentExplicitlyNullBeforeSummonRegistry: true,
            },
            errors,
            executionProfile: { debugFixtures: true, startId: 3 },
            snapshots: { after, afterDeath, afterParentRemoval, afterSummon, before },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function assertBaseline(snapshot: EnemySnapshot) {
    assert.equal(snapshot.fixturesEnabled, false, 'normal profile keeps fixtures disabled');
    assert.equal(snapshot.canonicalEnemies.length, 25, 'all canonical EnemyIds are visible');
    const skeleton = snapshot.canonicalEnemies.find((enemy) => enemy.enemyId === 'skeleton_warrior');
    assert.equal(skeleton?.rawcode, 'n016');
    assert.equal(skeleton?.role, 'summon');
    assert.equal(skeleton?.reward.score.effectiveScore, null);
    assert.equal(skeleton?.reward.score.source, 'web_policy_no_reward');
    assert.deepEqual(skeleton?.abilities, []);
    assert.equal(snapshot.runtimeEnemies.length, 0, 'normal boot has no injected enemy');
    assert.equal(snapshot.abilityClock.state, 'ready_no_supported_abilities');
    assert.equal(snapshot.abilityClock.activeCasts.length, 0);
    assert.equal(snapshot.abilityClock.cooldownCount, 0);
    assert.equal(snapshot.bossMilestones.length, 5, 'five boss milestones are visible');
    assert.ok(snapshot.bossMilestones.every((milestone) => milestone.state === 'pending'));
    assert.equal(snapshot.rewardLedger.state, 'not_started');
    assert.equal(snapshot.farmerProgression.state, 'not_started');
    assert.equal(snapshot.fieldDrops.state, 'not_started');
    assert.equal(snapshot.finalTracking.state, 'not_started');
    assert.equal(snapshot.corpses.state, 'active');
    assert.equal(snapshot.corpses.entries.length, 0);
}

function createErrorCollector(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => {
        if (message.type() === 'error') errors.console.push(message.text());
    });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) =>
        errors.request.push(`${failed.method()} ${failed.url()} ${failed.failure()?.errorText}`),
    );
    page.on('response', (response) => {
        if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`);
    });
    return errors;
}

function assertNoErrors(errors: { readonly console: readonly string[]; readonly page: readonly string[]; readonly request: readonly string[]; readonly response: readonly string[] }) {
    if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
        throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
    }
}

function waitForHttp(url: string, timeoutMs: number) {
    const startedAt = Date.now();
    return new Promise<void>((resolve, reject) => {
        const poll = () => {
            const req = request(url, (response) => {
                response.resume();
                if (response.statusCode && response.statusCode < 500) return resolve();
                retry();
            });
            req.on('error', retry);
            req.end();
        };
        const retry = () => {
            if (Date.now() - startedAt >= timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
            setTimeout(poll, 250);
        };
        poll();
    });
}

async function stopServer(server: ChildProcessWithoutNullStreams) {
    if (server.exitCode !== null || server.killed) return;
    server.kill('SIGTERM');
    await once(server, 'exit');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

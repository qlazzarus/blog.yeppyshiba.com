import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    WAVE_SPAWN_MANIFEST,
    w3xRectToPhaserWorld,
} from '../games/chicken-farm/src/game/waveSpawnManifest';
import {
    selectWaveSpawnPoint,
    WOLF_SPAWN_CLEARANCE_PX,
} from '../games/chicken-farm/src/game/waveSpawnSelector';
import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';
import {
    getWaveOrdinaryEnemyTier,
    getWaveOrdinaryEnemyTierByRawcode,
    WAVE_ORDINARY_ENEMY_TIERS,
} from '../games/chicken-farm/src/game/waveEnemyTiers';
import { validateOrdinaryWavePhases } from '../games/chicken-farm/src/game/wavePhaseConfig';
import { createWaveScheduler } from '../games/chicken-farm/src/game/waveScheduler';
import { createWavePopulationTargets } from '../games/chicken-farm/src/game/wavePopulationTargets';
import { calculateWaveReplenishPlan } from '../games/chicken-farm/src/game/waveReplenish';

type WpmPathingGrid = {
    readonly cellSize: number;
    readonly groundBlocked: readonly boolean[];
    readonly height: number;
    readonly width: number;
};

type SpawnMarker = {
    readonly height: number;
    readonly name: string;
    readonly type: string;
    readonly width: number;
    readonly x: number;
    readonly y: number;
};

type Tilemap = {
    readonly height: number;
    readonly layers: readonly {
        readonly name: string;
        readonly objects?: readonly SpawnMarker[];
    }[];
    readonly tileheight: number;
    readonly tilewidth: number;
    readonly width: number;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_coordinates.json',
);
const selectionOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_spawn_selection.json',
);
const tiersOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_tiers.json',
);
const phasesOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_phases.json',
);
const clockOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_clock.json',
);
const populationTargetsOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_population_targets.json',
);
const replenishOutputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/wave_check_replenish.json',
);
const scale = 2;

async function main() {
    const [tilemapText, gridText, statsText] = await Promise.all([
        readFile(
            path.join(rootDir, 'games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json'),
            'utf8',
        ),
        readFile(
            path.join(rootDir, 'games/chicken-farm/assets/data/wpm_pathing_grid.json'),
            'utf8',
        ),
        readFile(
            path.join(
                rootDir,
                'docs/chicken_farm/chicken_farm_w3x_artifacts/combat_unit_stats_reference.tsv',
            ),
            'utf8',
        ),
    ]);
    const tilemap = JSON.parse(tilemapText) as Tilemap;
    const grid = JSON.parse(gridText) as WpmPathingGrid;
    const markers = tilemap.layers.find((layer) => layer.name === 'spawns')?.objects ?? [];
    const world = {
        height: tilemap.height * tilemap.tileheight * scale,
        width: tilemap.width * tilemap.tilewidth * scale,
    };

    assert.equal(WAVE_SPAWN_MANIFEST.length, 13, '13 wave spawn rects');
    assert.equal(
        new Set(WAVE_SPAWN_MANIFEST.map((rect) => rect.id)).size,
        13,
        'unique rect ids',
    );
    assert.equal(
        new Set(WAVE_SPAWN_MANIFEST.map((rect) => rect.sourceRectSymbol)).size,
        13,
        'unique source rect symbols',
    );

    const rows = WAVE_SPAWN_MANIFEST.map((rect) => {
        const recalculated = w3xRectToPhaserWorld(rect.source);
        assert.deepEqual(recalculated, rect.world, `${rect.id} W3X conversion`);
        assert.ok(rect.world.minX >= 0 && rect.world.minY >= 0, `${rect.id} world minimum`);
        assert.ok(rect.world.maxX <= world.width && rect.world.maxY <= world.height, `${rect.id} world maximum`);

        const marker = markers.find((candidate) => candidate.name === rect.id);
        assert.ok(marker, `${rect.id} tilemap marker`);
        assert.equal(marker.type, 'wolf_spawn_rect', `${rect.id} marker type`);
        assert.deepEqual(
            {
                height: marker.height * scale,
                width: marker.width * scale,
                x: marker.x * scale,
                y: marker.y * scale,
            },
            {
                height: rect.world.maxY - rect.world.minY,
                width: rect.world.maxX - rect.world.minX,
                x: rect.world.minX,
                y: rect.world.minY,
            },
            `${rect.id} marker bounds`,
        );

        const cells = cellsInRect(rect.world, grid);
        const openCellCount = cells.filter(({ index }) => !grid.groundBlocked[index]).length;
        assert.ok(openCellCount > 0, `${rect.id} has a walkable WPM cell`);

        return {
            id: rect.id,
            openCellCount,
            sourceRectSymbol: rect.sourceRectSymbol,
            totalCellCount: cells.length,
            world: rect.world,
        };
    });

    const artifact = {
        case: 'coordinates',
        conversion: 'world = W3X + PHASER_WORLD_ORIGIN_FROM_W3X; Y is not inverted',
        pass: true,
        pathing: {
            cellSize: grid.cellSize,
            dynamicBlockersIncluded: false,
            gridHeight: grid.height,
            gridWidth: grid.width,
            policy: 'Records static WPM ground cells only; dynamic construction blockers are SP-08-03 runtime input.',
        },
        rects: rows,
        source: 'jass_wolf_spawn_points.tsv lines 1244-1256',
        world,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    const selectionArtifact = checkSpawnSelection(world, grid);
    await writeFile(
        selectionOutputPath,
        `${JSON.stringify(selectionArtifact, null, 2)}\n`,
        'utf8',
    );
    const replenishArtifact = checkWaveReplenish();
    await writeFile(replenishOutputPath, `${JSON.stringify(replenishArtifact, null, 2)}\n`, 'utf8');
    const tiersArtifact = checkWaveEnemyTiers(statsText);
    await writeFile(tiersOutputPath, `${JSON.stringify(tiersArtifact, null, 2)}\n`, 'utf8');
    const phasesArtifact = checkWavePhases();
    await writeFile(phasesOutputPath, `${JSON.stringify(phasesArtifact, null, 2)}\n`, 'utf8');
    const clockArtifact = checkWaveClock();
    await writeFile(clockOutputPath, `${JSON.stringify(clockArtifact, null, 2)}\n`, 'utf8');
    const populationTargetsArtifact = checkWavePopulationTargets();
    await writeFile(
        populationTargetsOutputPath,
        `${JSON.stringify(populationTargetsArtifact, null, 2)}\n`,
        'utf8',
    );
    console.log(`Wrote ${outputPath}`);
    console.log(`Wrote ${selectionOutputPath}`);
    console.log(`Wrote ${tiersOutputPath}`);
    console.log(`Wrote ${phasesOutputPath}`);
    console.log(`Wrote ${clockOutputPath}`);
    console.log(`Wrote ${populationTargetsOutputPath}`);
    console.log(`Wrote ${replenishOutputPath}`);
}

function checkWaveReplenish() {
    const targets = [
        { targetQuantity: 0, tier: 1 },
        { targetQuantity: 1, tier: 2 },
        { targetQuantity: 2, tier: 3 },
        { targetQuantity: 5, tier: 4 },
        { targetQuantity: null, tier: 5 },
        { targetQuantity: 4, tier: 6 },
    ];
    const aliveCounts = [
        { aliveCount: 0, tier: 1 },
        { aliveCount: 0, tier: 2 },
        { aliveCount: 1, tier: 3 },
        { aliveCount: 3, tier: 4 },
        { aliveCount: 0, tier: 5 },
        { aliveCount: 7, tier: 6 },
        { aliveCount: 99, tier: 7 },
    ];
    const plan = calculateWaveReplenishPlan({
        aliveCounts,
        batchSize: CHICKEN_FARM_BALANCE.waves.replenishBatchSize,
        targets,
    });
    assert.deepEqual(plan.requests, [
        { count: 1, enemyId: 'frost_wolf', rawcode: 'n008', tier: 2 },
        { count: 1, enemyId: 'giant_wolf', rawcode: 'n009', tier: 3 },
        { count: 2, enemyId: 'giant_frost_wolf', rawcode: 'n00A', tier: 4 },
    ], 'zero, one, and two-or-more shortages use the matching rawcode and bounded request');
    assert.deepEqual(plan.unresolvedTargetTiers, [5], 'unresolved target cannot create a request');

    const retryPlan = calculateWaveReplenishPlan({
        aliveCounts,
        batchSize: 2,
        targets,
    });
    assert.deepEqual(retryPlan, plan, 'failed creation leaves alive state unchanged for the next due tick');
    assert.deepEqual(
        calculateWaveReplenishPlan({
            aliveCounts: [
                { aliveCount: 1, tier: 2 },
                { aliveCount: 2, tier: 3 },
                { aliveCount: 5, tier: 4 },
                { aliveCount: 7, tier: 6 },
            ],
            batchSize: 2,
            targets,
        }).requests,
        [],
        'updated alive counts consume prior requests without an internal double count',
    );

    const scheduler = createWaveScheduler(CHICKEN_FARM_BALANCE.waves.ordinaryPhases);
    const populationTargets = createWavePopulationTargets();
    populationTargets.tick(120, scheduler.tick(120));
    const unresolvedLivePlan = calculateWaveReplenishPlan({
        aliveCounts: [],
        batchSize: 2,
        targets: populationTargets.getSnapshot().activeTierTargets,
    });
    assert.deepEqual(unresolvedLivePlan.requests, [], 'current unresolved source targets cannot spawn');
    assert.deepEqual(unresolvedLivePlan.unresolvedTargetTiers, [1, 2, 3, 4, 5, 6]);

    assert.throws(
        () => calculateWaveReplenishPlan({ aliveCounts: [], batchSize: 0, targets: [] }),
        Error,
        'invalid batch rejected',
    );
    assert.throws(
        () => calculateWaveReplenishPlan({ aliveCounts: [], batchSize: 2, targets: [{ targetQuantity: 1, tier: 19 }] }),
        Error,
        'unknown target tier rejected',
    );

    return {
        batchPolicy: 'Web safety decision: request min(shortage, batchSize), so a known one-unit shortage requests one and never exceeds target.',
        case: 'replenish',
        pass: true,
        requests: plan.requests,
        unresolvedLiveTargetTiers: unresolvedLivePlan.unresolvedTargetTiers,
        unresolvedTargetTiers: plan.unresolvedTargetTiers,
    };
}

function checkWavePopulationTargets() {
    const scheduler = createWaveScheduler(CHICKEN_FARM_BALANCE.waves.ordinaryPhases);
    const targets = createWavePopulationTargets();
    const tick = (elapsedSec: number) =>
        targets.tick(elapsedSec, scheduler.tick(elapsedSec));

    assert.deepEqual(tick(119.999), [], 'no target event before first phase');
    assert.deepEqual(
        tick(120).map((event) => [event.type, event.atSec]),
        [['phase_entry_targets_applied', 120]],
        'first phase initializes target state',
    );
    assert.deepEqual(
        targets.getSnapshot().activeTierTargets,
        [1, 2, 3, 4, 5, 6].map((tier) => ({ confirmedPhaseEntryDeltaTotal: 0, targetQuantity: null, tier })),
        'unknown initial targets remain null',
    );
    assert.deepEqual(
        tick(155).map((event) => [event.type, event.atSec]),
        [['periodic_target_increment_unresolved', 155]],
        'first periodic due time is one full interval after phase start',
    );
    assert.deepEqual(tick(155), [], 'same periodic timestamp is idempotent');

    const phase600Events = tick(600);
    assert.equal(
        phase600Events.at(-1)?.type,
        'phase_entry_targets_applied',
        'phase transition follows earlier periodic due times',
    );
    assert.deepEqual(
        targets.getSnapshot().activeTierTargets,
        [
            [3, 7], [4, 3], [5, 2], [6, 1], [7, 0],
        ].map(([tier, confirmedPhaseEntryDeltaTotal]) => ({
            confirmedPhaseEntryDeltaTotal,
            targetQuantity: null,
            tier,
        })),
        'phase entry deltas accumulate without inventing target quantities',
    );
    assert.ok(
        !targets.getSnapshot().activeTierTargets.some((entry) => entry.tier === 1),
        'inactive tier is excluded from current phase targets',
    );

    tick(2800);
    assert.deepEqual(
        targets.getSnapshot().activeTierTargets,
        [
            [14, 17], [15, 14], [16, 7], [17, 5], [18, 4],
        ].map(([tier, confirmedPhaseEntryDeltaTotal]) => ({
            confirmedPhaseEntryDeltaTotal,
            targetQuantity: null,
            tier,
        })),
        '2800 phase preserves overlapping tier entry deltas and switches active tiers',
    );
    assert.deepEqual(
        tick(2822).map((event) => [event.type, event.atSec]),
        [['periodic_target_increment_unresolved', 2822]],
        '2800 phase uses 22-second periodic interval',
    );

    const finalEvents = tick(3000);
    assert.equal(finalEvents.at(-1)?.type, 'phase_entry_targets_applied');
    assert.deepEqual(
        targets.getSnapshot().activeTierTargets,
        [
            [16, 16], [17, 12], [18, 10],
        ].map(([tier, confirmedPhaseEntryDeltaTotal]) => ({
            confirmedPhaseEntryDeltaTotal,
            targetQuantity: null,
            tier,
        })),
        'final phase retains prior known deltas and applies final entry delta',
    );
    assert.deepEqual(tick(3000), [], 'same phase timestamp cannot add targets twice');

    const oneJump = collectPopulationEventPairs([0, 3000]);
    const partitioned = collectPopulationEventPairs([0, 120, 600, 1100, 1500, 2000, 2200, 2400, 2600, 2800, 3000]);
    assert.deepEqual(partitioned, oneJump, 'partitioned ticks preserve target event order');

    const snapshot = targets.getSnapshot();
    return {
        activeTierTargets: snapshot.activeTierTargets,
        case: 'population_targets',
        pass: true,
        periodicPolicy: 'Due times are recorded, but target quantities stay null because initial values and periodic delta amounts are unresolved source facts.',
        phaseEntryPolicy: 'Known phase-entry deltas accumulate by tier; only the current phase active tiers are exposed for replenishment.',
        sampleEventOrder: oneJump,
    };
}

function collectPopulationEventPairs(times: readonly number[]) {
    const scheduler = createWaveScheduler(CHICKEN_FARM_BALANCE.waves.ordinaryPhases);
    const targets = createWavePopulationTargets();
    return times.flatMap((time) =>
        targets.tick(time, scheduler.tick(time)).map((event) => [event.type, event.atSec]),
    );
}

function checkWaveClock() {
    const phases = CHICKEN_FARM_BALANCE.waves.ordinaryPhases;
    const milestoneTimes = phases.map((phase) => phase.atSec);
    const scheduler = createWaveScheduler(phases);
    assert.deepEqual(scheduler.tick(119.999), [], 'before first milestone has no event');
    const first = scheduler.tick(120);
    assert.deepEqual(first.map((event) => event.atSec), [120], 'first exact milestone');
    assert.deepEqual(scheduler.tick(120), [], 'repeated timestamp is idempotent');
    assert.deepEqual(scheduler.tick(120.001), [], 'after first milestone has no duplicate');
    assert.equal(scheduler.getSnapshot().currentPhase?.atSec, 120, 'first phase remains current');

    const jumped = scheduler.tick(2400);
    assert.deepEqual(
        jumped.map((event) => event.atSec),
        [600, 1100, 1500, 2000, 2200, 2400],
        'large jump emits each crossed phase in ascending order',
    );
    assert.deepEqual(scheduler.tick(2400), [], 'large jump events are not repeated');
    assert.equal(scheduler.getSnapshot().nextPhaseAtSec, 2600, 'next phase after jump');
    assert.throws(() => scheduler.tick(2399), Error, 'backward time is rejected');
    assert.throws(() => scheduler.tick(Number.NaN), Error, 'NaN time is rejected');
    assert.throws(() => scheduler.tick(-1), Error, 'negative time is rejected');

    const finalEvents = scheduler.tick(3000);
    assert.deepEqual(finalEvents.map((event) => event.atSec), [2600, 2800, 3000]);
    assert.deepEqual(scheduler.tick(3000), [], 'final phase is idempotent');
    const finalSnapshot = scheduler.getSnapshot();
    assert.equal(finalSnapshot.currentPhase?.atSec, 3000, '3000 starts the final ordinary phase');
    assert.equal(finalSnapshot.nextPhaseAtSec, null, '3000 does not terminate the scheduler');

    const oneJump = collectPhaseEvents([0, 3000]);
    const partitioned = collectPhaseEvents([0, 119.999, 120, 600, 1100, 1500, 2000, 2200, 2400, 2600, 2800, 3000]);
    assert.deepEqual(oneJump, milestoneTimes, 'one jump event order');
    assert.deepEqual(partitioned, oneJump, 'partitioned time has identical event order');

    return {
        case: 'clock',
        finalSnapshot: {
            currentPhaseAtSec: finalSnapshot.currentPhase?.atSec ?? null,
            nextPhaseAtSec: finalSnapshot.nextPhaseAtSec,
        },
        pass: true,
        partitionedEventTimes: partitioned,
        rejectedInputs: ['backward_time', 'NaN', 'negative_time'],
        timingPolicy: 'Each phase atSec is emitted once when simulation elapsedSec reaches or passes it; 3000 starts the last phase.',
    };
}

function collectPhaseEvents(times: readonly number[]): number[] {
    const scheduler = createWaveScheduler(CHICKEN_FARM_BALANCE.waves.ordinaryPhases);
    return times.flatMap((time) => scheduler.tick(time).map((event) => event.atSec));
}

function checkWavePhases() {
    const phases = CHICKEN_FARM_BALANCE.waves.ordinaryPhases;
    const expectedMilestones = [120, 600, 1100, 1500, 2000, 2200, 2400, 2600, 2800, 3000];
    const expectedTiers = [
        [1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 7], [4, 5, 6, 7, 8, 9], [7, 8, 9],
        [8, 9, 10, 11, 12], [10, 11, 12], [11, 12, 13, 14, 15], [13, 14, 15],
        [14, 15, 16, 17, 18], [16, 17, 18],
    ];
    const expectedDeltas = [
        [], [[3, 7], [4, 3], [5, 2], [6, 1]], [[4, 5], [5, 3], [6, 2], [7, 1]],
        [[7, 4], [8, 3], [9, 2]], [[8, 7], [9, 5], [10, 4], [11, 3], [12, 2]],
        [[10, 7], [11, 4], [12, 3]], [[11, 7], [12, 6], [13, 5], [14, 4], [15, 3]],
        [[13, 7], [14, 4], [15, 3]], [[14, 9], [15, 8], [16, 7], [17, 5], [18, 4]],
        [[16, 9], [17, 7], [18, 6]],
    ];
    assert.deepEqual(phases.map((phase) => phase.atSec), expectedMilestones, 'phase milestones');
    assert.equal(CHICKEN_FARM_BALANCE.waves.replenishBatchSize, 2, 'replenish batch size');
    assert.equal(CHICKEN_FARM_BALANCE.waves.bossMilestonesForSp10.length, 5, 'boss handoff milestones');
    phases.forEach((phase, index) => {
        assert.deepEqual(phase.activeTiers, expectedTiers[index], `${phase.atSec} active tiers`);
        assert.deepEqual(
            phase.phaseEntryTargetDeltas.map((delta) => [delta.tier, delta.amount]),
            expectedDeltas[index],
            `${phase.atSec} entry deltas`,
        );
        assert.equal(phase.replenishIntervalSec, 0.2, `${phase.atSec} replenish interval`);
        assert.equal(
            phase.targetIncrementIntervalSec,
            phase.atSec >= 2800 ? 22 : 35,
            `${phase.atSec} increment interval`,
        );
        assert.equal(phase.periodicTargetDeltas, null, `${phase.atSec} unresolved periodic delta`);
    });
    validateOrdinaryWavePhases(phases);

    const rejectionCases = [
        ['duplicate_milestone', () => validateOrdinaryWavePhases([...phases.slice(0, 1), { ...phases[1], atSec: 120 }])],
        ['unknown_tier', () => validateOrdinaryWavePhases([{ ...phases[0], activeTiers: [1, 19] }])],
        ['negative_delta', () => validateOrdinaryWavePhases([{ ...phases[1], phaseEntryTargetDeltas: [{ tier: 3, amount: -1 }] }])],
    ] as const;
    for (const [name, run] of rejectionCases) {
        assert.throws(run, Error, `${name} is rejected`);
    }

    return {
        case: 'phases',
        bossHandoffOnly: CHICKEN_FARM_BALANCE.waves.bossMilestonesForSp10,
        pass: true,
        periodicTargetDeltas: 'null: source increment amounts are unresolved; SP-08-07 must not invent them.',
        phases: phases.map((phase) => ({
            activeTiers: phase.activeTiers,
            atSec: phase.atSec,
            phaseEntryTargetDeltas: phase.phaseEntryTargetDeltas,
            replenishIntervalSec: phase.replenishIntervalSec,
            targetIncrementIntervalSec: phase.targetIncrementIntervalSec,
        })),
        rejectedInputs: rejectionCases.map(([name]) => name),
        source: 'wolf_wave_phase_reference.tsv',
    };
}

function checkWaveEnemyTiers(statsText: string) {
    assert.equal(WAVE_ORDINARY_ENEMY_TIERS.length, 18, '18 ordinary tiers');
    assert.equal(
        new Set(WAVE_ORDINARY_ENEMY_TIERS.map((tier) => tier.rawcode)).size,
        18,
        'unique ordinary rawcodes',
    );
    assert.equal(
        new Set(WAVE_ORDINARY_ENEMY_TIERS.map((tier) => tier.enemyId)).size,
        18,
        'unique ordinary EnemyIds',
    );

    const sourceRows = parseWolfStatRows(statsText);
    const rows = WAVE_ORDINARY_ENEMY_TIERS.map((tier) => {
        const enemy = CHICKEN_FARM_BALANCE.enemies[tier.enemyId];
        const source = sourceRows.get(tier.rawcode);
        assert.ok(source, `${tier.rawcode} source stats`);
        assert.equal(getWaveOrdinaryEnemyTier(tier.tier)?.rawcode, tier.rawcode);
        assert.equal(getWaveOrdinaryEnemyTierByRawcode(tier.rawcode)?.tier, tier.tier);
        assert.equal(enemy.source.rawcode, tier.rawcode, `${tier.rawcode} balance source`);
        assert.ok(enemy.tags.includes('ordinary'), `${tier.rawcode} ordinary tag`);
        assert.equal(enemy.hp, source.hp, `${tier.rawcode} hp`);
        assert.equal(enemy.armor, source.armor, `${tier.rawcode} armor`);
        assert.equal(enemy.speedPxPerSec, source.speed, `${tier.rawcode} speed`);
        assert.equal(enemy.attackCooldownSec, source.cooldown, `${tier.rawcode} cooldown`);
        assert.equal(
            enemy.damage,
            Math.round(source.damagePlus + (source.dice * (source.sides + 1)) / 2),
            `${tier.rawcode} fixed damage conversion`,
        );
        return {
            armor: enemy.armor,
            attackCooldownSec: enemy.attackCooldownSec,
            damage: enemy.damage,
            enemyId: tier.enemyId,
            hp: enemy.hp,
            rawcode: tier.rawcode,
            speedPxPerSec: enemy.speedPxPerSec,
            tier: tier.tier,
        };
    });
    assert.equal(getWaveOrdinaryEnemyTierByRawcode('H012'), null, 'boss rawcode rejected');
    assert.equal(getWaveOrdinaryEnemyTierByRawcode('missing'), null, 'unknown rawcode rejected');

    return {
        case: 'tiers',
        damagePolicy: 'W3X base + 1dN damage is stored as Math.round(base + (N + 1) / 2).',
        pass: true,
        specialAbilities: 'Not represented by ordinary tier data; SP-10 owns ability and summon lifecycle.',
        tiers: rows,
    };
}

function parseWolfStatRows(statsText: string) {
    const [headerLine, ...lines] = statsText.trim().split('\n');
    const headers = headerLine.split('\t');
    const index = (name: string) => {
        const value = headers.indexOf(name);
        assert.ok(value >= 0, `missing ${name} column`);
        return value;
    };
    const columns = {
        armor: index('armor'),
        cooldown: index('cooldown'),
        damagePlus: index('damage_plus'),
        dice: index('dice'),
        group: index('group'),
        hp: index('hp'),
        rawcode: index('rawcode'),
        sides: index('sides'),
        speed: index('speed'),
        tier: index('tier_or_role'),
    };
    const rows = new Map<string, {
        readonly armor: number;
        readonly cooldown: number;
        readonly damagePlus: number;
        readonly dice: number;
        readonly hp: number;
        readonly sides: number;
        readonly speed: number;
    }>();
    for (const line of lines) {
        const values = line.split('\t');
        if (values[columns.group] !== 'wolf') continue;
        assert.match(values[columns.tier], /^tier \d+$/, `${values[columns.rawcode]} ordinary tier`);
        rows.set(values[columns.rawcode], {
            armor: Number(values[columns.armor]),
            cooldown: Number(values[columns.cooldown]),
            damagePlus: Number(values[columns.damagePlus]),
            dice: Number(values[columns.dice]),
            hp: Number(values[columns.hp]),
            sides: Number(values[columns.sides]),
            speed: Number(values[columns.speed]),
        });
    }
    return rows;
}

function checkSpawnSelection(
    world: { readonly height: number; readonly width: number },
    grid: WpmPathingGrid,
) {
    const cleanConfig = {
        dynamicBlockedRects: [],
        isTerrainFootprintBlocked: (footprint: { readonly height: number; readonly width: number; readonly x: number; readonly y: number }) =>
            isGroundFootprintBlocked(footprint, grid),
        maxAttemptsPerRect: 2,
        rects: WAVE_SPAWN_MANIFEST,
        worldSize: world,
    } as const;
    const seededA = selectWaveSpawnPoint({ ...cleanConfig, random: seededRandom(91) });
    const seededB = selectWaveSpawnPoint({ ...cleanConfig, random: seededRandom(91) });
    assert.deepEqual(seededA, seededB, 'same seed/state returns same selection');
    assert.ok(seededA, 'clean selection exists');

    const everyRect = WAVE_SPAWN_MANIFEST.map((rect) => {
        const selection = selectWaveSpawnPoint({
            ...cleanConfig,
            random: seededRandom(rect.sourceLine),
            rects: [rect],
        });
        assert.ok(selection, `${rect.id} can select a spawn point`);
        assert.equal(selection.rect.id, rect.id, `${rect.id} remains selected`);
        return { id: rect.id, point: selection.candidate, rectId: selection.rect.id };
    });

    const partialBlocker = {
        height: 48,
        width: 48,
        x: WAVE_SPAWN_MANIFEST[0].world.minX + 16,
        y: WAVE_SPAWN_MANIFEST[0].world.minY + 16,
    };
    const partial = selectWaveSpawnPoint({
        ...cleanConfig,
        dynamicBlockedRects: [partialBlocker],
        random: sequenceRandom([0, 0.2, 0.2, 0.8, 0.8]),
        rects: [WAVE_SPAWN_MANIFEST[0]],
    });
    assert.ok(partial, 'second candidate succeeds after a dynamic blocker rejection');
    assert.equal(partial.attempts[0]?.reason, 'dynamic_blocker');

    const terrainFallback = selectWaveSpawnPoint({
        ...cleanConfig,
        isTerrainFootprintBlocked: (footprint) => footprint.x < WAVE_SPAWN_MANIFEST[0].world.minX + 80,
        random: sequenceRandom([0, 0.2, 0.2, 0.8, 0.8]),
        rects: [WAVE_SPAWN_MANIFEST[0]],
    });
    assert.ok(terrainFallback, 'second candidate succeeds after terrain rejection');
    assert.equal(terrainFallback.attempts[0]?.reason, 'terrain_blocker');

    const allBlocked = selectWaveSpawnPoint({
        ...cleanConfig,
        dynamicBlockedRects: [{ height: world.height, width: world.width, x: 0, y: 0 }],
        random: seededRandom(4),
    });
    assert.equal(allBlocked, null, 'all dynamic blockers produce no spawn request');

    const boundaryRejected = selectWaveSpawnPoint({
        ...cleanConfig,
        random: seededRandom(2),
        rects: [{
            ...WAVE_SPAWN_MANIFEST[0],
            id: 'boundary_probe',
            world: { maxX: 20, maxY: 20, minX: 0, minY: 0 },
        }],
    });
    assert.equal(boundaryRejected, null, 'rect smaller than wolf clearance cannot spawn');

    return {
        case: 'spawn_selection',
        checks: {
            allBlocked: { pass: allBlocked === null, result: allBlocked },
            boundaryRejected: { pass: boundaryRejected === null, result: boundaryRejected },
            eachRect: everyRect,
            partialDynamicBlocker: { attempts: partial.attempts, pass: true, selected: partial.candidate },
            partialTerrainBlocker: { attempts: terrainFallback.attempts, pass: true, selected: terrainFallback.candidate },
            repeatableSeed: { pass: true, selection: seededA },
        },
        dynamicBlockerPolicy: 'Intersecting wolf footprints are rejected; no alternate farm position is used.',
        pass: true,
        retryPolicy: 'A null result creates no spawn request; the scheduler retries on its next replenish tick.',
        wolfClearancePx: WOLF_SPAWN_CLEARANCE_PX,
    };
}

function seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function sequenceRandom(values: readonly number[]) {
    let index = 0;
    return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function cellsInRect(
    rect: { readonly maxX: number; readonly maxY: number; readonly minX: number; readonly minY: number },
    grid: WpmPathingGrid,
) {
    const minCol = Math.max(0, Math.floor(rect.minX / grid.cellSize));
    const maxCol = Math.min(grid.width - 1, Math.floor((rect.maxX - 1) / grid.cellSize));
    const minRow = Math.max(0, Math.floor(rect.minY / grid.cellSize));
    const maxRow = Math.min(grid.height - 1, Math.floor((rect.maxY - 1) / grid.cellSize));
    const cells: { readonly index: number }[] = [];

    for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
            cells.push({ index: row * grid.width + col });
        }
    }
    return cells;
}

function isGroundFootprintBlocked(
    footprint: { readonly height: number; readonly width: number; readonly x: number; readonly y: number },
    grid: WpmPathingGrid,
) {
    const minCol = Math.max(0, Math.floor(footprint.x / grid.cellSize));
    const maxCol = Math.min(
        grid.width - 1,
        Math.floor((footprint.x + footprint.width - 1) / grid.cellSize),
    );
    const minRow = Math.max(0, Math.floor(footprint.y / grid.cellSize));
    const maxRow = Math.min(
        grid.height - 1,
        Math.floor((footprint.y + footprint.height - 1) / grid.cellSize),
    );
    for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
            if (grid.groundBlocked[row * grid.width + col]) return true;
        }
    }
    return false;
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});

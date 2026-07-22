import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/top-speed-equilibrium');
const jsonPath = path.join(outputDir, 'top-speed-force-budget-tse3.json');
const markdownPath = path.join(outputDir, 'top-speed-force-budget-tse3.md');
const tse2Path = path.join(outputDir, 'top-speed-equilibrium-tse2-baseline.json');
const frameSeconds = 1 / 60;
const maximumDurationSec = 600;
const terminalWindowSec = 5;
const terminalSpeedDeltaKmh = 0.01;
const terminalAcceleration = 0.01;
const profile = RAVEN_COUPE_ENGINE_PROFILE;
// TSE-3 is a historical design comparison. Freeze its TSE-2 control so the
// report remains reproducible after the selected TSE-4 constants go live.
const productionConfig = createPlayerControllerBaselineConfig({
    aeroDrag: 0.00012,
    launchThrottleFullSpeedRatio: 0.7,
});
const tse2Baseline = JSON.parse(await readFile(tse2Path, 'utf8'));
const targetSpeedsKmh = [223, 224, 225];
const forceBudgetRows = [100, 150, 175.34, 200, 212.687, 223, 224, 225]
    .map((speedKmh) => measureSteadyForce(speedKmh, productionConfig));
const derivedAeroRows = targetSpeedsKmh.map((targetSpeedKmh) => {
    const zeroDragForce = measureSteadyForce(targetSpeedKmh, {
        ...productionConfig,
        aeroDrag: 0,
    });
    const aeroDrag = (
        zeroDragForce.engineForce -
        zeroDragForce.rollingResistance
    ) / (zeroDragForce.speedUnitPerSec ** 2);

    return {
        aeroDrag,
        availableAeroForce: zeroDragForce.engineForce - zeroDragForce.rollingResistance,
        engineForce: zeroDragForce.engineForce,
        rollingResistance: zeroDragForce.rollingResistance,
        targetSpeedKmh,
    };
});
const selectedAero = findDerivedAero(224).aeroDrag;
const forceAt225 = findForceBudget(225);
const globalEngineScaleFor225 = (
    forceAt225.rollingResistance + forceAt225.aeroDrag
) / forceAt225.engineForce;
const candidates = [
    {
        aeroDrag: productionConfig.aeroDrag,
        engineAcceleration: productionConfig.engineAcceleration,
        id: 'production',
        intent: 'TSE-2 control',
    },
    ...derivedAeroRows.map((row) => ({
        aeroDrag: row.aeroDrag,
        engineAcceleration: productionConfig.engineAcceleration,
        id: `aero-equilibrium-${row.targetSpeedKmh}`,
        intent: `${row.targetSpeedKmh}km/h level equilibrium`,
    })),
    {
        aeroDrag: productionConfig.aeroDrag,
        engineAcceleration: productionConfig.engineAcceleration * globalEngineScaleFor225,
        id: 'global-engine-equilibrium-225',
        intent: 'analytical global engine-force alternative',
    },
];
const candidateRows = candidates.map(simulateCandidate);
const production = findCandidate('production');
const selected = findCandidate('aero-equilibrium-224');
const selectedForce223 = measureSteadyForce(223, {
    ...productionConfig,
    aeroDrag: selectedAero,
});
const selectedForce224 = measureSteadyForce(224, {
    ...productionConfig,
    aeroDrag: selectedAero,
});
const selectedForce225 = measureSteadyForce(225, {
    ...productionConfig,
    aeroDrag: selectedAero,
});
const tse2Level = tse2Baseline.rows.find((row) => row.id === 'level');
const checks = [
    check(
        'productionMatchesTse2Level',
        Math.abs(production.terminal.speedKmh - tse2Level.terminal.speedKmh) <= 0.001,
        tse2Level.terminal.speedKmh,
        production.terminal.speedKmh,
    ),
    check(
        'derivedAeroOrdering',
        derivedAeroRows[0].aeroDrag > derivedAeroRows[1].aeroDrag &&
            derivedAeroRows[1].aeroDrag > derivedAeroRows[2].aeroDrag,
        'aero(223) > aero(224) > aero(225)',
        derivedAeroRows.map(({ aeroDrag, targetSpeedKmh }) => ({ aeroDrag, targetSpeedKmh })),
    ),
    // The controller updates engine RPM once more after applying speed, so a
    // forced-speed probe retains a sub-millinewton-equivalent integration
    // residue even though the algebraic aero root is exact.
    checkBetween('selectedForceAt224', Math.abs(selectedForce224.netAcceleration), 0, 0.001),
    check(
        'selectedForceBracketsTarget',
        selectedForce223.netAcceleration > 0 && selectedForce225.netAcceleration < 0,
        'net acceleration positive at 223 and negative at 225',
        {
            '223': selectedForce223.netAcceleration,
            '224': selectedForce224.netAcceleration,
            '225': selectedForce225.netAcceleration,
        },
    ),
    checkBetween('selectedTerminalKmh', selected.terminal.speedKmh, 223, 225),
    check('selectedTerminalSixthGear', selected.terminal.gear === 6, 6, selected.terminal.gear),
    check('selectedAvoidsHardClamp', !selected.hitHardClamp, false, selected.hitHardClamp),
    check(
        'selectedReachesFourthFifthSixth',
        [4, 5, 6].every((gear) => selected.gearsVisited.includes(gear)),
        [4, 5, 6],
        selected.gearsVisited,
    ),
    check(
        'selectedExposesLowSpeedRegressionForTse4',
        selected.hits['100'] < 7.8,
        '0-100 becomes faster than the 7.8s lower gate before TSE-4 compensation',
        selected.hits['100'],
    ),
    check(
        'topGearOnlyCannotUnblockCurrentRun',
        production.maximumGear === 4,
        'production run never reaches 5th/6th, so a 6th-only boost cannot solve reachability',
        production.maximumGear,
    ),
    check(
        'globalEngineAlternativeBreaksStandingStart',
        findCandidate('global-engine-equilibrium-225').hits['100'] < 5,
        'global force scaling makes 0-100 unrealistically faster than the 7.8s gate',
        findCandidate('global-engine-equilibrium-225').hits['100'],
    ),
];
const report = roundObject({
    candidateRows,
    checks,
    decision: {
        applyInStage: 'TSE-4',
        rejected: [
            {
                id: 'global-engine-equilibrium-225',
                reason: 'multiplies low-gear force and destroys the approved standing-start curve',
                requiredScale: globalEngineScaleFor225,
            },
            {
                id: 'sixth-gear-only-force-boost',
                reason: 'production equilibrium stops in 4th, so the candidate cannot reach its own activation gear',
            },
        ],
        selectedAeroDrag: selectedAero,
        selectedCandidate: selected.id,
        selectedTargetSpeedKmh: 224,
        status: 'recommended-for-tse4-calibration-not-applied-to-production',
    },
    derivedAeroRows,
    forceBudgetRows,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    productionConstants: {
        accelSpeed: productionConfig.accelSpeed,
        aeroDrag: productionConfig.aeroDrag,
        engineAcceleration: productionConfig.engineAcceleration,
        rollingResistance: productionConfig.rollingResistance,
    },
    schemaVersion: 1,
    selectedForceBracket: [selectedForce223, selectedForce224, selectedForce225],
    stage: 'TSE-3',
});

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`TSE-3 top-speed force budget: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
console.log(`Selected for TSE-4: ${report.decision.selectedCandidate}`);
for (const row of report.candidateRows) {
    console.log(
        `- ${row.id}: terminal ${row.terminal.speedKmh}km/h, ` +
        `0-100 ${row.hits['100'] ?? '-'}s, max gear ${row.maximumGear}, clamp ${row.hitHardClamp}`,
    );
}
for (const result of report.checks) {
    console.log(`- ${result.pass ? 'PASS' : 'FAIL'} ${result.id}`);
}

if (!report.pass) process.exitCode = 1;

function measureSteadyForce(speedKmh, config) {
    const speed = speedKmh / profile.displayTopSpeedKmh * config.accelSpeed;
    const player = createDefaultPlayerVehicleState(speed, profile, config.accelSpeed);

    for (let frame = 0; frame < 60 * 5; frame += 1) {
        player.speed = speed;
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: 0, slopeAcceleration: 0 },
            config,
            frameSeconds,
        );
        player.speed = speed;
    }

    const force = player.longitudinalForce;
    return {
        aeroDrag: force.aeroDrag,
        engineForce: force.engineForce,
        gear: force.gearIndex + 1,
        netAcceleration: force.netAcceleration,
        rollingResistance: force.rollingResistance,
        rpm: force.rpm,
        speedKmh,
        speedUnitPerSec: force.speed,
    };
}

function simulateCandidate(candidate) {
    const config = {
        ...productionConfig,
        aeroDrag: candidate.aeroDrag,
        engineAcceleration: candidate.engineAcceleration,
    };
    const player = createDefaultPlayerVehicleState(0, profile, config.accelSpeed);
    const hitTargets = [60, 100, 175.34, 200, 212.687, 220, 223];
    const hits = {};
    const recent = [];
    const gearsVisited = new Set([player.gearIndex + 1]);
    let hitHardClamp = false;
    let terminal = null;

    for (let frame = 0; frame <= maximumDurationSec / frameSeconds; frame += 1) {
        const timeSec = frame * frameSeconds;
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: 0, slopeAcceleration: 0 },
            config,
            frameSeconds,
        );
        const speedKmh = getDisplaySpeedKmh(player.speed, config.accelSpeed, profile);

        gearsVisited.add(player.gearIndex + 1);
        hitHardClamp ||= player.speed >= config.accelSpeed - 0.000001;
        for (const target of hitTargets) {
            if (hits[target] === undefined && speedKmh >= target) hits[target] = timeSec;
        }
        recent.push({ speedKmh, timeSec });
        while (recent.length > 1 && recent[0].timeSec < timeSec - terminalWindowSec) recent.shift();

        const windowCovered = recent.length > 1 &&
            recent.at(-1).timeSec - recent[0].timeSec >= terminalWindowSec - frameSeconds * 1.5;
        const recentSpeedDeltaKmh = windowCovered
            ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
            : Number.POSITIVE_INFINITY;

        if (
            timeSec >= 30 &&
            windowCovered &&
            recentSpeedDeltaKmh <= terminalSpeedDeltaKmh &&
            Math.abs(player.longitudinalForce.netAcceleration) <= terminalAcceleration
        ) {
            terminal = {
                gear: player.gearIndex + 1,
                netAcceleration: player.longitudinalForce.netAcceleration,
                recentSpeedDeltaKmh,
                rpm: player.rpm,
                speedKmh,
                speedUnitPerSec: player.speed,
                timeSec,
            };
            break;
        }
    }

    if (!terminal) {
        terminal = {
            gear: player.gearIndex + 1,
            netAcceleration: player.longitudinalForce.netAcceleration,
            reached: false,
            recentSpeedDeltaKmh: recent.length > 1
                ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
                : null,
            rpm: player.rpm,
            speedKmh: getDisplaySpeedKmh(player.speed, config.accelSpeed, profile),
            speedUnitPerSec: player.speed,
            timeSec: maximumDurationSec,
        };
    } else {
        terminal.reached = true;
    }

    return {
        ...candidate,
        gearsVisited: [...gearsVisited],
        hitHardClamp,
        hits,
        maximumGear: Math.max(...gearsVisited),
        terminal,
    };
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul TSE-3 최고속 Force Budget',
        '',
        `생성: ${result.generatedAt}`,
        '',
        `상태: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        'Production 상수를 변경하지 않고 level 223/224/225km/h 평형 후보를 비교한다. 선택 결과는 TSE-4 입력이며 아직 runtime에 적용되지 않았다.',
        '',
        '## Production steady force',
        '',
        '| km/h | gear | RPM | drive | rolling | aero | net |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.forceBudgetRows.map((row) => (
            `| ${row.speedKmh} | ${row.gear} | ${format(row.rpm)} | ${format(row.engineForce)} | ` +
            `${format(row.rollingResistance)} | ${format(row.aeroDrag)} | ${format(row.netAcceleration)} |`
        )),
        '',
        '## Derived aero coefficients',
        '',
        '| target km/h | drive | rolling | available aero | coefficient | production ratio |',
        '| ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.derivedAeroRows.map((row) => (
            `| ${row.targetSpeedKmh} | ${format(row.engineForce)} | ${format(row.rollingResistance)} | ` +
            `${format(row.availableAeroForce)} | ${format(row.aeroDrag, 12)} | ` +
            `${format(row.aeroDrag / result.productionConstants.aeroDrag, 4)} |`
        )),
        '',
        '## Candidate simulation',
        '',
        '| candidate | aero | engine accel | 0-60 | 0-100 | 175 | 213 | 223 | terminal | gear | clamp |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
        ...result.candidateRows.map((row) => (
            `| ${row.id} | ${format(row.aeroDrag, 12)} | ${format(row.engineAcceleration)} | ` +
            `${format(row.hits['60'])} | ${format(row.hits['100'])} | ${format(row.hits['175.34'])} | ` +
            `${format(row.hits['212.687'])} | ${format(row.hits['223'])} | ` +
            `${format(row.terminal.speedKmh)} | ${row.terminal.gear} | ${row.hitHardClamp ? 'yes' : 'no'} |`
        )),
        '',
        '## Decision',
        '',
        `- Selected for TSE-4: **${result.decision.selectedCandidate}**`,
        `- Proposed aeroDrag: **${format(result.decision.selectedAeroDrag, 12)}**`,
        `- Production aeroDrag: **${format(result.productionConstants.aeroDrag, 12)}**`,
        '- Target 224km/h leaves positive force at 223km/h and negative force at 225km/h, so the clamp does not create the equilibrium.',
        '- Global engine scaling is rejected because it multiplies low-gear force. Sixth-only boost is rejected because the production car never reaches sixth.',
        `- The selected drag-only candidate reaches 100km/h in **${format(result.candidateRows.find((row) => row.id === result.decision.selectedCandidate).hits['100'])}s**, so TSE-4 must restore the approved 7.8~8.3s low-speed curve separately.`,
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ${formatValue(entry.value)} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function findDerivedAero(targetSpeedKmh) {
    const row = derivedAeroRows.find((entry) => entry.targetSpeedKmh === targetSpeedKmh);
    if (!row) throw new Error(`Missing derived aero row ${targetSpeedKmh}`);
    return row;
}

function findForceBudget(speedKmh) {
    const row = forceBudgetRows.find((entry) => entry.speedKmh === speedKmh);
    if (!row) throw new Error(`Missing force budget row ${speedKmh}`);
    return row;
}

function findCandidate(id) {
    const row = candidateRows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing candidate ${id}`);
    return row;
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function checkBetween(id, value, min, max) {
    return check(id, value >= min && value <= max, [min, max], round(value, 8));
}

function roundObject(value) {
    if (Array.isArray(value)) return value.map(roundObject);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundObject(entry)]));
    }
    return typeof value === 'number' && Number.isFinite(value) ? round(value, 12) : value;
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function format(value, digits = 3) {
    return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (typeof value === 'number') return format(value, 9);
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value).replaceAll('|', '\\|');
    return String(value).replaceAll('|', '\\|');
}

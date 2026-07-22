import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    getGearRpm,
    getInitialGearIndex,
    getPhysicalDownshiftRpm,
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
const jsonPath = path.join(outputDir, 'top-speed-equilibrium-tse2-baseline.json');
const markdownPath = path.join(outputDir, 'top-speed-equilibrium-tse2-baseline.md');
const tse1Path = path.join(outputDir, 'top-speed-equilibrium-tse1-baseline.json');
const frameSeconds = 1 / 60;
const maximumDurationSec = 600;
const terminalWindowSec = 5;
const terminalSpeedDeltaKmh = 0.01;
const terminalAcceleration = 0.01;
const sampleIntervalSec = 5;
const profile = RAVEN_COUPE_ENGINE_PROFILE;
// This script preserves the historical TSE-2 physical-shift baseline. Current
// production calibration is audited by audit-top-speed-calibration.mjs.
const config = createPlayerControllerBaselineConfig({
    aeroDrag: 0.00012,
    launchThrottleFullSpeedRatio: 0.7,
});
const scenarios = [
    { id: 'uphill', label: 'uphill -10', slopeAcceleration: -10 },
    { id: 'level', label: 'level 0', slopeAcceleration: 0 },
    {
        id: 'sh7-mild-downhill',
        label: 'SH-7 mild downhill +3.987697',
        slopeAcceleration: 3.987697001312199,
    },
];

const tse1Baseline = JSON.parse(await readFile(tse1Path, 'utf8'));
const gearEnvelopeRows = buildGearEnvelopeRows();
const downshiftEnvelopeRows = buildDownshiftEnvelopeRows();
const downshiftProbeRows = buildDownshiftProbeRows();
const initialGearRows = buildInitialGearRows();
const rows = scenarios.map(simulateScenario);
const uphill = findRow('uphill');
const level = findRow('level');
const sh7 = findRow('sh7-mild-downhill');
const forceIdentityErrorMax = Math.max(...rows.map((row) => row.forceIdentityErrorMax));
const tse1TerminalDeltaKmhMax = Math.max(...rows.map((row) => Math.abs(
    row.terminal.speedKmh - findBaselineRow(row.id).terminal.speedKmh,
)));
const checks = [
    check(
        'allScenariosReachTerminalWindow',
        rows.every((row) => row.terminal.reached),
        true,
        rows.map(({ id, terminal }) => ({ id, reached: terminal.reached })),
    ),
    checkBetween('forceIdentityErrorMax', forceIdentityErrorMax, 0, 0.000001),
    checkBetween('tse1TerminalDeltaKmhMax', tse1TerminalDeltaKmhMax, 0, 0.001),
    check(
        'physicalInitialGearSelection',
        initialGearRows.every((row) => row.gear === row.expectedGear),
        initialGearRows.map(({ expectedGear, speedKmh }) => ({ expectedGear, speedKmh })),
        initialGearRows.map(({ gear, speedKmh }) => ({ gear, speedKmh })),
    ),
    check(
        'physicalInitialGearIgnoresLegacyEnvelope',
        findInitialGearRow(80).gear === 2 && findInitialGearRow(120).gear === 3,
        { '80kmh': 2, '120kmh': 3 },
        { '80kmh': findInitialGearRow(80).gear, '120kmh': findInitialGearRow(120).gear },
    ),
    check(
        'observedUpshiftsMatchPhysicalRpm',
        rows.every((row) => row.shifts.every((shift) => (
            shift.toGear > shift.fromGear &&
            Math.abs(shift.mechanicalRpm - profile.shiftUpRpm) <= 50
        ))),
        `all powered shifts are upward within 50rpm of ${profile.shiftUpRpm}`,
        rows.map(({ id, shifts }) => ({
            id,
            shifts: shifts.map(({ fromGear, mechanicalRpm, toGear }) => ({
                fromGear,
                mechanicalRpm,
                toGear,
            })),
        })),
    ),
    check(
        'physicalDownshiftTargetIdentity',
        downshiftEnvelopeRows.every((row) => (
            Math.abs(row.previousGearLandingRpm - profile.shiftDropRpm) <= 0.000001
        )),
        profile.shiftDropRpm,
        downshiftEnvelopeRows.map(({ gear, previousGearLandingRpm }) => ({
            gear,
            previousGearLandingRpm,
        })),
    ),
    check(
        'physicalDownshiftRuntimeBoundary',
        downshiftProbeRows.every((row) => (
            row.below.selectedGear === row.gear - 1 &&
            row.above.selectedGear === row.gear
        )),
        '50rpm below threshold downshifts once; 50rpm above holds current gear',
        downshiftProbeRows,
    ),
    check(
        'gearHysteresisSlopeOrderingReproduced',
        uphill.terminal.speedKmh > level.terminal.speedKmh &&
            uphill.terminal.gear === 3 &&
            level.terminal.gear === 4 &&
            level.terminal.speedKmh < sh7.terminal.speedKmh,
        'current baseline keeps uphill in 3rd above the level 4th-gear terminal',
        rows.map(({ id, terminal }) => ({
            gear: terminal.gear,
            id,
            speedKmh: terminal.speedKmh,
        })),
    ),
    checkBetween('levelTerminalBaselineKmh', level.terminal.speedKmh, 120, 135),
    checkBetween('sh7TerminalBaselineKmh', sh7.terminal.speedKmh, 135, 150),
    check(
        'levelAndSh7RemainFourthGear',
        level.terminal.gear === 4 && sh7.terminal.gear === 4,
        { level: 4, sh7: 4 },
        { level: level.terminal.gear, sh7: sh7.terminal.gear },
    ),
    check(
        'noScenarioUsesHardClamp',
        rows.every((row) => !row.hitHardClamp),
        false,
        rows.map(({ hitHardClamp, id }) => ({ hitHardClamp, id })),
    ),
    check(
        'straightHasNoCornerLoss',
        rows.every((row) => row.cornerLossMax <= 0.000001),
        0,
        rows.map(({ cornerLossMax, id }) => ({ cornerLossMax, id })),
    ),
    check(
        'fourthGearEnvelopeMismatchReproduced',
        findGearEnvelope(4).physicalShiftSpeedKmh - findGearEnvelope(4).declaredMaxSpeedKmh >= 35,
        'physical 7,400rpm speed exceeds declared max by >= 35km/h',
        findGearEnvelope(4),
    ),
];
const report = roundObject({
    checks,
    constants: {
        accelSpeed: config.accelSpeed,
        aeroDrag: config.aeroDrag,
        engineAcceleration: config.engineAcceleration,
        frameSeconds,
        maximumDurationSec,
        rollingResistance: config.rollingResistance,
        physicalDownshiftLandingRpm: profile.shiftDropRpm,
        sampleIntervalSec,
        terminalAcceleration,
        terminalSpeedDeltaKmh,
        terminalWindowSec,
    },
    findings: {
        fourthGearDeclaredMaxSpeedKmh: findGearEnvelope(4).declaredMaxSpeedKmh,
        fourthGearPhysicalShiftSpeedKmh: findGearEnvelope(4).physicalShiftSpeedKmh,
        levelTargetEquilibriumReached: level.terminal.speedKmh >= 223,
        levelTerminalGapTo225Kmh: 225 - level.terminal.speedKmh,
        slopeSpeedOrderingMonotonic:
            uphill.terminal.speedKmh < level.terminal.speedKmh &&
            level.terminal.speedKmh < sh7.terminal.speedKmh,
        sh7RuntimeComparisonKmh: {
            measured: 140.7,
            simulatedTerminal: sh7.terminal.speedKmh,
        },
        tse1TerminalDeltaKmhMax,
    },
    downshiftEnvelopeRows,
    downshiftProbeRows,
    gearEnvelopeRows,
    generatedAt: new Date().toISOString(),
    initialGearRows,
    pass: checks.every((entry) => entry.pass),
    rows,
    schemaVersion: 2,
    stage: 'TSE-2',
});

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`TSE-2 physical shift schedule: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
for (const row of report.rows) {
    console.log(
        `- ${row.id}: ${row.terminal.speedKmh}km/h, gear ${row.terminal.gear}, ` +
        `${row.terminal.rpm}rpm, ${row.terminal.timeSec}s`,
    );
}
for (const result of report.checks) {
    console.log(`- ${result.pass ? 'PASS' : 'FAIL'} ${result.id}`);
}

if (!report.pass) process.exitCode = 1;

function simulateScenario(scenario) {
    const player = createDefaultPlayerVehicleState(0, profile, config.accelSpeed);
    const samples = [];
    const shifts = [];
    const recent = [];
    let cornerLossMax = 0;
    let forceIdentityErrorMax = 0;
    let hitHardClamp = false;
    let terminal = null;

    for (let frame = 0; frame <= maximumDurationSec / frameSeconds; frame += 1) {
        const timeSec = frame * frameSeconds;
        const speedBefore = player.speed;
        const gearBefore = player.gearIndex;

        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: 0, slopeAcceleration: scenario.slopeAcceleration },
            config,
            frameSeconds,
        );

        const force = player.longitudinalForce;
        const measuredAcceleration = (player.speed - speedBefore) / frameSeconds;
        const wasClamped = player.speed >= config.accelSpeed - 0.000001;
        const identityError = wasClamped
            ? 0
            : Math.abs(measuredAcceleration - force.netAcceleration);
        const speedKmh = getDisplaySpeedKmh(player.speed, config.accelSpeed, profile);

        forceIdentityErrorMax = Math.max(forceIdentityErrorMax, identityError);
        cornerLossMax = Math.max(cornerLossMax, force.cornerLossForce);
        hitHardClamp ||= wasClamped;
        recent.push({ speedKmh, timeSec });
        while (recent.length > 1 && recent[0].timeSec < timeSec - terminalWindowSec) recent.shift();

        if (player.gearIndex !== gearBefore) {
            shifts.push({
                fromGear: gearBefore + 1,
                mechanicalRpm: getGearRpm(
                    profile,
                    gearBefore,
                    speedBefore / config.accelSpeed,
                ),
                speedKmh,
                timeSec,
                toGear: player.gearIndex + 1,
            });
        }

        if (frame % Math.round(sampleIntervalSec / frameSeconds) === 0) {
            samples.push(createSample(timeSec, player, force, recent));
        }

        const windowCovered = recent.length > 1 &&
            recent.at(-1).timeSec - recent[0].timeSec >= terminalWindowSec - frameSeconds * 1.5;
        const recentSpeedDeltaKmh = windowCovered
            ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
            : Number.POSITIVE_INFINITY;

        if (
            timeSec >= 30 &&
            windowCovered &&
            recentSpeedDeltaKmh <= terminalSpeedDeltaKmh &&
            Math.abs(force.netAcceleration) <= terminalAcceleration
        ) {
            terminal = createTerminal(timeSec, player, force, recentSpeedDeltaKmh);
            samples.push(createSample(timeSec, player, force, recent));
            break;
        }
    }

    if (!terminal) {
        const force = player.longitudinalForce;
        const recentSpeedDeltaKmh = recent.length > 1
            ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
            : null;
        terminal = {
            ...createTerminal(maximumDurationSec, player, force, recentSpeedDeltaKmh),
            reached: false,
        };
    }

    return {
        cornerLossMax,
        forceIdentityErrorMax,
        hitHardClamp,
        id: scenario.id,
        label: scenario.label,
        samples,
        shifts,
        slopeAcceleration: scenario.slopeAcceleration,
        terminal,
    };
}

function createSample(timeSec, player, force, recent) {
    return {
        force: {
            aeroDrag: force.aeroDrag,
            cornerLoss: force.cornerLossForce,
            drive: force.engineForce,
            engineBrake: force.engineBrakeForce,
            netAcceleration: force.netAcceleration,
            rollingResistance: force.rollingResistance,
            slope: force.slopeAcceleration,
        },
        gear: force.gearIndex + 1,
        mechanicalRpm: getGearRpm(profile, force.gearIndex, force.speedRatio),
        rpm: force.rpm,
        speedKmh: getDisplaySpeedKmh(player.speed, config.accelSpeed, profile),
        speedUnitPerSec: player.speed,
        timeSec,
        windowSpeedDeltaKmh: recent.length > 1
            ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
            : null,
    };
}

function createTerminal(timeSec, player, force, recentSpeedDeltaKmh) {
    return {
        force: {
            aeroDrag: force.aeroDrag,
            cornerLoss: force.cornerLossForce,
            drive: force.engineForce,
            engineBrake: force.engineBrakeForce,
            netAcceleration: force.netAcceleration,
            rollingResistance: force.rollingResistance,
            slope: force.slopeAcceleration,
        },
        gear: force.gearIndex + 1,
        mechanicalRpm: getGearRpm(profile, force.gearIndex, force.speedRatio),
        reached: true,
        recentSpeedDeltaKmh,
        rpm: force.rpm,
        speedKmh: getDisplaySpeedKmh(player.speed, config.accelSpeed, profile),
        speedUnitPerSec: player.speed,
        timeSec,
    };
}

function buildGearEnvelopeRows() {
    return profile.gears.map((gear, index) => ({
        declaredMaxSpeedKmh: gear.speedRatioMax * profile.displayTopSpeedKmh,
        gear: index + 1,
        physicalShiftSpeedKmh: getPhysicalSpeedAtRpm(index, profile.shiftUpRpm),
        shiftRpm: profile.shiftUpRpm,
    }));
}

function buildDownshiftEnvelopeRows() {
    return profile.gears.slice(1).map((_, offset) => {
        const gearIndex = offset + 1;
        const downshiftRpm = getPhysicalDownshiftRpm(profile, gearIndex);
        const currentRatio = profile.gearRatios[gearIndex];
        const previousRatio = profile.gearRatios[gearIndex - 1];

        return {
            downshiftRpm,
            downshiftSpeedKmh: getPhysicalSpeedAtRpm(gearIndex, downshiftRpm),
            gear: gearIndex + 1,
            previousGear: gearIndex,
            previousGearLandingRpm: downshiftRpm * previousRatio / currentRatio,
        };
    });
}

function buildInitialGearRows() {
    const expected = new Map([
        [60, 2],
        [80, 2],
        [100, 3],
        [120, 3],
        [150, 4],
        [180, 5],
        [225, 6],
    ]);

    return [...expected].map(([speedKmh, expectedGear]) => ({
        expectedGear,
        gear: getInitialGearIndex(profile, speedKmh / profile.displayTopSpeedKmh) + 1,
        speedKmh,
    }));
}

function buildDownshiftProbeRows() {
    return downshiftEnvelopeRows.map((row) => ({
        above: probeDownshift(row.gear, row.downshiftRpm + 50),
        below: probeDownshift(row.gear, row.downshiftRpm - 50),
        gear: row.gear,
        thresholdRpm: row.downshiftRpm,
    }));
}

function probeDownshift(gear, mechanicalRpm) {
    const gearIndex = gear - 1;
    const speedKmh = getPhysicalSpeedAtRpm(gearIndex, mechanicalRpm);
    const speed = speedKmh / profile.displayTopSpeedKmh * config.accelSpeed;
    const player = createDefaultPlayerVehicleState(speed, profile, config.accelSpeed);

    player.gearIndex = gearIndex;
    player.rpm = mechanicalRpm;
    updatePlayerVehicle(
        player,
        { accelPressed: false, brakePressed: false, steerAxis: 0 },
        { currentCurve: 0, slopeAcceleration: 0 },
        config,
        frameSeconds,
    );

    return {
        mechanicalRpm,
        selectedGear: player.gearIndex + 1,
        speedKmh,
    };
}

function getPhysicalSpeedAtRpm(gearIndex, rpm) {
    if (!profile.gearRatios || !profile.finalDriveRatio || !profile.tireCircumferenceM) {
        return null;
    }

    const wheelRpm = rpm / (profile.gearRatios[gearIndex] * profile.finalDriveRatio);
    return wheelRpm * profile.tireCircumferenceM / 60 * 3.6;
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul TSE-2 물리 변속·최고속 평형 기준선',
        '',
        `생성: ${result.generatedAt}`,
        '',
        `상태: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        'Physical drivetrain의 초기 기어, powered upshift, downshift hysteresis를 실제 gear RPM 하나로 통일한 뒤 경사별 terminal speed와 종방향 힘을 기록한다. PASS는 변속 기준 단일화와 TSE-1 평형 보존을 뜻하며 225km/h 최고속 승인을 의미하지 않는다.',
        '',
        '## Terminal equilibrium',
        '',
        '| scenario | slope | time | terminal km/h | unit/s | gear | RPM | drive | rolling | aero | net accel | 5s delta | clamp |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
        ...result.rows.map((row) => (
            `| ${row.id} | ${format(row.slopeAcceleration)} | ${format(row.terminal.timeSec)}s | ` +
            `${format(row.terminal.speedKmh)} | ${format(row.terminal.speedUnitPerSec)} | ` +
            `${row.terminal.gear} | ${format(row.terminal.rpm)} | ${format(row.terminal.force.drive)} | ` +
            `${format(row.terminal.force.rollingResistance)} | ${format(row.terminal.force.aeroDrag)} | ` +
            `${format(row.terminal.force.netAcceleration, 6)} | ${format(row.terminal.recentSpeedDeltaKmh, 6)} | ` +
            `${row.hitHardClamp ? 'yes' : 'no'} |`
        )),
        '',
        '## Physical shift envelope',
        '',
        '| gear | declared max km/h | physical 7,400rpm km/h | delta |',
        '| ---: | ---: | ---: | ---: |',
        ...result.gearEnvelopeRows.map((row) => (
            `| ${row.gear} | ${format(row.declaredMaxSpeedKmh)} | ` +
            `${format(row.physicalShiftSpeedKmh)} | ` +
            `${format(row.physicalShiftSpeedKmh - row.declaredMaxSpeedKmh)} |`
        )),
        '',
        '## Physical downshift envelope',
        '',
        `이전 단으로 내렸을 때 profile shift-drop target ${format(result.constants.physicalDownshiftLandingRpm)}rpm에 도달하도록 경계를 파생한다.`,
        '',
        '| current → previous | current RPM | speed km/h | previous gear landing RPM |',
        '| --- | ---: | ---: | ---: |',
        ...result.downshiftEnvelopeRows.map((row) => (
            `| ${row.gear}→${row.previousGear} | ${format(row.downshiftRpm)} | ` +
            `${format(row.downshiftSpeedKmh)} | ${format(row.previousGearLandingRpm)} |`
        )),
        '',
        'Runtime ±50rpm probe도 각 경계 아래에서 한 단만 내려가고 위에서는 현재 단을 유지해야 한다.',
        '',
        '## Initial physical gear selection',
        '',
        '| speed km/h | expected | selected |',
        '| ---: | ---: | ---: |',
        ...result.initialGearRows.map((row) => (
            `| ${row.speedKmh} | ${row.expectedGear} | ${row.gear} |`
        )),
        '',
        '## Observed shifts',
        '',
        ...result.rows.flatMap((row) => [
            `### ${row.id}`,
            '',
            '| shift | time | speed km/h | pre-shift mechanical RPM |',
            '| --- | ---: | ---: | ---: |',
            ...(row.shifts.length
                ? row.shifts.map((shift) => (
                    `| ${shift.fromGear}→${shift.toGear} | ${format(shift.timeSec)}s | ` +
                    `${format(shift.speedKmh)} | ${format(shift.mechanicalRpm)} |`
                ))
                : ['| - | - | - | - |']),
            '',
        ]),
        '## Findings',
        '',
        `- Level terminal: **${format(result.rows.find((row) => row.id === 'level').terminal.speedKmh)}km/h**`,
        `- Level gap to 225km/h: **${format(result.findings.levelTerminalGapTo225Kmh)}km/h**`,
        `- SH-7 measured/simulated: **${format(result.findings.sh7RuntimeComparisonKmh.measured)} / ${format(result.findings.sh7RuntimeComparisonKmh.simulatedTerminal)}km/h**`,
        `- 4th declared/physical shift boundary: **${format(result.findings.fourthGearDeclaredMaxSpeedKmh)} / ${format(result.findings.fourthGearPhysicalShiftSpeedKmh)}km/h**`,
        `- Level target equilibrium reached: **${result.findings.levelTargetEquilibriumReached ? 'yes' : 'no'}**`,
        `- Uphill < level < downhill monotonic relation: **${result.findings.slopeSpeedOrderingMonotonic ? 'yes' : 'no'}**`,
        `- TSE-1 terminal maximum delta: **${format(result.findings.tse1TerminalDeltaKmhMax, 6)}km/h**`,
        '- 현재 uphill은 3단에 남아 level의 4단 평형보다 빠르다. 변속 기준 중복은 제거됐지만 이 비단조 관계의 근본 원인은 고속 force budget이므로 TSE-3/TSE-4 대상으로 보존한다.',
        '',
        '## Invariant checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ` +
            `${formatValue(entry.target)} | ${formatValue(entry.value)} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function findRow(id) {
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing scenario ${id}`);
    return row;
}

function findGearEnvelope(gear) {
    const row = gearEnvelopeRows.find((entry) => entry.gear === gear);
    if (!row) throw new Error(`Missing gear envelope ${gear}`);
    return row;
}

function findInitialGearRow(speedKmh) {
    const row = initialGearRows.find((entry) => entry.speedKmh === speedKmh);
    if (!row) throw new Error(`Missing initial gear row ${speedKmh}`);
    return row;
}

function findBaselineRow(id) {
    const row = tse1Baseline.rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing TSE-1 baseline scenario ${id}`);
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
    return typeof value === 'number' && Number.isFinite(value) ? round(value, 8) : value;
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function format(value, digits = 3) {
    return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (typeof value === 'number') return format(value, 6);
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value).replaceAll('|', '\\|');
    return String(value).replaceAll('|', '\\|');
}

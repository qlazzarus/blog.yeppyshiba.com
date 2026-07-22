import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    getGearRpm,
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
const jsonPath = path.join(outputDir, 'top-speed-calibration-tse4.json');
const markdownPath = path.join(outputDir, 'top-speed-calibration-tse4.md');
const frameSeconds = 1 / 60;
const durationSec = 300;
const terminalWindowSec = 5;
const profile = RAVEN_COUPE_ENGINE_PROFILE;
const config = createPlayerControllerBaselineConfig();
const targetsKmh = [60, 100, 175.34, 212.687, 223];
const scenarios = [
    { id: 'uphill', label: 'uphill -10', slopeAcceleration: -10 },
    { id: 'level', label: 'level 0', slopeAcceleration: 0 },
    { id: 'sh7-mild-downhill', label: 'SH-7 mild downhill +3.987697', slopeAcceleration: 3.987697001312199 },
];

const rows = scenarios.map(simulateScenario);
const uphill = findRow('uphill');
const level = findRow('level');
const downhill = findRow('sh7-mild-downhill');
const forceBracket = [223, 224, 225].map(measureSteadyForce);
const force223 = forceBracket.find((row) => row.speedKmh === 223);
const force224 = forceBracket.find((row) => row.speedKmh === 224);
const force225 = forceBracket.find((row) => row.speedKmh === 225);
const checks = [
    between('level0to60Sec', level.hits['60']?.timeSec, 3.5, 5),
    between('level0to100Sec', level.hits['100']?.timeSec, 7.8, 8.3),
    equal('levelGearAt60', level.hits['60']?.gear, 2),
    equal('levelGearAt100', level.hits['100']?.gear, 3),
    check(
        'levelReachesFourthFifthSixth',
        [4, 5, 6].every((gear) => level.gearsVisited.includes(gear)),
        [4, 5, 6],
        level.gearsVisited,
    ),
    check(
        'levelHighGearShiftsUsePhysicalRpm',
        level.shifts
            .filter((shift) => shift.fromGear === 4 || shift.fromGear === 5)
            .every((shift) => Math.abs(shift.mechanicalRpm - profile.shiftUpRpm) <= 50) &&
            level.shifts.some((shift) => shift.fromGear === 4 && shift.toGear === 5) &&
            level.shifts.some((shift) => shift.fromGear === 5 && shift.toGear === 6),
        `4→5 and 5→6 within 50rpm of ${profile.shiftUpRpm}`,
        level.shifts.filter((shift) => shift.fromGear >= 4),
    ),
    between('levelTerminalKmh', level.end.speedKmh, 223, 225),
    equal('levelTerminalGear', level.end.gear, 6),
    check('levelAvoidsHardClamp', !level.hitHardClamp, false, level.hitHardClamp),
    between('levelFiveSecondDeltaKmh', level.end.windowSpeedDeltaKmh, 0, 0.02),
    between('levelNetAcceleration', Math.abs(level.end.force.netAcceleration), 0, 0.02),
    check(
        'selectedForceBrackets224',
        force223.force.netAcceleration > 0 &&
            Math.abs(force224.force.netAcceleration) <= 0.001 &&
            force225.force.netAcceleration < 0,
        'positive at 223, approximately zero at 224, negative at 225',
        forceBracket.map((row) => ({ netAcceleration: row.force.netAcceleration, speedKmh: row.speedKmh })),
    ),
    check(
        'slopeSpeedOrdering',
        uphill.end.speedKmh < level.end.speedKmh && level.end.speedKmh < downhill.end.speedKmh,
        'uphill < level < downhill',
        rows.map((row) => ({ id: row.id, speedKmh: row.end.speedKmh })),
    ),
    check(
        'onlyDownhillUsesSafetyCap',
        !uphill.hitHardClamp && !level.hitHardClamp && downhill.hitHardClamp,
        { downhill: true, level: false, uphill: false },
        Object.fromEntries(rows.map((row) => [row.id, row.hitHardClamp])),
    ),
    check(
        'levelSegmentTimesOrdered',
        targetsKmh.every((target) => Number.isFinite(level.hits[target]?.timeSec)) &&
            targetsKmh.every((target, index) => index === 0 || level.hits[target].timeSec > level.hits[targetsKmh[index - 1]].timeSec),
        targetsKmh,
        targetsKmh.map((target) => ({ speedKmh: target, timeSec: level.hits[target]?.timeSec ?? null })),
    ),
    between('forceIdentityErrorMax', Math.max(...rows.map((row) => row.forceIdentityErrorMax)), 0, 0.000001),
    check(
        'levelAvoidsFuelCut',
        level.end.mechanicalRpm < profile.redlineStartRpm,
        `< ${profile.redlineStartRpm} mechanical rpm`,
        level.end.mechanicalRpm,
    ),
];
const report = roundObject({
    checks,
    constants: {
        accelSpeed: config.accelSpeed,
        aeroDrag: config.aeroDrag,
        durationSec,
        engineAcceleration: config.engineAcceleration,
        frameSeconds,
        launchThrottleFullSpeedRatio: config.launchThrottleFullSpeedRatio,
        launchThrottleMinRatio: config.launchThrottleMinRatio,
        rollingResistance: config.rollingResistance,
    },
    decision: {
        downhillClampInterpretation: 'The level road must reach a force equilibrium without the hard cap. A positive SH-7 downhill slope may reach the 225km/h safety cap and is reported as safety-cap, not as equilibrium.',
        levelClassification: level.classification,
        selectedAeroDrag: config.aeroDrag,
        selectedLaunchThrottleFullSpeedRatio: config.launchThrottleFullSpeedRatio,
    },
    forceBracket,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    rows,
    schemaVersion: 1,
    stage: 'TSE-4',
});

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`TSE-4 top-speed calibration: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
for (const row of report.rows) {
    console.log(`- ${row.id}: ${row.end.speedKmh}km/h, gear ${row.end.gear}, ${row.classification}, clamp ${row.hitHardClamp}`);
}
for (const result of report.checks) console.log(`- ${result.pass ? 'PASS' : 'FAIL'} ${result.id}`);
if (!report.pass) process.exitCode = 1;

function simulateScenario(scenario) {
    const player = createDefaultPlayerVehicleState(0, profile, config.accelSpeed);
    const hits = {};
    const gearsVisited = new Set([player.gearIndex + 1]);
    const shifts = [];
    const recent = [];
    let forceIdentityErrorMax = 0;
    let hitHardClamp = false;

    for (let frame = 0; frame <= durationSec / frameSeconds; frame += 1) {
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

        const speedKmh = getDisplaySpeedKmh(player.speed, config.accelSpeed, profile);
        const clamped = player.speed >= config.accelSpeed - 0.000001;
        const measuredAcceleration = (player.speed - speedBefore) / frameSeconds;
        if (!clamped) {
            forceIdentityErrorMax = Math.max(
                forceIdentityErrorMax,
                Math.abs(measuredAcceleration - player.longitudinalForce.netAcceleration),
            );
        }
        hitHardClamp ||= clamped;
        gearsVisited.add(player.gearIndex + 1);
        for (const target of targetsKmh) {
            if (hits[target] === undefined && speedKmh >= target) {
                hits[target] = { gear: player.gearIndex + 1, timeSec };
            }
        }
        if (player.gearIndex !== gearBefore) {
            shifts.push({
                fromGear: gearBefore + 1,
                mechanicalRpm: getGearRpm(profile, gearBefore, speedBefore / config.accelSpeed),
                speedKmh,
                timeSec,
                toGear: player.gearIndex + 1,
            });
        }
        recent.push({ speedKmh, timeSec });
        while (recent.length > 1 && recent[0].timeSec < timeSec - terminalWindowSec) recent.shift();
    }

    const end = createSnapshot(player, recent);
    return {
        classification: hitHardClamp
            ? 'safety-cap'
            : Math.abs(end.force.netAcceleration) <= 0.02 && end.windowSpeedDeltaKmh <= 0.02
                ? 'force-equilibrium'
                : 'observed-at-300s',
        end,
        forceIdentityErrorMax,
        gearsVisited: [...gearsVisited],
        hitHardClamp,
        hits,
        id: scenario.id,
        label: scenario.label,
        segmentTimes: {
            '100-175.34': elapsed(hits, 100, 175.34),
            '175.34-212.687': elapsed(hits, 175.34, 212.687),
            '212.687-223': elapsed(hits, 212.687, 223),
        },
        shifts,
        slopeAcceleration: scenario.slopeAcceleration,
    };
}

function measureSteadyForce(speedKmh) {
    const speed = speedKmh / profile.displayTopSpeedKmh * config.accelSpeed;
    const player = createDefaultPlayerVehicleState(speed, profile, config.accelSpeed);
    for (let frame = 0; frame < 300; frame += 1) {
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
    return { force: copyForce(player.longitudinalForce), gear: player.gearIndex + 1, rpm: player.rpm, speedKmh };
}

function createSnapshot(player, recent) {
    return {
        force: copyForce(player.longitudinalForce),
        gear: player.gearIndex + 1,
        mechanicalRpm: getGearRpm(profile, player.gearIndex, player.speed / config.accelSpeed),
        rpm: player.rpm,
        speedKmh: getDisplaySpeedKmh(player.speed, config.accelSpeed, profile),
        speedUnitPerSec: player.speed,
        windowSpeedDeltaKmh: recent.length > 1
            ? Math.abs(recent.at(-1).speedKmh - recent[0].speedKmh)
            : null,
    };
}

function copyForce(force) {
    return {
        aeroDrag: force.aeroDrag,
        cornerLoss: force.cornerLossForce,
        drive: force.engineForce,
        engineBrake: force.engineBrakeForce,
        netAcceleration: force.netAcceleration,
        rollingResistance: force.rollingResistance,
        slope: force.slopeAcceleration,
    };
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul TSE-4 최고속 Calibration',
        '',
        `생성: ${result.generatedAt}`,
        '',
        `상태: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        'TSE-3에서 선택한 aero 계수와 launch 보정을 production에 적용하고, 저속 가속·물리 변속·평지 평형·경사 관계를 같은 controller로 검증한다.',
        '',
        '## Scenario result',
        '',
        '| scenario | slope | 300s km/h | gear | mechanical RPM | net | 5s delta | class | clamp |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
        ...result.rows.map((row) => `| ${row.id} | ${format(row.slopeAcceleration)} | ${format(row.end.speedKmh)} | ${row.end.gear} | ${format(row.end.mechanicalRpm)} | ${format(row.end.force.netAcceleration, 6)} | ${format(row.end.windowSpeedDeltaKmh, 6)} | ${row.classification} | ${row.hitHardClamp ? 'yes' : 'no'} |`),
        '',
        '## Level acceleration splits',
        '',
        '| 0-60 | 0-100 | 100-175.34 | 175.34-212.687 | 212.687-223 |',
        '| ---: | ---: | ---: | ---: | ---: |',
        `| ${format(level.hits['60']?.timeSec)}s | ${format(level.hits['100']?.timeSec)}s | ${format(level.segmentTimes['100-175.34'])}s | ${format(level.segmentTimes['175.34-212.687'])}s | ${format(level.segmentTimes['212.687-223'])}s |`,
        '',
        '## 223/224/225km/h force bracket',
        '',
        '| km/h | gear | RPM | drive | rolling | aero | net |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.forceBracket.map((row) => `| ${row.speedKmh} | ${row.gear} | ${format(row.rpm)} | ${format(row.force.drive)} | ${format(row.force.rollingResistance)} | ${format(row.force.aeroDrag)} | ${format(row.force.netAcceleration, 6)} |`),
        '',
        '## Decision',
        '',
        `- production aeroDrag: **${format(result.constants.aeroDrag, 12)}**`,
        `- launch full-speed ratio: **${format(result.constants.launchThrottleFullSpeedRatio)}**`,
        '- 평지는 hard clamp 없이 force equilibrium이어야 한다.',
        '- SH-7 내리막은 양의 경사 가속 때문에 225km/h safety cap에 닿을 수 있으며, 이 경우 평형으로 표기하지 않는다.',
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ${formatValue(entry.value)} |`),
        '',
    ];
    return `${lines.join('\n')}\n`;
}

function elapsed(hits, from, to) {
    return hits[from] && hits[to] ? hits[to].timeSec - hits[from].timeSec : null;
}

function findRow(id) {
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing scenario ${id}`);
    return row;
}

function check(id, pass, target, value) { return { id, pass, target, value }; }
function equal(id, value, expected) { return check(id, value === expected, expected, value); }
function between(id, value, min, max) {
    return check(id, Number.isFinite(value) && value >= min && value <= max, [min, max], value ?? null);
}
function roundObject(value) {
    if (Array.isArray(value)) return value.map(roundObject);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundObject(entry)]));
    return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(12)) : value;
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

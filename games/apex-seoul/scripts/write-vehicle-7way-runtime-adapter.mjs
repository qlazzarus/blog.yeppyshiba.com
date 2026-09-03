import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const LEGACY_FT86_ATLAS = path.join(
    projectRoot,
    'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json',
);
const REQUIRED_HEADLIGHT_FRAMES = [
    'center', 'steer-right-1', 'steer-right-2',
    'downhill-center', 'downhill-right-1', 'downhill-right-2',
    'uphill-center', 'uphill-right-1', 'uphill-right-2',
];
const RUNTIME_STEERING_STATES = [
    'center', 'steer-left-0', 'steer-left-1', 'steer-left-2',
    'steer-right-0', 'steer-right-1', 'steer-right-2',
];

const config = { vehicleIds: [] };
for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleIds.push(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : ['raven-coupe'];
for (const vehicleId of vehicleIds) await writeRuntimeAdapter(vehicleId);

async function writeRuntimeAdapter(vehicleId) {
    if (!/^[a-z0-9-]+$/.test(vehicleId)) throw new Error(`Invalid public vehicle id: ${vehicleId}`);
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const atlasPath = path.join(candidateDir, 'phaser-128.atlas.json');
    const shadowProfilePath = path.join(candidateDir, 'phaser-128/shadow-128.profile.json');
    const outputDir = path.join(candidateDir, 'runtime-128');
    const outputPath = path.join(outputDir, 'runtime-128.atlas.json');
    const qaPath = path.join(outputDir, 'runtime-128.qa.json');
    const [candidate, shadowProfile] = await Promise.all([readJson(atlasPath), readJson(shadowProfilePath)]);
    validateCandidate(candidate, shadowProfile, vehicleId);

    const headlightProfiles = await resolveHeadlightProfiles(vehicleId, candidate);
    const steeringStates = Object.fromEntries(
        RUNTIME_STEERING_STATES.map((id) => [id, candidate.apex.steeringStates[id]]),
    );
    const adapter = {
        apex: {
            ...candidate.apex,
            candidateOnly: true,
            headlightProfiles,
            runtimeAdapter: {
                contract: '7way-runtime-with-terrain-slight-fallback',
                note: 'Level driving selects seven steering states. Uphill/downhill have no slight art and deliberately fall back to their center frame.',
                source: vehicleId === 'raven-coupe'
                    ? 'FT86 legacy headlight profiles + Raven Coupe 128px shadow profile'
                    : 'vehicle-local runtime profile override',
            },
            shadowProfiles: shadowProfile.shadowProfiles,
            steeringStates,
        },
        frames: candidate.frames,
    };
    const qa = buildQa(adapter, candidate, vehicleId);
    if (!qa.pass) throw new Error(`${vehicleId}: runtime adapter QA failed`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(adapter, null, 2)}\n`);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    console.log(`7way runtime adapter ${vehicleId}: ${path.relative(projectRoot, outputPath)}`);
}

async function resolveHeadlightProfiles(vehicleId, candidate) {
    if (vehicleId !== 'raven-coupe') {
        throw new Error(`${vehicleId}: add a vehicle-local headlight profile override before runtime promotion`);
    }
    const legacy = await readJson(LEGACY_FT86_ATLAS);
    const profiles = structuredClone(legacy.apex.headlightProfiles);
    // The new slight pose is not selected by the existing controller yet, but
    // recording a deterministic interpolation avoids a second atlas format later.
    profiles['steer-right-0'] = interpolateProfile(profiles.center, profiles['steer-right-1'], 0.46);
    return profiles;
}

function validateCandidate(candidate, shadowProfile, vehicleId) {
    if (candidate.apex?.vehicleId !== vehicleId || candidate.apex?.targetCellSize !== 128 || !candidate.frames) {
        throw new Error(`${vehicleId}: invalid 128px candidate atlas`);
    }
    const missingSteering = RUNTIME_STEERING_STATES.filter((id) => !candidate.apex.steeringStates?.[id]);
    const missingShadow = Object.keys(candidate.frames).filter((id) => !shadowProfile.shadowProfiles?.[id]);
    if (missingSteering.length || missingShadow.length || !shadowProfile.shadowProfiles?.default) {
        throw new Error(`${vehicleId}: missing runtime entries (${[...missingSteering, ...missingShadow].join(', ')})`);
    }
}

function buildQa(adapter, candidate, vehicleId) {
    const missingFrames = Object.keys(candidate.frames).filter((id) => !adapter.apex.shadowProfiles[id]);
    const missingHeadlights = REQUIRED_HEADLIGHT_FRAMES.filter((id) => !adapter.apex.headlightProfiles[id]);
    const missingSteering = RUNTIME_STEERING_STATES.filter((id) => !adapter.apex.steeringStates[id]);
    return {
        vehicleId,
        generatedBy: 'write-vehicle-7way-runtime-adapter.mjs',
        checks: {
            candidateOnly: { pass: adapter.apex.candidateOnly === true },
            frameCount: { expected: 17, actual: Object.keys(adapter.frames).length, pass: Object.keys(adapter.frames).length === 17 },
            headlightProfiles: { missing: missingHeadlights, pass: missingHeadlights.length === 0 },
            runtimeSteering: { missing: missingSteering, pass: missingSteering.length === 0 },
            shadowProfiles: { missing: missingFrames, hasDefault: Boolean(adapter.apex.shadowProfiles.default), pass: missingFrames.length === 0 && Boolean(adapter.apex.shadowProfiles.default) },
        },
        pass: missingFrames.length === 0 && missingHeadlights.length === 0 && missingSteering.length === 0 && Boolean(adapter.apex.shadowProfiles.default),
    };
}

function interpolateProfile(from, to, ratio) {
    if (typeof from === 'number') return from + (to - from) * ratio;
    if (Array.isArray(from)) return from.map((value, index) => interpolateProfile(value, to[index], ratio));
    if (from && typeof from === 'object') {
        return Object.fromEntries(Object.keys(from).map((key) => [key, interpolateProfile(from[key], to[key], ratio)]));
    }
    return from;
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

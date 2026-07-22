export type EngineInduction = 'na' | 'single-turbo' | 'twin-turbo';

export type EngineTorquePoint = {
    rpm: number;
    torqueScale: number;
};

export type EngineGearProfile = {
    label: string;
    rpmMax: number;
    rpmMin: number;
    speedRatioMax: number;
    speedRatioMin: number;
};

export type EngineBoostProfile = {
    mainStartRpm?: number;
    peakEndRpm: number;
    peakStartRpm: number;
    startRpm: number;
};

export type VehicleEngineProfile = {
    accelerationScale: number;
    boost?: EngineBoostProfile;
    displayName: string;
    displayTopSpeedKmh: number;
    fuelCutReturnRpm: number;
    fuelCutStartRpm: number;
    gears: EngineGearProfile[];
    id: string;
    idleRpm: number;
    induction: EngineInduction;
    maxRpm: number;
    redlineStartRpm: number;
    shiftDropRpm: number;
    shiftUpRpm: number;
    torqueCurve: EngineTorquePoint[];
    drivetrainModel?: 'arcade' | 'physical';
    gearRatios?: number[];
    finalDriveRatio?: number;
    tireCircumferenceM?: number;
    drivetrainEfficiency?: number;
    drivetrainForceScale?: number;
};

export const RAVEN_COUPE_ENGINE_PROFILE: VehicleEngineProfile = {
    // Raven Coupe is the in-game name; the drivetrain references the Toyota GT86/FT86.
    accelerationScale: 1.34,
    displayName: 'Raven Coupe',
    // The physics envelope maps to the Raven/FT86 reference top-speed target;
    // handling still uses normalized world units internally.
    displayTopSpeedKmh: 225,
    drivetrainModel: 'physical',
    drivetrainEfficiency: 0.85,
    drivetrainForceScale: 0.50,
    finalDriveRatio: 4.1,
    fuelCutReturnRpm: 7350,
    fuelCutStartRpm: 7750,
    gears: [
        // FT86-inspired spacing: each full-throttle shift drops back into the
        // 5,400–5,800 rpm pull instead of exhausting 1st and 5th immediately.
        { label: '1', rpmMax: 7400, rpmMin: 1100, speedRatioMax: 0.201, speedRatioMin: 0 },
        { label: '2', rpmMax: 7400, rpmMin: 4400, speedRatioMax: 0.333, speedRatioMin: 0.201 },
        { label: '3', rpmMax: 7400, rpmMin: 5200, speedRatioMax: 0.473, speedRatioMin: 0.333 },
        { label: '4', rpmMax: 7400, rpmMin: 5800, speedRatioMax: 0.600, speedRatioMin: 0.473 },
        { label: '5', rpmMax: 7400, rpmMin: 6000, speedRatioMax: 0.728, speedRatioMin: 0.600 },
        { label: '6', rpmMax: 7800, rpmMin: 5100, speedRatioMax: 1, speedRatioMin: 0.728 },
    ],
    id: 'raven-coupe-na',
    idleRpm: 1100,
    induction: 'na',
    maxRpm: 7800,
    redlineStartRpm: 7200,
    shiftDropRpm: 5400,
    shiftUpRpm: 7400,
    torqueCurve: [
        { rpm: 1000, torqueScale: 0.25 },
        { rpm: 2500, torqueScale: 0.38 },
        { rpm: 3500, torqueScale: 0.52 },
        { rpm: 4300, torqueScale: 0.56 },
        { rpm: 5200, torqueScale: 0.82 },
        { rpm: 6000, torqueScale: 0.94 },
        { rpm: 6400, torqueScale: 1 },
        { rpm: 6600, torqueScale: 1 },
        { rpm: 7000, torqueScale: 0.96 },
        { rpm: 7400, torqueScale: 0.84 },
        { rpm: 7800, torqueScale: 0.68 },
    ],
    gearRatios: [3.626, 2.188, 1.541, 1.213, 1, 0.767],
    tireCircumferenceM: 1.964,
};

export const VORTEX_GT_ENGINE_PROFILE: VehicleEngineProfile = {
    accelerationScale: 1.05,
    boost: {
        mainStartRpm: 5600,
        peakEndRpm: 6500,
        peakStartRpm: 5800,
        startRpm: 3200,
    },
    displayName: 'Vortex GT',
    displayTopSpeedKmh: 230,
    fuelCutReturnRpm: 6500,
    fuelCutStartRpm: 7000,
    gears: [
        { label: '1', rpmMax: 6650, rpmMin: 950, speedRatioMax: 0.16, speedRatioMin: 0 },
        { label: '2', rpmMax: 6650, rpmMin: 3900, speedRatioMax: 0.3, speedRatioMin: 0.11 },
        { label: '3', rpmMax: 6650, rpmMin: 3900, speedRatioMax: 0.45, speedRatioMin: 0.24 },
        { label: '4', rpmMax: 6650, rpmMin: 3900, speedRatioMax: 0.61, speedRatioMin: 0.4 },
        { label: '5', rpmMax: 6650, rpmMin: 3900, speedRatioMax: 0.77, speedRatioMin: 0.56 },
        { label: '6', rpmMax: 6650, rpmMin: 3900, speedRatioMax: 0.9, speedRatioMin: 0.72 },
        { label: '7', rpmMax: 6500, rpmMin: 4000, speedRatioMax: 0.98, speedRatioMin: 0.86 },
        { label: '8', rpmMax: 6200, rpmMin: 4200, speedRatioMax: 1, speedRatioMin: 0.94 },
    ],
    id: 'vortex-gt-twin-turbo',
    idleRpm: 950,
    induction: 'twin-turbo',
    maxRpm: 7000,
    redlineStartRpm: 6500,
    shiftDropRpm: 4400,
    shiftUpRpm: 6650,
    torqueCurve: [
        { rpm: 1000, torqueScale: 0.32 },
        { rpm: 2400, torqueScale: 0.42 },
        { rpm: 3400, torqueScale: 0.62 },
        { rpm: 4600, torqueScale: 0.88 },
        { rpm: 5600, torqueScale: 1 },
        { rpm: 6400, torqueScale: 0.98 },
        { rpm: 7000, torqueScale: 0.72 },
    ],
};

export const APEX_S_ENGINE_PROFILE: VehicleEngineProfile = {
    accelerationScale: 1,
    boost: {
        peakEndRpm: 6500,
        peakStartRpm: 4400,
        startRpm: 3000,
    },
    displayName: 'Apex S',
    displayTopSpeedKmh: 215,
    fuelCutReturnRpm: 6650,
    fuelCutStartRpm: 7200,
    gears: [
        { label: '1', rpmMax: 6850, rpmMin: 1000, speedRatioMax: 0.17, speedRatioMin: 0 },
        { label: '2', rpmMax: 6850, rpmMin: 4600, speedRatioMax: 0.32, speedRatioMin: 0.13 },
        { label: '3', rpmMax: 6850, rpmMin: 4600, speedRatioMax: 0.5, speedRatioMin: 0.27 },
        { label: '4', rpmMax: 6850, rpmMin: 4600, speedRatioMax: 0.7, speedRatioMin: 0.43 },
        { label: '5', rpmMax: 6700, rpmMin: 4600, speedRatioMax: 0.88, speedRatioMin: 0.62 },
        { label: '6', rpmMax: 6500, rpmMin: 4400, speedRatioMax: 1, speedRatioMin: 0.8 },
    ],
    id: 'apex-s-single-turbo',
    idleRpm: 1000,
    induction: 'single-turbo',
    maxRpm: 7200,
    redlineStartRpm: 6700,
    shiftDropRpm: 4600,
    shiftUpRpm: 6850,
    torqueCurve: [
        { rpm: 1000, torqueScale: 0.3 },
        { rpm: 2400, torqueScale: 0.4 },
        { rpm: 3400, torqueScale: 0.72 },
        { rpm: 4600, torqueScale: 0.98 },
        { rpm: 5600, torqueScale: 1 },
        { rpm: 6500, torqueScale: 0.88 },
        { rpm: 7200, torqueScale: 0.7 },
    ],
};

export const VEHICLE_ENGINE_PROFILES = {
    apexS: APEX_S_ENGINE_PROFILE,
    ravenCoupe: RAVEN_COUPE_ENGINE_PROFILE,
    vortexGt: VORTEX_GT_ENGINE_PROFILE,
} as const;

export function getInitialGearIndex(profile: VehicleEngineProfile, speedRatio: number) {
    if (hasPhysicalDrivetrain(profile)) {
        const firstSustainableGear = profile.gears.findIndex(
            (_, gearIndex) => getGearRpm(profile, gearIndex, speedRatio) <= profile.shiftUpRpm,
        );

        return firstSustainableGear < 0 ? profile.gears.length - 1 : firstSustainableGear;
    }

    const exactGearIndex = profile.gears.findIndex(
        (gear) => speedRatio >= gear.speedRatioMin && speedRatio <= gear.speedRatioMax,
    );

    if (exactGearIndex >= 0) return exactGearIndex;

    const nextGearIndex = profile.gears.findIndex((gear) => speedRatio < gear.speedRatioMin);

    return nextGearIndex < 0 ? profile.gears.length - 1 : Math.max(0, nextGearIndex - 1);
}

export function getPhysicalDownshiftRpm(profile: VehicleEngineProfile, gearIndex: number) {
    if (!hasPhysicalDrivetrain(profile) || gearIndex <= 0) return profile.idleRpm;

    const currentGearIndex = clamp(Math.round(gearIndex), 1, profile.gearRatios.length - 1);
    const previousRatio = profile.gearRatios[currentGearIndex - 1];
    const currentRatio = profile.gearRatios[currentGearIndex];

    // Derive the current-gear threshold so a downshift lands the previous gear
    // at the profile's existing shiftDropRpm target. Adjacent physical ratios
    // provide hysteresis without consulting the legacy speed envelope.
    return Math.max(
        profile.idleRpm,
        profile.shiftDropRpm * currentRatio / previousRatio,
    );
}

export function getGearRpm(profile: VehicleEngineProfile, gearIndex: number, speedRatio: number) {
    const gear = profile.gears[clamp(Math.round(gearIndex), 0, profile.gears.length - 1)];

    if (profile.drivetrainModel === 'physical' && profile.gearRatios?.length && profile.finalDriveRatio && profile.tireCircumferenceM) {
        const speedKmh = clamp(speedRatio, 0, 1) * profile.displayTopSpeedKmh;
        const wheelRpm = (speedKmh / 3.6) / profile.tireCircumferenceM * 60;
        const ratio = profile.gearRatios[clamp(Math.round(gearIndex), 0, profile.gearRatios.length - 1)];

        return clamp(
            wheelRpm * ratio * profile.finalDriveRatio,
            profile.idleRpm,
            profile.maxRpm,
        );
    }

    const progress = gear.speedRatioMax <= gear.speedRatioMin
        ? 1
        : smoothstep(clamp(
            (speedRatio - gear.speedRatioMin) / (gear.speedRatioMax - gear.speedRatioMin),
            0,
            1,
        ));

    return lerp(gear.rpmMin, gear.rpmMax, progress);
}

function hasPhysicalDrivetrain(profile: VehicleEngineProfile): profile is VehicleEngineProfile & {
    finalDriveRatio: number;
    gearRatios: number[];
    tireCircumferenceM: number;
} {
    return profile.drivetrainModel === 'physical' &&
        Boolean(profile.gearRatios?.length && profile.finalDriveRatio && profile.tireCircumferenceM);
}

export function getTorqueScale(profile: VehicleEngineProfile, rpm: number) {
    const curve = profile.torqueCurve;

    if (rpm <= curve[0].rpm) return curve[0].torqueScale;

    for (let index = 1; index < curve.length; index += 1) {
        const previous = curve[index - 1];
        const next = curve[index];

        if (rpm <= next.rpm) {
            const progress = clamp((rpm - previous.rpm) / (next.rpm - previous.rpm), 0, 1);

            return lerp(previous.torqueScale, next.torqueScale, progress);
        }
    }

    return curve[curve.length - 1].torqueScale;
}

export function getBoostRatio(
    profile: VehicleEngineProfile,
    rpm: number,
    throttle: number,
    brake: number,
    cornerIntensity: number,
    speedRatio: number,
) {
    if (!profile.boost || throttle <= 0 || brake > 0) return 0;

    const boost = profile.boost;
    const spoolRatio = smoothstep(clamp(
        (rpm - boost.startRpm) / (boost.peakStartRpm - boost.startRpm),
        0,
        1,
    ));
    const redlineDecay = rpm > boost.peakEndRpm
        ? 1 - smoothstep(clamp(
            (rpm - boost.peakEndRpm) / (profile.fuelCutStartRpm - boost.peakEndRpm),
            0,
            1,
        )) * 0.28
        : 1;
    const cornerPenalty = lerp(1, profile.induction === 'single-turbo' ? 0.7 : 0.82, cornerIntensity);
    const speedLift = profile.induction === 'twin-turbo'
        ? lerp(0.82, 1.08, smoothstep(speedRatio))
        : lerp(0.9, 1.02, smoothstep(speedRatio));
    const mainBoostLift = boost.mainStartRpm && rpm >= boost.mainStartRpm ? 1.08 : 1;

    return clamp(spoolRatio * redlineDecay * cornerPenalty * speedLift * mainBoostLift, 0, 1);
}

export function getDisplaySpeedKmh(speed: number, accelSpeed: number, profile: VehicleEngineProfile) {
    const speedRatio = clamp(speed / accelSpeed, 0, 1);
    const displayRatio = profile.drivetrainModel === 'physical'
        ? speedRatio
        : smoothstep(speedRatio);

    return lerp(0, profile.displayTopSpeedKmh, displayRatio);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
    return start + (end - start) * amount;
}

function smoothstep(value: number) {
    return value * value * (3 - 2 * value);
}

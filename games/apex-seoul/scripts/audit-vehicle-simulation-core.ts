import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/core/engineProfile';
import {
    createDefaultPlayerVehicleState,
    stepVehicle,
    updatePlayerVehicle,
} from '../src/game/core/vehicleSimulation';
import { PLAYER_ACCEL_SPEED, createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';

const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), RAVEN_COUPE_ENGINE_PROFILE);
const input = { accelPressed: true, brakePressed: false, steerAxis: 0.58 };
const context = { currentCurve: 0.42, slopeAcceleration: 0 };
const initial = createDefaultPlayerVehicleState(430, RAVEN_COUPE_ENGINE_PROFILE, PLAYER_ACCEL_SPEED);
const stepped = stepVehicle(initial, input, context, config, 1 / 60);
const mutable = structuredClone(initial);
updatePlayerVehicle(mutable, input, context, config, 1 / 60);
const samples = [30, 60, 120].map((hz) => simulate(hz));
const speeds = samples.map((sample) => sample.speed);
const laterals = samples.map((sample) => sample.lateralOffset);
const checks = [
    check('stepVehicle-does-not-mutate-input', initial.speed === 430 && initial.lateralOffset === 0),
    check('stepVehicle-returns-detached-state', stepped !== initial && stepped.longitudinalForce !== initial.longitudinalForce),
    check('stepVehicle-preserves-controller-sequence', JSON.stringify(stepped) === JSON.stringify(mutable)),
    check('multi-rate-speed-contract', Math.max(...speeds) - Math.min(...speeds) <= 1.5),
    check('multi-rate-lateral-contract', Math.max(...laterals) - Math.min(...laterals) <= 2.5),
];
const failures = checks.filter((check) => !check.pass);

console.log(JSON.stringify({ checks, pass: failures.length === 0, samples }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function simulate(hz: number) {
    let state = createDefaultPlayerVehicleState(430, RAVEN_COUPE_ENGINE_PROFILE, PLAYER_ACCEL_SPEED);
    const seconds = 1 / hz;

    for (let tick = 0; tick < hz * 2; tick += 1) {
        state = stepVehicle(state, input, context, config, seconds);
    }

    return {
        driftState: state.driftState,
        gearIndex: state.gearIndex,
        hz,
        lateralOffset: Number(state.lateralOffset.toFixed(4)),
        speed: Number(state.speed.toFixed(4)),
    };
}

function check(id: string, pass: boolean) {
    return { id, pass };
}

import {
    MIRAE_GT_ENGINE_PROFILE,
    RAVEN_COUPE_ENGINE_PROFILE,
    SEORIN_GT_ENGINE_PROFILE,
    type VehicleEngineProfile,
} from './game/engineProfile';
import { getMusicAssetUrl, MUSIC_ASSETS, type MusicAsset } from './game/musicAssetManifest';
import './engine-sound-lab.css';

type VehicleId = 'raven' | 'seorin' | 'mirae';
type Voice = { gain: GainNode; oscillator: OscillatorNode };

type SoundDesign = {
    character: string;
    engineWave: OscillatorType;
    exhaustWave: OscillatorType;
    exhaustGain: number;
    fundamentalDivisor: number;
    profile: VehicleEngineProfile;
    turboGain: number;
    turboStartRpm: number;
};

const DESIGN: Record<VehicleId, SoundDesign> = {
    raven: {
        character: 'Naturally aspirated flat-four: a dry mechanical pulse that becomes urgent past 5,200 RPM. No turbo or blow-off valve.',
        engineWave: 'sawtooth', exhaustWave: 'triangle', exhaustGain: 0.24, fundamentalDivisor: 30,
        profile: RAVEN_COUPE_ENGINE_PROFILE, turboGain: 0, turboStartRpm: Infinity,
    },
    seorin: {
        character: 'Sequential twin-turbo: a composed six-cylinder core, early primary whistle, then a brighter second-stage surge around 3,900 RPM.',
        engineWave: 'triangle', exhaustWave: 'sawtooth', exhaustGain: 0.19, fundamentalDivisor: 20,
        profile: SEORIN_GT_ENGINE_PROFILE, turboGain: 0.16, turboStartRpm: 2100,
    },
    mirae: {
        character: 'Large single-turbo: a deeper four-cylinder rumble, delayed turbine climb and a pronounced pressure release after a high-load lift.',
        engineWave: 'square', exhaustWave: 'sawtooth', exhaustGain: 0.28, fundamentalDivisor: 30,
        profile: MIRAE_GT_ENGINE_PROFILE, turboGain: 0.22, turboStartRpm: 3000,
    },
};

const SFX = [
    ['Menu move', 'short amber tick'], ['Menu confirm', 'two-note confirmation'], ['Countdown', 'three beeps + start tone'],
    ['Tire scrub', 'cornering friction loop'], ['Guardrail contact', 'metal impact'], ['Off-road', 'rough gravel burst'],
    ['Checkpoint', 'pace marker cue'], ['Finish', 'time-attack result fanfare'], ['Record update', 'new personal-best sting'],
] as const;

const $ = <T extends Element>(selector: string) => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return element;
};

const startButton = $<HTMLButtonElement>('.sound-lab__start');
const rpmInput = $<HTMLInputElement>('#rpm');
const throttleInput = $<HTMLInputElement>('#throttle');
const rpmReadout = $<HTMLElement>('.sound-lab__rpm');
const boostReadout = $<HTMLElement>('.sound-lab__boost');
const eventReadout = $<HTMLElement>('.sound-lab__event');
const rpmOutput = $<HTMLOutputElement>('.sound-lab__rpm-output');
const throttleOutput = $<HTMLOutputElement>('.sound-lab__throttle-output');
const character = $<HTMLElement>('.sound-lab__character');
const sfxList = $<HTMLElement>('.sound-lab__sfx-list');
const musicList = $<HTMLElement>('.sound-lab__music-list');
const waveCanvas = $<HTMLCanvasElement>('.sound-lab__wave-canvas');
const waveStatus = $<HTMLElement>('.sound-lab__wave-status');
const waveContext = waveCanvas.getContext('2d');
if (!waveContext) throw new Error('Unable to create waveform canvas');

let vehicle: VehicleId = 'raven';
let audio: AudioContext | null = null;
let master: GainNode | null = null;
let voices: Voice[] = [];
let turboNoise: AudioBufferSourceNode | null = null;
let turboGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let actionTimer: number | null = null;
const musicPlayers = new Map<MusicAsset['id'], HTMLAudioElement>();
const availableMusic = new Set<MusicAsset['id']>();

function getRpm() { return Number(rpmInput.value); }
function getThrottle() { return Number(throttleInput.value) / 100; }
function current() { return DESIGN[vehicle]; }

function createVoice(context: AudioContext, waveform: OscillatorType, destination: AudioNode): Voice {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = waveform;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    return { gain, oscillator };
}

function createNoise(context: AudioContext, destination: AudioNode) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const values = buffer.getChannelData(0);
    for (let index = 0; index < values.length; index += 1) values[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(destination);
    source.start();
    return source;
}

function rebuildEngine() {
    if (!audio || !master) return;
    voices.forEach(({ oscillator }) => oscillator.stop());
    turboNoise?.stop();
    voices = [];
    turboNoise = null;
    turboGain = null;
    const engineBus = audio.createBiquadFilter();
    engineBus.type = 'lowpass';
    engineBus.frequency.value = 2200;
    engineBus.Q.value = 0.5;
    engineBus.connect(master);
    const design = current();
    voices = [
        createVoice(audio, design.engineWave, engineBus),
        createVoice(audio, design.exhaustWave, engineBus),
    ];
    const turboFilter = audio.createBiquadFilter();
    turboFilter.type = 'bandpass';
    turboFilter.Q.value = 1.3;
    turboGain = audio.createGain();
    turboGain.gain.value = 0;
    turboFilter.connect(turboGain).connect(master);
    turboNoise = createNoise(audio, turboFilter);
    updateSound();
}

async function enableAudio() {
    if (!audio) {
        audio = new AudioContext();
        master = audio.createGain();
        master.gain.value = 0.4;
        analyser = audio.createAnalyser();
        analyser.fftSize = 2048;
        master.connect(analyser).connect(audio.destination);
        rebuildEngine();
    }
    await audio.resume();
    startButton.textContent = 'AUDIO ENABLED';
    startButton.classList.add('is-active');
    waveStatus.textContent = 'LIVE';
}

function getBoost() {
    const design = current();
    if (!design.profile.boost) return 0;
    const rpmProgress = Math.max(0, Math.min(1, (getRpm() - design.turboStartRpm) / (design.profile.shiftUpRpm - design.turboStartRpm)));
    return rpmProgress * getThrottle();
}

function updateSound() {
    const design = current();
    const rpm = getRpm();
    const throttle = getThrottle();
    const boost = getBoost();
    const fundamental = Math.max(28, rpm / design.fundamentalDivisor);
    const now = audio?.currentTime ?? 0;
    if (audio) {
        voices[0]?.oscillator.frequency.setTargetAtTime(fundamental, now, 0.025);
        voices[0]?.gain.gain.setTargetAtTime(0.045 + throttle * 0.12, now, 0.03);
        voices[1]?.oscillator.frequency.setTargetAtTime(fundamental * 2.01, now, 0.025);
        voices[1]?.gain.gain.setTargetAtTime(design.exhaustGain * (0.3 + throttle * 0.7), now, 0.03);
        turboGain?.gain.setTargetAtTime(design.turboGain * boost, now, 0.04);
    }
    rpmReadout.textContent = rpm.toLocaleString('en-US');
    rpmOutput.value = `${rpm.toLocaleString('en-US')} RPM`;
    throttleOutput.value = `${Math.round(throttle * 100)}%`;
    boostReadout.textContent = design.profile.induction === 'na' ? 'N/A' : `${Math.round(boost * 100)}%`;
    character.textContent = design.character;
}

function oneShot(type: 'bov' | 'shift' | 'limiter' | 'sfx', variant = 0) {
    if (!audio || !master) return;
    const now = audio.currentTime;
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    filter.connect(gain).connect(master);
    if (type === 'bov') {
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(1800 + variant * 240, now); filter.Q.value = 1.2;
        const source = createNoise(audio, filter);
        gain.gain.setValueAtTime(0.001, now); gain.gain.exponentialRampToValueAtTime(0.2, now + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        source.stop(now + 0.4);
        return;
    }
    const oscillator = audio.createOscillator();
    oscillator.type = type === 'limiter' ? 'square' : 'triangle';
    oscillator.connect(filter);
    const frequency = type === 'shift' ? 140 : type === 'limiter' ? 92 : 420 + variant * 70;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (type === 'sfx') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.45, now + 0.09);
    filter.type = type === 'sfx' ? 'highpass' : 'lowpass'; filter.frequency.value = type === 'sfx' ? 350 : 1200;
    gain.gain.setValueAtTime(0.001, now); gain.gain.exponentialRampToValueAtTime(type === 'sfx' ? 0.09 : 0.13, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'limiter' ? 0.12 : 0.18));
    oscillator.start(now); oscillator.stop(now + 0.2);
}

function setEvent(label: string) { eventReadout.textContent = label; }

function stopMusic() {
    musicPlayers.forEach((player) => { player.pause(); player.currentTime = 0; });
}

async function playMusic(asset: MusicAsset) {
    const player = musicPlayers.get(asset.id) ?? new Audio(getMusicAssetUrl(asset));
    player.loop = asset.id !== 'result-sting';
    player.volume = asset.id === 'race-intensity' ? 0.38 : asset.id === 'race-accent' ? 0.24 : 0.72;
    musicPlayers.set(asset.id, player);
    await player.play();
    setEvent(asset.label.toUpperCase());
}

async function checkMusicAsset(asset: MusicAsset) {
    const item = document.createElement('article');
    item.className = 'sound-lab__music-item';
    item.dataset.status = 'checking';
    item.innerHTML = `<div><strong>${asset.label}</strong><span>${asset.fileName} · ${asset.role}</span></div><button type="button" disabled>CHECKING</button>`;
    musicList.append(item);
    const button = item.querySelector<HTMLButtonElement>('button');
    try {
        const response = await fetch(getMusicAssetUrl(asset), { cache: 'no-store', method: 'HEAD' });
        if (!response.ok) {
            item.dataset.status = 'missing';
            if (button) button.textContent = `NOT PREPARED (${response.status})`;
            return;
        }
        availableMusic.add(asset.id);
        item.dataset.status = 'ready';
        if (button) { button.disabled = false; button.textContent = 'PLAY'; button.addEventListener('click', () => void playMusic(asset)); }
    } catch {
        item.dataset.status = 'missing';
        if (button) button.textContent = 'CHECK FAILED';
    }
    const raceMixButton = document.querySelector<HTMLButtonElement>('[data-music-action="race-mix"]');
    if (raceMixButton) raceMixButton.disabled = !availableMusic.has('race-base') || !availableMusic.has('race-intensity');
}

function waveformColor() {
    if (vehicle === 'seorin') return '#7fd8ff';
    if (vehicle === 'mirae') return '#ff8ba5';
    return '#f4ba4b';
}

function drawWaveform() {
    const width = Math.max(1, Math.round(waveCanvas.clientWidth));
    const height = Math.max(1, Math.round(waveCanvas.clientHeight));
    const pixelRatio = window.devicePixelRatio || 1;
    if (waveCanvas.width !== width * pixelRatio || waveCanvas.height !== height * pixelRatio) {
        waveCanvas.width = width * pixelRatio;
        waveCanvas.height = height * pixelRatio;
    }
    waveContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    waveContext.fillStyle = '#050d17';
    waveContext.fillRect(0, 0, width, height);
    waveContext.strokeStyle = '#294558';
    waveContext.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) { waveContext.beginPath(); waveContext.moveTo(x, 0); waveContext.lineTo(x, height); waveContext.stroke(); }
    for (let y = 0; y <= height; y += 30) { waveContext.beginPath(); waveContext.moveTo(0, y); waveContext.lineTo(width, y); waveContext.stroke(); }
    const samples = new Uint8Array(analyser?.fftSize ?? 256);
    if (analyser) analyser.getByteTimeDomainData(samples);
    else samples.fill(128);
    waveContext.beginPath();
    samples.forEach((value, index) => {
        const x = index / (samples.length - 1) * width;
        const y = (value / 255) * height;
        if (index === 0) waveContext.moveTo(x, y); else waveContext.lineTo(x, y);
    });
    waveContext.strokeStyle = waveformColor();
    waveContext.shadowBlur = analyser ? 10 : 0;
    waveContext.shadowColor = waveformColor();
    waveContext.lineWidth = 2;
    waveContext.stroke();
    waveContext.shadowBlur = 0;
    window.requestAnimationFrame(drawWaveform);
}

function runSweep() {
    void enableAudio();
    if (actionTimer) window.clearInterval(actionTimer);
    let direction = 1;
    actionTimer = window.setInterval(() => {
        const next = getRpm() + direction * 130;
        if (next >= current().profile.shiftUpRpm) direction = -1;
        if (next <= current().profile.idleRpm) direction = 1;
        rpmInput.value = String(Math.max(current().profile.idleRpm, Math.min(current().profile.shiftUpRpm, next)));
        throttleInput.value = '100'; updateSound(); setEvent('FULL THROTTLE');
    }, 40);
}

document.querySelectorAll<HTMLButtonElement>('.sound-lab__vehicle').forEach((button) => {
    button.addEventListener('click', () => {
        vehicle = button.dataset.vehicle as VehicleId;
        document.querySelectorAll('.sound-lab__vehicle').forEach((item) => {
            item.classList.toggle('is-active', item === button);
            item.setAttribute('aria-checked', String(item === button));
        });
        rpmInput.max = String(current().profile.maxRpm);
        rpmInput.value = String(current().profile.idleRpm);
        throttleInput.value = '0'; setEvent('PROFILE LOADED'); rebuildEngine(); updateSound();
    });
});

startButton.addEventListener('click', () => void enableAudio());
rpmInput.addEventListener('input', () => { updateSound(); setEvent('ENGINE SPEED'); });
throttleInput.addEventListener('input', () => { updateSound(); setEvent('THROTTLE'); });
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'sweep') return runSweep();
    void enableAudio();
    if (action === 'shift') { oneShot('shift'); setEvent('UPSHIFT CUT'); }
    if (action === 'lift') { if (current().profile.induction !== 'na') oneShot('bov', vehicle === 'mirae' ? 2 : 0); setEvent(current().profile.induction === 'na' ? 'ENGINE BRAKE' : 'BLOW-OFF'); }
    if (action === 'limiter') { oneShot('limiter'); setEvent('FUEL CUT'); }
}));

SFX.forEach(([name, detail], index) => {
    const item = document.createElement('article');
    item.className = 'sound-lab__sfx-item';
    item.innerHTML = `<div><strong>${name}</strong><span>${detail}</span></div><button class="sound-lab__sfx-play" type="button">PLAY</button>`;
    item.querySelector('button')?.addEventListener('click', () => { void enableAudio(); oneShot('sfx', index); setEvent(name.toUpperCase()); });
    sfxList.append(item);
});

MUSIC_ASSETS.forEach((asset) => void checkMusicAsset(asset));
document.querySelector<HTMLButtonElement>('[data-music-action="stop"]')?.addEventListener('click', stopMusic);
document.querySelector<HTMLButtonElement>('[data-music-action="race-mix"]')?.addEventListener('click', () => {
    const base = MUSIC_ASSETS.find((asset) => asset.id === 'race-base');
    const intensity = MUSIC_ASSETS.find((asset) => asset.id === 'race-intensity');
    if (!base || !intensity) return;
    stopMusic();
    void Promise.all([playMusic(base), playMusic(intensity)]);
});

updateSound();
drawWaveform();

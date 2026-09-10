import Phaser from 'phaser';
import type { VehicleEngineProfile } from './engineProfile';
import { formatGameplayTime, type GameplayHudState } from './gameplayHudState';
import { RenderDepth } from './renderDepth';

const BLUE = 0x74ccff;
const AMBER = 0xffc469;
const RED = 0xff6274;
const START = Math.PI * 0.75;
const SWEEP = Math.PI * 1.5;

/** Static faces are drawn once; only needles and numeric readouts change per frame. */
class AnalogDial {
    readonly root: Phaser.GameObjects.Container;
    private needle: Phaser.GameObjects.Graphics;
    private value: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, radius: number, title: string, max: number,
        steps: number, color: number, redline = max, unit = '') {
        this.root = scene.add.container(x, 0);
        const face = scene.add.graphics();
        this.root.add(face);
        face.fillStyle(0x050e1c, 0.94).fillCircle(0, 0, radius + 7);
        face.lineStyle(1, 0x2c5270, 0.9).strokeCircle(0, 0, radius + 7);
        face.lineStyle(3, color, 0.45);
        face.beginPath();
        face.arc(0, 0, radius - 4, START, START + SWEEP, false);
        face.strokePath();
        if (redline < max) {
            face.lineStyle(5, RED, 0.95).beginPath();
            face.arc(0, 0, radius - 4, START + SWEEP * redline / max, START + SWEEP, false);
            face.strokePath();
        }
        for (let index = 0; index <= steps * 5; index += 1) {
            const ratio = index / (steps * 5);
            const angle = START + SWEEP * ratio;
            const major = index % 5 === 0;
            const outer = radius - 10;
            const inner = outer - (major ? 10 : 4);
            face.lineStyle(major ? 2 : 1, ratio * max >= redline ? RED : 0xafc5d5, major ? 1 : 0.5);
            face.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner,
                Math.cos(angle) * outer, Math.sin(angle) * outer);
            if (major) {
                const labelRadius = radius - 32;
                const label = scene.add.text(Math.cos(angle) * labelRadius, Math.sin(angle) * labelRadius,
                    `${Math.round(ratio * max)}`, { fontFamily: 'monospace', fontSize: '12px', color: '#dfedf5' }).setOrigin(0.5);
                this.root.add(label);
            }
        }
        this.root.add(scene.add.text(0, -radius - 23, title, {
            fontFamily: 'monospace', fontSize: '12px', color: '#d4e9f7', letterSpacing: 1,
        }).setOrigin(0.5));
        this.root.add(scene.add.text(0, 17, unit, {
            fontFamily: 'monospace', fontSize: '10px', color: '#8faabc',
        }).setOrigin(0.5));
        this.value = scene.add.text(0, radius - 7, '', {
            fontFamily: 'monospace', fontSize: '12px', color: '#eaf5ff',
            backgroundColor: '#081525', padding: { x: 6, y: 3 },
        }).setOrigin(0.5);
        this.needle = scene.add.graphics();
        this.root.add([this.needle, this.value]);
    }

    update(ratio: number, radius: number, color: number, value: string) {
        const angle = START + SWEEP * Phaser.Math.Clamp(ratio, 0, 1);
        const tip = radius - 17;
        const side = angle + Math.PI / 2;
        this.needle.clear().fillStyle(color, 1);
        this.needle.fillTriangle(Math.cos(angle) * tip, Math.sin(angle) * tip,
            Math.cos(side) * 3, Math.sin(side) * 3, -Math.cos(side) * 3, -Math.sin(side) * 3);
        this.needle.fillStyle(0xdcebf4).fillCircle(0, 0, 5);
        this.needle.fillStyle(0x132d43).fillCircle(0, 0, 2);
        this.value.setText(value);
    }
}

export class GameplayHud {
    private cluster: Phaser.GameObjects.Container;
    private top: Phaser.GameObjects.Container;
    private rpm: AnalogDial;
    private boosts: AnalogDial[] = [];
    private speed: Phaser.GameObjects.Text;
    private gear: Phaser.GameObjects.Text;
    private timer: Phaser.GameObjects.Text;
    private checkpoint: Phaser.GameObjects.Text;
    private status: Phaser.GameObjects.Text;
    private rpmMax: number;

    constructor(scene: Phaser.Scene, private profile: VehicleEngineProfile) {
        // All powertrain instruments share a bottom-right anchor. Keep RPM and
        // speed fixed when changing vehicles; optional boost dials grow upward.
        this.cluster = scene.add.container(0, 0).setDepth(RenderDepth.GameplayHud);
        this.top = scene.add.container(0, 0).setDepth(RenderDepth.GameplayHud);
        this.rpmMax = Math.ceil(profile.maxRpm / 1000) * 1000;
        this.rpm = new AnalogDial(scene, -86, 78, 'RPM', this.rpmMax / 1000,
            this.rpmMax / 1000, BLUE, profile.redlineStartRpm / 1000, '× 1000');
        this.rpm.root.y = -130;
        this.cluster.add(this.rpm.root);
        this.speed = scene.add.text(-168, -36, '000', {
            fontFamily: 'monospace', fontSize: '40px', fontStyle: 'bold', color: '#f1f8ff',
            stroke: '#06101e', strokeThickness: 5,
        });
        this.gear = scene.add.text(-44, -27, '', {
            fontFamily: 'monospace', fontSize: '23px', color: '#ffc469',
            backgroundColor: '#091929', padding: { x: 9, y: 5 },
        });
        this.cluster.add([this.speed, this.gear, scene.add.text(-91, -15, 'km/h', {
            fontFamily: 'monospace', fontSize: '12px', color: '#9db6c8',
        })]);
        const twin = profile.induction === 'twin-turbo';
        if (profile.induction !== 'na') {
            this.boosts = (twin ? ['TURBO 1', 'TURBO 2'] : ['TURBO BOOST']).map((label, index) => {
                // Keep the existing dial size: twins share one row above RPM,
                // with primary on the left and secondary aligned to RPM.
                const dial = new AnalogDial(scene, twin ? -218 + index * 132 : -86, 54, label, 100, 4,
                    index === 0 ? BLUE : AMBER, 100, '');
                dial.root.y = -310;
                this.cluster.add(dial.root);
                return dial;
            });
        }
        this.status = scene.add.text(-86, 10, '', {
            fontFamily: 'monospace', fontSize: '11px', color: '#ffc469',
            backgroundColor: '#081525', padding: { x: 6, y: 3 },
        }).setOrigin(0.5);
        this.cluster.add(this.status);
        this.timer = scene.add.text(0, 15, '', {
            fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: '#edf7ff',
            stroke: '#07101f', strokeThickness: 4,
        });
        this.checkpoint = scene.add.text(0, 53, '', {
            fontFamily: 'monospace', fontSize: '12px', color: '#a7c4d7',
            stroke: '#07101f', strokeThickness: 3,
        });
        this.top.add([scene.add.text(0, 0, 'TIME ATTACK', {
            fontFamily: 'monospace', fontSize: '11px', color: '#74ccff', letterSpacing: 2,
        }), this.timer, this.checkpoint]);
    }

    update(state: GameplayHudState, width: number, height: number, visible = true) {
        const scale = Math.min(1, width / 1000, height / 600);
        this.cluster.setPosition(width - 24 * scale, height - 72 * scale).setScale(scale).setVisible(visible);
        this.top.setPosition(32 * scale, 24 * scale).setScale(scale).setVisible(visible);
        this.rpm.update(state.rpm / this.rpmMax, 78,
            state.rpm >= this.profile.redlineStartRpm ? RED : BLUE, `${Math.round(state.rpm)} RPM`);
        this.speed.setText(`${Math.round(state.speedKmh)}`.padStart(3, '0'));
        this.gear.setText(state.gearLabel);
        this.timer.setText(formatGameplayTime(state.elapsedSec));
        this.checkpoint.setText(state.checkpointLabel);
        this.boosts.forEach((dial, index) => {
            const ratio = state.boostRatios[index] ?? 0;
            dial.update(ratio, 54, index === 0 ? BLUE : AMBER, `${Math.round(ratio * 100)}%`);
        });
        this.status.setText(state.fuelCutActive ? 'REV LIMIT' : this.profile.induction === 'na'
            ? (state.rpm >= this.profile.shiftDropRpm ? 'NA · HIGH REV' : 'NA')
            : this.profile.induction === 'twin-turbo' ? 'TWIN TURBO' : 'SINGLE TURBO');
    }

    destroy() {
        this.cluster.destroy();
        this.top.destroy();
    }
}

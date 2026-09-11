import Phaser from 'phaser';
import { runRecordStore } from './runRecord';
import { RECORD_RULESET, SAVE_COURSES, SAVE_VEHICLES } from './saveDefaults';
import { UI_THEME } from './uiTheme';

const time = (value: number | undefined) => value === undefined ? 'NO RECORD' : `${Math.floor(value / 60)}:${(value % 60).toFixed(2).padStart(5, '0')}`;

export class RecordsScene extends Phaser.Scene {
    constructor() { super('records'); }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        let courseIndex = 0;
        let vehicleIndex = 0;
        const text = (y: number, label: string, size = 16) => this.add.text(width / 2, y, label, {
            color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: `${size}px`, align: 'center',
        }).setOrigin(0.5);
        text(35, 'LOCAL RECORDS', 26);
        const courseLabel = text(80, '', 16).setInteractive({ useHandCursor: true });
        const vehicleLabels = SAVE_VEHICLES.map((_id, index) => text(132 + index * 43, '', width < 680 ? 12 : 16)
            .setInteractive({ useHandCursor: true }).on('pointerup', () => { vehicleIndex = index; render(); }));
        const detail = text(330, '', 12);
        const footer = text(height - 64, '', 11);
        const render = () => {
            const course = SAVE_COURSES[courseIndex];
            courseLabel.setText(`‹ ${course.name.toUpperCase()} ›`);
            vehicleLabels.forEach((label, index) => {
                const bucket = runRecordStore.getBucket(course.id, SAVE_VEHICLES[index]);
                label.setText(`${index === vehicleIndex ? '›' : ' '} ${SAVE_VEHICLES[index].toUpperCase()}  ${time(bucket.bestRun?.finishTimeSec)}  (${bucket.completedRunCount} RUNS)`)
                    .setColor(index === vehicleIndex ? UI_THEME.amberHex : UI_THEME.textMainHex);
            });
            const bucket = runRecordStore.getBucket(course.id, SAVE_VEHICLES[vehicleIndex]);
            const references = runRecordStore.getReferenceRecords().filter(r => r.trackId === course.id && r.vehicleId === SAVE_VEHICLES[vehicleIndex] && r.rulesetVersion === RECORD_RULESET);
            detail.setText([
                `RECENT FINISHES (${bucket.recentRuns.length}/20)`,
                ...bucket.recentRuns.slice(0, 5).map(r => `${r.finishedAt.slice(0, 10)}  ${time(r.finishTimeSec)}  ${r.vehicleColor}`),
                ...(bucket.recentRuns.length ? [] : ['NO FINISHED RUNS YET']),
                ...references.slice(0, 1).map(r => `REFERENCE TARGET  ${time(r.finishTimeSec)}`),
            ].join('\n'));
            const data = runRecordStore.getRecords();
            footer.setText(data.legacy.length ? `LEGACY (UNKNOWN VEHICLE): ${data.legacy.map(r => time(r.timeSec)).join(' / ')}` : 'Saved in this browser · ↑↓ vehicle · ←→ course');
        };
        const changeCourse = (delta: number) => { courseIndex = Phaser.Math.Wrap(courseIndex + delta, 0, SAVE_COURSES.length); render(); };
        courseLabel.on('pointerup', () => changeCourse(1));
        text(height - 28, '‹ BACK TO MENU', 16).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('main'));
        this.input.keyboard?.on('keydown-LEFT', () => changeCourse(-1));
        this.input.keyboard?.on('keydown-RIGHT', () => changeCourse(1));
        this.input.keyboard?.on('keydown-UP', () => { vehicleIndex = Phaser.Math.Wrap(vehicleIndex - 1, 0, SAVE_VEHICLES.length); render(); });
        this.input.keyboard?.on('keydown-DOWN', () => { vehicleIndex = Phaser.Math.Wrap(vehicleIndex + 1, 0, SAVE_VEHICLES.length); render(); });
        this.input.keyboard?.on('keydown-ESC', () => this.scene.start('main'));
        render();
    }
}

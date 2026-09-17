import Phaser from 'phaser';
import { runRecordStore } from './runRecord';
import { DEFAULT_PLAYER_NAME, SAVE_COLORS, SAVE_COURSES } from './saveDefaults';
import { compareBestRuns, currentBuckets } from './runComparison';
import { formatGameplayTime } from './gameplayHudState';
import { UI_THEME } from './uiTheme';

// Production sheets share frame 6 (spin-front-right-1); mirror it for a front-left portrait.
const RECORD_VEHICLE_FRAME = 6;

export class RecordsScene extends Phaser.Scene {
    constructor() { super('records'); }

    create() {
        const { width, height } = this.scale;
        const course = SAVE_COURSES.find(c => c.id === runRecordStore.getSetup().trackId) ?? SAVE_COURSES[0];
        const runs = [...new Map(currentBuckets(runRecordStore.getRecords().buckets, course.id)
            .flatMap(b => b.recentRuns).map(run => [run.runId, run])).values()]
            .sort(compareBestRuns);
        const compact = width < 680;
        const left = Math.max(24, (width - 760) / 2);
        const right = width - left;
        const columnX = [left, left + (right - left) * 0.58, right];
        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        const text = (x: number, y: number, label: string, size = 16, origin = 0.5) => this.add.text(x, y, label, {
            color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: `${size}px`,
        }).setOrigin(origin, 0.5);
        text(width / 2, 36, 'LOCAL RECORDS', 26);
        text(width / 2, 76, course.name.toUpperCase(), compact ? 12 : 16);
        text(width / 2, 110, 'FASTEST TIMES FIRST', 11).setColor(UI_THEME.secondaryTextHex);
        ['VEHICLE', 'TIME', 'NAME'].forEach((label, i) =>
            text(columnX[i], 158, label, 12, i === 0 ? 0 : i === 2 ? 1 : 0.5).setColor(UI_THEME.amberHex));
        const rowHeight = compact ? 48 : 58;
        const visibleRowCount = Math.max(1, Math.floor((height - 214) / rowHeight));
        let scrollIndex = 0;
        const rows = Array.from({ length: visibleRowCount }, (_, i) => {
            const y = 200 + i * rowHeight;
            // Frames include transparent padding; this scale keeps the visible body inside its row.
            const size = Math.min(154, rowHeight * 2.45);
            const vehicle = this.add.image(columnX[0] + (compact ? 48 : 64), y,
                'player-vehicle-raven-coupe-blue', RECORD_VEHICLE_FRAME)
                .setOrigin(0.5, 0.55).setFlipX(true).setDisplaySize(size, size)
                .setName(`record-vehicle-${i}`).setVisible(false);
            return {
                vehicle,
                time: text(columnX[1], y, '', compact ? 12 : 18),
                name: text(columnX[2], y, '', compact ? 12 : 18, 1),
            };
        });
        const empty = text(width / 2, 240, 'NO RECORD', 16).setVisible(runs.length === 0);
        const render = () => {
            rows.forEach((row, index) => {
                const run = runs[scrollIndex + index];
                row.vehicle.setVisible(Boolean(run));
                row.time.setText(run ? formatGameplayTime(run.finishTimeSec) : '');
                row.name.setText(run ? run.playerName ?? DEFAULT_PLAYER_NAME : '');
                if (run) {
                    const color = SAVE_COLORS.some(color => color === run.vehicleColor) ? run.vehicleColor : 'blue';
                    row.vehicle.setTexture(`player-vehicle-${run.vehicleId}-${color}`, RECORD_VEHICLE_FRAME);
                }
            });
            empty.setVisible(runs.length === 0);
        };
        const onWheel = (_pointer: Phaser.Input.Pointer, _currentlyOver: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const nextIndex = Phaser.Math.Clamp(scrollIndex + Math.sign(deltaY), 0, Math.max(0, runs.length - visibleRowCount));
            if (nextIndex !== scrollIndex) { scrollIndex = nextIndex; render(); }
        };
        const returnToMain = () => this.scene.start('main');
        this.input.on('wheel', onWheel);
        this.input.keyboard?.once('keydown', returnToMain);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off('wheel', onWheel);
            this.input.keyboard?.off('keydown', returnToMain);
        });
        render();
    }
}

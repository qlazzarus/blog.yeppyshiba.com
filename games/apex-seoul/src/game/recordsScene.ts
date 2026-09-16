import Phaser from 'phaser';
import { runRecordStore } from './runRecord';
import { DEFAULT_PLAYER_NAME, SAVE_COLORS, SAVE_COURSES } from './saveDefaults';
import { currentBuckets } from './runComparison';
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
            .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt) || a.runId.localeCompare(b.runId));
        let page = 0;
        const pages = Math.max(1, Math.ceil(runs.length / 5));
        const compact = width < 680;
        const left = Math.max(24, (width - 760) / 2);
        const right = width - left;
        const columnX = [left, left + (right - left) * 0.58, right];
        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        const text = (x: number, y: number, label: string, size = 16, origin = 0.5) => this.add.text(x, y, label, {
            color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: `${size}px`,
        }).setOrigin(origin, 0.5);
        const button = (x: number, y: number, label: string, action: () => void) => text(x, y, label, compact ? 12 : 16)
            .setPadding(10).setInteractive({ useHandCursor: true }).on('pointerup', action);
        text(width / 2, 36, 'LOCAL RECORDS', 26);
        text(width / 2, 76, course.name.toUpperCase(), compact ? 12 : 16);
        text(width / 2, 110, 'LATEST FINISHES FIRST', 11).setColor(UI_THEME.secondaryTextHex);
        ['VEHICLE', 'TIME', 'NAME'].forEach((label, i) =>
            text(columnX[i], 158, label, 12, i === 0 ? 0 : i === 2 ? 1 : 0.5).setColor(UI_THEME.amberHex));
        const rowHeight = Math.min(66, (height - 310) / 5);
        const rows = Array.from({ length: 5 }, (_, i) => {
            const y = 200 + i * rowHeight;
            // Frames include transparent padding; this scale keeps the visible body inside its row.
            const size = Math.min(176, rowHeight * 2.6);
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
        const pageLabel = text(width / 2, height - 110, '', 12);
        const previous = button(width * 0.25, height - 110, '‹ PREV', () => changePage(-1));
        const next = button(width * 0.75, height - 110, 'NEXT ›', () => changePage(1));
        text(width / 2, height - 72, '← → / PgUp PgDn', 10).setColor(UI_THEME.secondaryTextHex);
        button(width / 2, height - 30, '‹ BACK TO MENU', () => this.scene.start('main'));
        const render = () => {
            rows.forEach((row, index) => {
                const run = runs[page * 5 + index];
                row.vehicle.setVisible(Boolean(run));
                row.time.setText(run ? formatGameplayTime(run.finishTimeSec) : '');
                row.name.setText(run ? run.playerName ?? DEFAULT_PLAYER_NAME : '');
                if (run) {
                    const color = SAVE_COLORS.some(color => color === run.vehicleColor) ? run.vehicleColor : 'blue';
                    row.vehicle.setTexture(`player-vehicle-${run.vehicleId}-${color}`, RECORD_VEHICLE_FRAME);
                }
            });
            empty.setVisible(runs.length === 0);
            pageLabel.setText(`${page + 1} / ${pages}`);
            previous.setAlpha(page > 0 ? 1 : 0.35);
            next.setAlpha(page + 1 < pages ? 1 : 0.35);
        };
        const changePage = (delta: number) => { page = Phaser.Math.Clamp(page + delta, 0, pages - 1); render(); };
        const bindings: Record<string, () => void> = {
            LEFT: () => changePage(-1), RIGHT: () => changePage(1),
            PAGE_UP: () => changePage(-1), PAGE_DOWN: () => changePage(1), ESC: () => this.scene.start('main'),
        };
        for (const [key, handler] of Object.entries(bindings)) this.input.keyboard?.on(`keydown-${key}`, handler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [key, handler] of Object.entries(bindings)) this.input.keyboard?.off(`keydown-${key}`, handler);
        });
        render();
    }
}

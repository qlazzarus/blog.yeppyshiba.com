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
        const graphics = this.add.graphics();
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.82).fillRect(0, 0, width, 126);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 124, width, 124);
        const text = (x: number, y: number, label: string, size = 16, origin = 0.5) => this.add.text(x, y, label, {
            color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: `${size}px`,
        }).setOrigin(origin, 0.5);
        this.add.text(width / 2, 36, 'LOCAL RECORDS', {
            color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif',
            fontSize: compact ? '28px' : '34px', fontStyle: 'bold italic', letterSpacing: 2,
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);
        text(width / 2, 78, course.name.toUpperCase(), compact ? 11 : 13).setColor(UI_THEME.amberHighlightHex);
        text(width / 2, 104, 'FASTEST TIMES FIRST', 10).setColor(UI_THEME.secondaryTextHex);
        ['VEHICLE', 'TIME', 'NAME'].forEach((label, i) =>
            text(columnX[i], 158, label, 12, i === 0 ? 0 : i === 2 ? 1 : 0.5).setColor(UI_THEME.amberHex));
        const rowHeight = compact ? 48 : 58;
        const visibleRowCount = Math.max(1, Math.floor((height - 214) / rowHeight));
        let scrollIndex = 0;
        let dragPointerId: number | null = null;
        let dragLastY = 0;
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
        const scroll = (direction: number) => {
            const nextIndex = Phaser.Math.Clamp(scrollIndex + Math.sign(direction), 0, Math.max(0, runs.length - visibleRowCount));
            if (nextIndex !== scrollIndex) { scrollIndex = nextIndex; render(); }
        };
        const onWheel = (_pointer: Phaser.Input.Pointer, _currentlyOver: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => scroll(deltaY);
        const returnToMain = () => this.scene.start('main');
        const back = this.add.rectangle(width / 2, height - 26, 190, 30, UI_THEME.panel)
            .setStrokeStyle(1, UI_THEME.borderMuted).setInteractive({ useHandCursor: true });
        const backLabel = this.add.text(width / 2, height - 26, '‹  BACK TO MENU', {
            color: UI_THEME.menuTextHex, fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
        }).setOrigin(0.5);
        back.on('pointerover', () => {
            back.setFillStyle(UI_THEME.amber).setStrokeStyle(1, UI_THEME.amberHighlight);
            backLabel.setColor(UI_THEME.menuSelectedTextHex);
        });
        back.on('pointerout', () => {
            back.setFillStyle(UI_THEME.panel).setStrokeStyle(1, UI_THEME.borderMuted);
            backLabel.setColor(UI_THEME.menuTextHex);
        });
        back.on('pointerup', returnToMain);
        const onPointerDown = (pointer: Phaser.Input.Pointer) => {
            if (pointer.y < 132 || pointer.y > height - 58) return;
            dragPointerId = pointer.id;
            dragLastY = pointer.y;
        };
        const onPointerMove = (pointer: Phaser.Input.Pointer) => {
            if (dragPointerId !== pointer.id) return;
            const distance = dragLastY - pointer.y;
            if (Math.abs(distance) < rowHeight) return;
            scroll(distance);
            dragLastY = pointer.y;
        };
        const onPointerEnd = (pointer: Phaser.Input.Pointer) => {
            if (dragPointerId !== pointer.id) return;
            if (Math.abs(dragLastY - pointer.y) >= rowHeight / 3)
                scroll(dragLastY - pointer.y);
            dragPointerId = null;
        };
        this.input.on('wheel', onWheel);
        this.input.on('pointerdown', onPointerDown);
        this.input.on('pointermove', onPointerMove);
        this.input.on('pointerup', onPointerEnd);
        this.input.on('pointerupoutside', onPointerEnd);
        this.input.keyboard?.once('keydown', returnToMain);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off('wheel', onWheel);
            this.input.off('pointerdown', onPointerDown);
            this.input.off('pointermove', onPointerMove);
            this.input.off('pointerup', onPointerEnd);
            this.input.off('pointerupoutside', onPointerEnd);
            this.input.keyboard?.off('keydown', returnToMain);
        });
        render();
    }
}

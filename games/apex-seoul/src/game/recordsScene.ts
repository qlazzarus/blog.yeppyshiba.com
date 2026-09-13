import Phaser from 'phaser';
import { runRecordStore } from './runRecord';
import { RECORD_RULESET, SAVE_COURSES, SAVE_VEHICLES } from './saveDefaults';
import { compareBestRuns, currentBuckets } from './runComparison';
import { UI_THEME } from './uiTheme';

const time = (value: number | undefined) => value === undefined ? 'NO RECORD' : `${Math.floor(value / 60)}:${(value % 60).toFixed(2).padStart(5, '0')}`;

export class RecordsScene extends Phaser.Scene {
    constructor() { super('records'); }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        let courseIndex = 0;
        let vehicleIndex = Math.max(0, SAVE_VEHICLES.findIndex(v => v === runRecordStore.getSetup().vehicleId));
        let scope: 'all' | 'vehicle' = 'all';
        let list: 'best' | 'recent' = 'best';
        let page = 0;
        let pages = 1;
        const compact = width < 680;
        const text = (y: number, label: string, size = 16) => this.add.text(width / 2, y, label, {
            color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: `${size}px`, align: 'center',
        }).setOrigin(0.5);
        const button = (x: number, y: number, label: string, action: () => void) => text(y, label, compact ? 12 : 16)
            .setX(x).setPadding(8).setInteractive({ useHandCursor: true }).on('pointerup', action);
        text(30, 'LOCAL RECORDS', 24);
        const courseLabel = button(width / 2, 66, '', () => changeCourse(1));
        const allTab = button(width * 0.32, 104, 'ALL VEHICLES', () => { scope = 'all'; page = 0; render(); });
        const carTab = button(width * 0.68, 104, 'BY VEHICLE', () => { scope = 'vehicle'; page = 0; render(); });
        const vehicleLabel = button(width / 2, 142, '', () => changeVehicle(1));
        const bestTab = button(width * 0.35, 182, 'BEST', () => { list = 'best'; page = 0; render(); });
        const recentTab = button(width * 0.65, 182, 'RECENT', () => { list = 'recent'; page = 0; render(); });
        const summary = text(222, '', compact ? 11 : 14);
        const rowTop = 260;
        const rowBottom = Math.max(rowTop + 100, height - 154);
        const rows = Array.from({ length: 5 }, (_, i) => text(rowTop + i * (rowBottom - rowTop) / 5, '', compact ? 10 : 13));
        const pageLabel = text(height - 122, '', 12);
        button(width * 0.2, height - 122, '‹ PREV', () => changePage(-1));
        button(width * 0.8, height - 122, 'NEXT ›', () => changePage(1));
        const footer = text(height - 85, '', compact ? 9 : 11);
        text(height - 55, 'Tab: scope · B: best/recent · ↑↓: car · ←→: course · PgUp/PgDn', compact ? 8 : 10);
        button(width / 2, height - 24, '‹ BACK TO MENU', () => this.scene.start('main'));
        const render = () => {
            const course = SAVE_COURSES[courseIndex];
            const buckets = currentBuckets(runRecordStore.getRecords().buckets, course.id)
                .filter(b => scope === 'all' || b.vehicleId === SAVE_VEHICLES[vehicleIndex]);
            const best = buckets.flatMap(b => b.bestRun ? [b.bestRun] : []).sort(compareBestRuns);
            const recent = [...new Map(buckets.flatMap(b => b.recentRuns).map(r => [r.runId, r])).values()]
                .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt) || a.runId.localeCompare(b.runId));
            const runs = list === 'best' ? best : recent;
            pages = Math.max(1, Math.ceil(runs.length / 5));
            page = Math.min(page, pages - 1);
            courseLabel.setText(`‹ ${course.name.toUpperCase()} ›`);
            allTab.setColor(scope === 'all' ? UI_THEME.amberHex : UI_THEME.textMainHex);
            carTab.setColor(scope === 'vehicle' ? UI_THEME.amberHex : UI_THEME.textMainHex);
            bestTab.setColor(list === 'best' ? UI_THEME.amberHex : UI_THEME.textMainHex);
            recentTab.setColor(list === 'recent' ? UI_THEME.amberHex : UI_THEME.textMainHex);
            vehicleLabel.setText(scope === 'all' ? 'ALL CARS · THIS BROWSER' : `‹ ${SAVE_VEHICLES[vehicleIndex].toUpperCase()} ›`);
            summary.setText(`PB ${time(best[0]?.finishTimeSec)}  ·  ${buckets.reduce((n, b) => n + b.completedRunCount, 0)} RUNS`);
            rows.forEach((row, index) => {
                const run = runs[page * 5 + index];
                row.setText(run ? `${page * 5 + index + 1}. ${run.vehicleId.toUpperCase()}  ${time(run.finishTimeSec)}\n${run.finishedAt.slice(0, 10)} · ${run.vehicleColor} · RECOVERIES ${run.recoveryCount ?? 0}`
                    : index === 0 && !runs.length ? 'NO RECORD' : '');
            });
            pageLabel.setText(`${page + 1} / ${pages}`);
            const data = runRecordStore.getRecords();
            const oldCount = data.buckets.filter(b => b.rulesetVersion !== RECORD_RULESET && b.bestRun).length;
            const reference = runRecordStore.getReferenceRecords().find(r => r.trackId === course.id && r.rulesetVersion === RECORD_RULESET && (scope === 'all' || r.vehicleId === SAVE_VEHICLES[vehicleIndex]));
            footer.setText(`Recent: up to 20 per car · PB kept separately\n${reference ? `TARGET ${time(reference.finishTimeSec)} · ` : ''}Older PBs: ${oldCount} · Legacy: ${data.legacy.length}`);
        };
        const changeCourse = (delta: number) => { courseIndex = Phaser.Math.Wrap(courseIndex + delta, 0, SAVE_COURSES.length); page = 0; render(); };
        const changeVehicle = (delta: number) => { scope = 'vehicle'; vehicleIndex = Phaser.Math.Wrap(vehicleIndex + delta, 0, SAVE_VEHICLES.length); page = 0; render(); };
        const changePage = (delta: number) => { page = Phaser.Math.Clamp(page + delta, 0, pages - 1); render(); };
        const bindings: Record<string, () => void> = {
            LEFT: () => changeCourse(-1), RIGHT: () => changeCourse(1), UP: () => changeVehicle(-1), DOWN: () => changeVehicle(1),
            TAB: () => { scope = scope === 'all' ? 'vehicle' : 'all'; page = 0; render(); },
            B: () => { list = list === 'best' ? 'recent' : 'best'; page = 0; render(); },
            PAGE_UP: () => changePage(-1), PAGE_DOWN: () => changePage(1), ESC: () => this.scene.start('main'),
        };
        for (const [key, handler] of Object.entries(bindings)) this.input.keyboard?.on(`keydown-${key}`, handler);
        this.input.keyboard?.addCapture('TAB');
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            for (const [key, handler] of Object.entries(bindings)) this.input.keyboard?.off(`keydown-${key}`, handler);
            this.input.keyboard?.removeCapture('TAB');
        });
        render();
    }
}

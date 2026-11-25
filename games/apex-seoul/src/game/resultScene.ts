import { splitLines, finishRecordLabel, formatDelta, type BestSnapshots } from './runComparison';
import type { RunSetup } from './runSetup';
import type { SaveStatus } from './runRecord';
import Phaser from 'phaser';
import { getSceneMobileDisplayMetrics } from './platform/mobileDisplay';
import { UI_THEME } from './uiTheme';

export type TimeAttackResult = {
    bestSnapshot?: BestSnapshots;
    recoveryCount?: number;
    bestTimeSec: number | null;
    previousBestTimeSec: number | null;
    runSetup: RunSetup;
    recordStatus: SaveStatus;
    checkpointTimesSec: Array<number | null>;
    color: string;
    courseName: string;
    deltaSec: number | null;
    finishTimeSec: number;
    isNewBest: boolean;
    vehicleName: string;
};

function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds - minutes * 60).toFixed(2).padStart(5, '0')}`;
}

/** Post-run mockup. It deliberately keeps only the two immediate next actions. */
export class ResultScene extends Phaser.Scene {
    constructor() { super('result'); }

    create(result: TimeAttackResult) {
        let selectedIndex = 0;
        let leaving = false;
        const activate = () => {
            if (leaving) return;
            leaving = true;
            if (selectedIndex === 0) this.scene.start('time-attack', result.runSetup);
            else this.scene.start('main');
        };

        const select = (index: number) => {
            selectedIndex = index;
            updateSelection(selectedIndex);
        };
        let updateSelection = this.drawResult(result, select, activate);
        const layout = () => {
            for (const child of this.children.getChildren().slice()) child.destroy();
            updateSelection = this.drawResult(result, select, activate);
            updateSelection(selectedIndex);
        };
        this.scale.on('resize', layout);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));
        const move = () => select(1 - selectedIndex);
        this.input.keyboard?.on('keydown-UP', move);
        this.input.keyboard?.on('keydown-DOWN', move);
        this.input.keyboard?.on('keydown-ENTER', activate);
        this.input.keyboard?.on('keydown-SPACE', activate);
    }

    private drawResult(result: TimeAttackResult, select: (index: number) => void, activate: () => void) {
        const { width, height } = this.scale;
        const { cssWidth, cssHeight } = getSceneMobileDisplayMetrics(this);
        const compact = cssWidth < 680 || cssHeight < 480;
        const panelWidth = compact ? width - 48 : Math.min(580, width - 48);
        const panelX = (width - panelWidth) / 2;
        const graphics = this.add.graphics();

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.86).fillRect(0, 0, width, compact ? 184 : 156);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, compact ? 182 : 154, width, compact ? 182 : 154);
        graphics.fillStyle(UI_THEME.panel, 0.97).fillRoundedRect(panelX, compact ? 218 : 184, panelWidth, height - (compact ? 246 : 272), 4);
        graphics.lineStyle(1, UI_THEME.borderMuted, 1).strokeRoundedRect(panelX, compact ? 218 : 184, panelWidth, height - (compact ? 246 : 272), 4);

        this.add.text(width / 2, 38, result.isNewBest ? (result.previousBestTimeSec === null ? 'FIRST RECORD' : 'NEW BEST') : 'TIME ATTACK COMPLETE', {
            color: result.isNewBest ? UI_THEME.amberHighlightHex : UI_THEME.textMainHex,
            fontFamily: 'Arial, sans-serif', fontSize: '38px', fontStyle: 'bold italic', letterSpacing: 3,
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);
        this.add.text(width / 2, 96, formatTime(result.finishTimeSec), {
            color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif', fontSize: '56px', fontStyle: 'bold italic',
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);

        const bestLine = result.recordStatus === 'excluded' ? 'PRACTICE RUN' : result.previousBestTimeSec === null
            ? 'FIRST RECORDED RUN'
            : result.isNewBest
                ? `PREVIOUS BEST  ${formatTime(result.previousBestTimeSec)}`
                : `BEST  ${formatTime(result.bestTimeSec ?? result.finishTimeSec)}`;
        const snapshot = result.bestSnapshot ?? { overall: null, vehicle: null };
        const deltaLine = result.deltaSec === null ? 'NO PREVIOUS RECORD' : `${result.deltaSec <= 0 ? '-' : '+'}${formatTime(Math.abs(result.deltaSec))} FROM BEST`;
        this.add.text(width / 2, compact ? 152 : 138, result.bestSnapshot ? splitLines(snapshot, result.finishTimeSec) : `${bestLine}  //  ${deltaLine}`, {
            color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '21px' : '11px', letterSpacing: 1,
        }).setOrigin(0.5);
        if (result.recordStatus !== 'saved') this.add.text(width / 2, compact ? 201 : 172, result.recordStatus === 'excluded' ? 'PRACTICE — RECORD NOT SAVED' : 'RECORD NOT SAVED TO BROWSER', {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '20px' : '11px',
        }).setOrigin(0.5);
        this.add.text(panelX + 28, compact ? 232 : 214, result.courseName.toUpperCase(), {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px', letterSpacing: 2,
        });
        this.add.text(panelX + 28, compact ? 263 : 242, `${result.vehicleName.toUpperCase()}  //  ${result.color.toUpperCase()}`, {
            color: UI_THEME.menuTextHex, fontFamily: 'Arial, sans-serif', fontSize: compact ? '28px' : '18px', fontStyle: 'bold',
        });
        this.add.text(panelX + 28, compact ? 305 : 276, `${result.recordStatus === 'excluded' ? 'PRACTICE' : `ALL ${finishRecordLabel(result.finishTimeSec, snapshot.overall)} · CAR ${finishRecordLabel(result.finishTimeSec, snapshot.vehicle)}`} · RECOVERIES ${result.recoveryCount ?? 0}`, { color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '11px' });
        this.add.text(panelX + 28, compact ? 352 : 303, 'CHECKPOINT SPLITS · ALL / CAR', {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px', letterSpacing: 2,
        });
        result.checkpointTimesSec.forEach((time, index) => {
            const y = compact ? 396 + index * 46 : 330 + index * 36;
            this.add.text(panelX + 28, y, `CP ${index + 1}`, {
                color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '12px',
            });
            this.add.text(panelX + panelWidth - 28, y, `${time === null ? '--:--.--' : formatTime(time)}${compact ? '     ' : '\n'}${formatDelta(time, snapshot.overall?.checkpointTimesSec[index])} / ${formatDelta(time, snapshot.vehicle?.checkpointTimesSec[index])}`, {
                color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: compact ? '22px' : '11px',
            }).setOrigin(1, 0);
        });

        const actionLabels = ['RETRY', 'MAIN MENU'] as const;
        const actionButtons: Phaser.GameObjects.Rectangle[] = [];
        const actionText: Phaser.GameObjects.Text[] = [];
        actionLabels.forEach((label, index) => {
            const buttonHeight = compact ? Math.max(96, Math.ceil(46 * height / cssHeight)) : 42;
            const buttonWidth = compact ? (panelWidth - 80) / 2 : panelWidth - 56;
            const x = compact ? panelX + 28 + buttonWidth / 2 + index * (buttonWidth + 24) : width / 2;
            const y = compact ? height - 44 - buttonHeight / 2 : height - 142 + index * 56;
            const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, index === 0 ? UI_THEME.amber : UI_THEME.background)
                .setStrokeStyle(1, index === 0 ? UI_THEME.amberHighlight : UI_THEME.borderMuted)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(x, y, `${label}${index === 0 ? '  ›' : ''}`, {
                color: index === 0 ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex,
                fontFamily: 'Arial, sans-serif', fontSize: compact ? '30px' : '17px', fontStyle: 'bold', letterSpacing: 2,
            }).setOrigin(0.5);
            button.on('pointerover', () => select(index));
            button.on('pointerup', () => { select(index); activate(); });
            actionButtons.push(button);
            actionText.push(text);
        });
        return (selectedIndex: number) => {
            actionButtons.forEach((button, index) => button.setFillStyle(index === selectedIndex ? UI_THEME.amber : UI_THEME.background));
            actionText.forEach((label, index) => label.setColor(index === selectedIndex ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex));
        };
    }
}

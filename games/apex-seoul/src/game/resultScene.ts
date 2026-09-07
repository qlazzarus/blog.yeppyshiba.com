import Phaser from 'phaser';
import { UI_THEME } from './uiTheme';

export type TimeAttackResult = {
    bestTimeSec: number | null;
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
        const { width, height } = this.scale;
        const compact = width < 680;
        const panelWidth = Math.min(compact ? width - 48 : 580, width - 48);
        const panelX = (width - panelWidth) / 2;
        const graphics = this.add.graphics();
        let selectedIndex = 0;

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.86).fillRect(0, 0, width, 156);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 154, width, 154);
        graphics.fillStyle(UI_THEME.panel, 0.97).fillRoundedRect(panelX, 184, panelWidth, height - 272, 4);
        graphics.lineStyle(1, UI_THEME.borderMuted, 1).strokeRoundedRect(panelX, 184, panelWidth, height - 272, 4);

        this.add.text(width / 2, 38, result.isNewBest ? 'NEW BEST' : 'TIME ATTACK COMPLETE', {
            color: result.isNewBest ? UI_THEME.amberHighlightHex : UI_THEME.textMainHex,
            fontFamily: 'Arial, sans-serif', fontSize: compact ? '30px' : '38px', fontStyle: 'bold italic', letterSpacing: 3,
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);
        this.add.text(width / 2, 96, formatTime(result.finishTimeSec), {
            color: UI_THEME.textMainHex, fontFamily: 'Arial, sans-serif', fontSize: compact ? '42px' : '56px', fontStyle: 'bold italic',
            stroke: UI_THEME.titleShadowHex, strokeThickness: 2,
        }).setOrigin(0.5);

        const bestLine = result.bestTimeSec === null
            ? 'FIRST RECORDED RUN'
            : result.isNewBest
                ? `PREVIOUS BEST  ${formatTime(result.finishTimeSec - (result.deltaSec ?? 0))}`
                : `BEST  ${formatTime(result.bestTimeSec)}`;
        const deltaLine = result.deltaSec === null ? 'NO PREVIOUS RECORD' : `${result.deltaSec <= 0 ? '-' : '+'}${formatTime(Math.abs(result.deltaSec))} FROM BEST`;
        this.add.text(width / 2, 148, `${bestLine}  //  ${deltaLine}`, {
            color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: '11px', letterSpacing: 1,
        }).setOrigin(0.5);
        this.add.text(panelX + 28, 214, result.courseName.toUpperCase(), {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: '12px', letterSpacing: 2,
        });
        this.add.text(panelX + 28, 242, `${result.vehicleName.toUpperCase()}  //  ${result.color.toUpperCase()}`, {
            color: UI_THEME.menuTextHex, fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold',
        });
        this.add.text(panelX + 28, 292, 'CHECKPOINT SPLITS', {
            color: UI_THEME.amberHex, fontFamily: 'monospace', fontSize: '12px', letterSpacing: 2,
        });
        result.checkpointTimesSec.forEach((time, index) => {
            this.add.text(panelX + 28, 320 + index * 28, `CP ${index + 1}`, {
                color: UI_THEME.secondaryTextHex, fontFamily: 'monospace', fontSize: '12px',
            });
            this.add.text(panelX + panelWidth - 28, 320 + index * 28, time === null ? '--:--.--' : formatTime(time), {
                color: UI_THEME.textMainHex, fontFamily: 'monospace', fontSize: '13px',
            }).setOrigin(1, 0);
        });

        const actionLabels = ['RETRY', 'MAIN MENU'] as const;
        const actionButtons: Phaser.GameObjects.Rectangle[] = [];
        const actionText: Phaser.GameObjects.Text[] = [];
        const update = () => {
            actionButtons.forEach((button, index) => button.setFillStyle(index === selectedIndex ? UI_THEME.amber : UI_THEME.background));
            actionText.forEach((label, index) => label.setColor(index === selectedIndex ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex));
        };
        const activate = () => {
            if (selectedIndex === 0) this.scene.start('time-attack');
            else this.scene.start('main');
        };
        actionLabels.forEach((label, index) => {
            const y = height - 142 + index * 56;
            const button = this.add.rectangle(width / 2, y, panelWidth - 56, 42, index === 0 ? UI_THEME.amber : UI_THEME.background)
                .setStrokeStyle(1, index === 0 ? UI_THEME.amberHighlight : UI_THEME.borderMuted)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(width / 2, y, `${label}${index === 0 ? '  ›' : ''}`, {
                color: index === 0 ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex,
                fontFamily: 'Arial, sans-serif', fontSize: '17px', fontStyle: 'bold', letterSpacing: 2,
            }).setOrigin(0.5);
            button.on('pointerover', () => { selectedIndex = index; update(); });
            button.on('pointerup', () => { selectedIndex = index; activate(); });
            actionButtons.push(button);
            actionText.push(text);
        });
        this.input.keyboard?.on('keydown-UP', () => { selectedIndex = Phaser.Math.Wrap(selectedIndex - 1, 0, actionLabels.length); update(); });
        this.input.keyboard?.on('keydown-DOWN', () => { selectedIndex = Phaser.Math.Wrap(selectedIndex + 1, 0, actionLabels.length); update(); });
        this.input.keyboard?.on('keydown-ENTER', activate);
        this.input.keyboard?.on('keydown-SPACE', activate);
    }
}

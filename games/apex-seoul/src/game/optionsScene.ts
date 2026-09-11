import { runRecordStore } from './runRecord';
import Phaser from 'phaser';

import { UI_THEME } from './uiTheme';

type OptionKind = 'range' | 'reset' | 'toggle';
type OptionRow = { kind: OptionKind; label: string; value: number | boolean | null };
type RowVisual = {
    control: Phaser.GameObjects.Rectangle;
    focusBar: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    rangeFill?: Phaser.GameObjects.Rectangle;
    rangeTrack?: Phaser.GameObjects.Rectangle;
    toggleKnob?: Phaser.GameObjects.Arc;
    toggleOffLabel?: Phaser.GameObjects.Text;
    toggleOnLabel?: Phaser.GameObjects.Text;
    toggleTrack?: Phaser.GameObjects.Graphics;
    value: Phaser.GameObjects.Text;
};

/** Settings prototype with functional local record reset. */
export class OptionsScene extends Phaser.Scene {
    constructor() {
        super('options');
    }

    create() {
        const { width, height } = this.scale;
        const compact = width < 680;
        const panelWidth = Math.min(compact ? width - 40 : 680, width - 40);
        const panelX = (width - panelWidth) / 2;
        const rows: OptionRow[] = [
            { kind: 'range', label: 'STEERING SENSITIVITY', value: 70 },
            { kind: 'toggle', label: 'TOUCH CONTROLS', value: true },
            { kind: 'toggle', label: 'VIBRATION', value: true },
            { kind: 'range', label: 'MASTER VOLUME', value: 80 },
            { kind: 'range', label: 'MUSIC VOLUME', value: 65 },
            { kind: 'range', label: 'SFX VOLUME', value: 85 },
            { kind: 'toggle', label: 'DEBUG MODE', value: false },
            { kind: 'reset', label: 'RESET LOCAL RECORDS', value: null },
        ];
        const sectionStarts = new Map<number, string>([
            [0, 'CONTROLS'],
            [3, 'AUDIO'],
            [6, 'DATA'],
        ]);
        const visuals: RowVisual[] = [];
        let resetArmed = false;
        const resetNotice = this.add.text(width / 2, height - 51, '', {
            color: UI_THEME.amberHex, fontFamily: 'Arial, sans-serif', fontSize: '11px',
        }).setOrigin(0.5).setDepth(10);
        const backIndex = rows.length;
        const rangeWidth = compact ? 106 : 164;
        const valueX = panelX + panelWidth - 38;
        let selectedIndex = 0;

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        const graphics = this.add.graphics();
        graphics.fillStyle(UI_THEME.background, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(UI_THEME.nightBlue, 0.82).fillRect(0, 0, width, 126);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 124, width, 124);
        graphics
            .fillStyle(UI_THEME.panel, 0.97)
            .fillRoundedRect(panelX, 152, panelWidth, height - 222, 4);
        graphics
            .lineStyle(1, UI_THEME.borderMuted, 1)
            .strokeRoundedRect(panelX, 152, panelWidth, height - 222, 4);

        this.add
            .text(width / 2, 40, 'OPTIONS', {
                color: UI_THEME.textMainHex,
                fontFamily: 'Arial, sans-serif',
                fontSize: compact ? '34px' : '42px',
                fontStyle: 'bold italic',
                letterSpacing: 3,
                stroke: UI_THEME.titleShadowHex,
                strokeThickness: 2,
            })
            .setOrigin(0.5);
        const valueText = (row: OptionRow, active: boolean) => {
            if (row.kind === 'range') return `${row.value}%`;
            if (row.kind === 'reset') return active ? 'ENTER ›' : 'ENTER';
            return row.value ? 'ON' : 'OFF';
        };
        const update = () => {
            rows.forEach((row, index) => {
                const active = index === selectedIndex;
                const visual = visuals[index];
                const isReset = row.kind === 'reset';
                visual.control.setFillStyle(
                    active ? UI_THEME.amber : isReset ? 0x281b12 : UI_THEME.background,
                );
                visual.control.setStrokeStyle(
                    1,
                    active
                        ? UI_THEME.amberHighlight
                        : isReset
                          ? 0x9e6b32
                          : UI_THEME.borderMuted,
                );
                visual.focusBar.setAlpha(active ? 1 : 0);
                visual.label.setColor(
                    active
                        ? UI_THEME.menuSelectedTextHex
                        : isReset
                          ? '#d49a55'
                          : UI_THEME.menuTextHex,
                );
                visual.value
                    .setText(valueText(row, active))
                    .setColor(
                        active
                            ? UI_THEME.menuSelectedTextHex
                            : isReset
                              ? '#d49a55'
                              : UI_THEME.amberHighlightHex,
                    );
                if (row.kind === 'range' && visual.rangeFill && visual.rangeTrack) {
                    visual.rangeFill.setDisplaySize(
                        Math.max(
                            5,
                            (visual.rangeTrack.width * Number(row.value)) / 100,
                        ),
                        4,
                    );
                    visual.rangeFill.setFillStyle(
                        active ? UI_THEME.background : UI_THEME.amber,
                    );
                    visual.rangeTrack.setFillStyle(active ? 0xc58d22 : 0x34373b);
                }
                if (row.kind === 'toggle' && visual.toggleTrack && visual.toggleKnob) {
                    const enabled = Boolean(row.value);
                    const trackColor = active
                        ? UI_THEME.background
                        : enabled
                          ? 0x8b641e
                          : 0x34373b;
                    visual.toggleTrack
                        .clear()
                        .fillStyle(trackColor, 1)
                        .fillRoundedRect(0, 0, 72, 28, 14)
                        .lineStyle(
                            1,
                            active ? UI_THEME.background : UI_THEME.borderMuted,
                            1,
                        )
                        .strokeRoundedRect(0, 0, 72, 28, 14);
                    visual.toggleKnob.setX(visual.toggleTrack.x + (enabled ? 55 : 17));
                    visual.toggleKnob.setFillStyle(
                        active
                            ? UI_THEME.amberHighlight
                            : enabled
                              ? UI_THEME.amberHighlight
                              : 0xa9adb2,
                    );
                    visual.toggleOnLabel?.setColor(
                        enabled
                            ? active
                                ? UI_THEME.menuSelectedTextHex
                                : UI_THEME.textMainHex
                            : UI_THEME.secondaryTextHex,
                    );
                    visual.toggleOffLabel?.setColor(
                        !enabled
                            ? active
                                ? UI_THEME.menuSelectedTextHex
                                : UI_THEME.textMainHex
                            : UI_THEME.secondaryTextHex,
                    );
                }
            });
            const backActive = selectedIndex === backIndex;
            back.setFillStyle(backActive ? UI_THEME.amber : UI_THEME.panel);
            back.setStrokeStyle(
                1,
                backActive ? UI_THEME.amberHighlight : UI_THEME.borderMuted,
            );
            backLabel.setColor(
                backActive ? UI_THEME.menuSelectedTextHex : UI_THEME.menuTextHex,
            );
        };
        const adjust = (direction: -1 | 1) => {
            if (selectedIndex === backIndex) return;
            const row = rows[selectedIndex];
            if (row.kind === 'range')
                row.value = Phaser.Math.Clamp(
                    Number(row.value) + direction * 5,
                    0,
                    100,
                );
            if (row.kind === 'toggle') row.value = direction > 0;
            update();
        };
        const select = (index: number) => {
            const next = Phaser.Math.Wrap(index, 0, rows.length + 1);
            if (next !== selectedIndex) { resetArmed = false; resetNotice.setText(''); }
            selectedIndex = next;
            update();
        };

        let rowTop = 178;
        rows.forEach((row, index) => {
            const section = sectionStarts.get(index);
            if (section) {
                this.add.text(panelX + 24, rowTop, section, {
                    color: UI_THEME.amberHex,
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    letterSpacing: 2,
                });
                graphics
                    .lineStyle(1, UI_THEME.amber, 0.36)
                    .lineBetween(
                        panelX + 122,
                        rowTop + 7,
                        panelX + panelWidth - 24,
                        rowTop + 7,
                    );
                rowTop += 22;
            }
            const rowHeight = row.kind === 'range' ? 54 : 42;
            const y = rowTop + rowHeight / 2;
            const control = this.add
                .rectangle(
                    panelX + panelWidth / 2,
                    y,
                    panelWidth - 48,
                    rowHeight,
                    index === 0
                        ? UI_THEME.amber
                        : row.kind === 'reset'
                          ? 0x281b12
                          : UI_THEME.background,
                )
                .setStrokeStyle(
                    1,
                    index === 0
                        ? UI_THEME.amberHighlight
                        : row.kind === 'reset'
                          ? 0x9e6b32
                          : UI_THEME.borderMuted,
                )
                .setInteractive({ useHandCursor: true });
            const focusBar = this.add
                .rectangle(panelX + 28, y, 4, rowHeight - 10, UI_THEME.amberHighlight)
                .setAlpha(index === 0 ? 1 : 0);
            const textY = row.kind === 'range' ? y - 10 : y;
            const label = this.add
                .text(panelX + 40, textY, row.label, {
                    color:
                        index === 0
                            ? UI_THEME.menuSelectedTextHex
                            : row.kind === 'reset'
                              ? '#d49a55'
                              : UI_THEME.menuTextHex,
                    fontFamily: 'Arial, sans-serif',
                    fontSize: compact ? '14px' : '16px',
                    fontStyle: 'bold',
                    letterSpacing: 1,
                })
                .setOrigin(0, 0.5);
            const value = this.add
                .text(valueX, textY, valueText(row, index === 0), {
                    color:
                        index === 0
                            ? UI_THEME.menuSelectedTextHex
                            : row.kind === 'reset'
                              ? '#d49a55'
                              : UI_THEME.amberHighlightHex,
                    fontFamily: 'monospace',
                    fontSize: compact ? '11px' : '12px',
                    fontStyle: 'bold',
                })
                .setOrigin(1, 0.5);
            const visual: RowVisual = { control, focusBar, label, value };
            if (row.kind === 'range') {
                const trackX = valueX - rangeWidth / 2;
                const trackY = y + 14;
                visual.rangeTrack = this.add.rectangle(
                    trackX,
                    trackY,
                    rangeWidth,
                    4,
                    index === 0 ? 0xc58d22 : 0x34373b,
                );
                visual.rangeFill = this.add
                    .rectangle(
                        trackX - rangeWidth / 2,
                        trackY,
                        Math.max(5, (rangeWidth * Number(row.value)) / 100),
                        4,
                        UI_THEME.background,
                    )
                    .setOrigin(0, 0.5);
            }
            if (row.kind === 'toggle') {
                const trackX = valueX - 72;
                visual.toggleTrack = this.add.graphics().setPosition(trackX, y - 14);
                visual.toggleTrack
                    .fillStyle(row.value ? 0x8b641e : 0x34373b, 1)
                    .fillRoundedRect(0, 0, 72, 28, 14)
                    .lineStyle(1, UI_THEME.borderMuted, 1)
                    .strokeRoundedRect(0, 0, 72, 28, 14);
                visual.toggleOnLabel = this.add
                    .text(trackX + 13, y, 'ON', {
                        color: row.value
                            ? UI_THEME.textMainHex
                            : UI_THEME.secondaryTextHex,
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);
                visual.toggleOffLabel = this.add
                    .text(trackX + 57, y, 'OFF', {
                        color: row.value
                            ? UI_THEME.secondaryTextHex
                            : UI_THEME.textMainHex,
                        fontFamily: 'monospace',
                        fontSize: '8px',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);
                visual.toggleKnob = this.add.circle(
                    trackX + (row.value ? 55 : 17),
                    y,
                    10,
                    row.value ? UI_THEME.amberHighlight : 0xa9adb2,
                );
                value.setVisible(false);
            }
            control.on('pointerover', () => select(index));
            control.on('pointerup', () => {
                select(index);
                activate();
            });
            visuals.push(visual);
            rowTop += rowHeight + 6;
        });

        const back = this.add
            .rectangle(width / 2, height - 25, 178, 30, UI_THEME.panel)
            .setStrokeStyle(1, UI_THEME.borderMuted)
            .setInteractive({ useHandCursor: true });
        const backLabel = this.add
            .text(width / 2, height - 25, '‹  BACK TO MENU', {
                color: UI_THEME.menuTextHex,
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);
        const returnToMain = () => this.scene.start('main');
        const activate = () => {
            if (selectedIndex === backIndex) return returnToMain();
            const row = rows[selectedIndex];
            if (row.kind === 'range') adjust(1);
            if (row.kind === 'toggle') {
                row.value = !row.value;
                update();
            }
            if (row.kind === 'reset') {
                if (!resetArmed) {
                    resetArmed = true;
                    resetNotice.setText('Delete personal records? Press again to confirm.');
                } else {
                    const status = runRecordStore.resetRecords();
                    resetArmed = false;
                    resetNotice.setText(status === 'saved' ? 'Records reset to defaults.' : 'Reset for this session only. Old records may return on reload.');
                }
            }
        };
        back.on('pointerover', () => select(backIndex));
        back.on('pointerup', () => {
            select(backIndex);
            activate();
        });
        this.input.keyboard?.on('keydown-UP', () => select(selectedIndex - 1));
        this.input.keyboard?.on('keydown-DOWN', () => select(selectedIndex + 1));
        this.input.keyboard?.on('keydown-LEFT', () => adjust(-1));
        this.input.keyboard?.on('keydown-RIGHT', () => adjust(1));
        this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => { if (!event.repeat) activate(); });
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => { if (!event.repeat) activate(); });
        this.input.keyboard?.on('keydown-ESC', returnToMain);
    }
}

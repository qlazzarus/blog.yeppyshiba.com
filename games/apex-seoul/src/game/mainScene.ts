import Phaser from 'phaser';

import { MAIN_MENU_HERO_KEY } from './startupAssetManifest';
import { UI_THEME } from './uiTheme';

/** Entry scene for the currently available game mode. */
export class MainScene extends Phaser.Scene {
    constructor() {
        super('main');
    }

    create() {
        const { width, height } = this.scale;
        const graphics = this.add.graphics();
        const compact = width < 680;
        const titleSize = Math.round(
            Phaser.Math.Clamp(width * (compact ? 0.1 : 0.05), 32, 52),
        );
        const menuWidth = compact ? width - 48 : Math.min(380, width * 0.31);
        const menuX = compact ? 24 : width - menuWidth - 42;
        const menuY = compact ? height * 0.57 : height * 0.36;
        const menuEntries = ['START', 'RECORDS', 'OPTIONS'] as const;
        const menuButtons: Phaser.GameObjects.Rectangle[] = [];
        const menuLabels: Phaser.GameObjects.Text[] = [];
        let selectedIndex = 0;

        this.cameras.main.setBackgroundColor(UI_THEME.backgroundHex);
        this.add
            .image(0, 0, MAIN_MENU_HERO_KEY)
            .setOrigin(0)
            .setDisplaySize(width, height);
        graphics
            .fillStyle(UI_THEME.black, compact ? 0.2 : 0.08)
            .fillRect(0, 0, width, height);
        graphics
            .fillStyle(UI_THEME.background, compact ? 0.7 : 0.88)
            .fillRect(
                compact ? 0 : width * 0.58,
                compact ? height * 0.48 : 0,
                compact ? width : width * 0.42,
                compact ? height * 0.52 : height,
            );
        graphics
            .fillStyle(UI_THEME.amber, 0.14)
            .fillRect(0, 0, compact ? width : width * 0.58, height);
        graphics.lineStyle(1, UI_THEME.amberHighlight, 0.1);
        for (let y = 0; y < height; y += 3)
            graphics.lineBetween(0, y, compact ? width : width * 0.58, y);
        graphics.fillStyle(UI_THEME.nightBlue, 0.82).fillRect(0, 0, width, 138);
        graphics.lineStyle(2, UI_THEME.amber, 0.9).lineBetween(0, 136, width, 136);

        const apexX = width / 2 - Math.min(38, width * 0.06);
        const apexY = 26;
        const seoulX = width / 2 + Math.min(34, width * 0.06);
        const seoulY = 76;
        const titleRailWidth = Math.min(108, width * 0.14);
        const titleGap = Math.min(116, width * 0.3);
        const titleScaleX = compact ? 1 : 1.1;
        graphics.lineStyle(2, UI_THEME.amber, 0.9);
        graphics.lineBetween(
            apexX - titleGap - titleRailWidth,
            apexY + 10,
            apexX - titleGap,
            apexY + 10,
        );
        graphics.lineBetween(
            seoulX + titleGap,
            seoulY + 10,
            seoulX + titleGap + titleRailWidth,
            seoulY + 10,
        );
        graphics.lineStyle(1, UI_THEME.amberHighlight, 0.6);
        graphics.lineBetween(
            seoulX - Math.min(90, width * 0.18),
            seoulY + 31,
            seoulX + Math.min(126, width * 0.24),
            seoulY + 31,
        );
        graphics.fillStyle(UI_THEME.amber, 0.95);
        graphics.fillTriangle(
            apexX - titleGap - 18,
            apexY + 4,
            apexX - titleGap - 4,
            apexY + 10,
            apexX - titleGap - 18,
            apexY + 16,
        );
        graphics.fillTriangle(
            seoulX + titleGap + 18,
            seoulY + 4,
            seoulX + titleGap + 4,
            seoulY + 10,
            seoulX + titleGap + 18,
            seoulY + 16,
        );
        graphics.fillTriangle(
            seoulX - 108,
            seoulY + 31,
            seoulX - 98,
            seoulY + 25,
            seoulX - 98,
            seoulY + 37,
        );
        for (let offset = 0; offset < 3; offset += 1) {
            const x = apexX - titleGap - titleRailWidth - 44 + offset * 12;
            graphics
                .lineStyle(2, UI_THEME.amber, 0.65 - offset * 0.12)
                .lineBetween(x, apexY + 2, x + 8, apexY - 4);
        }
        const titleStyle = {
            color: UI_THEME.textMainHex,
            fontFamily: 'Arial, sans-serif',
            fontSize: `${titleSize}px`,
            fontStyle: 'bold italic',
            letterSpacing: 2,
            stroke: UI_THEME.titleShadowHex,
            strokeThickness: 2,
        };
        this.add
            .text(apexX + 3, apexY + 3, 'APEX', {
                ...titleStyle,
                color: UI_THEME.blackHex,
            })
            .setOrigin(0.5)
            .setScale(titleScaleX, 1);
        this.add
            .text(seoulX + 3, seoulY + 3, 'SEOUL', {
                ...titleStyle,
                color: UI_THEME.blackHex,
            })
            .setOrigin(0.5)
            .setScale(titleScaleX, 1);
        this.add
            .text(apexX, apexY, 'APEX', titleStyle)
            .setOrigin(0.5)
            .setScale(titleScaleX, 1);
        this.add
            .text(seoulX, seoulY, 'SEOUL', titleStyle)
            .setOrigin(0.5)
            .setScale(titleScaleX, 1);
        this.add.text(menuX, menuY - 26, 'BUGAK RIDGE / SEOUL', {
            color: UI_THEME.secondaryTextHex,
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: 1,
        });
        const notice = this.add.text(menuX, menuY + menuEntries.length * 64 + 12, '', {
            color: UI_THEME.secondaryTextHex,
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: 1,
        });

        const startTimeAttack = () => this.scene.start('vehicle-select');
        const select = (index: number) => {
            selectedIndex = Phaser.Math.Wrap(index, 0, menuEntries.length);
            menuButtons.forEach((button, buttonIndex) =>
                button.setFillStyle(
                    buttonIndex === selectedIndex ? UI_THEME.amber : UI_THEME.panel,
                ),
            );
            menuLabels.forEach((label, labelIndex) =>
                label.setColor(
                    labelIndex === selectedIndex
                        ? UI_THEME.menuSelectedTextHex
                        : UI_THEME.menuTextHex,
                ),
            );
        };
        const activate = () => {
            if (selectedIndex === 0) startTimeAttack();
            else if (selectedIndex === 2) this.scene.start('options');
            else notice.setText(`${menuEntries[selectedIndex]} — COMING SOON`);
        };
        menuEntries.forEach((entry, index) => {
            const y = menuY + index * 64;
            const button = this.add
                .rectangle(
                    menuX + menuWidth / 2,
                    y,
                    menuWidth,
                    50,
                    index === 0 ? UI_THEME.amber : UI_THEME.panel,
                )
                .setStrokeStyle(
                    1,
                    index === 0 ? UI_THEME.amberHighlight : UI_THEME.borderMuted,
                )
                .setInteractive({ useHandCursor: true });
            const label = this.add
                .text(menuX + 18, y, entry, {
                    color:
                        index === 0
                            ? UI_THEME.menuSelectedTextHex
                            : UI_THEME.menuTextHex,
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '21px',
                    fontStyle: 'bold',
                    letterSpacing: 2,
                })
                .setOrigin(0, 0.5);
            button.on('pointerover', () => select(index));
            button.on('pointerup', () => {
                select(index);
                activate();
            });
            menuButtons.push(button);
            menuLabels.push(label);
        });
        this.input.keyboard?.on('keydown-UP', () => select(selectedIndex - 1));
        this.input.keyboard?.on('keydown-DOWN', () => select(selectedIndex + 1));
        this.input.keyboard?.on('keydown-ENTER', activate);
        this.input.keyboard?.on('keydown-SPACE', activate);
    }
}

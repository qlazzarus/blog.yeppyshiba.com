import Phaser from 'phaser';

import {
    CANVAS_WIDTH,
    MINIMAP_HEIGHT,
    MINIMAP_WIDTH,
    MINIMAP_X,
    MINIMAP_Y,
    WORLD_VIEW_HEIGHT,
} from '../config';

type FarmHudConfig = {
    readonly scene: Phaser.Scene;
    readonly uiObjects: Phaser.GameObjects.GameObject[];
};

export type CommandButtonView = {
    readonly background: Phaser.GameObjects.Rectangle;
    readonly hotkeyText: Phaser.GameObjects.Text;
    readonly labelText: Phaser.GameObjects.Text;
};

export type FarmHud = {
    readonly commandButtons: readonly CommandButtonView[];
    readonly debugText: Phaser.GameObjects.Text;
    readonly minimapGraphics: Phaser.GameObjects.Graphics;
};

export function createFarmHud(config: FarmHudConfig): FarmHud {
    const panel = config.scene.add
        .rectangle(0, WORLD_VIEW_HEIGHT, CANVAS_WIDTH, 180, 0x141515, 1)
        .setOrigin(0, 0)
        .setDepth(100);
    const topBorder = config.scene.add
        .rectangle(0, WORLD_VIEW_HEIGHT, CANVAS_WIDTH, 4, 0x6d6751, 1)
        .setOrigin(0, 0)
        .setDepth(101);
    const minimapFrame = config.scene.add
        .rectangle(MINIMAP_X, MINIMAP_Y, MINIMAP_WIDTH, MINIMAP_HEIGHT, 0x1a2018, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8d7d58)
        .setDepth(102);
    const minimapGraphics = config.scene.add.graphics().setDepth(103);
    const commandGrid = config.scene.add
        .rectangle(CANVAS_WIDTH - 210, WORLD_VIEW_HEIGHT + 18, 182, 86, 0x25251e, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8d7d58)
        .setDepth(102);
    const commandButtons = createCommandButtons(config.scene);
    const title = config.scene.add
        .text(164, WORLD_VIEW_HEIGHT + 18, 'Chicken Farm Tilemap PoC', {
            color: '#f5e6ae',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: '700',
        })
        .setDepth(103);
    const help = config.scene.add
        .text(
            164,
            WORLD_VIEW_HEIGHT + 48,
            'Drag select, right-click move/attack, WASD pan (S stop), 1-8 focus, G grid, T terrain, L log',
            {
                color: '#bcc9a6',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
            },
        )
        .setDepth(103);
    const debugText = config.scene.add
        .text(164, WORLD_VIEW_HEIGHT + 76, '', {
            color: '#d9d2ba',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '13px',
        })
        .setDepth(103);
    const legend = config.scene.add
        .text(
            164,
            WORLD_VIEW_HEIGHT + 110,
            'P# player start | SP outer spider | WF wolf rect | STONE wolf stone | B boss',
            {
                color: '#aebc9b',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
            },
        )
        .setDepth(103);

    config.uiObjects.push(
        panel,
        topBorder,
        minimapFrame,
        minimapGraphics,
        commandGrid,
        title,
        help,
        debugText,
        legend,
        ...commandButtons.flatMap((button) => [
            button.background,
            button.hotkeyText,
            button.labelText,
        ]),
    );

    return { commandButtons, debugText, minimapGraphics };
}

function createCommandButtons(scene: Phaser.Scene): readonly CommandButtonView[] {
    const buttons: CommandButtonView[] = [];
    const buttonWidth = 42;
    const buttonHeight = 36;
    const gap = 6;
    const startX = CANVAS_WIDTH - 202;
    const startY = WORLD_VIEW_HEIGHT + 24;

    for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            const x = startX + col * (buttonWidth + gap);
            const y = startY + row * (buttonHeight + gap);
            const background = scene.add
                .rectangle(x, y, buttonWidth, buttonHeight, 0x303329, 1)
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0x776f53, 0.92)
                .setDepth(104)
                .setInteractive({ useHandCursor: true });
            const hotkeyText = scene.add
                .text(x + 5, y + 4, '', {
                    color: '#f6df8b',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '10px',
                    fontStyle: '700',
                })
                .setDepth(105);
            const labelText = scene.add
                .text(x + buttonWidth / 2, y + 20, '', {
                    align: 'center',
                    color: '#d9d2ba',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '10px',
                    wordWrap: { width: buttonWidth - 6 },
                })
                .setDepth(105)
                .setOrigin(0.5);

            buttons.push({ background, hotkeyText, labelText });
        }
    }

    return buttons;
}

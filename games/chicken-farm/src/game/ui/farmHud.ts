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
    readonly debugPanel: Phaser.GameObjects.Rectangle;
    readonly debugText: Phaser.GameObjects.Text;
    readonly debugToggleButton: Phaser.GameObjects.Rectangle;
    readonly debugToggleText: Phaser.GameObjects.Text;
    readonly inventorySlots: readonly InventorySlotView[];
    readonly minimapGraphics: Phaser.GameObjects.Graphics;
    readonly resourceText: Phaser.GameObjects.Text;
    readonly selectionInfoBodyText: Phaser.GameObjects.Text;
    readonly selectionInfoNameText: Phaser.GameObjects.Text;
    readonly selectionInfoPortrait: Phaser.GameObjects.Rectangle;
    readonly selectionInfoStatsText: Phaser.GameObjects.Text;
    readonly selectionInfoStatusText: Phaser.GameObjects.Text;
};

export type InventorySlotView = {
    readonly background: Phaser.GameObjects.Rectangle;
    readonly iconText: Phaser.GameObjects.Text;
    readonly index: number;
    readonly quantityText: Phaser.GameObjects.Text;
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
    const resourceText = config.scene.add
        .text(14, 12, '', {
            backgroundColor: 'rgba(14, 16, 12, 0.76)',
            color: '#f5e6ae',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '13px',
            fontStyle: '700',
            padding: { bottom: 4, left: 8, right: 8, top: 4 },
        })
        .setDepth(130);
    const commandGrid = config.scene.add
        .rectangle(CANVAS_WIDTH - 210, WORLD_VIEW_HEIGHT + 18, 182, 86, 0x25251e, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8d7d58)
        .setDepth(102);
    const commandButtons = createCommandButtons(config.scene);
    const selectionFrame = config.scene.add
        .rectangle(164, WORLD_VIEW_HEIGHT + 18, CANVAS_WIDTH - 402, 122, 0x1b1d18, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x6f674c, 0.95)
        .setDepth(102);
    const selectionInfoPortrait = config.scene.add
        .rectangle(182, WORLD_VIEW_HEIGHT + 34, 76, 76, 0x25291f, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8d7d58, 0.95)
        .setDepth(103);
    const selectionInfoNameText = config.scene.add
        .text(274, WORLD_VIEW_HEIGHT + 30, '', {
            color: '#f5e6ae',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: '700',
        })
        .setDepth(103);
    const selectionInfoStatsText = config.scene.add
        .text(274, WORLD_VIEW_HEIGHT + 58, '', {
            color: '#d9d2ba',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '13px',
        })
        .setDepth(103);
    const selectionInfoStatusText = config.scene.add
        .text(274, WORLD_VIEW_HEIGHT + 82, '', {
            color: '#bcc9a6',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '13px',
        })
        .setDepth(103);
    const selectionInfoBodyText = config.scene.add
        .text(274, WORLD_VIEW_HEIGHT + 106, '', {
            color: '#aebc9b',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            wordWrap: { width: CANVAS_WIDTH - 468 },
        })
        .setDepth(103);
    const inventorySlots = createInventorySlots(config.scene);
    const debugPanel = config.scene.add
        .rectangle(CANVAS_WIDTH - 382, 12, 370, 112, 0x10130e, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x6f674c, 0.86)
        .setDepth(140);
    const debugText = config.scene.add
        .text(CANVAS_WIDTH - 372, 20, '', {
            color: '#d9d2ba',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            wordWrap: { width: 350 },
        })
        .setDepth(141);
    const debugToggleButton = config.scene.add
        .rectangle(CANVAS_WIDTH - 62, 130, 50, 24, 0x25251e, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8d7d58, 0.95)
        .setDepth(142)
        .setInteractive({ useHandCursor: true });
    const debugToggleText = config.scene.add
        .text(CANVAS_WIDTH - 37, 142, 'DBG', {
            align: 'center',
            color: '#f6df8b',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            fontStyle: '700',
        })
        .setDepth(143)
        .setOrigin(0.5);

    config.uiObjects.push(
        panel,
        topBorder,
        minimapFrame,
        minimapGraphics,
        resourceText,
        commandGrid,
        selectionFrame,
        selectionInfoPortrait,
        selectionInfoNameText,
        selectionInfoStatsText,
        selectionInfoStatusText,
        selectionInfoBodyText,
        ...inventorySlots.flatMap((slot) => [
            slot.background,
            slot.iconText,
            slot.quantityText,
        ]),
        debugPanel,
        debugText,
        debugToggleButton,
        debugToggleText,
        ...commandButtons.flatMap((button) => [
            button.background,
            button.hotkeyText,
            button.labelText,
        ]),
    );

    return {
        commandButtons,
        debugPanel,
        debugText,
        debugToggleButton,
        debugToggleText,
        inventorySlots,
        minimapGraphics,
        resourceText,
        selectionInfoBodyText,
        selectionInfoNameText,
        selectionInfoPortrait,
        selectionInfoStatsText,
        selectionInfoStatusText,
    };
}

function createInventorySlots(scene: Phaser.Scene): readonly InventorySlotView[] {
    const slots: InventorySlotView[] = [];
    const slotSize = 34;
    const gap = 5;
    const startX = CANVAS_WIDTH - 316;
    const startY = WORLD_VIEW_HEIGHT + 64;

    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 2; col += 1) {
            const x = startX + col * (slotSize + gap);
            const y = startY + row * (slotSize + gap);
            const background = scene.add
                .rectangle(x, y, slotSize, slotSize, 0x27291f, 1)
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0x756b4e, 0.92)
                .setDepth(104)
                .setInteractive({ useHandCursor: true });
            const iconText = scene.add
                .text(x + slotSize / 2, y + 15, '', {
                    align: 'center',
                    color: '#fff0bd',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '16px',
                    fontStyle: '700',
                })
                .setDepth(105)
                .setOrigin(0.5);
            const quantityText = scene.add
                .text(x + slotSize - 4, y + slotSize - 3, '', {
                    align: 'right',
                    color: '#f6df8b',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '10px',
                    fontStyle: '700',
                    stroke: '#15130e',
                    strokeThickness: 2,
                })
                .setDepth(106)
                .setOrigin(1, 1);

            slots.push({ background, iconText, index: slots.length, quantityText });
        }
    }

    return slots;
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

import Phaser from 'phaser';

import type { MvpBuildingId } from '../balanceTypes';
import type { CommandButtonView } from '../ui/farmHud';

export type CommandCardPageId = 'build' | 'root';

export type CommandCardAction =
    | {
          readonly page: CommandCardPageId;
          readonly type: 'open_page';
      }
    | {
          readonly buildingId: MvpBuildingId;
          readonly type: 'start_build_placement';
      }
    | {
          readonly type: 'stop';
      }
    | {
          readonly type: 'cancel';
      };

type CommandCardButton = {
    readonly action: CommandCardAction;
    readonly enabledWhenBuilderSelected?: boolean;
    readonly hotkey: string;
    readonly id: string;
    readonly label: string;
};

type CommandCardSystemConfig = {
    readonly buttons: readonly CommandButtonView[];
    readonly hasBuilderSelection: () => boolean;
    readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
    readonly onAction: (action: CommandCardAction) => void;
    readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
};

const ROOT_PAGE: readonly CommandCardButton[] = [
    {
        action: { page: 'build', type: 'open_page' },
        enabledWhenBuilderSelected: true,
        hotkey: 'B',
        id: 'build',
        label: 'Build',
    },
    {
        action: { type: 'stop' },
        hotkey: 'S',
        id: 'stop',
        label: 'Stop',
    },
];

const BUILD_PAGE: readonly CommandCardButton[] = [
    {
        action: { buildingId: 'fence_wood', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'F',
        id: 'build_fence',
        label: 'Fence',
    },
    {
        action: { buildingId: 'tower_scout', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'T',
        id: 'build_tower',
        label: 'Tower',
    },
    {
        action: { buildingId: 'farm_house', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'H',
        id: 'build_house',
        label: 'House',
    },
    {
        action: { buildingId: 'coop_basic', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'C',
        id: 'build_coop',
        label: 'Coop',
    },
    {
        action: { page: 'root', type: 'open_page' },
        hotkey: 'Esc',
        id: 'back',
        label: 'Back',
    },
];

export class CommandCardSystem {
    private readonly buttons: readonly CommandButtonView[];
    private readonly hasBuilderSelection: () => boolean;
    private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
    private readonly onAction: (action: CommandCardAction) => void;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private page: CommandCardPageId = 'root';

    constructor(config: CommandCardSystemConfig) {
        this.buttons = config.buttons;
        this.hasBuilderSelection = config.hasBuilderSelection;
        this.keys = config.keys;
        this.onAction = config.onAction;
        this.recordTelemetry = config.recordTelemetry;
        this.bindButtonClicks();
        this.refresh();
    }

    getPage() {
        return this.page;
    }

    setPage(page: CommandCardPageId) {
        if (this.page === page) return;

        this.page = page;
        this.recordTelemetry?.('command_card_page_changed', { page });
        this.refresh();
    }

    update() {
        const escapeKey = this.keys.escape;
        if (escapeKey && Phaser.Input.Keyboard.JustDown(escapeKey)) {
            if (this.page !== 'root') {
                this.dispatch({ page: 'root', type: 'open_page' });
                return true;
            }
        }

        const button = this.getCurrentButtons().find((candidate) => {
            const key = this.keys[candidate.hotkey.toLowerCase()];
            return key && Phaser.Input.Keyboard.JustDown(key);
        });
        if (!button || !this.isButtonEnabled(button)) {
            this.refresh();
            return false;
        }

        this.dispatch(button.action);
        return true;
    }

    refresh() {
        const pageButtons = this.getCurrentButtons();
        this.buttons.forEach((view, index) => {
            const button = pageButtons[index];
            if (!button) {
                this.renderEmptyButton(view);
                return;
            }

            this.renderButton(view, button, this.isButtonEnabled(button));
        });
    }

    private bindButtonClicks() {
        this.buttons.forEach((view, index) => {
            view.background.on(Phaser.Input.Events.POINTER_DOWN, () => {
                const button = this.getCurrentButtons()[index];
                if (!button || !this.isButtonEnabled(button)) return;
                this.dispatch(button.action);
            });
        });
    }

    private dispatch(action: CommandCardAction) {
        if (action.type === 'open_page') {
            this.setPage(action.page);
            return;
        }

        this.onAction(action);
        this.refresh();
    }

    private getCurrentButtons() {
        return this.page === 'root' ? ROOT_PAGE : BUILD_PAGE;
    }

    private isButtonEnabled(button: CommandCardButton) {
        return !button.enabledWhenBuilderSelected || this.hasBuilderSelection();
    }

    private renderButton(
        view: CommandButtonView,
        button: CommandCardButton,
        enabled: boolean,
    ) {
        view.background
            .setFillStyle(enabled ? 0x303329 : 0x20221d, 1)
            .setStrokeStyle(1, enabled ? 0x9a8e62 : 0x4c4a3d, 0.92);
        view.hotkeyText.setText(button.hotkey);
        view.hotkeyText.setColor(enabled ? '#f6df8b' : '#77705f');
        view.labelText.setText(button.label);
        view.labelText.setColor(enabled ? '#d9d2ba' : '#77705f');
    }

    private renderEmptyButton(view: CommandButtonView) {
        view.background.setFillStyle(0x20221d, 1).setStrokeStyle(1, 0x454238, 0.7);
        view.hotkeyText.setText('');
        view.labelText.setText('');
    }
}

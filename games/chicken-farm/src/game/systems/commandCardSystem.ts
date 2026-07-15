import Phaser from 'phaser';

import type { MvpBuildingId } from '../balanceTypes';
import type { CommandButtonView } from '../ui/farmHud';

export type CommandCardPageId = 'build' | 'root';

export type CommandCardSelectionKind =
    | 'builder_unit'
    | 'constructing_building'
    | 'economy_coop'
    | 'generic_unit'
    | 'complete_building'
    | 'none';

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
          readonly type: 'start_attack_targeting';
      }
    | {
          readonly type: 'start_herd_targeting';
      }
    | {
          readonly type: 'feed_nearby_chicken';
      }
    | {
          readonly type: 'cancel';
      }
    | {
          readonly type: 'cancel_construction';
      }
    | {
          readonly type: 'start_coop_hatch';
      };

type CommandCardButton = {
    readonly action: CommandCardAction;
    readonly autocastId?: 'farmer_feed';
    readonly enabledWhenBuilderSelected?: boolean;
    readonly hotkey: string;
    readonly id: string;
    readonly label: string;
};

type CommandCardSystemConfig = {
    readonly buttons: readonly CommandButtonView[];
    readonly isActionEnabled?: (action: CommandCardAction) => boolean;
    readonly getSelectionKind: () => CommandCardSelectionKind;
    readonly isAutocastActive?: (autocastId: 'farmer_feed') => boolean;
    readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
    readonly onAction: (action: CommandCardAction) => void;
    readonly onToggleAutocast?: (autocastId: 'farmer_feed') => void;
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
        action: { type: 'start_attack_targeting' },
        hotkey: 'A',
        id: 'attack',
        label: 'Attack',
    },
    {
        action: { type: 'stop' },
        hotkey: 'S',
        id: 'stop',
        label: 'Stop',
    },
    {
        action: { type: 'start_herd_targeting' },
        hotkey: 'X',
        id: 'herd',
        label: 'Herd 4MP',
    },
    {
        action: { type: 'feed_nearby_chicken' },
        autocastId: 'farmer_feed',
        hotkey: 'D',
        id: 'feed',
        label: 'Feed 3MP',
    },
];

const CONSTRUCTING_BUILDING_PAGE: readonly CommandCardButton[] = [
    {
        action: { type: 'cancel_construction' },
        hotkey: 'X',
        id: 'cancel_construction',
        label: 'Cancel',
    },
];

const GENERIC_UNIT_PAGE: readonly CommandCardButton[] = [
    {
        action: { type: 'start_attack_targeting' },
        hotkey: 'A',
        id: 'attack',
        label: 'Attack',
    },
    {
        action: { type: 'stop' },
        hotkey: 'S',
        id: 'stop',
        label: 'Stop',
    },
];

const ECONOMY_COOP_PAGE: readonly CommandCardButton[] = [
    {
        action: { type: 'start_coop_hatch' },
        hotkey: 'H',
        id: 'hatch',
        label: 'Hatch',
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
        action: { buildingId: 'well_basic', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'W',
        id: 'build_well',
        label: 'Well',
    },
    {
        action: { buildingId: 'market', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'M',
        id: 'build_market',
        label: 'Market',
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
    private readonly getSelectionKind: () => CommandCardSelectionKind;
    private readonly isActionEnabled: (action: CommandCardAction) => boolean;
    private readonly isAutocastActive: (autocastId: 'farmer_feed') => boolean;
    private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
    private readonly onAction: (action: CommandCardAction) => void;
    private readonly onToggleAutocast?: (autocastId: 'farmer_feed') => void;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private page: CommandCardPageId = 'root';

    constructor(config: CommandCardSystemConfig) {
        this.buttons = config.buttons;
        this.getSelectionKind = config.getSelectionKind;
        this.isActionEnabled = config.isActionEnabled ?? (() => true);
        this.isAutocastActive = config.isAutocastActive ?? (() => false);
        this.keys = config.keys;
        this.onAction = config.onAction;
        this.onToggleAutocast = config.onToggleAutocast;
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
        this.normalizePageForSelection();
        const pageButtons = this.getCurrentButtons();
        this.buttons.forEach((view, index) => {
            const button = pageButtons[index];
            if (!button) {
                this.renderEmptyButton(view);
                return;
            }

            this.renderButton(
                view,
                button,
                this.isButtonEnabled(button),
                Boolean(button.autocastId && this.isAutocastActive(button.autocastId)),
            );
        });
    }

    private bindButtonClicks() {
        this.buttons.forEach((view, index) => {
            view.background.on(
                Phaser.Input.Events.POINTER_DOWN,
                (pointer: Phaser.Input.Pointer) => {
                    const button = this.getCurrentButtons()[index];
                    if (!button) return;
                    if (pointer.rightButtonDown() && button.autocastId) {
                        this.onToggleAutocast?.(button.autocastId);
                        this.refresh();
                        return;
                    }
                    if (!this.isButtonEnabled(button)) return;
                    this.dispatch(button.action);
                },
            );
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
        const selectionKind = this.getSelectionKind();
        if (this.page === 'build' && selectionKind === 'builder_unit') return BUILD_PAGE;
        if (selectionKind === 'constructing_building') return CONSTRUCTING_BUILDING_PAGE;
        if (selectionKind === 'economy_coop') return ECONOMY_COOP_PAGE;
        if (selectionKind === 'builder_unit') return ROOT_PAGE;
        if (selectionKind === 'generic_unit') return GENERIC_UNIT_PAGE;

        return [];
    }

    private isButtonEnabled(button: CommandCardButton) {
        return (
            this.isActionEnabled(button.action) &&
            (!button.enabledWhenBuilderSelected ||
                this.getSelectionKind() === 'builder_unit')
        );
    }

    private normalizePageForSelection() {
        if (this.page !== 'build') return;
        if (this.getSelectionKind() === 'builder_unit') return;

        this.page = 'root';
    }

    private renderButton(
        view: CommandButtonView,
        button: CommandCardButton,
        enabled: boolean,
        autocastActive: boolean,
    ) {
        view.background
            .setFillStyle(enabled ? 0x303329 : 0x20221d, 1)
            .setStrokeStyle(
                autocastActive ? 3 : 1,
                autocastActive ? 0x63d6e8 : enabled ? 0x9a8e62 : 0x4c4a3d,
                0.92,
            );
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

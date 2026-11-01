import Phaser from 'phaser';

import type { MvpBuildingId } from '../balanceTypes';
import type { CommandButtonView } from '../ui/farmHud';

export type CommandCardPageId = 'build' | 'growth' | 'research' | 'root';

export type CommandCardSelectionKind =
    | 'builder_unit'
    | 'constructing_building'
    | 'economy_coop'
    | 'market_building'
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
      }
    | {
          readonly type: 'exchange_gold_for_lumber';
      }
    | {
          readonly type: 'request_building_upgrade';
      }
    | {
          readonly type: 'cancel_building_upgrade';
      }
    | {
          readonly type: 'toggle_gate';
      }
    | {
          readonly type: 'request_dog_production';
      }
    | {
          readonly type: 'cancel_selected_production';
      }
    | {
          readonly type: 'cancel_selected_hatch';
      }
    | {
          readonly researchId: 'arcaneTowerDamage' | 'dogDamage' | 'dogSpeedClaw' | 'guardTowerDamage' | 'masonry';
          readonly type: 'request_research';
      }
    | {
          readonly type: 'cancel_selected_research';
      }
    | {
          readonly type: 'start_rally_targeting';
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
    {
        action: { type: 'cancel_selected_hatch' },
        hotkey: 'X',
        id: 'cancel_hatch',
        label: 'Cancel Hatch',
    },
    {
        action: { type: 'start_rally_targeting' },
        hotkey: 'R',
        id: 'set_rally',
        label: 'Set Rally',
    },
];

const MARKET_BUILDING_PAGE: readonly CommandCardButton[] = [
    {
        action: { type: 'exchange_gold_for_lumber' },
        hotkey: 'E',
        id: 'market_exchange_gold_for_lumber',
        label: '100g → 70l',
    },
];

const COMPLETE_BUILDING_PAGE: readonly CommandCardButton[] = [
    {
        action: { type: 'request_building_upgrade' },
        hotkey: 'U',
        id: 'upgrade_building',
        label: 'Upgrade',
    },
    {
        action: { type: 'cancel_building_upgrade' },
        hotkey: 'X',
        id: 'cancel_upgrade',
        label: 'Cancel Upg.',
    },
    {
        action: { type: 'toggle_gate' },
        hotkey: 'G',
        id: 'toggle_gate',
        label: 'Open / Close',
    },
    {
        action: { type: 'request_dog_production' },
        hotkey: 'D',
        id: 'train_dog',
        label: 'Train Dog 70g 20l',
    },
    {
        action: { type: 'cancel_selected_production' },
        hotkey: 'P',
        id: 'cancel_production',
        label: 'Cancel Train',
    },
    {
        action: { page: 'research', type: 'open_page' },
        hotkey: 'R',
        id: 'research_page',
        label: 'Research',
    },
    {
        action: { type: 'start_rally_targeting' },
        hotkey: 'T',
        id: 'set_rally',
        label: 'Set Rally',
    },
];

const RESEARCH_PAGE: readonly CommandCardButton[] = [
    { action: { researchId: 'masonry', type: 'request_research' }, hotkey: 'M', id: 'research_masonry', label: 'Masonry 55g 35l' },
    { action: { researchId: 'guardTowerDamage', type: 'request_research' }, hotkey: 'G', id: 'research_guard', label: 'Guard Dmg 70g 50l' },
    { action: { researchId: 'arcaneTowerDamage', type: 'request_research' }, hotkey: 'A', id: 'research_arcane', label: 'Arcane Dmg 80g 60l' },
    { action: { researchId: 'dogDamage', type: 'request_research' }, hotkey: 'D', id: 'research_dog_damage', label: 'Dog Dmg 60g 30l' },
    { action: { researchId: 'dogSpeedClaw', type: 'request_research' }, hotkey: 'C', id: 'research_dog_speed', label: 'Dog Claw 80g 50l' },
    { action: { type: 'cancel_selected_research' }, hotkey: 'X', id: 'cancel_research', label: 'Cancel Research' },
    { action: { page: 'root', type: 'open_page' }, hotkey: 'B', id: 'back', label: 'Back' },
];

const BUILD_PAGE: readonly CommandCardButton[] = [
    {
        action: { buildingId: 'fence_wood', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'F',
        id: 'build_fence',
        label: 'Fence 8g',
    },
    {
        action: { buildingId: 'tower_scout', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'T',
        id: 'build_tower',
        label: 'Scout Tower 32g',
    },
    {
        action: { buildingId: 'farm_house', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'H',
        id: 'build_house',
        label: 'Farm House 60g',
    },
    {
        action: { buildingId: 'egg_storage', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'C',
        id: 'build_egg_storage',
        label: 'Egg Storage 60g',
    },
    {
        action: { buildingId: 'well_basic', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'W',
        id: 'build_well',
        label: 'Well 30g',
    },
    {
        action: { buildingId: 'market', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'M',
        id: 'build_market',
        label: 'Market 18g',
    },
    {
        action: { page: 'growth', type: 'open_page' },
        hotkey: 'G',
        id: 'growth_page',
        label: 'Growth builds',
    },
    {
        action: { page: 'root', type: 'open_page' },
        hotkey: 'Esc',
        id: 'back',
        label: 'Back',
    },
];

const GROWTH_PAGE: readonly CommandCardButton[] = [
    {
        action: { buildingId: 'lumber_mill', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'L',
        id: 'build_lumber_mill',
        label: 'Mill 84g (Farm)',
    },
    {
        action: { buildingId: 'gate_wood', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'G',
        id: 'build_gate',
        label: 'Gate 18g (Arcane)',
    },
    {
        action: { buildingId: 'power_generator', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'P',
        id: 'build_power_generator',
        label: 'Generator 120g 102l',
    },
    {
        action: { buildingId: 'tower_arcane_small', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'R',
        id: 'build_arcane_tower',
        label: 'Arcane Tower 76g 66l',
    },
    {
        action: { buildingId: 'workshop_lab', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'W',
        id: 'build_workshop',
        label: 'Workshop 136g 85l',
    },
    {
        action: { buildingId: 'blacksmith', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'S',
        id: 'build_blacksmith',
        label: 'Blacksmith 70g 35l',
    },
    {
        action: { buildingId: 'mercenary_barracks', type: 'start_build_placement' },
        enabledWhenBuilderSelected: true,
        hotkey: 'M',
        id: 'build_mercenary_barracks',
        label: 'Mercenary 84g 24l',
    },
    {
        action: { page: 'build', type: 'open_page' },
        hotkey: 'B',
        id: 'back_build',
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
        if (this.page === 'growth' && selectionKind === 'builder_unit') return GROWTH_PAGE;
        if (this.page === 'research' && selectionKind === 'complete_building') return RESEARCH_PAGE;
        if (selectionKind === 'constructing_building') return CONSTRUCTING_BUILDING_PAGE;
        if (selectionKind === 'economy_coop') return ECONOMY_COOP_PAGE;
        if (selectionKind === 'market_building') return MARKET_BUILDING_PAGE;
        if (selectionKind === 'builder_unit') return ROOT_PAGE;
        if (selectionKind === 'generic_unit') return GENERIC_UNIT_PAGE;
        if (selectionKind === 'complete_building') return COMPLETE_BUILDING_PAGE;

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
        if (this.page === 'research' && this.getSelectionKind() === 'complete_building') return;
        if (this.page !== 'build' && this.page !== 'growth' && this.page !== 'research') return;
        if (this.getSelectionKind() === 'builder_unit' && this.page !== 'research') return;

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

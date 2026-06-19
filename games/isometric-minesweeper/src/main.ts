import Phaser from 'phaser';
import './styles.css';
import { createWorld, sameTile, type TilePoint, type World } from './ecs/world';
import {
    createBoardLayout,
    DIFFICULTIES,
    type BoardLayout,
    type DifficultyConfig,
} from './game/config';
import {
    clearBestRecords,
    formatRecordTime,
    loadBestRecords,
    saveBestRecord,
    type BestRecords,
} from './game/records';
import { createBoardSystem, updateBoardRenderSystem } from './systems/board';
import {
    chordRevealSystem,
    getMinesLeft,
    revealTileSystem,
    toggleFlagSystem,
} from './systems/minesweeper';
import { clearHoveredTileSystem, updateHoveredTileSystem } from './systems/pointer';
import {
    renderBoardSystem,
    renderHoverSystem,
    renderTileContentSystem,
    type TileContentRenderState,
} from './systems/render';

const LONG_PRESS_FLAG_MS = 450;
const RIGHT_CLICK_FLAG_DELAY_MS = 80;
const COMPACT_UI_WIDTH = 720;
const LANDSCAPE_SHORT_HEIGHT = 480;
const PORTRAIT_NOTICE_WIDTH = 640;

const POINTER_LEFT_BUTTON = 1;
const POINTER_RIGHT_BUTTON = 2;

class BootScene extends Phaser.Scene {
    private boardLayout!: BoardLayout;
    private bestRecords: BestRecords = loadBestRecords();
    private boardGraphics!: Phaser.GameObjects.Graphics;
    private contentState!: TileContentRenderState;
    private difficulty: DifficultyConfig = DIFFICULTIES[1];
    private difficultyButtons: Phaser.GameObjects.Text[] = [];
    private elapsedSeconds = 0;
    private hoverGraphics!: Phaser.GameObjects.Graphics;
    private inputHintText!: Phaser.GameObjects.Text;
    private longPressFlagTriggered = false;
    private longPressTimer: Phaser.Time.TimerEvent | null = null;
    private longPressTile: TilePoint | null = null;
    private newGameButton!: Phaser.GameObjects.Text;
    private orientationNoticeText!: Phaser.GameObjects.Text;
    private pointerDownTile: TilePoint | null = null;
    private resetRecordsButton!: Phaser.GameObjects.Text;
    private rightClickFlagTimer: Phaser.Time.TimerEvent | null = null;
    private rightClickFlagTile: TilePoint | null = null;
    private roundClearedWithNewBest = false;
    private statusText!: Phaser.GameObjects.Text;
    private titleText!: Phaser.GameObjects.Text;
    private timerStartedAt: number | null = null;
    private uiBottomY = 105;
    private world: World = createWorld();

    constructor() {
        super('boot');
    }

    create() {
        this.cameras.main.setBackgroundColor('#182026');
        this.boardLayout = this.createCurrentBoardLayout();
        this.boardGraphics = this.add.graphics();
        this.contentState = {
            graphics: this.add.graphics().setDepth(6),
            labels: [],
        };
        this.hoverGraphics = this.add.graphics().setDepth(5);
        this.world = createWorld();
        this.input.mouse?.disableContextMenu();

        createBoardSystem(this.world, this.boardLayout);
        this.renderUi();
        this.renderGame();
        this.time.addEvent({
            callback: () => {
                if (this.world.resources.gameStatus === 'playing') {
                    this.statusText.setText(this.getStatusText());
                }
            },
            delay: 250,
            loop: true,
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            const hoverChanged = updateHoveredTileSystem(
                this.world,
                pointer.worldX,
                pointer.worldY,
                this.boardLayout,
            );

            if (hoverChanged) {
                renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
            }
        });

        this.input.on('pointerout', () => {
            if (clearHoveredTileSystem(this.world)) {
                renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
            }
            this.cancelLongPress();
            this.cancelPendingFlag();
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isUiPointer(pointer)) return;

            updateHoveredTileSystem(
                this.world,
                pointer.worldX,
                pointer.worldY,
                this.boardLayout,
            );

            const hoveredTile = this.world.resources.hoveredTile;
            if (!hoveredTile) return;

            if (this.isChordPointer(pointer)) {
                this.cancelPendingFlag();
                this.applyTileAction(hoveredTile, 'chord');
                return;
            }

            if (pointer.rightButtonDown() || pointer.button === 2) {
                this.startPendingFlag(hoveredTile);
                return;
            }

            if (this.isTileRevealed(hoveredTile)) {
                this.cancelLongPress();
                this.pointerDownTile = hoveredTile;
                this.longPressFlagTriggered = false;
                return;
            }

            this.startLongPress(pointer, hoveredTile);
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            updateHoveredTileSystem(
                this.world,
                pointer.worldX,
                pointer.worldY,
                this.boardLayout,
            );

            if (this.isChordPointer(pointer) && this.world.resources.hoveredTile) {
                this.cancelLongPress();
                this.cancelPendingFlag();
                this.applyTileAction(this.world.resources.hoveredTile, 'chord');
                return;
            }

            if (!this.pointerDownTile) return;

            const pressedTile = this.pointerDownTile;
            const longPressFlagTriggered = this.longPressFlagTriggered;

            this.cancelLongPress();

            if (longPressFlagTriggered) return;

            const releasedTile = this.world.resources.hoveredTile;
            if (!sameTile(pressedTile, releasedTile)) return;

            this.applyTileAction(
                pressedTile,
                this.isTileRevealed(pressedTile) ? 'chord' : 'reveal',
            );
        });

        this.scale.on('resize', this.handleResize, this);
    }

    private renderUi() {
        this.titleText = this.add
            .text(24, 20, 'Isometric Minesweeper', {
                color: '#f3efe2',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '24px',
                fontStyle: '700',
            })
            .setDepth(10);

        this.inputHintText = this.add
            .text(24, 52, 'Click/tap reveal | Right click/hold flag', {
                color: '#aeb8b4',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
            })
            .setDepth(10);

        this.statusText = this.add
            .text(24, 78, '', {
                color: '#d7ded8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
            })
            .setDepth(10);

        this.orientationNoticeText = this.add
            .text(0, 0, 'Rotate your phone to landscape to play', {
                align: 'center',
                backgroundColor: '#26343c',
                color: '#f3efe2',
                fixedWidth: 280,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
                fontStyle: '700',
                padding: {
                    bottom: 12,
                    left: 14,
                    right: 14,
                    top: 12,
                },
                wordWrap: {
                    width: 252,
                },
            })
            .setDepth(30)
            .setOrigin(0.5);

        this.difficultyButtons = DIFFICULTIES.map((difficulty, index) =>
            this.add
                .text(486 + index * 94, 24, difficulty.label, {
                    align: 'center',
                    backgroundColor: '#26343c',
                    color: '#d7ded8',
                    fixedWidth: 86,
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '12px',
                    fontStyle: '700',
                    padding: {
                        bottom: 8,
                        left: 8,
                        right: 8,
                        top: 8,
                    },
                })
                .setDepth(10)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.setDifficulty(difficulty);
                }),
        );

        this.newGameButton = this.add
            .text(774, 24, 'New game', {
                backgroundColor: '#26343c',
                color: '#f3efe2',
                fixedWidth: 104,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
                fontStyle: '700',
                padding: {
                    bottom: 8,
                    left: 14,
                    right: 14,
                    top: 8,
                },
            })
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.resetGame();
            });

        this.resetRecordsButton = this.add
            .text(650, 64, 'Reset records', {
                backgroundColor: '#26343c',
                color: '#aeb8b4',
                fixedWidth: 126,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '12px',
                fontStyle: '700',
                padding: {
                    bottom: 7,
                    left: 10,
                    right: 10,
                    top: 7,
                },
            })
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                clearBestRecords();
                this.bestRecords = {};
                this.roundClearedWithNewBest = false;
                this.renderGame();
            });

        this.updateUiLayout();
        this.updateDifficultyButtons();
    }

    private renderGame() {
        renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
        renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
        this.contentState = renderTileContentSystem(
            this.world,
            this,
            this.contentState,
            this.boardLayout,
        );
        this.statusText.setColor(this.getStatusColor());
        this.statusText.setText(this.getStatusText());
    }

    private getStatusText() {
        const flagCount = this.world.flags.size;
        const minesLeft = getMinesLeft(this.world, this.boardLayout);
        const elapsedTime = this.formatElapsedTime();
        const prefix = `${this.difficulty.label} | ${elapsedTime} | Best ${this.getBestTimeText()}`;

        if (this.world.resources.gameStatus === 'ready') {
            return `${prefix} | Ready | Mines left ${minesLeft} | Flags ${flagCount}`;
        }

        if (this.world.resources.gameStatus === 'lost') {
            return `${prefix} | Game over | Mines left ${minesLeft} | Flags ${flagCount}`;
        }

        if (this.world.resources.gameStatus === 'won') {
            const clearLabel = this.roundClearedWithNewBest ? 'New best' : 'Clear';

            return `${prefix} | ${clearLabel} | Mines left ${minesLeft} | Flags ${flagCount}`;
        }

        return `${prefix} | Playing | Mines left ${minesLeft} | Flags ${flagCount}`;
    }

    private getStatusColor() {
        if (this.world.resources.gameStatus === 'lost') return '#f0a6a6';
        if (this.world.resources.gameStatus === 'won') return '#f3d36b';
        if (this.world.resources.gameStatus === 'playing') return '#d7ded8';

        return '#aeb8b4';
    }

    private resetGame() {
        this.resetTimer();
        this.roundClearedWithNewBest = false;
        this.world = createWorld();
        createBoardSystem(this.world, this.boardLayout);
        clearHoveredTileSystem(this.world);
        this.cancelLongPress();
        this.cancelPendingFlag();
        this.renderGame();
    }

    private setDifficulty(difficulty: DifficultyConfig) {
        if (this.difficulty.id === difficulty.id) return;

        this.difficulty = difficulty;
        this.boardLayout = this.createCurrentBoardLayout();
        this.updateDifficultyButtons();
        this.resetGame();
    }

    private applyTileAction(tile: TilePoint, action: 'chord' | 'flag' | 'reveal') {
        const previousStatus = this.world.resources.gameStatus;
        const result =
            action === 'flag'
                ? toggleFlagSystem(this.world, tile)
                : action === 'chord'
                  ? chordRevealSystem(this.world, tile, this.boardLayout)
                  : revealTileSystem(this.world, tile, this.boardLayout);

        if (!result.changed) return;

        this.syncTimerAfterAction(previousStatus);
        this.renderGame();
    }

    private isTileRevealed(tile: TilePoint) {
        const entityId = this.world.tileEntities.get(`${tile.x},${tile.y}`);
        if (!entityId) return false;

        return this.world.tiles.get(entityId)?.revealed ?? false;
    }

    private startLongPress(pointer: Phaser.Input.Pointer, tile: TilePoint) {
        this.cancelLongPress();
        this.cancelPendingFlag();
        this.pointerDownTile = tile;
        this.longPressTile = tile;
        this.longPressFlagTriggered = false;

        this.longPressTimer = this.time.delayedCall(LONG_PRESS_FLAG_MS, () => {
            if (!this.longPressTile || pointer.rightButtonDown() || pointer.button === 2) return;

            this.longPressFlagTriggered = true;
            this.applyTileAction(this.longPressTile, 'flag');
        });
    }

    private cancelLongPress() {
        this.longPressTimer?.remove(false);
        this.longPressTimer = null;
        this.longPressTile = null;
        this.pointerDownTile = null;
    }

    private startPendingFlag(tile: TilePoint) {
        this.cancelLongPress();
        this.cancelPendingFlag();
        this.rightClickFlagTile = tile;
        this.rightClickFlagTimer = this.time.delayedCall(
            RIGHT_CLICK_FLAG_DELAY_MS,
            () => {
                if (!this.rightClickFlagTile) return;

                const tileToFlag = this.rightClickFlagTile;
                this.rightClickFlagTile = null;
                this.rightClickFlagTimer = null;
                this.applyTileAction(tileToFlag, 'flag');
            },
        );
    }

    private cancelPendingFlag() {
        this.rightClickFlagTimer?.remove(false);
        this.rightClickFlagTimer = null;
        this.rightClickFlagTile = null;
    }

    private isChordPointer(pointer: Phaser.Input.Pointer) {
        return (
            (pointer.buttons & (POINTER_LEFT_BUTTON | POINTER_RIGHT_BUTTON)) ===
            (POINTER_LEFT_BUTTON | POINTER_RIGHT_BUTTON)
        );
    }

    private handleResize() {
        this.boardLayout = this.createCurrentBoardLayout();
        updateBoardRenderSystem(this.world, this.boardLayout);
        this.updateUiLayout();
        this.renderGame();
    }

    private createCurrentBoardLayout() {
        const compact = this.isCompactViewport();
        const tileWidthLimit = this.getHeightBoundTileWidth();
        const layout = createBoardLayout(
            Math.max(280, this.scale.width - (compact ? 64 : 0)),
            this.difficulty,
            this.getBoardOriginY(),
            tileWidthLimit,
        );

        return {
            ...layout,
            originX: this.scale.width / 2,
        };
    }

    private getBoardOriginY() {
        if (this.isPortraitNoticeVisible()) return 230;
        if (this.isLandscapeShortViewport()) return 112;
        if (this.isCompactViewport()) return 220;

        return 130;
    }

    private getHeightBoundTileWidth() {
        const bottomPadding = this.isLandscapeShortViewport() ? 18 : 36;
        const availableHeight = Math.max(
            120,
            this.scale.height - this.getBoardOriginY() - bottomPadding,
        );
        const maxTileHeight = Math.floor(
            (availableHeight * 2) /
                (this.difficulty.boardWidth + this.difficulty.boardHeight - 1),
        );

        return Math.max(24, maxTileHeight * 2);
    }

    private updateUiLayout() {
        const compact = this.isCompactViewport();
        const landscapeShort = this.isLandscapeShortViewport();
        const rightPadding = 24;
        const buttonGap = compact ? 8 : 10;
        const difficultyButtonWidth = compact ? 82 : 86;
        const newGameButtonWidth = compact ? 96 : 104;
        const resetRecordsButtonWidth = compact ? 112 : 126;
        const difficultyY = landscapeShort ? 16 : compact ? 108 : 24;
        const newGameY = landscapeShort ? 52 : compact ? 148 : 24;
        const resetRecordsY = landscapeShort ? 52 : compact ? 148 : 64;
        const difficultyStartX = compact
            ? 24
            : Math.max(360, this.scale.width - 414);

        this.uiBottomY = landscapeShort ? 92 : compact ? 198 : 105;

        this.titleText.setVisible(!landscapeShort);
        this.inputHintText.setVisible(!landscapeShort);

        this.titleText.setPosition(24, landscapeShort ? 14 : 18);
        this.titleText.setStyle({
            fontSize: landscapeShort ? '18px' : '24px',
        });
        this.inputHintText.setPosition(24, landscapeShort ? 39 : compact ? 48 : 52);
        this.inputHintText.setStyle({
            fontSize: landscapeShort ? '12px' : '14px',
        });
        this.statusText.setPosition(
            landscapeShort ? 136 : 24,
            landscapeShort ? 62 : compact ? 76 : 78,
        );
        this.statusText.setWordWrapWidth(
            compact ? Math.max(260, this.scale.width - 48) : this.scale.width - 48,
            true,
        );
        this.statusText.setStyle({
            fontSize: landscapeShort ? '12px' : '14px',
        });

        this.difficultyButtons.forEach((button, index) => {
            button.setPosition(
                difficultyStartX + index * (difficultyButtonWidth + buttonGap),
                difficultyY,
            );
            button.setStyle({
                fixedWidth: difficultyButtonWidth,
                fontSize: compact ? '11px' : '12px',
            });
        });

        this.newGameButton.setPosition(
            compact
                ? 24
                : Math.max(
                      24,
                      this.scale.width - rightPadding - newGameButtonWidth,
                  ),
            newGameY,
        );
        this.newGameButton.setStyle({
            fixedWidth: newGameButtonWidth,
            fontSize: compact ? '12px' : '14px',
        });

        this.resetRecordsButton.setPosition(
            landscapeShort
                ? 24 + newGameButtonWidth + 16
                : compact
                  ? 24 + newGameButtonWidth + 12
                  : Math.max(
                        24,
                        this.scale.width - rightPadding - resetRecordsButtonWidth,
                    ),
            resetRecordsY,
        );
        this.resetRecordsButton.setStyle({
            fixedWidth: resetRecordsButtonWidth,
            fontSize: compact ? '11px' : '12px',
        });
        this.resetRecordsButton.setVisible(!landscapeShort);

        this.orientationNoticeText.setPosition(
            this.scale.width / 2,
            this.isPortraitNoticeVisible()
                ? Math.min(this.scale.height - 120, 226)
                : Math.min(this.scale.height - 80, 170),
        );
        this.orientationNoticeText.setVisible(this.isPortraitNoticeVisible());
    }

    private isCompactViewport() {
        return (
            this.scale.width < COMPACT_UI_WIDTH ||
            this.scale.height < LANDSCAPE_SHORT_HEIGHT
        );
    }

    private isLandscapeShortViewport() {
        return (
            this.scale.width > this.scale.height &&
            this.scale.height < LANDSCAPE_SHORT_HEIGHT
        );
    }

    private isPortraitNoticeVisible() {
        return (
            this.scale.width < PORTRAIT_NOTICE_WIDTH &&
            this.scale.height > this.scale.width
        );
    }

    private syncTimerAfterAction(previousStatus: string) {
        if (
            previousStatus === 'ready' &&
            this.world.resources.minefieldReady &&
            this.timerStartedAt === null
        ) {
            this.startTimer();
        }

        if (
            this.world.resources.gameStatus === 'won' ||
            this.world.resources.gameStatus === 'lost'
        ) {
            this.stopTimer();

            if (this.world.resources.gameStatus === 'won') {
                this.saveCurrentBestRecord();
            }
        }
    }

    private startTimer() {
        this.elapsedSeconds = 0;
        this.timerStartedAt = this.time.now;
    }

    private stopTimer() {
        this.elapsedSeconds = this.getElapsedSeconds();
        this.timerStartedAt = null;
    }

    private resetTimer() {
        this.elapsedSeconds = 0;
        this.timerStartedAt = null;
    }

    private getElapsedSeconds() {
        if (this.timerStartedAt === null) return this.elapsedSeconds;

        return Math.floor((this.time.now - this.timerStartedAt) / 1000);
    }

    private formatElapsedTime() {
        return formatRecordTime(this.getElapsedSeconds());
    }

    private getBestTimeText() {
        const bestRecord = this.bestRecords[this.difficulty.id];

        return bestRecord ? formatRecordTime(bestRecord.elapsedSeconds) : '--:--';
    }

    private saveCurrentBestRecord() {
        const result = saveBestRecord(
            this.difficulty.id,
            this.elapsedSeconds,
        );

        this.bestRecords = result.records;
        this.roundClearedWithNewBest = result.updated;
    }

    private updateDifficultyButtons() {
        this.difficultyButtons.forEach((button, index) => {
            const selected = DIFFICULTIES[index].id === this.difficulty.id;

            button.setStyle({
                backgroundColor: selected ? '#d9b85f' : '#26343c',
                color: selected ? '#182026' : '#d7ded8',
            });
        });
    }

    private isUiPointer(pointer: Phaser.Input.Pointer) {
        return this.isPortraitNoticeVisible() || pointer.worldY < this.uiBottomY;
    }
}

new Phaser.Game({
    backgroundColor: '#182026',
    parent: 'game',
    scene: [BootScene],
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        height: 560,
        mode: Phaser.Scale.RESIZE,
        width: 900,
    },
    type: Phaser.AUTO,
});

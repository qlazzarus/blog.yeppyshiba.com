import Phaser from 'phaser';
import './styles.css';
import { createWorld, type World } from './ecs/world';
import {
    createBoardLayout,
    DIFFICULTIES,
    type BoardLayout,
    type DifficultyConfig,
} from './game/config';
import { createBoardSystem } from './systems/board';
import { getMinesLeft, revealTileSystem, toggleFlagSystem } from './systems/minesweeper';
import { clearHoveredTileSystem, updateHoveredTileSystem } from './systems/pointer';
import {
    renderBoardSystem,
    renderHoverSystem,
    renderTileContentSystem,
    type TileContentRenderState,
} from './systems/render';

class BootScene extends Phaser.Scene {
    private boardLayout!: BoardLayout;
    private boardGraphics!: Phaser.GameObjects.Graphics;
    private contentState!: TileContentRenderState;
    private difficulty: DifficultyConfig = DIFFICULTIES[1];
    private difficultyButtons: Phaser.GameObjects.Text[] = [];
    private elapsedSeconds = 0;
    private hoverGraphics!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private timerStartedAt: number | null = null;
    private world: World = createWorld();

    constructor() {
        super('boot');
    }

    create() {
        this.cameras.main.setBackgroundColor('#182026');
        this.boardLayout = createBoardLayout(this.scale.width, this.difficulty);
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

            const previousStatus = this.world.resources.gameStatus;
            const result =
                pointer.rightButtonDown() || pointer.button === 2
                    ? toggleFlagSystem(this.world, hoveredTile)
                    : revealTileSystem(this.world, hoveredTile, this.boardLayout);

            if (!result.changed) return;

            this.syncTimerAfterAction(previousStatus);
            this.renderGame();
        });
    }

    private renderUi() {
        this.add
            .text(24, 20, 'Isometric Minesweeper', {
                color: '#f3efe2',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '24px',
                fontStyle: '700',
            })
            .setDepth(10);

        this.add
            .text(24, 52, 'Left click reveal | Right click flag', {
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

        this.add
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
        const prefix = `${this.difficulty.label} | ${elapsedTime}`;

        if (this.world.resources.gameStatus === 'ready') {
            return `${prefix} | Ready | Mines left ${minesLeft} | Flags ${flagCount}`;
        }

        if (this.world.resources.gameStatus === 'lost') {
            return `${prefix} | Game over | Mines left ${minesLeft} | Flags ${flagCount}`;
        }

        if (this.world.resources.gameStatus === 'won') {
            return `${prefix} | Clear | Mines left ${minesLeft} | Flags ${flagCount}`;
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
        this.world = createWorld();
        createBoardSystem(this.world, this.boardLayout);
        this.renderGame();
    }

    private setDifficulty(difficulty: DifficultyConfig) {
        if (this.difficulty.id === difficulty.id) return;

        this.difficulty = difficulty;
        this.boardLayout = createBoardLayout(this.scale.width, difficulty);
        this.updateDifficultyButtons();
        this.resetGame();
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
        const elapsed = this.getElapsedSeconds();
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');

        return `${minutes}:${seconds}`;
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
        return pointer.worldY < 105;
    }
}

new Phaser.Game({
    backgroundColor: '#182026',
    parent: 'game',
    scene: [BootScene],
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        height: 560,
        mode: Phaser.Scale.FIT,
        width: 900,
    },
    type: Phaser.AUTO,
});

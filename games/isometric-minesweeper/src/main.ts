import Phaser from 'phaser';
import './styles.css';
import { createWorld, type World } from './ecs/world';
import { createBoardLayout, type BoardLayout } from './game/config';
import { createBoardSystem } from './systems/board';
import { revealTileSystem, toggleFlagSystem } from './systems/minesweeper';
import { clearHoveredTileSystem, updateHoveredTileSystem } from './systems/pointer';
import { renderBoardSystem, renderHoverSystem, renderTileContentSystem } from './systems/render';

class BootScene extends Phaser.Scene {
    private boardLayout!: BoardLayout;
    private boardGraphics!: Phaser.GameObjects.Graphics;
    private hoverGraphics!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private tileLabels: Phaser.GameObjects.Text[] = [];
    private world: World = createWorld();

    constructor() {
        super('boot');
    }

    create() {
        this.cameras.main.setBackgroundColor('#182026');
        this.boardLayout = createBoardLayout(this.scale.width);
        this.boardGraphics = this.add.graphics();
        this.hoverGraphics = this.add.graphics().setDepth(5);
        this.world = createWorld();
        this.input.mouse?.disableContextMenu();

        createBoardSystem(this.world, this.boardLayout);
        this.renderUi();
        this.renderGame();

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
            updateHoveredTileSystem(
                this.world,
                pointer.worldX,
                pointer.worldY,
                this.boardLayout,
            );

            const hoveredTile = this.world.resources.hoveredTile;
            if (!hoveredTile) return;

            const result =
                pointer.rightButtonDown() || pointer.button === 2
                    ? toggleFlagSystem(this.world, hoveredTile)
                    : revealTileSystem(this.world, hoveredTile, this.boardLayout);

            if (!result.changed) return;

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
            .text(24, 52, 'Phaser 4 workspace scaffold', {
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
    }

    private renderGame() {
        renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
        renderHoverSystem(this.world, this.hoverGraphics, this.boardLayout);
        this.tileLabels = renderTileContentSystem(this.world, this, this.tileLabels);
        this.statusText.setText(this.getStatusText());
    }

    private getStatusText() {
        const flagCount = this.world.flags.size;

        if (this.world.resources.gameStatus === 'ready') {
            return `Mines ${this.boardLayout.mineCount} | Left click to start, right click to flag`;
        }

        if (this.world.resources.gameStatus === 'lost') {
            return `Game over | Mines ${this.boardLayout.mineCount} | Flags ${flagCount}`;
        }

        if (this.world.resources.gameStatus === 'won') {
            return `Clear | Mines ${this.boardLayout.mineCount} | Flags ${flagCount}`;
        }

        return `Playing | Mines ${this.boardLayout.mineCount} | Flags ${flagCount}`;
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

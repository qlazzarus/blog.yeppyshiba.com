import Phaser from 'phaser';
import './styles.css';
import { createWorld, type World } from './ecs/world';
import { createBoardLayout, type BoardLayout } from './game/config';
import { createBoardSystem } from './systems/board';
import { clearHoveredTileSystem, updateHoveredTileSystem } from './systems/pointer';
import { renderBoardSystem, renderHoverSystem } from './systems/render';

class BootScene extends Phaser.Scene {
    private boardLayout!: BoardLayout;
    private boardGraphics!: Phaser.GameObjects.Graphics;
    private hoverGraphics!: Phaser.GameObjects.Graphics;
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

        createBoardSystem(this.world, this.boardLayout);
        renderBoardSystem(this.world, this.boardGraphics, this.boardLayout);
        this.renderUi();

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

import Phaser from 'phaser';

const DEFAULT_DRAG_SELECT_THRESHOLD_PX = 8;

type DragSelectionState = {
    readonly pointerId: number;
    readonly startScreenX: number;
    readonly startScreenY: number;
    readonly startWorldX: number;
    readonly startWorldY: number;
};

type DragSelectionInputSystemConfig = {
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly onClick: (point: Phaser.Math.Vector2) => void;
    readonly onDragSelect: (rect: Phaser.Geom.Rectangle) => void;
    readonly scene: Phaser.Scene;
    readonly viewportHeight: number;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly thresholdPx?: number;
};

export class DragSelectionInputSystem {
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly onClick: (point: Phaser.Math.Vector2) => void;
    private readonly onDragSelect: (rect: Phaser.Geom.Rectangle) => void;
    private readonly scene: Phaser.Scene;
    private readonly thresholdPx: number;
    private readonly viewportHeight: number;
    private dragSelection?: DragSelectionState;

    constructor(config: DragSelectionInputSystemConfig) {
        this.camera = config.camera;
        this.onClick = config.onClick;
        this.onDragSelect = config.onDragSelect;
        this.scene = config.scene;
        this.thresholdPx = config.thresholdPx ?? DEFAULT_DRAG_SELECT_THRESHOLD_PX;
        this.viewportHeight = config.viewportHeight;
        this.graphics = config.scene.add.graphics().setDepth(49);
        config.worldObjects.push(this.graphics);
    }

    bind() {
        this.scene.input.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer),
        );
        this.scene.input.on(
            Phaser.Input.Events.POINTER_MOVE,
            (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer),
        );
        this.scene.input.on(
            Phaser.Input.Events.POINTER_UP,
            (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer),
        );
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer) {
        if (pointer.rightButtonDown()) return;
        if (!this.isInWorldViewport(pointer)) return;

        const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
        this.dragSelection = {
            pointerId: pointer.id,
            startScreenX: pointer.x,
            startScreenY: pointer.y,
            startWorldX: worldPoint.x,
            startWorldY: worldPoint.y,
        };
        this.graphics.clear();
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.dragSelection || pointer.id !== this.dragSelection.pointerId) return;
        if (!this.isDragSelectionActive(pointer)) {
            this.graphics.clear();
            return;
        }

        this.drawDragSelectionRect(this.getDragSelectionRect(pointer));
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer) {
        if (!this.dragSelection || pointer.id !== this.dragSelection.pointerId) return;

        const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
        if (!this.isDragSelectionActive(pointer)) {
            this.onClick(worldPoint);
            this.clearDragSelection();
            return;
        }

        this.onDragSelect(this.getDragSelectionRect(pointer));
        this.clearDragSelection();
    }

    private clearDragSelection() {
        this.dragSelection = undefined;
        this.graphics.clear();
    }

    private isInWorldViewport(pointer: Phaser.Input.Pointer) {
        return pointer.y <= this.viewportHeight;
    }

    private isDragSelectionActive(pointer: Phaser.Input.Pointer) {
        const drag = this.dragSelection;
        if (!drag) return false;

        return (
            Phaser.Math.Distance.Squared(
                drag.startScreenX,
                drag.startScreenY,
                pointer.x,
                pointer.y,
            ) >=
            this.thresholdPx * this.thresholdPx
        );
    }

    private getDragSelectionRect(pointer: Phaser.Input.Pointer) {
        const drag = this.dragSelection;
        const endWorld = this.camera.getWorldPoint(pointer.x, pointer.y);
        const startX = drag?.startWorldX ?? endWorld.x;
        const startY = drag?.startWorldY ?? endWorld.y;
        const x = Math.min(startX, endWorld.x);
        const y = Math.min(startY, endWorld.y);
        const width = Math.abs(endWorld.x - startX);
        const height = Math.abs(endWorld.y - startY);

        return new Phaser.Geom.Rectangle(x, y, width, height);
    }

    private drawDragSelectionRect(rect: Phaser.Geom.Rectangle) {
        this.graphics.clear();
        this.graphics.fillStyle(0x56d47a, 0.11);
        this.graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
        this.graphics.lineStyle(2, 0xa7ffc0, 0.86);
        this.graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
}

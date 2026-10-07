import Phaser from 'phaser';

import { MARKER_STYLES } from '../config';
import type {
    InitialPlacementEntity,
    InitialPlacementRegistry,
} from './initialPlacementRegistry';

/** Keeps temporary geometric scene views in lockstep with initial placement data. */
export class InitialPlacementViewSystem {
    private readonly views = new Map<string, Phaser.GameObjects.Container>();

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly worldObjects: Phaser.GameObjects.GameObject[],
    ) {}

    get size() {
        return this.views.size;
    }

    sync(registry: InitialPlacementRegistry) {
        const entities = registry.list();
        const activeIds = new Set(entities.map((entity) => entity.id));

        for (const [id, view] of this.views) {
            if (activeIds.has(id)) continue;
            view.destroy();
            this.views.delete(id);
            const index = this.worldObjects.indexOf(view);
            if (index >= 0) this.worldObjects.splice(index, 1);
        }

        for (const entity of entities) {
            if (this.views.has(entity.id)) continue;
            const view = this.createView(entity);
            this.views.set(entity.id, view);
            this.worldObjects.push(view);
        }
    }

    dispose() {
        for (const view of this.views.values()) {
            view.destroy();
            const index = this.worldObjects.indexOf(view);
            if (index >= 0) this.worldObjects.splice(index, 1);
        }
        this.views.clear();
    }

    private createView(entity: InitialPlacementEntity) {
        const marker = MARKER_STYLES[entity.role];
        const radius = marker.radius * 0.65;
        const shadow = this.scene.add.ellipse(0, radius + 3, radius * 2, radius, 0x000000, 0.3);
        const body = this.scene.add.circle(0, 0, radius, marker.color, 0.88);
        body.setStrokeStyle(2, 0x101010, 0.9);
        const label = this.scene.add
            .text(0, 0, marker.label, {
                color: '#101010',
                fontFamily: 'system-ui, sans-serif',
                fontSize: marker.label.length > 2 ? '9px' : '11px',
                fontStyle: '700',
            })
            .setOrigin(0.5);
        const rawcode = this.scene.add
            .text(0, radius + 7, entity.rawcode, {
                backgroundColor: 'rgba(8, 8, 8, 0.72)',
                color: '#f5e6ff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '10px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setOrigin(0.5, 0);

        return this.scene.add
            .container(entity.worldPosition.x, entity.worldPosition.y, [shadow, body, label, rawcode])
            .setDepth(7)
            .setName(entity.id);
    }
}

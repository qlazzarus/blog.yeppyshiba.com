import Phaser from 'phaser';

import { MARKER_STYLES } from '../config';
import type { PlayerStart, WorldMarker } from '../ecs/components';

type ObjectLayerRenderConfig = {
    readonly layerName: string;
    readonly map: Phaser.Tilemaps.Tilemap;
    readonly playerStarts: PlayerStart[];
    readonly scene: Phaser.Scene;
    readonly worldMarkers: WorldMarker[];
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldScale: number;
};

export function createTileLayer(
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
    layerName: string,
    depth: number,
    worldScale: number,
    worldObjects: Phaser.GameObjects.GameObject[],
) {
    const layer = map.createLayer(layerName, tileset, 0, 0);

    if (!layer) {
        throw new Error(`Missing tile layer: ${layerName}`);
    }

    layer.setDepth(depth);
    layer.setScale(worldScale);
    worldObjects.push(layer);

    return layer;
}

export function renderObjectLayer(config: ObjectLayerRenderConfig) {
    const objectLayer = config.map.getObjectLayer(config.layerName);
    if (!objectLayer) return;

    const graphics = config.scene.add
        .graphics()
        .setDepth(config.layerName === 'farm_zones' ? 4 : 5);
    const labelObjects: Phaser.GameObjects.Text[] = [];

    objectLayer.objects.forEach((object) => {
        const x = (object.x ?? 0) * config.worldScale;
        const y = (object.y ?? 0) * config.worldScale;
        const width = (object.width ?? 16) * config.worldScale;
        const height = (object.height ?? 16) * config.worldScale;

        if (object.type === 'farm_zone') {
            renderFarmZone(config, graphics, labelObjects, object, x, y, width, height);
            return;
        }

        renderWorldMarker(config, graphics, labelObjects, object, x, y, width, height);
    });

    config.worldObjects.push(graphics, ...labelObjects);
}

function renderFarmZone(
    config: ObjectLayerRenderConfig,
    graphics: Phaser.GameObjects.Graphics,
    labelObjects: Phaser.GameObjects.Text[],
    object: Phaser.Types.Tilemaps.TiledObject,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    graphics.lineStyle(2, 0xf1d77a, 0.42);
    graphics.fillStyle(0xb98c4a, 0.07);
    graphics.fillRect(x, y, width, height);
    graphics.strokeRect(x, y, width, height);

    const label = config.scene.add
        .text(x + 8, y + 8, String(object.name ?? 'farm'), {
            backgroundColor: 'rgba(28, 22, 12, 0.72)',
            color: '#f5e6ae',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            padding: { bottom: 3, left: 5, right: 5, top: 3 },
        })
        .setDepth(8);
    labelObjects.push(label);

    const playerLabel = getPlayerStartLabel(object.name);
    if (!playerLabel) return;

    const slotId = Number(playerLabel.slice(1));
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    config.playerStarts.push({
        id: slotId,
        label: playerLabel,
        x: centerX,
        y: centerY,
    });

    graphics.lineStyle(2, 0x101010, 0.56);
    graphics.fillStyle(0xf0d45a, 0.34);
    graphics.fillCircle(centerX, centerY, 10);
    graphics.strokeCircle(centerX, centerY, 10);

    const startText = config.scene.add
        .text(centerX, centerY - 1, playerLabel, {
            color: '#f5e6ae',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: '700',
        })
        .setDepth(9)
        .setOrigin(0.5);
    labelObjects.push(startText);
}

function renderWorldMarker(
    config: ObjectLayerRenderConfig,
    graphics: Phaser.GameObjects.Graphics,
    labelObjects: Phaser.GameObjects.Text[],
    object: Phaser.Types.Tilemaps.TiledObject,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    const marker = MARKER_STYLES[object.type ?? ''] ?? {
        color: 0xffffff,
        label: '?',
        radius: 5,
    };
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    config.worldMarkers.push({
        color: marker.color,
        type: object.type ?? 'unknown',
        x: centerX,
        y: centerY,
    });

    graphics.lineStyle(2, 0x101010, 0.9);
    graphics.fillStyle(marker.color, 0.88);
    graphics.fillCircle(centerX, centerY, marker.radius * config.worldScale * 0.65);
    graphics.strokeCircle(centerX, centerY, marker.radius * config.worldScale * 0.65);

    const label = config.scene.add
        .text(centerX, centerY, marker.label, {
            color: '#101010',
            fontFamily: 'system-ui, sans-serif',
            fontSize: marker.label.length > 2 ? '9px' : '11px',
            fontStyle: '700',
        })
        .setDepth(8)
        .setOrigin(0.5);
    labelObjects.push(label);

    if (!object.name) return;

    const nameLabel = config.scene.add
        .text(
            centerX,
            centerY + marker.radius * config.worldScale * 0.65 + 7,
            String(object.name),
            {
                backgroundColor: 'rgba(8, 8, 8, 0.72)',
                color: '#f5e6ff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '10px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            },
        )
        .setDepth(9)
        .setOrigin(0.5, 0);
    labelObjects.push(nameLabel);
}

function getPlayerStartLabel(name: unknown) {
    if (typeof name !== 'string') return null;

    const match = /^farm_p(\d+)$/u.exec(name);
    if (!match) return null;

    return `P${match[1]}`;
}

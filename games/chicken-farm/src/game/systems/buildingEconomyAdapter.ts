import type { PlayerBuilding } from './buildingSystem';
import {
    addEconomyCoop,
    addEconomyWell,
    removeEconomyBuilding,
} from './economySystem';
import type { ChickenFarmEconomyState } from './economyTypes';

/**
 * Bridges a completed world building to its economy capability.  The world
 * building ID is deliberately reused as the economy and inventory ID so
 * selection, footprint, ownership and destruction have one stable key.
 */
export function attachCompletedBuildingEconomy(
    state: ChickenFarmEconomyState,
    building: PlayerBuilding,
) {
    const position = {
        x: building.footprint.x + building.footprint.width / 2,
        y: building.footprint.y + building.footprint.height / 2,
    };

    if (building.templateId === 'coop_basic') {
        return addEconomyCoop(state, {
            id: building.id,
            kind: 'basic',
            ownerPlayerId: building.ownerPlayerId,
            position,
        });
    }
    if (building.templateId === 'coop_mid') {
        return addEconomyCoop(state, {
            id: building.id,
            kind: 'mid',
            ownerPlayerId: building.ownerPlayerId,
            position,
        });
    }
    if (building.templateId === 'coop_high') {
        return addEconomyCoop(state, {
            id: building.id,
            kind: 'high',
            ownerPlayerId: building.ownerPlayerId,
            position,
        });
    }
    if (building.templateId === 'well_basic' || building.templateId === 'campfire') {
        return addEconomyWell(state, {
            id: building.id,
            kind: 'basic',
            ownerPlayerId: building.ownerPlayerId,
            position,
        });
    }
    return null;
}

export function detachBuildingEconomy(
    state: ChickenFarmEconomyState,
    building: Pick<PlayerBuilding, 'id'>,
) {
    return removeEconomyBuilding(state, building.id);
}

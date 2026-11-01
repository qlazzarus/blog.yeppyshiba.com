import type { PlayerBuilding } from './buildingSystem';
import {
    addEconomyCoop,
    addEconomyLumberMill,
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
    if (building.state !== 'complete') return null;
    if (
        state.coops.some((candidate) => candidate.id === building.id) ||
        state.wells.some((candidate) => candidate.id === building.id) ||
        state.lumberMills.some((candidate) => candidate.id === building.id)
    ) {
        return null;
    }

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
    if (
        building.templateId === 'lumber_mill' ||
        building.templateId === 'lumber_mill_mid' ||
        building.templateId === 'lumber_mill_high'
    ) {
        return addEconomyLumberMill(state, {
            activeFromSec: building.completedAtSec ?? building.startedAtSec,
            id: building.id,
            ownerPlayerId: building.ownerPlayerId,
            templateId: building.templateId,
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

/**
 * Applies an already-authorized world upgrade to its derived economy record.
 * It deliberately mutates the existing record: coops retain eggs, inventory
 * and hatch jobs; lumber mills retain their global income phase.
 */
export function upgradeCompletedBuildingEconomy(
    state: ChickenFarmEconomyState,
    building: PlayerBuilding,
) {
    if (building.state !== 'complete') return null;
    const position = {
        x: building.footprint.x + building.footprint.width / 2,
        y: building.footprint.y + building.footprint.height / 2,
    };
    const coopKind = coopKindForTemplate(building.templateId);
    if (coopKind) {
        const coop = state.coops.find((candidate) => candidate.id === building.id);
        if (!coop) {
            // egg_storage has no runtime coop capability before its direct
            // upgrade; its target begins with a fresh, stable-ID inventory.
            return addEconomyCoop(state, {
                id: building.id,
                kind: coopKind,
                ownerPlayerId: building.ownerPlayerId,
                position,
            }) ? 'coop' as const : null;
        }
        if (coop.ownerPlayerId !== building.ownerPlayerId) return null;
        coop.kind = coopKind;
        coop.position = position;
        return 'coop' as const;
    }

    if (building.templateId === 'lumber_mill' || building.templateId === 'lumber_mill_mid' || building.templateId === 'lumber_mill_high') {
        const mill = state.lumberMills.find((candidate) => candidate.id === building.id);
        if (!mill || mill.ownerPlayerId !== building.ownerPlayerId) return null;
        // Do not touch activeFromSec or lastLumberIncomeTickSec: the global
        // 30-second schedule is continuous across a tier change.
        mill.templateId = building.templateId;
        return 'lumber_mill' as const;
    }

    if (building.templateId === 'market' || building.templateId === 'grand_market') {
        // Markets have no separate economy entity; existing interaction jobs
        // resolve the stable world-building ID and already accept both tiers.
        return 'market' as const;
    }

    if (building.templateId === 'well_basic' || building.templateId === 'campfire') {
        const well = state.wells.find((candidate) => candidate.id === building.id);
        if (!well || well.ownerPlayerId !== building.ownerPlayerId) return null;
        well.position = position;
        return 'well' as const;
    }
    return null;
}

function coopKindForTemplate(templateId: PlayerBuilding['templateId']) {
    if (templateId === 'coop_basic') return 'basic' as const;
    if (templateId === 'coop_mid') return 'mid' as const;
    if (templateId === 'coop_high') return 'high' as const;
    return null;
}

import { GROWTH_BUILDING_RULES } from '../growthProgression';
import type { MvpBuildingId } from '../balanceTypes';
import type { PlayerWallet } from './playerWallet';

export type SupplyEntityKind = 'building' | 'chicken' | 'dog' | 'farmer';

export type SupplyEntity = {
    readonly id: string;
    readonly kind: SupplyEntityKind;
    readonly ownerPlayerId: number;
    readonly supply: number;
};

/**
 * Canonical ownership ledger for live supply.  Registration is idempotent so
 * duplicate completion/removal callbacks cannot alter a wallet twice.
 */
export class SupplyLifecycle {
    private readonly entities = new Map<string, SupplyEntity>();

    constructor(
        private readonly getWallet: (ownerPlayerId: number) => PlayerWallet | null,
    ) {}

    register(entity: SupplyEntity) {
        if (this.entities.has(entity.id) || entity.supply < 0) return false;
        const wallet = this.getWallet(entity.ownerPlayerId);
        if (!wallet) return false;
        this.entities.set(entity.id, { ...entity });
        wallet.supplyCap += entity.kind === 'building' ? entity.supply : 0;
        wallet.supplyUsed += entity.kind === 'building' ? 0 : entity.supply;
        return true;
    }

    unregister(id: string) {
        const entity = this.entities.get(id);
        if (!entity) return false;
        this.entities.delete(id);
        const wallet = this.getWallet(entity.ownerPlayerId);
        if (!wallet) return true;
        if (entity.kind === 'building') {
            wallet.supplyCap = Math.max(0, wallet.supplyCap - entity.supply);
        } else {
            wallet.supplyUsed = Math.max(0, wallet.supplyUsed - entity.supply);
        }
        return true;
    }

    registerBuilding(id: string, ownerPlayerId: number, templateId: MvpBuildingId) {
        return this.register({
            id: `building:${id}`,
            kind: 'building',
            ownerPlayerId,
            supply: GROWTH_BUILDING_RULES[templateId].supplyProvided,
        });
    }

    unregisterBuilding(id: string) {
        return this.unregister(`building:${id}`);
    }

    /** Replaces a completed building tier without transiently dropping its ID. */
    replaceBuilding(id: string, ownerPlayerId: number, templateId: MvpBuildingId) {
        const entity = this.entities.get(`building:${id}`);
        if (!entity || entity.kind !== 'building' || entity.ownerPlayerId !== ownerPlayerId) {
            return false;
        }
        const wallet = this.getWallet(ownerPlayerId);
        if (!wallet) return false;
        const supply = GROWTH_BUILDING_RULES[templateId].supplyProvided;
        wallet.supplyCap = Math.max(0, wallet.supplyCap + supply - entity.supply);
        this.entities.set(entity.id, { ...entity, supply });
        return true;
    }

    registerChicken(id: string, ownerPlayerId: number) {
        return this.register({ id: `chicken:${id}`, kind: 'chicken', ownerPlayerId, supply: 1 });
    }

    /** Records a chicken whose accepted hatch already converted reserved→used. */
    adoptReservedChicken(id: string, ownerPlayerId: number) {
        const entityId = `chicken:${id}`;
        if (this.entities.has(entityId) || !this.getWallet(ownerPlayerId)) return false;
        this.entities.set(entityId, { id: entityId, kind: 'chicken', ownerPlayerId, supply: 1 });
        return true;
    }

    adoptReservedUnit(id: string, ownerPlayerId: number, kind: 'dog') {
        const entityId = `unit:${id}`;
        if (this.entities.has(entityId) || !this.getWallet(ownerPlayerId)) return false;
        this.entities.set(entityId, { id: entityId, kind, ownerPlayerId, supply: 1 });
        return true;
    }

    unregisterChicken(id: string) {
        return this.unregister(`chicken:${id}`);
    }

    /** Starter farmer/dog are explicitly free under the SP-09-02 0/3 policy. */
    registerStarterUnit(id: string, ownerPlayerId: number, kind: 'dog' | 'farmer') {
        return this.register({ id: `unit:${id}`, kind, ownerPlayerId, supply: 0 });
    }

    getSnapshot(ownerPlayerId: number) {
        return [...this.entities.values()]
            .filter((entity) => entity.ownerPlayerId === ownerPlayerId)
            .map((entity) => ({ ...entity }))
            .sort((left, right) => left.id.localeCompare(right.id));
    }
}

import type { InitialPlacement, PlacementPoint } from '../initialPlacementManifest';

export type InitialPlacementEntity = {
    readonly id: string;
    readonly owner: string;
    readonly rawcode: string;
    readonly role: InitialPlacement['role'];
    readonly sourcePosition: PlacementPoint;
    readonly worldPosition: PlacementPoint;
};

export class InitialPlacementRegistry {
    private readonly entities = new Map<string, InitialPlacementEntity>();

    get size() {
        return this.entities.size;
    }

    initialize(placements: readonly InitialPlacement[]) {
        const ids = new Set<string>();
        for (const placement of placements) {
            if (ids.has(placement.id)) {
                throw new Error(`Duplicate initial placement ID: ${placement.id}`);
            }
            ids.add(placement.id);
        }

        let created = 0;
        for (const placement of placements) {
            if (this.entities.has(placement.id)) continue;

            this.entities.set(placement.id, {
                id: placement.id,
                owner: placement.owner,
                rawcode: placement.rawcode,
                role: placement.role,
                sourcePosition: { ...placement.sourcePosition },
                worldPosition: { ...placement.worldPosition },
            });
            created += 1;
        }
        return created;
    }

    get(id: string) {
        return this.entities.get(id) ?? null;
    }

    list() {
        return [...this.entities.values()];
    }

    remove(id: string) {
        const entity = this.entities.get(id) ?? null;
        if (entity) this.entities.delete(id);
        return entity;
    }

    clear() {
        const removed = this.entities.size;
        this.entities.clear();
        return removed;
    }
}

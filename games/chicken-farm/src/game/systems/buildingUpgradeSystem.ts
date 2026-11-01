import type { MvpBuildingId } from '../balanceTypes';
import type { WalletCost, PlayerWallet } from './playerWallet';
import { canAffordWalletCost, refundWalletCost, spendWalletCost } from './playerWallet';

export type BuildingUpgradeJob = {
    readonly buildingId: string;
    readonly completeAtSec: number;
    readonly cost: WalletCost;
    readonly ownerPlayerId: number;
    readonly sourceTemplateId: MvpBuildingId;
    readonly startedAtSec: number;
    readonly state: 'ready' | 'running';
    readonly targetTemplateId: MvpBuildingId;
};

/** Owns payment/progress only; SP-09-14 performs the target-template swap. */
export class BuildingUpgradeSystem {
    private readonly jobs = new Map<string, BuildingUpgradeJob>();

    constructor(private readonly getWallet: (ownerPlayerId: number) => PlayerWallet | null) {}

    start(request: {
        readonly buildingId: string;
        readonly cost: WalletCost;
        readonly durationSec: number;
        readonly eligible: boolean;
        readonly ownerPlayerId: number;
        readonly sourceTemplateId: MvpBuildingId;
        readonly targetTemplateId: MvpBuildingId;
    }, elapsedSec: number) {
        if (
            !request.eligible ||
            this.jobs.has(request.buildingId) ||
            !Number.isFinite(request.durationSec) ||
            request.durationSec < 0
        ) return null;
        const wallet = this.getWallet(request.ownerPlayerId);
        if (!wallet || !canAffordWalletCost(wallet, request.cost)) return null;
        if (!spendWalletCost(wallet, request.cost)) return null;
        const job: BuildingUpgradeJob = {
            buildingId: request.buildingId,
            completeAtSec: elapsedSec + request.durationSec,
            cost: { ...request.cost },
            ownerPlayerId: request.ownerPlayerId,
            sourceTemplateId: request.sourceTemplateId,
            startedAtSec: elapsedSec,
            state: 'running',
            targetTemplateId: request.targetTemplateId,
        };
        this.jobs.set(job.buildingId, job);
        return { ...job, cost: { ...job.cost } };
    }

    advance(elapsedSec: number) {
        this.jobs.forEach((job, buildingId) => {
            if (job.state === 'running' && elapsedSec >= job.completeAtSec) {
                this.jobs.set(buildingId, { ...job, state: 'ready' });
            }
        });
    }

    has(buildingId: string) {
        return this.jobs.has(buildingId);
    }

    /** Removes only a ready job after its runtime adapter has completed the swap. */
    complete(buildingId: string) {
        const job = this.jobs.get(buildingId);
        if (!job || job.state !== 'ready') return null;
        this.jobs.delete(buildingId);
        return { ...job, cost: { ...job.cost } };
    }

    /** Player cancellation refunds the contract's 75% floor once. */
    cancel(buildingId: string, ownerPlayerId: number) {
        const job = this.jobs.get(buildingId);
        if (!job || job.ownerPlayerId !== ownerPlayerId) return null;
        const wallet = this.getWallet(ownerPlayerId);
        if (!wallet) return null;
        const refund = {
            gold: Math.floor(job.cost.gold * 0.75),
            lumber: Math.floor((job.cost.lumber ?? 0) * 0.75),
        };
        this.jobs.delete(buildingId);
        refundWalletCost(wallet, refund);
        return { job: { ...job, cost: { ...job.cost } }, refund };
    }

    /** Destruction/removal ends an upgrade without refund. */
    discard(buildingId: string) {
        const job = this.jobs.get(buildingId);
        if (!job) return null;
        this.jobs.delete(buildingId);
        return { ...job, cost: { ...job.cost } };
    }

    get(ownerPlayerId?: number) {
        return [...this.jobs.values()]
            .filter((job) => ownerPlayerId === undefined || job.ownerPlayerId === ownerPlayerId)
            .map((job) => ({ ...job, cost: { ...job.cost } }));
    }
}

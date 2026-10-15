import { GROWTH_RESEARCH, type ResearchDefinition } from '../growthProgression';
import type { MvpBuildingId } from '../balanceTypes';
import {
    canAffordWalletCost,
    refundWalletCost,
    spendWalletCost,
    type PlayerWallet,
    type WalletCost,
} from './playerWallet';

export type ResearchId = ResearchDefinition['id'];

export type ResearchJob = {
    readonly completeAtSec: number;
    readonly cost: WalletCost;
    readonly ownerPlayerId: number;
    readonly providerId: string;
    readonly providerTemplateId: MvpBuildingId;
    readonly researchId: ResearchId;
    readonly startedAtSec: number;
    readonly state: 'ready' | 'running';
    readonly targetLevel: number;
};

/**
 * Owns owner-scoped research levels and provider-bound paid jobs. Effects are
 * deliberately applied by later SP-09 runtime adapters after level completion.
 */
export class ResearchQueue {
    private readonly jobs = new Map<string, ResearchJob>();
    private readonly levelsByOwner = new Map<number, Map<ResearchId, number>>();

    constructor(private readonly getWallet: (ownerPlayerId: number) => PlayerWallet | null) {}

    start(request: {
        readonly ownerPlayerId: number;
        readonly providerId: string;
        readonly providerTemplateId: MvpBuildingId;
        readonly researchId: ResearchId;
    }, elapsedSec: number) {
        const definition = GROWTH_RESEARCH[request.researchId];
        if (
            !request.providerId ||
            this.jobs.has(request.providerId) ||
            !(definition.providerTemplateIds as readonly MvpBuildingId[]).includes(request.providerTemplateId)
        ) return null;
        const currentLevel = this.getLevel(request.ownerPlayerId, request.researchId);
        if (
            currentLevel >= definition.maxLevel ||
            this.get().some((job) =>
                job.ownerPlayerId === request.ownerPlayerId && job.researchId === request.researchId,
            )
        ) return null;
        const wallet = this.getWallet(request.ownerPlayerId);
        if (!wallet || !canAffordWalletCost(wallet, definition.costPerLevel)) return null;
        if (!spendWalletCost(wallet, definition.costPerLevel)) return null;
        const job: ResearchJob = {
            completeAtSec: elapsedSec + definition.timePerLevelSec,
            cost: { ...definition.costPerLevel },
            ownerPlayerId: request.ownerPlayerId,
            providerId: request.providerId,
            providerTemplateId: request.providerTemplateId,
            researchId: request.researchId,
            startedAtSec: elapsedSec,
            state: 'running',
            targetLevel: currentLevel + 1,
        };
        this.jobs.set(job.providerId, job);
        return copyJob(job);
    }

    advance(elapsedSec: number) {
        this.jobs.forEach((job, providerId) => {
            if (job.state === 'running' && elapsedSec >= job.completeAtSec) {
                this.jobs.set(providerId, { ...job, state: 'ready' });
            }
        });
    }

    /** Completes exactly the reserved next level, then removes its one job. */
    complete(providerId: string) {
        const job = this.jobs.get(providerId);
        if (!job || job.state !== 'ready') return null;
        if (this.getLevel(job.ownerPlayerId, job.researchId) !== job.targetLevel - 1) return null;
        const levels = this.getOwnerLevels(job.ownerPlayerId);
        levels.set(job.researchId, job.targetLevel);
        this.jobs.delete(providerId);
        return copyJob(job);
    }

    /** Player cancellation returns the full declared research cost once. */
    cancel(providerId: string, ownerPlayerId: number) {
        const job = this.jobs.get(providerId);
        if (!job || job.ownerPlayerId !== ownerPlayerId) return null;
        const wallet = this.getWallet(ownerPlayerId);
        if (!wallet) return null;
        this.jobs.delete(providerId);
        refundWalletCost(wallet, job.cost);
        return copyJob(job);
    }

    /** Provider destruction/removal clears work without a refund. */
    discardProvider(providerId: string) {
        const job = this.jobs.get(providerId);
        if (!job) return null;
        this.jobs.delete(providerId);
        return copyJob(job);
    }

    get(ownerPlayerId?: number) {
        return [...this.jobs.values()]
            .filter((job) => ownerPlayerId === undefined || job.ownerPlayerId === ownerPlayerId)
            .map(copyJob);
    }

    getLevel(ownerPlayerId: number, researchId: ResearchId) {
        return this.levelsByOwner.get(ownerPlayerId)?.get(researchId) ?? 0;
    }

    getLevels(ownerPlayerId: number) {
        return [...(this.levelsByOwner.get(ownerPlayerId) ?? new Map()).entries()]
            .map(([researchId, level]) => ({ level, researchId }))
            .sort((left, right) => left.researchId.localeCompare(right.researchId));
    }

    private getOwnerLevels(ownerPlayerId: number) {
        let levels = this.levelsByOwner.get(ownerPlayerId);
        if (!levels) {
            levels = new Map<ResearchId, number>();
            this.levelsByOwner.set(ownerPlayerId, levels);
        }
        return levels;
    }
}

function copyJob(job: ResearchJob): ResearchJob {
    return { ...job, cost: { ...job.cost } };
}

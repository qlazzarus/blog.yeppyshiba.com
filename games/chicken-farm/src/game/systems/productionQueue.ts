import {
    canAffordWalletCost,
    commitReservedSupply,
    getAvailableSupply,
    refundWalletCost,
    reserveSupply,
    spendWalletCost,
    releaseReservedSupply,
    type PlayerWallet,
    type WalletCost,
} from './playerWallet';

export type ProductionJobState = 'queued' | 'running' | 'exit_wait' | 'complete' | 'cancelled';

export type ProductionJob = {
    readonly completeAtSec: number | null;
    readonly cost: WalletCost;
    readonly durationSec: number;
    readonly id: string;
    readonly ownerPlayerId: number;
    readonly producerId: string;
    readonly recipeId: string;
    readonly startedAtSec: number | null;
    readonly state: ProductionJobState;
    readonly supplyCost: number;
};

export type ProductionEnqueueRequest = {
    readonly cost: WalletCost;
    readonly durationSec: number;
    readonly ownerPlayerId: number;
    readonly producerId: string;
    readonly recipeId: string;
    readonly supplyCost: number;
};

/**
 * Owner-scoped paid production queue. Each producer runs one job at a time;
 * queued jobs are already paid and reserve their result supply at acceptance.
 */
export class ProductionQueue {
    private readonly jobs: ProductionJob[] = [];
    private readonly terminalJobs: ProductionJob[] = [];
    private nextId = 1;

    constructor(
        private readonly getWallet: (ownerPlayerId: number) => PlayerWallet | null,
    ) {}

    enqueue(request: ProductionEnqueueRequest, elapsedSec: number) {
        if (
            !request.producerId ||
            !request.recipeId ||
            !Number.isFinite(request.durationSec) ||
            request.durationSec < 0 ||
            !Number.isFinite(request.supplyCost) ||
            request.supplyCost < 0
        ) {
            return null;
        }
        const wallet = this.getWallet(request.ownerPlayerId);
        if (!wallet || !canAffordWalletCost(wallet, request.cost)) return null;
        if (getAvailableSupply(wallet) < request.supplyCost) return null;

        // Both checks precede mutations, so a rejected request charges nothing.
        if (!reserveSupply(wallet, request.supplyCost)) return null;
        if (!spendWalletCost(wallet, request.cost)) {
            releaseReservedSupply(wallet, request.supplyCost);
            return null;
        }
        const job: ProductionJob = {
            completeAtSec: null,
            cost: { ...request.cost },
            durationSec: request.durationSec,
            id: `production-${this.nextId}`,
            ownerPlayerId: request.ownerPlayerId,
            producerId: request.producerId,
            recipeId: request.recipeId,
            startedAtSec: null,
            state: 'queued',
            supplyCost: request.supplyCost,
        };
        this.nextId += 1;
        this.jobs.push(job);
        this.startNext(request.producerId, elapsedSec);
        return { ...job };
    }

    advance(elapsedSec: number) {
        this.jobs.forEach((job) => {
            if (job.state !== 'running' || job.completeAtSec === null || elapsedSec < job.completeAtSec) return;
            this.replace(job.id, { ...job, state: 'exit_wait' });
        });
    }

    /** Called only after the production-exit resolver accepts a spawn point. */
    complete(jobId: string, elapsedSec: number) {
        const job = this.jobs.find((candidate) => candidate.id === jobId);
        if (!job || job.state !== 'exit_wait') return null;
        const wallet = this.getWallet(job.ownerPlayerId);
        if (!wallet || !commitReservedSupply(wallet, job.supplyCost)) return null;
        this.remove(job.id);
        this.startNext(job.producerId, elapsedSec);
        return this.recordTerminal({ ...job, state: 'complete' });
    }

    /** Player cancellation: full declared cost and reservation return once. */
    cancel(jobId: string, ownerPlayerId: number, elapsedSec: number) {
        const job = this.jobs.find((candidate) => candidate.id === jobId);
        if (!job || job.ownerPlayerId !== ownerPlayerId) return null;
        const wallet = this.getWallet(ownerPlayerId);
        if (!wallet || !releaseReservedSupply(wallet, job.supplyCost)) return null;
        refundWalletCost(wallet, job.cost);
        this.remove(job.id);
        this.startNext(job.producerId, elapsedSec);
        return this.recordTerminal({ ...job, state: 'cancelled' });
    }

    /** Destruction has no cost refund but releases every outstanding reservation. */
    discardProducer(producerId: string) {
        const discarded = this.jobs.filter((job) => job.producerId === producerId);
        discarded.forEach((job) => {
            const wallet = this.getWallet(job.ownerPlayerId);
            if (wallet) releaseReservedSupply(wallet, job.supplyCost);
            this.remove(job.id);
            this.recordTerminal({ ...job, state: 'cancelled' });
        });
        return discarded.map((job) => ({ ...job }));
    }

    getJobs(ownerPlayerId?: number) {
        return this.jobs
            .filter((job) => ownerPlayerId === undefined || job.ownerPlayerId === ownerPlayerId)
            .map((job) => ({ ...job, cost: { ...job.cost } }));
    }

    getTerminalJobs(ownerPlayerId?: number) {
        return this.terminalJobs
            .filter((job) => ownerPlayerId === undefined || job.ownerPlayerId === ownerPlayerId)
            .map((job) => ({ ...job, cost: { ...job.cost } }));
    }

    private startNext(producerId: string, elapsedSec: number) {
        if (this.jobs.some((job) => job.producerId === producerId && job.state === 'running')) return;
        const next = this.jobs.find((job) => job.producerId === producerId && job.state === 'queued');
        if (!next) return;
        this.replace(next.id, {
            ...next,
            completeAtSec: elapsedSec + next.durationSec,
            startedAtSec: elapsedSec,
            state: 'running',
        });
    }

    private remove(jobId: string) {
        const index = this.jobs.findIndex((job) => job.id === jobId);
        if (index >= 0) this.jobs.splice(index, 1);
    }

    private replace(jobId: string, replacement: ProductionJob) {
        const index = this.jobs.findIndex((job) => job.id === jobId);
        if (index >= 0) this.jobs[index] = replacement;
    }

    private recordTerminal(job: ProductionJob) {
        this.terminalJobs.push(job);
        return { ...job, cost: { ...job.cost } };
    }
}

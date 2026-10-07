import {
    CHICKEN_FARM_BALANCE,
    DEFAULT_DIFFICULTY,
    getStartingGold,
} from './balance';
import type { DifficultyId } from './balanceTypes';

export const SINGLE_PLAYER_OWNER_ID = 3;
export const DEBUG_STARTING_RESOURCE = 10000;
export const DEFAULT_START_ID = 3;

const DIFFICULTY_IDS = Object.keys(CHICKEN_FARM_BALANCE.difficulties) as DifficultyId[];

export type StartSessionOptions = {
    readonly debugEconomy?: boolean;
    readonly difficulty?: DifficultyId;
    readonly startId?: number;
};

export type ResolvedStartSession = {
    readonly debugEconomy: boolean;
    readonly difficulty: DifficultyId;
    readonly ownerPlayerId: typeof SINGLE_PLAYER_OWNER_ID;
    readonly startId: number;
    readonly startingGold: number;
    readonly startingLumber: number;
    readonly startingSupplyCap: number;
    readonly startingSupplyUsed: 0;
};

export function resolveStartSession(
    options: StartSessionOptions = {},
): ResolvedStartSession {
    const startId = options.startId ?? DEFAULT_START_ID;
    if (!Number.isInteger(startId) || startId < 1) {
        throw new RangeError(`startId must be a positive integer: ${String(startId)}`);
    }

    const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
    if (!DIFFICULTY_IDS.includes(difficulty)) {
        throw new RangeError(`Unsupported difficulty: ${String(difficulty)}`);
    }

    const debugEconomy = options.debugEconomy ?? false;
    const startingResource = debugEconomy ? DEBUG_STARTING_RESOURCE : null;

    return {
        debugEconomy,
        difficulty,
        ownerPlayerId: SINGLE_PLAYER_OWNER_ID,
        startId,
        startingGold: startingResource ?? getStartingGold(difficulty),
        startingLumber:
            startingResource ?? CHICKEN_FARM_BALANCE.economy.startingLumber,
        startingSupplyCap:
            startingResource ?? CHICKEN_FARM_BALANCE.economy.startingSupplyCap,
        startingSupplyUsed: 0,
    };
}

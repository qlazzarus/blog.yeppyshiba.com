import type { EnemyId } from './balanceTypes';

export type WaveOrdinaryEnemyTier = {
    readonly enemyId: EnemyId;
    readonly rawcode: string;
    readonly tier: number;
};

// JASS iIi[1..18] order, not display name, defines the ordinary replenish tiers.
export const WAVE_ORDINARY_ENEMY_TIERS: readonly WaveOrdinaryEnemyTier[] = [
    { enemyId: 'timber_wolf', rawcode: 'n007', tier: 1 },
    { enemyId: 'frost_wolf', rawcode: 'n008', tier: 2 },
    { enemyId: 'giant_wolf', rawcode: 'n009', tier: 3 },
    { enemyId: 'giant_frost_wolf', rawcode: 'n00A', tier: 4 },
    { enemyId: 'dire_wolf', rawcode: 'n00B', tier: 5 },
    { enemyId: 'dire_frost_wolf', rawcode: 'n00C', tier: 6 },
    { enemyId: 'spirit_wolf', rawcode: 'n00G', tier: 7 },
    { enemyId: 'dire_wolf_tier_8', rawcode: 'n00I', tier: 8 },
    { enemyId: 'shadow_wolf', rawcode: 'n00J', tier: 9 },
    { enemyId: 'fel_beast', rawcode: 'n00K', tier: 10 },
    { enemyId: 'fel_stalker', rawcode: 'n00L', tier: 11 },
    { enemyId: 'fel_ravager', rawcode: 'n00M', tier: 12 },
    { enemyId: 'darkguard', rawcode: 'n00U', tier: 13 },
    { enemyId: 'shupikuta', rawcode: 'n00V', tier: 14 },
    { enemyId: 'overlord', rawcode: 'n00W', tier: 15 },
    { enemyId: 'satyr', rawcode: 'n013', tier: 16 },
    { enemyId: 'satyr_soulstealer', rawcode: 'n015', tier: 17 },
    { enemyId: 'satyr_shadowdancer', rawcode: 'n014', tier: 18 },
] as const;

export function getWaveOrdinaryEnemyTierByRawcode(
    rawcode: string,
): WaveOrdinaryEnemyTier | null {
    return WAVE_ORDINARY_ENEMY_TIERS.find((tier) => tier.rawcode === rawcode) ?? null;
}

export function getWaveOrdinaryEnemyTier(
    tier: number,
): WaveOrdinaryEnemyTier | null {
    return WAVE_ORDINARY_ENEMY_TIERS.find((candidate) => candidate.tier === tier) ?? null;
}

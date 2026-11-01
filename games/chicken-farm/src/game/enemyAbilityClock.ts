export type EnemyAbilityCast = {
    readonly abilityId: string;
    readonly casterId: string;
    readonly executeAtSec: number;
    readonly targetId: string;
};

export type EnemyAbilityClock = {
    readonly activeCasts: readonly EnemyAbilityCast[];
    readonly cooldowns: Readonly<Record<string, number>>;
};

export type EnemyAbilityResolution = {
    readonly abilityId: string;
    readonly casterId: string;
    readonly status: 'cancelled_caster_dead' | 'cancelled_target_invalid' | 'executed';
    readonly targetId: string;
};

export function createEnemyAbilityClock(): EnemyAbilityClock {
    return { activeCasts: [], cooldowns: {} };
}

export function startEnemyAbilityCast(
    clock: EnemyAbilityClock,
    input: {
        readonly abilityId: string;
        readonly casterId: string;
        readonly cooldownSec: number;
        readonly nowSec: number;
        readonly targetId: string;
        readonly windupSec: number;
    },
): { readonly accepted: boolean; readonly clock: EnemyAbilityClock } {
    const key = `${input.casterId}:${input.abilityId}`;
    const nextAvailableAtSec = clock.cooldowns[key] ?? Number.NEGATIVE_INFINITY;
    if (
        !input.abilityId ||
        !input.casterId ||
        !input.targetId ||
        !Number.isFinite(input.nowSec) ||
        !Number.isFinite(input.cooldownSec) ||
        !Number.isFinite(input.windupSec) ||
        input.cooldownSec < 0 ||
        input.windupSec < 0 ||
        input.nowSec < nextAvailableAtSec ||
        clock.activeCasts.some((cast) => cast.casterId === input.casterId && cast.abilityId === input.abilityId)
    ) {
        return { accepted: false, clock };
    }

    return {
        accepted: true,
        clock: {
            activeCasts: [
                ...clock.activeCasts,
                {
                    abilityId: input.abilityId,
                    casterId: input.casterId,
                    executeAtSec: input.nowSec + input.windupSec,
                    targetId: input.targetId,
                },
            ],
            cooldowns: {
                ...clock.cooldowns,
                [key]: input.nowSec + input.cooldownSec,
            },
        },
    };
}

export function advanceEnemyAbilityClock(
    clock: EnemyAbilityClock,
    nowSec: number,
    isCasterAlive: (casterId: string) => boolean,
    isTargetValid: (targetId: string) => boolean,
): { readonly clock: EnemyAbilityClock; readonly resolutions: readonly EnemyAbilityResolution[] } {
    if (!Number.isFinite(nowSec)) return { clock, resolutions: [] };

    const resolutions: EnemyAbilityResolution[] = [];
    const activeCasts = clock.activeCasts.filter((cast) => {
        if (cast.executeAtSec > nowSec) return true;
        const status = !isCasterAlive(cast.casterId)
            ? 'cancelled_caster_dead'
            : !isTargetValid(cast.targetId)
              ? 'cancelled_target_invalid'
              : 'executed';
        resolutions.push({
            abilityId: cast.abilityId,
            casterId: cast.casterId,
            status,
            targetId: cast.targetId,
        });
        return false;
    });
    return { clock: { ...clock, activeCasts }, resolutions };
}

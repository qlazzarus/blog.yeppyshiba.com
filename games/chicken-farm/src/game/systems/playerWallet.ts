export type PlayerWallet = {
    gold: number;
    lumber: number;
    supplyCap: number;
    /** Supply promised to accepted production jobs but not yet spawned. */
    supplyReserved?: number;
    supplyUsed: number;
};

export type WalletCost = {
    readonly gold: number;
    readonly lumber?: number;
};

export function canAffordWalletCost(wallet: PlayerWallet, cost: WalletCost) {
    return wallet.gold >= cost.gold && wallet.lumber >= (cost.lumber ?? 0);
}

export function spendWalletCost(wallet: PlayerWallet, cost: WalletCost) {
    if (!canAffordWalletCost(wallet, cost)) return false;

    wallet.gold -= cost.gold;
    wallet.lumber -= cost.lumber ?? 0;
    return true;
}

export function refundWalletCost(wallet: PlayerWallet, cost: WalletCost) {
    wallet.gold += cost.gold;
    wallet.lumber += cost.lumber ?? 0;
}

export function getAvailableSupply(wallet: PlayerWallet) {
    return wallet.supplyCap - wallet.supplyUsed - (wallet.supplyReserved ?? 0);
}

export function reserveSupply(wallet: PlayerWallet, amount: number) {
    if (!Number.isFinite(amount) || amount < 0 || getAvailableSupply(wallet) < amount) {
        return false;
    }
    wallet.supplyReserved = (wallet.supplyReserved ?? 0) + amount;
    return true;
}

export function releaseReservedSupply(wallet: PlayerWallet, amount: number) {
    if (!Number.isFinite(amount) || amount < 0 || (wallet.supplyReserved ?? 0) < amount) {
        return false;
    }
    wallet.supplyReserved = (wallet.supplyReserved ?? 0) - amount;
    return true;
}

export function commitReservedSupply(wallet: PlayerWallet, amount: number) {
    if (!releaseReservedSupply(wallet, amount)) return false;
    wallet.supplyUsed += amount;
    return true;
}

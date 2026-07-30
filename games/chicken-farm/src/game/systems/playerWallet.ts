export type PlayerWallet = {
    gold: number;
    lumber: number;
    supplyCap: number;
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

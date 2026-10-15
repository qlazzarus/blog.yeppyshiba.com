import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BuildingUpgradeSystem } from '../games/chicken-farm/src/game/systems/buildingUpgradeSystem.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_building_upgrades.json');

async function main() {
    const wallets = new Map([
        [3, { gold: 100, lumber: 50, supplyCap: 3, supplyUsed: 0 }],
        [4, { gold: 20, lumber: 0, supplyCap: 3, supplyUsed: 0 }],
    ]);
    const upgrades = new BuildingUpgradeSystem((ownerPlayerId) => wallets.get(ownerPlayerId) ?? null);
    const request = {
        buildingId: 'farm-a',
        cost: { gold: 80, lumber: 40 },
        durationSec: 30,
        eligible: true,
        ownerPlayerId: 3,
        sourceTemplateId: 'farm_house' as const,
        targetTemplateId: 'town_hall' as const,
    };

    assert.equal(upgrades.start({ ...request, eligible: false }, 0), null, 'missing prerequisite never charges');
    assert.deepEqual(wallets.get(3), { gold: 100, lumber: 50, supplyCap: 3, supplyUsed: 0 });
    assert.equal(upgrades.start({ ...request, ownerPlayerId: 4 }, 0), null, 'resource shortage never charges');
    assert.deepEqual(wallets.get(4), { gold: 20, lumber: 0, supplyCap: 3, supplyUsed: 0 });

    const accepted = upgrades.start(request, 10);
    assert.ok(accepted, 'eligible source starts exactly one upgrade');
    assert.deepEqual(wallets.get(3), { gold: 20, lumber: 10, supplyCap: 3, supplyUsed: 0 }, 'start pays target cost once');
    assert.equal(upgrades.start(request, 10), null, 'repeated request is rejected without a second charge');
    assert.equal(upgrades.get(3)[0]?.state, 'running');
    upgrades.advance(39.9);
    assert.equal(upgrades.get(3)[0]?.state, 'running', 'progress remains running before its deadline');
    upgrades.advance(40);
    assert.equal(upgrades.get(3)[0]?.state, 'ready', 'deadline transitions to adapter-ready state');
    assert.equal(upgrades.get(4).length, 0, 'owner views are isolated');

    const recoveryWallets = new Map([
        [3, { gold: 300, lumber: 120, supplyCap: 3, supplyUsed: 0 }],
        [4, { gold: 300, lumber: 120, supplyCap: 3, supplyUsed: 0 }],
    ]);
    const recovery = new BuildingUpgradeSystem((ownerPlayerId) => recoveryWallets.get(ownerPlayerId) ?? null);
    const cancelled = recovery.start({ ...request, buildingId: 'farm-cancel' }, 0);
    assert.ok(cancelled);
    recovery.advance(30);
    assert.equal(recovery.cancel('farm-cancel', 4), null, 'foreign owner cannot cancel');
    assert.deepEqual(recoveryWallets.get(3), { gold: 220, lumber: 80, supplyCap: 3, supplyUsed: 0 });
    const cancellation = recovery.cancel('farm-cancel', 3);
    assert.deepEqual(cancellation?.refund, { gold: 60, lumber: 30 }, 'cancel uses 75% floor refund');
    assert.deepEqual(recoveryWallets.get(3), { gold: 280, lumber: 110, supplyCap: 3, supplyUsed: 0 });
    assert.equal(recovery.cancel('farm-cancel', 3), null, 'repeated cancel cannot refund twice');

    const destroyed = recovery.start({ ...request, buildingId: 'farm-destroy' }, 0);
    assert.ok(destroyed);
    recovery.advance(30);
    assert.ok(recovery.discard('farm-destroy'), 'destruction discards a ready job');
    assert.deepEqual(recoveryWallets.get(3), { gold: 200, lumber: 70, supplyCap: 3, supplyUsed: 0 }, 'destruction returns no upgrade cost');
    assert.equal(recovery.complete('farm-destroy'), null, 'discarded ready job cannot complete later');

    const artifact = {
        case: 'building_upgrade_core',
        checks: {
            ownerIsolation: true,
            playerCancelRefundOnce: true,
            prerequisiteAndShortageNoCharge: true,
            progressState: true,
            repeatedRequestSingleCharge: true,
            destroyedReadyJobNoRefundOrLateCompletion: true,
        },
        pass: true,
        policy: {
            cancellation: 'floor_75_percent_once',
            completion: 'ready_for_sp09_14_adapter',
            destruction: 'no_refund_discard',
            payment: 'start_once',
            sourceIdentity: 'building_id_owner_selection_preserved',
        },
        walletAfterStart: wallets.get(3),
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();

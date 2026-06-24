# Chicken Farm Network Sync and Browser Suspend Plan

이 문서는 Combat PoC 이후 확인해야 할 두 가지 런타임 리스크를 정리한다.

1. 네트워크 플레이에서 모든 플레이어가 같은 몬스터 위치와 공격 결과를 보는가.
2. 브라우저 탭이 숨겨지거나 최소화되어 게임 루프가 suspend될 때 시뮬레이션이 깨지지 않는가.

목표는 Phaser PoC를 실제 게임 코드로 승격할 때, 전투 AI와 시간 진행을 P2P에 맞는 구조로 고정하는 것이다.

## 1. 기본 결정

MVP 네트워크 모델은 기존 문서의 결정을 유지해 **Host Authoritative P2P**로 둔다.

방장 브라우저만 canonical simulation을 실행한다.

- 웨이브 생성
- 늑대 스폰
- 늑대 AI target acquisition / attack-move refresh
- pathing과 blocker fallback
- 공격 명중, 피해, 사망, 건물 파괴
- 자원, 점수, 승패

참가자 브라우저는 직접 몬스터 AI를 결정하지 않는다. 참가자는 입력 명령을 방장에게 보내고, 방장이 보낸 스냅샷과 이벤트를 화면에 반영한다.

장기적으로 deterministic lockstep을 검토할 수 있지만, 현재 Phaser/GameObject 중심 PoC는 브라우저별 프레임 시간, float 연산, pathing 타이밍 차이를 모두 고정하기 어렵다. 따라서 1차 목표는 "모든 브라우저가 같은 계산을 한다"가 아니라 "방장 계산 결과를 모두가 같은 결과로 수신한다"이다.

## 2. 몬스터 동기화 정책

### 2.1 Host-only Monster AI

늑대 AI는 host-only system으로 분리한다.

클라이언트에서 실행 가능한 것은 렌더링 보간과 예측 표시뿐이다.

| 항목 | 방장 | 참가자 |
| --- | --- | --- |
| 늑대 스폰 결정 | 실행 | 수신 |
| 랜덤 attack-move 목표 선택 | 실행 | 수신 |
| target acquisition | 실행 | 수신 |
| pathing/repath/blocker fallback | 실행 | 수신 |
| 공격 쿨다운/명중 판정 | 실행 | 수신 |
| HP/사망/파괴 처리 | 실행 | 수신 |
| sprite 위치 보간 | 실행 가능 | 실행 |

참가자가 늑대 위치를 로컬에서 예측하더라도, 그 값은 렌더링 보조값이어야 한다. 판정에 쓰는 `wolf.position`, `wolf.targetId`, `attackCooldown`, `hp`는 방장 snapshot/event가 authoritative이다.

### 2.2 Tick Boundary

전투 시뮬레이션은 fixed tick 위에서 실행한다.

권장 시작값:

| 항목 | 값 |
| --- | ---: |
| host simulation tick | 20~30Hz |
| render snapshot | 5~10Hz |
| recovery checkpoint | 5~10초마다 |
| client interpolation delay | 100~200ms |
| heartbeat | 1초마다 |

권위 시간은 `Date.now()`가 아니라 `hostTick`이다.

```ts
type HostFrame = {
    hostEpoch: number;
    hostTick: number;
    fixedDeltaSec: number;
};
```

Phaser `delta`는 accumulator에 넣되, 한 프레임에서 과도한 delta가 들어오면 combat tick으로 그대로 밀어 넣지 않는다. browser resume 이후 큰 delta는 pause/resync 경로로 처리한다.

### 2.3 Command Stream

플레이어 입력은 command로 전송한다.

```ts
type PlayerCommand = {
    type: 'move' | 'attack' | 'build' | 'repair' | 'shop' | 'stop';
    commandId: string;
    playerId: string;
    clientSeq: number;
    hostEpoch: number;
    requestedAtClientTimeMs: number;
    payload: unknown;
};
```

방장은 command를 검증한 뒤 적용 tick을 부여한다.

```ts
type AppliedCommand = PlayerCommand & {
    acceptedHostTick: number;
    appliedHostTick: number;
};
```

몬스터 AI는 플레이어 command의 결과로 바뀐 world state를 보고 다음 fixed tick에서 계산된다. 따라서 "플레이어가 움직였다"와 "늑대가 그 플레이어를 획득했다"는 같은 host timeline 안에서 순서가 보장된다.

### 2.4 Monster Event Stream

스냅샷만으로도 동기화는 가능하지만, 분석과 연출을 위해 주요 전투 결과는 event로도 보낸다.

```ts
type MonsterCombatEvent =
    | {
          type: 'wolf_spawned';
          eventId: string;
          hostTick: number;
          wolfId: string;
          spawnPointId: string;
          rngStep: number;
      }
    | {
          type: 'wolf_order_issued';
          eventId: string;
          hostTick: number;
          wolfId: string;
          reason: 'spawn' | 'global_refresh' | 'stuck_refresh' | 'aggro_pulse';
          targetPoint: { x: number; y: number };
          rngStep: number;
      }
    | {
          type: 'attack_landed';
          eventId: string;
          hostTick: number;
          attackerId: string;
          targetId: string;
          damage: number;
          targetHpAfter: number;
      }
    | {
          type: 'entity_destroyed';
          eventId: string;
          hostTick: number;
          entityId: string;
          destroyedById: string;
      };
```

클라이언트는 event를 판정 근거로 재계산하지 않고, 화면 연출과 로그 검증에 사용한다. 최종 상태는 snapshot이 우선한다.

### 2.5 Snapshot Shape

몬스터 동기화에 필요한 최소 snapshot은 다음 필드를 포함한다.

```ts
type CombatStateSnapshot = {
    type: 'state_snapshot';
    hostEpoch: number;
    hostTick: number;
    stateVersion: number;
    stateChecksum: string;
    rngStateHash: string;
    wolves: Array<{
        id: string;
        x: number;
        y: number;
        hp: number;
        state: string;
        targetUnitId?: string;
        targetBuildingId?: string;
        targetPoint?: { x: number; y: number };
        attackCooldownUntilTick?: number;
        lastOrderId?: string;
    }>;
    units: Array<{
        id: string;
        playerId: string;
        x: number;
        y: number;
        hp: number;
        commandId?: string;
    }>;
    buildings: Array<{
        id: string;
        ownerPlayerId: string;
        x: number;
        y: number;
        hp: number;
        alive: boolean;
    }>;
};
```

렌더링은 snapshot buffer를 두고 보간한다. 조작 중인 자기 유닛은 나중에 client-side prediction을 붙일 수 있지만, 늑대와 공격 결과는 host snapshot 기준으로 보정한다.

### 2.6 RNG 정책

랜덤은 host에서만 소비한다.

필수 규칙:

- session start에서 `worldSeed`를 고정한다.
- 늑대 스폰, 랜덤 attack-move 지점, 동률 target tie-break는 seeded PRNG로만 뽑는다.
- 랜덤을 소비한 event에는 `rngStep` 또는 `rngStateHash`를 남긴다.
- 클라이언트는 RNG를 소비해서 판정을 만들지 않는다.

이 구조는 host authoritative에서도 중요하다. 나중에 replay/checksum을 붙일 때 "왜 이 늑대가 저 방향으로 갔는지"를 추적할 수 있기 때문이다.

### 2.7 Consistency Check

방장은 N tick마다 canonical state checksum을 만든다.

참가자는 받은 snapshot을 적용한 뒤 같은 checksum을 기록한다. 클라이언트가 AI를 재계산하지 않더라도, 적용 누락이나 stale event 문제를 잡을 수 있다.

권장 telemetry:

- `network_snapshot_received`
- `network_snapshot_applied`
- `state_checksum`
- `state_checksum_mismatch`
- `monster_event_received`
- `monster_event_dropped`
- `command_accepted`
- `command_rejected`
- `command_applied`

MVP 성공 기준:

- 같은 `hostTick`의 `stateChecksum`이 모든 참가자 로그에서 일치한다.
- 늑대 스폰/공격/사망 event id 순서가 모든 참가자 로그에서 일치한다.
- 참가자 화면의 늑대 위치는 snapshot interpolation window 이후 host 위치로 수렴한다.
- 공격 명중/피해/사망은 클라이언트 예측값이 아니라 host event/snapshot으로만 확정된다.

## 3. 브라우저 Suspend 대응 정책

브라우저는 탭이 hidden/minimized 상태가 되거나 OS 절전, 모바일 백그라운드 전환이 발생하면 `requestAnimationFrame`, timer, WebRTC 처리 빈도를 제한할 수 있다. 따라서 "숨겨진 동안 지나간 wall-clock만큼 전투를 몰아서 진행"하면 안 된다.

핵심 원칙:

- combat simulation time은 `hostTick`으로만 진행한다.
- 큰 frame delta를 그대로 시뮬레이션에 적용하지 않는다.
- 방장이 suspend되면 게임은 pause/resync 상태로 들어간다.
- 참가자가 suspend되면 방장 게임은 계속 진행하되, 참가자는 복귀 시 최신 snapshot으로 재동기화한다.

## 4. Host Hidden/Suspended

방장이 숨겨지면 canonical simulation이 멈출 수 있으므로 MVP에서는 방장 hidden을 게임 pause로 처리한다.

흐름:

```text
1. host document.visibilityState === 'hidden'
2. host가 가능한 즉시 HOST_PAUSE_REQUEST(reason='host_hidden') 전송
3. host simulation accumulator 정지
4. 참가자는 pause overlay와 마지막 hostTick 표시
5. host가 visible로 복귀
6. host가 authoritative snapshot 전송
7. 3초 재개 카운트다운 또는 전원 ready 후 resume
8. 같은 hostEpoch, 다음 hostTick부터 진행
```

host가 pause message를 보내기 전에 완전히 멈추면 참가자는 heartbeat timeout으로 감지한다.

권장값:

| 항목 | 값 |
| --- | ---: |
| heartbeat interval | 1초 |
| host stall warning | 3초 |
| host lost/pause threshold | 5초 |
| resume countdown | 3초 |

MVP에서는 자동 host migration까지 바로 넣지 않는다. host heartbeat가 끊기면 room은 paused/host_lost 상태로 들어가고, 기존 P2P 계획의 수동 복구 또는 방장 이관 단계에서 처리한다.

## 5. Client Hidden/Suspended

참가자 브라우저가 hidden 상태가 되어도 host simulation은 계속 진행한다.

참가자 정책:

- local render loop는 멈춰도 된다.
- 입력은 hidden 상태에서 막는다.
- 수신한 snapshot/event는 가능하면 queue에 저장한다.
- 복귀 시 최신 snapshot을 요청한다.
- 마지막 적용 tick과 host 최신 tick 차이가 작으면 snapshot buffer로 자연 복귀한다.
- 차이가 크면 full resync snapshot을 적용하고 보간 buffer를 비운다.

복귀 흐름:

```text
1. client hidden
2. local render pause, input disabled
3. client visible
4. CLIENT_RESYNC_REQUEST(lastAppliedHostTick, lastSnapshotId)
5. host sends latest STATE_SNAPSHOT or RECOVERY_CHECKPOINT
6. client clears stale interpolation buffer
7. render resumes from authoritative snapshot
```

참가자 hidden은 게임 전체 pause 사유가 아니다. 단, 게임 디자인상 전원 협동이 중요하고 한 명의 이탈이 치명적이면 방 옵션으로 "모든 플레이어 foreground 필요"를 나중에 추가할 수 있다.

## 6. Page Lifecycle Signals

런타임은 다음 이벤트를 수집한다.

```ts
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pagehide', onPageHide);
window.addEventListener('pageshow', onPageShow);
window.addEventListener('blur', onWindowBlur);
window.addEventListener('focus', onWindowFocus);

document.addEventListener('freeze', onPageFreeze);
document.addEventListener('resume', onPageResume);
```

`blur/focus`는 UI 신호로만 사용한다. 실제 suspend 판단은 `visibilitychange`, `pagehide/pageshow`, heartbeat timeout, large delta detector를 함께 본다.

large delta detector:

```ts
const LARGE_FRAME_DELTA_MS = 500;

function update(timeMs: number, deltaMs: number) {
    if (deltaMs > LARGE_FRAME_DELTA_MS) {
        runtimeLifecycle.requestResyncOrPause({
            reason: 'large_frame_delta',
            deltaMs,
        });
        return;
    }

    fixedTickAccumulator.add(deltaMs);
}
```

host에서는 large delta가 발생하면 simulation을 몰아서 진행하지 않고 pause/resync로 전환한다. client에서는 interpolation buffer를 버리고 최신 snapshot을 요청한다.

## 7. Single-player Policy

싱글 플레이도 같은 lifecycle boundary를 사용한다.

권장 MVP 정책:

- 브라우저 hidden 시 combat은 자동 pause.
- visible 복귀 시 같은 tick에서 재개.
- hidden 동안 지나간 wall-clock만큼 늑대/타워/농부 전투를 fast-forward하지 않는다.
- 경제 idle 보상은 후속 기능으로 분리한다. combat과 같은 tick에 묶지 않는다.

이렇게 해야 싱글 플레이에서 검증한 combat telemetry가 멀티 플레이에서도 같은 시간 모델을 갖는다.

## 8. 구현 단계

### P0. 문서와 Telemetry

- 이 문서를 기준으로 network/suspend telemetry event 이름을 고정한다.
- 현재 JSONL export에 lifecycle/network placeholder event를 추가할 수 있게 한다.

### P1. Fixed Tick Boundary

- combat/economy/wave 진행을 fixed tick accumulator 뒤로 옮긴다.
- Phaser render delta와 game logic delta를 분리한다.
- large delta guard를 추가한다.

### P2. Host-only Combat Runtime

- 늑대 AI system을 host-authoritative boundary로 분리한다.
- command input, monster AI, attack result, snapshot export 순서를 고정한다.
- seeded RNG와 `rngStep` 로그를 붙인다.

### P3. Snapshot/Event Adapter

- `STATE_SNAPSHOT`, `MONSTER_EVENT`, `HOST_HEARTBEAT` 타입을 만든다.
- 클라이언트 snapshot buffer와 interpolation renderer를 만든다.
- checksum telemetry를 추가한다.

### P4. Browser Lifecycle Runtime

- visibility/page lifecycle listener를 만든다.
- host hidden pause, client hidden resync를 구현한다.
- resume countdown과 stale snapshot discard를 구현한다.

### P5. Recovery 확장

- recovery checkpoint 저장.
- 수동 host transfer.
- hostEpoch 증가와 stale message 폐기.
- 장기적으로 deterministic replay 또는 host migration을 검토한다.

## 9. 검증 시나리오

### 9.1 Network Monster Sync

2개 브라우저로 같은 방에 접속한다.

검증:

- host와 client 로그의 `wolf_spawned` 순서가 같다.
- host와 client 로그의 `wolf_order_issued` event id가 같다.
- 같은 `hostTick` snapshot checksum이 같다.
- 늑대가 타워/농부/건물/펜스를 공격한 결과가 모든 화면에서 같은 tick 순서로 보인다.
- client가 일시적으로 보간 위치를 다르게 표시해도 다음 snapshot window 안에 host 위치로 수렴한다.

### 9.2 Client Hidden

참가자 탭만 hidden/minimized한다.

검증:

- host simulation은 계속 진행된다.
- hidden client는 입력 불가 상태가 된다.
- visible 복귀 후 `CLIENT_RESYNC_REQUEST`가 발생한다.
- 최신 snapshot 적용 후 HP, 위치, 사망 상태가 host와 일치한다.

### 9.3 Host Hidden

방장 탭을 hidden/minimized한다.

검증:

- host가 가능하면 `HOST_PAUSE_REQUEST`를 보낸다.
- 참가자는 host pause 상태를 표시한다.
- host가 완전히 멈춰 pause message를 못 보낸 경우 heartbeat timeout으로 paused/host_lost에 들어간다.
- resume 이후 큰 delta로 전투가 한 번에 진행되지 않는다.
- authoritative snapshot 이후 같은 hostTick 흐름에서 재개한다.

### 9.4 Large Delta

개발용으로 update delta를 강제로 크게 넣는다.

검증:

- 500ms 이상 delta가 combat tick으로 직접 소비되지 않는다.
- host는 pause/resync 경로로 들어간다.
- client는 interpolation buffer를 초기화하고 최신 snapshot을 요청한다.

## 10. 완료 기준

- 전투 시뮬레이션은 hostTick/fixed tick 기준으로만 진행된다.
- 늑대 AI는 host-only decision으로 분리된다.
- 몬스터 위치/공격/사망은 snapshot/event로 모든 참가자에게 전파된다.
- 같은 hostTick의 checksum이 참가자 로그에서 일치한다.
- host hidden은 게임 pause 또는 host_lost로 처리된다.
- client hidden은 전체 게임 pause 없이 resync로 복귀한다.
- browser resume 이후 큰 delta가 combat fast-forward로 적용되지 않는다.


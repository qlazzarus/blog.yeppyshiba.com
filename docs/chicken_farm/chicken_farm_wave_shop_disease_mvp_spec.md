# Chicken Farm Web MVP: Wave and Shop Spec

> 목적: `닭농장1.3a.w3x` 분석에서 확인한 웨이브/상점 흐름을 Phaser + P2P 웹 MVP 구현 단위로 좁혀 정리한다.
> 질병은 원본에 존재하는 선택형 압박 요소로 문서 하단에 보관하지만, 현재 구현/MVP 범위에서는 제외한다.

원본 JASS 함수명은 난독화되어 있으므로 구현 이름으로 사용하지 않는다. 아래 함수명과 라인은 추적 근거이며, 실제 구현은 새 데이터/상태/이벤트 이름을 사용한다.

참조 산출물:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_function_labels.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_labeled_call_edges.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_timer_events.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_economy_events.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_create_units.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/unit_rawcode_crosscheck.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_wolf_order_flows.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_wolf_spawn_points.tsv`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/web_mvp_balance_reference.json`
- `docs/chicken_farm/chicken_farm_warsmash_reference_plan.md`
- `docs/chicken_farm/chicken_farm_warsmash_behavior_notes.md`

---

## 1. Shared Runtime Model

MVP는 호스트 권위형 상태로 둔다. P2P에서는 호스트가 시간, 웨이브, 자원 tick을 결정하고 클라이언트는 입력만 전송한다.

```ts
type GamePhase =
    | 'lobby'
    | 'prebuild'
    | 'running'
    | 'paused'
    | 'host_lost'
    | 'victory'
    | 'defeat';

type RuntimeState = {
    phase: GamePhase;

    // Simulation time
    tick: number;
    elapsedSec: number;
    timeScale: number;

    // Session config
    maxPlayers: 8;
    difficulty: 'easy' | 'normal' | 'hard' | 'crazy';
    rngSeed: number;

    // Host authoritative metadata
    hostId: string;
    hostEpoch: number;
    lastAppliedCommandId: string | null;
    lastCheckpointTick: number | null;
    stateChecksum?: string;

    // Game runtime
    players: PlayerState[];
    wave: WaveRuntime;
    shop: ShopRuntime;
};
```

P2P 멀티플레이에서는 `hostEpoch`가 현재 방장 세대를 나타낸다.

- 최초 방장은 `hostEpoch = 0` 또는 `1`로 시작한다.
- 방장 이관이 발생하면 `hostEpoch`를 1 증가시킨다.
- 모든 네트워크 메시지는 `hostEpoch`를 포함한다.
- 클라이언트는 현재 `hostEpoch`보다 낮은 메시지를 무시한다.
- MVP에서는 자동 이관을 하지 않지만, 상태 구조에는 미리 포함한다.

공통 규칙:

- 모든 반복 이벤트는 `elapsedSec` 기준으로 판정한다.
- `elapsedSec`는 원본 논리 시간이며, 테스트 배속은 `realDeltaSec * timeScale`로만 반영한다.
- 30초 egg drop tick, 20초 웨이브 보충 tick은 별도 타이머 객체보다 `elapsedSec >= nextAtSec` 방식이 재접속/동기화에 유리하다.
- 원본 rawcode는 데이터의 `sourceRawcode` 필드에만 남기고 런타임 로직에서는 새 id를 사용한다.

테스트 프로파일:

| profile    | timeScale | 목적                              |
| ---------- | --------: | --------------------------------- |
| `original` |         1 | 원본에 가까운 장기 체감 검증      |
| `fast`     |         3 | 전체 흐름을 한 세션에서 확인      |
| `smoke`    |        10 | 웨이브/보스 이벤트 순서 검증      |

### 1.1 SerializedGameState와 체크포인트

P2P 복구와 향후 방장 이관을 위해 렌더링 상태와 복구 상태를 분리한다.

```ts
type SerializedGameState = {
    tick: number;
    elapsedSec: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'crazy';
    rngSeed: number;

    hostId: string;
    hostEpoch: number;
    lastAppliedCommandId: string | null;

    players: PlayerState[];
    wave: WaveRuntime;
    shop: ShopRuntime;
    entities: {
        farmers: FarmerState[];
        defenders: DefenderState[];
        enemies: EnemyState[];
        buildings: BuildingState[];
        eggs: EggState[];
    };
};
```

복구용 체크포인트는 SerializedGameState를 기반으로 생성한다.

```ts
type RecoveryCheckpoint = {
    type: 'RECOVERY_CHECKPOINT';
    checkpointId: string;
    hostId: string;
    hostEpoch: number;
    tick: number;
    elapsedSec: number;
    lastAppliedCommandId: string | null;
    stateChecksum: string;
    state: SerializedGameState;
};
```

MVP에서는 체크포인트를 실제 복구에 사용하지 않아도 된다.
다만 5~10초마다 host가 체크포인트를 생성하고 참가자가 최근 N개를 보관할 수 있도록 타입과 저장 구조를 먼저 준비한다.

---

## 2. Wave Spec

### 2.1 원본 근거

| 역할        | 근거 함수/라인                                       | 관찰                                                    |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------- |
| 초기화      | `config` 9685-9706, `main` 9670-9684                 | 플레이어/팀/환경 초기화                                 |
| 런타임 등록 | `iiiIilI` 7233-7887                                  | 장기 타이머, 유닛 이벤트, 다이얼로그 등록               |
| 초기 웨이브 | `IliIilI` 5614-5663                                  | Player(10) 늑대 계열 생성, 안내                         |
| 보스 1      | `IliiiiI` 5741-5763                                  | Blood Wolf 생성, 핑/시야 공유, 다음 트리거 활성화       |
| 보스 연쇄   | `IliilII`, `IliillI`, `IlilIiI`, `IliliII` 5776-5894 | Wild Wolf, Hell Hound, Doom Guard, Archimonde 계열 단계 |
| 보충 스폰   | `IlillII`~`IllllII` 5907-6174                        | 조건 만족 시 Player(10)에 2기씩 보충                    |
| 점수        | `iiIIliI` 6943-6985                                  | 늑대 처치/리더보드 점수 갱신                            |

원본 장기 타이머 후보는 60, 120, 230, 300, 600, 1100, 1500, 2000, 2200, 2400, 2600, 2800, 3000초다. 원본 근접 내부 테스트에서는 이 논리 시간을 유지하고, 빠른 검증은 `timeScale`로만 압축한다.

### 2.2 MVP 데이터

`web_mvp_balance_reference.json`의 `units`, `waves`, `score`, `difficulty`를 기준으로 한다.

```ts
type EnemyId =
    | 'timber_wolf'
    | 'frost_wolf'
    | 'giant_wolf'
    | 'blood_wolf'
    | 'wild_wolf'
    | 'hell_hound'
    | 'doom_guard'
    | 'archimonde'
    | 'nether_dragon';

type EnemyDef = {
    id: EnemyId;
    sourceRawcode: string;
    hp: number;
    armor: number;
    speedPxPerSec: number;
    damage: number;
    attackCooldownSec: number;
    score: number;
    tags: ('ordinary' | 'boss' | 'flying' | 'elite')[];
};

type WaveEvent = {
    sec: number;
    enemy: EnemyId;
    count: number;
    spawnGroup: 'outer' | 'boss';
    announcement?: string;
};
```

원본 근접 timeline 초안:

|       sec | enemy                            | count | 의도                                |
| --------: | -------------------------------- | ----: | ----------------------------------- |
|        80 | `timber_wolf`                    |     4 | 첫 압박                             |
|       120 | `timber_wolf`                    |     6 | 주요 웨이브 활성화                  |
|       230 | `frost_wolf`                     |     5 | 초반 방어 확인                      |
|       300 | `giant_wolf`                     |     4 | 보충/압박 증가                      |
|       600 | `blood_wolf`                     |     1 | 첫 보스                             |
|      1100 | `frost_wolf` 또는 상위 일반 늑대 |  보충 | 난이도 상승                         |
|      1500 | `wild_wolf`                      |     1 | 중후반 방어선 검사                  |
|      2000 | `hell_hound`                     |     1 | 후반 압박                           |
|      2600 | `doom_guard`                     |     1 | 최종 전 단계                        |
|      3000 | `archimonde`                     |     1 | 정적 분석상 직접 등장하는 후반 보스 |
| 관찰 필요 | `nether_dragon`                  |     1 | 사망/변환 후속 보스 후보            |

주의: 정적 분석 기준 `H01N` 아키몬드는 후반 보스 등장 메시지와 함께 생성된다. `H01O` 네더 드레곤은 별도 등장 메시지 함수가 아니라 사망 위치에 생성되고 이전 유닛 레벨을 이어받는 함수에서 확인된다. 실제 플레이 관찰은 보류하고, 현재 최종전은 정적 분석과 Warsmash behavior 참조 기준으로 `archimonde -> nether_dragon` 2단계 후보로 둔다.

### 2.3 Wave Runtime

```ts
type WaveRuntime = {
    nextTimelineIndex: number;
    nextReplenishAtSec: number;
    activeEnemiesByWave: Record<string, number>;
    defeatedBosses: string[];
};
```

업데이트 순서:

1. `phase !== "running"`이면 종료한다.
2. `timeline[nextTimelineIndex].sec <= elapsedSec`인 이벤트를 모두 실행한다.
3. 각 이벤트마다 지정된 스폰 지점에서 적을 생성하고 `activeEnemiesByWave`를 증가시킨다.
4. `elapsedSec >= nextReplenishAtSec`이면 일반 늑대 보충 조건을 검사한다.
5. 보충 조건을 만족하면 현재 최고 일반 늑대 tier를 2기 생성한다.
6. `nextReplenishAtSec += 20`.

보충 조건:

- 원본은 단계별 그룹 수를 보고 2기씩 보충하는 형태다.
- MVP는 일반 늑대만 보충한다.
- 보스는 보충하지 않는다.
- `active ordinary enemies < min(2 + alivePlayers, 6)`일 때 보충한다.

### 2.4 Spawn Policy

원본 pathing은 열린 지형에 가깝다. MVP도 기본은 자유 추적이다.

- 적은 외곽 스폰 지점에서 가장 가까운 플레이어 농장/수익 건물을 목표로 삼는다.
- 목표가 파괴되면 다음 가까운 수익 건물, 방어 유닛, 플레이어 순으로 재탐색한다.
- 플레이어 울타리/건물은 pathing blocker가 된다.
- 막히면 0.5초마다 경로를 다시 계산한다.
- 늑대의 target acquisition, blocker 공격 전환, 재경로 감각은 `chicken_farm_warsmash_reference_plan.md`와 `chicken_farm_warsmash_behavior_notes.md`의 Warsmash 참조 트랙을 따른다.
- 원본 JASS는 구체 건물/닭 우선순위를 직접 지정하기보다 Player(10) 유닛에 전체 공격 구역 `IlIlI` 랜덤 지점 attack 명령을 주고, 실제 대상 선택은 워3 attack-move/acquisition에 맡긴다.
- MVP의 명시 타깃 우선순위는 원본 JASS를 그대로 복사하는 값이 아니라, Warsmash behavior와 `jass_wolf_order_flows.tsv` 결론을 바탕으로 AI 레이어에서 새로 정의한다.

### 2.5 Score and Completion

- 일반 늑대: 10/15/20점.
- 보스: 40/70/100/140/200점.
- 10초 생존마다 5점.
- 기본 승리 조건은 `archimonde`와 남은 적 처치다.
- `nether_dragon`은 정적 분석상 후속 변환 보스 후보이므로, MVP 데이터에 포함하되 실제 사용 여부는 보스 변환 함수 추가 추적으로 확정한다.
- 모든 플레이어 핵심 농장 또는 플레이어 영웅이 사망 상태이면 패배.

---

## 3. Shop and Economy Spec

### 3.1 원본 근거

| 역할      | 근거 함수/라인      | 원본 수치                                                    |
| --------- | ------------------- | ------------------------------------------------------------ |
| 자원 교환 | `lIilii` 3182-3255  | 100->70, 500->400, 1500->1200, 3000->2400                    |
| 구매 1    | `lIlIii` 3268-3275  | 금화 150 소모 후 유닛 생성                                   |
| 구매 2    | `lIliii` 3288-3295  | 금화 400 소모 후 유닛 생성                                   |
| 구매 3    | `lIllii` 3308-3315  | 금화 850 소모 후 유닛 생성                                   |
| 부활      | `liilIi` 3415-3445  | 현재 골드/목재 40% 차감, 영웅 부활                           |
| 주기 수익 | `lIiillI` 9352-9366 | 30초마다 `h00A`/`h00J`/`h00W` 수에 따라 70/110/170 목재 지급 |

### 3.2 MVP 자원/알 모델

원본 골드/목재를 웹 MVP에서는 우선 `coins` wallet으로 단순화한다. 알은 금/나무처럼 즉시 누적되는 wallet resource가 아니라, 필드에 드롭되고 수집/거래/부화에 쓰이는 item/object로 취급한다.

```ts
type PlayerResources = {
    coins: number;
};

type FieldEggItem = {
    id: string;
    ownerPlayerId: number;
    position: Point;
    stackCount: number;
    droppedAtSec: number;
    sourceEntityId?: string;
};

type ShopRuntime = {
    nextEggDropAtSec: number;
};
```

초기값:

| 난이도 | startingCoins | 비고                     |
| ------ | ------------: | ------------------------ |
| easy   |           140 | 원본 쉬움 +200 골드 감각 |
| normal |           120 | 기본                     |
| hard   |           120 | 적 강화                  |
| crazy  |           110 | 적 강화 + 시작 페널티    |

### 3.3 구매 항목

| id           | sourceRawcode |  MVP 비용 | 결과                 |
| ------------ | ------------- | --------: | -------------------- |
| `coop_basic` | `h00A`        |  60 coins | 30초마다 1 egg item 생성 |
| `coop_mid`   | `h00J`        | 120 coins | 30초마다 2 egg items 생성 |
| `coop_high`  | `h00W`        | 220 coins | 30초마다 3 egg items 생성 |
| `dog`        | `n002`        |  45 coins | 빠른 방어 유닛       |
| `big_dog`    | `n00E`        | 180 coins | 고급 방어 유닛       |

업그레이드:

- `coop_basic -> coop_mid`: 추가 80 coins.
- `coop_mid -> coop_high`: 추가 140 coins.
- 업그레이드 중에도 건물 위치와 소유자는 유지한다.
- 업그레이드 완료는 즉시 처리한다. 별도 건설 시간은 MVP 이후로 미룬다.

### 3.4 Egg Drop Tick

```ts
function applyEggDropTick(state: RuntimeState) {
    for (const player of state.players) {
        const eggUnits = player.buildings.reduce((sum, building) => {
            return sum + incomeByBuilding[building.kind].eggUnitsPer30Sec;
        }, 0);
        spawnFieldEggItems(state, player.id, eggUnits);
    }
}
```

규칙:

- 30초마다 실행한다.
- 원본은 목재 지급이지만 MVP에서는 field egg item 생성으로 해석한다.
- 알은 농부가 수집하거나 상점/교환 API를 통해 판매해야 `coins`가 된다.
- 알은 닭장 부화 액션의 입력으로도 사용한다.
- 즉시 `player.resources.eggs += n` 또는 `coins += n` 처리는 하지 않는다.

### 3.5 Revive and Penalty

원본은 현재 자원의 40%를 차감한다. MVP는 짧은 세션을 고려해 25%로 낮춘다.

```ts
function revivePlayer(player: PlayerState) {
    player.resources.coins = Math.floor(player.resources.coins * 0.75);
    player.hero.hp = player.hero.maxHp;
    player.hero.position = player.spawnPoint;
}
```

field egg item의 사망/부활 시 소멸, 드롭 유지, 약탈 가능 여부는 PvP/협동 UX에 영향이 커서 후속 밸런스 결정으로 둔다.

### 3.6 Exchange

원본 교환은 확인됐지만 MVP에서는 기본 비활성화한다.

비활성화 이유:

- PoC 7은 `coins wallet + field egg item`만으로도 충분하다.
- P2P 동기화와 UI를 단순하게 유지한다.
- 필요 시 후속 버전에서 `100 coins -> 70 egg value` 계열로 복원한다.

---

## 4. Archived Disease Reference

현재 구현에서는 질병을 제외한다. 이 섹션은 원본 분석 근거를 잃지 않기 위한 보관용이며, `RuntimeState`, `balance.ts`, MVP PoC 목록에는 포함하지 않는다.

### 4.1 원본 근거

| 역할      | 근거 함수/라인               | 관찰                                   |
| --------- | ---------------------------- | -------------------------------------- |
| 선택 UI   | `lliIIi` 3547-3556           | 질병 다이얼로그 버튼 표시              |
| 안내/분기 | `lliiii` 3575-3592           | 질병 관련 안내와 조건부 실행           |
| 모드 시작 | `llliii` 3642-3660           | 질병 트리거 활성화, `Ili[60]` 참조     |
| 효과 생성 | `llllIi`, `llllli` 3667-3686 | 유닛 생성 후 `UnitApplyTimedLife` 적용 |

질병은 기본 웨이브가 아니라 선택형 압박 모드로 보는 것이 맞다.

### 4.2 Archived Runtime Sketch

기본값은 꺼둔다.

```ts
type DiseaseRuntime = {
    enabled: boolean;
    nextEventAtSec: number;
    activeEvents: DiseaseEvent[];
};

type DiseaseEvent = {
    id: string;
    targetPlayerId: string;
    targetBuildingId: string;
    startedAtSec: number;
    endsAtSec: number;
};
```

설정:

| 항목           |                                           값 |
| -------------- | -------------------------------------------: |
| 기본 활성화    |                                        false |
| 시작 가능 시점 |                                   180초 이후 |
| 이벤트 간격    |                                         90초 |
| 지속 시간      |                                         20초 |
| 대상           | 살아 있는 플레이어의 수익 건물 중 무작위 1개 |
| 효과           |                 해당 건물 egg drop tick 비활성화 |

### 4.3 Disease Flow

```text
옵션 선택
  -> disease.enabled = true
  -> nextEventAtSec = max(180, elapsedSec + 60)

running update
  -> elapsedSec >= nextEventAtSec
  -> 수익 건물 후보 수집
  -> seeded RNG로 대상 선택
  -> DiseaseEvent 생성
  -> target.disabledByDisease = true
  -> nextEventAtSec += 90

cleanup
  -> elapsedSec >= endsAtSec
  -> target.disabledByDisease = false
  -> event 제거
```

### 4.4 Counterplay

보관용 설계에서 질병은 손실을 만들되 즉시 패배로 이어지지 않는 선택형 압박이었다.

- 감염된 건물은 시각적으로 명확히 표시한다.
- 플레이어가 5초간 상호작용하면 즉시 치료할 수 있다.
- 치료하지 않아도 20초 뒤 자동 회복된다.
- 감염 중인 건물은 판매할 수 있지만 판매가는 50%로 낮춘다.

### 4.5 P2P 동기화

- 질병 대상 선택은 호스트만 수행한다.
- 이벤트 id는 `disease-${sequence}`처럼 결정적으로 생성한다.
- 클라이언트는 `DiseaseStarted`, `DiseaseCured`, `DiseaseExpired` 이벤트를 받아 표시만 갱신한다.

---

## 5. Implementation Checklist

웨이브:

- `EnemyDef`, `WaveEvent`, `WaveRuntime` 데이터 추가.
- `elapsedSec` 기반 timeline 실행.
- 일반 늑대 보충 tick 구현.
- 보스 처치 점수와 승리 조건 연결.

상점:

- `coins` wallet과 `FieldEggItem` state 추가.
- 수익 건물 3단계 구매/업그레이드.
- 방어 유닛 `dog`, `big_dog` 구매.
- 30초 egg drop tick, 알 수집/판매/부화, 25% 부활 패널티.

검증:

- 15분 이하 세션에서 최종 보스까지 도달한다.
- 첫 웨이브 전 최소 한 번 수익 건물을 살 수 있다.
- 일반 늑대가 열린 지형에서 농장으로 접근한다.

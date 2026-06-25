# Chicken Farm Construction Placement PoC Plan

이 문서는 Combat PoC를 잠시 비활성화하고, Warcraft III식 명령 타일과 건설 배치 루프를 Chicken Farm Phaser PoC에 붙이기 위한 구현 계획이다.

목표는 다음 구현 세션에서 컨텍스트를 잃지 않고 바로 작업을 이어갈 수 있도록 파일 위치, 시스템 책임, 완료 기준을 고정하는 것이다.

## 1. 결정 사항

- 다음 구현 단위는 **Construction Placement PoC**다.
- 기존 `CombatPocSystem` 코드는 삭제하지 않고 feature flag로 비활성화한다.
- 경제/상점/웨이브는 이번 PoC의 직접 구현 범위가 아니다.
- 이번 PoC는 "농부 선택 -> 명령 타일 -> 건설 메뉴 -> 건물 선택 -> footprint ghost -> 배치 -> 완성 -> blocker 반영"까지를 완료 기준으로 둔다.
- 완성된 player-built building은 이후 Combat PoC를 다시 켰을 때 늑대 path blocker와 targetable building으로 연결할 수 있어야 한다.

## 2. 1차 완료 기준

- 농부 선택 후 `B` 키 또는 command card 버튼으로 Build page에 진입한다.
- Build page에서 단축키로 최소 4개 건물을 선택할 수 있다.
    - `F`: `fence_wood`
    - `T`: `tower_scout`
    - `H`: `farm_house`
    - `C`: `coop_basic`
- 건물 선택 후 마우스 위치에 grid-snapped footprint ghost가 표시된다.
- 배치 snap은 minor tile 2개 단위, 즉 64px 기준으로 맞춘다. 건물 footprint 자체는 기존 template의 32px cell 크기를 유지한다.
- 배치 가능 상태는 초록색, 불가능 상태는 빨간색으로 표시한다.
- 좌클릭으로 배치 명령을 내리면 농부가 현장 접근점으로 이동한다.
- 농부가 현장에 도착한 뒤 construction이 시작되고, 완료될 때까지 build command 상태로 작업한다.
- `Esc` 또는 우클릭으로 아직 확정하지 않은 placement mode를 취소한다.
- 배치 불가능한 위치를 클릭하면 건물이 생성되지 않고 telemetry에 reject reason을 남긴다.
- 완성된 건물은 유닛 이동의 dynamic blocker에 포함된다.
- `CombatPocSystem` flag를 다시 켤 때 player-built building을 wolf target/blocker로 연결할 수 있는 API 경계가 남아 있다.

## 3. Feature Flags

`games/chicken-farm/src/game/config.ts`에 PoC flags를 둔다.

```ts
export const CHICKEN_FARM_POC_FLAGS = {
    combat: false,
    construction: true,
    terrainPathingDebug: true,
} as const;
```

`main.ts` 적용 기준:

- `CombatPocSystem` 생성은 `combat` flag가 true일 때만 수행한다.
- `createCombatPoc()` 호출도 `combat` flag가 true일 때만 수행한다.
- `update.combat`은 optional call을 유지하되 combat flag 기준으로 명확히 비활성화한다.
- `getDynamicBlockedRects()`는 이후 `combatPoc` blockers와 `buildingSystem` blockers를 합쳐 반환할 수 있도록 구성한다.

## 4. Input Priority

명령 타일과 건설 배치가 들어오면 단축키 충돌을 먼저 정리해야 한다.

처리 우선순위:

1. Construction placement mode
2. Command card hotkeys
3. Selected unit commands
4. Camera pan

1차 권장:

- `S`는 stop 전용으로 둔다.
- 카메라 down 이동은 방향키 또는 다른 키로 분리한다.
- placement mode에서는 `Esc`, 좌클릭, 우클릭을 먼저 소비한다.
- command card의 키 입력과 UI 클릭은 같은 action dispatcher를 호출한다.

현재 주의점:

- `FarmInputKeys`에서 `down`과 `stop`이 모두 `S`로 묶여 있다.
- 구현 전 입력 키 정의를 먼저 정리해야 명령 카드 테스트가 안정적이다.

## 5. Command Card System

새 파일 후보:

- `games/chicken-farm/src/game/ui/commandCard.ts`
- `games/chicken-farm/src/game/systems/commandCardSystem.ts`

핵심 타입 초안:

```ts
type CommandCardPageId = 'root' | 'build';

type CommandCardAction =
    | { type: 'open_page'; page: CommandCardPageId }
    | { type: 'start_build_placement'; buildingId: MvpBuildingId }
    | { type: 'stop' }
    | { type: 'cancel' };

type CommandCardButton = {
    id: string;
    label: string;
    hotkey: string;
    action: CommandCardAction;
};
```

Root page:

| Slot | Hotkey | Action |
| ---- | ------ | ------ |
| 1 | `B` | open build page |
| 2 | `S` | stop selected units |

Build page:

| Slot | Hotkey | Building |
| ---- | ------ | -------- |
| 1 | `F` | `fence_wood` |
| 2 | `T` | `tower_scout` |
| 3 | `H` | `farm_house` |
| 4 | `C` | `coop_basic` |

Command card rules:

- 선택된 builder가 없으면 build page 진입을 비활성화한다.
- build placement가 시작되면 command page는 유지하되 placement mode가 input 우선권을 갖는다.
- `Esc`는 placement mode에서는 placement cancel, build page에서는 root page 복귀로 동작한다.

## 6. HUD Command Grid

현재 `farmHud.ts`에는 command grid 배경만 있다. 1차 구현에서는 고정 3x4 버튼을 만든다.

구현 기준:

- 버튼 크기는 고정한다.
- 각 버튼은 label과 hotkey를 표시한다.
- disabled 상태는 어둡게 렌더링한다.
- hover/active 시 stroke 또는 배경색만 바꾼다.
- 버튼 클릭은 command card action dispatcher를 호출한다.

`createFarmHud()` 반환값 확장 후보:

```ts
export type FarmHud = {
    readonly debugText: Phaser.GameObjects.Text;
    readonly minimapGraphics: Phaser.GameObjects.Graphics;
    readonly commandButtons: readonly CommandCardButtonView[];
};
```

## 6.1 Warcraft III-style Selection Info Panel

건설 중인 건물 또는 완성 건물을 클릭했을 때 하단 중앙 정보 패널에 상태를 보여주는 흐름은 현재 구조에서 구현 가능하다.

현재 HUD는 아래 영역으로 나뉜다.

- 왼쪽: minimap
- 중앙: title/help/debug text 영역
- 오른쪽: command card grid

후속 구현에서는 중앙 영역을 `SelectionInfoPanel`로 승격한다. debug text는 개발 overlay로 축소하거나 별도 toggle로 이동한다.

표시 대상:

| 선택 대상 | 정보 패널 표시 |
| --- | --- |
| 농부/개 | 이름, HP, 현재 명령, 이동/공격 상태 |
| planned build site | 건설 예정 건물 이름, 작업하러 가는 농부, 부지 상태 |
| constructing building | 건물 이름, HP, 건설 진행률, 작업 중 농부, 남은 시간 |
| complete building | 건물 이름, HP/armor, 기능 요약, upgrade/repair/sell 후보 |

건설 중 건물 클릭 시 1차 표시:

- 건물 이름
- 상태: `Constructing`
- HP / max HP
- progress percent
- remaining build time
- worker unit id 또는 `No worker`
- footprint cells

구현 방향:

- `BuildingSystem`에 `hitTestBuilding(worldX, worldY)`를 추가한다.
- `BuildingSystem`에 `getBuildingSelectionSummary(buildingId)`를 추가한다.
- `main.ts`의 좌클릭 처리 우선순위는 `placement -> building hit test -> unit selection` 순서로 둔다.
- 선택 상태는 `selectedUnitIds`와 `selectedBuildingId`를 분리해서 관리한다.
- 건물을 선택하면 unit selection은 해제한다.
- command card는 building selection에 따라 page를 바꿀 수 있게 확장한다.

후속 command card 후보:

| Building state | Command candidates |
| --- | --- |
| `constructing` | Cancel, rally/none |
| `complete` wall | Repair, Upgrade, Sell |
| `complete` tower | Repair, Upgrade, Sell, Hold fire 후보 |
| `complete` coop | Hatch/Buy chicken/Upgrade/Sell 후보 |

주의:

- 건설 중 취소/환불은 아직 1차 PoC 범위 밖이다. 정보 패널은 먼저 읽기 전용으로 구현한다.
- building selection hit area는 sprite alpha가 아니라 `footprint` rectangle을 우선 사용한다.
- 이후 sprite가 들어오면 visual bounds와 footprint bounds가 다를 수 있으므로, 클릭 판정은 `selectionBounds` 필드를 별도로 둘 수 있게 열어둔다.
- 워3식으로는 건물 선택 시 좌측 portrait 영역이 필요하지만, MVP에서는 중앙 정보 패널 텍스트/아이콘만으로 시작한다.

## 7. ConstructionPlacementSystem

새 파일 후보:

- `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts`
- `games/chicken-farm/src/game/systems/constructionTypes.ts`

책임:

- 현재 배치 중인 building template을 보관한다.
- pointer world position을 build grid에 snap한다.
- footprint rect와 배치 가능 여부를 계산한다.
- ghost graphics를 렌더링한다.
- 좌클릭 시 즉시 건물을 만들지 않고 pending build order를 만든다.
- pending build order는 선택된 농부에게 현장 접근점으로 이동 명령을 내린다.
- 농부가 접근점에 도착하면 `BuildingRuntimeSystem`에 build request를 전달한다.
- `Esc` 또는 우클릭으로 placement를 취소한다.

배치 가능 검사:

- world bounds 안인가
- WPM terrain/pathing blocked cell을 침범하지 않는가
- WPM build blocked cell을 침범하지 않는가
- 기존 player-built building footprint와 겹치지 않는가
- 선택된 builder가 있는가
- 자원이 충분한가

1차 PoC에서 미루는 것:

- builder range 검사
- worker interrupt/repair/cancel refund
- 건물 회전
- 다중 builder 건설 가속

## 8. BuildingRuntimeSystem

새 파일 후보:

- `games/chicken-farm/src/game/systems/buildingSystem.ts`

상태 초안:

```ts
type PlayerBuilding = {
    id: string;
    templateId: MvpBuildingId;
    ownerPlayerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    maxHp: number;
    armor: number;
    blocksPath: boolean;
    targetableByWolves: boolean;
    state: 'constructing' | 'complete';
    startedAtSec: number;
    completesAtSec: number;
    workerUnitId?: string;
};
```

책임:

- build request를 받아 자원을 차감하고 constructing building을 생성한다.
- scaffold view와 progress bar를 표시한다.
- `elapsedSec >= completesAtSec`이면 complete 상태로 전환한다.
- complete building은 `getDynamicBlockedRects()`에 포함한다.
- 이후 combat 재연결을 위해 `getWolfTargetableBuildings()` 형태의 API를 열 수 있게 둔다.

초기 build time override:

```ts
const CONSTRUCTION_POC_BUILD_TIMES = {
    fence_wood: 1.5,
    tower_scout: 3,
    farm_house: 4,
    coop_basic: 4,
} as const;
```

후속 정리 방향:

- 위 override는 임시값이다. 다음 단계에서는 `buildingTemplates.ts`의 `buildTimeSec`를 source of truth로 채운다.
- 원본 build time은 아직 SLK/W3X 교차 검증이 부족하므로 `source.notes`에 `mvp_build_time_tuned` 또는 `original_build_time_unverified`를 남긴다.
- 건물 스프라이트는 `spriteId`, `constructionSpriteId`, `iconId`를 별도 asset manifest로 매핑한다.
- 건설 중 시각은 공통 scaffold sprite를 우선 사용한다. 3x3/4x4 scaffold가 P0 에셋이다.

## 8.1 Building Data Cleanup Checklist

건설 PoC 이후 `buildingTemplates.ts`에서 우선 정리해야 할 항목:

| 필드 | 정리 내용 |
| --- | --- |
| `footprintCells` | 32px runtime footprint 기준으로 유지하되, 64px placement snap과 충돌하지 않는지 확인 |
| `hp` / `armor` | W3X 추출값과 현재 MVP 값 차이 표시 |
| `buildTimeSec` | MVP 체감값 채우기. 원본 검증 전까지 notes에 상태 표시 |
| `costCoins` / `costLumber` | PoC 경제값과 원본 비용 병기 |
| `blocksPath` | planned/constructing/complete 중 언제 blocker가 되는지 정책 연결 |
| `targetableByWolves` | constructing/complete 각각 늑대 target 가능 여부 결정 |
| `requires` | PoC에서는 무시하지만 MVP에서는 command card disabled 조건으로 사용 |
| `attack` / `aura` | complete 이후 활성화되는 기능으로 분리 |

P0 건물 우선 정리:

| Building | 현재 역할 | 우선 결정 |
| --- | --- | --- |
| `fence_wood` | 길막/방어 baseline | 4x4 footprint가 segment 시각과 맞는지 재검토 |
| `tower_scout` | 초반 방어 타워 | complete 후 공격 활성화, 건설 중 공격 불가 |
| `farm_house` | core/가족 생산 허브 | command card root 건물 선택 UI 후보 |
| `coop_basic` | economy baseline | 다음 economy tick PoC의 수익 건물 |

## 8.2 Building Visual State Policy

건물 runtime state는 다음 기준으로 확장한다.

| State | Runtime 의미 | Visual |
| --- | --- | --- |
| `planned` | 농부가 현장으로 이동 중인 pending build order | 노란 footprint outline |
| `constructing` | 농부가 도착해 작업 중 | scaffold sprite + progress bar |
| `complete` | 완성 | 완성 sprite + HP bar |
| `damaged` | 완성 후 피해 | damage overlay 후보 |
| `destroyed` | 파괴 | debris 후보 |

현재 구현 결정:

- `planned`은 blocker가 아니다.
- `constructing`은 아직 blocker가 아니다.
- `complete`만 dynamic blocker에 포함한다.

후속 검토:

- 워3 체감에 가깝게 하려면 `constructing`도 blocker로 삼는 편이 자연스럽다.
- 단, 농부가 footprint 밖 접근점에 도착한 뒤 착공해야 유닛 끼임을 피할 수 있다.
- 늑대 combat 재활성화 시 constructing building을 공격 가능한 target으로 볼지 별도 결정한다.

## 9. Economy Minimum

Construction PoC에는 최소 자원 상태만 둔다.

초기값 후보:

- `coins = 500`
- `lumber = 300`

규칙:

- `canAfford(template)`과 `spend(template)`만 구현한다.
- UI debug line 또는 HUD에 현재 자원을 표시한다.
- egg drop, shop purchase, coop income은 다음 PoC로 분리한다.

주의:

- 현재 MVP 문서에서는 자원 단순화를 위해 coins wallet을 우선한다고 되어 있다.
- 하지만 `buildingTemplates.ts`에는 `costLumber`가 이미 있으므로, 건설 PoC에서는 coins/lumber 둘 다 읽되, 누락된 값은 0으로 처리한다.

## 10. Telemetry

초기부터 아래 이벤트를 남긴다.

- `construction_page_opened`
- `build_placement_started`
- `build_placement_cancelled`
- `build_placement_rejected`
- `building_construction_started`
- `building_completed`

`build_placement_rejected` payload에는 최소한 다음 값을 둔다.

- `buildingId`
- `x`
- `y`
- `reason`

## 11. 구현 순서

1. `CHICKEN_FARM_POC_FLAGS` 추가 및 `CombatPocSystem` flag wiring
2. `FarmInputKeys`의 `S` 충돌 정리
3. HUD command grid를 실제 3x4 버튼으로 확장
4. `CommandCardSystem` 추가
5. `BuildingRuntimeSystem` 추가
6. `ConstructionPlacementSystem` 추가
7. `main.ts`에서 command card, placement, building runtime 연결
8. `ControllableUnitSystem.getDynamicBlockedRects` 입력에 player-built building blockers 합류
9. telemetry/debug state 확장
10. `npm` build/typecheck 및 dev server 수동 검증

## 12. 검증 체크리스트

- 농부를 선택하지 않으면 build command가 비활성화된다.
- 농부 선택 후 `B -> F`로 울타리 배치 모드에 들어간다.
- `B -> T`, `B -> H`, `B -> C`가 각각 의도한 building template을 선택한다.
- `Esc`와 우클릭으로 배치 모드를 취소할 수 있다.
- 빨간 ghost 위치에서 클릭해도 건물이 생성되지 않는다.
- 초록 ghost 위치에서 클릭하면 자원이 차감되고 scaffold가 생긴다.
- build time이 지나면 complete 상태가 된다.
- 완성 건물 footprint는 유닛 이동 pathing의 dynamic blocker로 작동한다.
- combat flag를 다시 켜도 기존 Combat PoC 생성/업데이트 경로가 깨지지 않는다.

## 13. 다음 PoC 연결

Construction Placement PoC 이후 우선순위:

1. `coop_basic`의 30초 egg/income tick
2. 시장/닭 구매 command card page
3. player-built tower의 공격 기능
4. combat flag 재활성화 후 늑대가 player-built fence/tower/coop을 blocker 또는 target으로 인식하는지 검증

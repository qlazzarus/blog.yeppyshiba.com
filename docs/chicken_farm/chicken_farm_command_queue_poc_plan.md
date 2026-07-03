# Chicken Farm Command Queue PoC Plan

이 문서는 Chicken Farm Phaser PoC에 Warcraft III/Warsmash식 예약 명령을 붙이기 위한 구현 후보를 정리한다.

목표는 "Shift 예약"을 먼저 이동/건설/생산으로 나눠 이해하고, 다음 구현 단계에서 어느 범위부터 넣을지 잃지 않도록 고정하는 것이다.

## 1. Warsmash 기준 요약

기존 Warsmash 관찰 노트 기준:

- 플레이어 명령은 `CPlayerUnitOrderExecutor`에서 point/target/no-target order로 변환된다.
- `CUnit.order(...)`는 queue 여부와 현재 behavior interrupt 가능 여부를 보고 현재 명령을 교체하거나 order queue에 넣는다.
- 현재 behavior가 끝나면 다음 order를 poll해 이어서 수행한다.
- 건설 명령도 point-target unit order로 들어가므로 `Shift` 예약 대상이다.
- Warsmash의 Human build 기준 비용 차감은 order가 큐에 들어갈 때가 아니라 build behavior가 실제 시작될 때 발생한다.
- build behavior가 시작된 뒤 부지가 막혀 있으면 비용을 환불하고 다음 order로 넘어간다.
- 생산/훈련은 유닛의 이동 behavior queue와 별도 성격이다. 건물/능력 쪽 생산 queue가 진행 시간, 비용, cancel/refund, rally point와 연결된다.

따라서 Chicken Farm에서는 예약을 하나의 큰 기능으로 뭉치지 않고 아래 두 축으로 나눈다.

| 축 | Warsmash/War3 개념 | Chicken Farm 구현 후보 |
| --- | --- | --- |
| 이동/행동 예약 | unit order queue, Shift command | farmer/dog의 move, smart attack, build/resume order queue |
| 생산 예약 | building ability production queue | farm house/town hall/coop/market의 train/hatch/research/shop queue |

주의:

- 일반 우클릭/명령은 현재 명령과 예약 큐를 교체한다.
- `Shift`를 누른 명령은 현재 명령을 유지하고 뒤에 append한다.
- `Stop`은 현재 명령과 예약 큐를 모두 비운다.
- 명령 큐와 생산 큐는 표시 UI, 취소 규칙, 비용 처리 방식이 다르다.

## 2. 구현 대상 리스트

### P0. Unit Movement/Action Queue

가장 먼저 구현할 범위다.

대상:

- 농부/개 선택 상태에서 `Shift + 우클릭 ground`로 이동 지점 예약
- `Shift + 우클릭 enemy/building`으로 smart attack/resume 예약
- 예약된 move command는 현재 path가 끝나면 다음 command로 이어진다.
- 예약된 command marker를 월드에 번호 또는 작은 점선으로 표시한다.
- `S Stop`은 현재 command와 queued commands를 모두 삭제한다.

코드 후보:

- `playerCommandTypes.ts`
  - `UnitCommand`에 `queuedAtSeq`, `queueMode` 후보 추가
  - `UnitCommandQueueItem` 타입 추가
- `controllableUnitSystem.ts`
  - `commandQueue: UnitCommand[]`를 `ControllableUnitState`에 추가
  - `issueMoveCommandToUnits(..., { queueMode })`
  - `issueSmartCommandToSelected(..., { queueMode })`
  - current command 완료 시 `pollNextQueuedCommand(unit)`
- `main.ts`
  - pointer/keyboard 입력에서 `pointer.event.shiftKey` 또는 keyboard shift state를 읽어 `queueMode` 결정
- 신규 후보 `queuedCommandRenderer.ts`
  - 예약 지점/순서를 표시하는 world overlay

완료 기준:

- farmer를 선택하고 우클릭 이동 후 `Shift + 우클릭` 여러 번으로 waypoint queue를 쌓을 수 있다.
- 첫 이동이 끝나면 다음 예약 이동이 자동 시작된다.
- 일반 우클릭을 하면 기존 queue가 사라지고 새 명령만 수행한다.
- `S`를 누르면 현재 이동과 예약 이동이 모두 중단된다.
- debug/selection info에 `Queued N`이 표시된다.

현재 구현:

- `ControllableUnitState.commandQueue`를 추가했다.
- 일반 우클릭/smart command는 `replace`, `Shift + 우클릭`은 `append`로 발행한다.
- command card `A Attack`도 같은 규칙을 따른다. 적을 찍으면 target attack, 땅을 찍으면 attack-move로 발행하고 `Shift + A`는 queue 뒤에 append한다.
- queued move/attack은 현재 command가 끝난 뒤 순서대로 시작한다.
- `Stop`은 현재 command와 unit command queue를 모두 비운다.
- 예약 명령은 임시 world marker와 선택 정보 패널의 `Queued N`으로 확인한다.

### P0. Builder Construction Queue

이동 예약 위에 붙이는 건설 예약이다.

대상:

- 건설 배치 중 `Shift + 좌클릭`이면 placement mode를 닫지 않고 다음 부지를 계속 찍을 수 있다.
- 같은 농부에게 여러 pending build order를 순서대로 쌓는다.
- 각 build site는 planned -> constructing -> complete 순서로 진행된다.
- 앞 건설이 complete되면 다음 pending site 접근점으로 이동한다.
- `Stop`은 현재 건설을 pause하고 남은 예약 건설 이동/부지 큐는 정책에 따라 비운다.

정책 결정:

| 항목 | P0 결정 |
| --- | --- |
| 자원 차감 시점 | Warsmash 기준: 예약 시점이 아니라 build behavior 시작 시 차감 |
| 배치 overlap | 배치 시 1차 검사, 착공 직전 재검사. 막히면 환불/에러 후 다음 예약으로 진행 |
| 취소 환불 | 현재 건설 취소와 동일하게 75% 환불 후보 |
| Shift placement | 계속 배치 모드 유지 |
| 일반 placement | 기존처럼 1개 배치 후 placement mode 종료 |

현재 코드 영향:

- `ConstructionPlacementSystem.pendingOrders`는 이미 order 배열이라 확장하기 좋다.
- 다만 현재는 농부가 현장에 도착했을 때 `createBuilding()`이 비용을 차감한다.
- 이 흐름은 Warsmash Human build의 "queued order -> begin build behavior -> chargeFor -> obstructed면 refund" 흐름과 대체로 맞다.
- 따라서 P0에서는 planned runtime/resource reserve를 만들지 않고, 착공 직전 자원/부지 검사를 강화하는 쪽을 우선한다.
- planned footprint는 UX용 preview/marker로는 유용하지만 실제 pathing 예약 점유로 취급하는 것은 P1 이후에 재검토한다.

현재 구현:

- 건설 배치 중 `Shift + 좌클릭`이면 placement mode를 유지한다.
- 같은 농부에게 여러 pending build order를 순서대로 쌓는다.
- 앞 건설이 complete되면 다음 pending build site로 이동한다.
- pause된 건설 건물을 `Shift + 우클릭`하면 resume 이동이 unit command queue 뒤에 append된다.
- 자원 reserve/planned runtime은 넣지 않는다. 기존처럼 실제 착공 시 `createBuilding()`에서 비용을 차감하는 방향이 Warsmash 기준과 맞다.
- 농부가 현장에 도착하면 착공 직전에 자원/월드 경계/지형/기존 건물 overlap을 재검사한다.
- 착공 직전 검사가 실패하면 해당 pending build order만 제거하고 현장 에러 표시/telemetry를 남긴 뒤 다음 예약 건설로 넘어간다.

### P1. Building Production Queue

생산 예약은 이동 예약과 별도 시스템으로 둔다.

대상 후보:

- `farm_house` / `town_hall`: dog, family/helper unit 생산 후보
- `coop_basic`: chicken/economy tick 또는 hatch 후보
- `market`: shop purchase queue 후보는 후순위
- `research` 건물: upgrade/research queue 후보는 후순위

코드 후보:

- 신규 `productionQueueSystem.ts`
- `BuildingSystem`에 `productionQueue`를 직접 넣을지, 별도 `ProductionQueueSystem`이 building id를 참조할지 결정
- `CommandCardSystem`에 building selection page 추가
- 중앙 selection info panel에 queue slots 표시

War3/Warsmash식 규칙 후보:

| 항목 | P1 결정 후보 |
| --- | --- |
| queue 시작 | 첫 item은 즉시 production progress 시작 |
| 추가 생산 | Shift 또는 버튼 반복 클릭으로 뒤에 append |
| 비용 처리 | queue item 추가 시 즉시 차감/예약 |
| cancel | 선택한 queue item 취소, 일부/전액 환불 정책 검토 |
| rally | 생산 완료 위치는 building rally point 또는 기본 근처 spawn |
| capacity | Warsmash/WC3 기준 queue cap 확인 전까지 PoC cap을 명시적으로 둔다 |

P1 완료 기준:

- 완성된 `farm_house`를 선택하면 train 후보 command card가 나온다.
- train 버튼을 여러 번 누르면 생산 queue가 쌓인다.
- 중앙 정보 패널에 현재 생산률과 queued count가 표시된다.
- 첫 생산이 완료되면 unit이 rally point 또는 건물 근처에 생성된다.
- queue item cancel이 가능하다.

## 3. 공통 Command Queue 모델

권장 타입 초안:

```ts
type CommandQueueMode = 'replace' | 'append';

type QueuedUnitCommand = UnitCommand & {
    readonly issuedSeq: number;
    readonly queueMode: CommandQueueMode;
};
```

입력 규칙:

- `Shift`가 눌려 있으면 `append`
- 그렇지 않으면 `replace`
- command card 버튼도 같은 규칙을 따른다.
- `Esc`는 placement/build page cancel이며 이미 발행된 unit queue는 건드리지 않는다.
- `S Stop`은 unit current command와 unit order queue를 모두 비운다.

실행 규칙:

```text
issue command:
  if queueMode == replace:
    clear current command
    clear queued commands
    start command now
  else:
    append command
    if no current command:
      poll and start first queued command

on command complete:
  if queue not empty:
    start next queued command
  else:
    current command = undefined
```

## 4. UI / Feedback

### Unit Queue Feedback

- 월드 위에 예약 이동 marker를 작게 표시한다.
- 1, 2, 3 번호 또는 점선 경로를 표시한다.
- 선택 정보 패널에 `Command: move | Queued 3`처럼 표시한다.
- 예약 명령이 invalid가 되면 해당 marker를 제거하고 telemetry에 reason을 남긴다.

### Production Queue Feedback

- building selection info panel 아래쪽에 queue slot 표시 후보를 둔다.
- command card에는 train/cancel/rally 후보를 표시한다.
- production progress는 현재 건설 progress와 같은 UI 문법을 쓰되 색만 구분한다.

## 5. Telemetry

추가 이벤트 후보:

- `unit_command_queued`
- `unit_command_queue_started`
- `unit_command_queue_completed`
- `unit_command_queue_cleared`
- `build_order_queued`
- `build_queue_completed`
- `production_queue_item_added`
- `production_queue_item_started`
- `production_queue_item_completed`
- `production_queue_item_cancelled`

## 6. 구현 순서 제안

1. `CommandQueueMode` 타입과 Shift 입력 판정 추가
2. `ControllableUnitState.commandQueue` 추가
3. move queue만 먼저 구현
4. smart attack/resume queue 연결
5. queued command world marker 구현
6. selection info panel에 queued count 표시
7. Shift construction placement 유지/연속 배치 구현
8. 착공 직전 자원/부지 재검사 및 실패 시 다음 예약 진행 보강
9. building production queue PoC로 확장

## 7. 보류 / 추가 검증

- Warsmash/WC3의 정확한 생산 queue capacity는 구현 전 한 번 더 확인한다.
- 실제 Warcraft III 클라이언트 체감과 다른 종족 build behavior 차이는 추가 확인한다. 현재 Chicken Farm P0는 Warsmash Human build 기준으로 맞춘다.
- `Shift + Stop`, `Shift + command card cancel` 같은 조합은 MVP에서는 별도 의미를 두지 않는다.
- attack-move 예약은 최소 구현 상태다. 남은 검증은 combat flag smoke에서 실제 적 대상 acquire와 target 처치 후 원래 목적지 복귀를 확인하는 것이다.
- 다중 선택에서 여러 유닛 queue를 같은 순서로 받을지, formation offset을 queue마다 계산할지는 P1 이후로 미룬다.

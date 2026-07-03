# Chicken Farm Next Priority Plan

이 문서는 Chicken Farm Phaser MVP의 다음 PoC 우선순위와 구현 기준을 정리한다.

## 1. 현재 결정

장기 목표는 개별 PoC를 쌓는 것이 아니라, **Warsmash/Warcraft III식 선택, 명령 타일, 예약, 건설, 공격 감각으로 닭농장 MVP를 재구성하는 것**이다. 건설 PoC는 이 목표를 검증하기 위한 한 단계이며, 이후 경제/상점/전투도 같은 command model 위에 붙인다.

다음 우선 구현 PoC는 **War3 Command Combat Smoke PoC**를 짧게 통과한 뒤 **Economy / Build / Shop PoC**로 들어간다.

Construction Placement PoC와 Construction Visibility P0는 1차 조작 루프 기준으로 통과 상태다. 구현 계획과 남은 polish 후보는
[`chicken_farm_construction_poc_plan.md`](./chicken_farm_construction_poc_plan.md)와
[`chicken_farm_construction_visibility_poc_plan.md`](./chicken_farm_construction_visibility_poc_plan.md)에
별도로 고정한다.

War3 Command Combat Smoke PoC는 새 전투 시스템을 만드는 단계가 아니라, 현재 들어간 `A Attack`/attack-move/Shift queue가 실제 적 대상과 연결될 때 Warsmash 감각을 깨지 않는지 확인하는 얇은 검증 단계다. 2026-07-03 기준 런타임에는 `combatSmoke` feature flag로 플레이어 시작 위치에서 한 화면 떨어진 늑대 1마리를 배치하고, 직접 공격 또는 player-built tower로 교전할 수 있는 smoke target이 들어갔다.

예약 명령 PoC는
[`chicken_farm_command_queue_poc_plan.md`](./chicken_farm_command_queue_poc_plan.md)에
별도로 고정한다. Warsmash 기준으로 이동/행동 예약과 건물 생산 큐는 같은 "예약" UX를
공유하지만 런타임 책임이 다르므로, 구현도 분리한다.

`CombatPocSystem`은 삭제하지 않고 feature flag로 관리한다. 건설 집중 단계에서는 꺼두지만, command smoke에서는 잠깐 켜서 농부/개 공격 명령과 늑대 target acquisition을 확인한다. 경제 tick,
상점, 웨이브는 command smoke 이후 이어 붙인다.

**War3 Player Command Control PoC**는 MVP 경제/건설/상점 PoC를 붙일 수 있는 최소 조작 기반으로 완료 판단한다. 단, 원본 Warcraft III 조작 전체 구현은 아니므로 신뢰도 부족 범위는 별도 관리한다.

판단 근거:

- 카메라/선택/우클릭 이동/우클릭 공격/stop/drag selection/path follow가 동작한다.
- WPM terrain blocker, dynamic blocker, path smoothing, 최소 unit push가 command path에 연결됐다.
- 닭장 구매, 거미 사냥, 상점 이용, 건설, 전투 방어는 이제 "유닛 선택 -> 명령 발행 -> 시스템 실행" 흐름 위에 붙일 수 있다.
- 차후 P2P에서는 위치 변경이 아니라 player input command stream을 동기화해야 한다.

Construction Placement PoC 1차 완료 기준:

- 농부 선택 후 `B` 또는 command card 버튼으로 Build page에 진입한다.
- `F`/`T`/`H`/`C` 단축키로 `fence_wood`, `tower_scout`, `farm_house`, `coop_basic` 배치 모드에 들어간다.
- 마우스 위치에 grid-snapped footprint ghost를 표시하고, 가능/불가능 상태를 색상으로 구분한다.
- 좌클릭으로 건설을 시작하고, `Esc` 또는 우클릭으로 취소한다.
- 완성된 건물은 player-built dynamic blocker로 등록되어 유닛 이동을 막는다.
- combat flag를 다시 켰을 때 늑대 blocker/target 후보로 연결할 수 있는 API 경계를 남긴다.

Construction Placement PoC 현 점수:

| 기준 | 점수 | 근거 |
| --- | ---: | --- |
| Warsmash 감각 | 7.8 / 10 | 명령 타일, Shift 예약, 농부 이동 후 착공, pause/resume, cancel, 착공 시 비용 차감, `A Attack`/attack-move 입력은 맞다. attack-move target 처치 후 원래 목적지 복귀, 생산 queue, rally, tech/supply 사용은 아직 부족하다. |
| Chicken Farm 감각 | 7.7 / 10 | P3 farm zone 시작, W3X footprint/build time, 자원 HUD, 건물 시야 source, HP/progress 가시성이 붙었다. 다만 닭장 수익, 알 루프, 건물 기능, player-built tower 공격/시야 연결이 아직 부족하다. |
| PoC 조작성 | 7.4 / 10 | 기본 루프와 command card는 가능하다. zoom은 맵 기준 때문에 유지하고 visual affordance로 보강했지만, 실제 sprite/상태창/선택 outline은 후속이다. |

남은 PoC 판정:

| 우선 | PoC | 왜 남았는가 | 완료 기준 |
| ---: | --- | --- | --- |
| 1 | War3 Command Combat Smoke | smoke enemy spawn과 직접 공격 연결은 구현됐다. target 처치 후 attack-move 원래 목적지 복귀와 telemetry 보강은 아직 남았다. | combat smoke에서 농부/개 `A + 적`, `A + 땅`, `Shift + A`가 동작하고, target 처치 후 attack-move 목적지 복귀가 된다. |
| 2 | Player-built Tower Combat | player-built tower가 visible enemy target을 acquire/attack하는 최소 런타임은 구현됐다. 늑대의 player-built blocker/타워 반응은 실제 웨이브 통합 때 추가 검증한다. | 건설한 `tower_scout`이 현재 시야 안 늑대만 acquire/attack하고, 늑대는 blocker/타워 반응을 유지한다. |
| 3 | Economy / Build / Shop | 닭농장 핵심인 알/닭/닭장/상점 루프가 아직 resource HUD 숫자 수준이다. | field egg item 생성, 농부 수집, 판매, 부화, coop 구매/업그레이드가 command/system API로 연결된다. |
| 4 | Building Production / Tech Card | Warsmash식 완성 건물 command card가 비어 있고, 생산 queue/tech unlock/requires가 미연결이다. | 완성 건물 선택 시 train/hatch/upgrade/research/sell 후보가 조건부 표시되고 queue/cancel/rally 기본형이 있다. |
| 5 | Wolf Wave On Real Map | 기존 Combat PoC는 고정 combat layout 검증에 가깝고, 실제 P3 farm zone + player-built blocker와 통합된 웨이브가 아니다. | 원본 JASS식 random attack-move refresh로 늑대가 실제 농장 구역에 들어오고, built fence/tower/coop을 target/blocker로 다룬다. |
| 6 | Sprite / State Asset Pass | 현재 shape 기반이라 구분은 되지만 최종 닭농장 감성은 sprite/state icon으로 가야 한다. | farmer/dog/building planned/constructing/complete/damaged sprite와 command icon이 manifest에 연결된다. |
| 7 | Replay / Simulation Boundary | P2P 전제로는 command/state 재현성이 필요하지만 현재 Phaser object 중심 상태가 남아 있다. | command log/replay smoke와 pure simulation boundary가 경제/전투 핵심 루프에 적용된다. |

빌딩 시야 P0 정책:

- 완성 건물은 기본 `VISIBILITY_OVERLAY.revealRadiusPx`의 0.75배 반경을 제공한다.
- 건설중 건물은 active worker가 붙어 있을 때만 0.45배 반경을 제공한다.
- 시야는 플레이어 유닛 시야와 합산한다. 어느 source라도 닿는 fog cell은 현재 시야로 비운다.
- explored 상태와 미니맵 explored 영역도 같은 source 기준으로 갱신한다.
- 적 시야/플레이어별 시야 분리는 P2P/player slot PoC 전까지 보류한다.

타워 공격과 시야 정책:

- Warsmash 기준 자동 공격은 `acquisitionRange` 안의 후보를 찾은 뒤 targetability를 검사한다.
- targetability에는 `isVisible(sourcePlayer)` 조건이 포함되므로, 공격 탐지/사거리만 충분해도 현재 시야가 없으면 자동 공격 대상이 되지 않는다.
- Chicken Farm도 이 규칙을 따른다: 타워 공격 후보는 `attack.rangePx` 안에 있고 `VisibilitySystem.isCurrentlyVisible(x, y)`를 통과해야 한다.
- 타워는 일반 건물보다 넓은 시야를 제공해 자기 공격 범위를 자연스럽게 밝히는 역할을 가진다. 현재 런타임은 complete building vision을 기본 반경과 `attack.rangePx` 중 큰 값으로 잡는다. 정확한 배율은 타워 라인 구현 때 `visionRadiusMultiplier`로 분리한다.
- 공격 명령을 직접 찍는 수동 타겟팅과 자동 타겟팅은 모두 visible target 조건을 공유한다.

건설 PoC 가시성 정책:

- 카메라 zoom은 현재 닭농장 맵 기준을 유지한다. 농장/스폰/중앙 허브 거리감 검증이 우선이므로 건설 PoC만을 위해 zoom을 당기지 않는다.
- 대신 플레이 조작에 필요한 visual affordance를 zoom과 분리한다.
- 유닛/건물 sprite는 collision/footprint와 별도로 render scale을 둘 수 있다. footprint와 blocker는 W3X `pathTex` 기준을 유지한다.
- 선택 링, HP bar, 건설 progress bar, paused/cancel 상태 표시는 최소 화면 크기를 보장한다.
- placement ghost는 valid/blocked 색만이 아니라 두꺼운 outline, hatch fill, rejection marker를 사용한다.
- 선택 또는 작업 대상에는 짧은 focus pulse를 띄워 넓은 화면에서도 현재 조작 대상을 찾기 쉽게 한다.
- `P3 PLAYER` debug marker는 기본 비활성화한다. 실제 조작 대상은 controllable farmer/dog이며, 슬롯 확인이 필요할 때만 flag로 marker를 다시 켠다.
- 구현 순서와 완료 기준은 [`chicken_farm_construction_visibility_poc_plan.md`](./chicken_farm_construction_visibility_poc_plan.md)를 따른다.

## 2. 진행 원칙

- PoC는 구현 리스크를 쪼개기 위한 단계이며, MVP의 원본 경험 범위를 줄이는 기준이 아니다.
- 빠른 검증은 룰 축소가 아니라 `timeScale`, debug preset, 자동 측정 스크립트로 처리한다.
- Phaser GameObject 직접 조작은 adapter에만 둔다.
- 핵심 게임 진행은 command, component, pure system 형태로 유지해 ECS/P2P로 승격하기 쉽게 만든다.
- 워3식 조작은 Warsmash 전체 복제가 아니라 Chicken Farm MVP에 필요한 최소 command model로 축약한다.
- Shift 예약은 먼저 unit movement/action queue로 구현하고, 이후 construction queue와 building production queue로 확장한다.
- 명령 타일 UI 클릭과 단축키 입력은 같은 command action dispatcher를 호출한다.
- 유닛 명령 카드의 `A Attack`은 Warsmash/WC3식으로 다음 클릭을 공격 타겟팅으로 소비한다. 적을 찍으면 직접 공격, 지면을 찍으면 attack-move 명령으로 처리한다.
- 명령 단축키 충돌을 피하기 위해 카메라 pan은 방향키 기준으로 두고, `A`/`S`/`B` 등은 command card hotkey로 우선 사용한다.
- 전투 PoC 비활성화는 임시 focus 전환이며, 전투 로직을 제거하거나 과거 검증 결과를 폐기하지 않는다.

## 3. Archive된 완료 이력

완료된 기반 PoC와 War3 Player Command Control 세부 기록은 active planning에서 제외하고 archive로 이동했다.

- 압축 요약: [`archive/completed_poc_history.md`](./archive/completed_poc_history.md)
- 이동 전 상세 스냅샷: [`archive/next_priority_plan_before_completed_section_trim_2026-07-01.md`](./archive/next_priority_plan_before_completed_section_trim_2026-07-01.md)

Active 문서에는 현재 건설/경제/시야/테크 판단에 필요한 항목만 유지한다.

## 4. 현재 신뢰도: War3 Player Command Control

현재 판단:

- Command Control PoC는 MVP의 다음 경제/건설/상점 PoC를 붙일 수 있는 최소 조작 기반으로는 통과다.
- 원본 Warcraft III 조작 전체 구현은 아니며, 닭농장 MVP에 필요한 선택/이동/공격/정지/경로 추종 중심의 축약판이다.
- 다음 단계로 진행하되, 아래 한계는 PoC 7/6 구현 중 계속 관리한다.

확보된 범위:

- 카메라 이동, 클릭 선택, 드래그 선택, 우클릭 이동, 우클릭 공격, stop command.
- command card 기반 `A Attack`: 적 target 직접 공격과 지면 attack-move 발행.
- 농부/개 controllable unit state와 원본 기준 이동속도.
- WPM terrain blocker + dynamic blocker + smoothed path follow.
- 농부/개/늑대 완전 중첩 방지와 최소 push-out.
- 늑대의 농부/개 acquisition, target follow/repath, blocker fallback.
- Node/Playwright 기반 성능 측정과 regression artifact.

신뢰도가 부족한 범위:

| 범위                           | 현재 수준                    | 리스크                                                        | 관리 방침                                             |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Attack-move                    | 입력/이동/자동획득 최소판 구현 | combat off 기준이라 실제 적 대상 smoke와 target 처치 후 목적지 복귀 검증 부족 | War3 Command Combat Smoke에서 보강                    |
| Command queue/control group    | P0 일부 완료                 | 이동/건설 예약은 있으나 생산 queue, control group, replay 부족 | 생산 queue는 P1, control group/replay는 MVP 필수 전까지 보류 |
| ECS 분리                       | 부분 분리                    | `ControllableUnitSystem`, `CombatPocSystem`에 view/state 혼재 | 경제/상점은 처음부터 state/system/view adapter로 작성 |
| Unit collision/local avoidance | 최소판                       | 다중 유닛/좁은 통로에서 흔들림 가능                           | 회귀 발견 시 movement adapter에서 국소 수정           |
| Pathing 정확도                 | WPM + dynamic blocker 축약판 | 원본 워3 pathing texture/collision과 차이 가능                | 측정 artifact와 수동 플레이 확인 병행                 |
| Browser frame pacing           | 일부 불명확                  | Playwright headless `frameMaxMs`가 hot label과 불일치         | 최적화 판단은 hot label + 수동 체감 기준으로 병행     |
| Browser suspend                | 정책 문서화                  | hidden/minimized 상태에서 큰 delta가 전투에 적용될 수 있음    | host hidden pause, client resync, large delta guard    |
| Network monster sync           | 정책 문서화                  | P2P 승격 시 클라이언트별 늑대 위치/공격 결과 불일치 가능      | host-only monster AI, snapshot/event/checksum 적용     |
| Deterministic replay           | 미구현                       | P2P 승격 시 command 재현성 검증 부족                          | PoC 13/15 전에 command log/replay 측정 추가           |

다음 단계 진입 기준:

- War3 Command Combat Smoke를 먼저 통과한 뒤 PoC 7 경제/건설/상점을 진행한다.
- 단, 구현 중 attack/interact/build command hook을 늘릴 때 `main.ts` 직접 분기보다 command/system API를 우선한다.
- 신뢰도 부족 범위는 지금 더 파고들지 않고, 실제 경제/상점 루프에 걸리는 순간에 보강한다.

## 5. 다음 단계: War3 Command Combat Smoke -> Economy / Build / Shop PoC

### 5.1 War3 Command Combat Smoke

목표:

- 현재 `CombatPocSystem`을 잠깐 켜고 농부/개 command card의 `A Attack`을 실제 적 대상과 대조한다.
- `A + 적 클릭`은 target attack, `A + 땅 클릭`은 attack-move로 동작한다.
- attack-move 중 적을 처치하거나 target이 사라지면 원래 attack-move 목적지/queue로 복귀한다.
- 직접 공격/attack-move/타워 자동 공격은 모두 현재 시야 조건을 공유한다.
- 이 smoke는 전투 PoC 재개가 아니라 command model 검증이다. 완료 후 combat flag 기본값은 건설/경제 작업에 맞춰 다시 결정한다.

완료 기준:

- 농부/개 선택 -> `A` -> 땅 클릭 시 `A-MOVE`가 표시되고 이동 중 늑대를 acquire한다.
- 농부/개 선택 -> `A` -> 늑대 클릭 시 target attack으로 추격/공격한다.
- target 처치 후 attack-move 원래 목적지로 돌아가거나 다음 queued command를 수행한다.
- `Shift + A`는 기존 queue 뒤에 append된다.
- smoke telemetry에 `unit_attack_command_issued`, attack-move acquire, target clear/resume 이벤트가 남는다.

2026-07-03 구현 스냅샷:

- `CHICKEN_FARM_POC_FLAGS.combatSmoke`가 켜지면 기존 대형 Combat PoC는 꺼둔 채 검증용 늑대 1마리만 생성한다.
- 늑대는 현재 플레이어 시작 위치에서 가로 한 화면(`16 major tiles`) 떨어진 지점에 배치되고, 가장 가까운 플레이어 유닛을 향해 이동한다.
- `BuildingSystem`은 완성된 `attack` 보유 건물이 현재 시야 안의 살아 있는 적을 자동 acquire하고 `damageEnemyTarget`으로 피해를 준다.
- `VisibilitySystem`은 explored fog와 별도로 현재 visible fog cell을 보관해 타워 자동 공격 targetability에 사용한다.
- 2026-07-03 전투 로그(`chicken-farm-poc_2026-07-03T06-28-36-981Z_vcmmhn.jsonl`)에서 player-built tower가 늑대를 공격하더라도 늑대 이동 시스템은 `CombatPocSystem.combatBuildings`만 blocker로 봐서 완성 타워 footprint를 통과하는 문제가 확인됐다.
- 수정 후 `CombatPocSystem`은 `BuildingSystem.getDynamicBlockedRects()`를 외부 blocker provider로 받아 늑대 pathing, occupancy, attack line blocker 판정에 player-built complete building footprint를 포함한다.
- 2026-07-03 후속 로그(`chicken-farm-poc_2026-07-03T06-38-11-446Z_u5oi7x.jsonl`)에서 늑대가 완성 타워 footprint 바로 바깥에 선 뒤 `path_missing_waiting_for_blocker_delay` 상태로 멈추는 문제가 확인됐다. 원인은 wolf point는 blocker 밖이지만 A* start cell center가 expanded blocker 안으로 들어가 `allowBlockedStart: false`에 걸리는 케이스였다.
- 수정 후 늑대 pathfinding은 start cell만 blocked를 허용하고, 실제 이동은 기존 `canWolfOccupyPoint`로 계속 검사한다. 이로써 타워 안으로 들어가지는 않으면서 blocker 가장자리에서 우회 경로를 다시 잡을 수 있다.
- 2026-07-03 후속 로그(`chicken-farm-poc_2026-07-03T06-43-03-540Z_adwsjj.jsonl`)에서 건설 시작 전 pending build order가 이동 명령으로 덮여도 grid marker가 남는 문제가 확인됐다.
- Warsmash/WC3 감각 기준으로 건설이 이미 시작된 건물은 이동/공격/정지 명령에서 미완성 건물로 pause되고, 건설 시작 전 pending build order는 replace 명령에서 취소되는 것으로 구분한다.
- 수정 후 `ControllableUnitSystem`의 replace move/attack/attack-move/stop은 `ConstructionPlacementSystem.cancelPendingBuildOrdersForBuilder()`를 호출해 runtime building이 없는 pending order만 제거한다. 완료/검증용 telemetry는 `pending_build_orders_cancelled`로 남긴다.
- 같은 로그에서 늑대에게 맞는 농부/개가 idle 상태인데도 반격하지 않는 문제가 확인됐다. 수정 후 늑대 공격은 attacker id를 `damageUnit()`에 전달하고, idle/stop 상태의 농부/개는 `unit_retaliation_order_issued` 후 해당 늑대에 `attack` 명령을 잡는다.
- 반격은 명시 이동/건설/직접 공격 명령을 깨지 않는 P0로 둔다. 이동 중 피격 자동 교전, hold position, guard/acquisition radius 차이는 후속 War3 command fidelity 항목으로 관리한다.
- 남은 보강은 attack-move가 target 처치 후 원래 목적지를 재개하는 것, smoke telemetry의 acquire/resume 이벤트를 세분화하는 것, player-built blocker에 대한 늑대 반응을 실제 웨이브 통합에서 확인하는 것이다.

### 5.2 Economy / Build / Shop PoC

기존 **PoC 7. 닭/알/수익**을 시작하되, 실제 플레이 루프상 건설/상점과 분리하기 어렵기 때문에 다음 턴의 작업 단위는 **Economy / Build / Shop PoC**로 묶는다.

목표:

- `elapsedSec` 기반 30초 egg drop tick 검증
- 닭/닭장 개수와 등급에 따른 field egg item 생성 검증
- player slot별 coin wallet과 field egg ownership 분리
- buy/upgrade/reward/penalty를 command 또는 system API로 통일
- 농부 command/interact 흐름으로 닭장 구매/업그레이드/알 수집/알 거래/부화를 검증
- 중앙 상점은 최종 UI가 아니라 debug interaction/service API로 먼저 검증

알 모델 결정:

- 알은 금/나무처럼 HUD에 누적되는 wallet resource가 아니라 필드에 드롭되는 item/object로 취급한다.
- 경제의 핵심은 `field egg item 생성 -> 농부 수집 또는 상점 거래 -> coins 획득` 루프다.
- 성장의 핵심은 `field egg item 또는 egg stack -> 닭장 부화 -> 닭 증가` 루프다.
- 따라서 `eggs += n` 형태의 즉시 자원 증가는 PoC 7 범위에서 사용하지 않는다.

Economy 기준값:

| 항목           | MVP 값                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| 시작 코인      | easy `140`, normal `120`, hard `120`, crazy `110`                        |
| 알 생성 주기   | `30 sec`                                                                 |
| 알 표현        | `FieldEggItem`, wallet resource 아님                                     |
| 알 거래        | 수집/보유 중인 egg item stack 판매 시 `coins += eggCount * 12`           |
| 알 부화        | 닭장이 egg item stack을 소비하고 일정 시간 후 닭 생성                    |
| 기본 닭장      | `coop_basic`, cost `60`, `1 egg item / 30 sec` 또는 기본 부화 슬롯 1     |
| 중급 닭장      | `coop_mid`, cost `120`, `2 egg items / 30 sec` 또는 부화 슬롯 2          |
| 고급 닭장      | `coop_high`, cost `220`, `3 egg items / 30 sec` 또는 부화 슬롯 3         |
| 업그레이드     | basic -> mid `80`, mid -> high `140`                                     |
| revive penalty | MVP 기준 coin `25%` 손실, field egg item은 별도 드롭/소멸 정책 후속 결정 |
| exchange       | MVP 기본 비활성, PoC 6에서 분리 검증                                     |

PoC 7 측정 후보:

- `npm run chicken:economy:measure`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_poc_metrics.json`

서브 마일스톤:

| 단계 | 상태 | 내용                                                                                                 | 산출물                           |
| ---- | ---- | ---------------------------------------------------------------------------------------------------- | -------------------------------- |
| E1   | 다음 | Economy state 최소판: coin wallet, field egg items, chickens, coops, nextEggDropAtSec                | `economyTypes`, `economySystem`  |
| E2   | 대기 | 30초 egg drop tick: 닭/닭장 등급별 field egg item 생성, timeScale/debug tick 대응                    | `chicken:economy:measure`        |
| E3   | 대기 | Egg collect/trade service: 농부 수집, egg stack 소유권, 판매 시 coin 증가                            | collect/trade API                |
| E4   | 대기 | Coop build/hatch service: farm zone 안에 coop_basic 배치, egg 소비 후 닭 부화, WPM buildBlocked 검사 | build/hatch API                  |
| E5   | 대기 | Upgrade service: coop basic -> mid -> high, 비용/알 생성량/부화 슬롯 변경                            | upgrade command/API              |
| E6   | 대기 | Shop/interact hook: 농부 우클릭 egg/shop/coop 대상 분기, UI 없이 debug sell/hatch/upgrade 호출       | smart/interact command extension |
| E7   | 대기 | Browser/Node 측정: 30초 drop, 수집/판매/부화, 구매/업그레이드, player slot 분리                      | economy metrics artifact         |
| E8   | 대기 | 문서/밸런스 고정: PoC 7 완료 기준과 PoC 6 중앙 상점 확장 범위 결정                                   | next priority update             |

다음 턴 권장 구현 순서:

1. `economyTypes.ts`와 순수 `economySystem.ts`를 만든다.
2. `scripts/measure-chicken-farm-economy.ts`로 30초 egg drop, 수집, 판매, 부화 단위 테스트를 먼저 고정한다.
3. Phaser 런타임에는 debug HUD/keyboard 또는 command API로 `collect egg`, `sell egg`, `hatch chicken`, `buy coop_basic`, `upgrade coop`을 붙인다.
4. 그 다음 농부 smart/interact command와 build placement를 연결한다.

PoC 7 완료 기준:

- player별 coin wallet과 field egg item ownership이 분리된다.
- 30초 egg drop tick이 deterministic하게 반복된다.
- 농부가 field egg item을 수집하고 상점 또는 debug trade API로 coin화할 수 있다.
- coop이 egg item을 소비해 닭을 부화시킬 수 있다.
- coop 구매/업그레이드가 비용 부족/성공/알 생성량/부화 슬롯 변경을 모두 처리한다.
- 최소 하나의 runtime interaction으로 농부가 경제 액션을 실행할 수 있다.
- Node 측정 artifact가 통과하고, browser smoke에서 HUD 값이 갱신된다.

## 6. 전체 PoC 로드맵

| 우선순위 | PoC                              | 상태             | 선행 조건                            | 다음 액션                                                                      |
| -------: | -------------------------------- | ---------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
|        1 | War3 Command Combat Smoke        | 다음             | `A Attack`/attack-move 최소 구현     | combat flag smoke, attack-move resume, visible target 조건 확인                |
|        2 | Economy / Build / Shop PoC       | 다음             | command smoke 통과                   | economy state, 30초 egg drop tick, egg collect/trade/hatch, coop build/upgrade |
|        3 | Player-built Tower Combat PoC    | Economy와 병렬 가능 | building runtime + combat adapter | built tower visible acquire/attack, wolf blocker/target 연결                   |
|        4 | Building Production / Tech Card  | Economy 이후     | complete building selection          | train/hatch/upgrade/research command card, queue/cancel/rally                  |
|        5 | Wolf Wave On Real Map            | tower/economy 이후 | actual map blockers + command combat | 원본식 random attack-move refresh를 실제 P3 farm zone에 연결                   |
|        6 | PoC 6. 중앙 상점/교환            | Economy 이후     | command/interact hook                | shop state와 교환 UI prototype                                                 |
|        7 | PoC 12. 결혼/아내/가족 테크      | 병렬 가능        | state model                          | spouse/family component와 지원 스킬 구조 정의                                  |
|        8 | PoC 4. 거미/초반 보너스          | Economy 이후 권장 | command + terrain + economy         | 거미 사냥을 reward/economy로 연결                                              |
|        9 | PoC 5. 늑대의 돌                 | 병렬 가능        | command + combat                     | 특정 object 공격/보상 흐름 검증                                                |
|       10 | PoC 9. 보스/레벨 보상            | wave 이후        | economy + reward                     | boss reward table과 level reward 지급                                          |
|       11 | PoC 10. 원본 타임라인/배속       | wave 이후        | economy tick + wave scheduler        | timeScale 기반 장기 루프 측정                                                  |
|       12 | Sprite / State Asset Pass        | 병렬 가능        | command/building states              | farmer/dog/building state sprite와 command icon manifest 연결                  |
|       13 | PoC 13. 8인 로컬 슬롯            | economy 이후     | player slot state 분리               | 8 slot local simulation                                                        |
|       14 | PoC 14. 싱글 플레이 통합 MVP/MVC | 주요 PoC 완료 후 | all core loops                       | playable vertical slice                                                        |
|       15 | PoC 15. P2P 네트워크             | PoC 14 이후      | deterministic command/state boundary | sync model 검증                                                                |
|       16 | PoC 16. 8인 내부 테스트          | PoC 15 이후      | network                              | full scenario test                                                             |

## 7. 보류 및 리스크

- 멀티 선택과 control group은 MVP 체감에는 중요하지만 이번 PoC의 선행 조건은 아니다.
- command card UI는 건설 PoC에 들어왔고, shop/production page 확장은 후속이다.
- 현재 Phaser object 중심 구조를 한 번에 ECS로 갈아엎지 않는다. 먼저 command/state boundary를 만들고, 이후 component로 승격한다.
- P2P deterministic 검증은 PoC 15 범위지만, 이번 PoC부터 command replay가 가능하도록 설계해야 한다.
- worker 도입은 렌더러 교체가 아니라 simulation/presenter 분리가 선행이다. 시스템별 경계는 `docs/chicken_farm/chicken_farm_worker_simulation_boundary_plan.md`를 기준으로 고정한다.

완료 구현 순서의 상세 기록은
[`archive/next_priority_plan_before_completed_section_trim_2026-07-01.md`](./archive/next_priority_plan_before_completed_section_trim_2026-07-01.md)에 보관한다.

## 8. 참고 문서

- 전체 PoC 목록: `docs/chicken_farm/chicken_farm_phaser_p2p_game_plan.md`
- Warsmash 조작/명령 참고: `docs/chicken_farm/chicken_farm_warsmash_behavior_notes.md`
- Economy 기준: `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md`
- W3X artifact: `docs/chicken_farm/chicken_farm_w3x_artifacts/`
- Phaser 구현: `games/chicken-farm/src/game/`
- Network/suspend 기준: `docs/chicken_farm/chicken_farm_network_and_suspend_plan.md`
- Worker/simulation 경계 기준: `docs/chicken_farm/chicken_farm_worker_simulation_boundary_plan.md`

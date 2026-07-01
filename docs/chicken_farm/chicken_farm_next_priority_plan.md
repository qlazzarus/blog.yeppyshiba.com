# Chicken Farm Next Priority Plan

이 문서는 Chicken Farm Phaser MVP의 다음 PoC 우선순위와 구현 기준을 정리한다.

## 1. 현재 결정

다음 우선 구현 PoC는 **Economy / Build / Shop PoC**로 확정한다.

현재 바로 진행할 하위 단계는 **Construction Placement PoC**다. 구현 계획은
[`chicken_farm_construction_poc_plan.md`](./chicken_farm_construction_poc_plan.md)에
별도로 고정한다.

예약 명령 PoC는
[`chicken_farm_command_queue_poc_plan.md`](./chicken_farm_command_queue_poc_plan.md)에
별도로 고정한다. Warsmash 기준으로 이동/행동 예약과 건물 생산 큐는 같은 "예약" UX를
공유하지만 런타임 책임이 다르므로, 구현도 분리한다.

이번 단계에서는 `CombatPocSystem`을 삭제하지 않고 feature flag로 비활성화한다.
초점은 전투 검증이 아니라 "농부 선택 -> 워3식 명령 타일 -> 건설 메뉴 -> footprint
ghost -> 배치 -> 완성 -> dynamic blocker 반영" 흐름을 만드는 것이다. 경제 tick,
상점, 웨이브는 Construction Placement PoC 완료 후 이어 붙인다.

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
| Warsmash 감각 | 7.4 / 10 | 명령 타일, Shift 예약, 농부 이동 후 착공, pause/resume, cancel, 착공 시 비용 차감은 맞다. 생산 queue, rally, tech/supply 사용은 아직 부족하다. |
| Chicken Farm 감각 | 7.6 / 10 | P3 farm zone 시작, W3X footprint/build time, 자원 HUD, 건물 시야 source가 붙었다. 다만 닭장 수익, 알 루프, 건물 기능, 타워 공격/시야 연결이 아직 부족하다. |
| PoC 조작성 | 6.8 / 10 | 기본 루프는 가능하지만 현재 카메라/zoom 기준에서 유닛, 건설 ghost, progress bar 가시성이 낮다. zoom은 맵 기준 때문에 유지하고 visual affordance로 보강한다. |

건설 PoC 후속 보강 리스트:

1. 빌딩 시야 공유: 완성 건물 중심으로 FoW/explored/minimap을 reveal한다.
2. 건설중 시야 정책: 건설중 건물은 작은 반경 또는 active worker가 있을 때만 시야를 제공한다.
3. 타워 공격 탐지와 현재 시야 연결: 사거리/acquire 안에 있어도 FoW current visible이 아니면 자동 공격 대상으로 잡지 않는다.
4. 가시성 보강: zoom은 유지하고 유닛/건물 렌더 scale, 선택 링/HP bar/progress bar 최소 크기, 건설 ghost 대비, focus ping으로 보완한다.
5. 건물 sprite state: planned/constructing/complete/damaged state를 asset manifest와 연결한다.
6. 건물 기능: `coop_basic` egg tick, `market` exchange, `lumber_mill`/research hook을 economy PoC로 넘긴다.
7. supply 사용: dog/farmer/생산 queue가 붙는 시점에 `supplyUsed`를 실제로 증가시킨다.
8. 생산 queue: farm house/town hall/coop의 train/hatch/research queue는 unit command queue와 분리해 P1로 구현한다.

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
- 타워는 일반 건물보다 넓은 시야를 제공해 자기 공격 범위를 자연스럽게 밝히는 역할을 가진다. 정확한 배율은 타워 라인 구현 때 `visionRadiusMultiplier`로 분리한다.
- 공격 명령을 직접 찍는 수동 타겟팅과 자동 타겟팅은 모두 visible target 조건을 공유한다.

건설 PoC 가시성 정책:

- 카메라 zoom은 현재 닭농장 맵 기준을 유지한다. 농장/스폰/중앙 허브 거리감 검증이 우선이므로 건설 PoC만을 위해 zoom을 당기지 않는다.
- 대신 플레이 조작에 필요한 visual affordance를 zoom과 분리한다.
- 유닛/건물 sprite는 collision/footprint와 별도로 render scale을 둘 수 있다. footprint와 blocker는 W3X `pathTex` 기준을 유지한다.
- 선택 링, HP bar, 건설 progress bar, paused/cancel 상태 표시는 최소 화면 크기를 보장한다.
- placement ghost는 valid/blocked 색만이 아니라 두꺼운 outline, hatch fill, rejection marker를 사용한다.
- 선택 또는 작업 대상에는 짧은 focus pulse를 띄워 넓은 화면에서도 현재 조작 대상을 찾기 쉽게 한다.
- `P3 PLAYER` debug marker는 기본 비활성화한다. 실제 조작 대상은 controllable farmer/dog이며, 슬롯 확인이 필요할 때만 flag로 marker를 다시 켠다.

## 2. 진행 원칙

- PoC는 구현 리스크를 쪼개기 위한 단계이며, MVP의 원본 경험 범위를 줄이는 기준이 아니다.
- 빠른 검증은 룰 축소가 아니라 `timeScale`, debug preset, 자동 측정 스크립트로 처리한다.
- Phaser GameObject 직접 조작은 adapter에만 둔다.
- 핵심 게임 진행은 command, component, pure system 형태로 유지해 ECS/P2P로 승격하기 쉽게 만든다.
- 워3식 조작은 Warsmash 전체 복제가 아니라 Chicken Farm MVP에 필요한 최소 command model로 축약한다.
- Shift 예약은 먼저 unit movement/action queue로 구현하고, 이후 construction queue와 building production queue로 확장한다.
- 명령 타일 UI 클릭과 단축키 입력은 같은 command action dispatcher를 호출한다.
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
- 농부/개 controllable unit state와 원본 기준 이동속도.
- WPM terrain blocker + dynamic blocker + smoothed path follow.
- 농부/개/늑대 완전 중첩 방지와 최소 push-out.
- 늑대의 농부/개 acquisition, target follow/repath, blocker fallback.
- Node/Playwright 기반 성능 측정과 regression artifact.

신뢰도가 부족한 범위:

| 범위                           | 현재 수준                    | 리스크                                                        | 관리 방침                                             |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Attack-move                    | 미구현/보류                  | 거미 사냥, 늑대 대응 자동 공격 검증 부족                      | PoC 4 또는 전투 확장 전에 M6로 구현                   |
| Command queue/control group    | P0 일부 완료                 | 이동/건설 예약은 있으나 생산 queue, control group, replay 부족 | 생산 queue는 P1, control group/replay는 MVP 필수 전까지 보류 |
| ECS 분리                       | 부분 분리                    | `ControllableUnitSystem`, `CombatPocSystem`에 view/state 혼재 | 경제/상점은 처음부터 state/system/view adapter로 작성 |
| Unit collision/local avoidance | 최소판                       | 다중 유닛/좁은 통로에서 흔들림 가능                           | 회귀 발견 시 movement adapter에서 국소 수정           |
| Pathing 정확도                 | WPM + dynamic blocker 축약판 | 원본 워3 pathing texture/collision과 차이 가능                | 측정 artifact와 수동 플레이 확인 병행                 |
| Browser frame pacing           | 일부 불명확                  | Playwright headless `frameMaxMs`가 hot label과 불일치         | 최적화 판단은 hot label + 수동 체감 기준으로 병행     |
| Browser suspend                | 정책 문서화                  | hidden/minimized 상태에서 큰 delta가 전투에 적용될 수 있음    | host hidden pause, client resync, large delta guard    |
| Network monster sync           | 정책 문서화                  | P2P 승격 시 클라이언트별 늑대 위치/공격 결과 불일치 가능      | host-only monster AI, snapshot/event/checksum 적용     |
| Deterministic replay           | 미구현                       | P2P 승격 시 command 재현성 검증 부족                          | PoC 13/15 전에 command log/replay 측정 추가           |

다음 단계 진입 기준:

- PoC 7 경제/건설/상점은 진행한다.
- 단, 구현 중 attack/interact/build command hook을 늘릴 때 `main.ts` 직접 분기보다 command/system API를 우선한다.
- 신뢰도 부족 범위는 지금 더 파고들지 않고, 실제 경제/상점 루프에 걸리는 순간에 보강한다.

## 5. 다음 단계: Economy / Build / Shop PoC

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
|        1 | Economy / Build / Shop PoC       | 다음 구현        | command control 최소 통과            | economy state, 30초 egg drop tick, egg collect/trade/hatch, coop build/upgrade |
|        2 | War3 Player Command Control 보강 | 필요 시          | 경제/전투 루프 중 회귀 발견          | attack-move, replay, ECS 분리 보강                                             |
|        3 | PoC 6. 중앙 상점/교환            | PoC 7 이후       | command/interact hook                | shop state와 교환 UI prototype                                                 |
|        4 | PoC 12. 결혼/아내/가족 테크      | 병렬 가능        | state model                          | spouse/family component와 지원 스킬 구조 정의                                  |
|        5 | PoC 4. 거미/초반 보너스          | PoC 7 이후 권장  | command + terrain + economy          | 거미 사냥을 reward/economy로 연결                                              |
|        6 | PoC 5. 늑대의 돌                 | 병렬 가능        | command + combat                     | 특정 object 공격/보상 흐름 검증                                                |
|        7 | PoC 9. 보스/레벨 보상            | PoC 7 이후       | economy + reward                     | boss reward table과 level reward 지급                                          |
|        8 | PoC 10. 원본 타임라인/배속       | PoC 7 이후       | economy tick + wave scheduler        | timeScale 기반 장기 루프 측정                                                  |
|        9 | PoC 11. 낮/밤 + FoW + 미니맵     | 병렬 가능        | Tilemap                              | rendering layer 검증                                                           |
|       10 | PoC 8. 거북이 이벤트 NPC         | PoC 6 이후       | central hub                          | event NPC interaction                                                          |
|       11 | PoC 13. 8인 로컬 슬롯            | economy 이후     | player slot state 분리               | 8 slot local simulation                                                        |
|       12 | PoC 14. 싱글 플레이 통합 MVP/MVC | 주요 PoC 완료 후 | all core loops                       | playable vertical slice                                                        |
|       13 | PoC 15. P2P 네트워크             | PoC 14 이후      | deterministic command/state boundary | sync model 검증                                                                |
|       14 | PoC 16. 8인 내부 테스트          | PoC 15 이후      | network                              | full scenario test                                                             |

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

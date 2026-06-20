# Chicken Farm Next Priority Plan

이 문서는 Chicken Farm Phaser MVP의 다음 PoC 우선순위와 구현 기준을 정리한다.

## 1. 현재 결정

다음 우선 구현 PoC는 **War3 Player Command Control PoC**로 확정한다.

기존 다음 후보였던 **PoC 7. 닭/알/수익**은 한 단계 뒤로 미룬다. Economy 순수 로직은 독립 개발이 가능하지만, 실제 플레이 검증은 워3식 선택/명령/이동 체계 위에서 해야 한다.

판단 근거:

- 현재 `PlayerControlSystem`은 WASD/방향키로 플레이어 marker를 직접 움직이는 debug 조작이다.
- 이 방식은 WPM terrain blocker, path smoothing, unit order, smart command를 우회한다.
- 닭장 구매, 거미 사냥, 상점 이용, 건설, 전투 방어는 모두 "유닛 선택 -> 명령 발행 -> 시스템 실행" 흐름 위에서 검증되어야 한다.
- 차후 P2P에서는 위치 변경이 아니라 player input command stream을 동기화해야 한다.

## 2. 진행 원칙

- PoC는 구현 리스크를 쪼개기 위한 단계이며, MVP의 원본 경험 범위를 줄이는 기준이 아니다.
- 빠른 검증은 룰 축소가 아니라 `timeScale`, debug preset, 자동 측정 스크립트로 처리한다.
- Phaser GameObject 직접 조작은 adapter에만 둔다.
- 핵심 게임 진행은 command, component, pure system 형태로 유지해 ECS/P2P로 승격하기 쉽게 만든다.
- 워3식 조작은 Warsmash 전체 복제가 아니라 Chicken Farm MVP에 필요한 최소 command model로 축약한다.

## 3. 완료된 기반 PoC

| 항목 | 상태 | 판단 |
| --- | --- | --- |
| Tilemap 맵 PoC | 완료 | 원본 크기 기반 Tilemap, trim offset, 핵심 object layer 반영 |
| PoC 2. 늑대/방벽/공격 건물 | 완료 기준 충족 | 전투/건물 blocker/공격 전환 확인용 baseline 확보 |
| WPM Terrain Blocker 이식 | 완료 | `.wpm` 기반 terrain grid를 A* 입력과 debug overlay에 연결 |
| Path Smoothing 이식 | 완료 | raw/smoothed 비교에서 waypoint/turn 감소 및 blocker safety 확인 |
| WolfAI 상태 머신 PoC | 완료 | 순수 decision layer와 Warsmash fit 측정 통과 |
| W3X 기준 데이터 고정 | 완료 | wave, unit stats, ability, building, item/reward 후보 TSV 확보 |

완료 artifact:

- WPM/pathing metrics: `docs/chicken_farm/chicken_farm_w3x_artifacts/terrain_pathing_poc_metrics.json`
- WolfAI metrics: `docs/chicken_farm/chicken_farm_w3x_artifacts/wolf_ai_state_machine_metrics.json`
- WPM runtime grid: `games/chicken-farm/assets/data/wpm_pathing_grid.json`

핵심 측정 결과:

- `micro_a`: raw waypoint `89` -> smoothed `4`, turn `9` -> `1`, detour `1.17` -> `1.13`, waypoint 감소율 `95.51%`
- `micro_b`: raw waypoint `80` -> smoothed `3`, turn `7` -> `1`, detour `1.05` -> `1.02`, waypoint 감소율 `96.25%`
- smoothed path의 `pathSegmentBlockedHits = 0`, `blockedWaypointCount = 0`
- WolfAI decision table `6/6` 통과, Warsmash fit checks `5/5` 통과

## 4. 다음 PoC: War3 Player Command Control

### 목표

현재 debug 이동을 실제 플레이 입력 모델로 교체한다.

서브 마일스톤 상태:

| 단계 | 상태 | 내용 |
| --- | --- | --- |
| M1 | 완료 | WASD/방향키 직접 이동 제거, Warsmash 참고 범위의 camera pan으로 분리 |
| M2 | 완료 | `farmer`/`dog` controllable unit state와 임시 view 생성, debug marker와 분리 |
| M3 | 완료 | 좌클릭 단일 선택, 빈 공간 선택 해제, 선택 ring 표시 |
| M4 | 완료 | 우클릭 ground move command, WPM terrain blocker + smoothed path follow, 원본 `H000`/`n002` 이동속도 반영 |
| M5 | 완료 | `S` stop, smart command hook, 전투 PoC 방벽/타워 dynamic blocker 반영 |
| M5.5 | 완료 | Warsmash 기준 보정: acquisition range 안의 농부/개 직접 공격 후보화, 늑대/플레이어 유닛 겹침 방지, blocker는 path failure fallback 유지 |
| M5.6 | 완료 | Warsmash smart order 보정: 우클릭 늑대 hit test, farmer/dog attack command, 사거리 접근 후 쿨다운 공격 |
| M5.7 | 완료 | 늑대 속도/추격 보정: 원본 `n007` speed `330` 기준 재조정, 공격 대상이 사거리 밖으로 이동하면 추격/repath |
| M6 | 다음 | Attack-move 최소판: `A` 입력 후 지면 클릭, 이동 중 자동 target acquisition 후 공격 전환 |
| M7 | 완료 | Drag Selection 최소판: farmer/dog 다중 선택, control group/formation 제외 |
| M8 | 완료 | Unit Push 최소판: 농부/개/늑대 완전 중첩 방지, 약한 push-out과 목적지 offset으로 다중 유닛 뭉침 완화 |

M8 후속 안정화 결정:

- 현재 벽 관통 원인은 pathing 자체보다 직접 좌표 이동과 push-out이 WPM/dynamic blocker 검사를 우회하는 데 있다.
- 1차 수정은 blocker-aware guard를 적용한다. 농부/개/늑대가 직접 이동 또는 push-out으로 이동하려는 후보 좌표가 terrain blocker나 살아 있는 방벽/타워 footprint 안이면 해당 이동을 적용하지 않는다.
- 다중 선택 목적지 offset도 blocker 안쪽이면 원 클릭 지점으로 fallback하고, fallback도 막혀 있으면 path를 만들지 않는다.
- 이후 전투 추격은 별도 단계에서 path/repath 기반으로 정리한다. 즉, 대상 추격을 직선 이동이 아니라 target 주변 사거리 후보 지점으로 A* 재탐색하는 구조로 승격한다.

구조 점검 결과:

- `main.ts`는 scene composition과 adapter wiring만 담당해야 한다. 드래그 선택 입력은 `DragSelectionInputSystem`으로 분리했다.
- WPM/dynamic blocker 점유 검사는 `movementGuards`로 분리해 player unit과 wolf가 같은 규칙을 공유한다.
- `ControllableUnitSystem`은 아직 view 생성과 state mutation이 함께 있지만, command/state 중심 구조는 유지된다. 다음 분리 후보는 unit view factory와 command executor다.
- `CombatPocSystem`은 combat layout factory, wolf movement/path adapter, tower combat adapter를 분리했다. 아직 view 생성, wolf target acquisition, debug draw가 남아 있어 다음 분리 후보는 combat view factory와 wolf target acquisition policy다.

M5.7 확인/구현 결과:

- 원본 닭농장 `combat_unit_stats_reference.tsv` 기준 일반 늑대는 대부분 `speed = 330`이고, 일부 후반 펠 계열은 `350`이다.
- 기존 `balance.ts`의 초기 `timber_wolf`는 `speedPxPerSec = 115`로, 과거 MVP 축약/측정용 값이었다.
- 농부/개는 이미 원본 기준 `H000 = 240`, `n002 = 290`으로 맞췄기 때문에, 늑대도 원본 상대 속도에 맞춰 `330`으로 보정했다.
- Warsmash 기준 `CBehaviorAttack`은 target이 사거리 밖이면 멈춰 있지 않고 target 쪽으로 이동해 다시 사거리 안으로 들어가야 한다.
- 늑대는 acquisition range 안의 농부/개를 `focusUnitId`로 획득하고, 유닛 주변 사거리 후보 지점으로 A* path/repath를 수행한다.
- 사거리 안에 들어오면 직접 공격하고, target이 움직여 사거리 밖으로 나가면 range leash 안에서 계속 추격한다.
- blocker 공격 원칙은 유지한다. 공격 대상까지 path가 막히면 농부를 무시하고 순간 이동/관통하지 않고, 기존처럼 path failure 이후 가까운 targetable blocker를 공격한다.
- 다음 검증은 원본 `330` 속도에서 농부/개 조작 체감이 너무 급격하지 않은지, 그리고 blocker fallback 전환이 기대 시점에 발생하는지 측정한다.

검증해야 할 것:

- `H000` 농부와 `n002` 개를 controllable unit으로 분리할 수 있는가
- 좌클릭 선택, 우클릭 smart command, 지면 이동, 대상 공격/상호작용이 하나의 command model로 표현되는가
- 우클릭 지면 이동이 WPM terrain blocker와 smoothed path를 사용하는가
- 이후 economy, shop, build, spider combat이 같은 command pipeline에 붙을 수 있는가

### 최소 구현 범위

| 기능 | 범위 |
| --- | --- |
| Unit selection | 좌클릭 단일 선택, 선택 ring 표시 |
| Ground smart order | 우클릭 지면 -> `move` command 생성 |
| Target smart order | 우클릭 대상 -> `attack` / `interact` 후보로 분기 가능한 구조 |
| Path follow | WPM + smoothed path를 따라 controllable unit 이동 |
| Stop order | `S` 키로 현재 order 취소 |
| Attack-move | `A` 키 입력 후 지면 클릭 -> attack-move command 생성 |
| Debug focus | 기존 숫자키 슬롯 이동은 debug camera focus로만 유지 |

이번 PoC에서 하지 않는 것:

- 전체 워3 command card UI
- 모든 ability order 구현
- 멀티 선택/부대 grouping. 최소 drag selection은 M7에서 별도 진행
- 정교한 워3식 unit collision/local avoidance. 완전 중첩 방지와 약한 밀림은 M8에서 별도 진행
- 건설 placement 최종 UI
- 최종 animation/모델 품질

### 권장 Runtime 구조

```ts
type UnitCommand =
  | { type: "move"; unitIds: string[]; targetPoint: Point }
  | { type: "smart"; unitIds: string[]; targetPoint?: Point; targetEntityId?: string }
  | { type: "attack"; unitIds: string[]; targetEntityId: string }
  | { type: "attackMove"; unitIds: string[]; targetPoint: Point }
  | { type: "stop"; unitIds: string[] };

type ControllableUnit = {
  id: string;
  ownerPlayerId: number;
  templateId: "farmer" | "dog";
  position: Point;
  selected: boolean;
  currentCommand?: UnitCommand;
  path: Point[];
  pathIndex: number;
};
```

권장 파일 분리:

- `games/chicken-farm/src/game/systems/playerCommandTypes.ts`: command, selectable, controllable 타입
- `games/chicken-farm/src/game/systems/playerCommandSystem.ts`: selection, command 발행, smart order 분기
- `games/chicken-farm/src/game/systems/controllableUnitSystem.ts`: path follow, stop, command 실행
- `games/chicken-farm/src/game/poc/playerCommandPocLayout.ts`: 농부/개 시작 배치와 command test target
- `scripts/measure-chicken-farm-player-command.ts`: 자동 측정 스크립트 후보

### ECS 승격 기준

| Component | 역할 |
| --- | --- |
| `Selectable` | 클릭 선택 가능 여부와 selection radius |
| `SelectedByPlayer` | 어떤 player가 선택 중인지 |
| `Owner` | player slot 연결 |
| `Position` | world 좌표 |
| `PathAgent` | path, pathIndex, movement speed |
| `CollisionRadius` | unit push-out과 전투 거리 판정에 쓰는 원형 반경 |
| `CommandQueue` | 현재/대기 명령 |
| `AttackCapability` | attack/smart target 분기용 |
| `InteractCapability` | shop/build/economy 상호작용 hook |

핵심 제약:

- input handler는 command만 만든다.
- command executor가 pathing/combat/interact system을 호출한다.
- scene object는 state를 표시하는 view 역할만 한다.

### 검증 지표

PoC 구현 후 자동 측정은 다음 기준으로 추가한다.

예상 명령:

- `npm run chicken:command:measure`

예상 artifact:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/player_command_poc_metrics.json`

필수 지표:

| 지표 | 의미 |
| --- | --- |
| `selectionPass` | 클릭 좌표로 의도한 unit이 선택되는지 |
| `moveCommandPass` | 우클릭 지면이 move command를 생성하는지 |
| `pathUsesTerrainPass` | 이동 path가 WPM blocked cell을 통과하지 않는지 |
| `pathSmoothingPass` | controllable unit path도 smoothed path를 사용하는지 |
| `stopCommandPass` | stop 후 path follow가 중단되는지 |
| `smartTargetDispatchPass` | target type에 따라 attack/interact 후보로 분기 가능한지 |
| `attackMoveAcquirePass` | attack-move 중 acquisition range 안의 늑대를 자동 공격으로 전환하는지 |
| `unitOverlapClampPass` | M8 이후 농부/개/늑대가 최소 거리 이하로 완전 중첩되지 않는지 |
| `commandDeterminismPass` | 같은 command sequence의 최종 위치가 반복 실행에서 같은지 |

통과 기준:

- 이동 경로의 `blockedWaypointCount = 0`
- smoothed segment의 `pathSegmentBlockedHits = 0`
- 동일 command script를 3회 실행했을 때 최종 위치 오차가 tolerance 이하
- stop command 이후 추가 이동 거리가 tolerance 이하
- player 1 command가 player 2 unit state를 변경하지 않음

## 5. 다음 단계: PoC 7 닭/알/수익

Player Command Control PoC가 통과되면 PoC 7을 진행한다.

PoC 7의 역할:

- `elapsedSec` 기반 30초 income tick 검증
- 닭장 개수/등급에 따른 eggs/coins 증가 검증
- player slot별 resource wallet 분리
- buy/upgrade/reward/penalty를 command 또는 system API로 통일

Economy 기준값:

| 항목 | MVP 값 |
| --- | --- |
| 시작 코인 | easy `140`, normal `120`, hard `120`, crazy `110` |
| 수익 주기 | `30 sec` |
| egg unit 환산 | `coins += eggUnits * 12`, `eggs += eggUnits` |
| 기본 닭장 | `coop_basic`, cost `60`, `1 egg unit / 30 sec` |
| 중급 닭장 | `coop_mid`, cost `120`, `2 egg units / 30 sec` |
| 고급 닭장 | `coop_high`, cost `220`, `3 egg units / 30 sec` |
| 업그레이드 | basic -> mid `80`, mid -> high `140` |
| revive penalty | MVP 기준 자원 `25%` 손실 |
| exchange | MVP 기본 비활성, PoC 6에서 분리 검증 |

PoC 7 측정 후보:

- `npm run chicken:economy:measure`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_poc_metrics.json`

## 6. 전체 PoC 로드맵

| 우선순위 | PoC | 상태 | 선행 조건 | 다음 액션 |
| ---: | --- | --- | --- | --- |
| 1 | War3 Player Command Control | 다음 구현 | WPM + smoothing 완료 | 선택/명령/path follow 구현 |
| 2 | PoC 7. 닭/알/수익 | 대기 | command control 권장 | economy state, 30초 income tick, 자동 측정 |
| 3 | PoC 6. 중앙 상점/교환 | 병렬 가능 | command/interact hook 권장 | shop state와 교환 UI prototype |
| 4 | PoC 12. 결혼/아내/가족 테크 | 병렬 가능 | state model | spouse/family component와 지원 스킬 구조 정의 |
| 5 | PoC 4. 거미/초반 보너스 | PoC 7 이후 권장 | command + terrain + economy | 거미 사냥을 reward/economy로 연결 |
| 6 | PoC 5. 늑대의 돌 | 병렬 가능 | command + combat | 특정 object 공격/보상 흐름 검증 |
| 7 | PoC 9. 보스/레벨 보상 | PoC 7 이후 | economy + reward | boss reward table과 level reward 지급 |
| 8 | PoC 10. 원본 타임라인/배속 | PoC 7 이후 | economy tick + wave scheduler | timeScale 기반 장기 루프 측정 |
| 9 | PoC 11. 낮/밤 + FoW + 미니맵 | 병렬 가능 | Tilemap | rendering layer 검증 |
| 10 | PoC 8. 거북이 이벤트 NPC | PoC 6 이후 | central hub | event NPC interaction |
| 11 | PoC 13. 8인 로컬 슬롯 | command + economy 이후 | player slot state 분리 | 8 slot local simulation |
| 12 | PoC 14. 싱글 플레이 통합 MVP/MVC | 주요 PoC 완료 후 | all core loops | playable vertical slice |
| 13 | PoC 15. P2P 네트워크 | PoC 14 이후 | deterministic command/state boundary | sync model 검증 |
| 14 | PoC 16. 8인 내부 테스트 | PoC 15 이후 | network | full scenario test |

## 7. 구현 순서

1. 완료: 기존 `PlayerControlSystem`의 WASD 직접 이동을 debug 전용으로 격리한다. 완료 시 키보드는 Warsmash 참고 범위의 camera pan으로 전환한다.
2. 완료: 농부/개 controllable unit을 별도 state로 만든다.
3. 완료: 좌클릭 selection과 선택 ring을 구현한다.
4. 완료: 우클릭 ground move command를 만들고 WPM + smoothed path follow에 연결한다.
5. 완료: `S` stop command와 command cancel을 구현한다.
6. 완료: smart target dispatch 구조를 추가해 attack/interact hook을 비워 둔다.
7. 완료: 늑대가 acquisition range 안의 농부/개를 직접 공격 후보로 보고, 경로가 막힌 경우에만 blocker 공격으로 전환하게 보정한다.
8. 완료: 우클릭 대상이 늑대이면 smart order를 attack command로 분기하고 farmer/dog가 사거리 접근 후 공격하게 한다.
9. 완료: 늑대 속도를 원본 기준으로 보정하고, 전투 target follow/repath를 구현한다.
10. 다음: attack-move 최소판을 구현한다.
11. 완료: drag selection 최소판을 구현한다. 좌클릭 click selection은 유지하고, threshold 이상 드래그하면 rectangle과 교차하는 farmer/dog를 다중 선택한다.
12. 완료: unit push 최소판을 구현한다. 목표는 워3식 정밀 회피가 아니라 완전 중첩 방지, 약한 push-out, 다중 선택 목적지 offset이다.
13. 자동 측정 스크립트와 artifact를 추가한다.
14. 문서에 측정 결과를 반영하고 통과 시 PoC 7 economy로 이동한다.

## 8. 보류 및 리스크

- 멀티 선택과 control group은 MVP 체감에는 중요하지만 이번 PoC의 선행 조건은 아니다.
- command card UI는 추후 build/shop PoC에서 필요할 때 확장한다.
- 현재 Phaser object 중심 구조를 한 번에 ECS로 갈아엎지 않는다. 먼저 command/state boundary를 만들고, 이후 component로 승격한다.
- P2P deterministic 검증은 PoC 15 범위지만, 이번 PoC부터 command replay가 가능하도록 설계해야 한다.

## 9. 참고 문서

- 전체 PoC 목록: `docs/chicken_farm/chicken_farm_phaser_p2p_game_plan.md`
- Warsmash 조작/명령 참고: `docs/chicken_farm/chicken_farm_warsmash_behavior_notes.md`
- Economy 기준: `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md`
- W3X artifact: `docs/chicken_farm/chicken_farm_w3x_artifacts/`
- Phaser 구현: `games/chicken-farm/src/game/`

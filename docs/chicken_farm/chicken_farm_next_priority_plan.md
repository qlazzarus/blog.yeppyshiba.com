# Chicken Farm Next Priority Plan

이 문서는 Chicken Farm Phaser MVP의 다음 PoC 우선순위와 구현 기준을 정리한다.

## 1. 현재 결정

다음 우선 구현 PoC는 **Economy / Build / Shop PoC**로 확정한다.

**War3 Player Command Control PoC**는 MVP 경제/건설/상점 PoC를 붙일 수 있는 최소 조작 기반으로 완료 판단한다. 단, 원본 Warcraft III 조작 전체 구현은 아니므로 신뢰도 부족 범위는 별도 관리한다.

판단 근거:

- 카메라/선택/우클릭 이동/우클릭 공격/stop/drag selection/path follow가 동작한다.
- WPM terrain blocker, dynamic blocker, path smoothing, 최소 unit push가 command path에 연결됐다.
- 닭장 구매, 거미 사냥, 상점 이용, 건설, 전투 방어는 이제 "유닛 선택 -> 명령 발행 -> 시스템 실행" 흐름 위에 붙일 수 있다.
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

## 4. 완료 기반: War3 Player Command Control

### 목표

debug 직접 이동을 실제 플레이 입력 모델로 교체하고, 경제/건설/상점 PoC가 붙을 command 기반을 확보한다.

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
| M6 | 보류 | Attack-move 최소판: `A` 입력 후 지면 클릭, 이동 중 자동 target acquisition 후 공격 전환 |
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

### Combat PoC 후속 확인: 2026-06-23 전투 로그 분석

분석 로그:

- `chicken-farm-poc_2026-06-23T11-31-20-258Z_i09opx.jsonl`

관찰 결과:

- `combat_poc_snapshot`, `wolf_state_changed`, `tower_attack_landed`, `wolf_attack_landed`, `building_destroyed`, `wolf_died`, `combat_poc_result` 기록이 들어오면서 전투 흐름을 분리해 볼 수 있게 됐다.
- 59초 종료 시점에 `farm_core`는 `500/500`으로 피해가 없고, `tower_a`는 파괴, `tower_b`는 `3/275`, 늑대는 5마리 중 4마리가 사망했다.
- `combat-wolf-3`은 `10.891s`부터 `49.656s`까지 약 38.8초 동안 `repath / wait_for_repath / path_missing_waiting_for_blocker_delay`에 머물렀다.
- `combat-wolf-3`의 장기 정지 위치는 대략 `(2832,8936)`이고, `farm_core` footprint는 대략 `x=2560..2816`, `y=9088..9344`다. 즉 farm 공격 사거리 밖에서 path도 blocker도 잡지 못한 상태로 대기했다.
- 늑대 공격 69회는 모두 `tower_a`/`tower_b` 대상이었고, `farm_core`/fence/unit 공격은 0회였다. 현재 PoC는 farm 침공보다 타워 focus와 path failure fallback을 검증하는 흐름으로 기울어졌다.
- `unit_selection_changed`의 nearest unit 기록으로 선택 실패 원인도 확인됐다. 클릭 위치는 가장 가까운 `p3-dog`에서 약 `596px` 떨어져 있었다.

원본 W3X 기준 수치:

| 대상 | rawcode | 원본 HP | 방어 | 공격/쿨다운 | 현재 Phaser 판단 |
| --- | --- | ---: | ---: | --- | --- |
| 기본 울타리 | `h003` | 200 | 1 | - | `fence_wood` HP/방어는 원본과 일치 |
| 스카우트 타워 | `h00D` | 275 | 5 | `21 + 1d3`, 1.05s | HP/방어/평균 공격력 23은 원본과 일치, 사거리는 체감값 384px |
| 팀버 울프 | `n007` | 450 | 0 | `11 + 1d2`, 1.35s | 고정 damage 13, 방어 적용 후 타워에 8 damage |

유력 원인 후보:

1. **경로 실패 fallback이 약함**
   - path 후보가 farm 근접 후보에 실패했을 때, line blocker나 `searchRadiusPx=96` 안의 blocker를 못 찾으면 `wait_for_repath`에 오래 머문다.
   - path failure가 일정 시간 이상 지속되면 `searchRadiusPx` 밖이라도 가장 가까운 `targetableByWolves` blocker/farm을 fallback target으로 삼아야 한다.

2. **타워 focus가 기본 farm 목표를 과점**
   - 타워가 늑대를 공격하면 `focusBuildingId=tower_*`가 남아 farm 침공 목표를 계속 덮는다.
   - `POC_TOWER_FOCUS_LOCK_SEC`는 타워 focus 전환 lock으로 쓰되, focus 자체도 만료되면 기본 `farm_core` 목표로 돌아가게 해야 한다.

3. **dead 늑대 상태 정리 부족**
   - 죽은 늑대의 `focusBuildingId`, `targetBuildingId`, `stateAction`이 snapshot에 남아 분석 노이즈가 생긴다.
   - 사망 처리 시 path/focus/target/action/reason을 정리한다.

4. **레이아웃 봉인 상태 검증은 후순위**
   - 현재 레이아웃은 타워/farm 주변 동적 blocker가 빽빽하다.
   - AI fallback을 먼저 안정화한 뒤, 필요하면 `open-B`/`sealed-B` preset을 나눠 타워 접근성과 fence 우선 공격을 비교한다.

다음 작업 순서:

1. 경로 실패 직후 `pathFailedSinceSec`를 즉시 세팅하고, fallback blocker/farm 선택을 명시한다.
2. 타워 focus 만료 처리를 추가해 마지막 피격 후 일정 시간이 지나면 기본 farm 목표로 복귀한다.
3. 사망 늑대의 focus/target/action/path 상태를 정리한다.
4. 같은 telemetry로 재검증해 `farm_core` 공격 또는 fence/blocker 공격 전환이 발생하는지 확인한다.

### Combat PoC 검증: W3X/Warsmash 기준 어그로 반응

사용자 기억:

- 늑대 한 마리가 타워/방어 대상에게 공격받으면 주변 늑대들도 함께 어그로가 끌렸던 것 같다.

근거 검토:

- Warsmash 일반 attack-move 관찰에서는 각 유닛이 자기 acquisition range 안의 공격 가능 유닛을 자동 획득한다. 한 유닛이 맞았다는 이유만으로 모든 주변 유닛이 같은 attacker를 공유 focus하는 일반 규칙은 확인되지 않았다.
- W3X 정적 분석에는 attacked-event 기반 group pull이 있다. `boss_or_special_focus_position`은 반경 `6000` 안의 Player(10) 유닛을 trigger unit 위치로 `attack` 명령하는 흐름이다. 다만 산출물 분류상 ordinary wolf baseline이 아니라 special/boss 계열 후보로 둔다.
- `low_hp_defender_taunt`와 `manual_tank_focus`도 attacked-event 기반 집단 focus처럼 보일 수 있지만, 각각 큰 개 low HP taunt와 수동 탱커 표식 후보로 분류되어 baseline 일반 늑대 규칙으로 보기는 어렵다.
- 따라서 사용자의 체감은 "전체 공유 어그로"라기보다 attack-move 자동 획득, 최근 피격 반응, 특수 attacked-event group pull, 미로/타워 배치가 겹친 결과로 해석하는 것이 현재 근거에 가장 맞다.

현재 구현 감사:

| 항목 | 현재 구현 | W3X/Warsmash 기준 판단 |
| --- | --- | --- |
| 스폰/기본 목표 | compact PoC의 `farm_core`를 deterministic target으로 사용 | 원본은 넓은 rect 랜덤 attack 명령 후 엔진 acquire에 맡김. PoC 축약으로 허용 |
| 일반 acquisition | 농부/개 유닛은 acquire range 안에서 직접 target 가능 | Warsmash식 unit 중심 auto acquire와 부합 |
| 건물 직접 공격 | `farm_core`/tower 등 targetable building이 사거리 안이면 직접 공격 | MVP 축약으로 허용. 원본의 concrete target 선택은 엔진에 위임 |
| blocker 공격 | path failure 이후 line/near/fallback blocker 공격 | Warsmash behavior notes의 blocker는 movement failure 결과라는 기준과 부합 |
| 타워 피격 focus | 맞은 늑대 1마리만 `focusWolfOnBuilding` 적용 | 일반 규칙으로는 과하지 않지만, 사용자 기억의 group pull 체감은 부족 |
| 타워 focus 지속 | 짧은 lock 후 기본 목표로 복귀하도록 보정 | 최근 보정 후 기준에 더 가까움 |
| dead 상태 | 사망 늑대 action/path는 정리, 단 tower adapter 순서로 focus가 다시 붙을 수 있음 | 수정 필요. 죽은 늑대에는 focus를 재부여하지 않아야 함 |
| global refresh | 60초 주기 전체 늑대 attack refresh 미구현 | compact PoC에서는 생략 가능. 장기 stuck 검증에는 후속 후보 |
| 타워 사거리 | h00D 원본 650 대신 Phaser 384 | 의도적 체감 튜닝. 원본 수치 재현은 아님 |
| 늑대 속도 | n007 원본 speed 330 기준 사용 | 원본 raw stat 기준과 부합. 과거 MVP 108~115 문서값보다 최신 결정 우선 |

제안 구현 기준: 제한적 aggro pulse

- 목적은 ordinary wolf baseline을 바꾸는 것이 아니라, W3X attacked-event group pull 체감을 PoC 옵션으로 검증하는 것이다.
- tower가 늑대를 공격하면 직접 맞은 늑대는 기존처럼 tower focus를 받는다.
- 동시에 주변 alive wolves 중 `aggroAssistRadiusPx` 안의 늑대에게 짧은 pulse를 보낸다.
- pulse 대상은 `farm_core`를 직접 공격 중인 늑대를 기본 제외한다. farm을 물고 있는 늑대까지 모두 끊으면 원본의 농장 압박 감각이 약해진다.
- pulse는 hard target lock보다 soft nudge로 둔다. 즉, target tower를 향해 repath/focus를 걸되 `aggroAssistLockSec` 후 기본 목표로 복귀한다.
- 사망 늑대에는 pulse/focus를 적용하지 않는다.
- telemetry에는 `wolf_aggro_pulse`를 기록해 어떤 늑대가 어떤 tower hit에 반응했는지 검증한다.

초기 튜닝 후보:

| 값 | 후보 |
| --- | ---: |
| `aggroAssistRadiusPx` | 256~384 |
| `aggroAssistLockSec` | 0.45~0.8 |
| `includeFarmAttackers` | false |
| `includeBlockerAttackers` | true |
| `maxAssistWolvesPerHit` | 2~4 |

다음 구현 순서:

1. `towerCombatAdapter`에서 죽은 target에 `focusWolfOnBuilding`을 호출하지 않도록 순서를 고친다.
2. `CombatPocSystem`에 `pulseWolfAggroFromTowerHit(hitWolf, tower)`를 추가한다.
3. pulse 대상 필터를 alive, radius, not direct farm attacker 기준으로 둔다.
4. `wolf_aggro_pulse` telemetry를 추가하고, 다음 로그에서 tower hit 직후 주변 늑대 state가 같이 움직이는지 검증한다.

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
- `scripts/measure-chicken-farm-runtime-perf.ts`: command pathfinding, wolf repath, fog/minimap loop 자동 성능 측정

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

PoC 구현 후 자동 측정은 다음 기준으로 유지한다.

측정 명령:

- `npm run chicken:perf:measure`
- `npm run chicken:browser-perf:measure`

Artifact:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/runtime_performance_debug_metrics.json`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/browser_performance_debug_metrics.json`

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
| `playerPathCommandMs` | 농부/개 우클릭 이동 pathfinding 동기 비용 |
| `wolfRepathCandidateMs` | 늑대가 여러 attack range 후보로 A*를 반복하는 비용 |
| `fogLoopMs` / `minimapLoopMs` | 렌더 제외 fog/minimap full-cell loop 비용 |

통과 기준:

- 이동 경로의 `blockedWaypointCount = 0`
- smoothed segment의 `pathSegmentBlockedHits = 0`
- 동일 command script를 3회 실행했을 때 최종 위치 오차가 tolerance 이하
- `wolfRepathCandidateMs`가 프레임 budget을 초과하면 후보 수 축소, bounds 축소, repath throttling, path cache를 우선 검토한다.
- `fogLoopMs`/`minimapLoopMs`가 높으면 매 프레임 갱신을 중단하고 dirty/throttle 갱신으로 전환한다.
- stop command 이후 추가 이동 거리가 tolerance 이하
- player 1 command가 player 2 unit state를 변경하지 않음

### 성능 최적화 관리

측정 artifact:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/runtime_performance_debug_metrics.json`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/browser_performance_debug_metrics.json`

완료한 최적화:

- `update.fog`와 `update.minimap`을 매 프레임 전체 갱신에서 dirty/throttle 갱신으로 전환했다. Fog는 150ms 또는 anchor 24px 이동, minimap은 250ms 또는 anchor/camera 32px 이동 기준으로 갱신한다.
- `wolfRepath`는 후보 수 축소, 기존 path reuse, A* open set heap 최적화로 단일 프레임 spike를 낮췄다. 거리순 상위 4개 후보만 평가하고 첫 유효 path를 즉시 사용한다.
- player command path는 start/goal 주변 512px padding bounds로 축소하고, dynamic blocker도 해당 bounds와 교차하는 것만 넘긴다.
- `drawCombatDebug()`는 전투 판정과 무관한 개발용 시각화이므로 150ms throttle을 적용했다.

주요 개선 결과:

- `update.fog total`은 703.9ms에서 267.3ms로 감소했다.
- `update.minimap total`은 443.1ms에서 114.0ms로 감소했다.
- `update.fog + update.minimap` 평균은 1.98ms로 1차 목표인 4ms 이하를 만족했다.
- Node logic 기준 `wolf.repath.candidates`는 평균 20.85ms/최대 38.61ms에서 평균 4.51ms/최대 6.49ms로 감소했다.
- Playwright Chromium 기준 `path.wolf.refresh max`는 51.0ms에서 30.0ms로 감소했다.
- `update.combat max`도 52.1ms에서 32.1ms로 감소해 `wolfRepath` spike는 1차 목표인 33ms 이하에 들어왔다.
- Playwright Chromium 기준 `command.smart.total max`는 17.7ms에서 2.0ms로 감소했고, `path.player.findGridPath`는 hot label에서 사라졌다.

최신 참조 메트릭:

| 항목 | 최신 값 | 판단 |
| --- | --- | --- |
| Browser `frameAvgMs` | 39.3ms | headless frame pacing 영향 포함 가능 |
| Browser `frameMaxMs` | 68.41ms | hot label JS 비용과 완전히 일치하지 않아 별도 해석 필요 |
| `update.fog` | avg 1.25ms / max 8.0ms / total 251.3ms | 남은 누적 비용 1순위 |
| `update.minimap` | avg 0.55ms / max 5.3ms / total 107.0ms | 추가 최적화 가능하지만 체감 리스크 있음 |
| `path.wolf.refresh` | avg 14.2ms / max 40.0ms / total 85.2ms | 초기 focus/repath spike 후보 |
| `path.wolf.findGridPath` | avg 5.16ms / max 10.6ms / total 82.6ms | path cache/bounds 추가 후보 |
| `command.smart.total` | avg 2.0ms / max 3.1ms / total 4.0ms | 현 시점 병목 아님 |
| `update.debugText` | avg 0.21ms / max 0.7ms / total 16.6ms | 현 시점 병목 아님 |

남은 최적화 후보:

1. `update.fog` draw 방식 개선
   - 후보: fog 전체 rect redraw 대신 dirty cell/viewport 중심 갱신, 또는 fog bitmap/cache texture 방식 검토.
   - 리스크: 시야 반응성/미니맵 표시 감각이 둔해질 수 있으므로 추가 throttle만으로 접근하지 않는다.
2. 초기 `path.wolf.refresh` spike 축소
   - 후보: tower focus 직후 path cache 재사용 범위 확대, 초기 path prewarm, repath를 한 프레임 뒤로 defer.
   - 리스크: 최근 늑대 우회/속도 회귀가 많았으므로 전투 감각 확인 없이는 추가 변경하지 않는다.
3. Browser `frameMaxMs` 분리 분석
   - 후보: Playwright headless frame pacing 영향과 실제 JS hot label을 분리하기 위해 in-game movement speed sample 또는 visible Chrome 측정 추가.
   - 리스크: 현재 hot label 합계만으로 gameplay 코드를 더 줄이면 잘못된 최적화가 될 수 있다.

다음 최적화 전 검증 명령:

- `npm run chicken:perf:measure`
- `npm run chicken:browser-perf:measure`
- `npm --workspace @games/chicken-farm run build`

다음 목표:

- `command.smart.total max <= 5ms` 유지
- `update.fog + update.minimap avg <= 4ms` 유지
- 늑대 우회, 타워 focus, 농부/개 이동 속도 회귀가 없는 상태에서만 추가 최적화 진행

성능 최적화 회귀 수정 기록:

- 거리순 상위 후보만 보는 최적화가 실제 우회 가능한 후보를 놓치면 늑대가 `path failed -> blocker attack`으로 전환할 수 있다.
- 목표 건물 후보는 해당 위치에서 목표 건물을 방벽 너머로 때리지 않는지 attack line을 검사한다.
- 상위 4개 후보에서 path를 못 찾으면 나머지 후보를 fallback으로 검사한다. 성능 최적화는 유지하되, 우회 가능한 path가 있는데 방벽을 때리는 회귀를 막는다.
- 울타리 사이 이동 흔들림은 waypoint 근처 dead-zone과 대각선 이동이 clearance에 걸리는 corner collision이 겹칠 때 발생할 수 있다.
- 늑대 이동은 waypoint 12px 이내 도달 처리, 점유 가능한 waypoint에만 snap, diagonal blocked 시 x/y axis slide 후보를 적용해 좁은 통로 흔들림을 줄인다.
- 공격 이동 중 순간 가속은 waypoint snap과 분리 보정이 한 tick에 중복 적용되면 발생할 수 있다. 늑대 이동은 `speedPxPerSec * deltaSec` 이내에서만 목표점 snap을 허용하고, 유닛 분리 보정은 `CombatPocSystem.update()` 끝에서 한 번만 적용한다.
- 가속 방지 이후 우회 중 멈춤은 `moveWolfToward()`의 waypoint 근처 dead-zone return이 pathIndex advance보다 먼저 실행되면서 발생할 수 있다. path follow는 가까운 waypoint를 먼저 consume한 뒤 다음 waypoint로 이동하고, 이동 함수 자체에서는 dead-zone return을 제거한다.
- 타워 공격 직후 focus/repath로 프레임이 길어지면 실제 `deltaSec`가 커져 한 프레임 이동량이 증가할 수 있다. 전투 시간/쿨다운은 실제 elapsed time을 유지하되, 늑대 이동용 delta만 `1/60s`로 clamp해 시각적 순간 가속을 막는다.
- 개/농부도 path follow와 attack chase에서 `speedPxPerSec * deltaSec`를 쓰기 때문에 같은 문제가 발생할 수 있다. controllable unit 이동용 delta도 `1/60s`로 clamp하고, 공격 쿨다운/게임 시간은 기존 elapsed time 기준을 유지한다.
- 타워 focus 후 늑대가 울타리 안쪽으로 들어가 멈추는 회귀는 A*가 `startKey`/`goalKey`를 blocked cell이어도 허용하면서 발생할 수 있다. 타워 중심 또는 울타리 clearance 안쪽 후보가 path goal로 인정되면 path는 존재하지만 실제 movement guard가 이동을 막아 stuck 상태가 된다.
- 전역 pathing 동작은 유지하되, wolf combat path에는 `allowBlockedStart: false`, `allowBlockedGoal: false`를 적용한다. blocked tower/fence goal은 path로 인정하지 않고 `path missing -> blocker fallback`으로 처리한다.
- 자동 회귀 지표 `wolf.blocked_tower_goal_rejected`를 runtime perf 측정에 추가했다. 기대값은 `pass = true`, `pathLength = 0`이다.
- Warsmash 기준 blocker 공격은 "가까운 아무 울타리"가 아니라 현재 목표/실패 경로를 막는 blocker를 치는 흐름에 가깝다. `getWolfBlockingTarget()`은 target line과 교차하는 blocker를 먼저 고르고, 없을 때만 주변 2~3 cell 근접 blocker를 fallback으로 선택한다.
- 자동 회귀 지표 `wolf.blocker_line_priority`를 runtime perf 측정에 추가했다. 기대값은 가까운 off-line blocker가 있어도 `selectedId = target_line_blocker`다.
- 실제 플레이 관찰 기준으로는 초반 스카우트 타워 화력이 여러 일반 늑대를 모두 지우지 못하면, 남은 늑대들이 울타리 미로 내부에서 blocker를 부수고 타워까지 파괴하는 시나리오가 가능하다. Warsmash 기준으로도 일반 늑대는 attack-move/acquisition으로 목표를 계속 찾고, path가 막히면 blocker 공격으로 전환하므로 이 경험은 타당하다.
- PoC 전투 재현은 단일 고HP 테스트 늑대가 아니라 원본 `n007` 팀버 울프 여러 마리로 맞춘다. 기준값은 `n007` HP `450`, armor `0`, speed `330`, attack range `100`, cooldown `1.35`, damage `11 + 1d2`의 평균값 근처인 `12`다.
- Phaser 런타임의 일반 늑대 근접 사거리는 원본 `100`에 맞춰 `96px = 3 minor cells`로 둔다. 이 값은 공격 판정뿐 아니라 타워/건물 접근 A* 후보 거리에도 쓰이므로, 너무 작으면 4x4 blocker 모서리에 목표 후보가 붙어 우회 대신 펜스 공격으로 빠질 수 있다.
- 초반 압박 수는 원본 웨이브/보충 기준 `4~6`마리 범위가 확인되므로, PoC는 사용자가 관찰한 재현성과 성능 부담의 중간값인 `5`마리로 고정한다.
- 스카우트 타워 `h00D`는 원본 추출값 HP `275`, armor `5`, original range `650`, cooldown `1.05`, damage `21 + 1d3` 평균 근처인 `23`을 reference로 둔다. 단, Phaser 런타임 사거리는 세로 `9` major tile 화면에서 `4x4 minor` 펜스 방어선을 커버하도록 `384px`로 별도 변환한다. 후보값은 `384px` 대각 펜스 최소, `448px` 타워-빈칸-펜스 이후 약간 커버, `512px` 꺾인 방어선 커버, `650px` 원본이다.
- 기본 울타리 `h003`은 원본 추출값 HP `200`, armor `1`을 유지한다. 따라서 5마리 늑대가 한 blocker를 때리면 타워 화력보다 빠르게 울타리를 부수는 상황이 재현될 수 있다.
- 원본 타워 사거리 `650`은 문서/분석 표에만 남기고, 실제 판정에는 사용하지 않는다. 런타임 사거리는 `chicken_farm_phaser_p2p_game_plan.md`와 `chicken_farm_w3x_analysis.md`의 Phaser 런타임 사거리 표로 관리한다.
- 기존 압축 미로는 두 타워 중심 거리가 약 `529px`라 `650px` 사거리 원이 크게 겹쳤다. 이제 `tower_scout` 런타임 사거리가 `384px`이므로 원본보다는 작지만, `4x4` minor 펜스 방어선의 커버 체감은 살린다.
- Warsmash/War3 기준 `650`은 약 `5.08` terrain tiles 또는 `20.31` WPM pathing cells다. 다만 현재 Phaser PoC의 실제 이동/pathing/build 검증은 WPM cell과 맞는 `32px` minor grid 기준으로 유지한다.
- 타일 기준은 `minor = 32px`, `major = 4 minor = 128px`로 고정한다. 이동/pathing/build blocked 판정은 minor 기준이고, 화면 배치 UX와 플레이어가 보는 굵은 그리드는 major 기준이다.
- 워3 실제 플레이 이미지의 체감 기준은 세로 `9 major tiles`가 보이는 상태로 둔다. 오른쪽 월드 영역도 살리기 위해 PoC 월드 뷰포트는 `960 x 540`을 유지하고, `CAMERA_ZOOM = 0.46875`를 사용해 `2048 x 1152 world px`, 즉 `16 x 9 major`를 표시한다. 가로 시야가 원본 캡처의 `12` major보다 넓어지는 것은 허용한다.
- build grid는 minor line을 아주 옅게 그리고, major line을 기본 배치 그리드로 읽히게 강조한다. `G` 토글은 이 전체 배치 그리드를 켜고 끈다.
- 타워 footprint는 `1 x 1 major tile`, 즉 `4 x 4 minor cells`로 맞춘다. 현재 `2 x 2 minor` 타워 PoC는 워3식 배치 체감보다 작으므로 수정 대상이다.
- 펜스 footprint는 원본 `h003`/벽 계열의 `pathTex=PathTextures\4x4SimpleSolid.tga` 근거에 맞춰 `4 x 4 minor cells`, 즉 `1 x 1 major tile`로 맞춘다. 전투 PoC의 펜스 배치는 반복 범위가 아니라 `{ id, x, y }` 좌표 하나가 `4x4 minor` blocker 하나를 의미한다.
- 전투 PoC의 울타리/타워/돌벽 배치도 minor cell 좌표로 저장한다. 타워와 펜스 footprint는 둘 다 `1x1 major = 4x4 minor`로 두되, fence sprite는 얇은 울타리처럼 보이게 렌더링에서 조정할 수 있다.
- `buildingTemplates.tower_*`와 `defenseBuildings.tower_scout`의 damage/range는 Phaser 런타임 표를 따른다. `COMBAT_POC_LAYOUT`은 compact minor-grid 레이아웃을 유지하되 타워 footprint와 화면 그리드 기준을 major UX에 맞춘다.

## 5. 현재 신뢰도: War3 Player Command Control

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

| 범위 | 현재 수준 | 리스크 | 관리 방침 |
| --- | --- | --- | --- |
| Attack-move | 미구현/보류 | 거미 사냥, 늑대 대응 자동 공격 검증 부족 | PoC 4 또는 전투 확장 전에 M6로 구현 |
| Command queue/control group | 미구현 | 원본 워3 조작 완성도 부족 | MVP 필수 전까지 보류 |
| ECS 분리 | 부분 분리 | `ControllableUnitSystem`, `CombatPocSystem`에 view/state 혼재 | 경제/상점은 처음부터 state/system/view adapter로 작성 |
| Unit collision/local avoidance | 최소판 | 다중 유닛/좁은 통로에서 흔들림 가능 | 회귀 발견 시 movement adapter에서 국소 수정 |
| Pathing 정확도 | WPM + dynamic blocker 축약판 | 원본 워3 pathing texture/collision과 차이 가능 | 측정 artifact와 수동 플레이 확인 병행 |
| Browser frame pacing | 일부 불명확 | Playwright headless `frameMaxMs`가 hot label과 불일치 | 최적화 판단은 hot label + 수동 체감 기준으로 병행 |
| Deterministic replay | 미구현 | P2P 승격 시 command 재현성 검증 부족 | PoC 13/15 전에 command log/replay 측정 추가 |

다음 단계 진입 기준:

- PoC 7 경제/건설/상점은 진행한다.
- 단, 구현 중 attack/interact/build command hook을 늘릴 때 `main.ts` 직접 분기보다 command/system API를 우선한다.
- 신뢰도 부족 범위는 지금 더 파고들지 않고, 실제 경제/상점 루프에 걸리는 순간에 보강한다.

## 6. 다음 단계: Economy / Build / Shop PoC

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

| 항목 | MVP 값 |
| --- | --- |
| 시작 코인 | easy `140`, normal `120`, hard `120`, crazy `110` |
| 알 생성 주기 | `30 sec` |
| 알 표현 | `FieldEggItem`, wallet resource 아님 |
| 알 거래 | 수집/보유 중인 egg item stack 판매 시 `coins += eggCount * 12` |
| 알 부화 | 닭장이 egg item stack을 소비하고 일정 시간 후 닭 생성 |
| 기본 닭장 | `coop_basic`, cost `60`, `1 egg item / 30 sec` 또는 기본 부화 슬롯 1 |
| 중급 닭장 | `coop_mid`, cost `120`, `2 egg items / 30 sec` 또는 부화 슬롯 2 |
| 고급 닭장 | `coop_high`, cost `220`, `3 egg items / 30 sec` 또는 부화 슬롯 3 |
| 업그레이드 | basic -> mid `80`, mid -> high `140` |
| revive penalty | MVP 기준 coin `25%` 손실, field egg item은 별도 드롭/소멸 정책 후속 결정 |
| exchange | MVP 기본 비활성, PoC 6에서 분리 검증 |

PoC 7 측정 후보:

- `npm run chicken:economy:measure`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_poc_metrics.json`

서브 마일스톤:

| 단계 | 상태 | 내용 | 산출물 |
| --- | --- | --- | --- |
| E1 | 다음 | Economy state 최소판: coin wallet, field egg items, chickens, coops, nextEggDropAtSec | `economyTypes`, `economySystem` |
| E2 | 대기 | 30초 egg drop tick: 닭/닭장 등급별 field egg item 생성, timeScale/debug tick 대응 | `chicken:economy:measure` |
| E3 | 대기 | Egg collect/trade service: 농부 수집, egg stack 소유권, 판매 시 coin 증가 | collect/trade API |
| E4 | 대기 | Coop build/hatch service: farm zone 안에 coop_basic 배치, egg 소비 후 닭 부화, WPM buildBlocked 검사 | build/hatch API |
| E5 | 대기 | Upgrade service: coop basic -> mid -> high, 비용/알 생성량/부화 슬롯 변경 | upgrade command/API |
| E6 | 대기 | Shop/interact hook: 농부 우클릭 egg/shop/coop 대상 분기, UI 없이 debug sell/hatch/upgrade 호출 | smart/interact command extension |
| E7 | 대기 | Browser/Node 측정: 30초 drop, 수집/판매/부화, 구매/업그레이드, player slot 분리 | economy metrics artifact |
| E8 | 대기 | 문서/밸런스 고정: PoC 7 완료 기준과 PoC 6 중앙 상점 확장 범위 결정 | next priority update |

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

## 7. 전체 PoC 로드맵

| 우선순위 | PoC | 상태 | 선행 조건 | 다음 액션 |
| ---: | --- | --- | --- | --- |
| 1 | Economy / Build / Shop PoC | 다음 구현 | command control 최소 통과 | economy state, 30초 egg drop tick, egg collect/trade/hatch, coop build/upgrade |
| 2 | War3 Player Command Control 보강 | 필요 시 | 경제/전투 루프 중 회귀 발견 | attack-move, replay, ECS 분리 보강 |
| 3 | PoC 6. 중앙 상점/교환 | PoC 7 이후 | command/interact hook | shop state와 교환 UI prototype |
| 4 | PoC 12. 결혼/아내/가족 테크 | 병렬 가능 | state model | spouse/family component와 지원 스킬 구조 정의 |
| 5 | PoC 4. 거미/초반 보너스 | PoC 7 이후 권장 | command + terrain + economy | 거미 사냥을 reward/economy로 연결 |
| 6 | PoC 5. 늑대의 돌 | 병렬 가능 | command + combat | 특정 object 공격/보상 흐름 검증 |
| 7 | PoC 9. 보스/레벨 보상 | PoC 7 이후 | economy + reward | boss reward table과 level reward 지급 |
| 8 | PoC 10. 원본 타임라인/배속 | PoC 7 이후 | economy tick + wave scheduler | timeScale 기반 장기 루프 측정 |
| 9 | PoC 11. 낮/밤 + FoW + 미니맵 | 병렬 가능 | Tilemap | rendering layer 검증 |
| 10 | PoC 8. 거북이 이벤트 NPC | PoC 6 이후 | central hub | event NPC interaction |
| 11 | PoC 13. 8인 로컬 슬롯 | economy 이후 | player slot state 분리 | 8 slot local simulation |
| 12 | PoC 14. 싱글 플레이 통합 MVP/MVC | 주요 PoC 완료 후 | all core loops | playable vertical slice |
| 13 | PoC 15. P2P 네트워크 | PoC 14 이후 | deterministic command/state boundary | sync model 검증 |
| 14 | PoC 16. 8인 내부 테스트 | PoC 15 이후 | network | full scenario test |

## 8. 구현 순서 기록

1. 완료: 기존 `PlayerControlSystem`의 WASD 직접 이동을 debug 전용으로 격리한다. 완료 시 키보드는 Warsmash 참고 범위의 camera pan으로 전환한다.
2. 완료: 농부/개 controllable unit을 별도 state로 만든다.
3. 완료: 좌클릭 selection과 선택 ring을 구현한다.
4. 완료: 우클릭 ground move command를 만들고 WPM + smoothed path follow에 연결한다.
5. 완료: `S` stop command와 command cancel을 구현한다.
6. 완료: smart target dispatch 구조를 추가해 attack/interact hook을 비워 둔다.
7. 완료: 늑대가 acquisition range 안의 농부/개를 직접 공격 후보로 보고, 경로가 막힌 경우에만 blocker 공격으로 전환하게 보정한다.
8. 완료: 우클릭 대상이 늑대이면 smart order를 attack command로 분기하고 farmer/dog가 사거리 접근 후 공격하게 한다.
9. 완료: 늑대 속도를 원본 기준으로 보정하고, 전투 target follow/repath를 구현한다.
10. 보류: attack-move 최소판은 거미/전투 확장 전까지 미룬다.
11. 완료: drag selection 최소판을 구현한다. 좌클릭 click selection은 유지하고, threshold 이상 드래그하면 rectangle과 교차하는 farmer/dog를 다중 선택한다.
12. 완료: unit push 최소판을 구현한다. 목표는 워3식 정밀 회피가 아니라 완전 중첩 방지, 약한 push-out, 다중 선택 목적지 offset이다.
13. 자동 측정 스크립트와 artifact를 추가한다.
14. 완료: 문서에 측정 결과를 반영하고 Economy / Build / Shop PoC로 이동한다.

## 9. 보류 및 리스크

- 멀티 선택과 control group은 MVP 체감에는 중요하지만 이번 PoC의 선행 조건은 아니다.
- command card UI는 추후 build/shop PoC에서 필요할 때 확장한다.
- 현재 Phaser object 중심 구조를 한 번에 ECS로 갈아엎지 않는다. 먼저 command/state boundary를 만들고, 이후 component로 승격한다.
- P2P deterministic 검증은 PoC 15 범위지만, 이번 PoC부터 command replay가 가능하도록 설계해야 한다.

## 10. 참고 문서

- 전체 PoC 목록: `docs/chicken_farm/chicken_farm_phaser_p2p_game_plan.md`
- Warsmash 조작/명령 참고: `docs/chicken_farm/chicken_farm_warsmash_behavior_notes.md`
- Economy 기준: `docs/chicken_farm/chicken_farm_wave_shop_disease_mvp_spec.md`
- W3X artifact: `docs/chicken_farm/chicken_farm_w3x_artifacts/`
- Phaser 구현: `games/chicken-farm/src/game/`

# Chicken Farm Warsmash Behavior Notes

> 목적: Warsmash 임시 checkout을 통해 Warcraft III식 유닛 명령, 이동, pathing, 공격 루프를 확인하고, 닭농장 Phaser MVP의 늑대/펜스 동작으로 축약할 규칙을 정리한다.

조사 기준:

- 임시 checkout: `/tmp/WarsmashModEngine`
- 원격 저장소: `https://github.com/Retera/WarsmashModEngine`
- 조사 날짜: 2026-06-16
- 저장소 반영 범위: Warsmash 소스 코드는 복사하지 않고 클래스/패키지 이름과 동작 관찰만 기록한다.

## 1. 확인한 핵심 패키지/클래스

| 영역 | Warsmash 경로/클래스 | 관찰 요약 |
|---|---|---|
| 명령 진입 | `simulation.players.CPlayerUnitOrderExecutor` | target/point/immediate order를 `COrder*` 객체로 감싸 `CUnit.order(...)`로 전달한다. |
| 유닛 상태 | `simulation.CUnit` | 현재 behavior, 기본 behavior, 명령 큐, acquisition range, 이동/공격 behavior 참조를 가진다. |
| behavior 공통 | `simulation.behaviors.CBehavior` | `begin`, `update`, `end`, `interruptable`, `getBehaviorCategory`가 기본 계약이다. |
| 이동 | `simulation.behaviors.CBehaviorMove` | pathfinding 요청, 방향 전환, prop window 진입 후 이동, 충돌 실패 시 재탐색/포기 흐름을 담당한다. |
| ranged/공격 공통 | `simulation.behaviors.CAbstractRangedBehavior` | 사거리 밖이면 이동 behavior로 전환하고, 사거리 안이면 facing window를 맞춘 뒤 실제 행동을 진행한다. |
| 공격 | `simulation.behaviors.CBehaviorAttack` | attack cooldown, damage point, backswing, attack animation, launch 타이밍을 관리한다. |
| attack-move | `simulation.behaviors.CBehaviorAttackMove` | 이동 중 `autoAcquireAttackTargets`가 성공하면 현재 공격 behavior로 전환한다. |
| 공격 능력 | `simulation.abilities.CAbilityAttack` | smart/attack order의 target 가능 여부를 확인하고 unit/destructable/point target에 따라 attack/move/attack-move로 분기한다. |
| 공격 스탯 | `simulation.combat.attacks.CUnitAttack` | damage dice, cooldown, range, range motion buffer, targets allowed, weapon type, attack speed 보정을 가진다. |
| pathing grid | `environment.PathingGrid` | `.wpm` 정적 pathing과 건물/나무/destructable 동적 overlay를 합쳐 walkable 여부를 판단한다. |
| pathfinding | `simulation.pathing.CPathfindingProcessor` | 32 world-unit grid 기준 A* 계열 탐색, corner/cell mapping, smoothing, 동적 충돌 검사를 수행한다. |
| world collision | `simulation.CWorldCollision` | 유닛/건물/destructable/item을 quadtree로 관리하고 range/rect enum 및 충돌 검사를 제공한다. |
| destructable pathing | `simulation.CDestructable`, `War3MapViewer#createNewDestructable` | 생존/사망 상태별 pathing overlay를 만들고 life 상태에 따라 pathing을 add/remove한다. |

## 2. 명령과 Behavior 흐름

관찰 흐름:

1. 플레이어 명령은 `CPlayerUnitOrderExecutor`에서 `COrderTargetWidget`, `COrderTargetPoint`, `COrderNoTarget` 등으로 변환된다.
2. `CUnit.order(...)`는 queue 여부, 현재 behavior의 interrupt 가능 여부, stop/hold 기본 behavior를 고려해 즉시 시작하거나 큐에 넣는다.
3. 실제 시작은 `beginOrder(...) -> order.begin(...) -> ability.begin(...)` 흐름이다.
4. `CBehavior.update(...)`는 매 시뮬레이션 tick마다 다음 behavior를 반환할 수 있다.
5. 현재 behavior가 끝나면 `pollNextOrderBehavior(...)`가 기본 behavior 또는 큐의 다음 order로 넘어간다.

Phaser 축약:

```text
WolfBehavior
  Idle
  AcquireTarget
  MoveToTarget
  AttackTarget
  Repath
  AttackBlocker
```

구현 포인트:

- order queue 전체를 MVP에 넣을 필요는 없다.
- 늑대 AI는 매 tick 하나의 `behaviorState`만 가진다.
- 상태 전환은 `nextState = updateWolfBehavior(wolf, world, dt)`처럼 순수 로직에 가깝게 둔다.
- 플레이어 명령 큐는 농부/건설 유닛 구현 시 별도 확장한다.

## 3. 이동과 Pathing 관찰

Warsmash 이동 감각:

- 이동 시작 시 목표 좌표 또는 follow unit 위치를 기준으로 pathfinding job을 요청한다.
- path는 32 world-unit grid 중심 또는 corner mapping을 사용한다.
- collision size에 따라 cell/corner graph를 선택한다.
- unit facing이 목표 방향으로 충분히 맞아야 전진한다.
- 이동 중 충돌 또는 pathing 실패가 나면 즉시 텔레포트하지 않고 pathfinding을 다시 요청한다.
- follow target이 많이 움직이면 목표 좌표를 갱신해 재탐색한다.
- 여러 차례 실패하면 짧은 대기 후 재시도하고, 반복 실패 시 이동을 포기하고 다음 behavior로 넘어간다.

PathingGrid 관찰:

- `.wpm` 정적 pathing 값과 dynamic overlay를 OR로 합친다.
- `UNWALKABLE`, `UNFLYABLE`, `UNBUILDABLE`, `BLOCKVISION`, `UNSWIMABLE` 같은 flag를 사용한다.
- 건물/나무/destructable은 pathing texture를 동적 overlay로 blit한다.
- destructable은 생존 pathing과 사망 pathing을 별도로 둘 수 있다.
- pathing texture의 빨강 채널은 ground 이동 차단 성격으로 반영된다.

Phaser 축약:

| 개념 | Phaser MVP 변환 |
|---|---|
| 32 world-unit pathing cell | 32px 또는 48px grid 중 하나로 고정. 현재 W3X `wpm` 분석과 맞추려면 32px 권장 |
| 정적 pathing | `terrainBlocked: boolean[]` |
| 동적 pathing overlay | `dynamicBlockers: Map<CellKey, BlockerRef[]>` |
| unit collision | MVP에서는 늑대끼리 겹침 허용 또는 약한 separation만 적용 |
| path smoothing | A* 결과에서 직선 시야가 열리면 중간 노드 제거 |
| 반복 실패 | `repathAttempts`, `blockedSinceSec`, `lastRepathAtSec`로 관리 |

늑대 이동 규칙:

```text
if no target:
  acquire valuable target
else if path exists and next step is open:
  turn/move toward next waypoint
else if can repath:
  request path to target
else if blocked long enough:
  choose nearest attackable blocker near failed path
else:
  wait briefly
```

## 4. 자동 타깃 획득과 Attack-Move

관찰:

- `CUnit.autoAcquireAttackTargets(...)`는 acquisition range 사각형 안의 유닛을 enum한다.
- 공격 가능 조건은 동맹/passive 여부, 사망/무적/수면 여부, target type, 최소 사거리, 공격 타입 예외 등을 확인한다.
- 조건을 만족하면 즉시 `CBehaviorAttack`으로 전환한다.
- `CBehaviorAttackMove`는 목적지로 이동하면서 자동 공격 타깃 획득을 시도한다.
- 기본 자동 획득은 유닛 중심이며, destructable/blocker 공격은 명시 attack/smart target 또는 pathing 실패 전환으로 다루는 편이 Phaser에 적합하다.

닭농장 변환:

- 늑대의 primary target은 농장 내부 가치 오브젝트로 둔다.
- acquisition range 안의 닭/건물/농부는 직접 공격 후보가 된다.
- 펜스는 항상 최우선이 아니라 `path blocked` 상태에서만 blocker 후보가 된다.
- 이 구조가 “늑대가 농장으로 들어오려 하고, 펜스가 그 흐름을 잠깐 막는다”는 원본 감각에 가깝다.

권장 우선순위:

| 단계 | 후보 |
|---|---|
| primary acquire | 수익 건물, 닭/가축 역할 오브젝트, 농부/핵심 건물 |
| proximity acquire | 가까운 방어 유닛 또는 공격 가능한 플레이어 오브젝트 |
| blocked acquire | path를 막는 펜스/벽/건물 blocker |
| fallback | 가장 가까운 가치 오브젝트로 재탐색 |

## 5. 공격 루프 관찰

Warsmash 공격 감각:

- `CUnitAttack`은 `cooldownTime`, `animationDamagePoint`, `animationBackswingPoint`, `range`, `rangeMotionBuffer`, damage dice를 가진다.
- `CBehaviorAttack`은 사거리 안에 들어오면 facing window를 맞추고, cooldown이 끝난 뒤 attack animation을 시작한다.
- damage point tick에 실제 damage launch가 발생한다.
- backswing이 끝난 뒤 다음 행동으로 넘어갈 수 있다.
- cooldown 중에는 `rangeMotionBuffer`가 사거리 판정에 더해져 이동/공격이 덜 덜컥거리게 보인다.

Phaser 축약:

| Warsmash 요소 | MVP 필드 |
|---|---|
| `cooldownTime` | `attackCooldownSec` |
| `animationDamagePoint` | `windupSec` |
| `animationBackswingPoint` | `backswingSec` 또는 시각 연출만 |
| damage dice | 고정 `damagePerHit` 또는 작은 랜덤폭 |
| `range` | `attackRangePx` |
| `rangeMotionBuffer` | `rangeLeashPx` |

MVP 공격 상태:

```text
if target invalid:
  acquire next target
else if distance > attackRangePx + rangeLeashPx:
  move into range
else if not facing target:
  rotate toward target
else if now >= nextAttackAtSec:
  start windup
else if windup finished:
  apply damage once
  nextAttackAtSec = now + attackCooldownSec
```

단순화 기준:

- damage type/armor type 전체 상성은 MVP에서 제외한다.
- armor는 flat reduction 또는 effective HP 보정으로 둔다.
- windup/backswing은 gameplay lock보다 애니메이션 감각에 우선 사용한다.

## 6. 펜스/Destructable/Blocker 재현 규칙

Warsmash 관찰:

- destructable은 `War3MapViewer#createNewDestructable`에서 pathing overlay instance를 만들고, life 상태에 따라 생존 또는 사망 overlay를 적용한다.
- building unit도 pathing texture를 동적 overlay로 넣는다.
- pathing overlay를 제거하면 dynamic overlay 전체를 다시 구성한다.
- `CAbilityAttack`은 unit뿐 아니라 destructable target도 attack/smart target으로 허용할 수 있다.

Phaser 펜스 규칙:

| 속성 | 권장값 |
|---|---:|
| cell footprint | 1x1 grid cell |
| hp | 80 |
| armor | 0 |
| targetableByWolves | true |
| blocksGround | true |
| blocksFlying | false |
| death pathing | blocker 제거 |

늑대가 펜스를 공격하는 조건:

1. primary target까지 pathfinding이 실패한다.
2. 마지막 path 실패 지점 또는 현재 위치 주변 2~3 cell 안에 `targetableByWolves` blocker가 있다.
3. blocker가 target보다 가까운 우회로를 막고 있다.
4. `blockedSinceSec >= 0.6~1.0`이면 `AttackBlocker`로 전환한다.

주의:

- blocker를 항상 먼저 공격시키면 원본 닭농장의 “농장을 노리는 압박”이 약해진다.
- blocker 공격은 target acquisition이 아니라 movement failure의 결과로 둔다.

## 7. Phaser 구현 스케치

데이터 타입 후보:

```ts
type WolfState =
  | 'idle'
  | 'acquire'
  | 'move'
  | 'repath'
  | 'attack'
  | 'attack_blocker';

interface WolfAiRuntime {
  state: WolfState;
  targetId?: string;
  blockerTargetId?: string;
  path: Array<{ x: number; y: number }>;
  pathIndex: number;
  lastAcquireAtSec: number;
  lastRepathAtSec: number;
  blockedSinceSec?: number;
  nextAttackAtSec: number;
  windupEndsAtSec?: number;
}
```

튜닝 시작값:

| 항목 | 값 |
|---|---:|
| grid size | 32 px |
| acquire interval | 0.35 sec |
| repath interval | 0.50 sec |
| blocked-to-blocker delay | 0.80 sec |
| blocker search radius | 96 px |
| range leash | 16 px |
| ordinary wolf speed | 110 px/sec |

## 8. Phaser MVP 구현 외 추가 조사 후보

Phaser MVP 구현으로 바로 들어가기 전에, 구현과 별도로 더 조사할 수 있는 항목은 다음이다.

| 우선순위 | 조사 항목 | 목적 | 예상 산출물 |
|---|---|---|---|
| 완료 | 펜스/벽/방어 건물 rawcode 후보 분리 | 늑대가 공격할 blocker와 단순 장식을 구분 | `docs/chicken_farm/chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv` |
| 완료 | JASS 늑대 명령 함수의 좌표/대상 우선순위 좁히기 | 스폰 후 늑대가 어느 지점/오브젝트를 향하는지 추정 | `docs/chicken_farm/chicken_farm_w3x_artifacts/jass_wolf_order_flows.tsv` |
| 높음 | Warsmash pathing flag와 현재 `.wpm` 파싱 결과 교차표 | `UNWALKABLE` 해석과 32px grid 변환 확정 | `wpm_warsmash_pathing_crosscheck.md` |
| 중간 | destructable 생존/사망 pathing 참고 | 펜스 파괴 후 blocker 제거 감각 확정 | `destructable_pathing_notes.md` |
| 중간 | `war3mapImported` 모델/텍스처 경로 인덱싱 | 원본을 직접 쓰지 않고 신규 에셋 제작 레퍼런스 정리 | `asset_reference_index.tsv` |
| 중간 | 상점/아이템 원문 tooltip과 스탯 연결 | MVP shop item 이름/효과를 원본 감각에 맞춤 | `shop_item_reference.tsv` |
| 중간 | 질병/상태 이상 buff rawcode 추적 | 질병 이벤트가 단순 페널티인지 유닛/버프 기반인지 구분 | `disease_buff_reference.tsv` |
| 낮음 | 보스 후속 변환 함수 추가 추적 | `archimonde -> nether_dragon` 가설 보강 | `boss_transform_flow.md` |
| 낮음 | wc3libs로 파서 결과 교차검증 | Python 파서의 `.doo/.wpm/SLK` 해석 신뢰도 보강 | `parser_crosscheck_notes.md` |
| 낮음 | 실제 플레이 관찰 재개 | Warsmash/정적 분석으로 대체한 가설의 체감 검증 | `play_observation_template.tsv` 갱신 |

이번 단계의 기준은 “실제 플레이 관찰 필수”가 아니라 “Warsmash behavior 관찰 + W3X 정적 데이터”다. 실제 플레이 관찰은 보스 순서/체감 튜닝을 확인하는 후순위 검증으로 둔다.

## 9. 다음 구현 작업

1. `games/chicken-farm/src/game/pathing.ts`에 정적/동적 blocker grid와 A* helper를 만든다.
2. `games/chicken-farm/src/game/ai.ts`에 위 상태 머신을 독립 모듈로 구현한다.
3. `balance.ts`의 enemy/fence 값에 `attackRangePx`, `attackCooldownSec`, `acquireRangePx`, `rangeLeashPx`를 명시한다.
4. 완료: 원본 doodad/unit 후보에서 실제 펜스 후보 rawcode를 `docs/chicken_farm/chicken_farm_w3x_artifacts/fence_candidate_rawcodes.tsv`로 분리했다.

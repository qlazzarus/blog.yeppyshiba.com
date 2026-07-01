# Chicken Farm Completed PoC History

이 문서는 active planning 문서에서 반복적으로 등장하던 완료 PoC 이력을 archive 형태로 압축한다.

현재 구현 판단에 필요한 결론만 남기고, 다음 작업자는 active 문서에서 진행 중인 건설/경제/시야/테크 항목을 먼저 읽는다.

## 1. 완료된 기반 PoC

| 항목 | 상태 | 결론 |
| --- | --- | --- |
| Tilemap 맵 PoC | 완료 | 원본 크기 기반 Phaser Tilemap, trim offset, 핵심 object layer, farm zone, spawn marker를 확보했다. |
| W3X 기준 데이터 고정 | 완료 | wave, unit stats, ability, building, item/reward 후보 TSV와 JSON artifact를 확보했다. |
| WPM Terrain Blocker 이식 | 완료 | `.wpm` 기반 terrain grid를 A* pathing과 debug overlay에 연결했다. |
| Path Smoothing 이식 | 완료 | raw path 대비 waypoint/turn 감소와 blocked segment safety를 확인했다. |
| WolfAI 상태 머신 PoC | 완료 | 순수 decision layer와 Warsmash fit 측정이 통과했다. |
| Combat PoC baseline | 완료 기준 충족 | 늑대/방벽/공격 건물 blocker/target 전환 검증 baseline을 확보했다. 현재는 construction focus 때문에 flag off 상태다. |

주요 artifact:

- `docs/chicken_farm/chicken_farm_w3x_artifacts/terrain_pathing_poc_metrics.json`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/wolf_ai_state_machine_metrics.json`
- `games/chicken-farm/assets/data/wpm_pathing_grid.json`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/runtime_performance_debug_metrics.json`
- `docs/chicken_farm/chicken_farm_w3x_artifacts/browser_performance_debug_metrics.json`

핵심 측정 결론:

- `micro_a`: raw waypoint `89` -> smoothed `4`, turn `9` -> `1`, detour `1.17` -> `1.13`.
- `micro_b`: raw waypoint `80` -> smoothed `3`, turn `7` -> `1`, detour `1.05` -> `1.02`.
- smoothed path의 `pathSegmentBlockedHits = 0`, `blockedWaypointCount = 0`.
- WolfAI decision table `6/6`, Warsmash fit checks `9/9` 통과.

## 2. War3 Player Command Control

현재 판단:

- MVP 경제/건설/상점 PoC를 붙일 수 있는 최소 조작 기반으로는 완료다.
- 원본 Warcraft III 전체 조작 복제는 아니며, 닭농장 MVP에 필요한 선택/이동/공격/정지/경로 추종 중심의 축약판이다.

완료 마일스톤:

| 단계 | 상태 | 결론 |
| --- | --- | --- |
| M1 | 완료 | WASD/방향키 직접 이동을 제거하고 camera pan으로 분리했다. |
| M2 | 완료 | `farmer`/`dog` controllable unit state와 view를 만들고 debug marker와 분리했다. |
| M3 | 완료 | 좌클릭 단일 선택, 빈 공간 선택 해제, 선택 ring 표시를 구현했다. |
| M4 | 완료 | 우클릭 ground move command와 WPM + smoothed path follow를 연결했다. |
| M5 | 완료 | `S` stop, smart command hook, dynamic blocker 입력을 연결했다. |
| M5.5 | 완료 | 늑대가 acquisition range 안의 농부/개를 직접 공격 후보로 본다. |
| M5.6 | 완료 | 우클릭 늑대 hit test와 farmer/dog attack command를 연결했다. |
| M5.7 | 완료 | 늑대 속도/추격을 원본 `n007` speed `330` 기준으로 보정했다. |
| M7 | 완료 | Drag selection 최소판을 구현했다. |
| M8 | 완료 | Unit push 최소판으로 완전 중첩을 완화했다. |

보류:

- Attack-move `A` command는 아직 보류다.
- Control group, formation, replay/deterministic command log는 MVP 필수 전까지 보류한다.
- ECS 분리는 완료가 아니라 후속 구조 개선 범위다.

## 3. Command Queue P0

완료된 범위:

- `ControllableUnitState.commandQueue`를 추가했다.
- 일반 우클릭/smart command는 `replace`, `Shift + 우클릭`은 `append`로 발행한다.
- queued move/attack은 현재 command가 끝난 뒤 순서대로 시작한다.
- `Stop`은 현재 command와 unit command queue를 모두 비운다.
- 예약 명령은 임시 world marker와 선택 정보 패널의 `Queued N`으로 확인한다.
- 건설 배치 중 `Shift + 좌클릭`이면 placement mode를 유지한다.
- 같은 농부에게 여러 pending build order를 순서대로 쌓는다.
- 앞 건설이 complete되면 다음 pending build site로 이동한다.
- pause된 건설 건물을 `Shift + 우클릭`하면 resume 이동이 unit command queue 뒤에 append된다.
- 착공 직전 자원/월드 경계/지형/기존 건물 overlap을 재검사한다.

아직 archive하지 않는 범위:

- Building production queue는 P1이다.
- 생산 queue는 unit command queue와 UI 언어는 공유하지만 runtime 책임은 분리한다.

## 4. Combat Baseline 보관 메모

현재 combat은 삭제가 아니라 feature flag off다.

보관할 결론:

- 늑대는 고정 경로 적이 아니라 attack-move형 적으로 본다.
- 일반 늑대 baseline은 원본 `n007` HP `450`, armor `0`, speed `330`, melee range 약 `96px`, 평균 damage `12` 근처로 둔다.
- 기본 울타리 `h003`은 HP `200`, armor `1`.
- 스카우트 타워 `h00D`는 HP `275`, armor `5`, 평균 damage `23`, cooldown `1.05`를 참조한다.
- 원본 타워 사거리 `650`은 reference로 보관하되 Phaser 런타임 사거리는 `384px` 체감값을 사용한다.
- blocker 공격은 가까운 아무 울타리가 아니라 현재 목표/실패 경로를 막는 blocker를 우선한다.
- tower focus/aggro pulse는 전체 공유 어그로가 아니라 attacked-event 체감 일부를 축약한 soft nudge로 둔다.

후속에서 combat을 다시 켤 때 확인할 것:

- player-built building을 wolf target/blocker에 연결한다.
- 타워 공격 후보는 현재 visible target으로 제한한다.
- dead wolf focus/target/action/path cleanup 유지 여부를 다시 확인한다.
- current construction focus에서 만든 `BuildingSystem` blocker/vision API와 combat adapter를 연결한다.

## 5. 현재 Active 문서로 넘긴 항목

아래 항목은 완료 archive가 아니라 active 문서에서 계속 관리한다.

- Construction Placement PoC 가시성 보강
- 타워 공격과 현재 시야 연결
- 건물별 vision multiplier
- 건물 complete 기반 tech tree
- `coop_basic` egg tick과 Economy / Build / Shop PoC
- Building production queue
- Sprite asset manifest와 runtime visual state

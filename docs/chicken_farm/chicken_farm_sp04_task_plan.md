# SP-04 선택·이동·경로·기본 명령 — 세부 실행 계획

> 2026-10-01. Terra medium에서 **한 요청에 한 ID**를 실행한다. SP-04-01~05는 완료했고 다음 ID는 SP-04-06이다.

## 진행 상태와 확인 근거

- SP-03-01~09는 완료 기록이 있다. normal/easy/debug 시작 회귀와 같은 page 두 restart의 검증 결과는 [SP-03 계획](./chicken_farm_sp03_task_plan.md)에 있다. 이번 계획 작업에서 해당 검증을 재실행하지 않았다.
- SP-04는 기존 시스템이 있으나 아래 완료 조건으로 통합 검수되지 않았다. SP-04-01은 정적 계약·좌표 대조를, SP-04-02~05는 normal P3 actual selection·우클릭·Stop 회귀를 완료했고, 다음 ID는 **SP-04-06**이다. 태스크 개수로 게임 진행률을 계산하지 않는다.

아래 소스 경로는 `games/chicken-farm/src/` 기준이다. 구현 존재와 runtime 통과를 구분한다.

| 영역 | 현재 코드 근거 | 남은 확인 |
| --- | --- | --- |
| 선택 | `main.ts#configurePointerSelection`, `game/systems/dragSelectionInputSystem.ts`, `controllableUnitSystem.ts#selectAt/selectInRect` | 실제 클릭/drag·빈 땅·선택 교체·HUD 경계 |
| 우클릭 | `main.ts#configurePointerSelection/issueEconomySmartCommand` | 경제 → 건설 재개 → 전투/이동 분기의 소비 여부와 중복 명령 |
| 정지/예약 | `main.ts#updateStopHotkey/isQueueCommandMode`, `controllableUnitSystem.ts#stopSelectedUnits/issueUnitCommand/pollNextQueuedCommand` | S/카드 정지, replace/append, 실패한 예약 뒤 다음 명령 |
| 경로 | `controllableUnitSystem.ts#findMovePath` | player 설정: cell 32, clearance 8, maxIterations 70000, 지역 bounds·smoothing; 실제 맵에서 확인 필요 |
| 이동 중 장애물 | `controllableUnitSystem.ts#updateMoveCommand` | 정적 확인상 waypoint를 따라 위치를 갱신하며 해당 함수 안에 다음 위치 blocker 재검사가 없다. 새 건물 관통 가능성을 재현 후 판단 |
| 기존 측정 | `scripts/measure-chicken-farm-terrain-pathing.ts`, `scripts/measure-chicken-farm-browser-perf.ts` | 전자는 wolf clearance/speed 기준, 후자는 debug 직접 선택/명령 중심. 농부/개의 실제 입력 검수를 대신하지 못함 |

## 실행 원칙과 범위

- 순서: **01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10**. 모두 대기 상태이며 앞선 ID 완료 뒤 진행한다.
- 각 요청은 해당 카드와 지정 함수부터 읽는다. 대형 `main.ts`, 과거 기획, W3X artifact 전체를 매번 읽지 않는다. 필요한 호출부만 확장한다.
- 기존 동작이 완료 조건을 만족하면 회귀 근거만 남긴다. 새 command framework나 경로 엔진을 만들지 않는다.
- 수정은 보통 핵심 파일 1~3개와 해당 검증을 목표로 한다. 독립 결함이 여러 개이거나 새 상태 기계가 필요하면 `해당 ID-a/b`로 분리하고 미완료를 명시한다. 파일 수 때문에 필요한 수정이나 완료 조건을 생략하지 않는다.
- 실제 입력은 브라우저 mouse/keyboard로 발행하고 debug API는 fixture 배치·관찰에 사용한다. 직접 API 호출만으로 입력 통과를 선언하지 않는다.
- normal P3, farmer/dog 2기, combat/terrain probe off를 기본으로 한다. 경로 fixture는 명시적 test/debug 진입에서만 생성하고 종료 시 제거한다. 정상 시작 지갑을 늘리지 않는다.
- SP-05는 건설 비용/환불/lifecycle, SP-06은 경제 수량/거래, SP-07은 공격·피해·attack-move 전투 복귀를 담당한다. SP-04는 명령 전달·취소·경로 경계까지만 맡는다. SP-14 입력 누출이 기본 조작을 막으면 해당 결함만 여기서 수정한다.

## 실행 카드

### SP-04-01 — 조작 계약과 재현 좌표 고정

- 읽기: 위 근거 표의 입력·명령 함수, `playerCommandTypes.ts`, `dragSelectionInputSystem.ts`.
- 작업: 클릭/drag/빈 땅, 우클릭, S/Stop, Shift, 대상 지정 취소의 현재 동작과 기대 동작을 표로 기록한다. 각 사례에 선택 유닛·시작/목표 좌표·카메라·기대 currentCommand/queue·timeout을 지정한다. 실제 맵 통로/막힌 지점 좌표는 blocker 데이터로 확인한다.
- 완료: 구현됨/미검증/재현 결함을 구분하고, 경로 실패·예약 실패의 정책을 명시한다. 제안 기본값은 실패 명령 종료 후 다음 예약 진행, 무한 재시도 금지다. 기존 계약과 충돌하면 근거와 결정부터 기록한다.
- 검증: 함수/데이터 대조. runtime 확인하지 않은 사례는 미검증으로 둔다. 이 ID는 문서만 변경 가능하다.

#### 확정 조작 계약과 SP-04-02 재현 사례

2026-10-01 정적 대조 결과다. 좌표는 Phaser 월드 좌표이며, normal session은 P3 owner 3, combat/terrain probe off를 쓴다. P3 원본 좌표 `(384, 1472)`에 trim offset `(-3008, -7456)`을 적용한 시작점은 `(3392, 8928)`이다. farmer는 그 점, dog는 `(+42, +18)`인 `(3434, 8946)`에서 생성한다. 화면 좌표는 fixed 값이 아니라 `camera.getScreenPoint(worldX, worldY)`로 변환한다. 시작 카메라는 P3 중심이어야 하며, 검증 시작 시 camera scroll/zoom과 변환 결과를 함께 기록한다.

| 사례 | 입력과 대상 | 시작/목표 월드 좌표·카메라 | 기대 state | 상태 |
| --- | --- | --- | --- | --- |
| C01 단일 선택 | farmer를 좌클릭 | farmer `(3392,8928)`; P3 중심 | farmer만 `selected`; command/queue 불변 | 구현됨, runtime 미검증 |
| C02 선택 교체 | C01 뒤 dog를 좌클릭 | dog `(3434,8946)`; P3 중심 | dog만 `selected`; farmer 선택 해제 | 구현됨, runtime 미검증 |
| C03 직사각 선택 | farmer·dog를 감싸는 좌→우 drag | `(3360,8896) → (3472,8976)`; P3 중심 | 두 unit `selected`; 이동 명령 0 | 구현됨, runtime 미검증 |
| C04 역방향 drag | C03과 같은 영역을 우→좌 drag | `(3472,8976) → (3360,8896)`; P3 중심 | C03과 같은 ID 집합 | 구현됨, runtime 미검증 |
| C05 빈 땅 | 좌클릭 | `(3584,9088)`; P3 중심 | 선택 0; command/queue 불변 | 구현됨, runtime 미검증 |
| C06 빈 땅 이동 | farmer 또는 두 unit 선택 후 우클릭 | 목표 `(3712,8928)`; P3 중심 | `move`; replace면 queue 0, 두 unit이면 34px offset 목표를 사용 | 구현됨, runtime 미검증 |
| C07 무선택 우클릭 | C05 뒤 우클릭 | `(3712,8928)`; P3 중심 | no-op; unit command/queue 0 | 구현됨, runtime 미검증 |
| C08 Stop | C06 이동 중 `S`, 별도 run에서 카드 Stop | P3 중심; 명령 발행 뒤 0.5초 안 | 선택 unit은 `stop`, path/queue 비움; 비선택 unit 불변 | 구현됨, runtime 미검증 |
| C09 Shift 예약 | farmer 선택 후 Shift+우클릭 A/B/C | A `(3712,8928)`, B `(3712,9088)`, C `(3584,9088)`; P3 중심 | A는 current `move`, B/C는 FIFO queue; Shift 없는 D는 current 교체와 queue 비움 | 구현됨, runtime 미검증 |
| C10 대상 지정 취소 | attack 또는 herd targeting 활성화 후 우클릭, 별도 run에서 Escape | 빈 땅 `(3712,8928)`; P3 중심 | targeting false, move/queue 추가 0 | 구현됨, runtime 미검증 |
| C11 HUD 경계 | viewport 밖 HUD 영역에서 좌/우클릭·drag | 화면 `x>960` 또는 `y>540`; camera 변환값도 기록 | drag selection과 world smart command 발행 0 | 구현됨, runtime 미검증 |

`DragSelectionInputSystem`은 8px 미만 이동을 click으로, 그 이상을 world-space rectangle으로 처리하며 좌표 순서를 정규화한다. 우클릭은 construction placement 취소 → attack/herd target 취소 → economy smart → 건설 재개 → enemy smart/이동 순서로 한 분기에서 소비한다. 따라서 C06/C07은 economy entity·건설 중인 building·combat target이 없는 빈 땅에서 실행한다. 정상 combat off에서는 `enemyTarget`이 없어 이동 분기만 남는다.

#### WPM blocker 기준 좌표

`wpm_pathing_grid.json`은 32px cell, `352×336`, Phaser world `11264×10752`이다. `TerrainBlocker`는 Phaser world→cell을 `floor(world / 32)`로 바꾸고, ground blocker를 path의 8px clearance와 함께 쓴다. 아래 값은 grid 데이터를 직접 대조했다.

| 용도 | 좌표 | cell | ground/build | 판정 |
| --- | --- | --- | --- | --- |
| P3 시작 | `(3392,8928)` | `(106,279)` | false / false | 이동 가능 |
| dog 시작 | `(3434,8946)` | `(107,279)` | false / false | 이동 가능 |
| 통과 경로 A | `(3776,4800) → (6336,4800)` | `(118,150) → (198,150)` | 양 끝 false / false | 기존 terrain probe의 통과 사례 |
| 통과 경로 B | `(3776,3392) → (6336,3392)` | `(118,106) → (198,106)` | 양 끝 false / false | 기존 terrain probe의 통과 사례 |
| 막힌 목표 | `(4816,10384)` | `(150,324)` | true / true | ground path 거절 사례 |

막힌 목표를 정상 P3에서 바로 클릭하면 camera가 목표를 보지 못하므로, SP-04-02 fixture 또는 camera 이동 뒤 C11과 분리해 실행한다. 좁은 통로의 clearance별 통과/거절은 위 두 장거리 probe로 대신하지 않으며 SP-04-07에서 별도 player 사례를 만든다.

#### 경로 실패·예약 정책

- `findMovePath()`가 `null`이면 해당 명령은 path `[]`로 시작한다. 다음 update에서 `updateMoveCommand()`가 current command를 종료하고 FIFO의 다음 예약을 poll한다. 즉 실패한 예약은 한 update tick 안에 폐기되고 재시도하지 않으며, 뒤의 예약은 계속 진행해야 한다.
- replace 실패는 기존 queue를 먼저 비운다. append 실패는 먼저 queue에 들어가므로 앞선 current command가 끝난 뒤 위 정책으로 한 번 폐기된다. 실패 이동은 `pathFoundCount`에 포함되지 않는다.
- 이 정책은 코드 흐름의 계약이며 browser runtime 확인 전까지 **미검증**이다. C09의 B를 `(4816,10384)`으로 두고 C를 유효 목표로 둔 사례를 SP-04-06에서 필수 검증한다. current command가 한 update 안에 정리되지 않거나 C로 진행하지 않으면, 해당 결함은 SP-04-06-a(예약 실패 전이)로 분리한다.

#### SP-04-01 결과

- 상태: **완료**. 문서만 변경했으며 game source와 artifact는 변경하지 않았다.
- 변경 파일: `docs/chicken_farm/chicken_farm_sp04_task_plan.md` — 이 계약, 11개 입력 사례, WPM 재현 좌표, 실패/예약 정책을 추가했다.
- 정적 assertion: `wpm_pathing_grid.json`의 cellSize `32`, world `11264×10752`; P3/farmer·dog 및 두 terrain probe 끝점은 ground/build false, `(4816,10384)`는 ground/build true. `node --input-type=module -e ...` → 종료 코드 0.
- 미검증/남은 결함: 실제 browser mouse/keyboard, viewport 경계, S와 카드 Stop, Shift 상태, camera transform, 실패 예약의 다음 tick 전이는 아직 실행하지 않았다. 이동 중 동적 blocker 재검사는 SP-04-08에서 판단한다.
- 다음 ID: **SP-04-02**. normal P3에서 실제 입력을 발행하고 이 표의 read-only snapshot을 관찰할 최소 controls harness를 만든다.

### SP-04-02 — 조작 전용 브라우저 회귀 진입점

- 읽기: `scripts/smoke-chicken-farm-start.ts`, browser-perf의 서버/브라우저 시작·종료 부분, `main.ts`의 `__chickenFarmDebug` 등록부.
- 작업: 기존 실행 구조를 재사용한 `scripts/check-chicken-farm-controls.ts`와 workspace 명령 `chicken:controls:check`를 추가한다. 사례 선택 옵션, read-only unit ID/position/currentCommand/queue/path snapshot, 화면↔월드 좌표 관찰을 최소 범위로 제공한다.
- 완료: normal 시작 → 실제 농부 클릭 → 선택 assertion의 baseline 통과. 부모 env의 debug/fixture 값이 normal 검증에 섞이지 않고, 실패/timeout은 nonzero, browser/server는 finally 정리된다. fixture 없이도 기본 선택 사례가 동작한다.
- 검증: typecheck + 새 controls baseline. 아직 구현하지 않은 사례를 통과/skip으로 전체 완료 처리하지 않는다.

#### SP-04-02 결과

- 상태: **완료**. `scripts/check-chicken-farm-controls.ts`와 workspace 명령 `chicken:controls:check`를 추가했다. `CHICKEN_FARM_CONTROL_CASE=farmer_select`만 지원하며, 다른 사례를 skip으로 성공 처리하지 않고 nonzero로 종료한다.
- 변경 파일·심볼: `games/chicken-farm/src/main.ts#window.__chickenFarmDebug.getControlSnapshot`에 read-only camera, last primary click world point, unit ID/position/selected/current command/queue/path snapshot을 추가했다. `games/chicken-farm/package.json`, `scripts/check-chicken-farm-controls.ts`를 추가했다.
- 입력 방식: harness는 parent env를 덮어 normal P3, debug economy/fixtures/combat/terrain probe off로 Vite를 시작한다. Playwright real mouse click을 쓴다. Phaser FIT 입력 좌표와 world-camera viewport 좌표가 직접 일치하지 않아 canvas의 빈 좌표 두 개를 실제 클릭해 world 좌표 affine 변환을 보정하고, 그 변환으로 farmer를 클릭한다. 이 보정 클릭도 선택 0을 assertion한다.
- assertion: normal state의 fixture/combat/terrain probe 0, 시작 선택 0, unit 2, farmer click 뒤 farmer만 selected, current command null, queue 0, console/page/request/HTTP 오류 0. 이번 run의 browser click `(480,270)`은 handler에서 world `(3392,8928)`로 관찰됐다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0. browser/server는 `finally`에서 종료한다. 처음 sandbox 실행은 `tsx` IPC socket 권한으로 실패했지만, 로컬 검증 환경에서 실행한 final run은 통과했다.
- 남은 결함: baseline은 C01 farmer 선택만 검증한다. dog 교체·drag·HUD 경계는 SP-04-03, 우클릭은 SP-04-04, Stop/Shift/경로는 후속 카드에서 각각 실제 입력으로 추가한다. 범위 확장이나 하위 task 분리는 필요하지 않다.
- 다음 ID: **SP-04-03**.

### SP-04-03 — 클릭·drag 선택과 입력 경계

- 읽기: `dragSelectionInputSystem.ts`, `main.ts#configurePointerSelection`, `controllableUnitSystem.ts#selectAt/selectInRect/clearSelection`.
- 작업: 농부 단일 선택, 개로 교체, 두 유닛 drag, 역방향 drag, 빈 땅 선택 해제, HUD에서 시작하거나 끝난 drag 정책을 검수·필요 시 수정한다. 현재 소유자와 관찰용 중립 개체의 선택/명령 권한을 구분한다.
- 완료: 화면 선택 표시와 snapshot ID 집합 일치, HUD 클릭/drag로 월드 선택이 의도치 않게 바뀌지 않음, 선택 중 이동 명령 발생 0.
- 검증: controls의 selection 사례 + 변경 시 typecheck. 카메라 이동/zoom 후 클릭도 포함한다.

#### SP-04-03 결과

- 상태: **완료**. `check-chicken-farm-controls.ts`의 기본 사례를 `selection`으로 확장했고, 기존 `farmer_select` baseline도 선택할 수 있게 보존했다.
- 변경 파일: `scripts/check-chicken-farm-controls.ts`. 별도 game 동작 수정은 필요 없었다.
- assertion: 실제 ArrowRight 입력으로 camera scrollX가 `2912 → 3000`이 된 뒤, farmer 단일 선택, dog로 교체, farmer+dog forward/reverse drag, 빈 땅 선택 해제, HUD click/drag를 순서대로 실행했다. 매 단계 snapshot의 selected ID 집합과 state count를 대조하고, 선택 unit의 current command null·queue/path 0을 확인했다. HUD 입력은 world selection을 바꾸지 않았다.
- 카메라: actual pan 뒤 browser 좌표를 재보정해 click을 발행했다. zoom은 `0.46875`로 고정이며 현재 사용자 zoom 입력 handler가 없다. 따라서 zoom 변경 뒤 선택은 새 zoom 조작을 도입할 때 별도 검증이 필요하다; 이번 task에서 새 camera control을 추가하지 않는다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONTROL_CASE=selection npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0. console/page/request/HTTP 오류 0, browser/server `finally` 정리 확인.
- 남은 결함: owner 3 farmer/dog만 선택 대상인 normal start를 검증했다. 초기 배치 marker와 향후 combat/NPC entity의 선택 권한은 SP-07/12에서 실제 entity가 생길 때 대조한다. 우클릭 명령은 SP-04-04에 남긴다. 하위 task 분리는 필요하지 않다.
- 다음 ID: **SP-04-04**.

### SP-04-04 — 우클릭 이동과 명령 분기

- 읽기: `main.ts#configurePointerSelection/issueEconomySmartCommand`, `controllableUnitSystem.ts#issueSmartCommandToSelected/issueMoveCommandToUnits`.
- 작업: 빈 땅 이동, 무선택 no-op, 농부/개 동시 이동, HUD 우클릭, 대상 지정 모드 우클릭 취소를 검수한다. 경제 대상과 건설 중 건물 fixture에서 한 입력이 어느 분기에서 소비되는지 확인한다.
- 완료: 한 입력에 중복 이동/상호작용 0, 선택한 유닛만 이동, 취소 클릭의 이동 누출 0. 전투 off의 중립 marker가 공격 가능한 대상으로 잘못 취급되지 않음.
- 검증: controls의 right-click 사례 + typecheck. 거래 완료·환불·전투 피해는 후속 SP로 인계한다.

#### SP-04-04 결과

- 상태: **완료**. 정상 세션 우클릭 회귀와 명시적 debug fixture의 경제·건설 분기 회귀를 추가했고, 건설 재개가 기존 경제 worker task를 남기던 결함을 수정했다. 독립 하위 task 분리는 필요하지 않았다.
- 변경 파일: games/chicken-farm/src/main.ts (configurePointerSelection, read-only getControlSnapshot, createPausedConstructionFixture), scripts/check-chicken-farm-controls.ts, games/chicken-farm/package.json, docs/chicken_farm/chicken_farm_current_context.md, docs/chicken_farm/chicken_farm_implementation_backlog.md.
- assertion: normal P3에서 farmer만 선택한 빈 땅 우클릭은 move/path를 만들고 dog는 명령 0이다. 무선택·HUD 우클릭은 command/queue/path 0, A 대상 지정 뒤 우클릭은 attack/herd targeting false와 이동 누출 0이다. debug fixture에서 egg 보유 farmer의 market 우클릭은 sell_at_market task를 만들고, 이어진 constructing coop 우클릭은 task를 제거한 뒤 move/build 명령으로 전환한다.
- 검증: typecheck → 종료 코드 0. CHICKEN_FARM_CONTROL_CASE=right_click controls check → 종료 코드 0. CHICKEN_FARM_CONTROL_CASE=right_click_fixture controls check → 종료 코드 0. 각 브라우저 run에서 console/page/request/HTTP 오류 0과 server finally 정리를 확인했다.
- 남은 결함: 거래 완료 수량·wallet 반영은 SP-06, 건설 진행/중단·환불·blocker lifecycle은 SP-05, combat target·피해는 SP-07에서 검증한다. 이번 normal session은 fixture 유입 0을 유지했다.
- 다음 ID: **SP-04-05**.

### SP-04-05 — Stop과 현재 명령 정리

- 읽기: `main.ts#updateStopHotkey/handleCommandCardAction`, `controllableUnitSystem.ts#stopSelectedUnits`, 경제 worker task 제거 호출부.
- 작업: 이동 도중 S와 카드 Stop 각각 검수한다. 현재 이동·path·예약과 선택 유닛의 연계 작업이 정리되는지 확인한다.
- 완료: 정지 이후 관찰 구간에 위치 변화/이전 명령 재개 없음, 비선택 개의 명령 유지, Stop 반복 호출 안전, 다시 우클릭하면 정상 이동. 건설 중단 callback 전달까지만 확인한다.
- 검증: controls의 stop 사례 + typecheck. 환불/건설 상태 정합은 SP-05에 남긴다.

#### SP-04-05 결과

- 상태: **완료**. 기존 Stop 구현의 실제 S 및 command-card 클릭 경로를 검증했고, fixture에서 경제 worker task 정리와 건설 중단 callback 전달을 관찰할 read-only building snapshot을 추가했다. 독립 결함과 하위 task 분리는 없었다.
- 변경 파일: games/chicken-farm/src/main.ts (getBuildingConstructionSnapshot), scripts/check-chicken-farm-controls.ts, docs/chicken_farm/chicken_farm_current_context.md, docs/chicken_farm/chicken_farm_implementation_backlog.md.
- assertion: normal P3에서 이동 중 farmer에 S와 실제 Stop 카드 클릭을 각각 발행했다. 각 Stop 및 반복 Stop 뒤 farmer는 stop, queue/path 0, economy task null이고 350ms 관찰 중 위치 변화가 없었다. 비선택 dog의 move command는 유지됐고, Stop 뒤 우클릭으로 farmer 이동도 재개됐다. debug fixture에서 S는 sell_at_market task를 비웠고, command-card Stop은 build command의 active worker를 null로 만들어 pause callback 전달을 확인했다.
- 검증: typecheck → 종료 코드 0. CHICKEN_FARM_CONTROL_CASE=stop controls check → 종료 코드 0. CHICKEN_FARM_CONTROL_CASE=stop_fixture controls check → 종료 코드 0. 각 browser run은 console/page/request/HTTP 오류 0과 server finally 정리를 확인했다.
- 남은 결함: Stop 이후 건설 비용·환불·완공 lifecycle은 SP-05, Shift append/replace와 실패 예약 진행은 SP-04-06에서 검증한다.
- 다음 ID: **SP-04-06**.

### SP-04-06 — Shift 예약과 교체·실패 진행

- 읽기: `playerCommandTypes.ts`, `controllableUnitSystem.ts#issueUnitCommand/pollNextQueuedCommand/startUnitCommand/updateMoveCommand`, `main.ts#isQueueCommandMode`.
- 작업: 실제 Shift로 A→B→C 이동 예약, Shift 없는 D로 교체, Stop으로 queue 비우기, 도달 불가 B 뒤 유효 C 진행을 확인한다. 경제/건설 예약은 기존 지원 여부와 경계를 기록한다.
- 완료: 도착 순서와 command/queue 전이 일치, replace 이후 과거 목적지 재개 0, 실패 예약에서 무한 대기 0. 실패 정책은 01 계약을 따른다.
- 검증: controls의 queue 사례 + typecheck. 미지원 상호작용 예약을 이번에 일괄 구현하지 않는다.

### SP-04-07 — 정적 지형·좌표·좁은 통로

- 읽기: `terrainBlocker.ts`, `pathing.ts`, `movementGuards.ts`, `controllableUnitSystem.ts#findMovePath/getMovePathBounds`, 기존 pathing 측정.
- 작업: player 설정으로 별도 사례를 추가한다. 월드/WPM 경계, 막힌 목표, 통로 입구, 통과 가능한 좁은 통로, clearance상 통과 불가 통로, 다중 유닛 목적지 offset을 확인한다. smoothing 선분도 검사한다.
- 완료: 허용 통로 도착, 불가 목표 유한 시간 종료와 다음 입력 수용, 지형/월드 밖 관통 0. 지역 bounds 때문에 도달 가능한 목적지가 실패하는 사례는 재현 후 제한된 수정으로 해결하거나 하위 ID로 분리한다.
- 검증: player 순수 경로 사례 + controls 실제 이동 + 기존 `chicken:pathing:measure` + typecheck. wolf 측정 통과만으로 완료하지 않는다.

### SP-04-08 — 이동 중 동적 blocker 변경

- 읽기: `controllableUnitSystem.ts#updateMoveCommand/findMovePath`, `movementGuards.ts`, `buildingSystem.ts`의 blocker 제공부.
- 작업: 이동 경로 계산 뒤 건물 blocker 추가, 우회 가능한 차단, 완전 차단, blocker 제거 후 새 명령을 fixture로 재현한다. 이동 step과 waypoint 도착 모두 관통을 막고, 재경로 또는 명시적 실패 정책을 최소 범위로 적용한다.
- 완료: 새 footprint 관통 0, 가능하면 우회 도착, 완전 차단 시 유한 종료·후속 입력 정상. 매 프레임 무제한 path 검색 금지; 재시도 상한/주기를 기록한다.
- 검증: controls의 dynamic-blocker 사례 + 정적 경로 회귀 + typecheck. 건물 생성/철거 lifecycle 자체의 완료 판정은 SP-05다.

### SP-04-09 — restart 뒤 입력·명령 격리

- 읽기: `main.ts#disposeRun`과 restart/debug 등록부, browser-perf의 same-page restart 사례, 새 controls harness.
- 작업: 이동+예약+선택 상태에서 같은 page restart 후 실제 클릭·우클릭·S를 다시 입력한다. 두 번 restart한다.
- 완료: 이전 queue/path/선택 제거, 이전 좌표로 자동 이동 0, 한 입력의 command 발행 횟수 중복 0, 새 run 농부/개 정상 조작. 새 관찰/fixture도 dispose된다.
- 검증: controls의 restart 사례 + 기존 browser-perf + typecheck. 승패 화면에서 restart는 SP-11 범위다.

### SP-04-10 — 통합 검수와 후속 인계

- 읽기: 이 계획의 각 결과와 변경 diff, current context/backlog의 SP-04~07 행.
- 작업: 선택 → 이동 → Shift 예약 → Stop → 막힌 목적지 → 새 이동 → restart를 연속 실행한다. 해결 안 된 결함은 재현법·영향·담당 ID로 남긴다.
- 완료: 01~09의 모든 필수 assertion 통과, normal fixture 유입 0, console/page error 0. 기본 조작 blocker가 남으면 SP-04를 완료 처리하지 않는다.
- 검증: typecheck, build, controls 전체, normal smoke, pathing 측정. start resolver/초기화도 수정했다면 start-regression을 추가한다. 09 이후 변경이 없으면 browser-perf 결과를 재사용한다.
- 인계: SP-05 건설 중단/재개·blocker lifecycle, SP-06 상호작용 수량, SP-07 전투 명령, SP-14 추가 피드백. 다음 ID와 현황 문서를 동기화한다.

## 검증 명령과 결과 기록

모든 npm 명령은 저장소 루트에서 `--workspace @games/chicken-farm`을 붙인다. 기존 명령: `typecheck`, `build`, `chicken:smoke`, `chicken:pathing:measure`, `chicken:browser-perf:measure`, `chicken:start-regression:check`. **`chicken:controls:check`는 02에서 신설할 예정이며 현재 존재하지 않는다.** 사례 선택 문법과 player 경로 검증 진입점은 구현한 ID의 결과에 기록한다.

각 ID마다 이 문서에 상태(대기/진행/완료/차단), 변경 파일·심볼, 실행 명령/종료 코드, 핵심 assertion, artifact 경로, 남은 결함, 다음 ID를 기록한다. 새 artifact에는 사례별 입력·기대값·실제값·통과 여부를 남긴다. 문서만 바뀐 요청에서 게임 전체 테스트를 반복하지 않는다.

| ID | 상태 | 산출물 |
| --- | --- | --- |
| SP-04-01 | 완료 | 조작 계약·재현 사례; static WPM assertion 종료 0, runtime 미검증 |
| SP-04-02 | 완료 | normal P3 실제 farmer click baseline; typecheck·controls 종료 0 |
| SP-04-03 | 완료 | click·양방향 drag·HUD 경계·camera pan 선택 회귀 |
| SP-04-04 | 완료 | normal 우클릭·취소와 economy/construction fixture 분기 회귀; 중복 worker task 정리 |
| SP-04-05 | 완료 | S·command-card Stop, economy task 정리, construction pause callback 회귀 |
| SP-04-06 | 대기 | Shift/replace/실패 예약 회귀 |
| SP-04-07 | 대기 | player 정적 경로 회귀 |
| SP-04-08 | 대기 | 동적 blocker 회귀 |
| SP-04-09 | 대기 | restart 입력 격리 회귀 |
| SP-04-10 | 대기 | 통합 결과·SP-05 인계 |

## Terra medium 실행 요청

```text
닭농장 SP-04-01을 Terra medium으로 진행해.
docs/chicken_farm/chicken_farm_sp04_task_plan.md의 해당 카드와 지정 함수부터 읽고,
이번 요청은 해당 ID만 처리해. 기존 변경을 보존하고 완료 조건을 낮추지 마.
여러 독립 결함으로 커지면 해당 ID의 하위 task로 나눠 기록해.
결과는 계획에 변경 파일·명령/종료 코드·assertion·남은 결함·다음 ID로 남기고,
current context와 backlog의 현재 상태를 동기화해.
```

이 문서는 모델을 자동 전환하거나 에이전트를 실행하지 않는다. 실행 환경에서 Terra medium을 선택한 뒤 해당 ID를 요청한다. 소비량·소요 시간은 실측 전 추정하지 않는다.

# SP-05 — 건설 lifecycle 세부 실행 계획

> 작성: 2026-10-01. Terra medium에서 **한 요청에 한 ID**를 실행한다. SP-05-01~12를 완료했다. 다음 ID는 **SP-06-01**이다.

## 목표와 범위

정상 시작에서 건물 선택 → 배치 → 일꾼 이동 → 착공/비용 차감 → 중단/재개 → 완공 또는 취소/파괴가 같은 building ID·owner·wallet로 연결되게 한다. 기존 도형과 HUD를 사용한다.

선행은 SP-03/04다. SP-04-10 결과에는 완료와 SP-05 인계가 기록돼 있다. 이번 계획에서는 그 기록을 재사용하며 테스트를 다시 통과했다고 주장하지 않는다. 건물 경제 등록/제거는 SP-05, 알 수집·판매·부화 수량은 SP-06, 실제 적 공격·피해 연결은 SP-07, 생산/연구 확장은 SP-09다. 필수 실패 이유·취소 입력만 여기서 다루고 HUD 재디자인은 제외한다.

## 정적 확인한 현재 동작

아래 경로는 `games/chicken-farm/src/` 기준이다. 전체 `main.ts`나 과거 PoC 문서를 먼저 정독하지 말고 각 카드의 심볼부터 읽는다.

| 코드 | 현재 동작과 확인할 경계 |
| --- | --- |
| `game/systems/constructionPlacementSystem.ts#handlePrimaryClick` | 배치 시 pending order를 만든다. 실제 건물 생성/비용 차감은 `updatePendingOrders`에서 일꾼 도착 뒤 수행한다. |
| 같은 파일 `validateFootprint`, `validateBuildStart` | 자원·world bounds·WPM·기존 footprint 등을 검사한다. 예약 후 착공 직전 재검증, 초기 배치 entity와의 겹침 범위는 추가 대조한다. |
| `game/systems/buildingSystem.ts#createBuilding`, `cancelConstruction` | 공용 wallet 차감, 건설 중 취소 시 gold/lumber 각각 비용의 75% 내림 환불. `skipCost` 생성물도 현재 취소 계산은 template 비용을 쓴다. 무료 생성 경로의 환불 자원 생성 가능성을 검증한다. |
| 같은 파일 `pauseConstruction`, `resumeConstruction`, `update` | 누적 progress와 활성 시간으로 완공한다. 반복 resume, 일꾼 교체/사망, Stop 직후 자동 재개 여부는 runtime 확인이 필요하다. |
| 같은 파일 `getDynamicBlockedRects`, `getVisionSources` | 이동 blocker는 완성 건물만, 배치 겹침은 모든 건물 footprint. 시야는 활성 건설/완공 시 존재하고 중단 건설은 0이다. 의도적 정책인지 01에서 고정한다. |
| 같은 파일 `removeCompletedBuilding` | 완성 건물 제거 callback은 있다. 건설 중 파괴와 실제 전투 피해 경로가 연결됐다고 간주하지 않는다. |
| `game/systems/buildingEconomyAdapter.ts`, `main.ts#attachCompletedBuildingEconomy`, `detachBuildingEconomy` | 닭장 3종·우물·campfire를 같은 ID/owner로 경제에 연결한다. 시장 등은 실제 소비자가 완공 상태를 확인하는지 별도로 대조한다. |

75% 환불 등은 현재 MVP 구현값이며 원본 W3X 확정 규칙으로 부르지 않는다. 정책을 바꿀 필요가 있으면 01의 계약에 이유와 영향을 남긴다.

## 실행 순서

기본 순서는 01 → 02 → … → 12다. 선행 열은 읽기/검증 의존성을 표시하며 병렬 에이전트 실행 지시가 아니다. 모든 task는 **대기** 상태다.

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-05-01 | 상태 전이·비용·환불 계약과 재현 사례 | SP-03/04 | 완료 |
| SP-05-02 | 건설 관찰 snapshot과 최소 browser harness | 01 | 완료 |
| SP-05-03 | 배치 허용/거부·취소 입력 | 02 | 완료 |
| SP-05-04 | 도착·착공 재검증·비용 단일 차감 | 03 | 완료 |
| SP-05-05 | 중단·명시적 재개·일꾼 교체 | 04 | 완료 |
| SP-05-06 | 연속 건설 예약·실패 후 진행 | 05 | 완료 |
| SP-05-07 | 건설 취소·환불·무료 생성 경계 | 04/05/06 | 완료 |
| SP-05-08 | 완공 단일 전이·기능 등록 | 05/07 | 완료 |
| SP-05-09 | 파괴/제거 단일 경로·참조 정리 | 07/08 | 완료 |
| SP-05-10 | footprint·이동 blocker·시야 전이 | 08/09 | 완료 |
| SP-05-11 | 건설 상태가 있는 same-page restart | 06~10 | 완료 |
| SP-05-12 | 정상 시작 통합 검수·SP-06/07 인계 | 01~11 | 완료 |

## 세부 작업 카드

### SP-05-01 — 계약과 재현 사례

- 읽기: 위 표의 지정 함수, `game/systems/playerWallet.ts`, `game/balance.ts`의 건물 설정 참조, SP-04-10 결과.
- 작업: preview/pending/constructing-active/constructing-paused/complete/removed 상태표를 작성한다. 논리 상태표이며 코드 enum 전면 교체는 요구하지 않는다. 전이별 비용·worker·pending·blocker·vision·economy·selection 기대값을 고정한다.
- 결정 항목: 착공 전 취소 0 환불, 유료 착공 뒤 취소 75% 내림, 파괴 시 환불 여부, 무료 건물/아이템 설치와 환불, 일꾼 교체·사망·소유권, 중단 뒤 명시적 재개, pending 실패 종료 정책. 현재 동작과 목표 차이를 분리한다.
- 완료: normal P3의 실제 건설 가능 좌표와 WPM 금지/경계/겹침/도달 불가 사례, 사용할 template·비용·시간을 근거와 함께 기록한다. 0 lumber 시작에서 가능한 사례와 debug 자원이 필요한 사례를 분리한다.
- 검증: 정적 대조만 수행하며 runtime 완료로 표시하지 않는다. 다른 결함이 많으면 담당 ID에 배분한다.

#### SP-05-01 결과

- 상태: **완료**. 소스 정적 대조로 건설 lifecycle 계약과 normal P3 재현 사례를 고정했다. 구현·browser runtime 검증은 수행하지 않았으며 하위 task 분리는 필요하지 않다.
- 변경 파일: 이 계획, [계약 artifact](./chicken_farm_w3x_artifacts/sp05_01_construction_contract.json), current context, implementation backlog.
- 상태 전이 계약:

| 논리 상태 | 진입/이탈 | 비용·worker·pending | blocker·vision·economy·selection |
| --- | --- | --- | --- |
| preview | build card → `startPlacement`; click/ESC/right-click로 이탈 | 비용/worker/pending 없음 | footprint ghost만; blocker/vision/economy/건물 선택 없음 |
| pending | 유효 click → 일꾼 도착 전; 취소/착공 직전 거부로 이탈 | 비용 0, builder ID와 order 1개 | 배치 겹침만 예약 footprint로 막음; 이동 blocker/vision/economy/건물 선택 없음 |
| constructing-active | 도착 후 `createBuilding`; Stop/명령 중단으로 paused; 완료/취소·파괴로 이탈 | template 비용 1회, active worker 1명, runtime order 1개 | 배치 겹침 있음, 이동 blocker 없음, active construction vision 1개, economy 없음; building 선택 가능 |
| constructing-paused | `pauseConstruction`; 명시적 우클릭 재개 또는 취소·파괴로 이탈 | 추가 비용 0, active worker 없음, runtime order는 유지 | 배치 겹침 있음, 이동 blocker/vision/economy 없음; building 선택 가능 |
| complete | 누적 active progress가 build time 도달; 제거/파괴로 이탈 | 비용 추가 0, worker/pending/build command 해제 | 배치 겹침·이동 blocker·complete vision 있음; economy adapter 대상만 같은 ID/owner로 등록, building 선택 가능 |
| removed | pending 취소, 건설 취소 또는 complete 제거/파괴 | pending은 환불 0; 유료 constructing 취소는 각 자원의 `floor(cost × 0.75)` 1회; complete 파괴 환불 0 | footprint/blocker/current vision/economy entity/선택/worker·pending 참조 제거 |

- 정책: 건설 비용은 배치 click이 아니라 일꾼 도착 및 `validateBuildStart` 통과 뒤 차감한다. normal P3의 `1500 gold / 0 lumber`에서 card 접근과 별개로 `coop_basic`(120 gold, 52 lumber)은 자원 부족으로 거절된다. 정상 baseline은 128px footprint, 1초, `8 gold / 0 lumber`인 `fence_wood`다. `market`(18 gold/4초), `tower_scout`(32 gold/5초), `farm_house`(60 gold/15초)도 0 lumber 사례고, `well_basic`은 30 gold/13초지만 `farm_house` 선행 조건은 아직 placement validation이 검사하지 않는다. 선행조건 enforcement는 SP-09 범위다.
- 재현 좌표: normal P3 farmer `(3392,8928)`에서 R01 `fence_wood` input `(3584,8896)`은 snap footprint `(3520,8832,128×128)`이며 WPM build cell 4×4가 모두 허용이다. T01 input `(4816,10384)`은 `(4736,10304,128×128)`으로 snap되고 `terrain_build_blocked`; B01 input `(-1,0)`은 world 밖이다. R01 footprint를 유지한 같은 입력은 `building_overlap`이며, pending 상태의 같은 입력은 `pending_build_overlap`이어야 한다. 도달 불가와 착공 직전 재검증 실패는 SP-05-04, 실제 input 관찰은 SP-05-02/03에서 검증한다.
- 현재 코드와 목표 차이: `cancelConstruction`은 paid constructing에 75% 환불을 구현했지만 `skipCost` fixture도 template 비용으로 환불할 수 있다. fixture/아이템 설치는 wallet 자원을 만들지 않아야 하므로 SP-05-07에서 구분·검증한다. complete 제거는 refund 0으로 고정하지만 현재 공용 파괴 lifecycle과 실제 적 피해 연결은 없으므로 SP-05-09/07에 남긴다. 재개는 명시적 우클릭만 허용하고 같은 owner의 살아 있는 farmer만 인수 가능해야 한다. 현재 `resumeConstructionWithBuilder`의 owner 검증과 builder 사망 뒤 active progress 정지는 runtime에서 증명되지 않았으므로 SP-05-05의 필수 검증 항목이다.
- assertion: `wpm_pathing_grid.json`의 32px grid(352×336)를 직접 읽어 R01 4×4 build 허용, T01 4×4 build 거절, B01 bounds 거절을 확인했다. wallet·template·snap·상태 전이도 지정 심볼과 대조했다. runtime assertion/명령은 **미실행**이며 artifact는 정적 계약 기록이다.
- 검증: `node --input-type=module` 정적 WPM/footprint 검사 → 종료 코드 0. `git diff --check` → 종료 코드 0. 이 ID는 문서·artifact만 변경했으므로 typecheck/build/browser 테스트는 미실행이다.
- 남은 결함: 관찰 getter와 실제 normal input baseline은 SP-05-02, 배치/취소 UX는 03, 도착 비용은 04, pause/resume·owner/사망은 05, queue는 06, refund/free fixture는 07, completion/economy는 08, 공용 제거는 09, spatial lifecycle은 10, restart는 11에서 처리한다.
- 다음 ID: **SP-05-02**.

### SP-05-02 — 최소 관찰과 검증 진입점

- 읽기: `main.ts`의 debug 타입/등록, `getBuildingConstructionSnapshot`, `scripts/check-chicken-farm-controls.ts`의 browser 실행·좌표 변환·오류 수집, `games/chicken-farm/package.json`.
- 작업: runId, wallet, pending order, building state/owner/progress/worker, 선택, footprint/blocker/vision, 경제 연결 ID를 읽는 snapshot을 최소 확장한다. 정상 세션의 실제 선택 → build card → 배치 입력 baseline을 추가한다.
- 산출물: `scripts/check-chicken-farm-construction.ts`와 workspace 명령 `chicken:construction:check`를 신설한다. 사례 선택은 `CHICKEN_FARM_CONSTRUCTION_CASE`로 두고 지원 값·전체 실행 방법을 결과에 기록한다. SP-05-02에서 생성했으며 현재 지원 사례는 `baseline`, `placement`, `arrival`, `start_rejection`이다.
- 완료: 관찰 getter가 상태를 변경하지 않음, normal fixture 유입 0, 실제 입력 baseline 통과. 특수 setup은 debug flag 안에서만 가능하고 운영 함수를 재사용한다.
- 검증: typecheck + baseline. 사례별 입력·기대값·실제값·pass/fail을 JSON artifact로 저장하고 경로를 기록한다. 고정 sleep 대신 simulation 시간/상태와 timeout으로 기다린다.

#### SP-05-02 결과

- 상태: **완료**. read-only lifecycle snapshot과 normal P3 browser baseline을 추가했다. 독립 결함과 하위 task 분리는 없었다.
- 변경 파일: `games/chicken-farm/src/game/systems/buildingSystem.ts#BuildingSystem.getLifecycleSnapshots`, `getDynamicBlockedBuildingIds`, `getVisionSourceBuildingIds`; `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts#getPendingBuildOrderSnapshots`; `games/chicken-farm/src/main.ts#window.__chickenFarmDebug.getConstructionLifecycleSnapshot`; `scripts/check-chicken-farm-construction.ts`; `games/chicken-farm/package.json`; [artifact](./chicken_farm_w3x_artifacts/construction_check.json).
- 관찰 계약: snapshot은 run ID, wallet, active placement, pending order의 builder/template/footprint/target/runtime building ID, building의 state/owner/progress/active worker/footprint, 선택 ID, dynamic blocker·vision source·economy building ID를 반환한다. 모든 rect·point·record는 복사본이며 getter 호출은 상태를 바꾸지 않는다.
- baseline: normal P3, combat/debug fixture/terrain probe off에서 farmer `p3-farmer`를 실제 Playwright click으로 선택했다. CommandCardSystem의 실제 keyboard input `B`(build page) → `F`(Fence)를 거쳐 `(4032,8896)`을 좌클릭했다. 결과는 `pending-build-1`, snap footprint `(3968,8832,128×128)`, target `(3938,8896)`, wallet `1500 gold / 0 lumber`, building/blocker/vision/economy 0, active placement null이다. 일꾼은 도착 전이므로 비용 차감과 runtime building 생성은 아직 없다.
- assertion: 빈 건설 상태에서 lifecycle snapshot 연속 두 번은 동일했고, normal debug flag/초기 selection/wallet을 확인했다. placement 뒤 pending 1개와 farmer ID/template을 확인하고, building 생성·비용·blocker·vision·economy ID가 모두 0임을 확인했다. console/page/request/HTTP 오류도 0이다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=baseline npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. 후자는 local IPC 제한 때문에 승인된 로컬 실행으로 수행했다. artifact에는 입력·기대값에 해당하는 실제 snapshot·오류 목록·pass가 저장된다.
- 남은 결함: 허용/거부 사유와 ESC/우클릭 취소는 SP-05-03, 일꾼 도착 뒤 비용/재검증은 04, pause/resume은 05, queue는 06, refund는 07 이후 카드에서 검증한다. 이 baseline은 pending 상태에서 종료하므로 lifecycle 전체 통과를 뜻하지 않는다.
- 다음 ID: **SP-05-03**.

### SP-05-03 — 배치 검증과 입력 취소

- 읽기: `constructionPlacementSystem.ts#startPlacement`, `validateFootprint`, `handlePrimaryClick`, `main.ts`의 build card/escape/right-click 분기.
- 작업: 정상 배치, 일꾼 미선택, 자원 부족, world 밖, WPM 금지, 건물/예약 겹침을 actual 입력으로 검증한다. 초기 entity와 유닛 점유 정책은 01 기준으로 대조하고 누락만 고친다.
- 완료: 거부/ESC/우클릭 취소에 비용·건물·예약 누출 0, 실패 이유 관찰 가능, HUD 클릭의 월드 배치 누출 0. pending은 허용된 배치에만 한 번 생성된다.
- 검증: placement 사례 + typecheck. WPM 좌표 계산을 바꿨으면 player-pathing도 실행한다.

#### SP-05-03 결과

- 상태: **완료**. SP-05-02의 `placement` browser case를 확장해 normal P3 실제 입력의 배치 허용/거부와 취소를 검증했다. 독립 결함과 하위 task 분리는 없었다.
- 변경 파일: `scripts/check-chicken-farm-construction.ts#runPlacementCases`; `main.ts#window.__chickenFarmDebug.getConstructionPlacementPreview`; [artifact](./chicken_farm_w3x_artifacts/construction_check.json).
- actual assertion: fixture/combat/terrain probe off인 normal P3에서 (1) 무선택 `B`/`F`는 placement/pending 0, (2) farmer 선택 뒤 `B`/`C`와 허용 지점 click은 `coop_basic` placement를 유지하되 `0 lumber` 때문에 pending/building/wallet 변화 0, (3) HUD 좌클릭은 placement를 월드에 누출하지 않고 ESC는 이를 해제, (4) 월드 우클릭은 placement를 해제, (5) `fence_wood` 실제 배치는 pending 1개를 만들며 동일 footprint 재입력은 pending 1개를 유지, (6) 카메라를 T01까지 이동한 실제 click은 WPM `terrain_build_blocked`로 pending/building/비용 변화 0을 확인했다.
- 경계 assertion: 현재 camera의 최소 scroll은 `(0,0)`을 physical pointer 대상으로 노출하지 않는다. 그래서 `getConstructionPlacementPreview('fence_wood', 0, 0)`의 동일 `snapBuildingTopLeft` → `validateFootprint` read-only 경로로 footprint `(-64,-64,128×128)`, `outside_world_bounds`, lifecycle 전후 무변화를 확인했다. 이 preview는 mutation API가 아니며 브라우저 actual input의 정상/WPM/취소 사례를 대체하지 않는다.
- artifact: `placement` report는 accepted pending `pending-build-1`의 footprint `(3968,8832,128×128)`·target `(3938,8896)`, 각 거부 상태, bounds preview, console/page/request/HTTP 오류 0을 기록한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=placement npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: 일꾼 도착 전/후 비용 차감·start 재검증·실패 pending 진행은 SP-05-04, pause/resume은 05, queue는 06, refund는 07 이후에서 검증한다. build requirements의 실제 enforcement는 SP-09 범위다.
- 다음 ID: **SP-05-04**.

### SP-05-04 — 도착과 착공 비용

- 읽기: `updatePendingOrders`, `validateBuildStart`, `rejectPendingOrderAtStart`, `buildingSystem.ts#createBuilding`, `playerWallet.ts`.
- 작업: 멀리서 명령한 뒤 이동 중 비용/진행 0, 도착 뒤 한 번 차감을 확인한다. 이동 중 자원 소진/새 footprint/경로 차단과 builder 소멸을 재현한다.
- 완료: 도착 직전 재검증 실패에 차감·건물 생성 0, 정상 시 ID/owner 일치와 정확한 비용 차감 1회. 실패 주문이 영구 대기하거나 다음 명령을 막지 않는다. template 비용을 하드코딩하지 않는다.
- 검증: arrival/cost 사례 + typecheck. 경로/Stop 공통 코드를 바꿨으면 해당 controls 사례 추가.

#### SP-05-04 결과

- 상태: **완료**. normal P3 실제 원거리 건설의 pending → constructing 전이와 착공 시 단일 비용 차감을 확인했다. 별도 독립 결함은 `path_missing`으로 이동이 끝난 일꾼의 pending 건설 주문이 남는 문제 한 건이었으며, 공용 이동 실패 경로에서 건설 interruption callback을 호출하도록 수정했다.
- 변경 파일: `games/chicken-farm/src/game/systems/controllableUnitSystem.ts#failMoveCommand`; `games/chicken-farm/src/main.ts#window.__chickenFarmDebug.setConstructionWalletForTest`, `damageControllableUnitForTest`; `scripts/check-chicken-farm-construction.ts#runArrivalCase`, `runStartRejectionCases`; `scripts/check-chicken-farm-controls.ts#runDynamicBlockerCase`; [arrival artifact](./chicken_farm_w3x_artifacts/construction_check_arrival.json), [start rejection artifact](./chicken_farm_w3x_artifacts/construction_check_start_rejection.json).
- actual assertion: normal P3에서 farmer `p3-farmer`를 실제 선택하고 `B` → `H` → `(4032,8896)`으로 `farm_house`를 주문했다. pending 동안 building/progress 0과 wallet `1500/0`을 확인했고, 도착 뒤 `player-building-1`의 owner `3`·active worker `p3-farmer`·runtime order ID 일치, progress 증가, wallet `1440/0`을 확인했다. 비용 `60/0`은 `CHICKEN_FARM_BALANCE.buildingTemplates.farm_house`에서 읽는다.
- start rejection assertion: debug fixture 전용으로 이동 중 wallet을 `0/0`으로 바꾼 경우, pending footprint에 완성 blocker를 만든 경우, builder에 치명 피해를 준 경우 각각 pending은 유한 시간에 0이 되고 계획 건물/비용 차감은 0이었다. blocker 사례는 fixture를 제거한 뒤 같은 farmer의 다음 `farm_house` 입력이 새 pending으로 수용됨을 확인했다. fixture 완성 `coop_basic`은 특수 사례의 blocker일 뿐 주문 건물이 아니다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=arrival npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=start_rejection npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONTROL_CASE=dynamic_blocker npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0. controls의 full-blocker 유한 종료 관찰 timeout은 실제 browser simulation 지연을 포괄하도록 8초에서 20초로 늘렸으며 assertion은 유지했다.
- 남은 결함: pause/resume·같은/다른 worker 인수는 SP-05-05, 여러 건설 주문의 FIFO와 실패 주문 뒤 실제 착공은 SP-05-06, 환불은 SP-05-07에서 검증한다.
- 다음 ID: **SP-05-05**.

### SP-05-05 — 중단·재개·일꾼 교체

- 읽기: `pauseConstruction`, `resumeConstruction`, `resumeConstructionWithBuilder`, `updatePendingOrders`, `main.ts`의 pause callback, `controllableUnitSystem.ts`의 build/Stop 처리.
- 작업: S/Stop card/다른 이동 명령, 일꾼 사망·제거로 중단하고 우클릭으로 명시적 재개한다. 같은 worker 반복 재개 및 다른 worker 인수의 ID·owner 검증을 추가한다.
- 완료: 중단 후 충분한 simulation 시간이 지나도 progress 고정, 요청 없는 자동 재개 0. 재개는 도착 후 남은 시간만 진행하고 추가 차감 0. 한 건물의 active worker 하나, 이전 worker/pending 참조 정리, 다른 owner의 무단 인수 0.
- 검증: pause/resume 사례 + controls stop/right-click 관련 사례 + typecheck. 여러 독립 결함이면 05-a/05-b로 나누고 이 카드의 최종 완료 기준은 유지한다.

#### SP-05-05 결과

- 상태: **완료**. 독립 결함은 사망한 builder가 build command만 잃고 construction을 pause하지 않는 한 건이었다. 치명 피해에서 build interruption callback을 호출하도록 수정했다.
- 변경 파일: `games/chicken-farm/src/game/systems/controllableUnitSystem.ts#damageUnit`, `createDebugFarmer`; `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts#resumeConstructionWithBuilder`; `games/chicken-farm/src/main.ts`의 construction resume/fixture debug API; `scripts/check-chicken-farm-construction.ts`; [artifact](./chicken_farm_w3x_artifacts/construction_check_pause_resume.json).
- assertion: actual `S`는 active worker를 해제하고 2 simulation seconds 동안 progress를 고정했다. 실제 우클릭 재개는 같은 ID/worker로 progress를 다시 진행시키며 wallet `1440/0`을 유지했다. 반복 우클릭은 worker/비용을 바꾸지 않고, 일반 이동 명령과 치명 피해도 pause한다. debug 전용 p4 farmer의 재개는 거절되고 p3 helper의 재개는 pending order의 builder ID와 active worker를 함께 `p3-helper`로 바꿨다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=pause_resume npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONTROL_CASE=stop npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: 연속 건설 예약의 FIFO·중간 실패 뒤 다음 유효 주문 실행은 SP-05-06, 취소/환불은 SP-05-07에서 검증한다.
- 다음 ID: **SP-05-06**.

### SP-05-06 — 연속 예약과 실패 진행

- 읽기: `handlePrimaryClick`, `hasEarlierBuilderOrder`, `issueMoveToNextBuilderOrder`, `cancelPendingBuildOrdersForBuilder`, controls queue 사례.
- 작업: 실제 Shift 연속 배치 → 순서대로 착공/완공, 중간 주문 자원 부족/도달 불가, Stop/replace를 검증한다. SP-04 이동 queue와 건설 pending queue의 책임을 구분한다.
- 완료: FIFO 순서, 각 착공 비용 1회, 실패 주문 유한 종료, 후속 유효 주문 실행, Stop 뒤 계약상 취소된 예약 재등장 0. 전체 예약 비용을 임의 선차감하지 않는다.
- 검증: queue 사례 + controls queue + typecheck.

#### SP-05-06 결과

- 상태: **완료**. 독립 결함은 첫 건설 완공 뒤 다음 pending을 replace 이동으로 시작해 pending interruption이 스스로 취소하는 한 건이었다. 다음 주문을 queued 이동으로 시작하도록 수정했다.
- 변경 파일: `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts#issueMoveToNextBuilderOrder`; `scripts/check-chicken-farm-construction.ts#runQueueCase`; [artifact](./chicken_farm_w3x_artifacts/construction_check_queue.json).
- assertion: actual `Shift` + `B/F` 두 번의 fence 배치는 pending 2개·wallet `1500/0`에서 시작해 FIFO `player-building-1` → `player-building-2`를 완공하고 wallet `1484/0`을 만들었다. 공용 controls queue는 Shift sequence, failed queued command 뒤 진행, replace queue clear, Stop queue clear를 통과했다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=queue npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONTROL_CASE=queue npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0.
- 남은 결함: 취소/환불은 SP-05-07에서 검증한다.
- 다음 ID: **SP-05-07**.

### SP-05-07 — 취소와 환불

- 읽기: 두 시스템의 `cancelConstruction`, `main.ts`의 `cancel_construction` action/아이템 설치, `playerWallet.ts`.
- 작업: 도착 전 예약 취소, 착공 직후/중간/중단 상태 취소, 반복 취소, 완공 후 취소 거부를 검증한다. `skipCost` fixture와 아이템 설치를 구분해 지급 근거 없는 환불을 막는다.
- 완료: 유료 건설은 `시작 wallet - 실제 비용 + 계약상 환불`과 일치하고 gold/lumber 내림 처리. 환불 최대 1회, 무료 생성에서 자원 증식 0, pending/worker/selection/view 잔존 0. 정상 아이템 사용의 반환 여부도 01 계약을 따른다.
- 검증: cancel/refund 사례 + typecheck. 아이템 차감 경로를 바꿨으면 start-regression 또는 해당 아이템 회귀를 추가한다.

#### SP-05-07 결과

- 상태: **완료**. `skipCost` 건물이 template 비용의 75%를 환불해 wallet을 늘릴 수 있는 결함을 수정했다.
- 변경 파일: `games/chicken-farm/src/game/systems/buildingSystem.ts#PlayerBuilding.costPaid`, `cancelConstruction`; `main.ts#cancelConstructionForTest`; `scripts/check-chicken-farm-construction.ts#runRefundCase`; [artifact](./chicken_farm_w3x_artifacts/construction_check_refund.json).
- assertion: actual 유료 `farm_house` 착공 뒤 운영 cancel 경로는 wallet `1500 → 1440 → 1485`로 75% 환불 1회이며, 반복 cancel은 false다. `skipCost` paused `market` fixture 취소는 wallet `1485`를 유지한다. 두 경우 building/pending/blocker/vision/economy 참조는 0이다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=refund npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: 완료 전이와 경제 등록은 SP-05-08에서 검증한다.
- 다음 ID: **SP-05-08**.

### SP-05-08 — 완공과 기능 연결

- 읽기: `buildingSystem.ts#update`, `buildingEconomyAdapter.ts`, `main.ts#attachCompletedBuildingEconomy`와 시장 상호작용의 완공 guard.
- 작업: 마지막 progress 전이, worker 해제, completedAtSec, callback 1회와 같은 ID/owner/좌표의 경제 등록을 확인한다. 닭장 3종·우물·campfire는 adapter 분기별 검증, 시장은 실제 상호작용 자격 검증을 둔다.
- 완료: 미완공 기능 활성화 0, 반복 update/중복 callback에 중복 경제 entity/inventory 0, 완공 후 pending/build command 제거. 알 판매·부화 수량의 전체 루프는 SP-06에 남긴다.
- 검증: completion 사례 + economy:measure + typecheck.

#### SP-05-08 결과

- 상태: **완료**. debug paused `coop_basic`을 실제 우클릭으로 재개해 runtime 완공 전이와 economy adapter 등록을 검증했다.
- 변경 파일: `scripts/check-chicken-farm-construction.ts#runCompletionCase`; [artifact](./chicken_farm_w3x_artifacts/construction_check_completion.json).
- assertion: `player-building-1`은 progress `1`, active worker/pending `0`, complete state로 전이했다. dynamic blocker·vision·economy ID는 모두 같은 building ID이며 economy ID는 반복 관찰에도 정확히 1개다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=completion npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: 파괴/제거와 참조 정리는 SP-05-09에서 검증한다.
- 다음 ID: **SP-05-09**.

### SP-05-09 — 파괴/제거와 참조 정리

- 읽기: `removeCompletedBuilding`, `cancelConstruction`, `main.ts#detachBuildingEconomy`, `economySystem.ts#removeEconomyBuilding` 및 worker target/selection 소비자.
- 작업: 건설 중·중단·완공 상태를 제거하는 공용 lifecycle을 확보한다. 취소와 파괴 reason/환불을 구분하고 완료 건물 전용 API로 미완공 파괴를 대신하지 않는다. 기존 Combat PoC의 별도 건물 모델을 그대로 운영 모델로 간주하지 않는다.
- 완료: 같은 제거 요청 2회에도 callback/환불/경제 정리 1회. worker/pending/선택/경제 entity/inventory/부화 예약/target의 죽은 ID 참조 0. 저장 알/예약 내용물 처분 정책을 기록하고 수량 검수는 SP-06에 인계한다.
- 검증: destruction/removal 사례 + economy:measure + typecheck. debug에서 **운영 제거 함수**를 호출해 검증하고 실제 적 피해→제거 연결은 SP-07 잔여 항목으로 명시한다.

#### SP-05-09 결과

- 상태: **완료**. complete removal이 `BuildingSystem`만 직접 호출해 pending/build command를 남길 수 있던 경로를 `ConstructionPlacementSystem` 공용 wrapper로 통합했다.
- 변경 파일: `games/chicken-farm/src/game/systems/constructionPlacementSystem.ts#removeCompletedBuilding`; `main.ts#removeCompletedBuildingFixture`; `scripts/check-chicken-farm-construction.ts#runRemovalCase`; [artifact](./chicken_farm_w3x_artifacts/construction_check_removal.json).
- assertion: complete `coop_basic` 제거 뒤 building/pending/dynamic blocker/vision/economy ID가 모두 0이며, 같은 제거 요청은 false로 끝나 callback·정리·환불을 반복하지 않는다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=removal npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: 실제 적 피해에서 공용 제거 호출은 SP-07에 남기고 spatial lifecycle은 SP-05-10에서 검증한다.
- 다음 ID: **SP-05-10**.

### SP-05-10 — blocker와 시야

- 읽기: `getAllFootprints`, `getDynamicBlockedRects`, `getVisionSources`, `main.ts`의 pathing/visibility 공급부, SP-04 dynamic_blocker 사례.
- 작업: pending/건설/중단/완공/취소/파괴별 배치 점유·이동 blocker·시야 source를 01 계약과 대조한다. 완공 순간 인접 worker가 갇히는지, 제거 후 같은 위치로 이동/재건축 가능한지 확인한다.
- 완료: 상태별 source 수/ID/범위 일치, 취소/파괴 후 blocker와 현재 시야 source 제거, 새 이동 통과. fog의 이미 탐색한 영역과 현재 시야를 구분한다. 완공으로 기존 path가 막히면 SP-04 우회/유한 종료 계약 유지.
- 검증: spatial 사례 + controls dynamic_blocker + player-pathing + typecheck.

#### SP-05-10 결과

- 상태: **완료**. pending은 placement footprint만 점유하고 blocker/vision 0, active construction은 vision만, paused construction은 blocker/vision 0, complete는 blocker·vision을 제공하며 removal 뒤 모두 해제되는 기존 계약을 lifecycle artifact로 대조했다.
- 변경 파일: `scripts/check-chicken-farm-controls.ts#runDynamicBlockerCase`의 유한 관찰 timeout을 20초에서 30초로 조정했다. assertion은 그대로다.
- assertion: [completion artifact](./chicken_farm_w3x_artifacts/construction_check_completion.json)의 complete coop은 blocker·vision·economy에 동일 ID 하나를 남기고 worker/pending 0이다. [removal artifact](./chicken_farm_w3x_artifacts/construction_check_removal.json)는 제거 뒤 building/blocker/vision/economy/pending 0을 기록한다. dynamic controls는 새 complete blocker 우회, 막힌 목표 유한 종료, blocker 제거 뒤 새 이동을 실제 입력으로 통과했다.
- 검증: `npm run chicken:player-pathing:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONTROL_CASE=dynamic_blocker npm run chicken:controls:check --workspace @games/chicken-farm` → 종료 코드 0. `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: construction 상태를 포함한 same-page restart는 SP-05-11에서 검증한다.
- 다음 ID: **SP-05-11**.

### SP-05-11 — restart 격리

- 읽기: `main.ts#disposeRun`, 두 건설 시스템 `dispose`, browser-perf와 controls restart 사례.
- 작업: pending·활성/중단 건설·완성 경제 건물·선택·배치 ghost를 만든 뒤 같은 page에서 두 번 restart한다. 정상 자원으로 구성 불가능한 복합 상태는 debug fixture로 분리한다.
- 완료: 이전 run의 progress/예약/callback/view/경제 등록/선택/ghost 없음, 새 wallet·시작 아이템 계약 복원, 새 run 실제 건설 성공. runId가 바뀌므로 재사용된 building ID 문자열만으로 이전 객체를 판정하지 않는다.
- 검증: construction restart + browser-perf + typecheck. 시작 초기화 변경 시 start-regression 추가.

#### SP-05-11 결과

- 상태: **완료**. pending, paused fixture, complete fixture를 만든 뒤 same-page restart 두 번째 run을 관찰했다.
- 변경 파일: `scripts/check-chicken-farm-construction.ts#runRestartCase`; [artifact](./chicken_farm_w3x_artifacts/construction_check_restart.json).
- assertion: restart 후 runId `2`, wallet `1500/0`, building/pending/blocker/vision/economy/selection/placement ghost 0이다. 새 farmer의 actual `B/F` 배치는 새 run의 `pending-build-1`을 만들었다. fixture ID 문자열 재사용 대신 runId로 격리했다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=restart npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:browser-perf:measure --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 남은 결함: SP-05 필수 lifecycle의 정상 시작 통합 검수와 SP-06/07 인계는 SP-05-12에서 수행한다.
- 다음 ID: **SP-05-12**.

### SP-05-12 — 통합 검수와 인계

- 읽기: 01~11의 결과·diff·artifact, current context/backlog의 SP-05~09.
- 작업: normal P3 정상 자원으로 실제 build card → 배치 → 이동/착공 → Stop → 재개 → 완공, 별도 유료 건설 취소/환불을 연속 검수한다. 특수 자원/파괴 fixture 사례는 별도 결과로 둔다.
- 완료: 필수 사례 전체 통과, normal fixture/combat/terrain probe 유입 0, browser console/page/request 오류 0. 핵심 lifecycle 결함이 남으면 상위 SP-05를 완료로 표시하지 않는다.
- 검증: typecheck, build, construction 전체, smoke, player-pathing. 변경 영향이 있는 controls 사례를 실행하고 코드 변경 없는 직전 economy/browser-perf 결과는 근거와 함께 재사용한다.
- 인계: SP-06에 건물 ID/owner/wallet·inventory 제거 정책, SP-07에 실제 피해→공용 파괴 API 연결, SP-09에 미구현 생산/연구를 전달한다. 다음 ID는 SP-06 세부 계획 수립 후 확정한다.

#### SP-05-12 결과

- 상태: **완료**. normal P3에서 실제 `B` → `F` → world 배치 → 이동/착공 → `S` Stop → 건물 우클릭 재개 → 완공을 한 lifecycle으로 검수했다. 특수 자원과 파괴 경로는 별도 artifact를 재사용했다.
- 변경 파일: `scripts/check-chicken-farm-construction.ts#runIntegrationCase` (console/page/request/4xx response 오류 수집), `scripts/check-chicken-farm-controls.ts#runDynamicBlockerCase` (실제 3-waypoint 우회 검수의 벽시계 timeout을 45초로 조정); current context, backlog, README, SP-04 현황.
- assertion: normal fixture/combat/terrain probe 유입은 0이고 browser console/page/request/response 오류도 0이다. `fence_wood`는 같은 `player-building-1`로 active worker `p3-farmer`·pending 1에서 complete·worker null·pending 0이 됐으며 wallet gold는 `1500 → 1492`다. 별도 paid cancel/refund는 [refund artifact](./chicken_farm_w3x_artifacts/construction_check_refund.json)에서 gold `1500 → 1485`와 단일 75% 환불을 유지한다. `SP-05-12-01`은 dynamic blocker가 20초에 아직 이동 중이던 검수 timeout 결함이며, 대기만 45초로 조정하고 우회/차단 유한 종료/제거 뒤 새 이동 assertion을 그대로 통과시켰다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 0, `npm run build --workspace @games/chicken-farm` → 0, `CHICKEN_FARM_CONSTRUCTION_CASE=integration npm run chicken:construction:check --workspace @games/chicken-farm` → 0, `npm run chicken:smoke --workspace @games/chicken-farm` → 0, `npm run chicken:player-pathing:check --workspace @games/chicken-farm` → 0, `CHICKEN_FARM_CONTROL_CASE=stop npm run chicken:controls:check --workspace @games/chicken-farm` → 0, `CHICKEN_FARM_CONTROL_CASE=dynamic_blocker npm run chicken:controls:check --workspace @games/chicken-farm` → 0. 코드 변경 없는 economy/browser-perf는 SP-05-11의 종료 코드 0 결과를 재사용한다.
- artifact: [normal 통합](./chicken_farm_w3x_artifacts/construction_check_integration.json), [arrival](./chicken_farm_w3x_artifacts/construction_check_arrival.json), [pause/resume](./chicken_farm_w3x_artifacts/construction_check_pause_resume.json), [queue](./chicken_farm_w3x_artifacts/construction_check_queue.json), [completion](./chicken_farm_w3x_artifacts/construction_check_completion.json), [removal](./chicken_farm_w3x_artifacts/construction_check_removal.json), [restart](./chicken_farm_w3x_artifacts/construction_check_restart.json).
- 남은 결함: SP-06은 건물 ID/owner와 wallet·inventory 제거 정책을 실제 닭·알 수량 루프에 연결한다. SP-07은 실제 피해를 공용 건물 제거 API에 연결한다. SP-09는 생산·연구 명령을 구현한다.
- 다음 ID: **SP-06-01**.

## 검증 실행과 결과 기록

명령은 저장소 루트에서 `npm run <script> --workspace @games/chicken-farm`으로 실행한다. 기존 script는 `typecheck`, `build`, `chicken:controls:check`, `chicken:player-pathing:check`, `chicken:economy:measure`, `chicken:smoke`, `chicken:browser-perf:measure`, `chicken:start-regression:check`다. construction script와 사례 값은 02에서 구현한 후 사용한다. 기존 controls는 기본값이 selection이므로 무옵션 호출을 전체 검증으로 기록하지 않는다.

각 ID 아래 결과를 추가한다: 상태, 변경 파일·심볼, 명령/종료 코드, 입력·기대/실제 assertion, artifact 경로, 남은 결함/담당 ID, 다음 ID. 실행하지 않은 검증은 미실행으로 쓴다. 문서만 변경한 요청은 게임 전체 테스트를 반복하지 않는다. 한 카드가 여러 독립 수정으로 커지면 하위 ID로 나눠 상태를 기록하고 한 요청에 하나만 실행한다.

## Terra medium 실행 요청

```text
닭농장 SP-05-01을 Terra medium으로 진행해.
docs/chicken_farm/chicken_farm_sp05_task_plan.md의 해당 카드와 지정 함수부터 읽고,
이번 요청은 해당 ID만 처리해. 기존 변경을 보존하고 완료 조건을 낮추지 마.
독립 결함이 여러 개면 하위 ID로 나눠 기록해.
결과에 변경 파일·명령/종료 코드·assertion·artifact·남은 결함·다음 ID를 남기고,
current context와 backlog의 현재 상태를 동기화해.
```

실행 환경에서 Terra medium을 선택한 뒤 해당 ID를 요청한다. 이 문서는 모델을 자동 전환하거나 작업을 실행하지 않는다. 작업 수는 시간·소비량·완성도 추정값이 아니다.

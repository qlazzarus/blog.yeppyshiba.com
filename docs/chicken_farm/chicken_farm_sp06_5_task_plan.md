# SP-06.5 — W3X 럼버 밀 30초 수입 복원

> 작성: 2026-10-07. **계획 작성 완료 / 구현·검증 미착수**. Terra medium에서 한 요청에 한 ID를 순서대로 실행한다. SP-06-05(우물·산란)와 다른 bridge 작업이며 SP-06 완료 → SP-06.5 → SP-07 순서다.

## 목표와 범위

럼버 밀 수입을 닭·알 생산과 **병행**한다. 복원하는 원본 경제 값은 아래 세 건물의 **30초 목재 수입 70/110/170만**이다. 닭 산란·알 수집·부화·시장 판매, 기존 `100 gold → 70 lumber` 교환, 시작 자원, 비용·HP·건설 시간·인구·다른 수입 값은 변경하지 않는다.

| W3X rawcode | runtime template ID | 완성 건물 1개당 30초 수입 |
| --- | --- | ---: |
| h00A | lumber_mill | 70 lumber |
| h00J | lumber_mill_mid | 110 lumber |
| h00W | lumber_mill_high | 170 lumber |

**build card 추가/노출, 선행조건(`requires`) 강제, 업그레이드 UI·실행 흐름은 모두 SP-09 범위로 유지한다.** 이번에는 기존 건물 lifecycle과 owner wallet에 수입을 연결한다. 상위 두 tier는 분리된 fixture로 검증할 수 있지만 정상 플레이에서 건설·업그레이드 접근까지 완료했다고 기록하지 않는다. 실제 적 피해는 SP-07, hidden/pause 정책 전면 변경은 SP-13이다.

## 정적 근거와 구현 주의

- 원본: `chicken_farm_w3x_artifacts/jass_economy_events.tsv`의 JASS 9358–9360, `jass_rawcodes.tsv`, `web_mvp_balance_reference.json`의 원본 incomeBuildings. 원본은 owner별 living unit 수에 수입을 곱한다. 완료 상태만 지급하는 웹 계약과 원본 timer 등록·첫 tick 근거는 01에서 구분한다.
- 현재 `buildingTemplates.ts`에는 위 세 template이 있다. `buildingEconomyAdapter.ts`에는 닭장·우물 연결만 있고 럼버 밀 연결은 없다.
- `balance.ts#incomeBuildings.coop_*`와 참조 JSON에는 과거 럼버 밀→알 생산 변환 흔적이 있다. 이를 근거로 닭장에 목재를 지급하지 않는다. 기존 참조/산출물을 일괄 재생성하거나 닭·알 값을 삭제하지 않고, 별도 canonical lumber income 설정과 정확한 template 매핑을 둔다.
- scene·건설·경제가 공유하는 기존 wallet을 재사용한다. 별도 지갑이나 setInterval을 만들지 않는다. 지급 기준은 simulation 시간이며 wall-clock 경과를 별도로 더하지 않는다.

## 실행 순서

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-06.5-01 | 원본·template·tick 계약 확정 | SP-06 | 완료 |
| SP-06.5-02 | 수입 설정·순수 지급 로직 | 01 | 완료 |
| SP-06.5-03 | 완공·제거·owner wallet 연결 | 02 | 완료 |
| SP-06.5-04 | restart 정리·수입 snapshot | 03 | 완료 |
| SP-06.5-05 | 럼버 밀 browser 사례 추가 | 04 | 완료 |
| SP-06.5-06 | 필수 회귀·결과 기록·SP-07 인계 | 05 | 대기 |

의존성은 순차 실행을 뜻한다. 한 ID가 커지면 `-A/-B`로 나누고 남은 범위를 기록한다. task 수를 시간·모델 사용량 보장으로 해석하지 않는다.

## 세부 작업 카드

### SP-06.5-01 — 원본·template·tick 계약 확정

- 읽기: 위 원본 artifact, `buildingTemplates.ts`, `balance.ts`, `economyTypes.ts`, `economySystem.ts`, `buildingEconomyAdapter.ts`, `main.ts`의 simulation update·완공/제거·restart와 wallet 연결 함수.
- 작업: rawcode→template→수입 표와 wallet 소유권을 확정한다. 원본 timer 등록 근거를 추적하고 전역 30초 tick인지 건물별 완공 후 30초인지 명시한다. 근거가 없으면 원본과 일치한다고 주장하지 않고 **run 시작 기준 전역 simulation 30초 tick**을 웹 계약으로 채택한다.
- 경계 계약: 30초 직전/정각/직후 완공·제거의 처리 순서, 큰 delta의 여러 tick 처리, 중복 update, 시간 역행·새 run 초기화, 미등록 owner 거부를 표로 고정한다. 늦게 완공된 건물에 완공 전 tick을 소급 지급하지 않는다. 같은 시각 반복 갱신은 지급 0회다.
- 완료 조건: 닭장/닭 수와 무관한 owner별 `70×basic + 110×mid + 170×high` 수입 장부, 첫 지급 시각, lifecycle 적용 순서가 명확하다. 이후 카드가 새 정책을 추측할 필요가 없다.
- 검증/산출물: 이 문서에 계약·근거·함수 위치 기록, `git diff --check`. 정적 확인만으로 runtime 통과를 표기하지 않는다.

#### SP-06.5-01 결과

- 상태: **완료**. 원본 30초 timer와 현재 scene lifecycle을 정적으로 대조해 럼버 밀 수입의 rawcode/template/owner/tick 경계 계약을 확정했다. runtime 수입 코드·측정·browser 검증은 수행하지 않았다.
- 원본 근거: `jass_economy_events.tsv` 9358–9360의 `CountLivingPlayerUnitsOfTypeId`가 각 owner의 `h00A`/`h00J`/`h00W` 생존 수에 각각 70/110/170 lumber를 곱한다. `jass_timer_events.tsv` 9369는 전역 trigger `iliiII`를 30.00초 periodic으로 등록한다. 원본 action `lIiillI`의 범위는 `jass_function_labels.tsv` 9352–9366이며, 추출 artifact에는 trigger action 연결과 게임 시작 뒤 첫 dispatch 시점이 보존되지 않았다. 따라서 원본 첫 tick을 단정하지 않는다.
- rawcode/template 계약: `h00A → lumber_mill → 70`, `h00J → lumber_mill_mid → 110`, `h00W → lumber_mill_high → 170` lumber/30초다. `buildingTemplates.ts`의 `source.rawcode`와 `balanceTypes.ts`의 `EconomyBuildingId`가 이 세 mapping을 제공한다. `balance.ts#incomeBuildings.coop_*`는 닭장 알 생산 데이터이므로 럼버 밀 수입의 등록/지급 대상이 아니다.
- 웹 tick 결정: **run 시작 기준 전역 simulation 30초 tick**으로 구현한다. `FarmScene.update`가 `elapsedSec`를 먼저 증가시키므로 수입 후보 시각은 `30, 60, 90, …` simulation seconds다. 첫 tick은 30초이며, 건물별 완공 뒤 별도 30초를 기다리거나 완공 전 기간을 소급 지급하지 않는다. wall-clock, `setInterval`, 별도 wallet은 사용하지 않는다.

| 경계 | 확정 동작 | 근거/적용 위치 |
| --- | --- | --- |
| tick 전 완공 (`t < 30n`) | 해당 `30n` tick에 포함 | `update()`는 building update 뒤 economy update를 호출한다. |
| tick 정각 완공 (`t = 30n`) | 해당 tick에 포함 | `BuildingSystem.update()`가 complete 상태와 완료 callback을 먼저 만들고 같은 frame의 economy update가 뒤따른다. |
| tick 뒤 완공 (`t > 30n`) | 다음 tick부터 포함, 이전 tick 소급 0 | 전역 tick 계약이다. |
| tick 전 제거 | 해당 tick부터 제외 | 제거 callback이 수입 등록을 즉시 지운다. |
| tick 정각 제거 | 제거 callback이 economy update보다 먼저 실행되면 제외한다. 같은 simulation frame 안에서 제거와 income update를 역순으로 호출하는 새 경로는 만들지 않는다. | 현재 input/lifecycle callback은 즉시 처리되고, 03에서 이 순서를 regression으로 고정한다. |
| 큰 delta | 경과한 각 30초 경계를 순서대로 한 번씩 처리한다. | `advanceEconomyForTest`도 target simulation time을 한 번에 전진시키므로 02가 누락/중복 없이 구현한다. |
| 같은 elapsedSec 재호출 | 이미 처리한 tick은 0회 지급 | economy state의 마지막 처리 tick/시각으로 멱등 처리한다. |
| 시간 역행 | 지급 0, 처리 시각을 되감지 않는다 | debug advance도 현재 과거 target을 거부한다. |
| 새 run/restart | 등록·마지막 tick·누계를 새 state와 함께 초기화, 첫 tick은 새 run 30초 | `disposeRun()`이 `elapsedSec = 0` 및 scene state를 정리하고 `createEconomyPoc()`가 새 state를 만든다. |
| owner wallet 없음 | 등록 또는 지급을 거부하고 모든 wallet을 보존 | existing shared wallet은 `economyState.players`의 owner ID로 찾으며, 02/03의 명시 assertion 대상이다. |

- lifecycle·wallet 위치: `main.ts#create`는 `createEconomyPoc()` 뒤 `BuildingSystem`에 같은 `PlayerEconomyState` wallet을 넘긴다. `BuildingSystem.update()`의 완료 callback은 `main.ts#attachCompletedBuildingEconomy`로, 취소/완료 건물 제거 callback은 `#detachBuildingEconomy`로 간다. `FarmScene.update()`는 `buildingSystem.update()`를 `updateEconomyPoc()`보다 먼저 실행한다. 03은 이 adapter에 럼버 밀 등록/해제를 추가하고, 02의 순수 tick은 같은 owner의 `economyState.players` wallet만 늘린다.
- 제외 범위: 이 계약은 럼버 밀 수입만 추가한다. 닭 산란·알 수집/입고/부화/판매와 병행하고 서로 수량·주기를 바꾸지 않는다. build card 노출, `requires` 강제, upgrade UI/실행은 **SP-09**, 실제 적 피해로 인한 제거는 **SP-07**, hidden/pause 정책은 **SP-13**에 남긴다.
- 검증: 원본 artifact·template·lifecycle 정적 대조 완료. `git diff --check` → 종료 코드 0. 코드가 바뀌지 않았으므로 typecheck/build/`economy:measure`/construction/browser는 이번 ID에서 **미실행**이다.
- 다음 ID: **SP-06.5-02 — 수입 설정·순수 지급 로직**.

### SP-06.5-02 — 수입 설정·순수 지급 로직

- 읽기/수정 후보: `balance.ts`, `economyTypes.ts`, `economySystem.ts`, `playerWallet.ts`, `scripts/measure-chicken-farm-economy.ts`.
- 작업: 세 수입 값과 30초 주기를 canonical 설정 하나에 둔다. ID·owner·tier·지급 대상 기간을 보존하는 최소 상태와 순수 update를 구현한다. 기존 닭·알 update와 함께 실행하며 incomeBuildings의 과거 coop 변환 값을 지급 근거로 사용하지 않는다.
- 완료 조건: 각 tier 1개는 한 tick에 `70/110/170`, 같은 owner 세 tier 합은 `350`, basic 2개는 `140`. 여러 owner는 분리 지급한다. 29.999초/30초/동일 시각 재호출/60초 및 큰 delta는 01 계약대로 계산된다. 미완공·제거·잘못된 template/owner는 수입 0이며 gold·supply·알·닭은 수입 함수 때문에 변하지 않는다.
- 검증: typecheck + `chicken:economy:measure`. 기존 산란·부화·판매 assertion을 유지하고 새 수입 assertion을 추가한다. 완료 시 실제 명령·종료 코드·결과를 기록한다.

#### SP-06.5-02 결과

- 상태: **완료**. `CHICKEN_FARM_BALANCE.lumberMillIncome`에 rawcode/template별 단일 canonical 30초 수입 설정을 추가하고, economy state의 순수 global tick으로 owner wallet lumber를 지급하게 했다. world building 완공·제거 callback 연결은 다음 ID의 범위다.
- 설정: `lumber_mill(h00A) = 70`, `lumber_mill_mid(h00J) = 110`, `lumber_mill_high(h00W) = 170`, 모두 `incomeIntervalSec: 30`이다. 기존 `incomeBuildings.coop_*`는 닭장의 egg 설정으로 유지하며 목재 지급에 읽지 않는다.
- 순수 상태/로직: `EconomyLumberMillState`는 ID·owner·template·`activeFromSec`을 보존한다. `addEconomyLumberMill`은 중복 ID, 없는 owner, 잘못된 template, 음수/비유한 active 시각을 거부한다. `updateChickenFarmEconomy`는 global tick을 한 번씩 처리해 각 owner에게 합산 지급하고 `lumber_income_paid` event를 만든다. 이미 처리한 시각은 0회, 역행 시간은 0회이며 큰 delta는 모든 경과 tick을 순서대로 처리한다. 이 함수는 lumber만 바꾸며 gold·supply·알·닭을 직접 바꾸지 않는다.
- 측정: `economy:measure`에 `lumber_mills_pay_global_30s_income_without_replacing_chicken_eggs` assertion을 추가했다. 29.999초 수입 0, 30초 owner 3의 세 tier 합계 350과 owner 4 basic 2개 140, 같은 시각 재호출 0, 60초 late basic을 포함한 owner 3의 420, 125초 큰 delta의 90/120초 각각 420/140을 확인했다. 첫 30초 update에서 chicken egg drop도 함께 발생해 두 경제가 병행함을 확인했다. 결과는 [economy_poc_metrics.json](./chicken_farm_w3x_artifacts/economy_poc_metrics.json)에 기록했다.
- 변경 파일: `games/chicken-farm/src/game/balance.ts`, `balanceTypes.ts`, `systems/economyTypes.ts`, `systems/economySystem.ts`, `scripts/measure-chicken-farm-economy.ts`, 위 metrics artifact.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 종료 코드 0, 33개 assertion 전체 통과. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06.5-03 — 완공·제거·owner wallet 연결**.

### SP-06.5-03 — 완공·제거·owner wallet 연결

- 읽기/수정 후보: `buildingEconomyAdapter.ts`, `buildingSystem.ts`, `constructionPlacementSystem.ts`, `main.ts`의 완료/제거 callback, 02의 수입 함수.
- 작업: 완성된 lumber template만 동일 building ID·owner로 등록하고 simulation update에서 공유 wallet에 한 번 지급한다. pending/이동/건설 중/Stop/취소에는 등록하지 않는다. 제거는 수입 등록도 즉시 정리하며 중복 attach/detach가 누적 수입을 만들지 않게 한다.
- 완료 조건: 같은 ID 재등록은 중복 없음, 미완공 수입 0, 완공 경계는 01 계약 준수, 제거 후 tick 수입 0. 타 owner 건물이 로컬 wallet을 늘리지 않는다. coop 등록은 여전히 알 보관·부화만 담당한다. 제거 시 기존 inventory·hatch·footprint 정리를 깨지 않는다.
- 검증: typecheck + economy 순수 측정 + construction `completion`/`removal` 사례. 순수 adapter 검증에도 실제 complete 상태·중복 등록·다른 owner를 포함한다.

#### SP-06.5-03 결과

- 상태: **완료**. `buildingEconomyAdapter`가 complete `lumber_mill`/`lumber_mill_mid`/`lumber_mill_high`만 같은 world building ID·owner·completedAtSec으로 economy 수입 등록에 연결한다. constructing 건물은 거부하고, 중복 attach는 기존 ID를 보존하며 새 등록을 만들지 않는다.
- lifecycle: 기존 `BuildingSystem` 완료 callback → `FarmScene#attachCompletedBuildingEconomy` → shared `economyState.players` wallet 경로를 사용한다. `removeCompletedBuilding`과 construction cancel의 제거 callback은 `removeEconomyBuilding`까지 가며 럼버 밀 등록도 즉시 지운다. 미완공 취소는 등록되지 않았으므로 수입 0이다. coop의 inventory/hatch 정리와 well 정리는 기존 순서를 유지한다.
- view/snapshot 경계: 럼버 밀은 경제 capability만 등록하며 별도 coop/well view를 만들지 않는다. construction lifecycle snapshot의 `economyBuildingIds`에는 등록된 럼버 밀 ID도 포함해 완료·제거 검증에 사용한다. SP-06.5-04에서 상세 수입 snapshot/누계를 추가한다.
- 순수 adapter 측정: `completed_lumber_mills_attach_once_pay_owner_and_detach_immediately`는 constructing attach 거부, 같은 ID 재attach 0, owner 3 basic의 30초 +70, owner 4 mid의 독립 +110, owner 3 제거 뒤 60초 추가 수입 0, 반복 detach 0을 확인했다. 결과는 [economy_poc_metrics.json](./chicken_farm_w3x_artifacts/economy_poc_metrics.json)에 있다.
- browser construction: [completion artifact](./chicken_farm_w3x_artifacts/construction_check_completion.json)는 실제 paused lumber mill을 worker로 완공해 capability가 한 번 등록되고 다음 global tick에 `0 → 70 lumber`임을 기록했다. [removal artifact](./chicken_farm_w3x_artifacts/construction_check_removal.json)는 complete fixture의 첫 +70 뒤 제거하고, 다음 tick에도 `70 → 70`이며 footprint·vision·economy ID가 모두 비었음을 기록했다.
- 변경 파일: `systems/buildingEconomyAdapter.ts`, `systems/economySystem.ts`, `main.ts`, `scripts/check-chicken-farm-construction.ts`, `scripts/measure-chicken-farm-economy.ts`, 관련 construction/economy artifacts.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 종료 코드 0, 34개 assertion 전체 통과. `CHICKEN_FARM_CONSTRUCTION_CASE=completion npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_CONSTRUCTION_CASE=removal npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06.5-04 — restart 정리·수입 snapshot**.

### SP-06.5-04 — restart 정리·수입 snapshot

- 읽기/수정 후보: `main.ts`의 run 초기화/shutdown/restart, `economyTypes.ts`와 수입 상태, `getEconomyLifecycleSnapshot`.
- 작업: 새 run에서 럼버 밀 등록·tick 시각·수입 누계를 재설정한다. 기존 읽기 전용 snapshot에 ID/owner/tier·지급 시각·owner별 수입 누계를 최소 추가한다. 테스트용 값은 제품 HUD에 노출하지 않는다.
- 완료 조건: 수입 발생 후 same-page restart 두 번에서도 이전 ID/예약/tick/누계가 남지 않고 normal 시작 wallet이 복원된다. 첫 tick은 새 run 기준이다. snapshot 반복 호출은 지급·상태 변경 0. 다른 owner wallet을 관찰하려면 fixture 전용 관찰 범위를 명시한다.
- 검증: typecheck + 순수 restart assertion + construction `restart`. 실제 수입 오염 뒤 전용 economy browser 사례와 `all` 포함은 05에서 완료한다.

#### SP-06.5-04 결과

- 상태: **완료**. 럼버 밀 수입 state에 owner별 누계를 추가하고, 기존 읽기 전용 economy lifecycle snapshot에서 지급 tick·등록 mill·owner별 누계를 확인할 수 있게 했다. snapshot은 state를 바꾸지 않는 복사본이며 제품 HUD에는 노출하지 않는다.
- snapshot 계약: `lumberIncome.lastProcessedTickSec`, `mills[{ id, ownerPlayerId, templateId, activeFromSec }]`, `totalsByPlayer[{ playerId, lumber }]`를 제공한다. mill의 `templateId`가 tier를 식별하고, owner별 누계는 럼버 수입 이벤트가 실제 지급된 경우에만 증가한다. 두 번 읽어도 JSON 결과가 같고 지급·wallet·등록 상태는 변하지 않는다.
- 새 run/restart: `disposeRun()`이 이전 economy state와 simulation 시간을 폐기하고 `createEconomyPoc()`가 새 state를 만들므로 등록 목록, 마지막 처리 tick, owner별 누계가 모두 새로 시작한다. 순수 측정은 지급 뒤 snapshot(`tick 120`, owner 3/4 누계 `1610/560`)과 새 state snapshot(`tick 0`, mill 없음, owner 3 누계 0)을 대조했다.
- browser restart: [restart artifact](./chicken_farm_w3x_artifacts/construction_check_restart.json)는 실제 complete lumber mill의 첫 global tick `+70` 뒤 same-page restart를 실행했다. 새 run snapshot은 `tick 0`, mill 없음, owner 3 누계 0이고, 이전 건설 예약도 비어 있으며 normal 시작 wallet `1500 gold / 0 lumber`로 복원됐다. restart 뒤 새 placement도 생성되어 stale construction이 남지 않음을 함께 확인했다.
- 범위: 닭·알 생산은 럼버 밀 수입과 계속 병행한다. build card 노출, `requires` 강제, 업그레이드 UI·실행 흐름은 계속 **SP-09** 범위다. 실제 수입 오염 뒤 별도 economy browser 사례와 `all` 포함은 다음 ID에서 구현한다.
- 변경 파일: `games/chicken-farm/src/game/systems/economyTypes.ts`, `systems/economySystem.ts`, `main.ts`, `scripts/measure-chicken-farm-economy.ts`, `scripts/check-chicken-farm-construction.ts`, [economy metrics](./chicken_farm_w3x_artifacts/economy_poc_metrics.json), restart artifact.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:economy:measure --workspace @games/chicken-farm` → 종료 코드 0, 34개 assertion 전체 통과(지급 후 snapshot 반복 읽기 및 새 state reset 포함). `CHICKEN_FARM_CONSTRUCTION_CASE=restart npm run chicken:construction:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06.5-05 — 럼버 밀 browser 사례 추가**.

### SP-06.5-05 — 럼버 밀 browser 사례 추가

- 읽기/수정 후보: `scripts/check-chicken-farm-economy.ts`, 기존 construction fixture/debug API, 04 snapshot.
- 작업: 새 `CHICKEN_FARM_ECONOMY_CASE=lumber_income`을 구현하고 `all`에도 포함한다. **현재는 지원하지 않는 값**이며 이 카드에서 추가한 뒤 실행한다. fixture는 normal full_loop와 별도 세션으로 실행하고 실제 입력·debug 생성·시간 가속 여부를 artifact에 구분한다.
- 완료 조건: 세 tier/복수 건물/복수 owner, 미완공→완공, 중복 callback, 지급 직전·직후 제거, 동일 시각 update, 수입 발생 뒤 same-page restart를 검증한다. 럼버 밀과 살아 있는 닭을 같은 simulation에 두어 목재 지급과 산란이 모두 지속됨을 확인한다. fixture에서 등록만 직접 호출한 결과를 건설 완료 callback 통과로 대신하지 않는다.
- 검증: typecheck + 신설 `lumber_income` browser 사례. `economy_check_lumber_income.json`에 run/profile·입력·expected/actual/pass·wallet 장부·console/page/request/HTTP 오류를 기록한다. 미지원 fixture capability는 이 범위 안에서 최소 확장하며 build card는 추가하지 않는다.

#### SP-06.5-05 결과

- 상태: **완료**. `CHICKEN_FARM_ECONOMY_CASE=lumber_income`을 추가하고 `all` selector에 포함했다. artifact는 [economy_check_lumber_income.json](./chicken_farm_w3x_artifacts/economy_check_lumber_income.json)이다.
- 사례: normal farmer inventory 클릭으로 실제 basic chicken 1마리를 만들고, debug fixture의 `BuildingSystem#createBuilding(completeImmediately)` 완료 callback 경로로 P3 basic/mid와 P4 basic/high lumber mill을 만든다. fixture 전용 P4 wallet은 normal run에 노출되지 않으며, accelerated `advanceEconomyForTest`만 global 30초 경계에 사용한다.
- 검증: 첫 tick P3 `+180`, P4 `+240`; 이후 P3 basic 추가 뒤 `+250/+240`; basic 각각을 tick 직전에 제거한 뒤 P3 `+180`, P4 `+170`을 확인했다. constructing paused mill은 등록 0이고, 별도 completed fixture는 1회 등록된다. 완료 callback replay, 같은 tick 재호출은 wallet/누계를 바꾸지 않는다. 살아 있는 닭은 같은 simulation에서 egg drop을 계속한다.
- restart·오류: 수입 뒤 same-page restart는 mill/tick/누계를 `0/[]/0`으로 reset하고 P3 wallet을 `1500 gold / 0 lumber`로 복원했다. console/page/request/HTTP 오류 배열은 모두 비어 있다.
- debug 관찰: economy lifecycle snapshot에 owner별 `wallets`를 추가했다. debug fixture에서만 P4 wallet을 만들고, 이미 complete인 building의 adapter attach 재호출이 duplicate 등록을 만들지 않는지 확인하는 probe를 추가했다. build card·`requires` 강제·업그레이드 UI/실행은 계속 **SP-09** 범위다.
- 변경 파일: `games/chicken-farm/src/main.ts`, `scripts/check-chicken-farm-economy.ts`, 위 browser artifact.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_ECONOMY_CASE=lumber_income npm run chicken:economy:check --workspace @games/chicken-farm` → 종료 코드 0. `git diff --check` → 종료 코드 0.
- 다음 ID: **SP-06.5-06 — 필수 회귀·결과 기록·SP-07 인계**.

### SP-06.5-06 — 필수 회귀·결과 기록·SP-07 인계

- 작업: 아래 명령을 **구현 후 모두 재실행**한다. SP-06의 과거 artifact를 이번 변경의 통과 근거로 재사용하지 않는다. 실패 원인을 수정한 뒤 영향을 받는 검사를 다시 수행한다.
- 완료 조건: 모든 명령 종료 코드 0, assertion 전부 통과, browser 오류 목록 비어 있음. normal P3 `full_loop`은 fixture·debug 지급 없이 닭·알 루프와 시장 교환을 유지한다. `all`은 새 lumber_income을 실제 포함한다. construction에는 `all` selector가 없으므로 baseline과 아래 lifecycle 사례를 각각 실행한다.

```bash
npm run typecheck --workspace @games/chicken-farm
npm run build --workspace @games/chicken-farm
npm run chicken:economy:measure --workspace @games/chicken-farm
npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=completion npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=removal npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=restart npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_CONSTRUCTION_CASE=integration npm run chicken:construction:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=full_loop npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm
git diff --check
```

- `full_loop`은 기존 90초 이상 실행 가능한 local runner를 사용한다. timeout/환경 차단은 미통과로 남기며 전체 완료 처리하지 않는다.
- 결과: 이 문서에 변경 파일·명령·종료 코드·artifact·남은 한계를 기록하고 README/current context/backlog/W3X 비교를 동기화한다. SP-09에 build card·선행조건 강제·업그레이드 UI, SP-07에 실제 파괴 연결 회귀를 인계한다. 전체 원본 경제 이식이나 럼버 밀 정상 성장 UI 완료로 확대 해석하지 않는다.

## 실행 요청 템플릿

> SP-06.5-01을 Terra medium으로 진행해줘. 이 계획의 해당 ID만 구현/검증하고, 결과와 다음 ID를 기록해줘. 닭·알 생산과 럼버 밀 수입은 병행하고 build card·선행조건 강제·업그레이드 UI는 SP-09에 유지해줘.

현재 다음 ID: **SP-06.5-06**. SP-06.5-05는 전용 lumber income browser 사례와 `all` 포함을 완료했으며, 다음은 필수 회귀 재실행과 결과 기록·SP-07 인계다.

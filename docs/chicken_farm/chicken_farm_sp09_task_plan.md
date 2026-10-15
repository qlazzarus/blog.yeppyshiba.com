# SP-09 건물 기능·성장 경로 — Terra Medium 실행 계획

> 갱신: 2026-10-15. SP-09-01~17 계약·성장 그래프·관찰·선행조건 판정·공급/생산/연구 queue·upgrade 완료/economy adapter·취소/파괴 복구를 완료했다. 다음 실행은 **SP-09-18**이며 **한 요청에 한 ID**만 수행한다. 문서의 모델 명칭은 실행 권장 설정이며 현재 세션의 모델을 전환하지 않는다.

## 목표와 범위

정상 싱글플레이에서 건설 선행조건을 충족하고, 자원·인구를 지불해 생산/부화·업그레이드·연구를 진행하며, 취소·파괴·재시작에도 장부와 실제 기능이 일치하도록 연결한다. 럼버 밀과 타워를 실제 명령으로 이용할 수 있어야 한다.

SP-09는 기존 건물 성장과 현재 유닛에 필요한 기능을 담당한다. 가족/용병 신규 콘텐츠·아이템·질병/치유 이벤트는 SP-12, 보스/보상은 SP-10, 승패는 SP-11, pause/hidden은 SP-13, HUD 전면 정비는 SP-14, 수치 밸런스는 SP-15다. 기본 연구·지원 건물 기능을 이름만 등록하고 SP-09 완료로 보지 않는다. 01에서 전체 기능과 후속 경계를 확정한다.

## 코드 대조에서 확인한 출발점

- `buildingTemplates.ts`에 `requires`, `originalRequires`, `upgradeTo`, `produces`, `providesResearch`, `aura`가 있다. 데이터 존재와 runtime 구현을 구분한다. 원본 가격과 웹 가격도 별도 필드다.
- `commandCardSystem.ts`의 action에는 부화·환전·건설이 있으나 일반 생산·업그레이드·연구 action은 없다.
- `playerWallet.ts`는 `supplyCap/supplyUsed`를 보유하지만 비용 helper는 gold/lumber만 검사한다. 예약 인구와 실제 lifecycle 연결을 따로 검증해야 한다.
- `economySystem.ts#startCoopHatch`는 알 1개를 소비하고 capacity 안에서 `hatchJobs`를 만든다. 출구 대기와 건물 제거 처리도 존재하므로 새 부화 시스템으로 교체하지 않는다.
- `buildingProductionExit.ts#resolveBuildingProductionExit`와 `buildingSystem.ts#getRallyPoint/setRallyPoint`가 있다. resolver의 `resolved=false`를 무시해 fallback 좌표에 생성하면 안 된다.
- `buildingEconomyAdapter.ts`의 럼버 밀 연결, 기존 global 30초 지급, 우물→풍차 helper, SP-07 combat target/제거 경로를 재사용한다.
- `building_tech_reference.tsv`는 건물뿐 아니라 유닛 rawcode 선행조건도 담는다. 웹 `requires`와 동일하다고 가정하지 않는다. 연구 provider TSV는 효과 수치·비용·시간의 확정 근거가 아니다.

`src` 코드명은 `games/chicken-farm/src/game/` 기준이며 `main.ts`는 그 상위 `src/`에 있다. TSV와 artifact는 `docs/chicken_farm/chicken_farm_w3x_artifacts/` 기준이다. 새 모듈명·runner·artifact는 제안이며 구현 후 실제 경로로 갱신한다.

## 실행 규칙과 검증

1. 아래 순서대로 한 ID씩 실행한다. 각 요청에서 해당 카드와 직접 의존하는 계약/코드만 읽는다. 01/02/25 외에는 전체 원본 재분석을 반복하지 않는다.
2. 한 카드가 여러 독립 기능으로 커지면 `SP-09-19-a`처럼 하위 카드로 나누고 선행/완료 조건을 남긴다. 남은 일을 숨기거나 다음 ID를 자동 실행하지 않는다.
3. 기존 사용자 수정과 SP-08 결과를 보존한다. `main.ts`는 연결부 중심으로 변경하며 wallet/entity/clock/피해 시스템을 중복 생성하지 않는다.
4. 구현 카드는 해당 순수 사례와 필요한 browser 사례를 검증한다. 실행 명령·종료 코드·assertion·artifact·미확인을 카드에 기록한다. 문서/계약만 바꾸는 카드는 정적 대조로 충분하다.
5. 타입과 빌드는 각각 `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`로 확인한다. browser runner는 dev/preview URL과 실제 지원 selector를 확인해 실행한다. 신규 growth runner는 04에서 추가하기 전까지 존재한다고 가정하지 않는다.
6. artifact는 `growth_check_<case>.json` 규칙을 권장한다. run/owner, 입력, before/after wallet·인구·job·실제 entity, 기대/실제 결과, browser 오류, fixture/가속 여부를 기록한다. 수치 변화만으로 클릭·피해·생성 검증을 대신하지 않는다.
7. normal 경로를 막는 순환 테크/공급/취소 오류는 이 범위에서 해결한다. 원본 미확인은 명시적 웹 정책과 후속 관찰로 분리하고 원본 복원 완료로 표시하지 않는다.

## 실행 순서

SP-09-01~17은 **완료**했고, 18~25는 **미착수**다. 선행 열의 숫자는 SP-09 내부 ID이며 기본 순서는 01 → 02 → … → 25다.

| ID | 한 요청의 산출물 | 선행 |
| --- | --- | --- |
| SP-09-01 | 건물 기능·테크 범위 계약 | SP-08 |
| SP-09-02 | 비용·시간·인구·취소 정책 계약 | 01 |
| SP-09-03 | canonical 성장 데이터·그래프 | 01/02 |
| SP-09-04 | 관찰 snapshot·성장 검증 harness | 03 |
| SP-09-05 | 선행조건 순수 판정기 | 03/04 |
| SP-09-06 | 건설 preview·착공 선행조건 연결 | 05 |
| SP-09-07 | 공급 cap·used lifecycle | 02/04 |
| SP-09-08 | 생산 예약·직렬 queue 코어 | 03/05/07 |
| SP-09-09 | 기존 부화의 예약·취소 연결 | 08 |
| SP-09-10 | 일반 생산·실제 유닛 등록 | 08/09 |
| SP-09-11 | 출구 대기·rally 실제 이동 | 10 |
| SP-09-12 | 생산 건물 제거·예약 정리 | 09/10/11 |
| SP-09-13 | 업그레이드 시작·진행 코어 | 03/05/07/12 |
| SP-09-14 | 업그레이드 완료·공간/전투 갱신 | 13 |
| SP-09-15 | 경제 업그레이드 adapter | 14 |
| SP-09-16 | 업그레이드 취소·파괴 복구 | 14/15 |
| SP-09-17 | 연구 queue·레벨 lifecycle | 03/05/08/16 |
| SP-09-18 | 방어 연구 효과·전투 반영 | 17 |
| SP-09-19 | 생산 유닛·지원 건물 필수 효과 | 17/18 |
| SP-09-20 | 대문 상태·이동 blocker | 02/06/16 |
| SP-09-21 | 건설·성장 command card | 06/16/20 |
| SP-09-22 | 생산·연구 command card | 12/19/21 |
| SP-09-23 | same-page restart·이전 run 격리 | 22 |
| SP-09-24 | normal 경제→성장 실제 통합 | 23 |
| SP-09-25 | 전체 coverage·필수 회귀·인계 | 01~24 |

## 세부 카드

### SP-09-01 — 건물 기능·테크 범위 계약

- 상태: **완료**. 선행: SP-08.
- 읽기: buildingTemplates.ts, balanceTypes.ts, building_tech_reference.tsv, research_upgrade_provider_reference.tsv 및 SP-05/06/07 비교표.
- 수정 범위: 모든 template의 build/upgrade/produce/research/aura/gate 기능을 현재 구현·이번 필수·후속 ID로 분류한다. 원본 rawcode와 웹 ID, 가족/용병 전용 기능의 SP-12 경계를 고정한다.
- 결과: [성장 계약](./chicken_farm_w3x_artifacts/sp09_01_growth_contract.json)에 35개 전 template의 rawcode·기능·현재 연결·SP-09 담당·SP-12 이후 경계와 normal 성장 경로를 기록했다. 기본 연구와 현재 개/타워/닭에 필요한 기능은 SP-09에 남겼고 가족·용병·워크샵 콘텐츠만 SP-12로 분리했다.
- 검증: source template 35개와 artifact 35개를 대조했고 누락은 없다. `building_tech_reference.tsv`의 유닛 rawcode 조건, 연구 비용/시간/레벨, h006/h00G 대문 전이는 unknown으로 보존했다. 런타임 코드는 변경하지 않았다.

### SP-09-02 — 비용·시간·인구·취소 정책 계약

- 상태: **완료**. 선행: 01.
- 읽기: 01 계약, buildingTemplates.ts, playerWallet.ts, economyTypes.ts, startSessionConfig.ts, unit_rawcode_crosscheck.tsv.
- 수정 범위: build/upgrade/production/research별 비용 지불 시점, 취소 환불, 파괴 손실, 공급 예약, 상위 건물의 하위 조건 충족, 업그레이드 중 기능/HP/queue 정책을 표로 고정한다.
- 결과: [거래 정책 계약](./chicken_farm_w3x_artifacts/sp09_02_transaction_contract.json)에 건설·upgrade·생산·부화·연구의 비용 시점, cancel/destroy 차이, 공급 예약, 같은 tick 경합, upgrade 중 capability/HP/footprint 정책을 고정했다. W3X food는 source trace이고 web `3/0`에는 확인된 변환비가 없다는 점을 명시했다.
- 검증: normal/부족/취소/파괴/부화 취소·파괴/restart의 before/after 장부 6개를 손으로 대조했다. 현재 source의 비용·75% floor refund·blocked hatch exit·coop removal 동작과 일치하며, 런타임 구현은 변경하지 않았다.

### SP-09-03 — canonical 성장 데이터·그래프

- 상태: **완료**. 선행: 01/02.
- 읽기: buildingTemplates.ts, balanceTypes.ts, balance.ts 및 01/02 계약.
- 수정 범위: requires/upgradeTo/produces/providesResearch를 참조하는 typed 성장 정의를 정리하고 생산·연구 비용/시간/효과 설정을 추가한다.
- 결과: `growthProgression.ts`에 35개 template의 `build`/`upgrade_only`/`starter_only` 획득 규칙, core 공급값 `3/5/7`, 현재 SP-09 범위의 dog 생산 recipe, 5개 연구의 provider·비용·시간·max level·효과를 추가했다. 이 수치는 W3X 미확인 비용·시간을 대신 주장하지 않는 명시적 웹 baseline이며 SP-15에서 조정할 수 있다.
- 그래프: `tower_arcane_small`은 source upgrade가 없는 직접 건설 시작점임을 검증 중 발견해 `build`로 고정했다. 중간/상위 아케인 타워는 이어지는 upgrade-only 노드다. W3X 유닛 rawcode 요구조건은 dog recipe의 source trace로 별도 보존했고, 가족/용병/워크샵 생산은 SP-12에 남겼다.
- 검증: [progression artifact](./chicken_farm_w3x_artifacts/growth_check_progression.json)는 35개 규칙 coverage, 없는 upgrade target 0, upgrade cycle 0, normal `farm_house`/`market`에서 럼버 밀·가드 타워·family temple·arcane lab의 도달 가능성을 기록한다. `campfire`만 starter-only로 graph 밖이다. `npm run chicken:growth:check --workspace @games/chicken-farm`과 `npm run typecheck --workspace @games/chicken-farm`이 종료 코드 0이다.

### SP-09-04 — 관찰 snapshot·성장 검증 harness

- 상태: **완료**. 선행: 03.
- 읽기: main.ts debug guard, scripts/check-chicken-farm-economy.ts, scripts/check-chicken-farm-construction.ts.
- 수정 범위: run/owner별 tech, used/reserved/cap, job, upgrade, research, 거부 이유의 read-only snapshot과 최소 baseline runner를 만든다.
- 결과: `window.__chickenFarmDebug.getGrowthSnapshot(ownerPlayerId?)`와 `chicken:growth:browser`를 추가했다. snapshot은 active P3 owner의 run ID, wallet, supply used/reserved/cap/available, complete-building tech, hatch/production job, upgrade, research level/queue, 마지막 거부 이유를 복사본으로 반환한다. 아직 미구현 lifecycle은 명시적 빈 배열/null이며 이후 카드가 같은 surface를 채운다.
- 격리: snapshot은 active single-player owner만 반환하며, debug fixture로 만든 다른 owner의 성장 상태는 `null`로 차단한다. mutation API를 추가하지 않았고 runner는 `debugFixtures=false`, combat/debug economy/terrain probe off인 normal P3에서만 실행한다.
- 검증: [normal baseline artifact](./chicken_farm_w3x_artifacts/growth_check_baseline.json)는 연속 read 무변경, wallet `1500/0`, supply `used 0/reserved 0/cap 3`, job·upgrade·research level 0, P4 비노출, browser console/page/request/HTTP 오류 0을 기록한다. `npm run typecheck --workspace @games/chicken-farm` 및 `npm run chicken:growth:browser --workspace @games/chicken-farm`이 종료 코드 0이다.

### SP-09-05 — 선행조건 순수 판정기

- 상태: **완료**. 선행: 03/04.
- 읽기: buildingSystem.ts, initialPlacementRegistry.ts, 성장 정의.
- 수정 범위: 같은 owner의 살아 있는 complete 건물과 계약상 연구/유닛 조건을 조회해 단일 eligibility 결과와 실패 이유를 만든다.
- 결과: `growthEligibility.ts`에 `evaluateBuildingEligibility()`과 `evaluateGrowthEligibility()`를 추가했다. template `requires`, 선택적 연구 레벨·유닛 template 조건을 같은 owner의 alive/complete 상태로 검사하고, 누락 건물·연구·유닛과 단일/복수 실패 이유를 반환한다. rawcode/유닛 template은 문자열 exact match이며 건물 ID로 변환하지 않는다.
- 정책: source template의 upgrade chain을 따라 candidate가 요구 건물과 같거나 상위 tier이면 충족한다. 건설 중, HP 0, 다른 owner의 건물은 충족하지 않는다. 이 순수 API는 SP-09-06에서 preview/착공에 연결하며 이번 카드에서 runtime 거부는 추가하지 않았다.
- 검증: [eligibility artifact](./chicken_farm_w3x_artifacts/growth_check_eligibility.json)는 town hall→farm house 대체와 lumber mill high→base 대체, 하나/다중 부족, 다른 owner, constructing, 제거 직후를 확인한다. `npm run typecheck --workspace @games/chicken-farm` 및 `npm run chicken:growth:eligibility --workspace @games/chicken-farm`이 종료 코드 0이다.

### SP-09-06 — 건설 preview·착공 선행조건 연결

- 상태: **완료**. 선행: 05.
- 읽기: constructionPlacementSystem.ts, buildingSystem.ts, main.ts 착공 경로.
- 수정 범위: preview와 실제 착공에 같은 판정기를 연결한다. 이동/Shift 예약 중 prerequisite 또는 자원이 변하면 착공 직전에 재검사한다.
- 완료 조건: 거부된 착공은 비용·blocker·기능 등록이 0회이며 다음 예약 처리는 SP-05 계약을 유지한다. UI 우회 호출도 거부한다.
- 결과: `ConstructionPlacementSystem`이 선택된 builder owner의 complete/living 건물·유닛 상태를 `evaluateBuildingEligibility()`로 preview와 착공 직전에 각각 재평가한다. 누락 항목은 `missing_prerequisite:<template>` 형태로 남기며, 이동 중 prerequisite가 제거되면 order만 폐기하고 비용·blocker·economy 등록을 만들지 않는다.
- 검증: [growth prerequisite browser artifact](./chicken_farm_w3x_artifacts/construction_check_growth_prerequisite.json)는 미완성/완성 town hall, 반복 클릭, 이동 뒤 town hall 제거를 확인한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:prerequisite --workspace @games/chicken-farm`, `npm run chicken:construction:check --workspace @games/chicken-farm`이 종료 코드 0이다.

### SP-09-07 — 공급 cap·used lifecycle

- 상태: **완료**. 선행: 02/04.
- 읽기: playerWallet.ts, initialPlacementRegistry.ts, controllableUnitSystem.ts, economySystem.ts, buildingSystem.ts.
- 수정 범위: 기존 entity와 owner wallet에서 인구 공급/사용을 갱신하는 단일 경로를 만든다. 닭·개·농부·건물 각각의 대상 여부는 02를 따른다.
- 완료 조건: 초기 배치, 완공, 생성, 사망, 제거, 소유자 경계가 정확히 1회 반영된다. 공급 건물 파괴로 cap이 줄어도 기존 유닛을 임의 삭제하지 않는다.
- 검증: initial→complete→death→반복 remove 장부, owner 2개 격리, cap 미만/동일/초과 사례.
- 결과: `supplyLifecycle.ts`가 ID-기반 등록/해제 단일 장부를 제공한다. 완료 건물은 `growthProgression.ts`의 공급량(농가 3, 타운 홀 5, 가족 사원 7)만 cap에 반영하고, 닭 생성/사망은 used를 1회 반영한다. 시작 농부·개는 SP-09-02의 normal `0/3` 정책에 따라 명시적으로 0이다. 완료·제거 callback과 스크롤/부화/전투·자연사 닭 lifecycle에 연결했으며, 중복 callback은 no-op이다.
- 검증: [supply lifecycle artifact](./chicken_farm_w3x_artifacts/growth_check_supply_lifecycle.json)는 initial→complete→death→반복 remove, P3/P4 격리, cap 미만/동일/초과를 확인한다. [browser lifecycle artifact](./chicken_farm_w3x_artifacts/growth_check_supply.json)는 실제 닭 생성 `used 0→1`, 사망 `1→0`, 반복 제거 no-op과 browser 오류 0을 확인한다. `npm run chicken:growth:supply --workspace @games/chicken-farm`, `npm run chicken:growth:supply:browser --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다. browser normal baseline은 `used 0/cap 3`을 유지했고 console/page/request 오류는 0이다.

### SP-09-08 — 생산 예약·직렬 queue 코어

- 상태: **완료**. 선행: 03/05/07.
- 읽기: economyTypes.ts, playerWallet.ts 및 02 거래 계약.
- 수정 범위: 부화와 일반 생산이 사용할 예약/상태 규칙을 정의하고 enqueue→running→exit_wait→complete/cancelled 상태를 구현한다. 기존 hatchJobs를 중복 생성하지 않는다.
- 완료 조건: 동시 생산 시 reserved를 포함해 cap 초과를 막는다. queue 길이·병렬 capacity·비용 시점은 명시하고 실패 시 부분 차감이 없다.
- 검증: 순수 검증: FIFO/capacity, 지갑 부족, 공급 부족, 같은 tick 두 요청, 예약 해제 1회.
- 결과: `ProductionQueue`와 wallet 공급 helper를 추가했다. producer별 실행 capacity는 1, queue는 FIFO이며, accepted enqueue가 비용을 전액 차감하고 `supplyReserved`를 즉시 확보한다. running이 완료 시각에 `exit_wait`로 전이하고 출구가 허용한 `complete()`만 reservation을 used로 전환한다. player cancel은 전액 환불·reservation 해제, 파괴 정리는 환불 없이 reservation만 해제한다. 현재 부화 `hatchJobs`는 건드리지 않았고 SP-09-09가 이 코어에 연결한다.
- 관찰: `getGrowthSnapshot()`은 owner별 production job과 `available = cap - used - reserved`를 제공한다. normal baseline은 계속 `reserved 0`, 빈 production 배열이다.
- 검증: [production queue artifact](./chicken_farm_w3x_artifacts/growth_check_production_queue.json)는 FIFO/serial capacity, 지갑 부족, reserved를 포함한 같은 tick 공급 경합, complete 전환, cancel·destroy의 reservation 해제를 확인한다. `npm run chicken:growth:production-queue --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-09 — 기존 부화의 예약·취소 연결

- 상태: **완료**. 선행: 08.
- 읽기: economySystem.ts startCoopHatch/부화 update, economyTypes.ts, main.ts hatch action.
- 수정 범위: 기존 부화 capacity·알 소비·시간을 유지하며 08 예약과 취소 API에 연결한다.
- 완료 조건: 취소 시 계약만큼 알과 공급을 1회 복원한다. 없는 job·완료 job·다른 owner 요청은 무변경이고 출구 대기 중 재차 소비하지 않는다.
- 검증: 기존 hatch_start/hatch_exit 회귀와 active/queued/exit_wait 취소, 만원 inventory 반환 사례.
- 결과: `startCoopHatch()`는 기존 capacity·알 소비·시간을 보존하면서 accepted job마다 supply 1을 예약한다. 출구 대기는 예약을 유지하고 실제 출구 확보 때만 reserved→used를 전환한다. `cancelCoopHatch()`는 owner와 coop을 검증하고 inventory 공간이 있을 때만 egg 1·reservation 1을 함께 복원하며, 완료/없는 job/다른 owner/가득 찬 inventory는 무변경이다. 완료된 닭은 `SupplyLifecycle.adoptReservedChicken()`으로 등록해 used 이중 가산 없이 사망 시 정상 해제된다. 건물 파괴 시 job 정리·무환불은 SP-09-12 범위를 유지한다.
- 검증: [hatch reservation artifact](./chicken_farm_w3x_artifacts/growth_check_hatch_reservation.json)는 active/exit_wait 취소, 완료/반복/다른 owner no-op, full inventory 실패와 reserved→used를 확인한다. `npm run chicken:growth:hatch-reservation --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `CHICKEN_FARM_ECONOMY_CASE=hatch_start npm run chicken:economy:check --workspace @games/chicken-farm`, `CHICKEN_FARM_ECONOMY_CASE=hatch_exit npm run chicken:economy:check --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-10 — 일반 생산·실제 유닛 등록

- 상태: **완료**. 선행: 08/09.
- 읽기: buildingTemplates.ts produces, controllableUnitSystem.ts, combatPocSystem.ts, main.ts 초기 유닛 등록.
- 수정 범위: 01에서 확정한 SP-09 생산 목록을 기존 실제 유닛 생성·전투 등록 경로에 연결한다.
- 완료 조건: 완성·소유 건물에서만 생산하며 실제 이동/선택/피격 가능한 유닛을 정확히 1기 등록한다. SP-12 전용 목록은 미지원 이유를 표시하고 성공으로 응답하지 않는다.
- 검증: 최소 기존 개 생산의 실제 snapshot/선택/전투 target 확인 및 다른 필수 생산 항목별 데이터 사례. fixture spawn만으로 완료하지 않는다.
- 결과: `requestDogProduction()`은 complete·owner 일치·`farm_house`/`town_hall` producer만 canonical dog recipe로 enqueue한다. queue completion은 실제 `ControllableUnitSystem.createProducedDog()`를 호출해 고유 `produced-<job>` entity를 만들고, combat의 controllable target 경로에 즉시 포함한다. reservation 완료 뒤 `SupplyLifecycle.adoptReservedUnit()`으로 등록해 used 이중 가산 없이 사망 때 해제된다. SP-12 전용 rawcode/가족·용병 생산은 API가 없으므로 성공 경로가 없다. 생산 건물 제거 정리는 SP-09-12, shared exit blocker/rally는 SP-09-11에서 현재 임시 spawn point를 대체한다.
- 검증: [production browser artifact](./chicken_farm_w3x_artifacts/growth_check_production.json)는 완료 농가의 dog enqueue, `reserved 1→used 1`, 빈 queue, 실제 dog entity 등록과 browser 오류 0을 확인한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:production --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-11 — 출구 대기·rally 실제 이동

- 상태: **완료**. 선행: 10.
- 읽기: buildingProductionExit.ts, buildingSystem.ts getRallyPoint/setRallyPoint, playerControlSystem.ts.
- 수정 범위: 부화/일반 생산에 기존 출구 resolver를 공유하고 resolved=false에서는 대기한다. 건물 rally 입력과 생성 후 이동 명령을 연결한다.
- 완료 조건: terrain·dynamic blocker가 막으면 유닛이 생성되지 않고 예약이 유지된다. 출구 해제 시 1회 생성, rally는 정상 pathing을 이용한다.
- 검증: browser: 전체 출구 봉쇄→해제, 유효/도달 불가 rally, 우클릭의 건물/유닛 선택 분기.
- 결과: 일반 dog 생산은 `BuildingSystem.getProductionExit()`를 통해 부화와 같은 `resolveBuildingProductionExit()`를 사용한다. exit resolver가 실패하면 `exit_wait`·reservation을 유지하고, 해제 후에만 dog 1기를 생성·complete한다. `BuildingSystem` rally point가 있으면 생성 직후 기존 `issueMoveCommandToUnits()` pathing으로 move order를 부여한다. 부화도 동일 occupancy predicate와 coop building rally point를 받아 생성된 chicken의 AI target으로 적용한다. world command-card/우클릭 입력 분기는 SP-09-21/22 범위에 남는다.
- 검증: [production browser artifact](./chicken_farm_w3x_artifacts/growth_check_production.json)는 전체 출구 봉쇄 시 `exit_wait`/reserved 유지, 해제 뒤 1회 생성·used 전환, rally move command와 browser 오류 0을 확인한다. 기존 hatch exit browser 회귀도 유지했다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:production --workspace @games/chicken-farm`, `npm run chicken:economy:check --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-12 — 생산 건물 제거·예약 정리

- 상태: **완료**. 선행: 09/10/11.
- 읽기: buildingSystem.ts 제거 callback, buildingEconomyAdapter.ts, economySystem.ts unregister 경로.
- 수정 범위: 생산 도중 건물 파괴/제거 시 모든 job과 예약을 단일 lifecycle에서 정리한다.
- 완료 조건: cancel과 destroyed의 환불 차이를 지키고 파괴 뒤 late completion·유령 유닛·음수 reserved가 없다.
- 검증: 실제 적 피해로 제거, 반복 remove, 취소와 완료/파괴가 같은 tick에 발생하는 사례.
- 결과: `handleBuildingRemoved()`가 `ProductionQueue.discardProducer()`를 먼저 호출해 dog production의 모든 active/queued/exit_wait reservation을 비용 환불 없이 해제한다. `removeEconomyBuilding()`도 coop hatch job을 제거하기 전 owner wallet의 hatch reservation을 해제한다. 양쪽 모두 ID 제거 뒤 반복 호출은 no-op이며 기존 building supply cap 해제와 economy detach를 유지한다.
- 검증: [production browser artifact](./chicken_farm_w3x_artifacts/growth_check_production.json)는 실제 적 피해로 생산 중 농가를 제거해 job/reserved가 0, 비용 무환불, 이후 late completion 유령 dog 0을 확인한다. [hatch reservation artifact](./chicken_farm_w3x_artifacts/growth_check_hatch_reservation.json)는 coop 파괴 시 egg 무환불·reservation 해제·반복 제거 no-op을 확인한다. `npm run chicken:growth:hatch-reservation --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:growth:production --workspace @games/chicken-farm`, `npm run chicken:economy:check --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-13 — 업그레이드 시작·진행 코어

- 상태: **완료**. 선행: 03/05/07/12.
- 읽기: buildingSystem.ts, 성장 정의, playerWallet.ts.
- 수정 범위: complete 건물의 upgradeTo를 요청하고 선행조건/자원/queue 충돌을 검사해 시간 기반 upgrade 상태로 전이한다.
- 완료 조건: building ID·owner·선택을 유지하고 비용 1회 차감, 진행 중 기능/공급/생산 허용은 02 정책을 따른다. 완료 adapter는 다음 카드다.
- 검증: 순수·browser: 정상 시작, 불법 tier, 자원/조건 부족, 연타, 생산 중 충돌, 진행률.
- 결과: `BuildingUpgradeSystem`이 building ID별 `running → ready` 시간 상태와 start 시점의 비용 1회 차감을 소유한다. `requestBuildingUpgrade()`는 complete/owner 일치 source의 canonical `upgradeTo`만 읽고, target의 same-owner living/complete prerequisite와 wallet을 재검사하며, production job이 남은 건물·이미 upgrade 중인 건물·upgradeTo 없는 건물을 거부한다. upgrade 중에는 새 dog 생산도 막는다. 건물 entity 자체는 바꾸지 않으므로 ID·owner·선택과 source 기능/공급은 유지되며, `ready` 뒤 target template/공간·전투/economy adapter 적용은 SP-09-14/15에 남긴다.
- 관찰: `getGrowthSnapshot()`의 owner-local `upgrades`에 source/target, 완료 시각, `running|ready`를 노출했다. normal baseline은 빈 배열을 유지한다.
- 검증: [순수 upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_building_upgrades.json)는 조건/자원 부족 무차감, owner 격리, 단일 차감과 deadline 전후 상태를 확인한다. [browser upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_upgrade.json)는 market prerequisite 부족, `well_basic` 불법 tier, production↔upgrade 상호 배제, 연타 무차감, `ready` 진행 및 source `farm_house` 보존을 확인했고 browser 오류는 0이다. `npm run chicken:growth:upgrades --workspace @games/chicken-farm`, `npm run chicken:growth:upgrades:browser --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-14 — 업그레이드 완료·공간/전투 갱신

- 상태: **완료**. 선행: 13.
- 읽기: buildingSystem.ts, visibilitySystem.ts, combat/towerCombatAdapter.ts, combatPocSystem.ts.
- 수정 범위: 완료 시 template/HP/armor/attack/footprint/시야를 원자적으로 교체하고 기존 combat target을 갱신한다.
- 완료 조건: ID·owner·선택·타깃 참조를 보존하며 blocker 중복이나 HP 전회복 악용이 없다. footprint 확장 실패는 02 정책에 따라 보류/거부한다.
- 검증: 실제 피해를 받은 펜스/타워 upgrade, blocker/시야 before-after, 공격 수치 변경, 겹침 확장 거부.
- 결과: `BuildingSystem.upgradeBuilding()`이 source의 direct `upgradeTo`만 받아 live building object의 template, armor, HP/max HP, path blocker footprint, targetable 상태와 view를 한 번에 교체한다. ID·owner·rally/선택 참조는 같은 object에 남고, HP는 source의 현재 비율로 환산해 이미 입은 피해가 full heal로 사라지지 않는다. 전투는 기존 `BuildingSystem.updateBuildingCombat()`이 변경된 template의 attack profile을 즉시 읽고, vision/minimap은 completion 직후 강제 갱신한다. `SupplyLifecycle.replaceBuilding()`은 tier의 supply 제공량만 차이로 갱신한다.
- 공간 정책: target footprint의 다른 live building 겹침, world boundary 또는 terrain blocker가 있으면 paid job을 `ready`로 보류하고 source를 유지한다. 장애물이 사라진 이후 같은 job만 원자 적용한다. 비용 환불/취소·파괴 종료는 SP-09-16 범위다. 경제 entity tier adapter는 SP-09-15에 남긴다.
- 검증: [browser upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_upgrade.json)는 farm house→town hall의 ID/owner 보존, damaged HP 비율 보존, armor `5→7`, supply cap `+2`, tower scout→guard small attack profile `23/384/1.05 → 22/225/0.9`, overlap `ready` 보류→blocker 제거 후 1회 완료와 browser 오류 0을 확인한다. `npm run chicken:growth:upgrades:browser --workspace @games/chicken-farm`, `npm run chicken:growth:upgrades --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-15 — 경제 업그레이드 adapter

- 상태: **완료**. 선행: 14.
- 읽기: buildingEconomyAdapter.ts, economySystem.ts upgradeEconomyWellToWindmill/coop/lumber income.
- 수정 범위: 닭장·우물·시장·럼버 밀 tier 전환을 동일 entity의 경제 상태에 반영한다.
- 완료 조건: inventory/기존 job/owner를 보존하고 용량 축소 처리는 계약을 따른다. 럼버 밀은 기존 global 30초 위상을 유지하며 70/110/170 지급이 중복되지 않는다.
- 검증: 닭장 알 보유 upgrade, 우물 효과, 시장 변환, 30초 직전/직후 럼버 밀 upgrade의 장부.
- 결과: `upgradeCompletedBuildingEconomy()`가 world completion 뒤 stable building ID의 derived economy record만 in-place 전환한다. coop은 kind/position만 바꾸어 stored egg, inventory, active hatch와 owner를 보존하고, 기존 hatch의 결과 kind/reservation은 재작성하지 않는다. `egg_storage → coop_basic`처럼 이전 capability가 없는 direct route는 같은 ID로 coop/inventory를 처음 생성한다. lumber mill은 `templateId`만 교체해 `activeFromSec`와 global `lastLumberIncomeTickSec`를 그대로 둔다. market/grand market은 별도 economy entity 없이 이미 stable world building ID를 조회하므로 adapter도 같은 ID를 유지한다.
- 범위 판정: 현재 canonical growth graph에는 `well_basic`/windmill 대상 `upgradeTo`가 없다. existing `upgradeEconomyWellToWindmill()` 효과는 보존했지만 임의 template route를 만들지 않았고, well record는 현재/향후 동일-ID 이동 갱신만 한다. tier 전환의 취소·파괴 rollback은 SP-09-16에서 처리한다.
- 관찰: economy lifecycle snapshot의 coop에 `kind`를 추가해 browser에서 runtime tier를 확인할 수 있다.
- 검증: [순수 economy adapter artifact](./chicken_farm_w3x_artifacts/growth_check_economy_upgrades.json)는 coop basic→mid의 egg/inventory/job identity 보존·새 capacity, egg storage→첫 coop capability, market stable ID, lumber global phase에서 `30s:70`, `60s:110`, `90s:170` 단일 지급을 확인한다. [browser upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_upgrade.json)는 실제 `coop_basic → coop_mid` completion과 same-ID economy kind 전환, 이전 template/전투/공간 사례 및 browser 오류 0을 확인한다. `npm run chicken:growth:economy-upgrades --workspace @games/chicken-farm`, `npm run chicken:growth:upgrades:browser --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-16 — 업그레이드 취소·파괴 복구

- 상태: **완료**. 선행: 14/15.
- 읽기: upgrade 상태, buildingSystem.ts 제거 경로, economy/combat adapter.
- 수정 범위: 진행 중 취소는 이전 template과 계약상 비용/HP 상태로 되돌리고, 파괴는 제거 경로로 종료한다.
- 완료 조건: 완료/취소 경합·반복 요청에도 환불은 최대 1회이며 파괴된 건물이 완료 callback으로 복원되지 않는다.
- 검증: 시작 직후/완료 직전 취소, 실제 적 공격 파괴, 선행 건물 소실 중 upgrade 정책 사례.
- 결과: `BuildingUpgradeSystem.cancel()`은 owner를 확인한 running/ready job만 삭제하고 target web cost의 `floor(75%)`를 한 번 환불한다. source building은 completion 전까지 변경되지 않으므로 취소는 template/HP/footprint/economy state를 그대로 보존한다. `handleBuildingRemoved()`는 production/hatch 정리보다 먼저 `buildingUpgrades.discard()`를 호출해 combat destroy·debug remove 모두 upgrade job을 무환불 폐기한다. 이미 job이 없는 completion/cancel/discard는 no-op이다.
- 정책: prerequisite는 accepted start 시점에 snapshot 판정한다. 시작 뒤 요구 building이 사라져도 이미 결제된 source upgrade는 계속 completion을 시도한다. source building 자체가 파괴되면 destruction이 우선하며 ready/running callback은 재생성하지 않는다. 취소/파괴의 economy rollback을 별도로 수행하지 않는 이유는 target economy adapter가 completion에서만 적용되기 때문이다.
- 검증: [순수 upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_building_upgrades.json)는 ready 직전/후 owner 경계, 75% floor 단일 refund, repeat cancel no-op, ready discard 무환불과 late complete 차단을 확인한다. [browser upgrade artifact](./chicken_farm_w3x_artifacts/growth_check_upgrade.json)는 prerequisite well 제거 뒤 accepted market upgrade 완료, farm cancel refund 한 번, 실제 적 피해 파괴 후 job 0·무환불·deadline 이후 ghost restore 0 및 browser 오류 0을 확인한다. `npm run chicken:growth:upgrades --workspace @games/chicken-farm`, `npm run chicken:growth:upgrades:browser --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `npm run chicken:growth:browser --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-17 — 연구 queue·레벨 lifecycle

- 상태: **완료**. 선행: 03/05/08/16.
- 읽기: research_upgrade_provider_reference.tsv, providesResearch, 성장 정의.
- 수정 범위: 01의 필수 연구에 owner별 레벨/비용/시간/max level 및 연구 job을 연결한다.
- 완료 조건: 동일 owner가 제공 건물 2개로 같은 다음 레벨을 중복 구매하지 못한다. 취소/제공 건물 파괴/완료의 비용·레벨 적용이 1회다. 효과 적용은 18/19다.
- 결과: `ResearchQueue`가 provider별 단일 job과 owner별 연구 level을 분리해 관리한다. 수락 시 정의된 level 비용을 한 번 결제하고, 같은 owner/research key의 다음 level은 다른 provider에서도 예약할 수 없다. 완료는 예약된 바로 다음 level일 때만 1회 적용한다. 효과 수치의 실제 반영은 SP-09-18/19에 남긴다.
- 정책: player cancel은 선언 비용 전액을 한 번 환불한다. provider 제거는 job을 무환불 폐기하므로 destroy가 ready completion보다 우선한다. provider가 upgrade 등으로 연구 제공 자격을 잃은 경우 ready completion도 무환불 폐기한다.
- 검증: [순수 research artifact](./chicken_farm_w3x_artifacts/growth_check_research_queue.json)는 next-level 중복 차단, provider serial, owner 격리, full cancel refund, destroy 무환불/late complete 차단과 level 3 max no-charge를 확인한다. [browser research artifact](./chicken_farm_w3x_artifacts/growth_check_research.json)는 실제 lumber mill 두 개에서 masonry 중복 차단, 취소 전액 환불, completion level 1과 browser 오류 0을 확인한다. `npm run chicken:growth:research --workspace @games/chicken-farm`, `npm run chicken:growth:research:browser --workspace @games/chicken-farm`, `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`은 종료 코드 0이다.

### SP-09-18 — 방어 연구 효과·전투 반영

- 상태: **미착수**. 선행: 17.
- 읽기: combatPocSystem.ts, combat/towerCombatAdapter.ts, buildingSystem.ts, 연구 정의.
- 수정 범위: 01에서 지정한 타워 공격·건물 HP/armor 연구를 실제 전투 수치 계산에 적용한다. 미확인 R006 효과는 임의로 복원하지 않는다.
- 완료 조건: 기존/새 타워·upgrade된 타워에 같은 레벨이 적용되며 base+level 계산으로 중복 누적을 막는다.
- 검증: 동일 적에 대한 연구 전후 실제 damage·공격 간격·건물 피해량, 새 생성/upgrade 후 동일 효과.

### SP-09-19 — 생산 유닛·지원 건물 필수 효과

- 상태: **미착수**. 선행: 17/18.
- 읽기: 01 기능 coverage, controllableUnitSystem.ts, combatPocSystem.ts, buildingTemplates.ts aura.
- 수정 범위: 01에서 SP-09로 확정한 개 연구와 지원 건물 효과를 실제 대상에 연결한다. 가족/용병 전용 연구는 SP-12 담당을 유지한다.
- 완료 조건: 기존/새 유닛, owner, 범위, 건물 파괴에 따른 효과 종료를 검증한다. 효과군이 크면 19-a 등으로 분리하고 전체 완료 전 19를 닫지 않는다.
- 검증: 개 연구 전후 실제 공격/이동 중 계약상 대상 수치와 support aura 범위 안/밖·owner·제거 사례.

### SP-09-20 — 대문 상태·이동 blocker

- 상태: **미착수**. 선행: 02/06/16.
- 읽기: gate_wood template, terrainBlocker.ts, buildingSystem.ts, h006/h00G 원본 자료.
- 수정 범위: open/close 명령과 이동 blocker 전환을 구현한다. build occupancy와 movement blocker를 구분한다.
- 완료 조건: 열어도 건물 footprint에 겹쳐 짓지 못하고 닫힐 때 유닛 끼임을 방지한다. HP/owner/target ID는 유지한다. 미관찰 원본 동작은 웹 정책으로 표시한다.
- 검증: browser: open 통과/closed 우회, 점유 중 close 실패 이유, gate 파괴 후 재경로. Warsmash 관찰을 완료했다고 쓰지 않는다.

### SP-09-21 — 건설·성장 command card

- 상태: **미착수**. 선행: 06/16/20.
- 읽기: commandCardSystem.ts, farmHud.ts, main.ts action dispatch.
- 수정 범위: 럼버 밀/타워를 포함한 필수 build 목록, upgrade 시작/취소, gate 명령을 기존 HUD에 연결한다.
- 완료 조건: 페이지·단축키 충돌 없이 도달 가능하고 비용/선행조건/진행/거부 이유를 표시한다. 화면 버튼과 hotkey가 같은 검증 API를 사용한다.
- 검증: 실제 클릭/키 입력으로 build→upgrade→cancel, 잠금 해제 갱신, HUD 입력의 월드 누출 없음.

### SP-09-22 — 생산·연구 command card

- 상태: **미착수**. 선행: 12/19/21.
- 읽기: commandCardSystem.ts, farmHud.ts, main.ts, 생산/연구 snapshot.
- 수정 범위: 생산/부화 queue·취소·rally·연구 목록·레벨·진행과 used/reserved/cap을 기존 HUD에 표시하고 명령에 연결한다.
- 완료 조건: 선택 변경 후 다른 건물 job을 잘못 취소하지 않고, 완료/파괴/자원 변경 시 버튼과 이유가 갱신된다.
- 검증: 실제 입력으로 enqueue/취소/연구/선택 전환, hotkey 일치, world click 누출과 다른 owner 거부.

### SP-09-23 — same-page restart·이전 run 격리

- 상태: **미착수**. 선행: 22.
- 읽기: main.ts shutdown/restart, growth snapshot, 기존 restart runner.
- 수정 범위: queue/upgrade/research/gate와 공급 상태가 있는 판을 같은 page에서 재시작한다.
- 완료 조건: job/timer/예약/연구 레벨/rally/열린 gate/선택이 초기화되고 이전 run의 완료나 환불이 새 wallet에 영향을 주지 않는다.
- 검증: 두 번 연속 restart, pending/running/exit_wait 상태 포함, 새 normal 기준 snapshot·오류 0.

### SP-09-24 — normal 경제→성장 실제 통합

- 상태: **미착수**. 선행: 23.
- 읽기: current context 정상 시작 계약, growth/economy browser runner.
- 수정 범위: fixture 없는 normal P3 시작 자원과 실제 입력으로 농가·경제·럼버 밀·타워 접근, 생산/취소, 필수 upgrade/연구 대표 경로를 재현한다.
- 완료 조건: 자원 획득/비용/공급 장부와 실제 효과 증거를 남긴다. 각 대표 경로를 새 run으로 분리해도 되며 자원 주입·시간 가속 증거와 구별한다. 첫 wave 전 타워 완성을 임의 필수화하지 않는다.
- 검증: 정상 속도 browser artifact와 오류 0. 후반 전체 tier는 별도 명시적 가속 coverage로 확인하며 밸런스 조정은 SP-15로 인계한다.

### SP-09-25 — 전체 coverage·필수 회귀·인계

- 상태: **미착수**. 선행: 01~24.
- 읽기: 01 기능표, 모든 growth artifact, SP-05~08 runner와 비교표.
- 수정 범위: 각 필수 건물/생산/연구/upgrade edge에 구현과 검증 증거를 매핑하고 기존 회귀를 실행한다. SP-09 W3X 비교표와 후속 인계를 작성한다.
- 완료 조건: 필수 미완료가 있으면 SP-09를 완료 처리하지 않는다. 후속은 구체 기능·이유·담당 SP를 적고 current context/backlog의 다음 실행을 SP-10으로 맞춘다.
- 검증: typecheck/build, growth 전체 지원 사례, economy all/combat all, construction lifecycle·controls·wave normal/phase·restart 관련 사례. runner에 없는 all selector를 가정하지 않는다.

## Terra Medium 실행 요청 템플릿

```text
닭농장 SP-09-01만 진행해줘.
docs/chicken_farm/chicken_farm_sp09_task_plan.md와 current context를 읽고,
해당 카드의 읽기 범위·수정 범위·완료 조건·검증을 따라 작업해줘.
원본 근거·웹 정책·미확인을 구분하고 기존 사용자 수정은 보존해줘.
결과·실행 명령·artifact·남은 문제·다음 ID를 기록하고 다음 task는 시작하지 마.
```

02 이후에는 ID만 바꾼다. 이 계획을 작성한 것만으로 SP-09 구현이나 runtime 검증을 완료 처리하지 않는다.

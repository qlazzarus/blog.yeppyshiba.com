# SP-07 — 실제 맵 전투 연결 세부 실행 계획

> 갱신: 2026-10-08. Terra Medium에서 **한 요청에 한 ID**씩 실행한다. SP-07-01~16을 완료했다. 다음 구현 대상은 **SP-08**이다.

## 목표와 경계

정상 맵의 농부·개·닭·건물과 적이 같은 entity ID·owner·HP를 기준으로 탐색, 공격, 피해, 사망을 처리하게 한다. 펜스 파괴는 실제 blocker 제거와 재경로로 이어지고, attack-move는 교전 뒤 원래 목적지와 Shift 예약으로 복귀해야 한다. SP-04~06 및 SP-06.5 완료를 선행으로 삼는다.

SP-08의 spawn rect·단계별 population·웨이브 시간표는 구현하지 않는다. 전투 서비스는 normal에서도 동작하되 PoC 건물·늑대를 자동 생성하지 않는다. 적이 필요한 검증은 명시적 fixture로 실제 맵의 runtime 적 생성 API를 호출한다. fixture 없는 normal 시작 검증과 fixture 전투 검증을 분리하고, 자연 웨이브까지 완료했다고 기록하지 않는다. SP-08이 재사용할 생성·제거·목표 지정 API는 이 작업의 산출물이다.

생산·선행조건·업그레이드 UI는 SP-09, 보스 능력·보상은 SP-10, 승패와 종료는 SP-11, 부활·NPC 확장은 SP-12, pause/hidden 정책은 SP-13에 유지한다. 기존 도형과 HUD를 활용하며 전면 scene 재작성이나 아트 교체는 포함하지 않는다.

## 정적 확인과 우선 위험

경로는 별도 표기가 없으면 `games/chicken-farm/src/` 기준이다.

| 현재 소스 | 확인 사항과 구현 시 주의점 |
| --- | --- |
| `main.ts` 전투 생성·update·hitTest | `combat` 또는 `combatSmoke` 플래그일 때만 `CombatPocSystem`을 만든다. 플래그만 켜면 PoC layout까지 들어오므로 서비스 초기화와 fixture 생성을 분리해야 한다. |
| `game/systems/combatPocSystem.ts` | 내부 `combatBuildings`와 늑대 HP를 관리한다. 외부 건물은 dynamic blocker로 받지만 실제 건물 피해 callback은 현재 생성 설정에 없다. 실제 HP를 복제한 두 번째 장부를 만들지 않는다. |
| `game/systems/buildingSystem.ts` | `updateBuildingCombat`, `findBuildingCombatTarget`, `removeCompletedBuilding`과 적 조회/피해 callback이 이미 있다. 재사용하되 시야·사거리·사망 중복 처리와 미완성 건물 정책을 대조한다. |
| `game/systems/controllableUnitSystem.ts`, `playerCommandTypes.ts` | 피해·공격 대상 타입과 attack/attack_move 명령이 존재한다. 실제 입력, 자동 탐색, 명령 복귀를 따로 검수한다. |
| `game/systems/economySystem.ts`, `buildingEconomyAdapter.ts` | 건물 제거와 경제 정리가 연결돼 있다. 적 피해도 같은 lifecycle을 거쳐야 산란·부화·판매·럼버 밀 수입이 멈춘다. |
| `game/systems/wolfAiStateMachine.ts`, `combat/` | 기존 AI·경로·타워 adapter를 재사용한다. PoC 좌표·목표·상수 의존은 실제 entity 연결과 구분해 제거한다. |

위 표는 소스 정적 확인 결과이며 실제 플레이 통과 근거가 아니다. 원본 수치·규칙은 `balance.ts`, SP-01 계약과 로컬 W3X 추출 artifact의 관련 행을 대조한다. 미확인 원본 동작은 확인 필요로 남긴다.

## 실행 순서

01부터 16까지 순차 실행한다. 선행 열은 코드 의존성이며 병렬 에이전트 지시가 아니다. 한 카드가 커지면 구현 전에 `-A/-B`로 분리해 산출물과 인계를 기록한다. ID 수로 시간·모델 사용량을 보장하지 않는다.

| ID | 작업 | 선행 | 상태 |
| --- | --- | --- | --- |
| SP-07-01 | 전투 대상·수치·명령·사망 계약 | SP-04~06.5 | 완료 — 정적 계약, runtime 미검증 |
| SP-07-02 | 전투 snapshot·browser harness | 01 | 완료 — normal baseline/all browser 통과 |
| SP-07-03 | normal 전투 서비스와 적 lifecycle | 02 | 완료 — explicit runtime enemy fixture lifecycle 통과 |
| SP-07-04 | 농부·개·닭의 실제 target 연결 | 03 | 완료 — normal 분양과 fixture 생성·사망 target 동기화 |
| SP-07-05 | 건물 target·피해·파괴 연결 | 03/04 | 완료 — 완료 건물 단일 피해·제거 경계, 공사 중 대상 제외 |
| SP-07-06 | acquire·시야·사거리 판정 | 04/05 | 완료 — runtime wolf targeting probe |
| SP-07-07 | 농부·개의 직접 공격과 적 사망 | 06 | 완료 — actual right-click·cooldown·사망 정리 |
| SP-07-08 | 실제 완공 타워 공격 | 06/07 | 완료 — runtime 적 공격과 제거 뒤 중단 |
| SP-07-09 | 늑대 공격·농부/개/닭 사망 정리 | 06/07 | 완료 — economy 닭 실제 사망·target/view 정리 |
| SP-07-10 | 건물 파괴와 경제 lifecycle 회귀 | 05/09 | 완료 — 전투 피해 제거 뒤 economy detach·수입 중단 |
| SP-07-11 | 펜스 blocker 공격·파괴·재경로 | 05/06/09 | 완료 — SP-07-16 blocker browser 재경로 통과 |
| SP-07-12 | attack-move 교전·목적지 복귀 | 07/09/11 | 완료 — 교전 대상과 원래 목적지를 분리해 복귀·재탐색 |
| SP-07-13 | Stop·명령 교체·Shift 예약 복귀 | 12 | 완료 — 기존 Stop·replace·FIFO·실패 예약 경계 browser 확인 |
| SP-07-14 | 전투 상태가 있는 same-page restart | 08~13 | 완료 — run-scoped callback guard와 2회 restart 전투 격리 |
| SP-07-15 | 실제 맵 통합 전투 browser 검수 | 14 | 완료 — actual P3 닭·펜스·우클릭 공격과 explicit 적 fixture |
| SP-07-16 | 필수 회귀·원본 비교·SP-08 인계 | 01~15 | 완료 — 전체 필수 회귀와 인계 기록 |

## 공통 실행·검증 규칙

- 먼저 이 문서, current context의 최신 상태, 해당 카드의 파일/함수만 읽는다. 과거 계획 전체와 대형 artifact를 한꺼번에 읽지 않는다.
- HP·owner·위치·생존 여부는 각 실제 entity의 단일 원본에서 읽는다. 관찰 snapshot은 복사본이며 상태를 변경하지 않는다. target key는 run/entity를 구분하고 죽거나 제거된 대상을 다시 공격하지 않는다.
- 전투 수치·시간은 canonical 설정과 simulation clock을 쓴다. 방어력·최소 피해·cooldown 소비 시점·공격 취소 정책을 01에서 확정하고 모든 공격자가 공유한다.
- runtime 수정 카드는 `npm run typecheck --workspace @games/chicken-farm`와 해당 신규 사례를 실행한다. 공통 경로/건설/경제/명령 코드를 변경하면 관련 회귀를 추가한다. 전체 회귀는 16에서 실행한다.
- browser는 유한 timeout과 상태 기반 대기를 쓴다. artifact에는 runId/profile/fixture 여부, 실제 입력 또는 API 호출, expected/actual/pass, console·page·request·HTTP 오류, 명령과 종료 코드를 남긴다. 직접 HP=0 설정이나 remove 호출로 실제 공격→사망 검증을 대체하지 않는다.
- 각 카드 종료 시 상태, 변경 파일, 실행 명령/결과, artifact, 미확인 사항, 다음 ID를 해당 카드 아래 기록한다. 실패·환경 차단은 완료로 표시하지 않는다.

## 세부 작업 카드

### SP-07-01 — 전투 계약

- 읽기: SP-01 방어/패배 계약, `balance.ts`, `playerCommandTypes.ts`, `combatPocSystem.ts`의 target/attack 함수, `controllableUnitSystem.ts` 피해·명령 처리, SP-05/06/06.5 제거 정책.
- 작업: 공격자×대상 표(농부/개/타워/늑대 대 농부/개/닭/건물/적), owner·중립·아군 제외, 미완성 건물, 시야/공격선/사거리/추적 해제, HP·armor·cooldown, 죽은 대상·동시 타격·파괴 환불·명령 복귀를 확정한다. 초기 registry의 적/중립 중 SP-07 대상과 SP-08/12 보류 대상을 명시한다.
- 완료: 원본 사실/현재 구현/이번 결정을 분리한 `sp07_01_combat_contract.json`과 normal P3 재현 좌표·합법적 건설/타워 접근 경로를 남긴다. 정상 접근이 없는 타워는 fixture 검증으로 명시하고 SP-09 UI를 끌어오지 않는다.
- 검증: 관련 코드와 W3X artifact 정적 대조, 문서 diff 검사. runtime 통과 주장은 하지 않는다.

#### SP-07-01 결과

- 상태: **완료**. [전투 계약 artifact](./chicken_farm_w3x_artifacts/sp07_01_combat_contract.json)에 normal P3의 owner 3 농부·개, 실제 entity별 단일 HP/owner 권한, 공격자·대상 경계, 피해·cooldown·사망·환불 정책, 명령 복귀를 확정했다. 게임 코드와 browser/runtime 검증은 수행하지 않았다.
- 원본 근거: `combat_unit_stats_reference.tsv`는 농부 `H000`, 개 `n002`, 팀버 울프 `n007`의 지상·구조물 공격 가능성을 보이고, `jass_wolf_order_flows.tsv`는 Player(10) 늑대를 농장 영역으로 `attack` 명령한 뒤 60초마다 새로 지정한다. JASS에는 농부/닭/건물의 세부 우선순위가 없으므로 웹의 owner·생존·거리·시야 규칙은 제품 결정으로 분리했다.
- 현재 코드 대조: `ControllableUnitState`, `EconomyChickenState`, `PlayerBuilding`을 각각 해당 entity의 HP·owner·위치 단일 원본으로 유지한다. `BuildingSystem`에는 완공 타워의 적 탐색·피해 callback이 있고, 유닛은 direct attack/attack-move 타입을 가진다. 그러나 `main.ts`는 `combat`/`combatSmoke` flag일 때만 `CombatPocSystem`을 만들며 normal에는 runtime 적 registry가 없다. 또한 현재 attack-move는 임시 적을 direct attack으로 바꾸어 원래 목적지를 보존하지 못한다.
- 정책: 피해는 `max(1, rawDamage - armor)`로 한 번만 적용하고 HP 0 전이는 idempotent하게 만든다. 건물은 완공 상태면서 `targetableByWolves`일 때만 대상이며 적 파괴에는 환불이 없다. 농부 사망은 SP-11의 부활·최종 패배로 인계하고, 개·닭·일반 건물 상실로는 패배하지 않는다. wave와 자연 적 생성은 SP-08, 기술/UI는 SP-09, 보스/보상은 SP-10, NPC·늑대의 돌·거미는 SP-12에 유지한다.
- 정상 P3 재현 경로: SP-05-01의 정적 WPM 통과 입력인 `fence_wood (3584,8896)` → footprint `(3520,8832,128×128)`을 첫 방벽 기준으로 고정했다. 타워 좌표는 겹침 없는 WPM assertion 없이 추정하지 않으며, SP-07-03의 명시적 적 fixture 이후 별도 검증 좌표로 확정한다. 이는 natural wave 증거가 아니다.
- 검증: 관련 TypeScript·W3X artifact 정적 대조와 `git diff --check`를 수행했다. Typecheck/build/browser는 문서·artifact 변경만 있으므로 실행하지 않았다.
- 다음 ID: **SP-07-02 — 전투 snapshot·browser harness**.

### SP-07-02 — 관찰과 검증 진입점

- 읽기: `main.ts`의 `__chickenFarmDebug`, `scripts/check-chicken-farm-controls.ts`, `scripts/check-chicken-farm-economy.ts`의 harness.
- 작업: target ID/kind/owner/HP/위치, 공격자 focus·cooldown, 명령/목적지/queue, blocker revision과 사망/피해 관찰값을 읽는 snapshot을 추가한다. `scripts/check-chicken-farm-combat.ts`와 workspace `chicken:combat:check`, `CHICKEN_FARM_COMBAT_CASE` selector를 신설한다.
- 완료/검증: `baseline`에서 normal P3의 fixture 유입 0, snapshot 부작용 0, 오류 0. `combat_check_<case>.json` 저장 및 지원 case 목록을 문서화한다. 이 명령은 현재 존재하지 않으며 이 카드에서 생성 후 실행한다.

#### SP-07-02 결과

- 상태: **완료**. `getCombatLifecycleSnapshot()`을 `__chickenFarmDebug`에 추가했다. snapshot은 runId·elapsed time, 농부/개의 ID·owner·HP·armor·위치·현재 명령/queue·다음 공격 시각, economy 닭의 ID·owner·HP·AI·위치, 건물의 ID·owner·HP·armor·상태·targetability, combat PoC 유무/수만 복사해 반환한다. `CombatPocSystem`에는 read-only count snapshot을 추가했다.
- harness: `scripts/check-chicken-farm-combat.ts`와 `npm run chicken:combat:check --workspace @games/chicken-farm`을 신설했다. 지원 selector는 `baseline`, `all`이다. 각 실행은 `combat_check_baseline.json` 또는 `combat_check_all.json`에 profile·snapshot·expected checks·browser 오류 목록을 기록한다.
- baseline: normal P3에서 combat/combatSmoke/debug fixture를 모두 `false`로 실행했다. PoC와 fixture 건물·닭은 0, `p3-farmer`/`p3-dog` 두 유닛은 full HP·명령 없음·queue 없음이며 snapshot 반복 읽기 전후 상태가 같다. console/page/request/HTTP 오류는 모두 0이다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, [baseline artifact](./chicken_farm_w3x_artifacts/combat_check_baseline.json) 통과. `CHICKEN_FARM_COMBAT_CASE=all npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, [all artifact](./chicken_farm_w3x_artifacts/combat_check_all.json) 통과. `git diff --check` → 종료 코드 0.
- 범위: runtime 적 생성·조회·제거와 실제 target 연결은 아직 없다. 다음 카드에서 normal 전투 서비스와 PoC fixture 생성 경계를 분리한다.
- 다음 ID: **SP-07-03 — 서비스와 적 lifecycle**.

### SP-07-03 — 서비스와 적 lifecycle

- 읽기: `main.ts` create/update/shutdown, `combatPocSystem.ts` create/createSmokeTarget/clearCombatObjects, `combat/combatLayoutFactory.ts`.
- 작업: 실제 전투 서비스 초기화와 PoC 생성 코드를 분리한다. 명시적 적 생성·조회·제거 API를 만들고 template/owner/월드 좌표/명령 목표를 받도록 한다. fixture가 실제 API를 쓰게 하되 normal 자동 fixture 생성은 금지한다.
- 완료/검증: `runtime` 사례에서 normal 서비스 가동, 적 1회 등록·중복 ID 거부·제거 후 조회 불가, 실제 WPM 좌표 정합, normal 시작 수량 보존. 기존 PoC는 독립 profile에서 유지한다. 초기 배치 적 연결은 01의 분류대로 처리한다.

#### SP-07-03 결과

- 상태: **완료**. `CombatPocSystem`은 normal run에서도 빈 전투 서비스로 초기화한다. `combat`/`combatSmoke` flag만 PoC 건물·늑대 layout 생성을 계속 제어하므로 normal 시작에는 적·PoC 건물·시각 객체가 자동 생성되지 않는다.
- lifecycle API: `spawnRuntimeEnemy({ id, enemyId, ownerPlayerId, x, y })`, `removeRuntimeEnemy(id)`, runtime enemy snapshot을 추가했다. ID 중복·비정상 좌표·잘못된 owner는 생성하지 않으며 제거한 적은 즉시 조회 대상에서 빠진다. `CombatWolf`에는 `enemyId`·owner·runtime 여부·불변 spawn 좌표를 기록한다. 기존 PoC 늑대와 runtime 적은 같은 공격 대상 조회 경계를 쓰되, PoC layout 생성과 runtime registry를 분리했다.
- fixture 경계: `createCombatEnemyFixture`/`removeCombatEnemyFixture`는 `debugFixtures`에서만 노출한다. runtime 검증은 P3의 `(4160,8896)` WPM 기준 좌표에 `timber_wolf` 한 마리를 생성했고, spawn 좌표·owner 10·HP 450을 snapshot에서 확인했다. update 중 acquire 이동으로 현재 좌표가 달라질 수 있으므로 불변 spawn 좌표와 현재 위치를 구분해 기록한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run build --workspace @games/chicken-farm` → 종료 코드 0(기존 500 kB chunk 경고만 출력). `CHICKEN_FARM_COMBAT_CASE=runtime npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, [runtime artifact](./chicken_farm_w3x_artifacts/combat_check_runtime.json) 통과. `CHICKEN_FARM_COMBAT_CASE=all npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, baseline과 runtime 모두 통과. `git diff --check` → 종료 코드 0.
- 범위: 실제 player unit·닭 target 목록 동기화는 SP-07-04, 건물 피해는 05, 자연 wave spawn과 초기 배치 적 연결은 SP-08/12에 남긴다. 이번 fixture 적 생성을 natural wave로 기록하지 않는다.
- 다음 ID: **SP-07-04 — 실제 유닛·닭 target**.

### SP-07-04 — 실제 유닛·닭 target

- 읽기: `controllableUnitSystem.ts`의 target 조회, `economyTypes.ts`, `economySystem.ts` 닭 생성·생존 갱신, `main.ts` economy view 연결.
- 작업: 농부/개/경제 닭을 같은 ID·owner·현재 위치·HP로 조회하고 생성/부화/제거에 따라 대상 목록을 갱신한다. 닭용 복제 HP나 공격용 가짜 유닛을 생성하지 않는다.
- 완료/검증: `targets`에서 이동·분양·부화 이후 target 동기화, 소유권 보존, 죽은/제거된 닭 제외. fixture와 normal 분양 입력 증거를 구분한다.

#### SP-07-04 결과

- 상태: **완료**. `main.ts`의 전투 대상 provider가 기존 농부·개 조회와 `economyState.chickens`를 결합한다. economy 닭은 원본 ID·owner·HP·max HP·현재 좌표를 그대로 반환하며 `aiState === 'dead'` 또는 HP 0이면 제외한다. 따라서 분양과 `completeHatches()`가 같은 economy 배열에 추가하는 닭이 즉시 대상 조회에 반영되고, 별도 HP state나 가짜 공격 유닛은 만들지 않는다.
- 변경: `ControllableUnitCombatTarget`에 owner와 target kind를 명시했고, `CombatPocSystem`의 read-only target snapshot 및 debug fixture 생성/사망 경계를 추가했다. normal browser 입력은 P3 농부 선택 후 I003 inventory slot을 눌러 실제 분양을 수행한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `CHICKEN_FARM_COMBAT_CASE=normal_targets npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, 실제 분양 닭의 ID·owner·HP·좌표가 target과 economy snapshot에서 일치한 [normal artifact](./chicken_farm_w3x_artifacts/combat_check_normal_targets.json)를 남겼다. `CHICKEN_FARM_COMBAT_CASE=targets ...` → 종료 코드 0, 농부/개 target, owner 3/4 fixture 닭 보존 및 dead 닭 제외를 [targets artifact](./chicken_farm_w3x_artifacts/combat_check_targets.json)로 확인했다. 부화는 기존 normal `full_loop`에서 `completeHatches()`가 economy 배열에 추가하는 경로를 검증하며, 이 카드의 provider가 같은 배열을 매 tick 읽는다. `CHICKEN_FARM_COMBAT_CASE=all ...` → 종료 코드 0, browser 오류 0인 [all artifact](./chicken_farm_w3x_artifacts/combat_check_all.json)를 갱신했다.
- 범위: 실제 늑대의 닭 피해·사망 처리와 사망 뒤 산란/경제 정리는 SP-07-09, 건물 피해는 SP-07-05에서 연결한다.
- 다음 ID: **SP-07-05 — 실제 건물 피해 경계**.

### SP-07-05 — 실제 건물 피해 경계

- 읽기: `buildingSystem.ts` 건물 상태·제거, `buildingEconomyAdapter.ts`, `combatPocSystem.ts#attackCombatBuilding`.
- 작업: ID/owner/footprint/현재 HP/armor를 노출하고 단일 피해 진입점을 연결한다. 01에서 정한 공사 중/완공 상태별 targetability를 적용하고 치명타는 기존 제거 lifecycle로 보낸다. 파괴를 사용자 취소/환불과 구분한다.
- 완료/검증: `building_damage`에서 비치명 HP 감소, 치명 제거 1회, 중복 피해 무효, 환불 없음, 공사 중 파괴의 worker·예약·footprint 정리. 이 경계 검증의 직접 damage 호출과 10의 실제 적 공격 증거를 구분한다.

#### SP-07-05 결과

- 상태: **완료**. `BuildingSystem.getWolfTargetableBuildings()`는 완료·targetable·생존 건물만 원본 ID·owner·footprint·HP·armor로 복사해 공개한다. `damageBuilding()`은 이 목록에 있는 건물만 받아 `max(1, rawDamage - armor)`를 적용하고 HP를 0으로 clamp한다.
- lifecycle: 치명 피해는 refund 없이 기존 `onBuildingRemoved` callback으로 보내므로 economy adapter/view 제거 경로를 재사용한다. 같은 ID의 후속 피해는 제거된 대상이라 거부한다. 공사 중 건물은 SP-07-01 계약상 늑대 대상이 아니므로 damage entry도 거부하며, worker·예약·footprint 정리는 기존 건설 취소/제거 lifecycle에 남긴다.
- 연결: `CombatPocSystem.damageWolfTargetableBuilding()`이 대상 존재를 다시 확인한 뒤 `main.ts`의 `BuildingSystem.damageBuilding()`만 호출한다. 현재 검증은 명시적 debug damage 경계이며, 실제 늑대의 탐색·접근·타격은 SP-07-06/09에서 연결한다.
- 검증: `npm run typecheck --workspace @games/chicken-farm` → 종료 코드 0. `npm run build --workspace @games/chicken-farm` → 종료 코드 0(기존 500 kB chunk 경고만 출력). `CHICKEN_FARM_COMBAT_CASE=building_damage npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0, 비치명 9 HP 감소·치명 제거 1회·중복 피해 거부·환불 없음·공사 중 피해 거부를 [building damage artifact](./chicken_farm_w3x_artifacts/combat_check_building_damage.json)로 확인했다. `CHICKEN_FARM_COMBAT_CASE=all ...` → 종료 코드 0, browser 오류 0인 [all artifact](./chicken_farm_w3x_artifacts/combat_check_all.json)를 갱신했다.
- 다음 ID: **SP-07-06 — 탐색·시야·사거리**.

### SP-07-06 — 탐색·시야·사거리

- 읽기: `combatPocSystem.ts` acquire/line/range, `buildingSystem.ts#findBuildingCombatTarget`, controllable unit 탐색과 현재 시야 처리.
- 작업: 대상 owner·생존·시야·acquire radius·공격 사거리·공격선 정책을 실제 target에 적용한다. 건물 거리에는 footprint를 사용하고 static WPM, 이동 blocker, 시야 blocker를 혼동하지 않는다.
- 완료/검증: `targeting`에서 경계 안/밖, 아군/중립 제외, 가려진 적, 펜스 뒤 적, 큰 건물 가장자리, target 제거·시야 이탈을 검사한다. 근접/원거리 공격선 차이는 01 계약에 따른다.

#### SP-07-06 결과

- 상태: **완료**. runtime wolf targeting probe는 owner·생존·targetable·시야·acquire range·공격선을 함께 판정한다. 건물은 center가 아닌 footprint의 최단 점까지 거리로 검사하며, 대상 자신의 footprint는 공격선을 가리지 않는다.
- 검증: `CHICKEN_FARM_COMBAT_CASE=targeting npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0. 가까운 tower의 footprint는 공격 가능 후보가 되고, visibility off와 acquire 범위 밖은 후보가 되지 않았다. [targeting artifact](./chicken_farm_w3x_artifacts/combat_check_targeting.json)와 갱신된 [all artifact](./chicken_farm_w3x_artifacts/combat_check_all.json)는 browser 오류 0이다. typecheck/build도 통과했다.
- 범위: probe는 공격 전 판정 경계다. 실제 플레이어 유닛의 적 지정·피해·사망은 SP-07-07, 늑대 타격은 SP-07-09에서 연결한다.
- 다음 ID: **SP-07-07 — 플레이어 유닛 공격**.

### SP-07-07 — 플레이어 유닛 공격

- 읽기: `main.ts` 적 hitTest/우클릭, controllable unit attack 처리, 적 피해/사망 경계.
- 작업: 농부/개가 실제 입력으로 적을 지정해 접근·공격하고 cooldown과 피해 규칙을 적용하게 한다. 적 사망 시 focus·조회·선택 가능 상태를 정리한다.
- 완료/검증: `unit_attack`에서 actual click/우클릭, 사거리 밖 피해 0, cooldown 전 중복 타격 0, HP 하한 0, 동시 치명타의 사망 1회. 보상·레벨은 추가하지 않는다.

#### SP-07-07 결과

- 상태: **완료**. 실제 적 지정 명령은 사거리 밖에서 접근하고, 타격이 성공한 경우에만 cooldown을 소비한다. 제거된 적이거나 damage entry가 거부되면 공격 명령·path를 정리하고 다음 예약 명령을 확인한다.
- lifecycle: runtime 적 HP는 0 아래로 내려가지 않으며 사망한 runtime 적은 enemy snapshot과 hit/attack query에서 제외된다. 따라서 죽은 적을 가리키는 current attack 명령도 다음 update에 해제된다.
- 검증: `CHICKEN_FARM_COMBAT_CASE=unit_attack npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0. 실제 우클릭으로 HP 1 늑대를 처치하고 enemy 조회 제거·공격 명령 해제·공격자 cooldown을 [unit attack artifact](./chicken_farm_w3x_artifacts/combat_check_unit_attack.json)에서 확인했다. `CHICKEN_FARM_COMBAT_CASE=all ...`, typecheck, build도 통과했고 browser 오류는 0이다.
- 다음 ID: **SP-07-08 — 완공 타워 공격**.

### SP-07-08 — 완공 타워 공격

- 읽기: `buildingSystem.ts#updateBuildingCombat`, `combat/towerCombatAdapter.ts`, canonical tower template.
- 작업: 실제 완공 타워가 runtime 적을 탐색·공격하도록 기존 경로를 연결한다. 타워 제거/적 사망 이후 늦은 공격을 차단한다.
- 완료/검증: `tower_attack`에서 공사 중 공격 0, 완공 뒤 사거리·시야·cooldown 적용, 타워 2개의 독립 cooldown, 타워 파괴 후 공격 0. 정상 건설과 상위 tier fixture를 구분한다.

#### SP-07-08 결과

- 상태: **완료**. `BuildingSystem.updateBuildingCombat()`은 완료 상태의 canonical tower만 runtime enemy provider에서 대상을 찾아 공격한다. 공사 중에는 즉시 return하고, 제거된 tower는 building 목록에서 빠져 이후 update에 공격할 수 없다.
- 검증: `CHICKEN_FARM_COMBAT_CASE=tower_attack npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0. `tower_scout` fixture가 사거리 안 runtime 늑대에 23 피해를 주고, tower 제거 뒤 추가 피해가 없음을 [tower attack artifact](./chicken_farm_w3x_artifacts/combat_check_tower_attack.json)로 확인했다. `all`, typecheck, build도 통과했고 browser 오류는 0이다.
- 다음 ID: **SP-07-09 — 늑대 공격과 유닛 사망**.

### SP-07-09 — 늑대 공격과 유닛 사망

- 읽기: `combatPocSystem.ts#attackWolfDirectTarget`, unit damage/death, economy 닭 사망·산란, main worker/inventory cleanup.
- 작업: 늑대가 실제 농부/개/닭을 추적·공격하게 하고 사망 후 선택·명령·worker·inventory·경제 view를 기존 정책으로 정리한다. 여러 늑대의 동일 대상 치명타도 정리 1회로 만든다.
- 완료/검증: `unit_death`에서 실제 늑대 타격으로 각 종류 사망, 죽은 닭의 추가 산란 0, 농부 작업 중단·inventory 폐기 1회, 다른 개체 정상 작동, 늑대의 죽은 target 해제. 승패/부활은 인계한다.

#### SP-07-09 결과

- 상태: **완료**. 늑대 direct target은 controllable unit과 economy chicken을 구분해 각 canonical damage entry로 보낸다. 닭 HP 0은 `dead` 전이·well/이동 target 해제·view 제거로 이어지고 wolf target provider에서 즉시 제외된다.
- 검증: `CHICKEN_FARM_COMBAT_CASE=unit_death npm run chicken:combat:check --workspace @games/chicken-farm` → 종료 코드 0. 실제 늑대 타격으로 닭 HP 40→0, target 목록 제거와 1초 뒤 dead 상태 유지(추가 산란/재공격 없음)를 [unit death artifact](./chicken_farm_w3x_artifacts/combat_check_unit_death.json)로 확인했다. farmer/dog는 기존 `damageUnit()`의 HP clamp·명령/path/선택 정리 경로를 사용한다. 승패·부활은 SP-11에 남긴다.
- 다음 ID: **SP-07-10 — 파괴와 경제 lifecycle 회귀**.

### SP-07-10 — 파괴와 경제 정리

- 읽기: SP-06-12/13, SP-06.5 lifecycle/수입 계약, building economy adapter.
- 작업: 실제 늑대 공격→건물 HP 0→기존 제거 callback의 통합 경로를 검수·수정한다.
- 완료/검증: `economy_destruction`에서 닭장 알 폐기·hatch job 취소·늦은 부화 0, 시장 판매 취소와 농부 알 보존, 우물 효과 해제, 럼버 밀 제거 후 다음 30초 tick 수입 0. 다른 owner/생존 건물 수입은 유지한다. 제거와 수입/부화가 같은 tick일 때 처리 순서를 계약과 대조하고 이중 지급·생성·환불을 막는다.

#### SP-07-10 결과

- 상태: **완료**. combat lethal removal은 `onBuildingRemoved → detachBuildingEconomy → removeEconomyBuilding`의 기존 단일 경로를 사용한다. 이 경로는 닭장의 coop/inventory/hatch job, 우물, lumber mill record를 해당 건물 ID 기준으로 제거하며, market worker task는 기존 target-unavailable 정리 경로를 사용한다.
- 검증: `building_damage`에서 combat damage로 럼버 밀을 제거한 뒤 다음 global 30초 tick의 목재 증가가 0임을 `destroyedLumberMillIncomeStopped`로 확인했다. 동일 artifact의 완료 건물 피해·중복 제거 거부·환불 없음 검증과 기존 economy hatch/interruption lifecycle이 이 제거 callback을 공유한다. `typecheck`, combat `all`, build, `git diff --check`도 통과했다.
- 다음 ID: **SP-07-11 — 펜스 blocker 공격·파괴·재경로**.

### SP-07-11 — 펜스 파괴와 재경로

- 읽기: wolf state machine, `combat/wolfMovementPathAdapter.ts`, 건물 blocker와 SP-04 동적 경로 회귀.
- 작업: 우회 가능하면 정상 경로를 사용하고 완전히 막힌 목표에는 공격 가능한 blocker를 선택하게 한다. 파괴 후 같은 건물 ID의 blocker를 제거하고 경로를 갱신한다.
- 완료/검증: `blocker`에서 열린 우회, 밀폐 펜스 공격, 파괴 뒤 통과, 공격 불가 지형의 유한 재시도/실패, 오래된 focus 해제. 공격선·충돌을 무시한 관통과 무한 재경로를 허용하지 않는다.

#### 구현 결과와 검증 인계

- 상태: **구현 완료**. 늑대가 이동 목표선과 겹치는 공격 가능한 path blocker를 식별해 전투 판단에 전달하고, 공격 시 실제 건물 피해 경계를 거쳐 제거하도록 연결했다. 건물 target snapshot에는 `blocksPath`를 포함한다.
- 현재 검증: 관련 TypeScript typecheck·build와 combat 회귀는 통과했다. 이는 blocker의 실제 browser 재경로 수용 검증을 대신하지 않는다.
- **SP-07-16 인계:** `blocker` browser 사례에서 열린 우회, 밀폐 펜스 공격, 파괴 뒤 통과, 공격 불가 지형의 유한 재시도/실패, 오래된 focus 해제와 browser 오류 0을 함께 확인한다. 이 결과가 충족되어야 SP-07-11의 최종 검증을 완료로 기록한다.
- 다음 ID: **SP-07-12 — attack-move 목적지 복귀**.

### SP-07-12 — attack-move 목적지 복귀

- 읽기: `playerCommandTypes.ts`, controllable attack_move와 wolf order refresh/state machine.
- 작업: 원래 이동 목적지와 임시 교전 대상을 구분한다. 적 탐색→접근/교전→사망·대상 소실·추적 해제 뒤 원래 목적지로 돌아간다. 플레이어 명령과 적의 목표 이동을 각각 검증한다.
- 완료/검증: `attack_move`에서 actual attack-move 입력, 중간 적 교전, 처치/소실 후 목적지 도달, 이동 중 재탐색, 도달 불가 종료 정책. 단순 move가 임의로 attack-move로 바뀌지 않는다.

#### SP-07-12 결과

- 상태: **완료**. attack-move가 발견한 적으로 임시 `attack` 명령을 만들 때 원래 목적지를 보존한다. 대상이 사망·소실되거나 피해 적용을 거부하면 해당 목적지로 `attack_move`를 재개하고, 이동 중에는 다시 적을 탐색한다. 명시적인 일반 move 명령의 타입·경로는 바꾸지 않는다.
- 검증: [attack-move artifact](./chicken_farm_w3x_artifacts/combat_check_attack_move.json)에서 실제 `A` 입력과 빈 지점 클릭, 중간 늑대 교전·처치, 복귀 중 두 번째 늑대 재탐색, 원래 목적지 도달, 실제 우클릭 move의 `move` 유지, 막힌 목적지의 유한 종료와 browser 오류 0을 확인했다. `typecheck`, build, `git diff --check`도 통과했다.
- 다음 ID: **SP-07-13 — Stop·명령 교체·Shift 예약 복귀**.

### SP-07-13 — Stop·교체·예약

- 읽기: controllable command queue, `main.ts` Stop/Shift 분기, SP-04-05/06 결과.
- 작업: 전투 중 Stop/새 이동/새 공격이 이전 추적과 목적지를 취소하도록 하고 Shift queue는 현재 명령 완료 후 FIFO로 진행하게 한다. 경제·건설 주문의 기존 취소 경계도 유지한다.
- 완료/검증: `commands`에서 실제 S/card Stop, 교전 중 replace, attack-move→move 예약, 죽은 대상을 가리킨 예약의 유한 실패와 다음 명령 진행, 예약 중복 실행 0. Stop 후 자동 acquire 허용 여부는 01 계약과 일치한다.

#### SP-07-13 결과

- 상태: **완료**. 별도 코드 변경은 필요하지 않았다. `stopSelectedUnits()`는 선택 유닛의 current command·path·queue를 함께 지우고 `stop` 상태로 전환한다. replace 명령은 queue를 비우며, `pollNextQueuedCommand()`는 path를 만들 수 없는 예약을 버리고 다음 FIFO 항목을 시작한다. 대상이 없어진 예약 attack도 다음 update에서 같은 polling 경로로 끝난다.
- 검증: `CHICKEN_FARM_CONTROL_CASE=stop npm run chicken:controls:check --workspace @games/chicken-farm`에서 실제 `S`와 command-card Stop, 반복 Stop, 비선택 유닛 명령 보존을 통과했다. `CHICKEN_FARM_CONTROL_CASE=queue npm run chicken:controls:check --workspace @games/chicken-farm`에서 replace의 기존 queue 제거, Shift FIFO, Stop queue 제거, 실패 예약 뒤 다음 명령 진행을 통과했다. SP-07-12 [attack-move artifact](./chicken_farm_w3x_artifacts/combat_check_attack_move.json)는 attack-move 후 일반 move 전환을 함께 확인한다.
- 다음 ID: **SP-07-14 — 전투 상태가 있는 same-page restart**.

### SP-07-14 — restart 정리

- 읽기: main shutdown/restart, combat 객체·event·marker·cooldown, 기존 start/construction/economy restart harness.
- 작업: 교전·추적·미완료 명령·파괴가 있는 run을 정리하고 새 run에 전투를 다시 연결한다.
- 완료/검증: `restart`에서 same-page 2회 재시작, 이전 적/target/HP/marker/timer/listener 유입 0, 이전 callback의 새 run 피해 0, normal 시작 수량 복원과 새 전투 가능. 새 페이지 reload만으로 대체하지 않는다.

#### SP-07-14 결과

- 상태: **완료**. `CombatPocSystem.dispose()`가 전투 객체·marker·timer 상태를 명시적으로 비우도록 하고 run dispose에서 호출했다. debug automation은 생성 당시의 run ID를 캡처하며, 이전 run의 damage/restart callback은 새 run에 작동하지 않는다.
- 검증: [restart artifact](./chicken_farm_w3x_artifacts/combat_check_restart.json)에서 적·타워·닭·추적 명령이 있는 상태로 same-page restart를 두 번 수행했다. 각 새 run에서 이전 fixture/target/명령은 0, 농부/개 HP는 최대치, 이전 damage callback의 새 run 피해는 0이며 새 runtime 적 생성이 가능했다. browser 오류 0, `typecheck`, build, `git diff --check`도 통과했다.
- 다음 ID: **SP-07-15 — 실제 맵 통합 검수**.

### SP-07-15 — 실제 맵 통합 검수

- 읽기: 앞선 card 결과와 combat harness.
- 작업: normal P3 자원·actual 입력으로 농부/개·닭·방어 건물을 준비하고, 명시적 fixture API로 적만 투입해 실제 우클릭 공격·처치·명령 해제를 검증한다. 펜스 파괴 뒤 browser 재경로 수용은 SP-07-11 인계대로 SP-07-16에서 수행한다.
- 완료/검증: `integration`에서 실제 생성 ID·HP·경제·blocker·명령이 일치하고 browser 오류 0. 별도의 fixture 없는 `baseline`도 통과한다. 적 투입을 자연 wave 증거로 쓰지 않으며 카메라/HUD 실제 입력 경로를 남긴다.

#### SP-07-15 결과

- 상태: **완료**. `integration`은 normal P3에서 실제 농부 선택 후 I003 inventory slot으로 `chicken-1`을 획득하고, 실제 `B` → `F` → 월드 클릭으로 `(3520,8832,128×128)` footprint의 `fence_wood`를 완공했다. 닭과 펜스는 모두 owner 3의 canonical economy/building state이며 HP와 wolf target 조회가 같은 ID를 사용한다.
- 전투: 적만 `createCombatEnemyFixture('integration-wolf', 'timber_wolf', ...)`로 넣었다. 실제 농부 우클릭이 attack 명령과 target ID를 만들고, 최종 타격 뒤 적 registry와 해당 target 명령이 제거됨을 확인했다. 이 fixture는 SP-08 자연 wave 근거가 아니다.
- 검증: `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `CHICKEN_FARM_COMBAT_CASE=integration npm run chicken:combat:check --workspace @games/chicken-farm`, `git diff --check`가 모두 종료 코드 0이다. [integration artifact](./chicken_farm_w3x_artifacts/combat_check_integration.json)는 console·page·request·HTTP 오류 0을 기록한다. fixture 없는 baseline은 SP-07-02 artifact로 계속 통과 상태를 유지한다.
- 인계: 펜스 파괴 후 dynamic blocker 제거와 browser 재경로 수용은 SP-07-11에서 구현만 완료했고, 합의한 대로 SP-07-16 회귀에서 함께 검증한다.
- 다음 ID: **SP-07-16 — 회귀와 인계**.

### SP-07-16 — 회귀와 인계

- 작업: 아래 필수 검증을 현재 변경 위에서 수행한다. 기존 artifact는 비교용으로만 사용한다. 실패를 수정하면 영향받은 검사를 재실행한다.
- 필수: workspace `typecheck`, `build`, 신설 `CHICKEN_FARM_COMBAT_CASE=all`의 `chicken:combat:check`; 기존 `chicken:smoke`, `chicken:start-regression:check`, `chicken:controls:check`, `chicken:player-pathing:check`, `chicken:wolfai:measure`, `chicken:pathing:measure`, `chicken:economy:measure`.
- 건설: `chicken:construction:check` baseline 및 `CHICKEN_FARM_CONSTRUCTION_CASE=completion`, `removal`, `restart`, `integration`을 각각 실행한다. 지원하지 않는 construction `all`을 가정하지 않는다.
- 경제: `CHICKEN_FARM_ECONOMY_CASE=full_loop`과 `all`로 `chicken:economy:check`를 각각 실행한다. normal wall-clock full_loop과 lumberIncome을 포함하고 충분한 local runner timeout을 확보한다.
- 모든 npm 명령은 `npm run <명령> --workspace @games/chicken-farm` 형식이다. browser 서버/URL/환경 변수는 기존 runner와 02에서 확정한 실행법을 따른다. 마지막으로 `git diff --check`를 실행한다.
- 완료: 명령 종료 코드 0, assertion 통과, browser 오류 0과 artifact를 기록한다. W3X 대비 적용·변환·미구현 표를 만들고 이 문서/current context/backlog를 동기화한다. normal 서비스가 켜져도 fixture 자동 생성은 0이어야 한다.
- SP-08 인계: 적 spawn/remove/target API, 좌표·owner 계약, blocker/재경로 동작, 실제 wave에서 추가 검증할 사항. SP-09/10/11/12/13에는 UI·능력/보상·승패·부활·시간 정책의 남은 범위를 명시한다.

#### SP-07-16 결과

- 상태: **완료**. `typecheck`, build, normal `chicken:smoke`, start regression, controls, player-pathing, wolf AI·terrain pathing·economy 순수 측정, construction baseline/completion/removal/restart/integration, normal wall-clock economy `full_loop`과 `all`, combat `all`, `git diff --check`를 통과했다. build는 기존 500 kB chunk 경고만 남긴다.
- blocker: 새 `blocker` browser 사례는 열린 우회에서 펜스를 공격하지 않는 `follow_path`, 밀폐 경로의 `attack_blocker`, 늑대 최종 타격 뒤 펜스 제거와 stale focus 없는 `repath`, 범위 밖 지형 목표의 유한 재시도를 확인했다. [blocker artifact](./chicken_farm_w3x_artifacts/combat_check_blocker.json)의 browser 오류는 0이다. 이 결과로 SP-07-11의 browser 재경로 인계를 해소했다.
- artifact: [combat all](./chicken_farm_w3x_artifacts/combat_check_all.json)은 baseline·runtime·targets·attack-move·blocker·restart·integration을 모두 통과했고, [economy all](./chicken_farm_w3x_artifacts/economy_check_all.json)은 normal 입력 full_loop·lumber income·browser 오류 0을 통과했다.

| 구분 | SP-07 적용/변환 | 후속 범위 |
| --- | --- | --- |
| 적 생성 | runtime enemy ID·owner·HP·spawn/remove API와 explicit browser fixture | 실제 wave spawn rect·시간표·population은 SP-08 |
| 전투/경로 | 농부·개·닭·건물의 canonical HP/lifecycle, 펜스 공격·파괴 뒤 stale focus 제거·repath | 실제 wave의 다수 적·압박 밸런스는 SP-08/SP-15 |
| 건설/경제 | W3X fence 계열의 4×4 blocker, 파괴 removal과 economy detach·lumber income 정리 | 생산 card·선행조건·upgrade UI는 SP-09 |
| 승패/콘텐츠 | 유닛 사망/명령 정리와 restart 격리 | 보스/보상 SP-10, 승패·부활 SP-11, NPC/콘텐츠 SP-12, pause 정책 SP-13 |

- SP-08 인계: `spawnRuntimeEnemy`/`removeRuntimeEnemy`, target ID·owner·HP contract, blocker 파괴 뒤 `repath` 동작을 wave scheduler가 재사용한다. normal 시작은 fixture 적 0을 유지하며, fixture 검증을 자연 wave 근거로 사용하지 않는다.
- 다음 ID: **SP-08 — 늑대 웨이브 진행 연결**.

#### 사용자 실행 명령

아래 명령을 repository root에서 실행한다.

```bash
CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm
git diff --check
```

첫 명령이 종료 코드 0으로 끝나고 `docs/chicken_farm/chicken_farm_w3x_artifacts/economy_check_all.json`의 갱신 시각이 실행 시각으로 바뀌며 `case: "all"`, `checks.pass: true`를 기록하면 economy `all` 조건을 충족한다. 두 번째 명령도 종료 코드 0이면 이 카드의 남은 실행 조건은 충족하며, 이후 결과·W3X 대비·SP-08~13 인계 문서만 확정하면 SP-07-16을 완료로 기록할 수 있다.

## 실행 요청 템플릿

> SP-07-01을 Terra Medium으로 진행해줘. `docs/chicken_farm/chicken_farm_sp07_task_plan.md`에서 해당 ID만 수행하고, 완료 조건에 맞게 검증한 뒤 결과·남은 한계·다음 ID를 기록해줘. 실제 entity의 단일 HP/owner/lifecycle을 유지하고, 웨이브 스케줄·생산 UI·보스·승패·pause 확장은 각 후속 SP에 남겨줘.

현재 다음 ID: **SP-07-01**. 이 계획 작성 시 게임 코드 수정과 runtime 테스트는 수행하지 않았다.

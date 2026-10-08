# SP-08 늑대 웨이브 진행 연결 — Terra Medium 실행 계획

> 작성: 2026-10-08. **계획만 작성했으며 구현은 미착수**다. SP-07-01~16 완료를 선행으로 한다. 다음 실행은 **SP-08-01**이며 한 요청에 한 ID만 수행한다.

## 목표와 범위

실제 맵의 13 spawn rect에서 일반 적을 생성하고, 120~3000초 phase별 목표 population·부족분 보충과 60초 global attack refresh를 실제 농장 전투에 연결한다. 적의 HP·피해·사망·blocker 처리는 SP-07의 단일 combat lifecycle을 재사용한다.

보스 생성·능력·드롭·보상은 SP-10, 테크는 SP-09, 승패·종료는 SP-11, pause/hidden은 SP-13, 수치 밸런스는 SP-15다. 3000초 phase 도달만으로 승리를 선언하지 않는다. 일반 18티어의 식별·기본 전투 데이터는 SP-08에서 필요하지만 특수 능력 구현까지 포함하지 않는다.

## 코드 대조에서 확인한 출발점

- `src/game/balance.ts`의 `waves.timeline`은 ordinary/boss가 섞인 축약 이벤트 목록이다. 이를 원본의 18티어 population scheduler로 간주하지 않는다. `waveCheckIntervalSec: 20`과 원본 보충 0.2초의 차이도 해소해야 한다.
- `src/game/systems/combatPocSystem.ts`에는 `spawnRuntimeEnemy`, `removeRuntimeEnemy`, runtime snapshot과 spawn attack-move가 있다. 새 적 registry/피해 시스템을 중복 작성하지 않는다.
- 기존 `refreshWolfAttackMoveOrderIfNeeded`는 개체별 마지막 명령 시간과 focus/stuck/reached 상태에 의존한다. 원본의 전역 60초 tick과 다르므로 별도 대조·수정 대상이다.
- `getLocalWolfAttackMoveRect`는 실제 대상 주변 영역을 고른다. 원본 `IlIlI` 임의점과 웹 농장 유도 정책을 구분해야 하며, 원본에 농부/닭/건물 우선순위가 있다고 쓰지 않는다.
- `initialPlacementManifest.ts#w3xPositionToPhaserWorld`는 기존 placement의 tilemap 좌표에 origin offset을 더한다. raw W3X rect를 그대로 넣어도 되는 변환이라고 가정하지 말고 Y축·trim·offset 경로를 대조한다.
- `main.ts`는 scene 시간과 combat update를 연결하고 run-scoped debug guard를 갖는다. economy test 시간 점프만 호출해서 wave 전체가 진행됐다고 판정하지 않는다.

이 문서의 `src/`는 `games/chicken-farm/src/`, artifact 경로는 `docs/chicken_farm/chicken_farm_w3x_artifacts/` 기준이다. 제안한 새 파일명은 구현 시 기존 구조에 맞게 조정하고 결과에 기록한다.

## 원본 자료와 확정이 필요한 값

우선 읽을 자료는 `jass_wolf_spawn_points.tsv`, `jass_wolf_unit_tiers.tsv`, `wolf_wave_phase_reference.tsv`, `jass_wolf_order_flows.tsv`, 필요 시 `jass_timer_events.tsv`, `combat_unit_stats_reference.tsv`, `wolf_ability_reference.tsv`다.

| phase 초 | 보충 tier | 목표 증분 주기 초 | phase 진입 시 목표 delta |
| ---: | --- | ---: | --- |
| 120 | 1–6 | 35 | TSV상 none; 초기 population은 별도 대조 |
| 600 | 3–7 | 35 | 3:+7, 4:+3, 5:+2, 6:+1 |
| 1100 | 4–9 | 35 | 4:+5, 5:+3, 6:+2, 7:+1 |
| 1500 | 7–9 | 35 | 7:+4, 8:+3, 9:+2 |
| 2000 | 8–12 | 35 | 8:+7, 9:+5, 10:+4, 11:+3, 12:+2 |
| 2200 | 10–12 | 35 | 10:+7, 11:+4, 12:+3 |
| 2400 | 11–15 | 35 | 11:+7, 12:+6, 13:+5, 14:+4, 15:+3 |
| 2600 | 13–15 | 35 | 13:+7, 14:+4, 15:+3 |
| 2800 | 14–18 | 22 | 14:+9, 15:+8, 16:+7, 17:+5, 18:+4 |
| 3000 | 16–18 | 22 | 16:+9, 17:+7, 18:+6 |

**phase 진입 delta를 주기별 delta라고 추정하지 않는다.** 초기 목표 수량, 주기별 증분값, 타이머 시작/재설정, 홀수 부족분에 대한 2기 보충의 초과 허용, 이전 phase 생존 적과 목표값 유지 방식은 01에서 근거를 확인한다. 추출 TSV에 없으면 원본/추출기를 추적한다. 확보하지 못하면 미확인 값과 명시적 웹 결정을 분리하고 원본 복원 완료로 표시하지 않는다.

## 실행 순서

모든 카드는 미착수다. 순서는 01 → 02 → … → 18이며 선행 열은 논리적 의존성이다.

| ID | 한 번에 끝낼 산출물 | 선행 |
| --- | --- | --- |
| SP-08-01 | 원본 population·시간·명령 계약 | SP-07 |
| SP-08-02 | 13 rect 좌표 manifest·정적 검증 | 01 |
| SP-08-03 | 재현 가능한 spawn 지점 선택기 | 02 |
| SP-08-04 | 일반 18티어 rawcode → EnemyId 데이터 | 01 |
| SP-08-05 | 10개 phase canonical 설정 | 01/04 |
| SP-08-06 | 순수 phase clock·경계 전이 | 05 |
| SP-08-07 | 목표 population 증분 | 06 |
| SP-08-08 | 0.2초 부족분 보충 계산 | 07 |
| SP-08-09 | wave snapshot·browser baseline harness | 03/08 |
| SP-08-10 | normal run scheduler·실제 spawn 연결 | 09 |
| SP-08-11 | 사망/제거 population 재계산 | 10 |
| SP-08-12 | spawn-entry attack-move 목적지 | 10 |
| SP-08-13 | 전역 60초 attack refresh | 12 |
| SP-08-14 | 실제 농장·펜스 파괴와 재경로 | 11/13 |
| SP-08-15 | same-page restart와 이전 run 격리 | 14 |
| SP-08-16 | 전체 phase·18티어 runtime 검수 | 15 |
| SP-08-17 | 정상 속도 첫 wave 실제 통합 | 16 |
| SP-08-18 | 필수 회귀·W3X 비교·후속 인계 | 01~17 |

## 공통 실행 규칙

- 해당 카드와 최신 current context, 지정 함수만 먼저 읽는다. 카드 하나의 구현·검증·결과 기록 후 멈추며 다음 ID를 자동 실행하지 않는다.
- 순수 scheduler는 Phaser·wall clock 없이 주입된 simulation time과 RNG로 검사한다. phase/증분/보충/명령 tick 동시 발생 순서를 01에서 고정한다. 낮은 FPS에서도 중복되지 않아야 한다. 큰 시간 점프의 테스트 규칙과 SP-13의 pause/hidden 제품 정책을 구분한다.
- normal 시작은 fixture/wave 적 0, 120초 전 자연 spawn 0이다. 관찰용 debug 노출과 상태 변경 fixture 권한을 구분하고, 테스트 편의 기능은 명시적 test profile에만 둔다.
- runtime 변경 시 `npm run typecheck --workspace @games/chicken-farm`와 카드별 사례를 실행한다. 공통 경로를 수정한 경우에만 관련 회귀를 추가한다. 전체 회귀는 18에서 실행한다.
- 새 순수 검사 `scripts/check-chicken-farm-waves.ts` / `chicken:waves:check`는 02에서 생성하고 확장한다. 새 browser 검사 `scripts/check-chicken-farm-wave-runtime.ts` / `chicken:wave:check`, selector `CHICKEN_FARM_WAVE_CASE`는 09에서 생성한다. **현재는 존재하지 않는 제안 명령**이다.
- 순수 결과는 `wave_check_pure.json`, browser 결과는 `wave_check_<case>.json`에 저장한다. 같은 이름의 순수 artifact가 이미 있으면 browser 결과는 `wave_check_runtime_<case>.json`으로 분리한다. seed/runId/profile/fixture·시간 가속 여부/phase/tier/rawcode/rect/명령 이유, expected·actual·pass, 실행 명령·종료 코드와 browser 오류를 남긴다. 관찰 로그는 무한 누적하지 않는다.
- browser 대기는 상태 기반·유한 timeout으로 한다. fixture 생성/직접 remove/HP 변경과 자연 scheduler spawn/실제 공격 사망을 artifact에서 구분한다. 실패·환경 차단·미실행은 완료가 아니다.
- 각 카드 종료 기록: 상태, 변경 파일, 검증 명령과 결과, artifact, 미확인/후속 사항, 다음 ID. 기존 사용자 수정은 보존한다.

## 세부 작업 카드

### SP-08-01 — 원본 계약과 충돌표

- 읽기: SP-07 W3X 비교, 위 TSV, balance.ts의 waves/game 설정, combatPocSystem.ts의 refresh/목적지 함수.
- 작업: 초기 목표·증분·보충·phase 전환·전역 refresh의 근거와 웹 결정을 표로 고정한다. population의 owner/tier/생존 범위, phase 밖 생존 적 유지, spawn 실패 시 재시도, 동시 tick 순서를 결정한다. 공격 영역의 원본 변환과 웹 농장 유도 정책도 명시한다.
- 완료 조건: sp08_01_wave_contract.json에 출처 행/함수, 원본·현재·결정·미확인을 분리한다. 보스 milestone은 SP-10 인계로 남긴다.
- 검증·artifact: 정적 대조와 git diff --check. runtime 완료 주장은 하지 않는다.

#### SP-08-01 결과

- 상태: **완료**. [wave 계약 artifact](./chicken_farm_w3x_artifacts/sp08_01_wave_contract.json)에 phase별 0.2초 replenish, 35/22초 target increment, 60초 global `attack` refresh, Player(10) 범위와 현재 웹 구현 차이를 분리해 기록했다. runtime scheduler·spawn·browser 검증은 수행하지 않았다.
- 원본 근거: `wolf_wave_phase_reference.tsv`의 10개 phase와 `jass_timer_events.tsv`의 0.20/35/22/60초 timer, `jass_wolf_order_flows.tsv`의 spawn-entry 및 전역 order를 대조했다. JASS 추출에는 일반 농부/닭/건물 우선순위가 없으므로 이를 웹 전투 정책으로 유지한다.
- 미확인: 120초 초기 tier 목표, 35/22초마다의 증가량, timer reset/overlap, 1기 부족 시 2기 batch 초과 여부는 현재 추출 artifact만으로 확정할 수 없다. artifact에 원본 미확인으로 기록했으며 SP-08-05/07/08에서 임의 수치로 원본 복원 완료를 주장할 수 없다.
- 결정: wave scheduler는 owner 10의 wave-managed 일반 runtime 적만 population으로 세고, phase 전환은 기존 적을 제거하지 않는다. spawn 실패는 다음 0.2초 tick에서 재시도하며, 같은 simulation timestamp에서는 phase → target increment → replenish → global refresh 순서를 사용한다. phase의 첫 periodic increment는 활성화 한 주기 뒤라는 웹 결정을 명시했다.
- 검증: 지정 TSV·`balance.ts`·`combatPocSystem.ts` 정적 대조와 `git diff --check`를 수행했다. 코드 변경이 없으므로 typecheck/build/browser는 실행하지 않았다.
- 다음 ID: **SP-08-02 — 13 spawn rect 좌표 manifest·정적 검증**.

### SP-08-02 — 13 spawn rect 좌표 manifest

- 읽기: jass_wolf_spawn_points.tsv, initialPlacementManifest.ts, 초기 placement 검사와 tilemap/WPM 변환 코드.
- 작업: waveSpawnManifest.ts에 원본 rect ID·bounds와 변환된 world bounds를 둔다. 기존 좌표 API를 재사용하거나 필요한 작은 공통 변환만 추출한다.
- 완료 조건: 13개 중복/누락 0, Y 반전·trim offset·rect min/max 정규화와 월드 경계를 모두 검증한다. 각 rect의 통과 가능한 셀 유무를 기록하고 맵 밖/막힌 경우를 숨기지 않는다.
- 검증·artifact: 새 waves:check의 coordinates 사례와 wave_check_pure.json. source→world→기준 tile/WPM 좌표 대조.

#### SP-08-02 결과

- 상태: **완료**. `waveSpawnManifest.ts`에 JASS 13 rect의 symbol·line·원본 bounds·world bounds를 등록했고, `w3xRectToPhaserWorld()`가 기존 `w3xPositionToPhaserWorld()`를 재사용한다. 변환은 `world = W3X + (3008, 7456)`이며 Y축 반전이 없다.
- 정적 대조: 모든 transformed rect는 192×192px이고 10080×10528px world 안에 있다. `spawns` object layer의 동명 `wolf_spawn_rect_01`~`13` marker는 scale 2를 적용한 top-left/bounds가 manifest와 각각 일치한다. marker는 시각·대조용이고, 원본 W3X rect가 권위 있는 spawn 영역이다.
- pathing: [coordinates artifact](./chicken_farm_w3x_artifacts/wave_check_coordinates.json)는 13개 rect마다 36/36 static WPM ground cell이 통과 가능함을 기록했다. 동적 construction blocker와 wolf footprint clearance는 아직 선택기의 runtime 판단이 아니므로 SP-08-03에서 검사한다.
- 변경: `scripts/check-chicken-farm-waves.ts` 및 `chicken:waves:check`를 추가했다. 이번 검사는 manifest/좌표/pathing만 다루며 scheduler·적 생성·attack order는 연결하지 않았다.
- 검증: `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-03 — 재현 가능한 spawn 지점 선택과 실패 처리**.

### SP-08-03 — spawn 좌표 선택과 실패 처리

- 읽기: 02 manifest, terrain pathing 공개 API, combat wolf footprint/radius 설정.
- 작업: 주입 가능한 RNG로 rect와 내부 후보를 고르고 terrain·현재 blocker·적 크기를 검사한다. 유한 후보 수, 모든 후보 실패 시 다음 보충 tick 재시도 정책을 구현한다.
- 완료 조건: 같은 seed/state는 같은 결과, 13 rect 각각 선택 가능, 막힌 후보/경계 밖 spawn 0, 실패 시 등록·population 증가 0. 원본 rect와 최종 좌표·fallback 이유를 기록한다.
- 검증·artifact: waves:check의 spawn_selection: 전부 막힘·일부 막힘·경계·반복 seed. 임의 농장 좌표로 몰래 이동시키지 않는다.

#### SP-08-03 결과

- 상태: **완료**. `waveSpawnSelector.ts`의 순수 `selectWaveSpawnPoint()`는 원본 manifest rect만 순환해 선택하며, 주입된 RNG로 시작 rect와 rect 내부 후보를 정한다. 후보는 2-cell wolf clearance(half 16px)의 32×32 footprint가 rect·world 안에 있고 static terrain 및 dynamic blocker와 겹치지 않을 때만 반환한다.
- 실패 정책: rect마다 기본 4회 후보를 시도한 뒤 다음 원본 rect를 검사한다. 모든 후보가 막히거나 rect가 clearance보다 작으면 `null`을 반환하며 다른 농장 좌표로 이동시키지 않는다. scheduler가 `null`을 받으면 적 registry/population을 변경하지 않고 다음 0.2초 replenish tick에 재시도한다.
- 검증: [spawn-selection artifact](./chicken_farm_w3x_artifacts/wave_check_spawn_selection.json)는 동일 seed/state 재현, 13개 rect 각각의 선택, 첫 후보가 static terrain 또는 dynamic blocker에 막힌 뒤 다음 후보 선택, world 전체 blocker의 `null`, clearance보다 작은 boundary rect의 `null`을 기록한다. 정상 선택도 실제 static WPM footprint 검사에 통과한다.
- 범위: runtime scene의 `TerrainBlocker`와 건설 blocker를 selector에 주입하고 spawn API를 호출하는 연결은 SP-08-10이며, 이번 카드는 scheduler·적 생성·명령을 추가하지 않았다.
- 검증 명령: `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`.
- 다음 ID: **SP-08-04 — 일반 18티어 rawcode → EnemyId 데이터**.

### SP-08-04 — 일반 18티어 식별·기본 데이터

- 읽기: jass_wolf_unit_tiers.tsv, combat_unit_stats_reference.tsv, balanceTypes.ts#EnemyId와 balance.ts#enemies, runtime spawn의 데이터 소비.
- 작업: 1~18 tier/rawcode/EnemyId의 완전한 매핑과 누락된 기본 HP·armor·speed·damage·cooldown 등 필수 전투 데이터를 추가한다. 기존 ID의 의미를 바꾸지 않고 unknown rawcode를 거절한다.
- 완료 조건: 18개 매핑의 중복/누락 0, boss 혼입 0, 기본 데이터 출처 또는 웹 변환 표시. 서로 다른 tier를 timber_wolf 하나로 대체하지 않는다. 특수 능력은 SP-10 목록으로 남긴다.
- 검증·artifact: typecheck와 waves:check의 tiers. 기존 enemy 데이터 소비부가 새 union으로 정상 컴파일되는지 확인.

#### SP-08-04 결과

- 상태: **완료**. `waveEnemyTiers.ts`에 JASS `iIi[1..18]` 순서의 rawcode→tier→`EnemyId` 매핑을 두고, rawcode 또는 tier 조회에서 boss/unknown 값을 `null`로 거절한다. 18개 rawcode와 `EnemyId`는 모두 고유하다.
- 기본 데이터: `EnemyId`와 `CHICKEN_FARM_BALANCE.enemies`를 18 일반 tier로 확장했다. `combat_unit_stats_reference.tsv`의 HP·armor·speed·cooldown을 보존하고, `base + 1dN` 피해는 현재 웹 combat 모델에 맞춰 `Math.round(base + (N + 1) / 2)`의 고정 피해로 변환했다. score는 tier별 10 단위 웹 progression이며 W3X 보상 수치가 아니다.
- 소비 경계: `CombatWolf.enemyId`를 `EnemyId`로 좁히고, 늑대의 HP·acquire/range·cooldown·피해 판단이 고정 `timber_wolf` 대신 각 늑대의 tier config를 읽도록 변경했다. special ability rawcode와 소환은 데이터에 실행하지 않으며 SP-10에서 처리한다.
- 검증: [tier artifact](./chicken_farm_w3x_artifacts/wave_check_tiers.json)는 source TSV를 직접 읽어 18 rawcode, 일반 태그, 기본 수치와 고정 피해 변환을 대조한다. typecheck, waves check, 기존 combat all, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-05 — phase 설정 정규화**.

### SP-08-05 — phase 설정 정규화

- 읽기: 01 계약, wolf_wave_phase_reference.tsv, balance.ts/waves와 balanceTypes.ts의 WaveEvent/WaveBalance 및 소비처.
- 작업: 10개 phase에 활성 tier·진입 delta·주기/증분·보충 간격을 data로 표현한다. 축약 timeline과 새 scheduler의 실행 권한을 단일화하고 보스 정보는 인계용으로 보존한다.
- 완료 조건: 120~3000초 10개 milestone·35→22초 변경·tier 범위가 원본과 일치한다. 기존 timeline과 중복 생성할 경로가 없다.
- 검증·artifact: waves:check의 phases: 정렬/중복/없는 tier/음수 수량 거절. typecheck.

#### SP-08-05 결과

- 상태: **완료**. `waves.ordinaryPhases`를 120~3000초의 10개 canonical phase로 교체했다. 각 phase는 활성 tier, 원본 phase 진입 delta, 0.2초 replenish, 35초 또는 22초 target increment interval을 보존한다. 이전 `timeline`과 근거 없는 min-alive 값은 제거해 두 생성 경로가 공존하지 않는다.
- 미확인 보존: 추출 원본에 없는 120초 초기 target 및 periodic target 증가량은 `periodicTargetDeltas: null`로 명시했다. SP-08-07은 이를 수치로 임의 확정하지 않고 source recovery 또는 별도 웹 결정이 필요하다.
- 보스 인계: H012/H00X/H013/H01B/H01N milestone은 `bossMilestonesForSp10`에 source handoff 전용으로 남겼으며 이 카드에서는 boss spawn·reward·final lifecycle을 실행하지 않는다.
- 검증: [phase artifact](./chicken_farm_w3x_artifacts/wave_check_phases.json)는 10 milestone, tier range, 35→22초 전환과 entry delta를 원본 TSV에 대조하고 duplicate milestone·unknown tier·negative delta를 거절한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-06 — 순수 phase clock**.

### SP-08-06 — 순수 phase clock

- 읽기: 05 설정, main.ts update/elapsedSec 연결 방식.
- 작업: waveScheduler.ts에 run 시작·tick·현재 phase·다음 경계를 두고 시간 주입만으로 전이하게 한다. 경계 시각의 event 순서와 반복 호출 idempotence를 구현한다.
- 완료 조건: 각 milestone 직전/정각/직후, 같은 timestamp 반복, 여러 경계 통과, 역행/비정상 입력을 검사한다. phase 이벤트 각 1회이며 3000초가 종료를 발생시키지 않는다.
- 검증·artifact: waves:check의 clock. 고정 시간열과 분할 delta로 동일 event 순서 확인.

#### SP-08-06 결과

- 상태: **완료**. `waveScheduler.ts`의 순수 `createWaveScheduler()`는 simulation elapsed time만 받아 phase 시작 이벤트를 생성한다. Phaser scene·wall clock·spawn/population state에는 연결하지 않았다.
- 시간 규칙: 각 `atSec` 도달 또는 초과 시 phase를 오름차순으로 정확히 한 번 반환한다. 같은 timestamp의 재호출은 빈 배열이며, 큰 시간 점프도 건너뛴 모든 phase를 순서대로 반환한다. 시간 역행, 음수, `NaN`은 거절한다.
- 최종 phase: 3000초는 종료 이벤트가 아니라 마지막 ordinary phase의 시작이다. 이후 scheduler snapshot은 current phase 3000, next phase `null`을 유지한다.
- 검증: [clock artifact](./chicken_farm_w3x_artifacts/wave_check_clock.json)는 각 경계 직전/정각/직후, 반복 timestamp, 2400초 점프, 3000초 final phase, invalid time과 one-jump/분할 시간열의 동일 event order를 기록한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-07 — 목표 population 증분**.

### SP-08-07 — 목표 population 증분

- 읽기: 01 확정 population 규칙, 06 scheduler.
- 작업: tier별 목표 수량 초기화, phase 진입 delta와 주기 delta, 35/22초 due time을 구현한다. 이전 phase 목표 유지/전환 규칙을 계약대로 적용한다.
- 완료 조건: 첫 증분 시점·phase 중첩 경계·2800초 주기 변경·inactive tier를 검증한다. 같은 tick에 목표가 두 번 증가하지 않는다.
- 검증·artifact: waves:check의 population_targets에 계약으로 계산한 expected 수량표 저장. 실제 적은 아직 생성하지 않는다.

#### SP-08-07 결과

- 상태: **완료**. `wavePopulationTargets.ts`는 scheduler phase event를 받아 tier별 known phase-entry delta ledger와 현재 active tier를 유지한다. phase 밖 tier는 replenish 대상 snapshot에서 제외하지만, 나중 phase에 다시 활성화되면 누적된 known delta를 보존한다.
- 미확인 보존: 120초 초기 target과 모든 periodic increment amount는 원본 추출에 없으므로 `targetQuantity: null`을 유지한다. 35/22초 due time은 `periodic_target_increment_unresolved` 이벤트로 기록할 뿐 spawn 가능한 수량을 만들지 않는다.
- 시간 규칙: phase entry의 known delta를 먼저 적용하고 첫 periodic due는 phase 시작 한 주기 뒤다. 같은 timestamp 재호출은 state를 바꾸지 않으며, phase 전환 시 이전 phase의 due를 먼저 처리한 뒤 새 phase interval로 교체한다.
- 검증: [population-target artifact](./chicken_farm_w3x_artifacts/wave_check_population_targets.json)는 120초의 null 초기 target, 155초 첫 due, 600초 중첩 phase delta, inactive tier 제외, 2800초 22초 due, 3000초 final delta와 one-jump/분할 tick의 동일 순서를 기록한다. 실제 적 생성은 하지 않았다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-08 — 부족분 보충 계산**.

### SP-08-08 — 부족분 보충 계산

- 읽기: 07 목표 상태, 01의 batch/초과·생존 집계 계약.
- 작업: 생존 tier별 수를 입력받아 0.2초 due 보충 요청을 계산한다. 배치 2, 부족 1, 목표 충족/초과, inactive tier, 생성 실패 재시도를 처리한다.
- 완료 조건: 경계별 요청 rawcode·수량이 계약과 일치한다. spawn 성공 전 alive를 확정하지 않으며 프레임마다 무제한 보충하지 않는다.
- 검증·artifact: waves:check의 replenish: 0/1/2 이상 부족, 다중 tier, 연속 tick, 생성 실패, 서로 다른 frame 분할.

#### SP-08-08 결과

- 상태: **완료**. `waveReplenish.ts`의 순수 `calculateWaveReplenishPlan()`은 active target과 canonical live tier count를 받아 rawcode·EnemyId·tier별 생성 요청만 계산한다. registry·alive count·spawn sequence는 변경하지 않는다.
- batch 정책: 원본의 2기 batch는 보존하되, 1기 부족 시 목표를 넘기지 않도록 `min(shortage, 2)`를 요청하는 웹 안전 결정을 적용했다. 원본이 1기 부족을 2기로 초과 생성하는지 여부는 확인되지 않았으므로 W3X 재현 주장에 포함하지 않는다.
- 미확인 경계: `targetQuantity: null`인 현재 live population target은 요청 0으로 처리하고 unresolved tier를 반환한다. 따라서 아직 source 미확인 수치를 자연 spawn으로 변환하지 않는다.
- 검증: [replenish artifact](./chicken_farm_w3x_artifacts/wave_check_replenish.json)는 0/1/2 이상 부족, rawcode 매핑, target 충족/초과, inactive tier 무시, unresolved target, 생성 실패 뒤 같은 입력 재시도, updated live count의 다음 tick 요청 0을 대조한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-09 — 관찰 API와 browser 진입점**.

### SP-08-09 — 관찰 API와 browser 진입점

- 읽기: main.ts#__chickenFarmDebug와 run guard, scripts/check-chicken-farm-combat.ts harness.
- 작업: read-only wave snapshot과 새 wave browser runner를 만든다. scheduler가 연결되기 전 baseline의 not-started 상태를 표현하고 이후 enabled 상태와 구분한다.
- 완료 조건: baseline에서 normal P3 fixture·wave 적 0, snapshot 반복 읽기 부작용 0, browser 오류 0. 이후 사용할 case selector·artifact 형식을 문서화한다.
- 검증·artifact: typecheck와 CHICKEN_FARM_WAVE_CASE=baseline npm run chicken:wave:check --workspace @games/chicken-farm. 이 카드에서 명령 신설.

#### SP-08-09 결과

- 상태: **완료**. `window.__chickenFarmDebug.getWaveSnapshot()`을 추가했다. 이 카드 완료 시에는 scheduler 미연결의 `not_started` 상태를 노출했고, SP-08-10부터 같은 API가 `enabled` 상태와 live scheduler snapshot을 제공한다.
- browser runner: `scripts/check-chicken-farm-wave-runtime.ts`, `chicken:wave:check`, `CHICKEN_FARM_WAVE_CASE=baseline`을 추가했다. normal P3·debug fixture false로 Vite/Playwright를 실행하고 `wave_check_baseline.json`에 case·profile·snapshot·browser 오류를 기록한다.
- 검증: [baseline artifact](./chicken_farm_w3x_artifacts/wave_check_baseline.json)는 normal P3의 fixture/runtime wave 적 0과 두 snapshot의 동일성, console/page/request/response 오류 0을 기록한다. 이 카드 당시 scheduler·spawn·clock 가속은 연결하지 않았고, SP-08-10 이후 baseline은 enabled scheduler의 자연 적 0을 확인한다. `npm run typecheck --workspace @games/chicken-farm`, `CHICKEN_FARM_WAVE_CASE=baseline npm run chicken:wave:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-10 — normal run scheduler와 spawn 연결**.

### SP-08-10 — normal run scheduler와 spawn 연결

- 읽기: main.ts create/update/shutdown, 03 선택기, 08 scheduler, CombatPocSystem.spawnRuntimeEnemy/getRuntimeEnemySnapshot.
- 작업: run당 scheduler 하나를 scene simulation clock으로 갱신하고 보충 요청을 실제 적 생성 API에 전달한다. ID에 run/tier/sequence를 포함하고 owner 10·rect·spawn 시각을 보존한다.
- 완료 조건: normal 시작·120초 전 적 0, 첫 due 이후 실제 registry/view 등록과 정확한 tier/owner/좌표. spawn 실패는 유령 alive/중복 ID를 남기지 않는다. fixture가 scheduler를 대체하지 않는다.
- 검증·artifact: browser first_spawn: 명시적 테스트 clock으로 경계 이동하되 production tick 경로 사용. typecheck. 정상 속도 증거는 17에서 별도 확인.

#### SP-08-10 결과

- 상태: **완료**. run마다 `WaveScheduler`와 population target 상태를 생성하고 scene simulation clock에서 갱신한다. 0.2초 replenish due는 canonical runtime enemy snapshot을 live count로 읽고, `selectWaveSpawnPoint()`의 W3X rect·terrain·dynamic blocker 판정 후 `CombatPocSystem.spawnRuntimeEnemy()`에 전달한다.
- runtime 기록: 성공한 요청만 `wave-r<run>-t<tier>-s<sequence>` ID와 owner 10, source rect ID, spawn 시각·좌표를 기록한다. selector 또는 registry spawn 실패는 sequence·managed enemy registry를 변경하지 않아 유령 alive를 남기지 않는다. run dispose와 새 run 초기화는 scheduler·target override·managed metadata를 제거한다.
- source 경계: normal P3는 현재 원본 미확인 `targetQuantity: null`을 그대로 사용하므로 scheduler enabled 상태에서도 자연 spawn 0이다. test profile의 `setWaveTargetQuantityForTest()`는 source 값을 대체하지 않는 명시적 target override이며, `advanceWaveForTest()`는 scene의 production wave tick만 호출한다.
- 검증: [first-spawn artifact](./chicken_farm_w3x_artifacts/wave_check_first_spawn.json)는 120초 전 0, 120초 경계의 actual combat registry/view 등록, tier 1/timber_wolf, owner 10, run/tier/sequence ID, W3X spawn rect와 시각·좌표를 기록한다. [baseline artifact](./chicken_farm_w3x_artifacts/wave_check_baseline.json)는 enabled scheduler의 normal P3 자연 적 0과 browser 오류 0을 기록한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run chicken:waves:check --workspace @games/chicken-farm`, 두 wave browser case, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-11 — 적 사망·제거와 재보충**.

### SP-08-11 — 적 사망·제거와 재보충

- 읽기: combat damage/remove/clear lifecycle, runtime snapshot, scheduler population 입력.
- 작업: canonical 생존 상태에서 population을 읽어 사망·직접 제거·중복 제거를 반영한다. phase 밖 기존 적은 계약대로 유지하며 신규 보충 대상과 분리한다.
- 완료 조건: 실제 공격 사망 후 alive 1 감소와 다음 due 보충, 중복 제거에 음수 집계 없음, owner/tier 혼동 없음. phase 전환으로 살아 있는 적을 임의 삭제하지 않는다.
- 검증·artifact: browser replenish에 actual combat death와 explicit remove 하위 사례를 분리 기록. 해당 combat lifecycle 회귀.

#### SP-08-11 결과

- 상태: **완료**. wave metadata는 `CombatPocSystem.getRuntimeEnemySnapshot()`의 canonical live registry와 매 wave tick 동기화한다. 따라서 combat damage 사망과 `removeRuntimeEnemy()` 직접 제거는 다음 replenish 요청 전에 metadata와 population count에서 함께 제거되며, 같은 ID의 중복 remove는 count를 음수로 만들지 않는다.
- phase 경계: live wave 적의 metadata는 phase의 active tier 목록과 별도로 유지한다. 600초 phase 전환에서 tier 1이 새 target 대상에서 빠져도 기존 tier-1/owner-10 적은 combat registry와 wave snapshot에 남고, 이후 신규 보충만 새 active tier로 제한된다.
- test 경계: `damageWaveEnemyForTest()`는 debug fixture profile에서 production `damageEnemyTarget()` 사망 lifecycle을 호출한다. target override와 `advanceWaveForTest()`는 계속 명시적 test-only 입력이며 normal P3의 unresolved natural target을 바꾸지 않는다.
- 검증: [runtime replenish artifact](./chicken_farm_w3x_artifacts/wave_check_runtime_replenish.json)는 120초 생성 뒤 combat 사망 → 120.2초 보충, 직접 remove → 120.4초 보충, 중복 remove false, 600초 phase 전환 뒤 기존 생존 적 보존을 기록하며 browser 오류는 0이다. `npm run typecheck --workspace @games/chicken-farm`, `CHICKEN_FARM_WAVE_CASE=replenish npm run chicken:wave:check --workspace @games/chicken-farm`, `CHICKEN_FARM_COMBAT_CASE=unit_attack npm run chicken:combat:check --workspace @games/chicken-farm`, `git diff --check`를 통과했다.
- 다음 ID: **SP-08-12 — spawn-entry 공격 목적지**.

### SP-08-12 — spawn-entry 공격 목적지

- 읽기: jass_wolf_order_flows.tsv와 order areas, combatPocSystem.ts#issueWolfAttackMoveOrder/getLocalWolfAttackMoveRect.
- 작업: 01에서 정한 공격 영역/웹 변환 정책으로 spawn 직후 attack-move를 발행한다. 빈 target 목록·invalid point fallback과 재진입 적용 범위를 명시한다.
- 완료 조건: wave 적은 실제 spawn rect에서 출발하고 유효 목적지를 갖는다. 현재 교전 focus와 원래 이동 목표가 구분되며 실제 P3 농장 방향으로 이동할 재현 사례가 있다.
- 검증·artifact: browser spawn_order: rect/목적지/경로·이동 전후 위치 기록. 원본 broad rect와 웹 local 영역을 혼동하지 않는다.

### SP-08-13 — 60초 global attack refresh

- 읽기: 기존 refreshWolfAttackMoveOrderIfNeeded/shouldRefreshWolfAttackMove, 06 clock과 12 명령 경계.
- 작업: 개체 spawn 시각과 무관한 전역 60초 tick을 연결한다. 기존 stuck/reached 재명령을 별도 이유로 구분해 중복 global 갱신을 없앤다. 교전 중 refresh 적용과 범위는 01 계약을 따른다.
- 완료 조건: 서로 다른 시각에 생성된 owner 10 적이 같은 전역 tick에 각 1회 갱신된다. 살아 있는 교전 적·idle·stuck 사례와 dead/다른 owner 제외를 검사한다.
- 검증·artifact: 순수 refresh 경계 검사와 browser refresh. 120초 phase/spawn과 global tick이 겹칠 때 계약 순서 검증.

### SP-08-14 — 실제 농장 진입·펜스 재경로

- 읽기: SP-07 blocker/integration 사례, wolfMovementPathAdapter와 실제 건설/경제 target provider.
- 작업: wave scheduler로 생성한 적을 실제 P3 농부·개·닭·완성 건물과 교전시킨다. 열린 우회와 밀폐 fence 파괴 뒤 이동 재개를 검수하고 연결 결함만 수정한다.
- 완료 조건: 동일 combat registry/HP 사용, fence 피해→제거→blocker revision→stale focus 해제→repath 관찰. 도달 불가는 유한 재시도이며 지형 통과/teleport 없음.
- 검증·artifact: browser farm_blocker. 테스트 건설·자원 fixture 여부와 자연 wave spawn 여부를 각각 명시한다. 실패한 경로를 직접 move로 덮어 통과시키지 않는다.

### SP-08-15 — wave 상태가 있는 same-page restart

- 읽기: main.ts dispose/restart/run guard, scheduler dispose와 combat clear 경로.
- 작업: scheduler·tick due·RNG·sequence·population·명령 참조를 새 run으로 초기화하고 이전 callback/debug 참조를 무효화한다.
- 완료 조건: 교전/보충 대기/phase 전환 상태에서 2회 restart. 새 run 시작 적 0, 이전 적/타이머/주문 0, 과거 callback 영향 0, 새 120초 wave 한 번 생성.
- 검증·artifact: browser restart와 기존 combat restart. snapshot에 old/new runId와 예정 tick·alive 수 기록.

### SP-08-16 — 전 phase·18티어 runtime 검수

- 읽기: 01 수량표, 05 설정, 10~15 통합, test clock API.
- 작업: 가속된 명시적 테스트 profile에서 production scheduler를 작은 step으로 돌려 10개 phase와 18티어 생성 경계를 검수한다. 장시간 개체 누적은 별도 통제하고 통제 내용을 기록한다.
- 완료 조건: 모든 일반 tier의 rawcode/EnemyId/owner/spawn·기본 전투 처리, phase별 목표/생존/보충, 이전 phase timer 중복 0, boss 생성 0. 3000초 이후 일반 보충도 검사한다.
- 검증·artifact: browser phases와 순수 전체 검사. 가속·적 제거 fixture가 있는 증거를 정상 속도 생존/밸런스 검수로 부르지 않는다.

### SP-08-17 — 정상 속도 첫 wave 통합

- 읽기: 정상 시작 계약, 기존 normal 경제/건설 입력 harness, 10~14 실제 wave 경로.
- 작업: fixture·시간 점프·debug 자원 없이 normal P3에서 실제 입력으로 닭 분양/농장 건설을 준비하고 120초 첫 자연 wave와 농장 이동·교전을 관찰한다.
- 완료 조건: 기본 wallet 보존, 120초 전 wave 0, 첫 생성·spawn 명령·농장 접근·실제 피해 증거와 browser 오류 0. 첫 스폰만 관찰하고 농장 연결까지 완료 처리하지 않는다.
- 검증·artifact: browser normal_integration: 120초와 이동 시간을 포함한 유한 timeout/진행 로그. 운에 의존하지 않게 production RNG와 동일 로직의 재현 seed를 기록. 정상 속도 첫 구간만 검증하며 50분 완주는 SP-15/16.

### SP-08-18 — 회귀·W3X 비교·인계

- 읽기: 모든 SP-08 artifact, SP-07 비교, backlog/current context.
- 작업: 필수 검사 후 SP-08 W3X 비교 문서에 보존/변환/미구현을 정리한다. 보스·능력/보상, 종료, pause/hidden, 밸런스·성능 항목을 해당 SP에 인계하고 실제 완료 상태만 동기화한다.
- 완료 조건: 실패/미확인 사항이 없거나 명시적으로 후속 범위임을 입증한다. wave fixture 없는 normal 증거와 가속 전 phase 증거를 구분한다. 다음 상위 실행은 SP-09.
- 검증·artifact: typecheck/build, waves:check, wave:check all, combat all, economy all, controls/construction의 all selector 지원 확인 후 전체 검사, start-regression, player-pathing. 중복 실행하지 말고 명령/종료 코드/artifact를 기록.

## Terra Medium 실행 요청 템플릿

```text
닭농장 SP-08-01만 진행해줘.
docs/chicken_farm/chicken_farm_sp08_task_plan.md와 current context를 읽고,
해당 카드의 읽기 범위·완료 조건·검증을 따라 작업해줘.
원본 근거와 웹 변환을 구분하고 기존 사용자 수정은 보존해줘.
결과·artifact·미확인 사항·다음 ID를 기록하고 다음 task는 시작하지 마.
```

02 이후에는 ID만 바꾼다. 카드가 예상보다 커지면 남은 부분을 같은 ID의 하위 카드로 분리해 기록하고, 검증하지 않은 부분을 완료로 표시하지 않는다.

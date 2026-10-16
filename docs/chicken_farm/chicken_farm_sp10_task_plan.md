# SP-10 적 단계·보스·보상 연결 — Terra Medium 실행 계획

> 갱신: 2026-10-16. SP-10-01 적·보스·능력 coverage, SP-10-02 보상 계약, SP-10-03 canonical 정의, SP-10-04 읽기 전용 snapshot·harness를 완료했다. 다음 실행은 **SP-10-05**다. 나머지 24개 상위 세부 Task는 미착수다. Terra Medium에서 **한 요청에 한 ID**만 수행한다. 모델 명칭은 실행 권장 설정이며 이 문서가 현재 모델을 전환하거나 구현을 실행하지 않는다.

## 목표와 범위

SP-08의 일반 적 웨이브와 SP-09의 성장 경로 위에 적 능력, 보스 출현·전투, 처치 점수·XP·레벨 보상·아이템 획득을 연결한다. 동일한 entity/HP/owner/wallet/inventory와 simulation clock을 사용하고 중복 처치·지급·소환을 막는다. SP-11이 최종 보스와 연결 소환체까지 확인해 종료할 수 있는 진행 상태를 제공한다.

승리/패배 판정·농부 부활·결과 화면은 SP-11, 상점·특수 이벤트/NPC·가족/용병·아이템 사용 효과 확장은 SP-12, pause/hidden 시간 정책은 SP-13, HUD 전면 개선은 SP-14, 수치 조정과 한 판 밸런스는 SP-15다. SP-10 필수 능력을 근거 없이 후속으로 밀어 완료 처리하지 않는다. level 해금·보상 지급과 실제 스킬/아이템 사용 구현은 coverage에서 별도로 표시한다.

## 현재 코드·자료에서 확인한 출발점

| 영역 | 확인한 사실 | 계획상 처리 |
| --- | --- | --- |
| 일반 적 | `waveEnemyTiers.ts`에 rawcode 기준 18티어, SP-08에 phase/보충/실제 생성 검증이 있다. | 일반 wave를 재작성하지 않고 능력과 lifecycle을 확장한다. |
| 보스 시간표 | `balance.ts#bossMilestonesForSp10`에 H012 600초, H00X 1500초, H013 2200초, H01B 2600초, H01N 3000초가 있다. | 데이터 존재와 실제 spawn/능력 완료를 구분한다. |
| 전투 연결 | `combatPocSystem.ts`에 `spawnRuntimeEnemy`, `removeRuntimeEnemy`, `recordWolfDied`, `markWolfDead`가 있다. | 사망 이벤트와 제거 이유를 확장해 보상/소환/종료 추적을 연결한다. |
| 능력 근거 | `wolf_ability_reference.tsv`의 일부는 이름만 확인되었고 A03B/A03H/A03F 등은 unknown이다. | 효과·수치를 추측하지 않고 01에서 근거/웹 정책을 명시한다. |
| 보상 차이 | 현재 blood_wolf score는 40이며 원본 후보 표의 H012 처치 점수는 150이다. | 기존 값을 무조건 원본 값으로 덮지 않고 02에서 채택 정책을 정한다. 점수는 gold가 아니다. |
| XP/드롭 | 보스군의 150 XP 흐름은 보스 성장 후보다. 일반 보스 직접 아이템 드롭은 자료에서 미확인이다. | 농부 XP와 혼동하지 않는다. 거미/골렘 드롭·농부 레벨 아이템을 별도 계약으로 처리한다. |
| 최종 목표 | SP-01은 아키몬드·추적 wave 적·연결 소환체 제거와 농부 생존을 요구한다. | final 이후 보충 중단과 추적 상태를 제공하고 승패 결정은 SP-11에서 한다. |

코드 경로는 별도 표기가 없으면 `games/chicken-farm/src/game/` 기준이다. `main.ts`는 `games/chicken-farm/src/main.ts`, runner는 `scripts/`, TSV/JSON은 `docs/chicken_farm/chicken_farm_w3x_artifacts/` 기준이다. **새 계약 JSON, SP-10 runner/selector/artifact, 비교표는 아직 없으며 각 구현 카드에서 추가한다.** 이번 문서는 소스/기존 자료 정적 검토에 기반하며 W3X 원본 실행 관찰 또는 SP-10 runtime 검증 결과가 아니다.

## 실행 규칙

1. 기본 실행은 01→02→…→28이다. 선행 열은 최소 의존 관계이며 병렬 실행 지시가 아니다. 매 요청에서는 해당 카드·직접 선행 계약·관련 코드만 읽는다.
2. 한 카드가 독립 효과 여러 개 또는 core+여러 adapter 변경으로 커지면 구현 전 `SP-10-14-a`처럼 하위 카드로 나눈다. 하위 카드마다 읽기/수정/완료/검증을 기록하고 한 요청에 한 하위 ID만 수행한다. 부모 완료는 필수 하위 카드 전체 통과 뒤다. 28개는 고정 작업량·토큰·소요 시간 보장이 아니다.
3. 01/02에서 원본 사실·웹 변환·미확인을 확정한다. 접근 불가 원본이나 불명확한 효과는 질문/후속 조사 항목으로 기록하며 근거가 없는 구현을 원본 복원으로 부르지 않는다. 명시적 웹 baseline은 원본과의 차이를 남긴다.
4. 기존 사용자 수정과 SP-08/09 계약을 보존한다. `main.ts`는 adapter 연결에 집중하고 적 능력·장부 로직은 작은 모듈로 분리한다. 일반 적 initial quantity의 active tier당 1기 웹 baseline도 유지한다.
5. 계약 문서 카드는 정적 대조, 구현 카드는 필요한 순수 사례와 실제 browser 사례 및 typecheck/build를 수행한다. 변경 범위에 관련된 회귀를 먼저 실행하고 전체 회귀는 28에서 수행한다.
6. 신규 artifact 이름은 `enemy_check_<case>.json`을 제안한다. run/owner/entity/rawcode, 입력, 기대/실제 상태, 점수·wallet·XP·item before/after, 오류 목록, fixture/가속/강제 피해 여부를 포함한다. pending/blocked를 pass로 바꾸지 않는다.
7. 완료 기록은 결과, 변경 파일, 실행 명령·종료 코드, artifact, 한계, 다음 ID로 남긴다. 새 runner를 만들기 전 존재하는 npm 명령인 것처럼 실행 안내하지 않는다.

## 실행 순서

SP-10-01은 **완료**, 나머지 카드는 **미착수**다. 선행 숫자는 SP-10 내부 ID다.

| ID | 한 요청의 산출물 | 선행 |
| --- | --- | --- |
| SP-10-01 | 일반 적·보스·능력 coverage 계약 | **완료** |
| SP-10-02 | 처치·점수·XP·드롭 계약 | **완료** |
| SP-10-03 | canonical 적 능력·보상 정의 | **완료** |
| SP-10-04 | 읽기 전용 snapshot·SP-10 harness | **완료** |
| SP-10-05 | 단일 사망 이벤트·보상 귀속 | 02/04 |
| SP-10-06 | 능력 실행 clock·대상 판정 | 03/05 |
| SP-10-07 | 일반 적 지속 피해·공통 능력 | 06 |
| SP-10-08 | 연결 소환체 registry·생성/제거 | 05/06 |
| SP-10-09 | 일반 적 소환·잔여 고유 능력 | 07/08 |
| SP-10-10 | 보스 milestone scheduler | 03/04 |
| SP-10-11 | 실제 맵 보스 생성·이동·기본 전투 | 08/10 |
| SP-10-12 | 블러드 울프 능력 | 07/11 |
| SP-10-13 | 와일드 울프 능력 | 12 |
| SP-10-14 | 헬 하운드 능력 | 13 |
| SP-10-15 | 둠 가드 소환·능력 | 08/14 |
| SP-10-16 | 아키몬드 능력·조건부 보스 coverage | 15 |
| SP-10-17 | 처치 점수·자원 보상 단일 지급 | 02/05/16 |
| SP-10-18 | 농부 XP·레벨 progression 코어 | 02/17 |
| SP-10-19 | 농부 레벨 스탯·해금 연결 | 18 |
| SP-10-20 | 필드 드롭·획득 lifecycle | 02/17 |
| SP-10-21 | 레벨 보상 아이템 지급·인벤토리 실패 처리 | 18/20 |
| SP-10-22 | final 진행 상태·SP-11 종료 입력 | 09/16/21 |
| SP-10-23 | 보스·보상 필수 HUD 피드백 | 19/21/22 |
| SP-10-24 | same-page restart·이전 run 격리 | 23 |
| SP-10-25 | 18티어·보스·난이도 통합 coverage | 24 |
| SP-10-26 | fixture 없는 normal 처치·성장 통합 | 25 |
| SP-10-27 | 보스 출현→처치→보상→final 통합 | 26 |
| SP-10-28 | 필수 회귀·W3X 비교·SP-11 인계 | 01~27 |

## 세부 실행 카드

### SP-10-01 — 일반 적·보스·능력 coverage 계약

- 상태: **완료**. 선행: SP-08/09 완료.
- 읽기: SP-01 목표, SP-08/09 비교표, waveEnemyTiers.ts, balance.ts, wolf_ability_reference.tsv, unit_rawcode_crosscheck.tsv, jass_wolf_special_spawns.tsv.
- 수정 범위: 18티어와 5개 정규 milestone 보스의 rawcode→현재 entity→능력→근거→담당 카드 표를 만든다. H01O 및 특수 적의 실제 출현 조건을 별도로 조사한다.
- 완료 조건: 각 능력을 원본 확인/이름만 확인/웹 변환/미확인으로 구분한다. 필수 능력의 적용 대상·피해/주기/범위·난이도 gate를 명시하고, 미확인 효과는 추측으로 확정하지 않는다. 필수 미해결은 완료를 막는 항목으로 남긴다.
- 검증: [정적 계약 artifact](./chicken_farm_w3x_artifacts/sp10_01_enemy_contract.json)는 18 ordinary tier와 5 정규 milestone 보스의 rawcode→EnemyId→attached ability→근거→담당 카드를 기록한다. H01O와 7개 조건부 특수 rawcode는 출현 조건 미확인으로 정규 milestone/기본 승리에서 제외했다.
- 결과/변경 파일: `sp10_01_enemy_contract.json`을 추가하고 이 카드의 상태를 완료로 갱신했다. H012/H00X/H013/H01B/H01N은 모두 원본 static spawn에서 Player(10), `(2080,-896)`에 한 번 생성되는 근거를 기록했다. ordinary tier 1~18의 mapping은 기존 `waveEnemyTiers.ts`와 대조했다.
- 검증 명령·종료 코드: `node --input-type=module` JSON parse 및 18 tier/5 regular boss mapping 정적 assertion, 종료 코드 0. 문서·artifact만 변경했으므로 typecheck/build/browser runner는 실행하지 않았다.
- artifact와 주요 assertion: A03C만 300 ground damage·stun duration·Infernal duration을 설명문으로 확인했다. A02I/A01R/A03E/A01H/A025/A02U/A03G/A01J는 이름만 확인됐고 ACct/A024/A023/A02W/A03B/A03H/A01G/A03F/A02R/A02Q는 unknown으로 남겼다. boss special은 기존 `bossSpecialAbilitiesEnabled`에 따라 Unlimited에서만 허용한다.
- 원본 대비 웹 정책·남은 문제: H01O의 분기/변환 조건 및 7개 특수 rawcode의 역할은 미확인이다. ability name만으로 범위·피해·주기·cooldown·대상·중첩을 결정하지 않으며, artifact의 `requiredBeforeSp10Completion`은 SP-10 완료 차단 항목으로 유지한다. 승리/패배는 SP-11, 특수 콘텐츠는 SP-12다.
- 다음 ID: **SP-10-02**.

### SP-10-02 — 처치·점수·XP·드롭 계약

- 상태: **완료**. 선행: 01.
- 읽기: boss_and_level_reward_candidates.tsv, jass_score_events.tsv, item_acquisition_reference.tsv, item_catalog_reference.tsv, balance.ts, economySystem.ts.
- 수정 범위: 일반 적/보스 점수, gold/lumber, XP, 농부 레벨 보상, 필드 드롭을 별개 장부로 정의한다. 공격자 owner 귀속·환경 사망·소환체·가득 찬 inventory 정책을 고정한다.
- 완료 조건: 현재 웹 score와 원본 점수의 차이를 기록하고 채택값을 명시한다. 보스에게 주는 XP를 농부 획득 XP로 오독하지 않는다. 미확인 XP 표/획득 범위는 명시적 웹 기준 또는 미해결로 남긴다. 거미/골렘 이벤트와 아이템 사용 효과의 SP-12 경계를 정한다.
- 검증: [정적 보상 계약 artifact](./chicken_farm_w3x_artifacts/sp10_02_reward_contract.json)에 ledger별 수령자·중복 키·출처·level threshold·drop table을 기록했다.
- 결과/변경 파일: `sp10_02_reward_contract.json`을 추가하고 이 카드의 상태를 완료로 갱신했다. score, wallet, farmer XP, boss XP, field drop, level-reward entitlement를 분리했다. accepted death의 stable duplicate key는 `runId + deadEntityId + deathSequence`로 고정했다.
- 검증 명령·종료 코드: `node --input-type=module` JSON parse 및 boss score/ledger/drop/threshold 정적 assertion, 종료 코드 0. 문서·artifact만 변경했으므로 typecheck/build/browser runner는 실행하지 않았다.
- artifact와 주요 assertion: H012/H00X/H013/H01B의 effective score는 각각 150/300/450/700으로 source message를 채택한다. ordinary tier는 source score 미확인이라 현재 `EnemyConfig.score` 10~180을 명시적 웹 baseline으로만 유지한다. H01N은 source score 미확인이라 `effectiveScore: null`이며 지급을 막는다. score는 gold/lumber/XP가 아니다.
- 원본 대비 웹 정책·남은 문제: boss `AddHeroXPSwapped 150`은 boss-unit growth로 기록돼 농부 kill XP로 전환하지 않으며, 웹 baseline의 농부 kill XP는 0이다. 일반/정규 보스 직접 drop은 근거가 없어 추가하지 않는다. n01D/I00G와 n01K/I00O·I00P는 source fixture로만 검증할 수 있고 자연 이벤트는 SP-12다. generic field item·full inventory·level entitlement 구현은 각각 SP-10-20/21에 남긴다.
- 다음 ID: **SP-10-03**.

### SP-10-03 — canonical 적 능력·보상 정의

- 상태: **완료**. 선행: 01/02.
- 읽기: 두 계약, balanceTypes.ts, balance.ts, waveEnemyTiers.ts.
- 수정 범위: 능력·보스·보상 정의를 타입으로 분리하고 기존 EnemyId/rawcode와 연결한다. 원본 값과 웹 유효값의 출처를 유지한다.
- 완료 조건: 18티어/5개 milestone의 참조 누락·중복 ID·잘못된 수치가 없고 unsupported를 숨기지 않는다. 기존 기본 전투 stats와 난이도 계산을 재사용한다.
- 결과: `enemyProgression.ts`에 모든 `EnemyId`의 rawcode·role·ability evidence/runtime state·score source/effective value·farmer kill XP를 한 정의로 만들었다. 18 ordinary tier는 `waveEnemyTiers.ts`, 5 정규 보스는 기존 milestone과 연결한다. 농부 level 5/10/15/20/25/30/35 보상도 canonical 정의로 분리했다.
- 안전한 미구현 표시: 31개 부착 능력은 모두 `runtimeState: unsupported`다. H01N score는 `effectiveScore: null`, farmer kill XP는 `0`이며, source score가 확인된 H012/H00X/H013/H01B 및 조건부 H01O만 source value를 보존한다. 기본 전투 stats와 난이도 계산식은 변경하지 않았다.
- 검증: `npm run chicken:enemy:progression --workspace @games/chicken-farm`은 [canonical progression artifact](./chicken_farm_w3x_artifacts/enemy_check_progression.json)를 생성하고 18 tier·5 milestone·중복 ability 없음·H01N 보류·7 threshold·unsupported 노출을 assertion한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `git diff --check`은 종료 코드 0이다. 기본 phase 회귀는 기존 `chicken:waves:check`로 별도 재실행한다.
- 원본 대비 웹 정책·남은 문제: 이 정의는 runtime reward/ability를 활성화하지 않는다. H01O 출현 조건, H01N 점수, 농부 kill XP, 모든 name-only/unknown ability의 실제 동작은 계속 완료 차단 항목이다. 실제 사망 event·snapshot은 SP-10-04/05에서 연결한다.
- 다음 ID: **SP-10-04**.

### SP-10-04 — 읽기 전용 snapshot·SP-10 harness

- 상태: **완료**. 선행: 03.
- 읽기: main.ts debug API, combatPocSystem.ts snapshot, check-chicken-farm-wave-runtime.ts, check-chicken-farm-combat.ts.
- 수정 범위: run/owner, 적 origin·parent, 능력 상태, 보스 milestone, reward ledger, XP/level, drop과 final 추적을 관찰할 snapshot 및 최소 runner를 만든다.
- 완료 조건: fixture/가속은 명시적 opt-in이고 normal boot는 변경하지 않는다. browser harness가 실제 assertion으로 실패하며 임의 스냅샷 성공을 출력하지 않는다.
- 결과: `getEnemyProgressionSnapshot()`을 기존 `window.__chickenFarmDebug`에 추가했다. active run/elapsed time, canonical enemy/ability/reward definition, 현재 runtime 적의 owner·origin·parent placeholder, 5 milestone 상태를 읽는다. SP-10 ledger·farmer progression·field drop·final tracking은 구현 전임을 `not_started` 상태와 빈 typed collection으로 명시한다.
- fixture 경계: normal P3에서는 `fixturesEnabled: false`, runtime enemy 0, milestone 모두 `pending`이다. fixture profile에서만 `createCombatEnemyFixture()`로 만든 blood wolf를 `runtime_fixture_or_other`, `parentEnemyId: null`로 관찰한다. wave registry에 등록된 적은 이후 `ordinary_wave`로 표기한다. snapshot은 state를 변경하지 않는다.
- 검증: `npm run chicken:enemy:progression:browser --workspace @games/chicken-farm`은 [normal P3 snapshot artifact](./chicken_farm_w3x_artifacts/enemy_check_snapshot.json)를 생성해 24 canonical enemy, 5 milestone, fixture off, runtime enemy 0, SP-10 ledger 미시작, browser 오류 0을 assertion한다. `CHICKEN_FARM_ENEMY_CASE=fixture npm run chicken:enemy:progression:browser --workspace @games/chicken-farm`은 explicit fixture enemy와 origin/ability evidence, reward·XP·drop mutation 없음, browser 오류 0을 확인한다.
- 실제 등록: runner는 `scripts/check-chicken-farm-enemy-progression-browser.ts`, npm 명령은 `chicken:enemy:progression:browser`, artifact는 `enemy_check_snapshot.json`이다. `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `git diff --check`은 종료 코드 0이다.
- 남은 문제: snapshot은 05 이후 생성될 사망 event/reward ledger의 관찰 surface만 예약하며, boss scheduler·ability clock·summon parent·XP·drop·final 상태를 구현하지 않는다.
- 다음 ID: **SP-10-05**.

### SP-10-05 — 단일 사망 이벤트·보상 귀속

- 상태: **완료**. 선행: 02/04.
- 읽기: combatPocSystem.ts의 피해 경로/recordWolfDied/markWolfDead/removeRuntimeEnemy, towerCombatAdapter.ts.
- 수정 범위: 농부·개·타워·능력 피해가 같은 alive→dead 전이와 death event를 사용하게 한다. attacker entity와 owner, run, 원인 및 위치를 보존한다.
- 완료 조건: 같은 tick의 다중 lethal hit는 death 1회다. 정리/despawn/restart는 처치로 보상하지 않는다. 서로 다른 owner와 환경 사망 귀속이 02 계약과 같다.
- 검증: 중복 lethal/이미 dead/제거/owner 사례의 순수 검사와 실제 타워·유닛 처치 browser 검사.
- 결과: `enemyDeathLedger.ts`에 run-scoped `deathKey`(`runId:deadEntityId:deathSequence`)와 immutable death event를 추가했다. `CombatPocSystem.damageEnemyTarget()`만 alive→dead 전이를 완료하며, 농부/개·실제 건물 타워·PoC tower adapter가 attacker entity, owner, cause, position, reward 자격을 함께 전달한다. 사망 뒤에는 같은 target이 다시 피해 대상이 되지 않아 동일 tick의 뒤따른 lethal 요청도 event를 추가하지 않는다.
- 정리 경계: `removeRuntimeEnemy()`와 restart/dispose는 death ledger를 기록하지 않는다. 환경·debug damage는 `ownerPlayerId: null`, `rewardEligible: false`로 명시한다. 이 task는 지급을 수행하지 않으며 score/gold/XP/drop 연결은 후속 reward task에서 이 event를 소비한다.
- 관찰·검증: `getEnemyProgressionSnapshot()`에 `deathEvents`를 추가했다. `npm run chicken:enemy:death --workspace @games/chicken-farm`은 [death artifact](./chicken_farm_w3x_artifacts/enemy_check_death.json)로 중복 lethal 무시, run key, unit/tower owner, environment 비지급을 검사한다. `CHICKEN_FARM_COMBAT_CASE=unit_attack npm run chicken:combat:check --workspace @games/chicken-farm`은 실제 우클릭 처치의 owner/event를, `CHICKEN_FARM_COMBAT_CASE=tower_attack npm run chicken:combat:check --workspace @games/chicken-farm`은 실제 완료 타워의 damage 및 제거 후 중지를 검증한다. typecheck/build/diff check도 통과했다.
- 다음 ID: **SP-10-06**.

### SP-10-06 — 능력 실행 clock·대상 판정

- 상태: **완료**. 선행: 03/05.
- 읽기: combatPocSystem.ts, 기존 simulation update와 target adapter, 01 계약.
- 수정 범위: 공용 simulation 시간으로 cooldown·windup·대상 검증을 관리한다. 피해는 05 경로로 전달하며 생존/owner/거리/대상 종류를 재검사한다.
- 완료 조건: 사망·대상 제거 뒤 예약 타격이 새 대상에 새지 않고 cooldown이 프레임마다 초기화되지 않는다. 별도 wall-clock timer나 두 번째 HP를 만들지 않는다.
- 검증: cooldown 경계, invalid target, 시전자 사망, dt 분할 사례. pause 정책 변경은 SP-13으로 남긴다.
- 결과: `enemyAbilityClock.ts`에 simulation time 기반 start/advance 전이를 추가했다. cast 시작 시 caster+ability별 cooldown을 한 번 고정하고, windup 종료 시 caster와 원래 target을 다시 확인해 실행 또는 취소한다. 새 target으로 바꾸지 않으며, HP/사망 처리는 기존 combat/death 경로를 재사용하도록 effect 실행을 다음 task에 남겼다.
- 안전한 미구현 표시: SP-10-01의 모든 ability는 여전히 `unsupported`라 runtime cast를 예약하거나 임의 damage/stun/summon을 만들지 않는다. `CombatPocSystem.update()`가 같은 `elapsedSec`로 clock을 advance하며, snapshot에는 `ready_no_supported_abilities`, active cast 0, cooldown 0을 노출한다.
- 검증: `npm run chicken:enemy:ability-clock --workspace @games/chicken-farm`은 [ability clock artifact](./chicken_farm_w3x_artifacts/enemy_check_ability_clock.json)로 windup/cooldown 경계, invalid target, caster death, dt split을 assertion한다. normal P3 browser snapshot은 clock의 dormant 상태를 확인한다. `npm run typecheck --workspace @games/chicken-farm`, `npm run build --workspace @games/chicken-farm`, `git diff --check`은 종료 코드 0이다.
- 다음 ID: **SP-10-07**.

### SP-10-07 — 일반 적 지속 피해·공통 능력

- 상태: **완료**. 선행: 06.
- 읽기: 01 일반 적 능력표, wolf_ability_reference.tsv, 전투 대상 adapter.
- 수정 범위: 확정한 일반 적의 지속 피해/공통 효과를 한 effect family씩 연결한다. A02I는 이름만으로 원본 반경·주기를 확정하지 않는다.
- 완료 조건: 대상/범위/주기/중첩 규칙에 따라 실제 HP가 바뀌며 시전자 사망 뒤 멈춘다. 능력이 없는 티어에는 적용하지 않는다.
- 검증: 범위 안/밖, 복수 시전자, 유닛/건물/닭 허용 표와 runtime 피해 비교. 여러 독립 effect family면 07-a/b로 먼저 분할한다.
- 결과: `ordinaryEnemyAbilityPolicies.ts`로 18 ordinary tier를 전부 coverage했다. 능력 부착 기록이 없는 11개는 `base_attack_only`, ACct/A02I/A024/A023/A02W/A02U가 붙은 7개는 `blocked_source_data`로 고정했다. 이 정책은 runtime snapshot의 ordinary enemy에도 노출된다.
- 안전한 미구현 표시: `wolf_ability_reference.tsv`는 일반 적에 대해 대상·범위·주기·피해·duration·stack 규칙이 확정된 지속 피해를 제공하지 않는다. 특히 A02I는 이몰레이션이라는 이름만 확인됐으므로 자동 cast, HP 피해, aura를 만들지 않았고 ability clock에도 예약하지 않는다. 따라서 이 카드에서 추가된 능력 피해는 0이다.
- 검증: `npm run chicken:enemy:ordinary-abilities --workspace @games/chicken-farm`은 [ordinary policy artifact](./chicken_farm_w3x_artifacts/enemy_check_ordinary_abilities.json)로 18 tier coverage, 7 source-data block, executable effect 0을 assertion한다. fixture browser는 fel_ravager A02I의 block policy와 cast 0을 확인한다. typecheck/build/diff check도 통과했다.
- 다음 ID: **SP-10-08**.

### SP-10-08 — 연결 소환체 registry·생성/제거

- 상태: **완료**. 선행: 05/06.
- 읽기: spawnRuntimeEnemy, waveReplenish.ts, wavePopulationTargets.ts, terrainBlocker.ts.
- 수정 범위: 소환체 origin/parent/run/종료 추적 여부를 등록하고 실제 통과 가능한 위치에 생성한다. cap·수명·부모 사망 시 정책은 01 계약을 따른다.
- 완료 조건: 일반 tier 보충 수에 섞이지 않는다. 막힌 출구·중복 요청에서 ghost가 없고 부모 사망·수명 종료와 실제 처치를 구분한다.
- 검증: 막힌 spawn, cap, parent 제거, 수명 종료, registry/실제 entity 정합성을 검사한다.
- 결과: `linkedSummonRegistry.ts`에 parent/run/owner/enemy/lifetime 기반 active·ended registry를 추가했다. 생성은 기존 wave spawn candidate/pathing 검증을 재사용하지만 wave metadata에는 등록하지 않는다. parent 제거·lifetime expiry·외부 제거를 `parent_removed`/`expired`/`removed_external`로 구분하며, fixture safety cap은 parent당 active 1개다.
- 관찰 경계: runtime enemy snapshot은 `origin: linked_summon`과 `parentEnemyId`를 노출하고, progression snapshot은 active/ended registry를 노출한다. 아직 실제 enemy ability가 이 API를 호출하지 않으며, 수명·cap·parent-death의 원본 정책은 미확정이라 fixture lifecycle 경계일 뿐 gameplay 수치가 아니다.
- 검증: `npm run chicken:enemy:linked-summons --workspace @games/chicken-farm`은 cap, parent 제거, 수명 종료, 외부 제거의 비재생성을 검사하는 [linked summon artifact](./chicken_farm_w3x_artifacts/enemy_check_linked_summons.json)를 생성한다. fixture browser는 통과 가능한 spawn candidate에서 linked entity를 만들고 parent 제거 때 `parent_removed` cleanup을 assertion한다. typecheck/build/diff check도 통과했다.
- 다음 ID: **SP-10-09**.

### SP-10-09 — 일반 적 소환·잔여 고유 능력

- 상태: **미착수**. 선행: 07/08.
- 읽기: 01 coverage, A02U 등 일반 적 근거, 06/08 API.
- 수정 범위: 확정한 소환 능력을 실제 AI에 연결하고 일반 18티어의 남은 필수 능력을 coverage에 매핑한다.
- 완료 조건: 소환 cooldown·수량·수명·보상 자격이 계약과 같고 재귀 소환 폭주가 없다. 미확인 ACct/A024/A023/A02W를 이름 기반 효과로 채우지 않는다.
- 검증: 대표 소환의 실제 생성/공격/제거 browser 사례 및 18티어 coverage. 잔여 독립 효과는 09-a/b처럼 분할해 모두 끝낸 뒤 완료한다.

### SP-10-10 — 보스 milestone scheduler

- 상태: **미착수**. 선행: 03/04.
- 읽기: balance.ts bossMilestonesForSp10, waveScheduler.ts, wavePhaseConfig.ts, 01 계약.
- 수정 범위: 600/1500/2200/2600/3000초 milestone의 예정/생성 대기/생성 완료 상태를 기존 wave clock에 연결하는 순수 상태 전이를 만든다.
- 완료 조건: 같은 시간 재평가와 큰 dt에도 각 milestone이 1회 발생한다. 생성 실패를 완료로 소비하지 않고 01에서 정한 재시도 정책을 따른다.
- 검증: 직전/정각/직후, 여러 경계 통과, 동일 update 재호출, 생성 실패/재시도 순수 검사.

### SP-10-11 — 실제 맵 보스 생성·이동·기본 전투

- 상태: **미착수**. 선행: 08/10.
- 읽기: main.ts wave spawn 연결, waveSpawnManifest.ts, waveSpawnSelector.ts, combatPocSystem.ts.
- 수정 범위: milestone을 실제 boss entity에 연결한다. 출현 위치·수량·명령은 01 근거를 사용하고 기본 전투/난이도 resolver를 재사용한다.
- 완료 조건: 5개 rawcode가 맞는 실제 entity를 한 번 생성하고 owner·경로·HP·피해가 일치한다. 보스가 ordinary replenish 대상으로 재생성되지 않는다.
- 검증: 5개 milestone 가속 browser coverage와 blocked spawn 재시도. 가속 결과를 normal 실시간 검증으로 표기하지 않는다.

### SP-10-12 — 블러드 울프 능력

- 상태: **미착수**. 선행: 07/11.
- 읽기: 01의 H012/A03B/A02I 계약, 06 공용 실행기.
- 수정 범위: H012의 확정된 고유 능력과 공통 효과를 연결한다.
- 완료 조건: 정의된 난이도 gate와 cooldown/취소가 실제 전투에서 지켜진다. 미확인 A03B는 근거 또는 웹 정책 결정 없이는 완료하지 않는다.
- 검증: 허용/비허용 난이도, 범위/실제 피해, 사망 뒤 효과 중지 browser 사례.

### SP-10-13 — 와일드 울프 능력

- 상태: **미착수**. 선행: 12.
- 읽기: 01의 H00X/A03H/A01G 계약, 공통 실행기.
- 수정 범위: H00X의 확정 능력을 연결한다. 관련 H019가 필요한지 계약에 따라 분리한다.
- 완료 조건: 이름이 유사한 다른 entity를 임의로 같은 보스로 처리하지 않으며 시전·취소·재시전이 계약과 같다.
- 검증: 고유 효과별 실제 상태/피해 및 대상 소실 사례. 두 독립 능력이 크면 13-a/b로 분할한다.

### SP-10-14 — 헬 하운드 능력

- 상태: **미착수**. 선행: 13.
- 읽기: 01의 H013/A03E/A01R/A01H 계약, 공통 실행기.
- 수정 범위: 확정된 광역/지속/추가 공격 효과를 구현하되 별도 효과는 14-a/b/c로 나눈다.
- 완료 조건: 광역 대상 필터, 피해 중복, 이동/공격 상태 복구를 검증한다. 이름만 확인된 링오파를 근거 없이 스턴으로 확정하지 않는다.
- 검증: 각 effect family의 실제 HP/상태 전이, 범위 경계, 시전자/대상 제거 검증. 모든 필수 하위 카드 완료 후 14를 닫는다.

### SP-10-15 — 둠 가드 소환·능력

- 상태: **미착수**. 선행: 08/14.
- 읽기: 01의 H01B/A03C/A025/A023 계약, 소환체 registry.
- 수정 범위: 확정한 인페르노 계열 효과와 연결 소환체를 실제 맵에 연결한다. A03C/A025가 별도인지 중복 표현인지 계약대로 처리한다.
- 완료 조건: 착탄 피해·상태 효과·소환 생성은 각 1회이며 blocked 위치/부모 사망/소환 cap을 처리한다. 원본 설명의 300 피해를 웹 수치로 무조건 복사하지 않는다.
- 검증: 착탄/소환/타겟 제거/cap browser 사례와 소환체 보상 자격 검사.

### SP-10-16 — 아키몬드 능력·조건부 보스 coverage

- 상태: **미착수**. 선행: 15.
- 읽기: 01의 H01N/A03F/A02R/A02Q 및 H01O 조건, SP-01 종료 규칙.
- 수정 범위: 최종 보스 필수 능력을 연결하고 H01O의 normal 필수 여부를 근거로 판정한다. 필요하면 16-a(아키몬드), 16-b 이후(H01O 능력별)로 분할한다.
- 완료 조건: 최종 보스 사망 후 살아 있는 연결 소환체가 추적된다. H01O를 임의로 6번째 정규 milestone에 넣지 않는다. 필수인 조건부 보스를 단순 미확인으로 누락하지 않는다.
- 검증: 보스별 능력 coverage와 사망/소환 잔존 browser 사례. 종료 화면은 구현하지 않는다.

### SP-10-17 — 처치 점수·자원 보상 단일 지급

- 상태: **미착수**. 선행: 02/05/16.
- 읽기: reward 계약, playerWallet.ts, death event, balance score.
- 수정 범위: run+dead entity의 지급 ledger를 통해 점수와 계약상 자원 보상을 실제 owner 장부에 적용한다.
- 완료 조건: score를 gold로 전용하지 않는다. 다중 death 전달·소환체·환경 사망·타워 kill에서 중복/잘못된 owner 지급이 없다.
- 검증: 정확한 before/after 점수·wallet, 중복 이벤트, 서로 다른 entity와 run 분리 검사.

### SP-10-18 — 농부 XP·레벨 progression 코어

- 상태: **미착수**. 선행: 02/17.
- 읽기: 02 XP 획득/threshold 계약, controllableUnitSystem.ts.
- 수정 범위: owner별 농부 XP·level·이미 지급한 level milestone을 관리하고 확정한 XP 지급 조건을 death event에 연결한다.
- 완료 조건: 한 번에 여러 레벨을 넘을 때 순서대로 처리하며 최대 레벨/농부 부재/중복 event 정책이 일치한다. 보스 성장 XP는 별도 수신자다.
- 검증: threshold 직전/정각, 다중 level, 중복 XP, owner 격리 순수 검사. 보스 성장 XP가 필수면 18-b로 분리해 별도 검증한다.

### SP-10-19 — 농부 레벨 스탯·해금 연결

- 상태: **미착수**. 선행: 18.
- 읽기: 02 level 5/10/15/20/25/30/35 표, unitResearchStats.ts, 실제 농부 stats/명령 경로.
- 수정 범위: 확정한 level 스탯 보상을 base+progression으로 실제 전투/이동 계산에 연결한다. level 15 능력의 SP-10 해금 상태와 SP-12 실행 효과 경계를 명시한다.
- 완료 조건: 반복 refresh/level event가 스탯을 누적하지 않는다. HP 변경 정책과 기존 dog 연구가 보존된다. 해금 metadata와 실제 사용 가능 능력을 구분한다.
- 검증: 대표 level 전후 실제 stats·피해, 여러 milestone 통과, 재계산 idempotency. SP-10 필수 실행 효과가 크면 하위 카드로 구현한다.

### SP-10-20 — 필드 드롭·획득 lifecycle

- 상태: **미착수**. 선행: 02/17.
- 읽기: economySystem.ts 필드 item/inventory, item catalog, 02 계약.
- 수정 범위: 확정된 drop table과 RNG 입력으로 필드 item을 생성하고 기존 획득/stack/6-slot inventory 경로에 연결한다. 새 평행 inventory를 만들지 않는다.
- 완료 조건: 같은 death에서 drop 1회, full inventory에서 유실/복제가 없고 RNG 경계값을 검증한다. 일반 보스에 미확인 드롭을 추가하지 않는다.
- 검증: seed/고정 RNG로 drop/no-drop, 경계, 중복 death, 실제 pickup/full inventory browser 검증. 거미/골렘 데이터 fixture는 SP-12의 자연 spawn 완료 증거로 쓰지 않는다.

### SP-10-21 — 레벨 보상 아이템 지급·인벤토리 실패 처리

- 상태: **미착수**. 선행: 18/20.
- 읽기: 02의 I00Q/I00H/I00I/I00N 보상표, 기존 inventory API.
- 수정 범위: 20/25/30/35 등 계약상 milestone item을 1회 지급하고 full inventory 시 예약 또는 필드 배출 정책을 구현한다.
- 완료 조건: 재접근/중복 level event/동시 pickup에서도 유실·복제가 없고 다른 owner가 보상을 가로채지 않는다. 아이템 사용 효과의 후속 담당은 SP-12에 명시한다.
- 검증: 레벨별 item ID, 빈/가득 찬 inventory, 실패 후 재시도, 중복 지급 browser 사례.

### SP-10-22 — final 진행 상태·SP-11 종료 입력

- 상태: **미착수**. 선행: 09/16/21.
- 읽기: SP-01 승리 규칙, waveScheduler.ts, waveReplenish.ts, 적/소환체 registry.
- 수정 범위: 최종 phase 뒤 정규 보충 중단 정책을 연결하고 final 진입·최종 보스 사망·추적 생존 적/연결 소환체 수를 SP-11이 읽을 수 있게 만든다.
- 완료 조건: 3000초 도달이나 보스 사망만으로 승리하지 않는다. spawn pending·살아 있는 소환체·정리 지연을 구분하고 후속 보충으로 목표가 무한히 늘어나지 않는다.
- 검증: 보스만 사망/소환 잔존/모두 제거/동일 tick spawn과 death/보충 중단 사례. 농부 생존·패배 우선순위와 결과 화면은 SP-11.

### SP-10-23 — 보스·보상 필수 HUD 피드백

- 상태: **미착수**. 선행: 19/21/22.
- 읽기: farmHud.ts, main.ts HUD 갱신, snapshot.
- 수정 범위: 기존 HUD에 현재 보스/HP, 사용 가능한 능력 피드백, 점수·농부 level/XP·획득/실패 안내를 최소 연결한다.
- 완료 조건: 표시와 실제 장부가 일치하며 같은 이벤트가 메시지를 반복하지 않는다. 선택/명령 입력을 가리지 않는다.
- 검증: 실제 처치·level·pickup 전후 표시와 HUD/world 입력 누출 검사. 전면 UI 디자인은 SP-14.

### SP-10-24 — same-page restart·이전 run 격리

- 상태: **미착수**. 선행: 23.
- 읽기: main.ts disposeRun, ability/summon/reward/XP/drop state, 기존 restart runner.
- 수정 범위: 보스 시전·소환·드롭 대기·level 보상 상태가 있는 판을 같은 page에서 재시작하고 모든 run 소유 상태를 정리한다.
- 완료 조건: 이전 callback이 새 판에 피해·spawn·점수·item을 지급하지 않는다. 새 판 ledger는 비고 같은 entity ID도 새 run에서는 정상 작동한다.
- 검증: 연속 두 번 restart browser 사례, 기존 wallet/연구/공급/선택 초기화 확인 및 오류 0.

### SP-10-25 — 18티어·보스·난이도 통합 coverage

- 상태: **미착수**. 선행: 24.
- 읽기: 01/02 coverage, 신규 runner, getScaledEnemyStats와 difficulty flag.
- 수정 범위: 18티어/5개 정규 보스/필수 조건부 보스·소환체를 실제 runtime에 생성해 능력과 보상 coverage를 채운다. 8난이도 설정 적용과 Unlimited gate를 구분해 검사한다.
- 완료 조건: 정적 타입 검사만으로 능력 실행을 통과 처리하지 않는다. 미구현 필수 항목은 실패/미완료로 남기며 선택 UI 신규 구현은 포함하지 않는다.
- 검증: 공통 계산은 8난이도 순수 검사, runtime는 대표 일반 난이도와 Unlimited 및 각 고유 효과를 검증한다. fixture/가속 여부와 대상별 증거를 남긴다.

### SP-10-26 — fixture 없는 normal 처치·성장 통합

- 상태: **미착수**. 선행: 25.
- 읽기: 기존 wave normal_integration, growth/economy normal runner, 새 보상 snapshot.
- 수정 범위: normal P3 실제 입력으로 경제·방어→자연 첫 wave→처치·점수/확정 XP 반영 경로를 검증한다.
- 완료 조건: 자원/HP 주입·강제 kill·시간 가속 없이 실제 플레이로 연결된다. 첫 wave의 적이 없는 보상을 줬다고 주장하지 않으며 level 미도달도 사실대로 기록한다.
- 검증: wall-clock browser artifact와 오류 0. 보스 자연 출현과 실제 처치는 다음 카드에서 별도로 증명한다.

### SP-10-27 — 보스 출현→처치→보상→final 통합

- 상태: **미착수**. 선행: 26.
- 읽기: 11/16/17/22의 계약과 browser runner.
- 수정 범위: 첫 보스 600초 자연 출현 경로와 후반 가속 보스/최종 소환체 제거 흐름을 분리해 검증한다. 장시간 runner는 진행 상태를 출력한다.
- 완료 조건: 정상 속도 첫 보스 출현은 fixture off로 증명한다. 장기 생존/처치가 불가능하면 밸런스 이슈와 차단 결과를 기록하고 normal 통과로 표시하지 않는다. 가속 경로에서도 실제 전투 피해로 처치·보상을 연결한다.
- 검증: normal 첫 보스와 명시적 가속 final artifact 각각 기록. 직접 HP 조정/자원 주입이 필요하면 fixture로 표시한다. 최종 승리 선언은 SP-11 검증으로 남긴다.

### SP-10-28 — 필수 회귀·W3X 비교·SP-11 인계

- 상태: **미착수**. 선행: 01~27.
- 읽기: 전체 coverage/artifact, SP-08/09 비교, current context/backlog.
- 수정 범위: SP-10 W3X 비교표에 원본/웹 정책/미확인을 정리하고 실제 검증 명령·증거를 연결한다. SP-11에 종료 입력과 남은 경계 조건을 전달한다.
- 완료 조건: 필수 능력·보상·통합 미완료가 있으면 SP-10을 닫지 않는다. SP-12/13/15 후속은 기능·이유·담당을 명시한다. 완료 시에만 다음 ID를 SP-11로 갱신한다.
- 검증: typecheck/build, SP-10 전체 지원 사례, combat/economy all, growth 관련 지원 사례, construction lifecycle, wave normal/phases/restart, controls 영향 사례와 git diff --check. 지원하지 않는 all selector를 가정하지 않는다.

## 검증 명령과 완료 기록

기존 공통 명령은 다음과 같다. 신규 SP-10 명령은 04에서 실제 등록 후 여기에 추가한다.

```bash
npm run typecheck --workspace @games/chicken-farm
npm run build --workspace @games/chicken-farm
npm run chicken:waves:check --workspace @games/chicken-farm
CHICKEN_FARM_COMBAT_CASE=all npm run chicken:combat:check --workspace @games/chicken-farm
CHICKEN_FARM_ECONOMY_CASE=all npm run chicken:economy:check --workspace @games/chicken-farm
CHICKEN_FARM_WAVE_CASE=phases npm run chicken:wave:check --workspace @games/chicken-farm
CHICKEN_FARM_WAVE_CASE=normal_integration npm run chicken:wave:check --workspace @games/chicken-farm
CHICKEN_FARM_WAVE_CASE=restart npm run chicken:wave:check --workspace @games/chicken-farm
git diff --check
```

위 명령은 이번 계획 작성에서 실행한 검증 결과가 아니다. growth/construction/controls는 변경 영향과 현재 runner의 지원 selector를 확인해 실행한다. browser 실패가 환경 제약이면 원인과 미검증 범위를 기록하며 typecheck/build 통과로 대체하지 않는다.

각 카드 아래에 다음 형식으로 결과를 추가한다.

```text
- 결과/변경 파일:
- 검증 명령·종료 코드:
- artifact와 주요 assertion:
- 원본 대비 웹 정책·남은 문제:
- 다음 ID:
```

## Terra Medium 실행 요청 템플릿

```text
닭농장 SP-10-05만 Terra Medium에서 진행해줘.
docs/chicken_farm/chicken_farm_sp10_task_plan.md와 current context를 읽고,
해당 카드의 읽기 범위·수정 범위·완료 조건·검증을 따라 작업해줘.
원본 근거·웹 정책·미확인을 구분하고 기존 사용자 수정은 보존해줘.
단일 entity/HP/owner/wallet/inventory/clock을 유지해줘.
작업이 크면 먼저 해당 ID를 독립 하위 카드로 나누고 첫 하위 카드만 수행해줘.
결과·실행 명령·artifact·남은 문제·다음 ID를 기록하고 다음 task는 시작하지 마.
```

다음 요청부터 ID만 바꾼다. 이번 계획 작성은 SP-10 구현 완료나 runtime 통과를 의미하지 않는다.

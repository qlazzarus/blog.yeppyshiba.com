# SP-10-09-i — W1 Terra medium 실행 카드

2026-10-19: 사용자 “좋아 해당 방향으로 진행해서 세부 task 로 terra medium 으로 하도록 진행해”로 W1 채택. i-2는 웹 정책 경로로 완료, 원본 데이터 복구는 미완료다. i-3-a/b와 i-4-a/b/c가 완료되어 상위 i도 완료했다. 이번 변경은 승인 기록과 실행 계획이며 실제 모델 전환은 수행하지 않았다.

## 실행 계약

[W1 전체 계약](./chicken_farm_sp10_09_i_acct_decision_gate.md)의 W1 표와 [근거 JSON](./chicken_farm_w3x_artifacts/sp10_09_i_acct_effect_evidence.json)이 기준이다. n00C만, 적격 적대 유닛에 15%·2배, 건물/울타리 제외, 부수 효과 없음, 전용 seeded RNG, difficulty 보정 후 배수·기존 방어 adapter 적용. n00E 및 다른 적 능력은 범위 밖이다. 원본 DataA/B를 복구한 것으로 기록하지 않는다.

Terra medium에서 **한 요청에 한 카드**를 실행한다. 명시된 동작을 유지하는 파일명·함수명·RNG 알고리즘 선정은 구현자가 결정하고 문서화한다. 기존 RNG 유틸이 있으면 계약 적합성을 검토해 재사용한다. 매번 수치/대상 승인을 다시 요청하지 않는다. 계약을 바꾸는 경우에만 차이와 이유를 제시한다.

| 순서 | ID | 결과 | 선행 |
| --- | --- | --- | --- |
| 1 | SP-10-09-i-3-a | typed W1 정책·대상 판정 | i-2 완료 |
| 2 | SP-10-09-i-3-b | 전용 RNG·pure critical resolver | i-3-a |
| 3 | SP-10-09-i-4-a | 실제 n00C 타격 경로 연결 | i-3-b |
| 4 | SP-10-09-i-4-b | run/reset·관측·사망 검증 | i-4-a |
| 5 | SP-10-09-i-4-c | browser 회귀·coverage·상위 i 완료 | i-4-b |

### SP-10-09-i-3-a — W1 typed 정책·대상 판정

- 읽기: W1, 근거 JSON, `balance.ts`, `balanceTypes.ts`, `ordinaryEnemyAbilityPolicies.ts`, `combatPocSystem.ts`의 target 종류.
- 수정: `games/chicken-farm/src/game/`에 작은 정책 모듈과 순수 판정 검사. 필요하면 전용 runner를 `scripts/`에 만들고 `games/chicken-farm/package.json`에 실제 등록한다. 기존 broad balance 구조는 필요 범위만 변경한다.
- 완료: n00C/ACct/15%/2배가 한 곳에 정의되고 source evidence와 web policy 타입이 분리된다. 살아 있는 적대 economy chicken·controllable unit만 적격이며 공중 여부는 기본 공격 가능 여부를 따른다. 건물/울타리/시체/아이템/중립/동맹/n00E는 거부한다.
- 검증: actor·target 표에 대한 허용/거부 사례, 누락/NaN/out-of-range chance·multiplier 거부, 기존 ordinary policy 검사와 typecheck. 이 카드에서 runtime coverage를 완료로 바꾸지 않는다.
- 다음: i-3-b.

결과: `acctCriticalStrikePolicy.ts`에 source evidence(`DataA1`/`DataB1` 미확정)와 독립적인 승인 W1 정책(`n00C`, 15%, 2배)을 분리해 정의했다. 순수 판정은 살아 있는 n00C/dire frost wolf와 기존 기본 공격 targetability를 통과한 적대 controllable unit·economy chicken만 허용한다. 건물·울타리·시체·아이템·중립·동맹/자기 자신·dead actor/target·n00E는 거부한다. 공중 여부는 별도 정책으로 재판정하지 않고 후속 실제 기본 공격 adapter가 결정한다.

검증: `npm --prefix games/chicken-farm run chicken:enemy:acct-policy`, `npm --prefix games/chicken-farm run chicken:enemy:ordinary-abilities`, `npm --prefix games/chicken-farm run typecheck`, `git diff --check` 모두 종료 코드 0. policy runner는 [artifact](./chicken_farm_w3x_artifacts/enemy_check_acct_critical_strike_policy.json)를 생성해 actor/target matrix, NaN·범위 밖 chance/multiplier 거부, 기존 7개 blocked ordinary policy 유지 여부를 assertion한다. runtime damage/coverage는 변경하지 않았다.

다음 ID: **SP-10-09-i-3-b**.

### SP-10-09-i-3-b — 결정적 RNG·pure resolver

- 읽기: i-3-a API, 기존 seed/run 관리 유틸, W1 난수 소비·피해 순서.
- 수정: 전용 RNG state/seed와 pure resolver, 같은 runner의 의미 있는 경계 검사. Phaser scene 결합은 i-4-a로 남긴다.
- 완료: seed→state→roll 재현, roll [0,1), `< 0.15` 판정. 적격 타격만 1 draw, invalid/miss/cancelled는 0 draw. 이미 판정한 타격의 callback 실패는 되감지 않는다. resolver는 difficulty 보정된 damage를 받아 배수만 적용하며 armor/HP는 adapter 책임으로 남긴다. attack ID 중복이 2회 난수 소비/피해를 유발하지 않도록 반환 계약을 정의한다.
- 검증: 0/100% fixture, 0.15 직전/동일/직후, 동일 seed·동일 사건 재현, invalid 이벤트 삽입에도 적격 난수열 불변, 일반 32/proc 64, difficulty 보정 중복 없음, 중복 attack ID. 통계적으로 15%가 나오는지에 의존하지 않는다.
- 완료 후 i-3 부모를 완료한다. 다음: i-4-a.

결과: `acctCriticalStrikeResolver.ts`에 critical 전용 LCG seeded stream과 순수 resolver를 추가했다. eligible hit만 draw하며 roll은 `[0, 1)`이고 strict `roll < chance`를 쓴다. resolver는 기존 difficulty 보정까지 끝난 `adjustedDamage`를 입력으로 받아 proc일 때만 2배를 적용한다. armor, HP, callback, death 처리는 runtime adapter 책임으로 남겼다. attack ID의 최초 resolution을 state에 고정하므로 중복 ID는 기존 결정만 반환하고 두 번째 draw·damage application 요청을 만들지 않는다. callback 실패 뒤에도 이 state를 되감지 않는 계약은 i-4-a adapter가 그대로 소비한다.

검증: 기존 `chicken:enemy:acct-policy` runner를 확장해 동일 seed·동일 event replay, invalid building 삽입 뒤 eligible RNG 열 불변, 0%/100% fixture, 0.15 직전/동일/직후, 일반 32/proc 64, NaN damage 거부, duplicate attack ID를 assertion했다. `npm --prefix games/chicken-farm run chicken:enemy:acct-policy`, `npm --prefix games/chicken-farm run chicken:enemy:ordinary-abilities`, `npm --prefix games/chicken-farm run typecheck`, `npm --prefix games/chicken-farm run build`, `git diff --check` 모두 종료 코드 0. [artifact](./chicken_farm_w3x_artifacts/enemy_check_acct_critical_strike_policy.json)는 resolver sample과 검사 결과를 기록한다. build는 기존 500kB chunk-size 경고만 출력했다.

다음 ID: **SP-10-09-i-4-a**.

### SP-10-09-i-4-a — n00C 실제 타격 연결

- 읽기: `combatPocSystem.ts`의 `attackWolfDirectTarget`, `attackCombatBuilding`, damage callback 및 caller의 `getScaledEnemyStats` 사용 경로, i-3 API.
- 수정: 실제 유닛 타격 경로에 resolver 연결. seed/state를 run 소유자로 초기화하고 snapshot getter를 최소한으로 제공한다. 대상 재검사는 실제 damage 직전에 수행한다.
- 완료: 기존 cooldown/사거리/표적 재검사 뒤 한 번 판정, callback 호출도 한 번. 건물 기본 공격은 기존대로이고 crit draw 없음. n00E와 다른 적 공격은 영향 없음. 방어/최소 피해/HP/death를 재구현하거나 난이도 보정을 중복하지 않는다.
- 검증: integration fixture에서 proc/non-proc callback 인자와 횟수, 실패 callback 이후 RNG 진행, 건물/n00E 비적용, typecheck/build. 실제 연결을 증명하기 전 executable coverage를 올리지 않는다.
- 다음: i-4-b.

결과: `CombatPocSystem.attackWolfDirectTarget()`에서 `dire_frost_wolf`만 source rawcode `n00C`와 target owner/targetability를 resolver에 전달한다. cooldown·직접 target 재검사 뒤 1회 판정하고 resolver가 반환한 damage를 기존 controllable-unit/economy-chicken damage callback에 정확히 한 번 전달한다. building은 기존 `attackCombatBuilding()` early path를 유지해 draw가 없고, n00E 및 다른 enemy ID는 resolver branch에 들어가지 않는다. per-run seed/state/draw count는 `getAcctCriticalStrikeSnapshot()`으로 읽을 수 있게 했다. armor/HP/death 및 difficulty 계산은 새로 구현하거나 중복 적용하지 않았다.

검증: `CHICKEN_FARM_COMBAT_CASE=critical_strike npm --prefix games/chicken-farm run chicken:combat:check`은 debug fixture의 n00C 한 번 공격에서 RNG draw 0→1, 기존 damage callback 한 번, proc 64 전달 및 armor 2 대상의 실제 HP 62 감소를 확인해 [browser artifact](./chicken_farm_w3x_artifacts/combat_check_critical_strike.json)를 생성했다. `npm --prefix games/chicken-farm run chicken:enemy:acct-policy`, `npm --prefix games/chicken-farm run typecheck`, `npm --prefix games/chicken-farm run build`, `git diff --check`은 종료 코드 0이다. build는 기존 500kB chunk-size 경고만 출력했다. proc/non-proc 양쪽, callback 실패, reset 및 death 관측은 i-4-b/c에 남긴다.

다음 ID: **SP-10-09-i-4-b**.

### SP-10-09-i-4-b — lifecycle·관측·죽음 처리

- 읽기: run reset/despawn, 기존 공격 telemetry, unit damage adapter, death/reward/corpse 경로.
- 수정: reset 시 seed/state/카운터·중복 키 초기화, 사망/despawn 재검사, attack ID/roll/proc/전달 피해/적용 성공/실제 HP 감소 snapshot. 실제 HP 감소는 callback 또는 실제 전후 상태에서 얻고 전달값을 그대로 사실처럼 표시하지 않는다.
- 완료: 이전 run 상태 유출 없음, UI/이동 이벤트가 crit stream을 소비하지 않음, invalid 대상은 draw 없음, 치명타 처치가 기존 death/reward/corpse 처리를 정확히 한 번 통과함. 기존 피해자 종류별 보상 자격을 유지한다.
- 검증: restart 동일 seed replay, 공격 전 사망/대상 제거, 중복 타격, callback 실패, overkill(전달값과 실제 HP 감소 차이), lethal hit 후 이벤트 1회. 필요한 경우 기존 death/corpse runner를 확장한다.
- 다음: i-4-c.

결과: critical stream은 매 run에서 고정 seed `1972`로 seed/state/draw/attack sequence/observation buffer를 초기화한다. n00C의 resolved hit마다 attack ID, roll, proc, 전달 damage, callback 적용 여부, 실제 HP 감소를 snapshot에 보존한다. 실제 감소값은 callback 성공 뒤 fresh target state를 다시 읽어 산출하며, lethal target이 목록에서 사라진 경우에만 pre-hit HP를 사용한다. callback이 false면 실제 감소는 0이며 resolver state는 되돌리지 않는다. observation은 최신 64개만 유지한다.

검증: `CHICKEN_FARM_COMBAT_CASE=critical_lifecycle npm --prefix games/chicken-farm run chicken:combat:check`은 forced pre-damage(60)로 HP 40인 target에 64 critical을 적용해 delivered 64와 actual HP decrease 40을 분리해 기록했다. dead target 대기 중 추가 draw가 없고, n00C 자신을 두 번 lethal 요청해도 기존 enemy death event가 정확히 1회이며, same-page restart 뒤 draw/observation이 비워지고 seed `1972`·첫 roll/proc/delivered damage가 재현됨을 확인해 [lifecycle artifact](./chicken_farm_w3x_artifacts/combat_check_critical_lifecycle.json)를 생성했다. `chicken:enemy:death`, `chicken:enemy:corpses`, `chicken:enemy:acct-policy`, typecheck/build/diff check도 종료 코드 0이다. build는 기존 500kB chunk-size 경고만 출력했다.

다음 ID: **SP-10-09-i-4-c**.

### SP-10-09-i-4-c — browser 회귀·coverage 완료

- 읽기: 기존 combat/progression browser runner, ordinary policy coverage와 관련 consumers.
- 수정: 실제 n00C 공격에서 알려진 seed로 proc/non-proc·허용/금지 대상·reset·처치 사례를 검증하고 artifact 저장. fixture/가속/강제 피해 여부를 명시한다. n00C의 정책을 implemented web policy로 표현할 상태를 추가하고 executable 능력 목록에 ACct를 노출한다. `base_attack_only`로 분류하지 않는다.
- 완료: 실제 HP/이벤트 증거와 모든 아래 회귀가 통과한 뒤 runtime의 n00C blocked 상태 해제, i-4 및 상위 i 완료. 다른 blocked 적은 그대로 유지한다. 다음 ID는 SP-10-09-j다.
- 검증: 새 순수 runner, `chicken:combat:check`, `chicken:enemy:ordinary-abilities`, `chicken:enemy:death`, `chicken:enemy:corpses`, `chicken:enemy:progression`, `chicken:enemy:progression:browser`, typecheck/build 및 diff check. browser runner의 서버/fixture 준비 방식은 해당 script에서 먼저 확인한다. 실행 불가를 통과로 기록하지 않는다.

결과: ACct는 `implemented_web_policy` runtime state와 `implemented_web_policy` ordinary policy로만 공개했다. `getExecutableOrdinaryEnemyAbilities('dire_frost_wolf')`는 `['ACct']`를 반환하며, 원본 DataA/B evidence는 미확정으로 유지한다. other ordinary unresolved policies는 6개 `blocked_source_data`로 남고 `base_attack_only`로 재분류되지 않는다.

검증: known seed `1972`의 실제 browser fixture는 roll `0.000321…`, `0.146391…`, `0.064246…`에서 proc 64을, roll `0.664140…`에서 non-proc 32를 기록했다. building-only target은 draw 0회를 추가 소비하지 않았고 restart·overkill·dead target·one-shot enemy death 검증도 [critical lifecycle artifact](./chicken_farm_w3x_artifacts/combat_check_critical_lifecycle.json)에 기록했다. progression fixture는 n00C/ACct의 implemented state와 policy를 노출한다. `chicken:enemy:acct-policy`, `chicken:enemy:ordinary-abilities`, `chicken:enemy:death`, `chicken:enemy:corpses`, `chicken:enemy:progression`, baseline과 fixture `chicken:enemy:progression:browser`, baseline `chicken:combat:check`, typecheck/build/diff check는 모두 종료 코드 0이다. build는 기존 500kB chunk-size 경고만 출력했다.

상위 i 결과: **완료**. W1은 approved web design이며 Warcraft III ACct 원본 DataA/B 복원 주장이 아니다. 다음 ID: **SP-10-09-j**.

## 명령과 인계 양식

현재 등록 명령은 repo root에서 `npm --prefix games/chicken-farm run <script>`로 실행한다. `<script>`에 `typecheck`, `build` 및 위 기존 script 이름을 넣는다. 신규 critical runner 명령은 i-3-a에서 등록한 뒤 실제 이름을 기록한다.

각 카드 결과에는 변경 파일, 완료 조건별 증거, 실행 명령·종료 코드, artifact 경로, 남은 문제, 다음 ID를 남긴다. 테스트 fixture 수치와 W1 운영값을 구분한다. 문서만 바꾼 카드에는 runtime 검증 통과를 쓰지 않는다.

> SP-10-09-i-3-a 진행해. `chicken_farm_sp10_09_i_w1_execution_plan.md`의 해당 카드와 승인된 W1 계약을 읽고 그 카드만 구현·검증해. 승인된 15%·2배 정책은 그대로 사용하고 source 미확정값은 유지해. 완료 증거와 다음 ID를 기록하고 다음 카드는 시작하지 마.

이후 요청에서는 카드 ID를 순서대로 변경한다.

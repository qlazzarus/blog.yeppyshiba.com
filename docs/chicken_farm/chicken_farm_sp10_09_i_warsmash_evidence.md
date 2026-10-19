# SP-10-09-i — Warsmash ACct 근거 확보

조사일: 2026-10-19. 범위: 공개 upstream 소스 정적 조사. Warsmash 실행이나 Warcraft III 원본 플레이 검증 결과가 아니다.

## 기준과 결론

사용자가 제안한 현재 Warsmash를 엔진 동작 참고 기준으로 채택한다. 조사 시 가져온 main은 `f9e0aeed4be372d6016519d0e97b384aa873f374`(commit date 2025-12-08)이다. 이후 main 변경과 혼동하지 않도록 아래 링크는 이 SHA에 고정한다. 임시 checkout은 `/tmp/chicken-acct-warsmash`이며 소스·게임 자산은 프로젝트에 반입하지 않았다.

치명타 계열의 **처리 방식**은 확보했다. 그러나 ACct의 **실제 code 연결 및 상속 수치**는 외부 게임 데이터에 있으므로 아직 확보하지 못했다. 현재 Warsmash를 기준으로 삼는다는 결정은 임의 확률·배수의 승인이 아니다. 이후 사용자 W1 승인으로 구현 근거 보류는 해소됐다. i-2는 웹 정책 경로로 완료이며, runtime coverage는 구현 검증 후 갱신한다.

## 확인한 코드 경로

| 근거 | 확인한 사실 | 적용 한계 |
| --- | --- | --- |
| [StandardObjectData.java:217](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/units/StandardObjectData.java#L217) | 외부 `Units/AbilityData.slk`와 AbilityFunc/Strings profile을 읽는다. | checkout에는 필요한 SLK가 없다. 엔진 commit만으로 데이터 버전·수치를 정할 수 없다. |
| [CAbilityData.java:317](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/data/CAbilityData.java#L317) | alias의 SLK `code`로 구현을 찾는다. | ACct 문자열이 behavior JSON에 없다고 미지원이라고 단정할 수 없다. ACct→code 연결 확인이 필요하다. |
| [generalPassives.json:228](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/assets/abilityBehaviors/generalPassives.json#L228) | AHbh/AOcr/ANdb 공유 passive: 유효 대상 검사, `randomBoundedFloat(100) < DataA`, DataB가 0이 아니면 피해 배수 적용. CRITBASH 우선순위에서 발동 시 stacking 제한. | ACct code가 이 계열인지 아직 미확인. 공유 코드의 모든 효과가 ACct에 활성화된다는 뜻이 아니다. |
| 같은 JSON의 후속 처리 | DataC 추가 피해, buff/duration 기절 경로, DataD 회피, DataE 빗나감 해제 경로 및 제거 listener가 있다. | A/B만 확보하고 나머지를 무조건 0으로 가정하면 안 된다. 종료·재등록도 별도 검증한다. |
| [ABCallbackRandomBoundedFloat.java](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/abilitybuilder/behavior/callback/floatcallbacks/ABCallbackRandomBoundedFloat.java) | simulation의 seeded RNG에서 bound 난수를 얻는다. | 웹에서 같은 seed를 쓴다고 Java와 동일한 난수열이 되는 것은 아니다. 웹 재현성 계약을 따로 정한다. |
| [CUnitAttackNormal.java:40](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/combat/attacks/CUnitAttackNormal.java#L40) | pre-damage listener 결과를 target damage 경로에 전달한다. base×multiplier와 bonus는 별도 인자다. | 최종 방어력·difficulty 순서와 웹 adapter 일치는 후속 계약/회귀로 확인한다. |

원본 map 근거는 [기존 ACct artifact](./chicken_farm_w3x_artifacts/sp10_09_i_acct_effect_evidence.json)를 유지한다. n00C/n00E에 연결되고 tooltip은 A% 확률/B배를 참조하지만 map override에 A/B가 없다. n00C만 이번 일반 적 구현 범위이며 n00E는 영향 확인 대상이다.

보조 조사: [PR #100](https://github.com/Retera/WarsmashModEngine/pull/100)의 head `ecff558794ca25b283fc1952a1d7955da780e986`도 fetch하여 비교했다. 해당 head는 main의 공유 critical JSON 블록을 제거한다. main과 PR 구현을 섞지 않으며, 이 PR을 이번 기준으로 채택하지 않는다.

## 실행 전략

기존 **Astra light 계획 → Terra medium 실행** 분업은 작은 완료 기준을 가진 아래 카드에 적합하다고 판단한다. 이는 성능 측정 결과가 아닌 작업 분할 판단이다. [Astra 모델 문서](https://developers.openai.com/api/docs/models/gpt-6-astra)와 [Terra 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-terra)의 역할·reasoning 설정을 참고했다. UI `light`와 API `low`의 동일성은 단정하지 않는다.

- Astra 계획 단계: 출처와 추론 구분, 상속 데이터 선택, damage/RNG 계약 및 완료 기준 검토.
- Terra medium 실행 단계: 한 요청에 한 ID, 정해진 계약 구현과 검증. 필드 누락이나 계약 충돌 시 임의 기본값을 넣지 않고 계획 단계로 반환.
- 이 세션은 실제 모델 전환을 수행하지 않았다. 사용량·속도 이점도 측정하지 않았다. OpenAI Docs 스킬은 모델 문서 확인과 위 한계 명시에만 사용했다.

## 하위 카드

### SP-10-09-i-1 — 엔진 근거 고정 (완료)

- 읽기: 기존 ACct artifact, upstream 데이터 loader·ability dispatch·passive·공격 경로.
- 수정: 이 문서, 기존 ACct artifact, 상위 task plan.
- 완료: SHA·출처·확인 사실·누락 데이터·PR 비채택을 기록했다.
- 검증: public upstream clone/fetch 및 소스 정적 확인. 게임 실행 검증은 하지 않았다.
- 저장 후 검증: Node로 ACct JSON parse 및 commit/누락 필드 assertion 통과(종료 코드 0), `git diff --check` 통과(종료 코드 0). 이번 변경은 문서/근거 JSON뿐이므로 build/browser 검사는 실행하지 않았다.

### SP-10-09-i-2 — ACct 데이터 또는 웹 계약 확보 (완료: W1 승인)

- 선행: i-1. 사용자는 로컬 Warsmash 경로가 없다. 로컬 설치를 필수 입력으로 요구하지 않고 아래 i-2-a/b/c를 순서대로 수행한다. GitHub 소스는 공개 참조로 확보할 수 있지만 외부 게임 데이터까지 포함한다고 가정하지 않는다. 무단 게임 자산 다운로드는 하지 않는다.
- 읽기: ACct row, code로 연결된 구현, map ACct override, 데이터 소스 우선순위.
- 수정: ACct artifact에 데이터 버전/출처·SHA-256·level·원본값·map override·최종값을 분리 기록한다. 원본 전체 자산은 commit하지 않는다.
- 필수 확인: `code`, DataA1~DataE1, level 수, targets, buff, 일반/hero duration 및 실제 loader가 참조하는 profile 필드. 실제 컬럼명은 입력 파일에서 확인한다.
- 완료: A/B가 유한 수치이며 단위가 확인되고, 부수 효과 필드와 ACct dispatch가 모두 해소된다. 없는 필드는 누락과 명시적 0을 구별한다. 현재 데이터가 map 제작 버전과 다르면 **선택한 Warsmash 데이터셋 기준**이라고 기록하고 원본 재현으로 표시하지 않는다.
- 검증: 파일 hash, 추출 재실행 동일성, map override 우선순위, 누락/잘못된 수치 거부. source 경로의 입력이 없으면 source 복구는 미완료다. 승인된 W1 경로로 i-3/4 구현을 진행할 수 있다.

#### SP-10-09-i-2-a — GitHub 참조를 Markdown 근거로 정리 (완료)

- 입력/읽기: [사용자가 지정한 AbilityDataUI.java](https://github.com/Retera/WarsmashModEngine/blob/main/core/src/com/etheller/warsmash/viewer5/handlers/w3x/rendersim/ability/AbilityDataUI.java), i-1의 고정 SHA 및 이 문서의 loader/dispatch/passive 링크.
- 실행: 기존 SHA의 raw 소스를 읽기 전용으로 가져온다. 임시 checkout은 있으면 SHA를 확인하여 재사용하고, 없으면 raw URL 또는 임시 디렉터리로 확보한다. 사용자 PC의 Warsmash 설치는 필요 없다. `main`이 변경되었다면 차이를 기록하되 기존 기준을 자동 교체하지 않는다.
- URL 형식: `https://raw.githubusercontent.com/Retera/WarsmashModEngine/<commit>/<repository-path>`. GitHub blob HTML을 Java 원문이나 Markdown으로 오인하지 않는다. HTTP 성공 여부와 실제 본문을 확인한다.
- 수정 범위: [GitHub 참조 기록](./chicken_farm_sp10_09_i_github_reference.md)과 이 문서/상위 카드의 a 상태만.
- Markdown 구성: 조회일, repo/commit, 파일 경로·원문 URL·라인/메서드, 내려받은 원문 SHA-256, 관찰 사실, 추론, 미확정 필드. Java 전체를 `.md`로 바꾸어 복제하지 않고 동작 요약과 링크만 저장한다. AGPL 소스는 게임 코드에 복사하지 않는다.
- 완료: UI 표시 → runtime object data 조회 → 외부 SLK/profile 로딩 및 alias code dispatch 관계를 출처별로 설명한다. “원문 확보”와 “ACct 수치 확보”를 별개 상태로 기록한다.
- 검증: URL/commit/파일 hash 재현, Markdown 링크 확인, `git diff --check`. 네트워크 실패는 데이터 부재로 판정하지 않는다. 소스 수집만으로 i-2를 완료하지 않고 다음 b로 인계한다.
- 완료 기록 (2026-10-19): 기존 upstream checkout의 origin/HEAD/clean 상태를 확인하고 5개 원문의 SHA-256 및 고정 URL을 참조 MD에 기록했다. UI → runtime object data → 외부 데이터 loader 및 code dispatch 관계, 사실/추론/미확정 필드를 분리했다. 신규 HTTP 다운로드·최신 main 확인·수치 확보·runtime 구현은 수행하지 않았다. 검증 명령과 결과는 참조 MD에 남긴다. 다음 ID는 **SP-10-09-i-2-b**이며 이번에는 실행하지 않는다.

계획 수립 시 확인한 한계: 기존 고정 SHA의 [AbilityDataUI.java:391](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/rendersim/ability/AbilityDataUI.java#L391)의 `parseUbertip`은 unit → item → ability 순서로 객체를 찾고 `readSLKTag`로 참조값을 읽는다. 세 번째 인자가 `%`인 표시는 float×100을 정수 문자열로 변환한다. 이는 표시 규칙이며 ACct의 실제 DataA1/DataB1 상수를 제공하지 않는다. 이번 GitHub 페이지 열기는 cache miss였고, 이 사실 확인은 이전 조사 때 확보한 고정 SHA checkout을 읽어 수행했다. 신규 다운로드 성공이나 a 실행 완료로 기록하지 않는다.

#### SP-10-09-i-2-b — 공개 데이터 출처의 존재·적합성 조사 (완료: 적합 후보 미확보)

- 선행: a. 읽기: 고정 upstream의 파일 목록, README/설정의 데이터 소스 안내, 관련 공식 repo 문서·release·issue 링크. 필요하면 공개 GitHub 검색으로 `ACct`, `AbilityData.slk`, 관련 profile 출처를 찾는다.
- 범위: upstream 문서/파일 목록을 먼저 확인하고 외부 후보는 최대 3개까지만 비교한다. 실행 코드·설치 파일은 실행하지 않는다. 접근 권한 우회나 출처 불명의 게임 archive 다운로드는 하지 않는다.
- 수정 범위: a의 참조 MD에 검색 URL/검색어·조회일·확인 범위, 후보 출처/버전/이용 조건, 필요한 필드 존재 여부 및 탈락 이유를 기록한다. 검색 결과 snippet이나 tooltip 설명만으로 수치를 채우지 않는다.
- 완료: 실제 읽을 수 있고 출처·버전·이용 조건을 확인한 데이터 후보를 제시하거나, 조사 범위 내에서 적합한 후보를 확보하지 못했다고 기록한다. 후자는 **조사 완료**이지 **데이터 확보 완료**가 아니다.
- 검증: 원문 row와 rawcode/level 식별, code 및 A~E/targets/buffs/duration의 확인 가능 여부. 네트워크/권한 실패와 파일 부재를 구분한다. 후보 충돌은 임의 선택하지 않고 c의 판단 자료로 넘긴다.
- 완료 기록 (2026-10-19): [GitHub 참조 기록](./chicken_farm_sp10_09_i_github_reference.md#i-2-b--공개-데이터-후보-조사)에 후보 3개·고정 SHA·검색 범위·파일 hash·탈락 이유를 기록했다. Warsmash는 자산을 포함하지 않았고, OpenRealm/wc3-moba의 공개 test fixture는 DataA/B 컬럼만 있고 ACct row가 없었다. 공개 데이터 후보를 임의 조합하지 않았으며 ACct 수치·JSON·runtime은 변경하지 않았다. b는 조사 완료이나 i-2는 미완료다. 다음 ID는 **SP-10-09-i-2-c**이며 이번에는 실행하지 않는다.

#### SP-10-09-i-2-c — 데이터 확정 또는 대체 정책 승인 요청 (완료: W1 승인)

- 선행: b. 읽기: a/b 근거, map override, i-2 필수 필드 목록.
- 후보 확보 시: 파일 hash·데이터 버전과 map override 합성 결과를 기존 ACct artifact에 기록하고, i-2의 원래 완료/검증 조건을 모두 충족할 때만 i-2를 완료한다. 동작 기준과 데이터셋 버전은 별도로 표시한다.
- 후보 미확보/충돌 시: 미확정 필드 목록과 웹 대체 정책안을 MD에 작성한다. chance/multiplier뿐 아니라 대상·RNG·부수 효과·difficulty·종료 규칙을 명시한다. 제안값은 출처값과 구별하고 사용자 승인 전 artifact의 확정값이나 runtime에 적용하지 않는다.
- 수정 범위: 근거 MD, task 상태 및 데이터 확보 성공 시 기존 ACct JSON. 게임 구현은 금지한다.
- 완료/중단: 데이터 계약을 확정해 i-3로 인계하거나, 승인에 필요한 선택지를 명시하고 보류한다. 정책 승인 경로에서는 원본 데이터 복구 성공으로 표시하지 않는다. i-2와 상위 i의 완료 여부는 조사 완료 여부와 분리한다.
- 검증: 필드 누락/0 구별, 수치 단위와 범위, 출처/hash, override 우선순위, JSON parse(변경 시), `git diff --check`.
- 완료 기록 (2026-10-19): [ACct 결정 게이트](./chicken_farm_sp10_09_i_acct_decision_gate.md)에 라이선스 데이터셋 복구(S)와 웹 대체 정책(W)을 분리했다. S는 최소 파생 artifact와 hash/override 합성 계약을, W는 scope·수치·대상·부수 효과·RNG·damage/difficulty 순서·종료 규칙의 승인 빈칸을 정의한다. 수치나 정책을 승인하지 않았고 ACct JSON/runtime은 변경하지 않았다. 이후 사용자가 W1을 승인하여 i-2/c를 웹 정책 경로로 완료했다. source 복구는 미완료이며 다음은 i-3-a다.

#### Terra medium 실행 요청 템플릿

현재 유효한 요청과 세부 카드는 [W1 실행 계획](./chicken_farm_sp10_09_i_w1_execution_plan.md)을 따른다. 아래 c 템플릿은 승인 전 조사 기록이다.

> SP-10-09-i-2-c만 진행해. i-2-a/b 근거와 W3X ACct artifact를 먼저 읽고, 라이선스 데이터셋 복구 계약과 웹 대체 정책의 승인 항목을 Markdown에 작성해. 수치·웹 정책을 승인하거나 runtime/ACct JSON을 수정하지 마. 결과·변경 파일·검증 명령/종료 코드·승인에 필요한 입력을 기록하고 i-3은 시작하지 마.

후속 요청은 ID만 b, c로 변경한다. 한 요청에 한 카드만 수행하며 모델 전환은 실행 환경에서 별도로 선택한다. a/b/c 문서화는 완료했으며, i-3/4와 구현은 미착수다.

### SP-10-09-i-3 — 효과 계약·순수 resolver (미착수)

세부 카드: **i-3-a typed 정책·대상 판정 → i-3-b RNG·pure resolver**. 승인된 W1과 [실행 계획](./chicken_farm_sp10_09_i_w1_execution_plan.md)의 수정/완료/검증 범위를 따른다.

- 선행: i-2. 읽기: 확정 artifact, 기존 공격·damage·difficulty·RNG 경로.
- 수정: 수치 근거와 웹 정책을 구분한 계약 및 독립적인 TypeScript resolver/순수 검사. upstream 소스 복사는 하지 않는다.
- 완료: 허용 대상, 발동 시점, RNG 소비 시점, 확률 경계, 배수/bonus/방어력/difficulty 순서, miss·회피·기절·stacking·종료 규칙을 확정하고 필요한 효과만 구현한다. 엔진과 다른 부분은 명시한다.
- 검증: 확률 0/100 및 경계 직전/동일값, 금지 대상, 같은 seed 재현, non-proc, 제거/재등록, 부수 효과 활성/비활성. 테스트용 값과 실제 ACct 값을 분리한다.

### SP-10-09-i-4 — n00C runtime·browser 회귀 (미착수)

세부 카드: **i-4-a 실제 타격 연결 → i-4-b lifecycle·관측 → i-4-c browser·coverage 완료**. 마지막 카드 통과 전 상위 i를 완료하지 않는다.

- 선행: i-3. 읽기: 전투 adapter·death/reward 처리 및 기존 regression runner.
- 수정: n00C 연결, 회귀 runner/artifact, coverage와 상위 상태.
- 완료: 실제 공격에서 발동/비발동 HP 차이, 금지 대상, 치명타 처치의 death/reward 1회, reset/제거 후 잔존 효과 없음. n00E는 의도하지 않은 변경이 없어야 한다. 통과한 뒤에만 n00C blocked 상태와 상위 i를 갱신한다.
- 검증: 순수 검사·browser 사례·관련 기존 회귀·typecheck/build. fixture 가속과 자연 실행을 구분하며 명령·종료 코드·artifact를 기록한다.

## 이번 조사 재현

```sh
git clone --depth 1 https://github.com/Retera/WarsmashModEngine.git /tmp/chicken-acct-warsmash
git -C /tmp/chicken-acct-warsmash rev-parse HEAD
rg -n 'AbilityData.slk' /tmp/chicken-acct-warsmash/core/src
rg -n 'AHbh|AOcr|ANdb|randomBoundedFloat' /tmp/chicken-acct-warsmash/core/assets/abilityBehaviors/generalPassives.json
git -C /tmp/chicken-acct-warsmash fetch --depth 1 origin pull/100/head
```

clone/fetch와 SHA 확인은 종료 코드 0. clone은 경로가 없을 때만 실행한다. shallow main은 향후 바뀔 수 있으므로 재현 시 출력 SHA가 위 기준과 일치하는지 반드시 확인한다. 프로젝트와 임시 checkout의 파일 목록에서 해당 SLK는 발견하지 못했다. 사용자 전체 디스크나 비공개 데이터 저장소를 검색한 것은 아니다.

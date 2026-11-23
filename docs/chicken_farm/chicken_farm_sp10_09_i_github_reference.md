# SP-10-09-i-2-a — GitHub 소스 참조 기록

확인일: 2026-10-19. 상태: **a·b 완료 / ACct 수치 미확보 / c 미착수**.

## 출처와 확보 방법

- Repository: https://github.com/Retera/WarsmashModEngine
- 기준 commit: `f9e0aeed4be372d6016519d0e97b384aa873f374`. 이전 i-1에서 가져온 main 기준을 유지한다.
- 이번에는 기존 임시 checkout `/tmp/chicken-acct-warsmash`을 재사용했다. origin URL, HEAD, 변경 없는 worktree를 확인하고 아래 5개 원문의 SHA-256을 계산했다.
- 새 HTTP 다운로드나 최신 main 조회를 수행한 것은 아니다. 아래 raw URL은 고정 commit과 실제 Git 경로로 구성했으며 HTTP 응답 검증 결과로 표시하지 않는다. 원문은 Git blob과 checkout 바이트를 비교한다.
- 소스의 동작만 요약한다. upstream Java/JSON 전체나 Warcraft III 자산을 프로젝트에 복제하지 않았고 runtime·ACct JSON도 변경하지 않는다.

## 원문 목록

### R1 — AbilityDataUI.java

- 저장소 경로: `core/src/com/etheller/warsmash/viewer5/handlers/w3x/rendersim/ability/AbilityDataUI.java`
- [고정 소스/라인](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/rendersim/ability/AbilityDataUI.java#L391) · [raw 원문](https://raw.githubusercontent.com/Retera/WarsmashModEngine/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/rendersim/ability/AbilityDataUI.java)
- SHA-256: `8d8985bdd8e05646bcdb207147531640885b15b6bce8cf2abc7cb5a80db183ca`

### R2 — Warcraft3MapRuntimeObjectData.java

- 저장소 경로: `core/src/com/etheller/warsmash/parsers/w3x/objectdata/Warcraft3MapRuntimeObjectData.java`
- [고정 소스/라인](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/parsers/w3x/objectdata/Warcraft3MapRuntimeObjectData.java#L139) · [raw 원문](https://raw.githubusercontent.com/Retera/WarsmashModEngine/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/parsers/w3x/objectdata/Warcraft3MapRuntimeObjectData.java)
- SHA-256: `bce51b81cd437d5065c0a04cbd243243c54bb98ac7364019711cc7d4bd49bfc0`

### R3 — StandardObjectData.java

- 저장소 경로: `core/src/com/etheller/warsmash/units/StandardObjectData.java`
- [고정 소스/라인](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/units/StandardObjectData.java#L217) · [raw 원문](https://raw.githubusercontent.com/Retera/WarsmashModEngine/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/units/StandardObjectData.java)
- SHA-256: `095b609e2c6ab0d0b8cf4b41c37926dd0a01d459b9eff795f62d7a53602964d9`

### R4 — CAbilityData.java

- 저장소 경로: `core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/data/CAbilityData.java`
- [고정 소스/라인](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/data/CAbilityData.java#L317) · [raw 원문](https://raw.githubusercontent.com/Retera/WarsmashModEngine/f9e0aeed4be372d6016519d0e97b384aa873f374/core/src/com/etheller/warsmash/viewer5/handlers/w3x/simulation/data/CAbilityData.java)
- SHA-256: `42f80dc8764c786e1bc7d11161fef69b9bbb1bea06f1fa7e4c1cb3c6cc5745d6`

### R5 — generalPassives.json

- 저장소 경로: `core/assets/abilityBehaviors/generalPassives.json`
- [고정 소스/라인](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/core/assets/abilityBehaviors/generalPassives.json#L228) · [raw 원문](https://raw.githubusercontent.com/Retera/WarsmashModEngine/f9e0aeed4be372d6016519d0e97b384aa873f374/core/assets/abilityBehaviors/generalPassives.json)
- SHA-256: `7f1089c2affb31e2083dc1ab6ecdefb0f47207329fac86776e0a292df1f3e32c`

## 확인 사실

1. **UI 조회 (R1):** 생성자는 runtime object data의 abilities에서 alias별 표시 데이터를 가져온다(130행 이후). `parseUbertip`(391행)은 참조 rawcode를 units → items → abilities 순으로 찾는다. 두 요소 참조는 지정 필드를 `readSLKTag`로 읽는다. 세 번째 요소가 `%`일 때만 float 값에 100을 곱하고 정수로 변환한다. 참조 객체가 없으면 missing 표시를 만든다. 이 메서드에는 ACct의 확률·배수 상수가 없다.
2. **runtime 데이터 조립 (R2):** `load`는 `getStandardAbilities`로 기본 데이터를 얻고(147행), 존재하는 map/skin/campaign 능력 변경 파일을 읽는다(239행 이후). `CollapsedObjectData.apply`에 abilities·metadata·changeset을 전달한다(285행). 이는 변경분 적용의 호출 근거이며, 모든 필드 충돌/우선순위의 동적 검증 결과는 아니다.
3. **외부 기본 데이터 (R3):** `getStandardAbilities`는 AbilityFunc/Strings profile, 선택적 AbilitySkin, `Units/AbilityData.slk`를 DataSource에서 읽어 WarcraftData를 구성한다. Java 파일 자체는 ACct row나 데이터셋 버전을 대신하지 않는다.
4. **구현 선택 (R4):** ability builder 등록은 code별 definition을 구성한다(285행 이후). `getAbilityType(alias)`는 alias 객체의 SLK `code`를 읽고 해당 definition으로 type을 만든다(317행 이후). 따라서 ACct 문자열이 behavior 목록에 없다는 사실만으로 미지원 또는 AOcr 연결을 단정할 수 없다.
5. **공유 계열 동작 (R5):** AHbh/AOcr/ANdb passive에는 유효 대상 검사, 100 범위 난수와 DataA 비교, 0이 아닌 DataB 배수 적용 경로가 있다. DataC/버프/지속시간 및 후속 DataD/E 경로도 있어, 공유 family가 확인되어도 ACct의 활성 효과는 데이터가 있어야 결정된다.

## 관계와 추론의 경계

```text
외부 SLK/profile ── StandardObjectData ── 기본 abilities
map 능력 변경분 ────────────────────────┤
                       runtime object data
                          ├─ AbilityDataUI: tooltip 필드 조회
                          └─ CAbilityData: alias의 code → behavior definition
```

위 흐름은 소스에서 읽은 호출 관계의 요약이다. ACct의 tooltip 참조가 있다는 것은 해당 데이터 필드를 읽어야 한다는 근거이지 그 값이 복구되었다는 뜻이 아니다. 표시용 퍼센트 변환을 전투 확률 단위로 무조건 적용해서도 안 된다. 이번 확인으로 엔진 버전과 실제 게임 데이터 버전이 같다고 결론내리지 않는다.

## 남은 입력과 인계

- 미확정: ACct `code`, DataA1~DataE1, levels, targets, buffs, 일반/hero duration, 실제 profile 값과 데이터셋 버전, map override 합성 결과.
- 수치/효과 추정이나 웹 대체 정책 승인은 이번 카드 범위가 아니다.
- 다음 **SP-10-09-i-2-b**에서 공개 데이터 후보의 존재·적합성을 조사한다. b는 이번에 시작하지 않았다.
- 상위 i-2는 진행 중이며 상위 i와 n00C의 `blocked_source_data`는 유지한다.

## 검증 및 재현

실행 명령과 종료 코드:

- `git -C /tmp/chicken-acct-warsmash rev-parse HEAD`: 0, 위 commit 일치.
- `git -C /tmp/chicken-acct-warsmash remote get-url origin`: 0, 공개 upstream URL 일치.
- `git -C /tmp/chicken-acct-warsmash status --short`: 0, 출력 없음.
- `sha256sum`에 R1~R5의 checkout 절대 경로를 전달: 0, 위 해시 기록.
- 최초 Node 검증: subprocess `spawnSync git EPERM`으로 종료 코드 1. 이 실행은 통과로 계산하지 않았다.
- 대체 검증: `set -o pipefail` 후 각 원문에 `git -C /tmp/chicken-acct-warsmash show <commit>:<path> | sha256sum` 실행, 5회 모두 종료 코드 0. Git blob 해시는 위 checkout 해시와 모두 일치했다.
- subprocess 없는 Node 검사: raw URL 5개의 commit/경로·checkout SHA-256·세 Markdown 문서의 상대 파일 링크 존재 확인, 종료 코드 0 (`PASS`). 이는 HTTP 링크 가용성 검증은 아니다.
- `git diff --check`: 종료 코드 0.
- runtime 변경이 없어 build/browser 실행은 하지 않는다.

문서 검증에 사용한 Git object는 고정 commit의 저장소 경로로 조회한다. 임시 checkout이 사라지면 공개 upstream에서 해당 commit을 다시 확보하고 같은 해시인지 확인한다. HTTP 오류는 데이터가 없다는 증거가 아니다.

## i-2-b — 공개 데이터 후보 조사

조사일: 2026-10-19. 범위는 공개 GitHub repository·문서·tree API와 raw 파일에 한정했다. 검색 결과 snippet, 비공식 tooltip, 구현의 fallback은 실제 ACct 필드값의 출처로 채택하지 않았다. 아래 3개 후보 외의 다운로드·실행·게임 자산 추출은 수행하지 않았다.

| 후보 | 고정 기준·확인 방법 | ACct 필수 필드 상태 | 판정 |
| --- | --- | --- | --- |
| WarsmashModEngine | i-1 기준 commit `f9e0aeed4be372d6016519d0e97b384aa873f374`, [README](https://github.com/Retera/WarsmashModEngine/blob/f9e0aeed4be372d6016519d0e97b384aa873f374/README.md)와 R3 | README가 프로젝트에 Warcraft III 자산이 없고 유효한 게임 사본을 설정해야 한다고 명시한다. repository tree에도 `AbilityData.slk`/ACct row가 없다. | **부적합** — 엔진 동작 참고로는 유지하지만 수치 원문은 제공하지 않는다. |
| OpenRealm | `corepunch/open-realm` main `8853d069c21c94a981121066e1d78e967676fae4`, tree API와 [추적 test fixture](https://raw.githubusercontent.com/corepunch/open-realm/8853d069c21c94a981121066e1d78e967676fae4/games/warcraft-3/tests/resources-src/Units/AbilityData.slk) | 공개 MIT repository다. fixture에는 DataA1/DataB1 등의 **컬럼**은 있으나 98줄 전체에서 `ACct`/`Critical Strike` row가 없다. SHA-256 `f4c0e5418e49eb51354a9c5539a3216f3e714670a1ebf76581659c236f7eac21`. 문서는 retail RoC 데이터 경로를 `data/Warcraft III/War3.mpq`라고 설명하지만 그 archive 자체는 추적 데이터 후보로 확인하지 않았다. | **부적합** — parser/test schema 확인용일 뿐 ACct 수치 원문이 아니다. |
| wc3-moba | `seoup/wc3-moba` main `710bdcb9a625d33efc1f32a73ff8fe8dfcaf2d6b`, tree API와 [추적 test fixture](https://raw.githubusercontent.com/seoup/wc3-moba/710bdcb9a625d33efc1f32a73ff8fe8dfcaf2d6b/games/warcraft-3/tests/resources-src/Units/AbilityData.slk) | 공개 MIT repository다. fixture에는 같은 필수 컬럼이 있으나 89줄 전체에서 `ACct`/`Critical Strike` row가 없다. SHA-256 `014d15c12efeb14e3c1b97fcdd0290f372afb04a461227003cee361b909b6d0d`. [문서](https://github.com/seoup/wc3-moba/blob/710bdcb9a625d33efc1f32a73ff8fe8dfcaf2d6b/docs/games/warcraft-3/ability-and-item-effects.md)는 stock ACct 테스트를 언급하지만 데이터를 공개했다는 증거는 아니다. | **부적합** — ACct 테스트/동작 참고는 될 수 있어도 수치 출처가 아니다. |

### 보조 확인과 탈락 기준

- `elevchyt/openwar3` main `cbdd2702c9629e0a9310d377533bc4829476e5ac`의 [데이터 형식 문서](https://github.com/elevchyt/openwar3/blob/cbdd2702c9629e0a9310d377533bc4829476e5ac/docs/wc3-data-formats.md)는 `AbilityData.slk`와 profile의 역할, archive override 순서를 설명한다. tree API에서 추적된 `AbilityData.slk` 또는 ACct row는 찾지 못했다. 따라서 후보로 수를 채우지 않고 **스키마/우선순위 보조 근거**로만 사용한다.
- `ACct`가 creep Critical Strike rawcode라는 공개 rawcode 목록과, `<ACct,DataA1>`/`<ACct,DataB1>` tooltip 참조 예시는 확인했다. 이는 ID/필드 이름의 보조 근거이며 수치·데이터 버전·targets·buff/duration을 제공하지 않아 후보로 채택하지 않았다.
- 기존 W3X 추출의 map override에는 A/B가 없다는 사실과도 충돌하지 않는다. 이번 공개 후보의 fixture에 A/B **컬럼**이 있다는 사실은 n00C의 A/B **값**이 있다는 뜻이 아니다.

### 검색·검증 재현

- 검색어: `site:github.com/Retera/WarsmashModEngine "AbilityData.slk" Warsmash`, `site:github.com "ACct" "AbilityData.slk" Warcraft III`, `"ACct" "Critical Strike" Warcraft III`.
- `git ls-remote --heads`로 세 후보 main SHA를 조회: 모두 종료 코드 0.
- GitHub tree API의 `?recursive=1`을 세 SHA에 읽기 전용 요청: 모두 종료 코드 0, `truncated=false`. OpenRealm·wc3-moba의 fixture path만 검출했다.
- 두 raw fixture와 LICENSE를 다운로드해 각각 `rg -n -i 'ACct|Critical Strike'`: 매치 없음(명령 자체는 `|| true`로 후속 검사를 계속했다). `sha256sum`, `wc -l`, 헤더 확인은 종료 코드 0. 두 LICENSE는 MIT로 시작한다.
- 인터넷 도달 전 sandbox의 `git ls-remote`는 DNS 오류였고, 허가된 읽기 전용 재시도에서 성공했다. 네트워크 오류를 파일 부재의 근거로 쓰지 않았다.

### b의 결론과 c 인계

조사 범위에서 ACct의 `code`, DataA1~DataE1, levels, targets, buffs, duration을 모두 가진 읽기 가능한 공개 데이터 후보를 확보하지 못했다. 따라서 **b는 조사 완료지만 i-2 데이터 확보는 미완료**다. 수치·대상·부수 효과·RNG/difficulty 순서를 채우거나 구현하지 않았다.

다음 **SP-10-09-i-2-c**는 이 결과를 입력으로 삼아 (1) 사용자가 라이선스가 있는 일치 데이터셋을 제공할 때의 추출 계약, 또는 (2) 원본과 구별된 웹 대체 정책의 승인 항목을 작성한다. 이 문서는 정책을 승인하지 않는다.


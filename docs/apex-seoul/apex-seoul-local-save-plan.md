# Apex Seoul 플레이 정보·로컬 기록 저장 설계

갱신일: 2026-09-11
상태: 로컬 저장 1차 구현. 아래 계약 중 구현 범위와 후속 항목은 구현 현황에 구분한다. 실행 우선순위는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)가 소유한다.

## 목표와 현재 상태

현재 플레이 코스 Bugak 한 개와 Raven/Mirae/Seorin 세 차량의 플레이 정보를 저장하고, 코스가 늘어도 기존 기록을 보존한다. 새로고침·브라우저 재실행 후 기록과 마지막 선택을 복원한다. 저장 데이터가 없거나 초기화되어도 게임에 포함된 기본값으로 즉시 플레이할 수 있어야 한다.

현재 `src/game/runRecord.ts`는 `apex-seoul:best-run:<trackId>`에 최고 시간 숫자만 저장한다. 차종·규칙·완주 이력·PB checkpoint는 구분하지 않는다. `runSetup.ts`에는 코스/차량/색상 기본값이 있지만 영속화는 없고, `OptionsScene`은 저장이 없는 UI prototype이다. `TimeAttackScene` 완주 지점에서 저장하며 `TimeAttackResult`는 `resultScene.ts`에 정의되어 있다. 이 경계를 확장한다.

## 저장 방식 결정

MVP는 **localStorage + 버전이 있는 JSON + 앱 수명의 메모리 store**를 사용한다. 저장량이 작은 선택 정보·PB·최근 완주 요약에 맞추고, 씬은 storage를 직접 호출하지 않는다. 매 프레임 저장하지 않고 정상 완주 확정·선택 확정·초기화 때만 쓴다.

| 방식 | 이번 결정 |
| --- | --- |
| localStorage | 채택. 현재 코드에서 확장하고 아래 보관 상한으로 JSON 크기를 제한 |
| IndexedDB | ghost/replay나 대량 이력을 도입할 때 검토. 현재는 도입하지 않음 |
| JSON 내보내기/가져오기 | 후속 백업 기능. 브라우저 데이터 삭제 후 개인 기록 복구가 필요할 때 추가 |
| 서버 저장/계정 동기화 | 이번 범위 밖 |

저장은 같은 origin의 해당 브라우저에 한정된다. 개발 주소·운영 주소·다른 기기 사이 자동 공유는 없다. 브라우저 데이터 삭제로 사라진 개인 기록은 내장 기본값으로 되살릴 수 없다. 복구하는 것은 기본 선택·코스/차량 목록·빈 기록 구조이며, 사용자 기록의 복원은 별도 백업 영역이다.

## 코스·차량·규칙의 식별

- 신규 `CourseCatalog`에 안정적인 `trackId`, 표시명, 플레이 가능 여부, checkpoint 정의, 기본 코스 여부를 둔다. 첫 공개 코스는 `bugak-ridge-downhill`이고 `elevation-test`는 일반 기록에서 제외한다.
- 차량은 기존 catalog의 `raven-coupe`, `mirae-gt`, `seorin-gt`를 사용한다. preview/QA 자산 ID는 기록 가능한 차량으로 취급하지 않는다.
- 기록 bucket은 **`trackId × vehicleId × rulesetVersion`**이다. 색상은 run의 표시 정보로만 저장하며 PB를 나누지 않는다.
- 코스 geometry/checkpoint, 시간 계산, handling/drivetrain처럼 비교 조건이 달라지면 해당 기록의 `rulesetVersion`을 올린다. UI·색상 변경은 올리지 않는다. JSON 구조 변경용 `schemaVersion`과 구분한다.
- 새 코스는 catalog 항목과 기본 설정을 추가하면 빈 기록 행이 생성된다. 기존 bucket은 유지한다. 이름 변경은 ID를 바꾸지 않는다. 제거되었거나 이전 규칙인 bucket은 과거 기록으로 보관하고 현재 PB에는 합치지 않는다.

## 데이터 계약 제안

실제 TypeScript 타입 이름과 파일 분리는 구현 시 확정하되, 아래 의미를 유지한다. 저장 단위는 현재 계산과 같은 초이며 표시 반올림은 UI에서만 한다.

| 저장 영역 / key | 내용과 기본값 |
| --- | --- |
| `apex-seoul:profile:v1` | `schemaVersion: 1`, `lastRunSetup: { trackId: 'bugak-ridge-downhill', vehicleId: 'raven-coupe', vehicleColor: 'blue' }` |
| `apex-seoul:records:v1` | `schemaVersion: 1`, `buckets: []`, `legacy: []`, `legacyMigrationVersion: 1` |
| 향후 settings 전용 key | `GameSettingsStore`가 소유. 기록 초기화와 분리하고 실제 runtime 설정 연결 단계에서 구현 |

각 bucket은 식별 tuple과 `bestRun: RunSummary | null`, `recentRuns: RunSummary[]`, `completedRunCount: number`, `totalFinishTimeSec: number`를 가진다. 기본값은 각각 null, 빈 배열, 0, 0이다. 누적 시간은 정상 완주 시간 합계이며 메뉴·pause·중단한 run 시간은 포함하지 않는다.

`RunSummary`는 `runId`, `finishedAt`(ISO 시각), `trackId`, `vehicleId`, `rulesetVersion`, `vehicleColor`, `finishTimeSec`, `checkpointTimesSec`를 가진다. checkpoint는 PB를 낸 **동일 run의 누적 통과 시간**이다. 구간별 최솟값을 합쳐 가상의 PB로 만들지 않는다. 시각은 이력 표시용이며 시간 측정에는 쓰지 않는다.

현재 규칙 bucket별 최근 완주 20개를 최신순으로 보관하고, PB는 별도로 유지해 최근 목록에서 밀려나도 보존한다. 이전 규칙은 PB와 누적 통계만 보관하며 최근 목록은 비운다. 전체 기록 JSON은 초기 목표 상한 256 KiB로 두고, 초과 시 오래된 최근 이력부터 줄인다. PB·누적 통계만으로도 초과하면 자동 삭제하지 않고 메모리 유지 및 저장 실패 상태를 반환한다. telemetry JSONL, 매 프레임 상태, ghost는 이 저장소에 넣지 않는다.

## 내장 기본값과 초기화

`saveDefaults.ts`의 순수 factory가 catalog를 기준으로 새 기본 객체를 만든다. 내장 기본값은 읽기 전용 원본으로 다루고, 항상 새 객체를 반환해 씬의 변경이 기본값을 오염시키지 않게 한다. 읽기는 **내장 기본값 생성 → 저장 JSON 파싱 → 버전 확인/마이그레이션 → 검증된 필드 병합 → catalog 기반 선택 보정** 순서다. 저장되지 않은 신규 코스/차량도 목록에서 누락되지 않는다.

개인 PB 기본값은 `null`이고 화면에는 `기록 없음`을 표시한다. 임의 시간을 사용자의 완주 기록으로 넣지 않는다. 나중에 기본 도전 시간이 필요하면 버전별 내장 `referenceTargets`로 분리하여 `목표 기록`으로 표시한다. 실제 세 차량 주행으로 검증하기 전 숫자를 확정하지 않으며, 목표 시간·메달은 이번 저장 MVP의 선행 조건이 아니다.

| 상황 | 동작 |
| --- | --- |
| 최초 실행/브라우저 데이터 삭제 | 기본 선택과 세 차량의 빈 기록 화면을 메모리에서 구성. 저장 성공 여부와 관계없이 플레이 가능 |
| Retry/주행 리셋 | 진행 중 run만 새로 생성. 선택·누적 기록·PB 유지 |
| `RESET LOCAL RECORDS` | 게임 내 확인 후 현재/과거 규칙 및 legacy 개인 기록을 초기화. 기본 기록 문서를 저장하고 화면도 즉시 갱신. 선택·설정·내장 목표는 유지 |
| 마지막 선택 ID/색상 무효 | catalog의 유효한 기본 코스·차량·색상으로 보정 |
| 전체 설정 초기화 | 이번 UI 범위 밖. 추후 추가하더라도 기록 초기화와 별도 동작으로 정의 |

기록 초기화는 소유 key만 대상으로 하며 `localStorage.clear()`를 사용하지 않는다. 메모리 초기화뿐 아니라 디스크 반영까지 성공해야 `초기화 완료`로 표시한다. 실패하면 `이번 실행에서만 초기화됨 · 다시 실행하면 이전 기록이 남을 수 있음` 상태를 전달한다. legacy key 삭제에도 같은 실패 처리를 적용한다.

## 저장 lifecycle과 화면 연결

1. 앱 시작 시 하나의 `RunRecordStore`와 profile store를 생성한다. 씬 전환마다 새로 생성하지 않아 저장 거부 시에도 현재 실행의 기록이 유지된다.
2. `RunSetup` 우선순위는 명시적 scene setup → 개발용 URL override → 저장된 선택 → 내장 기본값이다. 최종 실제 선택을 검증하며 QA override는 저장된 정상 선택을 덮어쓰지 않는다.
3. 정상 선택 확정 때 profile을 저장한다. 주행 시작 때 setup, 규칙, 새 `runId`, 기존 PB snapshot을 고정한다. HUD는 이 snapshot으로 비교한다.
4. 완주 확정 시 유효한 일반 run만 한 번 집계한다. 같은 `runId`의 중복 호출은 무시한다. 중단·retry·QA override는 PB/최근 완주/누적 통계에 넣지 않는다. 디버그 정보 표시만 켠 경우와 물리·시간 override는 구분한다.
5. 완주마다 최근 이력과 누적 통계를 갱신하고, 더 빠른 시간일 때만 PB 전체를 교체한다. 동률은 PB와 PB checkpoint를 유지한다. 저장 시점은 finish 연출·ResultScene 진입보다 앞이다.
6. `TimeAttackResult`에 `runSetup`, `previousBestTimeSec`, `recordPersisted`, 저장 상태, 구간 비교를 전달한다. 최초 완주는 `첫 기록`, 이후 개선은 `NEW BEST`, 느린 완주와 동률은 기존 PB 비교로 표시한다. Retry는 동일 setup을 전달한다.
7. `RecordsScene`은 catalog에서 코스와 세 차량을 열거하고, 선택한 코스의 차량별 PB·최근 완주·완주 횟수를 표시한다. 데이터가 없어도 행은 존재한다. 이전 규칙/legacy는 현재 PB와 별도 표기한다.

## 오류·호환성 정책

- storage 읽기/쓰기 모두 예외 처리한다. 실패해도 완주와 retry를 막지 않는다. `saved`, `memory-only`, `unsupported-version`처럼 호출자가 구별할 수 있는 결과를 반환하고 영구 저장 여부를 UI에 전달한다.
- 손상된 JSON은 기본값으로 시작한다. 일부 bucket만 잘못되었으면 유효한 bucket은 살린다. 시간은 유한한 양수, 누적 횟수는 0 이상 정수, checkpoint는 해당 정의의 개수·순서와 일치하며 finish 이하인 값만 허용한다. 배열 길이·문서 크기도 검증한다.
- 지원하는 구 schema는 명시적 순차 migration을 거친다. 미래 schema는 읽기 불가 상태로 메모리 기본값을 제공하되 자동 덮어쓰지 않는다. 명시적 기록 초기화는 허용한다.
- 기존 `apex-seoul:best-run:<trackId>`는 차량·규칙을 추정하지 않고 legacy 목록으로 옮긴다. 새 문서 저장 성공 후에만 원본을 삭제한다. migration marker로 반복 복제와 초기화 후 기록 부활을 막고, 초기화는 남은 legacy key도 지운다.
- 여러 탭 동시 플레이는 MVP에서 지원하지 않는다. 활성 플레이 탭 한 개를 전제로 하고, `storage` 이벤트로 외부 변경을 감지하면 해당 탭의 기록 쓰기를 중단하고 다시 불러오기를 안내한다. 오래된 메모리로 외부 초기화를 되돌리지 않는다. 동시 쓰기의 완전한 보장은 후속 트랜잭션 저장 설계 범위다.

## 구현 단위와 검증 계약

아래는 작업 분해이며 실행 순서는 우선순위 문서에서 관리한다.

| 단위 | 대상과 산출물 |
| --- | --- |
| 데이터 기반 | 신규 `courseCatalog.ts`, `saveDefaults.ts`, schema/validator, `RunRecordStore`; fake storage 주입 가능 구조 |
| 플레이 연결 | `runSetup.ts`, `vehicleSelectScene.ts`, `timeAttackScene.ts`, `courseRun.ts`; profile 복원·완주 집계·QA 제외·시간 정확성 |
| 정보 표시 | `GameplayHud`, `resultScene.ts`, 신규 `recordsScene.ts`, `mainScene.ts`, scene 등록; 첫 기록·PB split·최근 기록·저장 상태 |
| 초기화/이전 | `optionsScene.ts`, legacy migration, 저장 실패와 메모리 fallback |

완료 전 다음을 검증한다. 아래는 실행 예정이며 이번 문서 변경에서 PASS로 주장하지 않는다.

- 빈 저장소에서 기본 코스/세 차량 행/기본 선택이 나타나고, 각 차량의 완주가 다른 PB를 변경하지 않는다. 색상만 바꾸면 같은 PB를 사용한다.
- 가상 두 번째 코스 fixture 추가 시 기존 기록 유지와 새 빈 행 생성을 확인한다. ruleset 변경 시 이전 PB는 현재 비교에서 빠진다.
- 첫 완주/빠른 완주/느린 완주/동률/중복 finish/21번째 이력에서 PB·최근 20개·누적 통계가 일치한다.
- 새로고침과 앱 재실행 후 선택·PB·checkpoint·최근 기록이 복원된다. retry는 기록을 유지한다.
- 기록 초기화 후 재실행해도 빈 개인 기록과 기본 구조가 유지되고, 선택·설정·동일 origin의 다른 앱 데이터는 보존된다. legacy가 부활하지 않는다.
- 손상 JSON/부분 손상/미지원 버전/저장 거부/용량 초과/초기화 실패/다른 탭 초기화를 fake storage와 브라우저에서 확인한다.
- PB 시간 보간·pause/focus·QA override 제외를 먼저 확보하고 HUD split을 연결한다. 30/60/120fps 차이는 시간 계산 작업의 승인 기준으로 검증한다.
- 구현 후 저장 계약용 QA를 추가하고 관련 기존 `qa:vehicle-catalog`, `qa:gameplay-hud`, `build`와 실제 정상 플레이 flow를 확인한다. 이번 문서 변경에는 게임 회귀 실행이 필요하지 않다.


## 2026-09-11 내부 구현 현황

- `saveDefaults.ts`의 `SAVE_COURSES`/`SAVE_VEHICLES` 배열로 기본 bucket을 일괄 생성한다. 향후 기본 기록은 `DEFAULT_REFERENCE_RECORDS` 배열에 작성하며 개인 PB와 분리한다. 현재 배열은 비어 있다. 초기화 후에도 참조 배열은 유지되고 개인 기록은 빈 기본 구조로 돌아간다.
- `RunRecordStore`에 코스×차량×규칙별 PB, 최근 20개, 완주 횟수/시간 합, 중복 run 방지, 마지막 선택, legacy 이전, 손상/거부/미지원 버전 방어를 구현했다.
- 완주 저장·첫 기록 결과·명시적 retry setup을 연결했다. 씬 재진입 때 finish/result 상태도 초기화한다. QA와 개발용 URL override는 저장에서 제외한다. 알 수 없는 URL parameter도 보수적으로 제외하며 debugHud와 일반 선택/UTM 세 항목만 허용한다.
- Records 메뉴는 코스/차량별 PB·완주 횟수와 최근 5개 요약(저장은 20개), 기본 참조 목표를 표시한다. Options의 `RESET LOCAL RECORDS`를 두 번 눌러 확정하면 기본 기록 문서를 저장한다. 마지막 선택과 다른 앱의 key는 보존한다.
- 후속: 실제 추가 코스의 garage 선택 UI, HUD PB checkpoint 비교, 시간 경계 보간·pause/focus 정책, 전체 최근 20개 탐색·이전 ruleset 상세 화면. 저장 모듈은 이전 bucket을 보존하지만 Records 화면은 현재 규칙과 legacy 요약만 표시한다. 이번 단계에서 시간 정확성 P0-4 완료를 주장하지 않는다.

검증 명령: `npm run qa:local-save --workspace=@games/apex-seoul`, `npm run qa:local-save-browser --workspace=@games/apex-seoul` (로컬 Vite 서버 필요), 기존 `qa:vehicle-catalog`, `qa:gameplay-hud`, `build`. 브라우저 검증은 격리된 임시 profile과 결정적 완주 fixture로 저장·결과·retry 연결을 확인하며 실제 운전 시간 공정성 검증을 대체하지 않는다.

검증 결과: 저장 계약 QA·격리 브라우저 QA·차량 catalog·gameplay HUD·Vite build PASS. Records와 Options reset 화면을 캡처해 확인했다. 전체 `tsc --noEmit`은 기존 player/road renderer·shader·vehicle-preview 등의 오류로 실패하며, 신규 저장 모듈과 Records/Options/Result/Main 코드의 타입 오류는 없다.

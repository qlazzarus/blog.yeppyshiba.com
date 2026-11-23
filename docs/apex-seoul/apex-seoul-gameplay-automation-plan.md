# Apex Seoul 게임성 개선·자동 실행 계획

갱신일: 2026-11-23

목표는 입력 안정화 직후 **그립/드리프트 선택 가치, 차량별 공략 차이, 재도전 목표**를 검증하고 필요한 개선을 작은 변경으로 실행하는 것이다. Astra가 계획과 결과 해석을 맡고 DeepSeek 4.1 Flash가 범위가 고정된 구현·측정·회귀 검사를 맡는다. 이 문서는 역할과 실행 계약을 정의한다. 모델 전환, 작업 runner, 자동 판정기는 아직 연결하지 않았으며 해당 모델에서 실행했다고 주장하지 않는다.

우선순위·상태는 [다음 구현 우선순위](./apex-seoul-next-priority-plan.md), 실제 실행 카드는 [DeepSeek 태스크](./apex-seoul-deepseek-tasks.md)가 소유한다.

## 역할과 결정 경계

| 담당 | 책임 | 다음 단계로 넘기는 산출물 |
| --- | --- | --- |
| Astra — 계획 | 문제 가설, 시나리오, 변경 허용 파일/상수, 비교 지표, 통과 기준, 시도 한도 확정 | 실행 카드와 수치가 채워진 측정 계약 |
| DeepSeek 4.1 Flash — 실행 | 기준 측정, 지정 범위 구현, 동일 조건 재측정, 회귀 검사, 증거 정리 | 변경 diff와 기계 판독 결과·짧은 보고 |
| 자동 판정기 — 구현 예정 | 필수 결과 누락·명령 실패·기준 위반 검사, 다음 카드 실행 가능 여부 결정 | PASS / FAIL / BLOCKED / REVIEW_REQUIRED |
| Astra — 검토 | 가설 지지 여부, 측정 편향, 미해결 tradeoff 해석 및 후속 카드 확정 | 후보 채택 제안 또는 좁힌 재실행 카드 |
| 사용자 — 플레이 | 조작의 납득 가능성, 차량의 차이, 실패 원인 가독성, 재도전 의욕 확인 | 체감 피드백과 최종 후보 선택 |

정해진 범위의 코드 변경·검사마다 사용자 승인을 반복 요청하지 않는다. 정량 통과는 기술 후보 통과이며 재미의 최종 승인과 구분한다. 청음·실기기·체감 입력이 필요하면 비교 가능한 실행물과 질문을 준비한 뒤 요청한다.

## 게임성 질문과 측정

| 질문 | 자동 측정 | 자동 측정만으로 결론 내리지 않을 것 |
| --- | --- | --- |
| 그립과 드리프트를 언제 선택하는가? | 같은 진입 상태에서 section time, exit speed, drift 유지 시간, rail impact, 이탈/미완주 | drift가 항상 빨라야 한다는 가정, 입력 스크립트 실패를 물리 결함으로 단정 |
| 세 차의 공략이 다른가? | 같은 코스·조건에서 가속/제동, entry/apex/exit speed, 구간별 시간·충돌 | 단일 controller의 순위가 차량 밸런스의 최종 순위라는 주장 |
| 다음 run의 목표가 보이는가? | 구간 delta 계산, 데이터 없는 구간 처리, 팁 표시·갱신 계약 | 시간 차이만으로 “브레이크가 늦었다” 같은 원인 추정 |

완주율은 사전 정의한 입력/진입 상태 표본에서의 성공 비율로만 보고한다. 사용자 완주율로 표현하지 않는다. drift 미진입, 고착, 경로 이탈, 시간 초과도 결과에 포함하며 성공한 run만 골라 비교하지 않는다.

## 측정 계약 — DS-18A에서 확정

1. **기준 식별**: git commit, 미커밋 변경 diff의 hash, runtime 설정과 차량/코스/ruleset, 도구 버전을 기록한다. 기존 변경이 있으면 깨끗한 HEAD가 측정 대상인 것처럼 표기하지 않는다.
2. **시나리오**: 실제 production 코스에서 완만/강/연속 코너와 좌/우 방향을 선정한다. 각 구간의 시작·apex·끝 world z, 진입 속도·offset·heading·gear·RPM/boost·drift 상태, 종료/실패 조건을 고정한다.
3. **입력 정책**: 동일 입력 replay는 회귀용, 전략별 grip/drift controller는 선택 가치 탐색용으로 구분한다. 전략마다 brake/steer/throttle 타이밍을 고정하고 실제 drift 진입을 assertion으로 확인한다. controller 최적화와 물리 변경을 한 실험에 섞지 않는다.
4. **재현성**: 주 판정은 60Hz, 30/120Hz는 시간 간격 회귀로 사용한다. seed와 반복 횟수, 허용 오차는 실행 전에 계약에 넣는다. 동일 deterministic 조건의 반복을 독립 사용자 표본으로 계산하지 않는다.
5. **판정 기준**: 목표 지표/개선 방향/최소 변화량/허용 회귀량을 기준 측정 후 Astra가 확정한다. 결과를 본 뒤 임계값을 낮춰 통과시키지 않는다. 허용 범위가 비어 있으면 측정만 가능하고 tuning은 불가하다.
6. **탐색 예산**: 후보 수, 후보당 실행 횟수, 시간 제한을 카드에 명시한다. 기본은 하나의 원인 가설과 한 종류의 변경, 최대 3개 후보다. 최적값이 안 나오면 실패 근거를 인계하고 무한 탐색하지 않는다.

기존 [handling simulation](../../games/apex-seoul/scripts/simulate-handling-matrix.mjs)은 자체 baseConfig와 Raven 중심 조건을 사용하고, [runtime matrix](../../games/apex-seoul/scripts/run-handling-matrix.mjs)는 과거 tuning 후보를 포함한다. 그대로 현재 세 차량 production 기준으로 간주하지 않는다. [vehicle comparison](../../games/apex-seoul/scripts/compare-vehicle-performance.ts)과 [handling balance](../../games/apex-seoul/scripts/audit-vehicle-handling-balance.ts)의 runtime config 사용 방식을 먼저 대조한다. 기존 QA는 보존하고 새 측정은 production 계약을 재사용한다.

## 실행 흐름과 중단 조건

`DS-18A 계약 → DS-18B 측정 도구 → DS-18C 기준 측정 → Astra 판정/변경 카드 → DS-18D 후보 1개 구현 → DS-18E 비교·회귀 → 사용자 비교 주행`

- DS-18C에서 개선 필요가 없거나 가설이 기각되면 tuning 없이 근거를 남긴다. 후보를 만들기 위해 문제를 가정하지 않는다.
- DS-18E 통과 후에만 DS-18F 결과 피드백을 검토한다. DS-18D를 건너뛰었다면 기준 측정과 기존 회귀 통과 근거로 진행할 수 있다.
- 필수 명령 실패, timeout, schema 불일치, baseline 불일치, 허용 파일 밖 변경, 회귀 초과 시 후속 자동 실행을 멈춘다.
- Node/브라우저 부재나 누락 evidence는 BLOCKED다. 실행하지 않은 검사를 PASS로 기록하지 않는다.
- 자동 재시도는 같은 환경 문제에 최대 1회만 허용한다. 수치 변경·assertion 약화·정상 결과 덮어쓰기로 실패를 회피하지 않는다.
- 실패한 diff와 결과는 보존한다. 사용자 변경을 포함한 작업 디렉터리에 자동 reset/checkout을 실행하지 않는다. 별도 후보 patch를 사용하거나 현재 후보를 정리한 뒤 다음 후보를 적용한다.
- 기술적으로 통과했지만 체감/선택이 필요한 결과는 REVIEW_REQUIRED다. 독립된 이미 계획된 작업은 계속할 수 있지만 미승인 후보를 production 기본값으로 승격하지 않는다.

## 결과 및 자동 실행 인터페이스

후속 구현은 각 task 실행 결과를 JSON과 사람이 읽는 요약으로 함께 저장한다. 경로는 [evidence](./evidence/) 아래 `날짜/태스크/후보/`로 구분하고 baseline은 덮어쓰지 않는다.

필수 필드: `taskId`, `candidateId`, `status`, `baselineCommit`, `workingDiffHash`, `contractVersion`, `environment`, `commands`(명령/exit code/timeout/log 경로), `scenarioResults`(차량/전략/Hz/seed/완주 여부/지표), `regressions`, `artifacts`, `blockers`, `nextAction`.

- 판정기는 모델이 출력한 PASS 문구가 아니라 필수 명령의 exit code, 결과 schema와 사전 계약을 검사한다.
- 재개 시 선행 결과의 contract/baseline/config hash가 현재 실행과 같은지 확인한다. 다르면 기존 PASS를 재사용하지 않는다.
- 실제 모델 호출은 사용 가능한 API/CLI가 확인된 뒤 별도 연결한다. DeepSeek 호출 방식·인증·비용 한도가 아직 지정되지 않았으므로 현재 문서만으로 무인 모델 호출을 약속하지 않는다. 우선 동일 카드와 결과 계약을 수동 인계에도 사용한다.
- DS-18B는 측정·판정 자동화만 만든다. 자동 모델 호출·merge·배포는 포함하지 않는다.

## 개선 범위

첫 개선은 관측된 문제에 따라 steering/drift/차량 응답/코너 geometry 중 하나만 대상으로 한다. 물리·코스·기록 ruleset에 영향을 주면 Astra가 호환성 처리와 회귀 범위를 카드에 명시한다. UI·오디오 변경으로 기록 버전을 올리지 않는다.

구간 목표는 먼저 실제 PB 대비 개선 가능 구간을 보여준다. 원인 telemetry가 없으면 “가장 손실이 큰 구간”까지만 안내한다. medal 목표, 추가 코스, ghost, 온라인 랭킹은 이번 자동화의 선행조건이 아니다. CH-4/CH-5는 관측 근거가 있는 카드로만 재개한다.

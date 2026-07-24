# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-24

상태: HR-3K까지 구현·자동 회귀를 완료하고 현재 코너링 기준선을 임시 동결했다. 무입력 road-follow는 `0`이며 production 강코너 `8개 × 3속도`가 모두 바깥쪽으로 이탈한다. `185km/h`에서는 모든 강코너가 예상 바깥 rail에 닿고, 동일 rail 반복 impact는 코너당 `4~11회 → 1회`로 줄었다. 사용자 실주행에서는 코너 감각에 약 `20%`의 보완 여지가 남았다고 판단했지만, CH-4 코스 apex 재설계와 CH-5 grip/drift time 비교는 다음 코너링 재개 시점으로 이월한다.

이 문서는 가까운 실행 순서만 관리한다. 구현 근거와 완료 이력은 각 설계 문서에, 당장 실행하지 않을 항목은 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)에 둔다.

## 현재 승인 기준선

| 영역 | 현재 기준 |
| --- | --- |
| 기본 주행 | grip 중심 속도대 응답 유지. production 강코너 무조향 바깥 이탈과 rail 위협 재승인 완료 |
| drift | `GRIP → SETUP → DRIFT → RECOVERY`, counter trim과 명시적 counter transition |
| 속도 | Raven Coupe 표시 상한 `225km/h`, 0-100 약 `8.1초`, production longitudinal scale U2 `2.00` |
| 코스 | Bugak Ridge Downhill `348 segment / 83,520u`, checkpoint와 finish 진행 상태 |
| 충돌·화면 | 물리/화면 rail boundary 일치, `enter / stay / exit` contact lifecycle, physical command 기반 grip sprite |
| 검증 | world-line `7/7`, grip trajectory `8/8`, corner exit steering `5/5`, production diagnosis `14/14`와 gameplay `6/6` PASS |

구동계, 표시 속도, 기본 grip/drift 상태 머신과 HR-3K 코너 궤적을 다음 기능 작업의 회귀 기준선으로 유지한다. 사용자 실주행에서 남은 감각 차이는 완료로 덮지 않고, 아래 P0의 보류 항목으로 기록한다.

## P0 — 코너 조향 필수 계약 복구

현재 최우선 작업은 코너가 화면 배경의 변화가 아니라 플레이어가 직접 처리해야 하는 시간 공격 구간이 되게 만드는 것이다.

### 실행 순서

1. ~~잘못된 상대 outward 승인을 폐기하고 첨부 runtime S-curve를 absolute shoulder/rail 계약으로 고정~~ — HR-0 완료
2. ~~차량 heading error / road-relative velocity debt를 지속 상태로 구현~~ — HR-1 완료
3. ~~무입력 lateral position centering과 steering wheel 복귀 책임 분리~~ — HR-2 완료
4. ~~새 heading 상태를 기준으로 관성·scrub·collision 재조정~~ — HR-3A~E 완료
   - ~~HR-3A: point curve 대신 near/far preview tangent demand~~
   - ~~HR-3B: 위치 centering 없는 passive grip yaw capacity~~
   - ~~HR-3C: heading hard clamp를 soft slip response로 교체~~
   - ~~HR-3D: prepared grip, drift, shoulder/rail 결과 재조정~~
   - ~~HR-3E: 속도×곡률×주행 방식 production matrix 승인~~
5. ~~HR-3F 실주행 곡률 추종 보정~~ — 완료
   - ~~preview near/far `68/32 → 80/20`~~
   - ~~medium/sharp base authority `0.76/0.58 → 0.86/0.74`~~
   - ~~overspeed grip loss `0.48 → 0.35`~~
   - ~~easy, neutral centering과 sharp 무대응 위협은 유지~~
6. ~~HR-3G 코너 출구 반대편 발사와 전방 rail 충돌 복구~~ — 완료
   - ~~HR-3G0: `8% / 20% / 30%` 상태 fork replay~~
   - ~~HR-3G1: passive yaw loss와 direct overspeed lateral의 중복 제거~~
   - ~~HR-3G2: grip debt-cancel과 line-change authority 분리~~
   - ~~HR-3G3: 차체 전방 swept rail contact~~
   - ~~HR-3G4: neutral/prepared grip/drift production 재승인~~
7. ~~HR-3H 무입력 월드 직진과 조향 기반 코너링 계약~~ — 완료
   - ~~HR-3H0: 40%/production fork와 preview 격리 계약~~
   - ~~HR-3H1: 물리 yaw를 현재 접지점 곡률로 변경~~
   - ~~HR-3H2: passive road-follow 제거와 실제 steering authority 계측~~
   - ~~HR-3H3: relative heading 기반 lateral kinematics~~
   - ~~HR-3H4: 자동 corner scrub을 tire-loss budget으로 제한~~
   - ~~HR-3H5: neutral rail / prepared grip / drift production 승인~~
8. 판단 window가 부족한 선택 코너에만 sustained apex 적용 여부 결정 — HR-4 조건부, 다음 재개 시점으로 이월
9. ~~HR-3I grip 방향 안정성과 차체-궤적 일치~~ — 완료
   - ~~HR-3I0: 로그 기반 ice-feel fixture~~
   - ~~HR-3I1: 물리 steering command slew~~
   - ~~HR-3I2: trajectory 기반 body pose~~
   - ~~HR-3I3: world-line/production/handling 회귀~~
10. ~~HR-3I-R 무조향 sprite 회귀 보정~~ — 완료
   - ~~trajectory heading의 sprite frame 관여 제거~~
   - ~~physical steering command 기반 pose 복구~~
   - ~~neutral command center-frame 자동 gate~~
   - ~~world-line/production/handling 재승인~~
11. ~~HR-3J guardrail contact lifecycle과 단일 impulse~~ — 완료
    - ~~지속 접촉은 `enter`에서만 impulse 적용~~
    - ~~같은 rail 반복 impact `4~11회 → 1회`~~
    - ~~release inset 이탈 뒤에만 재충돌 허용~~
12. ~~HR-3K 코너 출구 inside heading overshoot 제한~~ — 완료
    - ~~grip `0.06rad`, drift 최대 `0.18rad` 성장 allowance~~
    - ~~neutral·counter steer·직선에는 제한 미적용~~
    - ~~좌우 drift exit 대칭과 기존 world-line 회귀 승인~~
13. prepared grip과 drift의 line·exit speed·section time 최종 승인 — HR-5, 다음 재개 시점으로 이월

상세 진단, 수치와 단계별 gate는 [속도대별 핸들링 계획의 2026-07-23 재검증](./apex-seoul-speed-band-handling-plan.md#2026-07-23-무입력-코너-관성-재검증)에서 관리한다.

HR-2 구조 계약은 `6/6 PASS`, HR-1 heading 계약은 `5/5 PASS`, production 진단은 `11/11 PASS`다. offset `360u`의 무입력 straight는 2초 뒤에도 `360u`이고 centering force와 steering velocity는 `0`이다. 기존 `-120u/s` 횡속도는 위치를 `350.2174u`까지만 이동시킨 뒤 역방향 복귀 없이 damping으로 `0`이 된다. production gameplay 계약은 `5/6`, 상태는 `HR2_CENTERING_SEPARATED_HR3_TUNING_BLOCKED`다. [HR-2 계약](../../games/apex-seoul/scripts/audit-neutral-centering-contract.mjs), [production 계약 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)

HR-3F production에서 preview curve와 contact curve의 최대 차이는 `0.208`, yaw 분해 오차는 `0`이다. 첫 sharp 코너 prepared grip은 무입력 대비 최대 paved ratio `1.332 → 0.691`, impact `1 → 0`, 동일 구간 종료 속도 `128.733 → 145.354km/h`를 기록했다. 상세 구현과 gate는 [HR-3F 구현 결과](./apex-seoul-speed-band-handling-plan.md#hr-3f--실주행-곡률-추종-보정), 전체 matrix는 [HR-3F 보고서](../../games/apex-seoul/assets/telemetry/generated/hr3-handling-matrix/hr3-handling-matrix.md)에 둔다.

HR-3G의 로그 근거, 단계별 변경 범위와 완료 gate는 [코너 출구 반대편 발사와 전방 rail 충돌 계약](./apex-seoul-speed-band-handling-plan.md#hr-3g--코너-출구-반대편-발사와-전방-rail-충돌-계약)에서 관리한다.

HR-3G fork 계약은 `6/6 PASS`다. neutral은 세 fixture 모두 outward로 계속 진행했고, 짧은 correction은 반대 heading/inertia 없이 기존 debt만 줄였다. 차체 중심이 side rail limit에 닿기 전 front corner impact도 검증했다. [HR-3G 계약 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-exit-recovery/corner-exit-recovery-contract.md)

HR-3H는 기존 HR-3E의 passive follow 승인 수치를 폐기한다. 상세 근거와 단계별 gate는 [무입력 월드 직진과 조향 기반 코너링 계약](./apex-seoul-speed-band-handling-plan.md#hr-3h--무입력-월드-직진과-조향-기반-코너링-계약)에서 관리한다.

HR-3H world-line 계약은 `7/7 PASS`, production은 `14/14 + 6/6 PASS`다. neutral sharp는 rail에 도달하고 prepared grip과 drift는 서로 다른 명시적 입력으로 rail 없이 통과한다. [HR-3H 계약 보고서](../../games/apex-seoul/assets/telemetry/generated/world-line-cornering/world-line-cornering-contract.md)

Production track에서 강한 코너를 자동 탐색해 `120 / 160 / 185km/h` 무조향 full-throttle로 독립 실행하는 회귀도 추가했다. 현재 좌우 코너 `8개 × 3속도 = 24개`가 모두 바깥쪽으로 이탈하며, `185km/h`는 `8/8` 코너에서 `1.267~1.700초` 안에 차체 전방 rail contact를 만든다. `npm run qa:neutral-production-corners --workspace @games/apex-seoul`로 재검사한다. [production 무조향 코너 보고서](../../games/apex-seoul/assets/telemetry/generated/neutral-production-corners/neutral-production-corners.md)

HR-3I-R 이후 무조향 sprite는 road-relative heading이 아니라 physical steering command를 표현한다. 유효 command와 sprite 방향 불일치는 `0건`, release settled pose 최대값은 `0.0002`다. HR-3J는 같은 rail의 지속 접촉을 하나의 사건으로 묶어 production `185km/h` 8개 분기의 동일 rail impact를 모두 `1회`로 만들었다. HR-3K는 같은 방향 조향이 road-aligned 지점을 지난 뒤에도 inside heading을 중복 생성하는 경로를 제한했고, 좌우 drift exit 최대 inside heading은 `0.179rad`다.

### P0 임시 동결 판단

- 자동 계약상 “코너에서 조향하지 않으면 바깥 rail을 위협한다”는 핵심 규칙은 복구됐다.
- contact lifecycle과 sprite는 물리 상태를 반복 충돌이나 가짜 조향으로 왜곡하지 않는다.
- 사용자 실주행 감각에는 약 `20%`의 보완 여지가 남았다. 이는 승인 완료가 아니라 다음 재개를 위한 명시적 잔여 판단이다.
- CH-4 선택 코스 apex 재설계와 CH-5 grip/drift section time 승인은 time attack loop에서 실제 기록 비교가 가능해질 때 함께 재개한다.
- 기존 `qa:drive-telemetry`의 고정 `700u` rail 점수는 production의 동적 rail boundary를 대표하지 못하므로 별도 QA 부채로 남긴다. 이 점수만으로 현재 handling을 PASS/FAIL 처리하지 않는다.

### 완료 조건

- 직선과 easy sweep은 무조향 또는 작은 보정으로 안정적이다.
- 선택한 sharp 코너에 과속 무조향으로 진입하면 shoulder 또는 rail 위협이 실제 production run에서 발생한다.
- 같은 코너의 brake/lift prepared grip은 무조향보다 좋은 line과 exit speed를 만든다.
- drift는 실제 slip/counter를 거쳐 유용한 line 또는 진입 속도 선택지가 되며 자동 정답은 아니다.
- U1/U2 진행 배율이 달라도 같은 물리 속도·코너 geometry의 위험 관계가 설명 가능하다.
- 최고속, 0-100, collision boundary와 기존 grip/drift 상태 회귀가 통과한다.

## P1 — 최소 time attack loop 완성

P0 승인 뒤 한 번의 주행을 명확히 시작하고 끝낸 뒤 다시 도전할 이유를 만든다.

### 구현 범위

1. 시작 전 짧은 ready/countdown 상태
2. 주행 중 현재 시간과 checkpoint/sector split 피드백
3. finish 뒤 결과 화면
4. 이번 기록, best 기록과 차이 표시
5. 즉시 restart와 기록 유지

현재 존재하는 progress/checkpoint/finish state를 사용하고 별도의 복잡한 메뉴 시스템부터 만들지 않는다.

### 완료 조건

- 시작 전 차량이 임의로 진행하지 않고 countdown 뒤 같은 조건에서 출발한다.
- checkpoint와 finish 시간이 한 run 안에서 단조 증가하고 restart 시 run state만 초기화된다.
- best record는 새 기록일 때만 갱신되며 새로고침 정책이 명확하다.
- 키보드와 향후 모바일 입력이 같은 run command를 사용한다.
- U2 속도, powertrain, grip/drift, collision과 기존 telemetry가 유지된다.

## P2 — 코스 gameplay 구조

time attack loop가 완성된 뒤 코스를 단순 배경이 아니라 판단 가능한 구간으로 정리한다.

### 후보 범위

- recovery straight, easy sweep, commitment corner, S transition의 section metadata
- checkpoint별 split과 구간 특성 표시
- 코너 진입 준비, line 유지와 exit speed를 결과에서 읽을 수 있는 최소 피드백
- 같은 입력으로 반복 주행할 수 있는 deterministic start/track 조건

환경 랜드마크, sector 전환, route fork를 먼저 구현하지 않는다. 필요해질 경우 D-01/D-02/D-05를 이 작업에 병합한다.

### 완료 조건

- 각 section의 시작·종료와 목적이 track data 또는 단일 파생 규칙으로 정의된다.
- 결과 화면에서 느린 구간을 구분할 수 있다.
- section metadata가 렌더 전용 좌표와 물리 코스 좌표를 분리하지 않는다.

## P3 — 입력·플랫폼 완성도

핵심 loop와 코스 피드백이 승인된 뒤 실제 배포 환경의 조작과 성능을 정리한다.

### 후보 범위

- 모바일 landscape용 accelerator/brake/steering 입력
- keyboard와 touch가 공유하는 input abstraction
- pause, visibility change와 focus loss 처리
- 저사양 브라우저의 WebGL 성능·해상도 정책
- HUD의 모바일 가독성과 안전 영역

### 완료 조건

- 같은 입력 시퀀스에서 keyboard/touch의 controller 결과가 허용 범위 안에 있다.
- background/foreground 전환이 run time과 best record를 오염시키지 않는다.
- production viewport에서 player anchor, road, HUD와 결과 화면이 겹치지 않는다.

## 이후 milestone

| 순서 | milestone | 핵심 결과 | 보류 항목 병합 가능성 |
| ---: | --- | --- | --- |
| 4 | presentation/content integration | 코스별 환경 정체성과 필요한 시청각 피드백 | D-01, D-03, D-09~D-12 |
| 5 | replayability | 차량 선택, traffic/opponent, 점수 또는 다른 도전 조건 | D-06~D-08 |
| 6 | track expansion | 새 sector, 충분히 다른 추가 코스 또는 선택 경로 | D-02, D-04, D-05 |
| 7 | release readiness | 성능 budget, 저장 데이터, 통합 QA와 공개 빌드 | 남은 release blocker만 선별 |

이 표는 구현을 예약하지 않는다. 앞 milestone이 실제로 필요성을 만들 때만 관련 보류 항목을 활성화한다.

## 현재 하지 않을 것

- ORS-2B roadside hero pass와 ORS-6 sector transition의 독립 구현
- production 코너 실패 계약과 연결되지 않은 handling, drift와 longitudinal scale의 목적 없는 tuning
- traffic, audio, route fork를 game loop보다 먼저 구현
- 장면 변화 없는 코스 연장
- 차량 수만 늘리고 차량별 gameplay 차이를 만들지 않는 확장
- 자동 QA 통과 수치만을 위한 플레이 감각 변경

## 다음 결정

P0의 HR-3K 기준선을 임시 동결하고 P1에서 아래 한 묶음을 확정한다.

```text
countdown
  → timed run
  → checkpoint split
  → finish/result
  → best record
  → restart
```

화면 설계와 저장 범위를 정한 뒤 이 묶음을 하나의 vertical slice로 구현한다.

## 필수 회귀

새 milestone은 변경 범위에 맞는 세부 QA와 함께 최소 다음을 유지한다.

```bash
npm run qa:corner-production --workspace @games/apex-seoul
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:outrun-longitudinal-ab --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

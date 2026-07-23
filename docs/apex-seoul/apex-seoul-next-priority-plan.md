# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-23

상태: 핸들링·드리프트·최고속·속도감 개선을 현재 production 기준선으로 마감했다. ORS-2B와 ORS-6을 포함한 잔여 presentation 아이디어는 후순위 백로그로 이동했으며, 다음 작업 방향은 **주행 기술의 추가 tuning이 아니라 플레이 가능한 게임 루프 완성**이다.

이 문서는 가까운 실행 순서만 관리한다. 구현 근거와 완료 이력은 각 설계 문서에, 당장 실행하지 않을 항목은 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)에 둔다.

## 현재 승인 기준선

| 영역 | 현재 기준 |
| --- | --- |
| 기본 주행 | grip 중심, easy/medium/sharp에 따라 연속적으로 달라지는 understeer와 corner loss |
| drift | `GRIP → SETUP → DRIFT → RECOVERY`, counter trim과 명시적 counter transition |
| 속도 | Raven Coupe 표시 상한 `225km/h`, 0-100 약 `8.1초`, production longitudinal scale U2 `2.00` |
| 코스 | Bugak Ridge Downhill `348 segment / 83,520u`, checkpoint와 finish 진행 상태 |
| 충돌·화면 | 물리/화면 rail boundary 일치, 안정된 player anchor와 grip/drift pose |
| 검증 | powertrain, handling relation, corner demand, speed presentation, guardrail과 production build 자동 QA |

다음 구현은 위 기준을 다시 설계하지 않는다. 새 기능이 이 기준을 깨면 기능 쪽을 조정하고, handling이나 속도 상수를 먼저 다시 tuning하지 않는다.

## P0 — 최소 time attack loop 완성

현재 최우선 후보는 한 번의 주행을 명확히 시작하고 끝낸 뒤 다시 도전할 이유를 만드는 것이다.

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

## P1 — 코스 gameplay 구조

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

## P2 — 입력·플랫폼 완성도

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
| 3 | presentation/content integration | 코스별 환경 정체성과 필요한 시청각 피드백 | D-01, D-03, D-09~D-12 |
| 4 | replayability | 차량 선택, traffic/opponent, 점수 또는 다른 도전 조건 | D-06~D-08 |
| 5 | track expansion | 새 sector, 충분히 다른 추가 코스 또는 선택 경로 | D-02, D-04, D-05 |
| 6 | release readiness | 성능 budget, 저장 데이터, 통합 QA와 공개 빌드 | 남은 release blocker만 선별 |

이 표는 구현을 예약하지 않는다. 앞 milestone이 실제로 필요성을 만들 때만 관련 보류 항목을 활성화한다.

## 현재 하지 않을 것

- ORS-2B roadside hero pass와 ORS-6 sector transition의 독립 구현
- handling, drift와 longitudinal scale의 목적 없는 추가 tuning
- traffic, audio, route fork를 game loop보다 먼저 구현
- 장면 변화 없는 코스 연장
- 차량 수만 늘리고 차량별 gameplay 차이를 만들지 않는 확장
- 자동 QA 통과 수치만을 위한 플레이 감각 변경

## 다음 결정

다음 구현 착수 시에는 P0에서 아래 한 묶음을 먼저 확정한다.

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
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:outrun-longitudinal-ab --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

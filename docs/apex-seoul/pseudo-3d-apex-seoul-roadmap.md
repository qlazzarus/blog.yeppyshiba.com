# Apex Seoul 구현 로드맵

갱신일: 2026-07-23

## 프로젝트 목표

| 항목 | 방향 |
| --- | --- |
| 장르 | Phaser 4 기반 pseudo-3D arcade downhill racing |
| 핵심 주행 | 고속 grip을 기본으로 하고 sharp/S 구간에서 drift를 선택하는 구조 |
| 기본 모드 | 짧게 반복할 수 있는 Bugak Ridge Downhill time attack |
| 플랫폼 | 데스크톱과 모바일 브라우저 |
| 시각 방향 | black/blue 야간 서울, 푸른 반사광과 먼 도시 불빛 |

목표는 자동차 물리 시뮬레이터가 아니라, 읽기 쉬운 화면과 일관된 규칙으로 기록을 줄여 가는 아케이드 다운힐 게임이다.

## 제품 원칙

1. 차량은 화면 하단의 안정적인 조작 기준점이다.
2. grip이 기본값이고 drift는 특정 코너를 위한 선택지다.
3. 표시 속도, world progression, 코너 판정과 충돌은 하나의 좌표 관계를 공유한다.
4. 효과를 추가하기 전에 그것이 플레이 판단이나 게임 loop에 어떤 역할을 하는지 정의한다.
5. 완료된 handling·drift·속도감은 새 기능에서 지켜야 할 회귀 기준이지 계속 tuning할 기본 작업이 아니다.
6. 후순위 세부 아이디어는 독립 단계로 늘리지 않고 상위 기능에 병합한다.

## M0 — 주행 기반 확립 — 완료

### 구현된 기반

- curve/elevation/roadside를 가진 pseudo-3D road와 Bugak Ridge Downhill
- accelerator, brake, slope, drag, RPM, gear와 Raven Coupe powertrain
- speed-dependent grip, corner demand, understeer와 speed loss
- setup, drift, counter trim/transition과 recovery
- U2 `longitudinalScale=2` 기반 속도감과 `225km/h` 표시 envelope
- 차량 pose, shadow, headlight, speed cue와 guardrail collision/projection
- checkpoint, finish progress와 runtime telemetry
- handling, drivetrain, speed presentation, road와 collision 자동 QA

### 현재 판단

핸들링·드리프트·속도감은 다음 기능 개발을 시작할 수 있는 수준의 기준선으로 본다. 새 사용자 회귀가 없다면 이 영역을 독립 tuning milestone으로 다시 열지 않는다.

## M1 — 완결된 time attack loop — 다음 milestone

### 사용자 경험

```text
ready/countdown
  → 주행과 checkpoint split
  → finish
  → 결과와 best 비교
  → 즉시 재도전
```

### 핵심 결과물

- 명확한 start/finish 상태와 restart
- 현재 기록, best 기록과 split 차이
- 결과 화면과 최소 저장 정책
- telemetry와 실제 UI가 같은 run timing source 사용

### gate

- 같은 조건의 반복 주행이 가능하다.
- 기록 갱신과 restart가 예측 가능하다.
- U2 속도와 기존 handling/collision 회귀가 없다.

## M2 — 코스 gameplay와 학습 가능한 구간

### 사용자 경험

플레이어가 “어디서 시간을 잃었는가”와 “다음 run에서 무엇을 바꿀 것인가”를 알 수 있어야 한다.

### 핵심 결과물

- recovery/easy/commitment/S-transition section 정의
- checkpoint 또는 section split
- entry 준비, line 유지와 exit speed를 읽는 최소 결과 피드백
- deterministic track/start 조건

### gate

- section 데이터가 렌더 장식이 아니라 기록 분석에 사용된다.
- 코스의 line 선택이 결과 시간과 연결된다.
- 환경 콘텐츠 없이도 주행 리듬을 구분할 수 있다.

## M3 — 입력·플랫폼 완성도

### 핵심 결과물

- keyboard와 touch가 공유하는 input abstraction
- 모바일 landscape controls와 HUD 안전 영역
- pause/focus/visibility에 안전한 run timer
- 브라우저별 성능·해상도 기준

### gate

- 입력 장치가 달라도 핵심 controller 결과가 같은 방향으로 나온다.
- 모바일에서도 차량, 도로와 기록 UI가 동시에 읽힌다.
- 포커스 전환과 프레임 저하가 기록을 부당하게 바꾸지 않는다.

## M4 — presentation/content integration

이 milestone부터 필요한 경우에만 코스·환경·오디오 보류 항목을 합친다.

### 후보 결과물

- 새 sector 미술 작업과 함께 만드는 roadside landmark
- 실제 elevation 구간에 붙는 crest/camera cue
- gameplay 사건에 붙는 audio feedback
- 차량 상태 가독성이 부족할 때의 제한적 VFX 보강

ORS-2B, ORS-4, ORS-5와 ORS-6을 번호 순서대로 구현하지 않는다. M1~M3에서 확인된 제품 요구에 맞는 항목만 [후순위 보류 백로그](./apex-seoul-deferred-backlog.md)에서 가져온다.

## M5 — replayability 확장

### 후보 결과물

- 실제 주행 성격이 다른 차량 선택
- traffic/opponent와 추월 또는 경쟁 규칙
- 추가 목표, 점수 또는 난이도 변형
- 충분히 다른 새 코스/sector/route

기본 time attack이 반복 플레이의 기준을 만든 뒤에만 진행한다. 단순 차량 수, 장식 traffic이나 시각만 다른 route는 milestone 완료로 보지 않는다.

## M6 — release readiness

### 핵심 결과물

- production performance budget과 브라우저 호환 범위
- 저장 데이터 migration/reset 정책
- keyboard/touch, viewport와 lifecycle 통합 QA
- 공개 가능한 asset/source 정리와 배포 빌드

## 로드맵 운영

| 문서 | 역할 |
| --- | --- |
| [다음 구현 우선순위](./apex-seoul-next-priority-plan.md) | 현재와 바로 다음 milestone의 실행 범위 |
| [후순위 보류 백로그](./apex-seoul-deferred-backlog.md) | 다른 기능에 병합할 때만 다시 여는 세부 항목 |
| 개별 handling/visual/ORS 문서 | 완료된 설계 근거와 회귀 기준 |
| generated telemetry reports | 자동 측정 결과와 수치 기준 |

milestone이 끝나면 결과를 해당 설계 문서에 남기고, 이 로드맵에는 상태와 다음 gate만 갱신한다.

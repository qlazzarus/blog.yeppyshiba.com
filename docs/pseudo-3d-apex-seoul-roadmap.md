# Apex Seoul 구현 로드맵

갱신일: 2026-07-13

## 프로젝트

| 항목 | 내용 |
| --- | --- |
| 게임 | Apex Seoul |
| 장르 | Phaser 4 기반 pseudo-3D arcade downhill drift racing |
| 코스 | Bugak Ridge Downhill — 서울 산길을 참고한 fictional 야간 다운힐 |
| 목표 | 모바일 브라우저에서도 읽히는 고속 grip/drift 주행과 time attack 기반 게임 루프 |
| 시각 방향 | black/blue dreamlike Seoul, 푸른 반사광과 먼 도시 불빛 |

## 설계 원칙

1. 차량은 화면 하단의 안정적인 조작 기준점이다.
2. 속도는 숫자보다 도로 원근, roadside flow, 엔진 리듬, FOV의 작은 변화로 느껴진다.
3. grip은 기본값이고 drift는 sharp bend와 S 구간을 위한 선택지다.
4. counter-steer는 먼저 angle/line 조절이며, 반대 drift는 명시적인 전환 동작이다.
5. 실제 북악 도로를 그대로 재현하지 않고, 게임에 필요한 리듬으로 재구성한다.

## 구현 완료 기반

### Pseudo-3D / 코스

- camera horizon, FOV, height, pitch, ground projection
- curve, lane, elevation을 가진 road segment와 loop track
- 고저차 road polygon, terrain anchor, downhill slope/pitch
- `Bugak Ridge Downhill` 진행률, checkpoint, finish run 상태
- road object: guard post, chevron, pine, speed sign

### 차량 / 주행

- accelerator, Space brake, cruise/engine brake, slope/drag
- RPM, gear, torque, boost, fuel cut과 vehicle engine profile
- speed-dependent grip steering과 steering scrub
- `GRIP → SETUP → DRIFT → RECOVERY` 상태
- breakaway drift momentum, counter trim, lift/re-accel counter transition
- grip 3way와 drift strong pose, terrain/shadow 처리

### 검증 / 자산

- frozen runtime QA, 60초 telemetry, controller handling simulation
- GT86/G70/Stinger POC와 fictional Raven Coupe runtime 방향
- Three.js pose sheet, pixel pass, atlas/shadow QA pipeline

## 현재 단계

주행의 기반은 갖춰졌고 drift는 플레이 가능한 수준이다. 다음 완성 목표는 “더 빠른 숫자”가 아니라 **속도 상태의 대비**와 **라인 선택이 있는 코너링**이다.

| 현재 강점 | 현재 공백 |
| --- | --- |
| 안정된 화면 하단 차량, elevation, 고속 grip, 의도적 drift/counter | 최고속 cue의 상시화, 약한 corner/line economy, roadside flow 밀도 |

## 우선순위

### 1. Speed cue / roadside flow

- 저속·순항·최고속의 시각 밀도를 분리한다.
- shader/FOV는 상시 연출이 아니라 throttle, downhill, drift exit burst로 쓴다.
- reflector, chevron, guardrail, city light를 가까운 거리에서 빠르게 흐르게 한다.

### 2. Corner/line economy

- easy bend는 grip으로 빠르게 통과한다.
- sharp bend는 entry line, steering scrub, drift, exit alignment가 속도를 결정하게 한다.
- curve만으로 동일하게 감속시키는 모델을 줄이고, 라인과 입력에 따른 손실/보상을 만든다.

### 3. 코스 리듬과 피드백

- grip → drift → S transition → recovery straight 반복을 track section에 명시한다.
- tail light, shadow, smoke/glow, RPM cue로 brake/drift/exit를 읽게 한다.

### 4. 게임 루프

- time attack, sector/checkpoint, best record, result screen
- 이후 AI/traffic/collision, 차량 선택과 차량별 성격 확장

## 검증 기준

```text
straight/corner speed contrast
corner lateral offset usage
roadside object pass rate
brake-to-drift entry success
counter trim / transition correctness
drift exit acceleration recovery
vehicle anchor and frame stability
```

## 관련 문서

- `apex-seoul-handling-outrun-review.md`: 현재 handling model, telemetry, QA
- `apex-seoul-outrun-downhill-game-review.md`: 코스와 주행 감각의 디자인 결정
- `apex-seoul-next-priority-plan.md`: 바로 실행할 작업 순서
- `apex-seoul-visual-direction.md`: black/blue visual direction

# Apex Seoul Handling Automation Blog Guide

이 문서는 다음 Apex Seoul 구현 블로그를 쓰기 위한 내부 글감 정리다. 공개 글 원고가 아니라, 마지막 공개 글인 `phaser4-apex-seoul-runtime-sprite-contact-shadow.md` 이후 무엇이 달라졌고 어떤 흐름으로 글을 쓰면 좋은지 정리한다.

## 이번 글의 한 줄

차량 스프라이트가 도로에 붙어 보이기 시작한 뒤, 이번에는 "달릴 때 왜 어색한가"를 OutRun식 grip 감각 기준으로 다시 보고, 속도/조향/커브/화면 효과를 자동 로그로 비교하면서 튜닝했다.

## 마지막 공개 글과의 연결

지난 글의 결론은 다음과 같았다.

- 차량 sprite 품질은 PNG 파일 안에서 끝나지 않는다.
- 도로 projection, 고저차 cue, camera pitch, 차량 pose, 그림자가 같은 물리처럼 움직여야 한다.
- G70 128px approved sprite를 런타임에 연결했다.
- grip 3way steering, 고저차 contact cue, telemetry 분석, silhouette shadow pass를 묶었다.
- 다음에는 WebGL shadow, drift/slip pose, runtime switching, 반복 QA가 필요하다.

이번 글은 이 결론 다음 장면에서 시작한다.

즉 "차량은 이제 붙어 보인다. 그런데 실제로 달려보면 아직 속도감과 핸들링 감각이 이상하다. 이 감각을 어떻게 말로 쪼개고, 어떻게 자동 로그로 반복 개선할 것인가?"가 주제다.

## 기존 글과 다른 점

### 이전 글: 런타임 sprite 접지 검증

중심 질문:

```text
차량 sprite, pose, shadow가 도로 위에 붙어 보이는가?
```

주요 작업:

- approved 128px G70 sprite runtime 연결
- 5way 대신 grip 3way pose 선택
- 고저차에서 차량이 떠 보이는 문제 수정
- telemetry로 terrain/contact mismatch 확인
- silhouette shadow pass 추가

### 이번 글: 주행 감각과 자동 반복 튜닝

중심 질문:

```text
차량이 붙어 보이는 것을 넘어서, 달릴 때 OutRun식 grip 감각에 가까운가?
```

주요 작업:

- `main.ts`의 거대한 책임을 game module로 분리
- 화면 비율을 `1200 x 760` 고정 논리 화면으로 정리
- renderer를 WebGL로 전환
- 속도 표시를 내부 unit과 km/h 표시로 분리
- 정지 출발 throttle 보정
- 속도감용 FOV / shader streak cue 추가
- 핸들링 비교 문서 작성
- `qa:handling-sim` 자동 시뮬레이션 추가
- 조향/커브/고속 grip pose를 로그로 비교
- OutRun식 기준으로 고속 grip yaw를 줄이고 drift pose는 남겨둠

## 제목 후보

1. `Phaser 4 Pseudo 3D 레이싱 게임 - 핸들링 감각을 로그로 튜닝하기`
2. `Apex Seoul 주행 감각 다듬기 - OutRun식 grip과 자동 핸들링 테스트`
3. `속도감은 수치가 아니었다 - Apex Seoul 핸들링 자동화 기록`
4. `Apex Seoul에서 고속 조향이 이상했던 이유`

가장 자연스러운 제목은 1번이다.

이전 글이 "차량을 도로에 붙이기"였다면, 이번 글은 "붙은 차량을 실제로 달리게 만들기"다. 블로그 연재 흐름상 구현 주제가 분명하고, 자동 로그 튜닝이라는 차별점도 살아난다.

## 추천 frontmatter 초안

```yaml
---
title: Phaser 4 Pseudo 3D 레이싱 게임 - 핸들링 감각을 로그로 튜닝하기
date: 2026-07-03T20:30:00+09:00
summary: Apex Seoul의 주행 감각을 OutRun식 grip 기준으로 다시 보고, 고정 화면 비율, WebGL 전환, 속도 표시 보정, shader speed cue, 자동 handling simulation으로 핸들링 후보를 반복 비교했습니다.
image: /images/posts/202607/apex-seoul-handling-sim-log.png
category: coding
tags:
    - Apex Seoul
    - phaser4
    - typescript
    - pseudo-3d
    - telemetry
    - game-physics
    - racing-game
    - game-dev
---
```

## 본문 구조 초안

### 1. 들어가며

지난 글에서는 차량 sprite가 도로에 붙어 보이는 문제를 다뤘다.

이번에는 더 까다로운 문제가 남았다.

```text
차량은 붙어 보이는데, 달릴 때 감각이 아직 이상하다.
```

이상함은 한 단어로 끝나지 않았다.

- 정지 상태에서 가속할 때 튀거나 둔하다.
- 속도 수치가 `700`처럼 보이는데 실제 감각과 맞지 않는다.
- 고속에서 조향 pose가 너무 크게 틀어져 drift처럼 보인다.
- 커브가 차를 밀어야 하지만 조작권을 빼앗으면 안 된다.
- 매번 직접 플레이하며 같은 후보를 비교하기에는 시간이 너무 많이 든다.

그래서 이번 글의 방향은 "감으로 한 번 고치기"가 아니라 "감각을 테스트 가능한 작은 지표로 쪼개기"다.

### 2. 먼저 main.ts를 쪼갰다

핸들링을 건드리기 전에 코드 구조부터 정리했다.

분리한 모듈:

```text
game/runtimeConfig.ts
game/runtimeTelemetry.ts
game/playerVehicleController.ts
game/hud.ts
game/roadObjectRenderer.ts
game/speedEffectShader.ts
```

글 포인트:

- `main.ts`에 모든 런타임 책임이 몰려 있으면 튜닝 값과 렌더링 값, QA 값이 서로 섞인다.
- 핸들링 자동 테스트를 만들려면 `playerVehicleController`가 Phaser에 강하게 묶이면 불편하다.
- 그래서 차량 물리/속도/조향 계산은 순수 TypeScript에 가깝게 분리했다.

짧은 코드 예시는 `PlayerVehicleControllerConfig` 일부만 보여주면 된다.

```ts
export type PlayerVehicleControllerConfig = {
    accelSpeed: number;
    engineAcceleration: number;
    highSpeedSteerForceDrop: number;
    highSpeedSteerVisualDrop: number;
    curveDriftAcceleration: number;
    curveSteeringCue: number;
};
```

### 3. 화면 비율을 고정했다

핸들링 감각이 화면 비율에 따라 달라지는 문제가 있었다.

변경 방향:

```text
logical size: 1200 x 760
Phaser scale mode: FIT
```

글 포인트:

- pseudo-3D 레이싱은 horizon, 차량 anchor, road width, FOV 관계가 중요하다.
- 화면 비율이 매번 바뀌면 같은 speed/curve라도 감각이 달라진다.
- 그래서 먼저 논리 화면을 고정하고, 브라우저는 그 비율을 맞춰 스케일하게 했다.

### 4. WebGL로 바꾸고 shadow/speed cue를 다시 봤다

이전 글에서는 Canvas 단계에서도 silhouette shadow를 붙였다.

이번에는 renderer를 WebGL로 바꾸고, 속도감 연출을 shader로도 실험했다.

속도 cue:

```text
camera FOV speed bonus: 3.5
speed effect min ratio: 0.42
speed effect max alpha: 0.88
shader depth: road above / car shadow below
```

글 포인트:

- 차량을 zoom-in하는 방식은 보류했다.
- 고속에서 카메라 자체를 확대하면 도로 읽기가 답답해지고, 차량 anchor가 무거워질 수 있다.
- 대신 FOV를 약간 넓히고, 도로 하단/shoulder 쪽 streak shader로 속도감을 보강했다.
- shader는 HUD와 차량을 덮지 않도록 depth와 alpha를 조심해야 했다.

### 5. speed 700은 700km/h가 아니었다

이번 글에서 독자에게 꼭 풀어줘야 하는 부분이다.

내부 `speed`는 실제 km/h가 아니라 road z 진행량이다.

현재 표시 기준:

```text
760u = 200 km/h
700u = 184 km/h
440u = 116 km/h
```

글 포인트:

- 다운힐 공도 감각이라면 200km/h를 크게 넘는 표시는 어색하다.
- 그래서 최고 표시 속도는 `200 km/h`로 두고, 실제 속도감은 road flow, roadside object, FOV, shader cue로 만든다.
- HUD에는 표시용 km/h와 내부 unit을 같이 보여 디버깅한다.

예시 문장:

> 이 프로젝트에서 `speed 700`은 `700km/h`가 아니다. 도로 z를 얼마나 빨리 밀고 있는지를 나타내는 내부 단위다. 플레이어에게 보이는 속도는 별도의 표시 기준으로 환산해야 했다.

### 6. 정지 출발은 full throttle이 아니어야 했다

정지 상태에서 가속할 때 어색했던 이유는 최고속보다 launch 구간에 있었다.

적용값:

```text
engineAcceleration: 170
launchThrottleMinRatio: 0.30
launchThrottleFullSpeedRatio: 0.38
0-100 km/h display simulation: about 5.0s
```

글 포인트:

- 내부 엔진 가속을 그대로 주면 출발 순간이 너무 튈 수 있다.
- 하지만 엔진 가속을 낮추면 고속 추진감이 죽는다.
- 그래서 저속 구간에서는 throttle force를 낮게 시작하고, 일정 speed ratio 이후 full throttle에 가까워지게 했다.

### 7. OutRun식 기준을 문서로 먼저 세웠다

핸들링 수정 전에 `docs/apex-seoul-handling-outrun-review.md`를 작성했다.

핵심 기준:

```text
1. 화면 하단 차량은 안정적인 기준점이어야 한다.
2. grip 조향은 빠르지만 과장되지 않아야 한다.
3. 도로 커브가 차를 밀어야 하지만 조작권을 빼앗으면 안 된다.
4. 코너 감속은 벌점처럼 느껴지면 안 된다.
5. 속도감은 수치보다 도로 흐름과 FOV가 먼저다.
```

글 포인트:

- OutRun을 복제하겠다는 뜻은 아니다.
- 원본 sprite나 물리값이 아니라 감각 구조를 참고한다.
- 기본 grip에서 강한 yaw를 쓰면 드리프트처럼 보인다.
- 강한 pose는 나중에 drift/slip 상태가 생겼을 때 열어야 한다.

### 8. 자동 반복 테스트를 만들었다

이번 글의 핵심이다.

추가한 script:

```text
scripts/simulate-handling-matrix.mjs
scripts/run-handling-matrix.mjs
scripts/capture-drive-telemetry.mjs
scripts/analyze-drive-telemetry.mjs
```

명령:

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:handling-matrix --workspace @games/apex-seoul
```

글 포인트:

- `qa:handling-sim`은 브라우저 없이 `playerVehicleController`만 직접 돌린다.
- 렌더링은 못 보지만 속도/조향/커브 force 후보를 빠르게 비교할 수 있다.
- `qa:handling-matrix`는 Playwright 기반 브라우저 runner다.
- 현재 환경에서는 브라우저 의존성 이슈가 있어, 1차 필터는 simulation을 신뢰한다.

### 9. 자동 테스트 시나리오

시나리오는 사람이 실제로 느끼는 애매함을 작게 쪼갠 것이다.

```text
standing-start-12s
straight-accel-20s
micro-tap-left
hold-left-1s-release
left-hold-3s-release
slalom-20s
curve-no-input
curve-counter-steer
```

지표:

```text
speedGain
timeTo100Kmh
lateralOffsetMaxAbs
slalomOffsetRms
steeringPeakHoldRatio
highSpeedSteeringMaxAbs
highSpeedCurveSteeringMaxAbs
curveCounterSteerRecoveryMs
```

글 포인트:

- 좋은 핸들링을 자동으로 증명할 수는 없다.
- 대신 이상한 후보를 빠르게 탈락시키고, 사람이 볼 후보를 줄일 수 있다.
- `micro-tap-left`가 특히 중요하다. 짧게 톡 눌렀을 때 너무 많이 움직이면 불안하고, 전혀 반응하지 않으면 둔하다.

### 10. 실제로 적용한 핸들링 튜닝

1차 적용:

```text
curveDriftAcceleration: 260 -> 160
curveSteeringCue: 0.10 -> 0.06
cornerAccelSpeedDrop: 150 -> 100
cornerSpeedPull: 190 -> 120
engineAcceleration: 128 -> 170
steeringVelocityCue: 0.38 -> 0.25
highSpeedSteerVisualDrop: 0.34 -> 0.25
steerWeak: 0.18 -> 0.16
```

2차 적용:

```text
inputResponse: 16 -> 18
steeringVelocityCue: 0.25 -> 0.20
steerWeak: 0.16 -> 0.14
steerAcceleration: 1750 -> 1650
centeringResponse: 1.9 -> 1.75
```

3차 적용:

```text
highSpeedSteerVisualDrop: 0.25 -> 0.38
curveSteeringHighSpeedDrop: 0.00 -> 0.38
curveSteeringCue: 0.06 유지
```

글 포인트:

- 수치를 나열하기보다 각 단계의 의도를 설명한다.
- 1차는 커브가 차를 빼앗는 느낌과 코너 벌점감을 줄이는 작업.
- 2차는 조향 pose와 lateral movement 관계를 정리하는 작업.
- 3차는 고속 grip 상태에서 차체 yaw를 줄이고, drift pose를 미래 상태로 남기는 작업.

### 11. 고속 grip 각도를 줄였다

이번 글에서 가장 좋은 서사 포인트다.

문제:

```text
고속에서 차는 덜 돌아야 하는데, visual pose는 아직 크게 틀어져 보였다.
```

기존 구조:

```text
steerForceRatio = highSpeedSteerForceDrop 0.42
steerVisualRatio = highSpeedSteerVisualDrop 0.25
curve visual cue = currentCurve * speedRatio * curveSteeringCue
```

해석:

- 실제 조향 힘은 최고속에서 약 `58%`까지 줄어든다.
- 하지만 visual pose는 약 `75%`까지밖에 줄지 않았다.
- 커브 cue는 오히려 speedRatio에 비례해서 커졌다.

적용 후:

```text
highSpeedSteerVisualDrop: 0.38
curveSteeringHighSpeedDrop: 0.38
```

로그:

```text
previous-grip-angle score: 97.0
baseline score: 96.9
extra-grip-angle-damping score: 96.5

left-hold-3s highSpeedSteeringMaxAbs:
0.790 -> 0.674

curve-no-input highSpeedCurveSteeringMaxAbs:
0.035 -> 0.022
```

글 포인트:

- 물리 lateralOffset은 유지하면서, 고속에서 보이는 차체 각도만 줄였다.
- `0.45`까지 누르면 더 얌전하지만 pose가 죽을 위험이 있어 보류했다.
- 이 결정은 OutRun식 grip/drift 역할 분리에 맞다.

예시 문장:

> 고속 grip 상태에서 차체 yaw가 커지면 플레이어는 "잘 돌고 있다"보다 "이미 미끄러지고 있다"로 읽을 가능성이 크다. 그래서 큰 yaw pose는 지금 쓰지 않고, 나중에 drift/slip 상태를 만들 때 남겨두기로 했다.

### 12. 아직 자동 테스트가 못 보는 것

좋은 마무리를 위해 한계를 적는다.

자동 simulation이 보는 것:

- 속도 변화
- lateral offset
- steering 값
- curve force
- 후보 간 상대 점수

자동 simulation이 아직 못 보는 것:

- road object flow
- shader speed cue의 실제 화면 느낌
- 차량 sprite frame의 시각적 무게
- shadow와 pose가 같이 읽히는지
- 손으로 조작할 때의 심리적 반응

글 포인트:

- 자동화는 감각을 대체하지 않는다.
- 자동화는 반복 비교 비용을 줄이고, 사람이 볼 후보를 줄인다.

## 이미지 / 캡처 후보

### 필수

1. 현재 Apex Seoul 주행 화면
   - WebGL + shader speed cue + G70 + road object가 보이는 화면
   - 후보 경로: `/images/posts/202607/apex-seoul-handling-speed-cue.png`

2. handling simulation log 요약 이미지
   - 터미널 출력 또는 직접 만든 간단한 표 이미지
   - 후보 경로: `/images/posts/202607/apex-seoul-handling-sim-log.png`

3. 고속 grip angle before/after 비교
   - `previous-grip-angle` vs `baseline`
   - 같은 속도, 같은 조향, 같은 z에서 frozen screenshot 비교
   - 후보 경로: `/images/posts/202607/apex-seoul-high-speed-grip-angle-before-after.png`

### 있으면 좋은 것

4. speed display HUD
   - `km/h`와 내부 `u`가 같이 보이는 장면

5. shader streak close-up
   - 너무 강하면 이미지로는 과장되어 보일 수 있으니 작은 캡처만 사용

6. OutRun식 기준 다이어그램
   - grip yaw는 작게, drift yaw는 크게 쓰는 개념도
   - 직접 SVG를 새로 그리기보다는 게임 screenshot 위에 간단한 주석을 얹는 쪽이 좋다.

## 코드 조각 후보

### 속도 표시

```ts
private getPlayerSpeedKmh() {
    return (this.playerVehicle.speed / PLAYER_ACCEL_SPEED) * PLAYER_SPEED_DISPLAY_MAX_KMH;
}
```

### 고속 grip angle 억제

```ts
const steerVisualRatio = getHighSpeedSteeringRatio(
    speedRatio,
    config.highSpeedSteerVisualDrop,
);
const curveVisualRatio = getHighSpeedSteeringRatio(
    speedRatio,
    config.curveSteeringHighSpeedDrop,
);
```

### 자동 시뮬레이션 후보

```js
const candidates = [
    { id: 'previous-grip-angle', patch: { curveSteeringHighSpeedDrop: 0, highSpeedSteerVisualDrop: 0.25 } },
    { id: 'baseline', patch: {} },
    { id: 'extra-grip-angle-damping', patch: { curveSteeringHighSpeedDrop: 0.45, highSpeedSteerVisualDrop: 0.45 } },
];
```

## 글에서 피해야 할 것

- OutRun을 정확히 재현했다고 말하지 않는다.
- `speed` 내부 unit을 실제 km/h처럼 단정하지 않는다.
- simulation score가 절대적인 재미 점수처럼 보이지 않게 한다.
- "자동화로 핸들링을 완성했다"가 아니라 "이상한 후보를 줄였다"로 표현한다.
- G70이 최종 공개 차량이라는 인상을 주지 않는다.

## 마무리 방향

이번 글의 결론은 다음 문장으로 잡으면 좋다.

> 차량이 도로에 붙어 보이는 것과, 달릴 때 믿을 수 있는 것은 다른 문제였다. 이번에는 그 감각을 OutRun식 grip 기준으로 쪼개고, 자동 simulation으로 반복 비교할 수 있게 만들었다. 아직 최종 핸들링은 아니지만, 이제 "이상한 느낌"을 다시 같은 조건으로 불러와 비교할 수 있다.

다음 글 예고:

- `curveDriftAcceleration: 160 -> 130` 후보를 실제 브라우저 화면에서 비교
- road object flow와 shader speed cue 조정
- drift/slip 상태를 만들고 강한 yaw pose 열기
- 브라우저 matrix runner를 screenshot/video regression까지 확장

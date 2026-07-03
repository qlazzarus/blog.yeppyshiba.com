# Apex Seoul Handling OutRun Review

이 문서는 Apex Seoul의 현재 주행/핸들링 감각을 바로 수정하기 전에, 현재 코드가 어떤 모델인지 정리하고 OutRun 계열 pseudo-3D 아케이드 레이싱 감각 기준으로 비교하기 위한 작업 노트다.

목표는 OutRun을 복제하는 것이 아니다. 문서와 코드에서 이미 정리한 것처럼 직접 참고하는 것은 원본 sprite나 물리값이 아니라, 화면 하단 차량의 안정성, 도로 원근으로 커브를 전달하는 방식, 약한 grip 조향과 강한 drift/slip pose의 역할 분리다.

## 현재 코드 기준

### 렌더링 / 화면

- 논리 화면은 `1200 x 760` 고정이다.
- Phaser scale mode는 `FIT`이다.
- renderer는 `Phaser.WEBGL`이다.
- 차량은 화면 하단 fixed contact plane 근처에 있고, 실제 `projectGroundPoint(contactZ)`의 y를 직접 따라가지 않는다.
- 차량 크기는 `vehicleViewportRatio = 0.34`, `vehicleMinSize = 220`, `vehicleMaxSize = 360` 기준이다.
- 기본 FOV는 `69`, 속도에 따라 `+3.5`까지 보정된다.

### 속도 모델

현재 속도는 다음 힘을 합산해 갱신한다.

```text
engine force
+ slope acceleration
- brake
- engine brake
- rolling resistance
- aero drag
- corner limit force
```

주요 값:

```text
cruise speed: 440
max accel speed: 760
engine acceleration: 170
braking: 330
engine brake: 26
rolling resistance: 14
aero drag: 0.00012
gravity acceleration: 360
max slope acceleration: 115
slope sample distance: 720
```

`speed`는 실제 km/h가 아니라 road z를 진행시키는 내부 world unit/sec다. 디버그 HUD에서는 내부 단위와 표시용 km/h를 분리해서 본다.

현재 표시 기준:

```text
760u = 200 km/h
700u = 184 km/h
440u = 116 km/h
```

따라서 화면에서 보이는 `speed 700`대는 실제 km/h가 아니라 최고속 근처의 내부 진행량이다. 플레이어에게 보여줄 속도감은 약 `180 km/h`대로 보는 편이 맞다. 다운힐 공도 감각을 위해 표시 속도는 과장하지 않고, 실제 속도감은 도로/오브젝트/FOV cue로 만든다.

현재 모델은 시뮬레이션보다는 감각용 아케이드 모델이다. 다만 엔진 가속이 낮고 저항/경사/코너 감속이 함께 들어가기 때문에, 입력 대비 속도 반응이 둔하거나 "밀고 나간다"보다 "서서히 깎인다" 쪽으로 느껴질 수 있다.

### 조향 모델

조향은 `steeringVelocity`와 `lateralOffset`을 가진 2차 반응 모델이다.

```text
steering force
+ centering force
+ curve force
+ damping force
```

주요 값:

```text
steer acceleration: 1650
steer damping: 9.2
centering response: 1.75
max road offset: 700
input response: 18
curve drift acceleration: 160
curve steering cue: 0.06
curve steering high speed drop: 0.38
steering velocity cue: 0.20
high speed steer force drop: 0.42
high speed visual steer drop: 0.38
```

현재 조향은 입력을 누르면 즉시 `visual steering`이 바뀌는 단순 모델이 아니라, lateral velocity와 커브 cue를 섞는다. 이 때문에 sprite는 움직이는데 차의 위치 이동이 늦거나, 반대로 도로 커브가 차를 미는 것처럼 느껴질 수 있다.

### 커브 감속

커브 강도는 `abs(curve) / 0.72`로 계산한다.

```text
corner accel speed drop: 100
corner speed pull: 120
```

강한 커브에서는 최고 가속 속도 상한이 낮아지고, 현재 속도가 그 상한보다 높으면 추가 감속 force가 들어간다. 이 감속은 drift 판정이 아니라 pseudo-3D 도로 움직임과 차량 anchor가 분리되어 보이지 않게 하는 가독성 보정이다.

### 차량 pose

기본 grip 주행은 3way다.

```text
steer-left-1
center
steer-right-1
```

`steer-left-2`, `steer-right-2`는 아직 drift/slip 후보로 남겨둔다. 현재 grip 상태에서 강한 yaw pose를 열면 차량이 코너를 도는 것이 아니라 이미 미끄러지는 것처럼 보일 가능성이 크다.

## OutRun식 비교 기준

### 1. 화면 하단 차량은 안정적인 기준점이어야 한다

OutRun 계열 pseudo-3D 감각에서는 플레이어 차량이 화면 하단 기준을 잃지 않는 것이 중요하다. 도로가 휘고 고저차가 변해도, 차량이 카메라/도로에 끌려다니는 물체처럼 보이면 조작 기준점이 흔들린다.

현재 Apex Seoul은 이 기준을 대체로 따른다.

- 차량 y는 fixed contact plane 기준이다.
- 고저차는 큰 y 이동보다 pose, shadow, camera pitch, terrain scale로 읽힌다.
- `contactZ`는 x/curve/lateral sampling에 쓰고, y projection에는 직접 묶지 않는다.

검토할 점:

- `PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT = 18`이 실제 주행 중에도 충분히 작게 느껴지는가.
- 내리막에서 차량은 고정되어 있는데 도로만 빠지는 느낌이 남는가.
- shadow가 차량 기준선보다 늦거나 앞서 보이는가.

### 2. Grip 조향은 빠르지만 과장되지 않아야 한다

OutRun식 기본 주행에서는 차량이 좌우로 즉각 반응하되, 기본 grip 상태에서 강한 drift pose처럼 보이면 안 된다.

현재 Apex Seoul은 3way pose를 쓰는 점은 방향이 맞다.

검토할 점:

- `steerWeak = 0.14` 때문에 좌우 pose 전환이 너무 늦거나 빠르지 않은가.
- `visual steering`에 lateral velocity cue가 섞이면서, 입력을 놓은 뒤에도 차가 불필요하게 기울어 보이지 않는가.
- 고속 조향 감소가 너무 강해져 최고속에서 차가 둔하게 느껴지지 않는가.

비교 후보:

```text
steerWeak: 0.12 / 0.16 / 0.18 / 0.22
highSpeedSteerForceDrop: 0.25 / 0.34 / 0.42
highSpeedSteerVisualDrop: 0.25 / 0.38 / 0.45
steeringVelocityCue: 0.20 / 0.30 / 0.38
```

### 3. 도로 커브가 차를 밀어야 하지만 차를 빼앗으면 안 된다

현재 `curveForce = -curve * speedRatio * 260`이 lateral physics에 들어가고, `curveCarBias = 8`이 screen x에도 들어간다. 이 둘은 모두 OutRun식 원심감 cue로 볼 수 있다.

검토할 점:

- 커브에서 차가 운전자 입력보다 도로에 끌려가는 느낌이 드는가.
- `curveForce`와 `curveCarBias`가 같은 방향으로 과하게 누적되는가.
- 코너에서 중앙선을 기준으로 차가 안정적으로 읽히는가.

비교 후보:

```text
curveDriftAcceleration: 120 / 180 / 260
curveSteeringCue: 0.04 / 0.07 / 0.10
curveCarBias: 0 / 8 / 16 / 24
```

첫 검토는 `curveForce`를 낮추고 `curveCarBias`는 약하게 남기는 쪽이 좋다. 물리 lateral offset을 크게 밀기보다, 화면상 도로가 휘는 동안 작은 시각 cue만 주는 편이 OutRun식 grip 감각에 가깝다.

### 4. 코너 감속은 조작 보정이지 벌점처럼 느껴지면 안 된다

현재 강한 커브에서는 최고속 상한을 최대 150 낮추고, 초과분에 대해 pull force를 준다. 이 값이 크면 코너에서 차가 갑자기 죽는 느낌이 날 수 있다.

검토할 점:

- 커브 진입 때 속도 감소가 "라인을 잡는다"로 느껴지는가, "엔진이 꺼진다"로 느껴지는가.
- throttle을 누르고 있는데도 차가 너무 쉽게 눌리는가.
- 내리막 slope acceleration과 corner limit force가 서로 싸우는 구간이 있는가.

비교 후보:

```text
cornerAccelSpeedDrop: 80 / 120 / 150
cornerSpeedPull: 90 / 140 / 190
```

### 5. 속도감은 수치보다 도로 흐름과 FOV가 먼저다

현재 최고속은 760이고 기본 cruise는 440이다. 하지만 체감 속도는 road segment flow, FOV, horizon, side object, 차량 shadow가 함께 만든다.

검토할 점:

- acceleration이 너무 느려 최고속까지 가는 과정이 지루한가.
- max speed가 충분해도 도로 흐름이 덜 빠르게 보이는가.
- roadside object가 들어온 뒤 속도감이 개선됐는가.
- FOV bonus가 너무 작아 고속감이 약한가.

비교 후보:

```text
engineAcceleration: 128 / 170 / 220
cruiseSpeed: 420 / 440 / 480
accelSpeed: 760 / 820 / 880
fovBonus: 2.4 / 3.5 / 5.0
```

단, FOV로만 속도감을 올리면 도로가 늘어지고 차량 anchor가 불안정해질 수 있다. 먼저 roadside object flow와 road strip 속도가 읽히는지 봐야 한다.

## 현재 이상하게 느껴질 수 있는 원인 후보

1. `curveForce`가 물리 lateral offset을 너무 적극적으로 건드린다.
2. `cornerSpeedPull`이 커브에서 속도를 벌점처럼 깎는다.
3. `engineAcceleration = 170`과 launch throttle 보정의 조합이 정지 출발에서 아직 덜 자연스러울 수 있다.
4. `steeringVelocityCue = 0.20`이 낮아지면서 입력 해제 후 pose는 안정됐지만, 반대로 차체 관성감이 너무 적을 수 있다.
5. `highSpeedSteerForceDrop = 0.42`가 고속에서 조향을 둔하게 만든다.
6. 차량은 안정적으로 두었지만, 도로/horizon/background 쪽 speed cue가 아직 부족하다.

## 먼저 볼 QA 시나리오

기준 viewport는 `1200 x 760`으로 고정한다.

### 직선 주행 입력 반응

```text
/game-assets/apex-seoul/?qaFreeze=1&qaZ=1200&qaSpeed=440&qaSteer=0
/game-assets/apex-seoul/?qaFreeze=1&qaZ=1200&qaSpeed=440&qaSteer=-1
/game-assets/apex-seoul/?qaFreeze=1&qaZ=1200&qaSpeed=440&qaSteer=1
```

확인:

- center, left, right 3way가 충분히 읽히는가.
- 같은 anchor/baseline 위에 있는가.
- shadow가 조향 frame과 같이 움직이는가.

### 커브 고정 비교

```text
/game-assets/apex-seoul/?qaFreeze=1&qaZ=6500&qaSpeed=520&qaSteer=0&curveCarBias=0
/game-assets/apex-seoul/?qaFreeze=1&qaZ=6500&qaSpeed=520&qaSteer=0&curveCarBias=8
/game-assets/apex-seoul/?qaFreeze=1&qaZ=6500&qaSpeed=520&qaSteer=0&curveCarBias=24
```

확인:

- curve bias가 없는 화면이 너무 죽어 보이는가.
- curve bias가 큰 화면에서 차가 도로에서 밀려난 것처럼 보이는가.

### 실제 주행 telemetry

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

분석:

```bash
npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>
```

확인할 값:

- `speed`
- `rpm`
- `slopeAcceleration`
- `road.currentCurve`
- `player.lateralOffset`
- `player.steering`
- `vehicle.anchor.x`
- `vehicle.anchor.y`
- `vehicle.frame`

## 튜닝 실험 순서

### 1단계: 커브가 차를 빼앗는지 확인

먼저 `curveDriftAcceleration`과 `curveCarBias`를 분리해서 본다.

권장 방향:

```text
curveDriftAcceleration: 260 -> 160 근처
curveCarBias: 8 유지 또는 16까지 비교
curveSteeringCue: 0.10 -> 0.06 근처
```

판정:

- 조향 입력 없이 커브에 들어갈 때 차가 바깥으로 아주 약하게 밀리는 정도는 허용한다.
- 사용자가 반대로 조향할 때 차가 말을 듣지 않는 느낌이면 실패다.

### 2단계: 코너 감속이 벌점처럼 느껴지는지 확인

권장 방향:

```text
cornerAccelSpeedDrop: 150 -> 100 근처
cornerSpeedPull: 190 -> 120 근처
```

판정:

- 코너에서 도로 흐름이 읽히되, throttle 입력을 무시하고 속도가 죽으면 실패다.

### 3단계: 입력 추진감 보정

권장 방향:

```text
engineAcceleration: 128 -> 170 또는 200
aeroDrag: 유지
rollingResistance: 유지
```

판정:

- 초반 가속이 "차가 깨어난다"처럼 느껴져야 한다.
- 최고속이 너무 빨리 붙으면 road object/curve read가 깨질 수 있으므로 max speed는 나중에 본다.

### 4단계: visual steering cue 정리

권장 방향:

```text
steeringVelocityCue: 0.38 -> 0.25 근처
highSpeedSteerVisualDrop: 0.34 -> 0.25 근처
steerWeak: 0.18 -> 0.14 또는 0.16 비교
```

판정:

- 입력 직후 차체 pose가 바로 읽혀야 한다.
- 입력을 놓은 뒤 차체가 필요 이상으로 오래 비틀려 있으면 실패다.
- 고속 grip 상태에서는 차체 yaw가 얕아져야 한다. 큰 yaw는 drift/slip 상태의 보상 연출로 남긴다.

## 지금 바로 코드 변경하지 않는 이유

현재 이상함이 한 가지 원인에서 오는지 확실하지 않다.

- 물리 lateral force가 과한 문제일 수 있다.
- visual steering cue가 과한 문제일 수 있다.
- 코너 감속이 벌점처럼 느껴지는 문제일 수 있다.
- 속도감 cue가 부족해서 조향이 상대적으로 어색하게 보이는 문제일 수 있다.

따라서 먼저 frozen screenshot과 60초 telemetry로 분리해서 봐야 한다. OutRun식 비교 기준은 "정확한 물리"가 아니라 "화면 하단 차량 기준이 안정적인가, 도로가 커브를 전달하는가, grip과 drift의 시각 역할이 분리되는가"다.

## 자동 반복 테스트 방향

실제 플레이 감각은 최종적으로 사람이 봐야 하지만, 매번 직접 운전하지 않고도 후보값을 많이 걸러낼 수 있다. 현재 코드에는 이미 `qaFreeze`, `telemetry`, `__apexSeoulQaState`, `capture-drive-telemetry.mjs`, `analyze-drive-telemetry.mjs`가 있으므로 이를 기반으로 자동 주행 평가 루프를 만든다.

목표는 "좋은 핸들링을 자동으로 증명"하는 것이 아니라, 이상한 후보를 자동으로 탈락시키고 사람이 확인할 후보를 2~3개로 줄이는 것이다.

### 자동화 레이어

#### 1. Frozen visual snapshot

정지된 장면을 같은 조건으로 캡처한다.

사용 예:

```text
/game-assets/apex-seoul/?qaFreeze=1&qaZ=1200&qaSpeed=440&qaSteer=0
/game-assets/apex-seoul/?qaFreeze=1&qaZ=6500&qaSpeed=520&qaSteer=0&curveCarBias=8
```

자동 확인:

- canvas가 비어 있지 않은가.
- viewport가 항상 `1200 x 760` 논리 비율로 잡히는가.
- 차량 anchor y가 기준 범위 안에 있는가.
- curve bias 변경 시 차량 x가 과하게 밀리지 않는가.
- road object가 특정 z에서 보이는가.

이 레이어는 렌더링 regression과 비율 문제를 잡는다. 핸들링 자체를 평가하지는 않는다.

#### 2. Scripted input drive

Playwright로 브라우저를 열고 키 입력을 자동으로 넣는다.

필요한 시나리오:

```text
straight-accel-20s
left-hold-3s-release
right-hold-3s-release
slalom-40s
curve-no-input
curve-counter-steer
brake-on-curve
```

각 시나리오는 다음처럼 고정된 입력 타임라인을 가진다.

```text
0.0s  ArrowUp down
3.0s  ArrowLeft down
6.0s  ArrowLeft up
12.0s ArrowRight down
15.0s ArrowRight up
20.0s ArrowUp up
```

자동 확인:

- 입력 후 `player.steering` 반응 시간이 너무 늦지 않은가.
- 입력을 놓은 뒤 steering이 너무 오래 남지 않는가.
- `player.lateralOffset`이 maxRoadOffset에 자주 붙지 않는가.
- 커브에서 무입력 상태로 차량이 과하게 밀리지 않는가.
- 반대 조향 시 lateralOffset 회복이 가능한가.
- 속도가 커브에서 벌점처럼 급락하지 않는가.

이 레이어가 현재 가장 필요하다. 지금 있는 `capture-drive-telemetry.mjs`는 샘플링은 가능하지만, 아직 입력 타임라인을 주입하는 runner로 확장되어 있지는 않다.

#### 3. Telemetry scoring

`__apexSeoulQaState`를 sampleHz 10~20으로 수집하고 요약 점수를 만든다.

핵심 지표:

```text
speed.min / speed.max / speed.avg
speedDropOnCurve
steeringResponseMs
steeringRecoveryMs
lateralOffset.maxAbs
lateralOffsetRms
offsetClampHitCount
curveNoInputDriftMax
counterSteerRecoveryMs
vehicleY.maxDeltaSameViewport
frameSwitchCount
```

초기 threshold 후보:

```text
vehicleY.maxDeltaSameViewport <= 8
offsetClampHitCount == 0
steeringResponseMs <= 250
steeringRecoveryMs <= 500
curveNoInputDriftMax <= 260
counterSteerRecoveryMs <= 1200
speedDropOnCurve <= 110
```

이 값은 확정 기준이 아니라 첫 알람 기준이다. 실패한 후보는 자동 탈락시키고, 통과한 후보만 screenshot/video로 사람이 본다.

#### 4. Tuning matrix runner

문서의 비교 후보를 URL query로 넘겨 자동 반복한다.

첫 matrix:

```text
curveCarBias: 8 / 16
steerWeak: 0.14 / 0.16 / 0.18
fovBonus: 2.4 / 3.5
```

아직 query로 열리지 않는 값:

```text
curveDriftAcceleration
curveSteeringCue
cornerAccelSpeedDrop
cornerSpeedPull
engineAcceleration
steeringVelocityCue
highSpeedSteerForceDrop
highSpeedSteerVisualDrop
```

자동 튜닝을 제대로 하려면 위 값들도 `runtimeConfig.ts`에서 query override로 열어야 한다. 그러면 코드 상수를 매번 수정하지 않고 다음처럼 비교할 수 있다.

```text
/game-assets/apex-seoul/?curveDrift=160&cornerPull=120&engineAccel=170&steeringCue=0.25
```

#### 5. Report artifact

자동 주행 1회는 다음 산출물을 만든다.

```text
assets/telemetry/generated/drive-logs/<session>.jsonl
assets/telemetry/generated/drive-logs/<session>.summary.json
assets/telemetry/generated/drive-logs/<session>.score.json
assets/telemetry/generated/drive-logs/<session>.png
```

matrix 실행은 마지막에 랭킹을 만든다.

```text
assets/telemetry/generated/drive-logs/apex-seoul-handling-matrix-<date>.json
```

랭킹은 절대 점수가 아니라 비교용이다.

```text
pass/fail
totalScore
handlingScore
speedScore
stabilityScore
notes
query
scenario
```

### 구현 순서

1. `capture-drive-telemetry.mjs`에 scripted input timeline 옵션을 추가한다.
2. `analyze-drive-telemetry.mjs`에 handling score 계산을 추가한다.
3. `runtimeConfig.ts`에 핸들링 주요 상수 query override를 추가한다.
4. `scripts/run-handling-matrix.mjs`를 추가해 후보값 조합을 반복 실행한다.
5. 통과 후보만 screenshot/video를 남기도록 한다.

### 첫 자동화 목표

처음부터 완전한 AI 플레이어를 만들 필요는 없다. 첫 목표는 다음 3개만 자동으로 반복하는 것이다.

```text
straight-accel-20s
left-hold-3s-release
curve-no-input
```

이 3개가 있으면 현재 의심 지점인 추진감, 조향 응답, 커브가 차를 빼앗는 문제를 먼저 분리할 수 있다.

### 2026-07-03 구현 상태

자동 반복 테스트는 두 갈래로 둔다.

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:handling-matrix --workspace @games/apex-seoul -- --browser "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

`qa:handling-sim`은 브라우저 없이 `playerVehicleController`만 직접 돌리는 빠른 1차 필터다. 렌더링, road object, frame pose까지 보지는 못하지만, 속도/조향/커브 force 후보를 반복 비교하기 좋다.

`qa:handling-matrix`는 Playwright 기반 브라우저 runner다. 현재 WSL 환경에서는 기본 Playwright Chromium이 `libnspr4` 누락으로 뜨지 않았고, Windows Edge CDP 연결도 환경에 따라 막힐 수 있다. 따라서 지금은 `qa:handling-sim`을 신뢰 가능한 1차 루프로 쓰고, 브라우저 matrix는 환경 정리 후 visual regression용으로 사용한다.

첫 시뮬레이션 결과:

```text
previous baseline: 93.0
new baseline: 99.5
```

적용한 1차 개선값:

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

정지 출발 보정:

```text
speed display: 760u = 200 km/h
fovBonus: 2.4 -> 3.5
launchThrottleMinRatio: 1.00 -> 0.30
launchThrottleFullSpeedRatio: 0.05 -> 0.38
0-100 km/h display simulation: about 5.0s
12s standing-start display speed: about 193 km/h
```

정지 출발에서 기존 `engineAcceleration`을 그대로 주면 표시 속도 기준 가속이 너무 급하게 느껴졌다. 저속 구간에서는 throttle force를 낮게 시작하고, 약 `0.38 * accelSpeed`까지 부드럽게 full throttle로 올라가게 했다. 고속 가속력은 유지하고, 출발 순간의 튀는 감각만 줄이는 의도다.

카메라 연출은 지속적인 zoom-in이 아니라 고속에서 FOV가 조금 넓어지는 방향으로 둔다. 차량을 크게 확대하면 도로 읽기가 답답해지고 조작 기준점이 무거워질 수 있으므로, 속도감은 표시 최고속을 낮춘 대신 road flow와 FOV bonus로 보강한다.

Shader speed cue:

```text
Phaser.GameObjects.Shader overlay
speedEffectMinRatio: 0.42
speedEffectMaxAlpha: 0.88
speedEffectTimeScale: 1.7
depth: below car shadow / above road graphics
```

고속에서만 도로 하단과 shoulder 쪽에 얇은 radial streak를 더한다. 전체 화면 blur나 지속 zoom-in은 쓰지 않는다. 차량과 HUD를 덮지 않게 player shadow보다 낮은 depth에 두고, 실제 road/world speed는 그대로 유지한다.

2차 후보인 `even-less-curve-force`, `even-less-corner-pull`, `stronger-engine`, `cleaner-visual-steer-plus`, `combined-second-pass`는 기존 점수식에서 모두 `99.5` 근처로 동률이었다. expanded 지표 추가 후에는 `even-less-curve-force`가 아주 근소하게 앞서지만, 커브 원심감이 약해질 수 있어 다음 반복 후보로 남긴다.

## 다음 핸들링 개선안

속도감은 후속 작업으로 미루고, 다음 반복은 핸들링 감각을 세분화해서 본다. 현재 expanded `qa:handling-sim` 결과는 baseline이 `97.0`이고, 이전 lateral weight 후보는 `96.8`이다. 즉, 단순 수치상으로는 큰 결함이 없으며, 다음 개선은 자동 점수보다 사람이 느끼는 조작 질감을 더 잘 잡는 방향이어야 한다.

현재 기준 metric:

```text
expanded baseline total score: 97.0
micro-tap-left lateralOffsetMaxAbs: 22.871
hold-left-1s-release lateralOffsetMaxAbs: 100.256
left-hold-3s-release lateralOffsetMaxAbs: 246.975
left-hold-3s-release steeringMaxAbs: 0.790
slalom-20s lateralOffsetMaxAbs: 132.854
curve-no-input lateralOffsetMaxAbs: 51.145
curve-counter-steer lateralOffsetMaxAbs: 248.835
```

해석:

- `curve-no-input`은 이미 크게 안정적이다. 커브가 차를 과하게 빼앗는 문제는 1차 개선으로 많이 줄었다.
- `left-hold-3s-release`에서 lateral offset은 이전 baseline보다 줄었다. 실제 플레이에서 lane 기준을 잃는 느낌이 줄어드는지 확인한다.
- `micro-tap-left`는 약 `23u`로 작게 반응한다. 짧은 탭이 무시되지 않으면서도 과하게 차선을 먹지 않는지 확인한다.
- `curve-counter-steer`는 expanded 기준에서 실패하지 않는다. 다만 지표가 아직 섬세하지 않으므로 브라우저 telemetry 또는 영상 확인이 필요하다.

### 개선 목표

다음 목표는 더 빠른 차가 아니라, 더 믿을 수 있는 차다.

```text
1. 입력 시작: 즉각 읽히되 튀지 않게
2. 입력 유지: lane 이동량이 예측 가능하게
3. 입력 해제: 급히 스냅백하지 않고 자연스럽게 중앙 복귀
4. 커브 진입: 도로가 미는 느낌은 남기되 조작권은 빼앗지 않게
5. pose: grip pose와 drift/slip 후보 pose를 명확히 분리
```

### 다음 실험 후보

#### A. 조향 force를 줄이고 centering을 살짝 늦추는 후보

목적은 좌우 hold 시 lateral offset이 너무 쉽게 커지는지 확인하는 것이다.

```text
steerAcceleration: 1750 -> 1550 / 1650
centeringResponse: 1.9 -> 1.65 / 1.75
steerDamping: 9.2 유지 또는 8.6
```

기대:

- lane 이동이 조금 더 묵직해진다.
- 입력을 누른 순간 sprite pose는 읽히되, 실제 lateralOffset은 더 예측 가능해진다.

위험:

- 너무 줄이면 고속에서 차가 말을 안 듣는 느낌이 난다.
- 현재 `highSpeedSteerForceDrop = 0.42`와 겹치면 최고속 조향이 둔해질 수 있다.

#### B. 시각 pose 반응과 물리 이동을 분리하는 후보

목적은 조향 입력은 즉시 읽히되 실제 차 위치 이동은 조금 더 무게감 있게 만드는 것이다.

```text
inputResponse: 16 -> 18 / 20
steeringVelocityCue: 0.25 -> 0.18 / 0.22
highSpeedSteerVisualDrop: 0.25 유지
steerWeak: 0.16 유지 또는 0.14
```

기대:

- 입력 직후 pose는 더 선명하다.
- lateral velocity cue가 줄어들어 입력 해제 후 차체가 불필요하게 비틀려 보이는 문제를 줄인다.

위험:

- pose만 빠르고 차량 위치가 늦으면 조작과 화면이 분리된 느낌이 날 수 있다.

#### C. 고속 조향 감소를 완화하는 후보

목적은 표시 속도는 낮췄지만 내부 고속에서는 조향 감소가 아직 강하게 느껴지는지 확인하는 것이다.

```text
highSpeedSteerForceDrop: 0.42 -> 0.34 / 0.38
highSpeedSteerVisualDrop: 0.25 유지
```

기대:

- 최고속에서도 반응성이 조금 살아난다.
- 다운힐 고속 구간에서 "차가 무겁다"보다 "잡고 간다"에 가까워질 수 있다.

위험:

- lateralOffset이 다시 커질 수 있다.
- curveForce와 합쳐져 코너에서 차가 가볍게 날리는 느낌이 생길 수 있다.

#### D. 커브 자동 밀림을 더 줄이는 후보

현재 metric상 커브 자동 밀림은 안정적이지만, 실제 플레이에서 도로가 차를 민다고 느껴지면 마지막으로 더 줄인다.

```text
curveDriftAcceleration: 160 -> 130
curveSteeringCue: 0.06 -> 0.05
curveCarBias: 8 유지
```

기대:

- 커브에서 조작권이 더 선명해진다.
- 도로는 화면으로 휘고, 차량 물리는 덜 밀린다.

위험:

- 커브 원심감이 약해져 도로가 휘어도 차가 너무 편하게 붙어 있는 느낌이 날 수 있다.

### 우선순위

다음 구현은 B -> A -> C -> D 순서가 좋다.

```text
1. B: visual steering cue 정리
2. A: lateral movement 무게감 조정
3. C: 고속 조향 감소 완화
4. D: 커브 자동 밀림 추가 감량
```

이 순서를 추천하는 이유는, 지금 가장 애매한 부분이 "실제 물리값"보다 "보이는 pose와 lateral movement의 관계"일 가능성이 크기 때문이다. 먼저 시각 cue를 정리하고, 그 다음 lateral force를 만지는 편이 원인 분리가 쉽다.

### 자동 테스트 추가 상태

`qa:handling-sim`에 아래 metric을 추가했다.

```text
timeToLateralOffset100
timeToLateralOffset200
postReleaseOffsetOvershoot
postReleaseOffsetHalfLife
steeringPeakHoldRatio
curveCounterSteerRecoveryMs
slalomOffsetRms
```

추가 시나리오:

```text
micro-tap-left
hold-left-1s-release
left-hold-3s-release
slalom-20s
curve-counter-steer
```

특히 `micro-tap-left`는 아웃런식 조작감에 중요하다. 짧게 톡 눌렀을 때 차가 너무 많이 움직이면 불안하고, 전혀 반응하지 않으면 무겁다.

### 2026-07-03 핸들링 2차 적용

계측 후 다음 세트를 적용했다.

```text
inputResponse: 16 -> 18
steeringVelocityCue: 0.25 -> 0.20
steerWeak: 0.16 -> 0.14
steerAcceleration: 1750 -> 1650
centeringResponse: 1.9 -> 1.75
```

적용 이유:

- visual cue 후보는 물리 지표를 나쁘게 만들지 않고 입력 pose를 조금 더 선명하게 만든다.
- lateral weight 후보는 `micro-tap`, `hold`, `slalom`, `curve-counter-steer`에서 lateralOffset을 작게 유지했다.
- 적용 후 expanded simulation 기준 baseline은 `97.0`, 이전 lateral weight 후보는 `96.8`이다.

후속 후보:

```text
curveDriftAcceleration: 160 -> 130
curveSteeringCue: 0.06 -> 0.05
```

`even-less-curve-force`는 expanded score `97.1`로 baseline보다 아주 근소하게 높다. 다만 커브 원심감이 약해질 위험이 있어 바로 적용하지 않고, 다음 visual/browser 확인 또는 실제 플레이 감각 확인 뒤 결정한다.

### 2026-07-03 고속 grip 각도 억제 적용

OutRun식 grip 주행에서는 속도가 높을수록 차체 yaw가 과하게 커지면 drift처럼 읽힌다. 따라서 고속 기본 조향에서는 보이는 각도를 줄이고, 큰 yaw pose는 drift/slip 상태가 생겼을 때 쓰는 방향으로 분리한다.

적용값:

```text
highSpeedSteerVisualDrop: 0.25 -> 0.38
curveSteeringHighSpeedDrop: 0.00 -> 0.38
curveSteeringCue: 0.06 유지
```

시뮬레이션 로그:

```text
previous-grip-angle score: 97.0
baseline score: 96.9
extra-grip-angle-damping score: 96.5

left-hold-3s-release highSpeedSteeringMaxAbs:
previous-grip-angle 0.790
baseline 0.674
extra-grip-angle-damping 0.612

curve-no-input highSpeedCurveSteeringMaxAbs:
previous-grip-angle 0.035
baseline 0.022
extra-grip-angle-damping 0.020
```

해석:

- baseline은 이전 grip 각도보다 고속 차체 각도를 줄였고, lateralOffset 물리값은 유지했다.
- `extra-grip-angle-damping`은 더 얌전하지만 조향 pose가 너무 죽을 위험이 있어 보류한다.
- 다음 개선은 실제 화면에서 grip pose가 충분히 읽히는지 확인한 뒤, `curveDriftAcceleration: 160 -> 130` 후보와 비교한다.

## 결론

현재 Apex Seoul은 구조적으로 OutRun식 방향에 가까워졌다.

- 차량은 화면 하단 기준점에 고정되어 있다.
- 기본 grip pose는 3way다.
- 강한 yaw pose는 drift/slip 후보로 남겨두고 있으며, 고속 grip에서는 차체 각도를 얕게 누른다.
- 도로와 horizon, side object, shadow가 주행 감각을 나눠 맡는다.

하지만 현재 수치에서는 조향/커브/속도 감각이 서로 조금씩 간섭할 가능성이 있다. 다음 튜닝은 `curve force` 미세 감량과 실제 브라우저 화면에서의 grip pose 가독성을 분리 비교하는 쪽이 좋다.

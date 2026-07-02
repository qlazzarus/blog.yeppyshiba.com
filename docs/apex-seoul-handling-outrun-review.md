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
- 기본 FOV는 `69`, 속도에 따라 `+2.4`까지 보정된다.

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
engine acceleration: 128
braking: 330
engine brake: 26
rolling resistance: 14
aero drag: 0.00012
gravity acceleration: 360
max slope acceleration: 115
slope sample distance: 720
```

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
steer acceleration: 1750
steer damping: 9.2
centering response: 1.9
max road offset: 700
input response: 16
curve drift acceleration: 260
curve steering cue: 0.1
steering velocity cue: 0.38
high speed steer force drop: 0.42
high speed visual steer drop: 0.34
```

현재 조향은 입력을 누르면 즉시 `visual steering`이 바뀌는 단순 모델이 아니라, lateral velocity와 커브 cue를 섞는다. 이 때문에 sprite는 움직이는데 차의 위치 이동이 늦거나, 반대로 도로 커브가 차를 미는 것처럼 느껴질 수 있다.

### 커브 감속

커브 강도는 `abs(curve) / 0.72`로 계산한다.

```text
corner accel speed drop: 150
corner speed pull: 190
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

- `steerWeak = 0.18` 때문에 좌우 pose 전환이 너무 늦거나 빠르지 않은가.
- `visual steering`에 lateral velocity cue가 섞이면서, 입력을 놓은 뒤에도 차가 불필요하게 기울어 보이지 않는가.
- 고속 조향 감소가 너무 강해져 최고속에서 차가 둔하게 느껴지지 않는가.

비교 후보:

```text
steerWeak: 0.12 / 0.16 / 0.18 / 0.22
highSpeedSteerForceDrop: 0.25 / 0.34 / 0.42
highSpeedSteerVisualDrop: 0.20 / 0.28 / 0.34
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
3. `engineAcceleration = 128`이 낮아 입력 대비 추진감이 약하다.
4. `steeringVelocityCue = 0.38`이 입력보다 관성 시각 cue를 더 크게 보이게 할 수 있다.
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

## 지금 바로 코드 변경하지 않는 이유

현재 이상함이 한 가지 원인에서 오는지 확실하지 않다.

- 물리 lateral force가 과한 문제일 수 있다.
- visual steering cue가 과한 문제일 수 있다.
- 코너 감속이 벌점처럼 느껴지는 문제일 수 있다.
- 속도감 cue가 부족해서 조향이 상대적으로 어색하게 보이는 문제일 수 있다.

따라서 먼저 frozen screenshot과 60초 telemetry로 분리해서 봐야 한다. OutRun식 비교 기준은 "정확한 물리"가 아니라 "화면 하단 차량 기준이 안정적인가, 도로가 커브를 전달하는가, grip과 drift의 시각 역할이 분리되는가"다.

## 결론

현재 Apex Seoul은 구조적으로 OutRun식 방향에 가까워졌다.

- 차량은 화면 하단 기준점에 고정되어 있다.
- 기본 grip pose는 3way다.
- 강한 yaw pose는 drift/slip 후보로 남겨두고 있다.
- 도로와 horizon, side object, shadow가 주행 감각을 나눠 맡는다.

하지만 현재 수치에서는 조향/커브/속도 감각이 서로 조금씩 간섭할 가능성이 있다. 첫 튜닝은 차량 pose나 asset이 아니라, `curve force`, `corner speed pull`, `engine acceleration`, `visual steering cue`의 분리 비교로 시작한다.

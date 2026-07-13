# Apex Seoul Handling Review

갱신일: 2026-07-13

## 목적

이 문서는 Apex Seoul의 주행 감각을 판단하는 현재 기준과 QA 방법을 기록한다. OutRun 계열을 복제하지 않는다. 참조하는 것은 화면 하단 차량의 안정성, 도로 원근으로 커브를 읽는 방식, 그리고 grip/drift/counter의 역할 분리다.

## 현재 모델

### 속도

```text
engine force + slope acceleration
- brake - engine brake - rolling resistance - aero drag
- corner limit - steering scrub
```

- 내부 속도 `760u`는 표시 약 `200 km/h`에 대응한다.
- brake는 Space이며 `brakePressure`로 부드럽게 상승/해제한다.
- RPM, gear, torque, boost, fuel cut은 vehicle profile에서 계산한다.

### Grip

- `steeringVelocity`와 `lateralOffset` 기반의 2차 반응 모델이다.
- 고속에서는 steering force, input response, visual yaw, lateral velocity cap을 줄인다.
- curve force는 원심감 cue이며, 플레이어 조작권을 빼앗으면 안 된다.

### Drift

- 상태: `grip → setup → drift → recovery`.
- entry: 고속·충분한 코너·강한 turn-in·brake 또는 throttle lift.
- `driftLateralVelocity`는 일반 steering velocity와 분리된 momentum이다.
- setup 동안 breakaway momentum을 축적해 옆으로 튀는 느낌을 막는다.
- counter trim은 drift 방향을 유지한 채 slip/momentum을 줄인다.
- 방향 전환은 counter만으로 일어나지 않는다. neutral lift 뒤에 새 counter 입력을 넣고 재가속할 때만 commit한다.

## 2026-07-13 telemetry 판단

60초 실제 주행 로그 기준:

- drift는 의도적으로 진입/유지/회복 가능한 상태가 됐다.
- 전체 속도 평균은 약 `662u`, 최고 `760u`다.
- 542개 sample 중 519개가 최고속의 75% 이상이었다.
- speed effect 평균은 약 `0.77`, FOV 평균은 약 `73.8°`로 고속 연출의 대비가 부족하다.
- straight 평균 속도 약 `653u`, 강한 corner 평균 약 `642u`로 차이가 작다.
- 최대 lateral offset은 약 `105u`로 허용 road offset `700u`에 비해 작다.

해석: 차량이 느린 것이 아니라, 최고속 상태가 너무 오래 이어지고 corner가 라인 선택을 충분히 요구하지 않는다.

## 다음 핸들링 작업

1. speed cue를 속도 비율뿐 아니라 throttle acceleration, downhill, drift exit에 연결한다.
2. corner speed loss를 curve 수치 하나가 아니라 entry line, steering scrub, exit alignment와 연결한다.
3. easy bend / sharp bend / S transition별로 목표 속도와 drift 필요도를 다르게 둔다.
4. roadside object pass rate와 corner entry cue를 QA에 추가한다.

## QA

### 빠른 controller simulation

```bash
npm run qa:handling-sim --workspace @games/apex-seoul
```

확인 시나리오:

- standing start / straight accel
- micro tap / hold-release / slalom
- curve no-input / curve counter-steer
- lift drift entry / drift counter-steer recovery
- 좌/우 brake drift entry / high-speed grip angle cap
- counter lift exit / explicit counter transition

### 브라우저 telemetry

```text
/game-assets/apex-seoul/?telemetry=1&telemetryDuration=60&telemetryHz=10
```

다음 값으로 실제 플레이와 시뮬레이션을 함께 판단한다.

```text
speed, brakePressure, road.currentCurve, lateralOffset,
steering, steeringVelocity, driftState, driftDirection,
driftLateralVelocity, counterSteerTimer, driftRatio, driftEntryMode,
gripSteerAngleLimit,
vehicle.frame, vehicle.visualSteering
```

## 통과 기준

- 직선과 easy bend에서는 drift가 오발하지 않는다.
- brake/lift entry는 재현 가능하지만, 차량이 한 프레임에 옆으로 튀지 않는다.
- counter trim은 angle과 라인만 조절한다.
- counter lift exit은 recovery로 끝나며, neutral lift 뒤 새 counter/re-accel만 반대 drift를 한 번 만든다.
- sharp bend의 속도/라인 손실이 telemetry와 화면에서 함께 읽힌다.

## 2026-07-13 Grip/Entry Speed Budget 기록

### 문제

counter와 drift의 역할을 정리한 뒤에도, 일반 고속 코너와 lift entry의 속도 대가가 충분히 분리되어 있지 않았다. lift entry는 공통 진입 손실 `16u`만 갖고 있어, 브레이크 없이도 drift가 너무 가볍게 시작될 여지가 있었다. 반대로 grip은 force, response, visual cue의 고속 감쇠가 겹쳐 실제 차량이 낼 수 있는 조향각과 화면의 조향각을 판단하기 어려웠다.

### 결정

- brake entry는 brake pressure가 만드는 실제 감속을 주 대가로 유지한다.
- lift entry에는 공통 진입 손실에 `22u`를 추가한다. 짧은 리프트에도 drift가 공짜가 되지 않게 하되, 별도 재가속 지연은 아직 넣지 않는다.
- `driftEntryMode = brake | lift`와 `gripSteerAngleLimit`을 telemetry에 남긴다.
- grip 상태에서만 속도 비례 최대 조향각을 적용한다. 속도비 `0.55`부터 시작해 최고속에서 입력 상한 `0.72`까지 부드럽게 줄인다. setup/drift는 이 상한을 우회하므로 drift entry와 counter의 조작권은 보존된다.
- grip 속도 손실은 corner speed limit과 steering scrub으로만 만든다. 고속 풀 조향에는 감속이 생기지만, drift 유지에 프레임별 벌점을 추가하지 않는다.

### 자동 기준

```text
lift drift entry:          entry speed drop >= 30u
brake drift entry left/right: entry speed drop >= 25u, same entry response
high-speed grip angle cap: visual steering 0.45~0.62, corner speed drop 20~110u
```

현재 기준 측정값은 lift `64.6u`, brake left/right 각각 `70.6u`, high-speed grip angle `0.486`, grip corner speed drop `85.3u`다.

### 블로그 글감

**속도를 깎는다는 것은 모든 코너에 같은 감속을 거는 일이 아니었다.** brake drift는 브레이크를 쓴 대가를 읽히게 하고, lift drift는 작은 추가 손실로 의도를 분명히 하며, grip은 고속에서 가능한 핸들각 자체를 줄여 속도와 라인이 함께 정리되게 했다. 이 세 가지를 분리하자 속도계 숫자보다 먼저 입력의 무게가 달라졌다.

## 2026-07-13 Drift Exit/Transition 분리 기록

### 문제

실주행 telemetry에서 counter를 유지한 채 액셀을 놓았을 때 `driftTransitionArmed`가 즉시 켜지고, 재가속 프레임에 반대 방향 drift가 commit됐다. 플레이어가 기대한 것은 drift exit인데, 상태기는 이를 S자 전환으로 해석했다.

### 결정

- `counter + lift`는 반대 drift 예약이 아니라 즉시 recovery다.
- 전환은 `neutral lift → 0.42초 창 안의 fresh counter → re-accel` 순서에서만 arm/commit한다.
- 따라서 counter는 exit 중에도 차를 바로잡는 입력으로 남고, direction change는 의도적인 별도 제스처가 된다.
- telemetry에는 `driftTransitionAwaitingCounter`, `driftTransitionLiftTimer`, arm/commit 시간을 남긴다.

### 자동 기준

```text
counter-lift-exit:        recovery <= 800ms, direction change = 0
counter-transition:       neutral lift 이후 arm, re-accel commit <= 700ms
```

현재 시뮬레이션은 exit recovery `200ms`, explicit transition arm `250ms`, commit `0ms`를 기록한다.

### 블로그 글감

**액셀 오프는 전환 버튼이 아니라 신뢰할 수 있는 탈출구여야 했다.** counter를 누른 채 throttle을 놓는 흔한 정리 동작과, 다음 코너로 차체를 넘기는 S자 전환을 같은 규칙으로 묶으면 드리프트는 화려해지지만 믿을 수 없어진다. neutral lift 뒤의 fresh counter라는 작은 입력 문법을 만들자, 종료와 전환 모두 플레이어가 의도한 순간에만 일어났다.

## 2026-07-13 Counter Trim 보정 기록

### 관찰

drift 방향을 잠근 뒤에도 counter가 지나치게 잘 먹혔다. 원인은 `driftLateralVelocity`가 아니라 일반 `steeringVelocity`였다. 실제 telemetry에서 오른쪽 drift 중 왼쪽 counter를 넣자 drift momentum은 양수로 남았지만, steering velocity가 약 `-108u/s`까지 커져 lateral offset이 반대 라인으로 크게 이동했다.

```text
counter 시작: drift velocity +42.8u/s, steering velocity -47.8u/s
0.22초 뒤:  drift velocity +4.0u/s,  steering velocity -108u/s
약 2초 뒤:   lateral offset +68.8 -> -81.9
```

이는 counter가 “drift angle 조절”이 아니라 “즉시 반대 차선 이동”으로 읽히게 만든다.

### 결정

- drift 중 반대 조향의 steering force를 최대 약 35%까지 줄인다.
- counter steering velocity는 `42u/s`로 별도 cap을 둔다.
- damping 뒤에도 drift 방향 momentum을 최소 `28u/s` 유지한다.
- 따라서 counter는 sprite/angle을 `steer-2 → steer-1`로 완화하고 라인을 천천히 조절한다.
- 반대 drift는 기존처럼 `counter + throttle lift + 재가속`에서만 commit한다.

### 블로그 글감

**드리프트의 방향과 실제 조향을 분리한 뒤에도, counter가 너무 강하면 차는 반대 방향으로 미끄러진다.** 해결은 drift momentum만 유지하는 데 있지 않았다. 일반 steering force도 drift 상태에서는 별도의 authority와 velocity cap을 가져야 했다. 이 분리로 counter는 슬라이드를 끝내는 버튼이 아니라, 같은 방향 drift의 각도와 라인을 다듬는 입력이 된다.

## 2026-07-13 Counter Pull 제거 기록

### 재검토

counter authority를 줄인 뒤에는 반대 차선으로 튀는 문제는 줄었지만, counter 중 drift momentum을 최소값으로 강제 복구하는 로직이 남았다. telemetry에서는 drift momentum과 steering velocity가 서로 반대 방향으로 계속 유지되어 차량이 고무줄처럼 끌리는 감각이 생겼다.

### 결정

- `driftCounterHoldSpeed`의 hard floor를 제거한다.
- counter 시작 시의 drift momentum을 기록하고, `0.45초` 동안 0을 향해 부드럽게 target을 이동한다.
- counter authority는 짧은 입력에서 낮고, 유지 시간에 따라 높아지는 곡선으로 둔다.
- counter만으로 momentum 부호를 반전하지 않는다. 반대 drift는 lift/re-accel 전환만 쓴다.

### 블로그 글감

**아케이드 드리프트에서 counter는 힘을 반대로 더하는 입력이 아니라, 남은 슬라이드의 목표값을 바꾸는 입력에 가깝다.** 최소 momentum을 계속 강제하면 차량은 관성을 가진 것처럼 보이지만, 실제로는 플레이어와 반대 힘이 싸우며 “끌리는” 감각을 만든다. entry momentum을 기준으로 0까지 수렴시키면 drift의 방향은 남기면서도 counter의 해제감과 라인 조절을 함께 만들 수 있다.

## 2026-07-13 Counter Release Drift Resume 기록

### 관찰

counter를 개선한 뒤에도 조향을 놓는 순간 `DRIFT → RECOVERY`로 들어가고, `driftLateralVelocity`가 0에 남았다. 따라서 오른쪽 steer로 시작한 drift에서 왼쪽 counter를 잠깐 넣었다가 놓아도, 원래의 오른쪽 슬라이드가 이어지지 않았다.

### 결정

- drift entry가 만든 `driftBaseLateralVelocity`를 별도로 보존한다.
- counter는 `counterTrimRatio`를 올려 base momentum을 임시로 낮춘다.
- counter 해제 뒤에는 trim ratio가 약 `0.25초`에 걸쳐 감소하며, 같은 방향 drift target이 복원된다.
- throttle을 유지하는 neutral steering은 drift hold다. throttle lift와 neutral, 저속, 커브 종료가 recovery를 만든다.
- 반대 drift는 여전히 counter + lift + 재가속에서만 commit한다.

### 블로그 글감

**counter를 놓는 순간 drift가 끝나면, counter는 제어가 아니라 취소 버튼이 된다.** 아케이드 다운힐에서는 진입 조향이 만든 base momentum을 보존하고, counter는 그 위에 잠시 걸리는 trim으로 다루는 편이 자연스럽다. 이 구조는 “오른쪽으로 흘리며 왼쪽으로 각도를 잡고, 손을 놓으면 다시 오른쪽으로 흐르는” 리듬을 만든다.

# Apex Seoul Downhill Drift Handling Direction Check

작성일: 2026-07-10

## 이 문서의 판단 범위

현재 Apex Seoul의 목표는 완성된 레이싱 게임 루프가 아니다. 목표는 **경쾌한 아케이드 다운힐 드리프트 주행감**을 먼저 재현하는 것이다.

따라서 checkpoint, 경쟁, 기록, 결과 화면, 충돌 보상 같은 게임 규칙의 부재는 현 단계의 결함으로 평가하지 않는다. 그것들은 주행 감각이 고정된 뒤 붙여야 할 다음 레이어다.

이번 점검의 질문은 하나다.

> 현재 구현이 "서울 야간 다운힐에서, 고속 그립과 의도적인 드리프트를 오가며 코너를 푸는 아케이드 주행"으로 가는 올바른 기반인가?

결론은 **기반 방향은 맞다. 다만 지금 구현은 드리프트 게임의 직전 단계인 고속 그립 다운힐 모델이며, 플레이어가 의도적으로 진입하고 복구하는 드리프트 상태가 아직 없다.**

## 현재 구현 판정

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| pseudo-3D 차량 기준점 | 맞음 | 차량을 화면 하단 anchor에 두고, 도로가 휘어 보이도록 설계했다. |
| 고속 다운힐 속도감 | 맞음 | 경사 가속, FOV 보너스, road glint speed effect가 같은 방향으로 작동한다. |
| 고속 그립 안정성 | 맞음 | 고속에서 조향 힘, 입력 반응, visual steering, lateral velocity를 모두 낮춘다. |
| 코너에 따른 손실 | 맞음 | corner speed limit/pull과 steering scrub으로 과한 조향의 대가가 있다. |
| 경쾌한 드리프트 진입 | 아직 없음 | brake/lift/steer 조합으로 slip 상태가 전환되지 않는다. |
| 드리프트 유지와 복구 | 아직 없음 | yaw, slip angle, rear traction, counter-steer recovery 상태가 없다. |
| 드리프트의 화면 언어 | 준비됨 | 3way grip pose와 강한 `steer-right-2` 후보가 분리돼 있다. |
| 차량별 엔진 리듬 | 방향 맞음 | RPM, torque, boost, fuel cut 프로필이 주행 코드에서 분리돼 있다. |

즉 지금까지의 고속 핸들링 보정은 되돌릴 작업이 아니다. 그것은 드리프트가 아닌 평상시 주행을 안정시키는 데 필요한 바닥이다. 다음 단계는 이 위에 **짧고 읽기 쉬운 drift state**를 추가하는 것이다.

## 구현된 부분이 방향에 맞는 이유

### 고속에서 차체를 과하게 꺾지 않은 결정

`playerVehicleController.ts`는 속도가 오를수록 아래 값을 낮춘다.

```text
steering force
input response
visual steering
lateral velocity cap
curve visual cue
```

이 구조는 맞다. 다운힐 드리프트 게임에서 평소부터 차량이 강한 yaw로 움직이면, 드리프트에 들어갔을 때의 대비가 사라진다. 기본 상태는 화면 하단에서 묵직하게 전진하고, 도로 원근이 커브를 읽게 해야 한다.

이전 실제 주행 로그에서도 hard corner 평균 speed가 약 `645u`까지 내려가고 lateral offset은 안정 범위에 남았다. 사용자가 코너링을 약 80점으로 평가한 것과도 맞는다. 현재는 고속에서 지나치게 가볍게 꺾이던 문제를 잡은 상태다.

### 코너 속도 손실을 넣은 결정

현재 속도 모델은 아래처럼 작동한다.

```text
가속 = 엔진 토크 + 경사 가속
     - 공기/구름 저항
     - 커브 속도 상한
     - 커브 pull
     - 큰 조향 입력의 steering scrub
```

이것도 방향에 맞다. 드리프트 게임이어도 코너가 무료여서는 안 된다. 진입 속도를 늦추거나, 짧게 차를 흘려 라인을 만들거나, 조향을 과하게 넣어 속도를 잃는 선택이 구분되어야 한다.

다만 현재 `steering scrub`은 "핸들을 많이 꺾었으니 느려진다"에 가깝다. 다음 단계에서는 **그립을 유지하며 꺾은 손실**과 **드리프트로 회전하며 잃는 손실**을 나눠야 한다.

### 코스와 카메라의 다운힐 방향

`road.ts`의 Bugak Ridge Downhill은 완만한 진입 뒤 긴 우/좌 커브, 연속 코너, 회복 직선으로 이어진다. elevation 변화는 엔진과 별도로 slope acceleration과 camera pitch에 반영된다.

이는 드리프트 핸들링을 시험하기 좋은 구성이다.

- 완만한 진입: 그립 turn-in 확인
- 긴 커브: drift 유지 시간 확인
- 반대 S 커브: counter-steer와 복구 확인
- 짧은 직선: 속도/차체를 다시 세우는 보상 확인

black/blue 야간 팔레트와 road-side blue cue도 속도와 커브를 강조하는 데 맞다. 그래픽을 크게 늘리기 전에 이 코스에서 차가 어떤 리듬으로 움직여야 하는지를 고정하는 편이 옳다.

### 차량/엔진 프로필 분리

Raven Coupe NA, Vortex GT twin turbo, Apex S single turbo는 `VehicleEngineProfile`로 분리돼 있다. 이 구조는 드리프트 주행에 특히 유용하다. 같은 드리프트 상태라도 차량마다 탈출 감각이 달라질 수 있기 때문이다.

```text
Raven Coupe NA: 고회전 유지와 짧은 변속 리듬으로 코너 탈출
Vortex GT: 고속 main boost가 붙을 때 긴 drift 탈출이 강함
Apex S: 늦게 차오르는 단일 boost로 짧은 lift 뒤 재가속이 특징
```

현재는 Raven Coupe만 실제 런타임 기본 차량이다. 다른 프로필을 바로 추가하기보다 Raven Coupe에서 drift 상태의 기준을 먼저 고정하는 것이 맞다.

## 현재 모델에서 정확히 비어 있는 것

### `curveDriftAcceleration`은 드리프트가 아니다

현재 lateral movement에는 아래 힘이 들어간다.

```text
curveForce = -currentCurve * speedRatio * curveDriftAcceleration
```

이 값은 도로가 휜 방향에 따라 차량을 바깥쪽으로 밀어 원심감 cue를 주는 역할이다. 이름에 `Drift`가 들어가지만, 플레이어 입력으로 발생하는 rear slip이나 yaw가 아니다.

현재 모델에는 다음 값이 없다.

- 차체가 진행 방향과 얼마나 다른지를 나타내는 `slipAngle`
- rear traction이 빠진 상태를 나타내는 `driftRatio`
- brake/lift/steer 조합을 보고 drift 진입을 판정하는 상태 전환
- counter steer에 따라 차체를 다시 세우는 recovery
- drift 중에는 강한 pose를 쓰고, grip에서는 3way pose만 쓰는 렌더 규칙

그래서 현재는 "안정적인 그립 코너링"으로는 옳지만, "내가 차를 흘려 코너를 열었다"는 감각은 아직 만들 수 없다.

### 현재 3way pose 제한은 오히려 올바른 순서다

현재 런타임은 `center / steer-left-1 / steer-right-1` 중심의 grip pose를 쓴다. 이 상태는 유지해야 한다. 강한 `steer-right-2`를 평소 조향에 열면 고속 그립과 드리프트가 다시 섞인다.

강한 pose, 더 큰 rotation, shadow stretch, tail-light/smoke cue는 `driftRatio`가 일정값을 넘을 때만 써야 한다. 현재 스프라이트 계획도 이 역할 분리를 전제로 하고 있으므로, 자산 파이프라인 방향과도 충돌하지 않는다.

## 다음 구현의 초점: 작은 Drift State Machine

처음부터 시뮬레이터형 타이어 물리로 갈 필요는 없다. 현재 `lateralOffset`, `steeringVelocity`, `speed`, `steering` 위에 아래 상태만 추가하면 된다.

```text
GRIP
  -> SETUP
  -> DRIFT
  -> RECOVERY
  -> GRIP
```

| 상태 | 진입 | 차량 감각 | 화면 표현 |
| --- | --- | --- | --- |
| `GRIP` | 기본 | 현재의 안정적인 고속 조향 | 3way grip pose |
| `SETUP` | 고속 + turn-in + brake 또는 throttle lift | rear가 가벼워지기 시작 | 약한 yaw, tail-light cue |
| `DRIFT` | setup 중 일정 steering/속도 조건 충족 | lateral velocity와 차체 각도가 잠시 분리됨 | strong steer pose, shadow stretch, 작은 smoke/glow |
| `RECOVERY` | counter steer 또는 speed 저하 | 차체가 도로 방향으로 돌아옴 | pose를 빠르게 grip으로 회수 |

### 권장 상태값

```ts
driftRatio: number;       // 0..1, 현재 slip 강도
driftDirection: -1 | 0 | 1;
slipAngle: number;        // 화면/pose 전용 차체 각도
traction: number;         // 0..1, rear grip 회복용
throttleWasPressed: boolean;
```

`lateralOffset`은 차의 도로상 위치로 유지한다. `slipAngle`은 곧바로 월드 물리로 쓰지 말고, 우선 sprite rotation/pose/shadow와 drift 지속 시간의 기준으로 쓰는 편이 안전하다. 현재 고속 grip을 다시 망가뜨리지 않기 위해서다.

### 아케이드 진입 규칙

첫 패스는 아래처럼 단순해야 한다.

```text
speedRatio >= 0.48
and cornerIntensity >= 0.35
and abs(steerAxis) >= 0.55
and (brakePressed or throttle을 방금 뗌)
=> SETUP / DRIFT 진입
```

유지 조건:

```text
drift 방향과 같은 steer 입력: drift 유지
반대 steer 입력: recovery 가속
속도 하락 또는 커브 종료: traction 회복
```

이 방식은 버튼 하나를 더 만들지 않아도 된다. 아케이드 다운힐에서 자연스러운 `turn-in -> lift/brake -> slide -> counter steer -> exit` 리듬을 만들 수 있다.

### 속도 손실 원칙

현재의 커브 감속은 유지한다. 대신 drift에서는 완전한 급감속보다 아래처럼 분리한다.

```text
grip turn: 조향량에 따른 steering scrub이 주 손실
drift entry: 짧은 entry speed drop
drift hold: 큰 손실은 피하고, throttle 유지 시 완만한 drag
drift recovery: 차가 정렬되면 엔진 토크가 다시 잘 전달됨
```

목표는 "드리프트가 최단 기록을 위한 유일한 답"이 아니라, 너무 빠른 진입을 구제하거나 코너 탈출 라인을 만드는 경쾌한 선택지다. Raven Coupe는 긴 슬라이드보다 짧은 set-up과 빠른 recovery가 더 잘 어울린다.

## 이번 단계의 수용 기준

주행감만 판단할 때 아래 여섯 가지가 충족되면 방향이 맞다.

1. 직선 고속에서는 차량이 안정적이고, 작은 입력이 과한 yaw로 보이지 않는다.
2. 일반 코너는 현재처럼 grip으로 돌 수 있으며, 과한 조향은 속도 손실을 만든다.
3. 고속 turn-in 중 brake/lift를 섞으면 의도적으로 짧은 drift에 들어갈 수 있다.
4. 반대 조향을 넣으면 차량이 0.3~0.7초 안에 회복되고, 반대쪽으로 즉시 튀지 않는다.
5. drift pose는 실제 drift 상태에서만 보이고, 평소 고속 주행에는 나오지 않는다.
6. drift 후 탈출에서 속도가 완전히 죽지 않고, 차를 세운 플레이어가 다시 가속하는 쾌감이 있다.

## 테스트 시나리오

기존 handling simulation은 유지하고, 다음 여섯 scenario를 추가하는 것이 좋다.

| scenario | 입력 | 확인할 값 |
| --- | --- | --- |
| `grip-turn-in` | 고속 유지 + 짧은 조향 | drift가 잘못 진입하지 않는가 |
| `lift-drift-entry` | 고속 + turn-in + throttle lift | drift 진입 시간과 최대 slipAngle |
| `brake-drift-entry` | 고속 + turn-in + 짧은 brake | 속도 손실과 drift 안정성 |
| `counter-steer-recovery` | drift 중 반대 조향 | recovery time, overshoot, exit speed |
| `s-curve-transition` | 좌 drift 뒤 우 turn-in | 반대 방향 튐/oscillation 여부 |
| `drift-exit-accel` | recovery 뒤 throttle 유지 | exit speed와 torque 회복 |

기록할 핵심 telemetry:

```text
driftRatio max/avg
drift entry count
drift duration
slipAngle max
recovery ms
recovery overshoot
entry speed / exit speed
grip 상태에서의 false drift entry count
```

핸들링 자동 점수도 두 축으로 분리한다.

```text
grip score: 고속 안정성, 입력 반응, 커브 이탈 방지
drift score: 진입 재현성, 유지 가능 시간, recovery, 탈출 속도
```

이렇게 하면 현재처럼 고속 그립을 억제했을 때 기존 민첩성 점수가 조금 내려가는 현상을 실패로 오해하지 않을 수 있다.

## 지금은 하지 않을 것

- checkpoint/time attack/결과 화면 확장
- AI 라이벌, 교통, 고스트
- 충돌과 damage 시스템
- 차량 추가와 차량 선택 화면
- 항상 켜진 강한 drift pose
- 실제 타이어 마찰을 정교하게 재현하는 시뮬레이터 물리

이 항목들은 현재 단계의 주행감이 고정된 뒤에 붙인다. 특히 road object 충돌은 drift recovery를 검증한 뒤 도입하는 편이 좋다. 너무 일찍 넣으면 "슬라이드가 어려운 이유"가 물리 문제인지 장애물 문제인지 분리하기 어려워진다.

## 최종 판단

현재 구현은 목표에서 벗어나지 않았다. 고속 조향 감쇠, 코너 속도 손실, downhill slope, 안정된 차량 앵커, black/blue speed cue, NA 엔진 리듬은 모두 **경쾌한 다운힐 드리프트 게임의 grip 기반**으로 적절하다.

다음 구현은 게임 규칙 확장이 아니라, `GRIP -> SETUP -> DRIFT -> RECOVERY`의 작은 상태 전환을 만드는 일로 잡아야 한다. 그 뒤 실제 플레이에서 "내가 흘렸다가 다시 잡았다"는 감각이 생기면, 그때 checkpoint나 기록은 자연스럽게 의미를 갖는다.

# Apex Seoul 속도대별 핸들링 개선 계획

갱신일: 2026-07-23

상태: 기존 P0~P4의 속도대별 기본 조향은 유지한다. 다만 2026-07-23 실주행에서 production sharp 코너의 무조향 바깥 이탈이 거의 보이지 않는 회귀를 확인해, 코너 관성·곡률 sampling·자동 감속 관계를 CH-0~CH-5로 다시 연다.

> 2026-07-21 이후 225km/h envelope의 속도 연출과 185~225km/h handling 확장은 [225km/h 속도감·핸들링 후속 계획](./apex-seoul-speed-sense-handling-revision-plan.md)에서 관리한다. 이 문서는 기존 0~185km/h 승인값과 구현 근거를 보존한다.

## 2026-07-23 무입력 코너 관성 재검증

### 발견

실주행에서 도로 중앙을 유지한 채 가속만 하면 코너가 바뀌어도 차량이 의미 있게 바깥으로 밀리지 않았다. `lateralOffset = 0`은 월드의 고정된 직진선이 아니라 현재 도로 중심을 뜻하므로, 도로 상대 좌표를 그대로 유지하면 차가 도로 굴곡을 자동으로 따라간 것처럼 보인다.

이를 보완하기 위해 기존 `curveDriftAcceleration`을 제거하고 별도 `cornerInertiaLateralVelocity`를 추가했다.

```text
cornerInertiaTarget
  = -roadDirection
  × cornerInertiaMaxLateralSpeed
  × speedRatio²
  × cornerIntensity
  × downhillLateralScale
```

또한 무입력 코너에서는 neutral centering target을 `0`으로 내려 도로 중심 복원이 관성을 지우지 않게 했다. 이 변경은 고정 곡률 독립 simulation에서는 통과했지만 실제 Bugak production run에서는 사용자가 기대한 “조향하지 않으면 코너 바깥으로 밀려나는” 결과를 만들지 못했다.

### 실제 production 측정

출발부터 가속만 유지하고 steering 입력을 주지 않은 브라우저 runtime을 U2 `longitudinalScale=2`와 비교 control `1`에서 측정했다.

| 항목 | U2 `2×` production | 비교 `1×` |
| --- | ---: | ---: |
| 기록된 game time | `34.004초` | `25.055초` |
| 도달 Z | `30,138u` | `9,654u` |
| 첫 strong corner `abs(curve) >= 0.4` 체류 | `1.713초` | `3.158초` |
| 첫 strong corner offset 변화 | `64.86u` | `129.23u` |
| run 최대 절대 offset | `97.04u` | `210.49u` |
| 최대 관성 횡속도 | `53.43u/s` | `47.38u/s` |
| rail contact | `0회` | `0회` |

U2 run의 세 strong corner에서 관측한 결과:

| peak curve | 체류 시간 | 속도 변화 | offset 변화 | 최대 inertia |
| ---: | ---: | ---: | ---: | ---: |
| `0.66` | `1.713초` | `140.4 → 141.4km/h` | `-64.86u` | `45.06u/s` |
| `-0.62` | `1.147초` | `180.1 → 150.2km/h` | `+57.19u` | `51.69u/s` |
| `0.64` | `1.396초` | `181.4 → 151.7km/h` | `-70.55u` | `53.43u/s` |

좁은 Bugak 코너의 rail center limit도 약 `800u`다. 현재 production 기본값 `cornerInertiaMaxLateralSpeed = 115u/s`는 최고속·최대 곡률에서도 한 코너 안에 중앙에서 rail까지 이동할 수 없는 상한이다. 실제로는 진입 속도, 곡률 ramp와 빠른 recovery 때문에 이론 상한보다 훨씬 작은 `57~71u`만 이동했다.

### 원인 판정

결론은 **구현·단위 tuning이 1차 원인, 코스 시간 구조가 2차 원인**이다.

#### 1차 — 구현과 단위 계약

1. **관성 상한이 도로 폭보다 너무 작다.**
   - 최대 target이 `115u/s`이고 production strong corner는 약 `1.1~1.7초`다.
   - build/recovery와 curve ramp를 무시한 이론 이동량도 약 `132~197u`로 rail limit 약 `800u`에 크게 못 미친다.
2. **U2 진행 배율이 관성에 반영되지 않는다.**
   - 코스는 `worldTravelSpeed = physicalSpeed × 2`로 두 배 빨리 진행한다.
   - 관성은 physical `speedRatio²`만 사용하므로 같은 코너에서 힘이 작용할 시간만 절반으로 줄었다.
3. **QA가 production 코너를 대표하지 않는다.**
   - 현재 독립 QA는 `curve 0.58`과 속도를 3초간 고정한다.
   - 실제 코스는 곡률이 ramp in/out하고 U2에서 strong 구간이 2초보다 짧다.
4. **자동 corner scrub이 위험을 먼저 제거한다.**
   - 두 번째와 세 번째 strong corner에서 무입력 차량이 약 `180 → 150km/h`로 자동 감속했다.
   - 과속의 결과가 바깥 trajectory보다 자동 속도 제한으로 먼저 읽힌다.
5. **물리 곡률 sampling 위치가 차량 접점과 다르다.**
   - controller는 `camera.z` base segment의 `roadStats.currentCurve`를 사용한다.
   - 차량 scale, collision과 anchor는 `camera.z + playerRoadContactDistance`의 도로를 사용한다.
   - 약 한 segment의 공간 차이로 물리 반응과 화면상 차량 접점이 어긋날 수 있다.
6. **guardrail impact가 새 관성을 완전히 소비하지 않는다.**
   - 충돌 뒤 `cornerInertiaLateralVelocity`는 damping한다.
   - 그러나 impact 직전 `outwardVelocity` 합계에는 이 값이 빠져 있어 충돌 강도와 cue가 관성을 반영하지 못한다.

#### 2차 — 코스 디자인

Bugak의 대표 commitment는 긴 곡률 plateau가 아니라 `0 → peak → 0`에 가까운 짧은 ramp 조합이다. CSS 단계에서 코너 화면 체류를 줄이기 위해 strong run을 `11~14 segment`로 압축했고, U2가 이를 다시 절반 시간에 통과한다.

이 구조는 빠른 화면 리듬에는 유리하지만 관성을 쌓고 braking point, turn-in, apex, exit를 분리하기에는 짧다. 다만 물리 상한과 단위 계약을 고치기 전에 코너부터 늘리면 “더 오래 자동 감속하는 코너”가 될 수 있으므로 코스 수정은 CH-4까지 보류한다.

### 목표 gameplay 계약

Apex Seoul은 가속 버튼만 유지하는 러너가 아니라 코너를 빠르게 주파하는 time attack이어야 한다.

```text
straight / easy
  고속 안정성 + 작은 line correction

sharp overspeed, no input
  바깥 trajectory 누적
  → shoulder/rail 위협
  → 나쁜 exit 또는 충돌

prepared grip
  lift/brake point 선택
  → 정확한 turn-in
  → 작은 slip과 좋은 exit

drift
  더 높은 진입 속도 또는 다른 line
  → breakaway
  → counter steer
  → 회수 성공 여부가 exit를 결정
```

목표는 모든 코너에서 무입력 차량을 강제로 rail에 보내는 것이 아니다. easy sweep은 안정적으로 통과할 수 있고, 선택한 sharp/commitment에서만 진입 속도와 조향 실패가 명확한 바깥 이탈로 이어져야 한다.

### 단계별 수정 계획

#### CH-0 — production 코스 계약 QA

상태: **완료 (2026-07-23)**

상수를 바꾸기 전에 실제 실패를 자동화한다.

- Bugak U2 `2.00`에서 출발·고정 속도 두 종류의 무조향 run을 추가한다.
- `camera.z`, contact Z, curve, interpolated contact curve, physical/world speed를 함께 기록한다.
- strong corner마다 entry/apex/exit 시간, offset delta, outward/road ratio, shoulder/rail contact를 기록한다.
- `1×/2×`를 같은 물리 속도와 같은 코너에서 비교한다.
- 고정 `curve 0.58 × 3초`는 unit test로 유지하되 production 승인 gate로 사용하지 않는다.

완료 gate:

- 현재 production build가 “관성값은 생기지만 rail 위협은 없는” 실패로 재현된다.
- 어느 코너에서 얼마만큼 부족한지 road-normalized 수치로 남는다.
- 이후 tuning이 코스 위험을 실제로 바꿨는지 같은 replay로 비교할 수 있다.

구현 결과:

- `qa:corner-production`을 추가했다.
- 실제 Bugak `348 segment / 83,520u`, production U2 `2.00`, 60Hz controller와 guardrail collision을 그대로 사용하는 deterministic replay다.
- 출발부터 full-throttle/no-input으로 Z `30,000u`까지 진행하는 run과, 첫 코너 전체를 185km/h 고정 속도로 통과하는 U1/U2 비교를 함께 남긴다.
- controller가 현재 사용하는 base-segment curve와 차량 contact Z의 보간 curve를 동시에 기록하되, CH-0에서는 물리 입력을 바꾸지 않는다.
- 각 strong corner에 duration, strong duration, entry/apex/exit, speed loss, inertia, outward delta, road-normalized ratio, shoulder와 rail impact를 기록한다.

결과 상태는 `BLOCKED_BASELINE_CAPTURED`다. 이는 QA 실패가 아니라 **현재 gameplay 계약이 막힌 상태를 성공적으로 고정했다**는 뜻이다.

| 측정 | 결과 |
| --- | ---: |
| diagnosis checks | `8/8 PASS` |
| gameplay approval checks | `0/4 PASS` |
| U2 launch strong corner | `3개` |
| U2 launch 최대 inertia | `56.217u/s` |
| U2 launch 최대 absolute offset/road | `0.111` |
| U2 launch shoulder / rail impact | `0 / 0` |
| 185km/h U1 첫 코너 duration | `6.133초` |
| 185km/h U2 첫 코너 duration | `3.067초` |
| 185km/h U1 outward delta | `253.142u`, road ratio `0.288` |
| 185km/h U2 outward delta | `126.981u`, road ratio `0.144` |
| U2/U1 outward ratio | `0.502` |
| 최대 base/contact curve 차이 | `0.349` |

U2 launch의 두 번째와 세 번째 strong corner는 각각 `16.957km/h`, `17.595km/h`를 잃었지만 최대 outward/road ratio는 `0.127 / 0.132`, shoulder ratio는 모두 `0`이었다. 자동 감속이 발생해도 바깥 trajectory는 도로의 약 13%만 사용했다.

기존 `qa:corner-handling`의 고정 `curve 0.58 × 3초` 계약은 계속 전부 통과한다. 따라서 CH-0는 “독립 물리 계산은 작동하지만 production 코스 계약은 실패한다”는 두 결과를 동시에 회귀로 고정한다.

자동 생성물:

- [CH-0 JSON](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.json)
- [CH-0 사람이 읽는 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)

#### CH-1 — 좌표와 곡률 sampling 정렬

상태: **완료 (2026-07-23)**

- 차량 물리에 사용할 contact Z를 한 곳에서 계산한다.
- base segment의 계단형 curve 대신 contact Z에서 보간한 곡률을 사용한다.
- controller, corner demand, HUD와 telemetry가 같은 물리 곡률 sample을 공유한다.
- guardrail `outwardVelocity`에 `cornerInertiaLateralVelocity`를 포함한다.
- 한 frame 지연된 render stats가 물리 입력 source가 되지 않게 road data에서 직접 sampling한다.

완료 gate:

- turn-in과 exit에서 화면상 차량 접점과 관성 방향 전환이 같은 segment 안에 있다.
- 좌·우 코너의 outward sign이 대칭이다.
- 관성으로 rail에 닿았을 때 impact cue와 bounce가 0으로 사라지지 않는다.

구현 결과:

- `main.ts`가 매 physics update 시작 시 `camera Z + 260u`의 차량 접점을 한 번 sampling하고, 보간 곡률·포장 폭·rail 중심 한계를 하나의 `playerPhysicsRoadSample`로 보관한다.
- controller와 corner demand, guardrail collision context, HUD, runtime telemetry가 이 sample을 공유한다. 이전 frame의 render stats는 더 이상 물리 곡률 source가 아니다.
- 공용 `getRoadCurveAt()`을 추가해 production replay와 runtime이 같은 보간 규칙을 사용한다.
- guardrail impact의 outward velocity 합계에 `cornerInertiaLateralVelocity`를 포함했다.

검증 결과:

| gate | 결과 |
| --- | ---: |
| production physics/contact curve 최대 오차 | `0` |
| base/contact curve 최대 차이 | `0.350` — 기존 불일치가 실제로 존재함을 계속 기록 |
| 185km/h 고정 curve 좌/우 3초 최종 offset | `-177.308u / +177.308u` |
| 좌/우 최종 corner inertia | `-61.264u/s / +61.264u/s` |
| corner-inertia-only rail impact cue | `0.9654` |
| corner-inertia-only bounce velocity | `125.0236u/s` |
| 충돌 후 남은 corner inertia | `48.4u/s` |
| `qa:corner-handling` | `8/8 PASS` |
| `qa:guardrail-collision` | `20/20 PASS` |
| production gameplay approval | `1/4 PASS` |

CH-1은 좌표와 전달 경로만 정렬했으며 관성 크기, 자동 감속, 코스 geometry는 조정하지 않았다. 따라서 U2 launch의 최대 offset/road는 `0.110`, shoulder와 rail impact는 계속 `0 / 0`이다. 이는 CH-1 실패가 아니라 CH-2의 longitudinal/횡관성 단위 계약과 CH-3의 자동 scrub 순서가 여전히 필요하다는 분리된 결과다.

#### CH-2 — longitudinal progression과 횡관성 단위 재정의

상태: **완료 (2026-07-23)**

`cornerInertiaMaxLateralSpeed` 하나를 무작정 키우지 않는다. 아래 관계 중 하나를 명시적으로 선택하고 QA로 고정한다.

```text
선택 A
  lateral acceleration
    = curvature × physicalSpeed² × arcadeScale

선택 B
  road-relative lateral velocity debt
    = curve geometry가 요구하는 centerline heading change
    × worldTravelSpeed
    - vehicle heading response
```

- `longitudinalScale`이 코너 체류 시간만 줄여 위험을 반감시키지 않게 한다.
- build/recovery는 힘의 크기 대신 하중 이동과 조작 window를 설명하도록 재조정한다.
- 절대 offset보다 `outwardOffset / railCenterLimit`을 1차 gate로 사용한다.

초기 목표 관계:

| 조건 | 목표 |
| --- | --- |
| straight 185km/h, no input | offset drift 거의 `0` |
| easy 150~185km/h, no input | rail contact 없이 작은 보정 가능 |
| selected sharp 185km/h, no input | corner 안에서 shoulder 진입 또는 rail 위협 |
| selected sharp 110~130km/h, no input | 고속보다 명확히 작은 outward ratio |
| 동일 sharp 185 vs 110km/h | 속도 증가에 따라 비선형 위험 증가 |
| U1 vs U2 | 진행 배율만으로 위험 관계가 절반으로 줄지 않음 |

선택한 계약:

```text
road-distance lateral debt
  ∝ curve intensity × physicalSpeed²

controller lateral velocity
  = road-distance lateral debt × worldTravelSpeed
  ∝ curve intensity × physicalSpeed³ × longitudinalScale
```

`cornerInertiaMaxLateralSpeed`는 U1·최고속의 시간 단위 기준값으로 유지했다. U2에서는 target만 두 배로 만드는 것이 아니라 build/recovery rate도 같은 progression 배율로 늘린다. 따라서 짧아진 wall-clock 코너 안에서 같은 공간 응답 곡선을 만들며, 조작 window의 거리 길이는 U1/U2에서 같아진다.

구현·검증 결과:

| gate | 결과 |
| --- | ---: |
| 185km/h 첫 코너 U1 duration | `6.133초` |
| 185km/h 첫 코너 U2 duration | `3.067초` |
| U1 / U2 outward delta | `203.522u / 203.845u` |
| U2/U1 outward ratio | `1.002` |
| 185km/h U2 outward/road | `0.232` |
| 120km/h U2 outward/road | `0.099` |
| 185/120km/h road risk ratio | `2.343` |
| straight 185km/h no-input offset | `0` |
| 고정 curve 185km/h 좌/우 offset | `-145.919u / +145.919u` |
| production diagnosis | `9/9 PASS` |
| production gameplay approval | `2/4 PASS` |

관련 회귀는 `qa:corner-handling`, `qa:guardrail-collision`, `qa:corner-demand-sweep`, `qa:handling-relations`와 production build가 모두 통과했다.

CH-2에서는 자동 corner scrub과 관성 기준 크기를 조정하지 않았다. full-throttle U2 launch는 최대 offset/road `0.145`, shoulder/rail `0 / 0`이며, 대표 자동 감속 코너는 `18.323km/h`를 잃고도 outward/road `0.177`에 머문다. 이제 진행 배율과 속도 법칙은 원인에서 제외됐고, 남은 안전한 중앙선은 CH-3의 “trajectory와 scrub 중 무엇이 먼저 발생하는가” 문제다.

#### CH-3 — 자동 감속과 바깥 trajectory의 순서 조정

상태: **완료 (2026-07-23)**

- corner speed budget과 tire scrub을 삭제하지 않는다.
- 과속 무조향에서는 바깥 trajectory가 먼저 발생하고, scrub은 slip/line miss의 결과로 속도를 잃게 한다.
- `180 → 150km/h` 자동 감속만으로 코너가 안전해지는 경우를 실패로 본다.
- prepared grip은 brake/lift로 demand를 미리 줄여 line과 exit speed를 보상받는다.
- understeer, base corner inertia와 drift momentum이 같은 벌점을 중복 적용하지 않게 책임을 나눈다.

완료 gate:

- 무조향 과속은 자동 감속 후 중앙 통과하지 않는다.
- prepared grip은 무조향보다 낮은 outward ratio와 높은 exit speed를 함께 얻는다.
- 감속을 늦췄다는 이유로 모든 sharp가 즉시 rail collision이 되지 않는다.

구현 결과:

- `cornerLimit`, overspeed-understeer와 severe scrub은 바깥 road ratio `0.16`부터 활성화하고 `0.32`에서 전량 적용한다.
- steering scrub과 플레이어의 brake/lift는 gate 밖에 둬 선제 조작은 즉시 속도에 반영한다.
- `trajectoryScrubRatio`를 runtime telemetry에 추가해 궤적과 감속의 순서를 직접 확인할 수 있게 했다.
- CH-2 단위 계약을 유지하면서 U1 기준 `cornerInertiaMaxLateralSpeed`를 `115 → 265u/s`로 올렸다. production sweep에서 `260`은 대표 sharp outward/road `0.690`으로 실패했고, `265`가 `0.701`로 처음 통과한 최소값이다.
- 새 관성에 맞춰 drift sustain acceleration을 `70 → 300u/s²`로 조정했다. 이는 drift가 자동으로 안쪽으로 가게 하는 보정이 아니라, 185km/h에서 실제 slip 입력이 코너 관성과 경쟁할 수 있게 하는 drift 상태 전용 권한이다.

검증 결과:

| gate | 결과 |
| --- | ---: |
| trajectory scrub 최초 활성화 | outward/road `0.173`, scrub ratio `0.013` |
| U2 launch 대표 sharp outward/road | `0.300 / 0.544 / 0.701` |
| U2 launch 최대 absolute offset/road | `0.386` |
| U2 launch shoulder / rail impact | `0 / 0` |
| U1/U2 fixed-corner outward ratio | `1.002` |
| 185/120km/h fixed-corner risk ratio | `2.323` |
| free no-input 비교 코너 outward/road | `0.424` |
| prepared grip 비교 코너 outward/road | `0.391` |
| free no-input 비교 코너 exit speed | `133.794km/h` |
| prepared grip 비교 코너 exit speed | `136.071km/h` |
| 고정 curve 130km/h grip line quality | `0.665` |
| 고정 curve 185km/h drift line quality | `0.580` |
| production diagnosis / gameplay | `9/9 PASS / 6/6 PASS` |

`qa:corner-production`, `qa:corner-handling`, `qa:corner-demand-sweep`, `qa:handling-relations`, `qa:guardrail-collision`과 production build가 모두 통과한다. straight 0-100은 `8.1초`로 유지되고 grip accidental drift도 `0`이다.

CH-3 자동 계약은 당시 완료됐지만, 아래 HR 재수정에서 승인 기준 오류를 확인해 다시 연다. 최대 absolute offset은 road의 `0.386`이고 대표 sharp의 `0.701`은 코너 entry에서 exit까지의 상대 이동량이므로 shoulder 위협을 증명하지 못한다.

#### 2026-07-23 runtime 로그 기반 heading 계약 재수정

첨부한 60초 full-throttle 로그는 progress `0.8215`까지 대부분 무조향으로 진행했지만 최대 absolute rail contact ratio `0.4676`, shoulder `0`, impact `0`이었다. progress 약 `0.17~0.25`의 반대 코너가 lateral offset을 `-208 → +323u`로 옮겼고, 다음 `0.29~0.36` 코너는 `+313 → -345u`로 도로를 가로질렀다. 이전 코너의 바깥 이탈이 다음 코너의 안쪽 셋업이 되어 조향 없는 S-curve 통과를 돕는다.

현재 controller는 vehicle heading을 보존하지 않는다. 현재 곡률 부호에서 `cornerInertiaLateralVelocity` target을 만들고, 직선에서는 target을 `0`으로 recovery한다. lateral position 기반 centering도 무입력 직선에서 최대 `12u/s`의 중앙 복귀 속도를 만든다. 따라서 곡률이 끝나면 차량이 새 road tangent에 자동 정렬된 것처럼 동작한다.

재수정 단계:

| 단계 | 변경 | 완료 gate |
| --- | --- | --- |
| HR-0 | 상대 outward 승인 폐기, runtime S-curve와 absolute shoulder/rail production 계약 추가 | 현재 build가 “상대 이동은 크지만 absolute threat는 없음”으로 의도적으로 차단됨 |
| HR-1 | `vehicleHeadingError` 또는 동등한 지속 road-relative velocity debt 추가 | 완료 — 무입력에서 curve exit·straight·반대 코너로 debt가 자동 소멸하거나 즉시 반전되지 않음 |
| HR-2 | steering wheel/self-align damping과 lateral position centering 분리 | 완료 — 무입력 straight에서 steering input은 중립이어도 차체가 도로 중앙으로 자동 이동하지 않음 |
| HR-3 | heading 기반 lateral response, scrub과 collision 재조정 | 선택 S-curve 무입력은 absolute shoulder/rail 위협, prepared grip은 회피 가능 |
| HR-4 | 물리 승인 뒤에도 판단 window가 부족한 코너만 sustained apex A/B | 코스 전체를 늘리지 않고 braking/turn-in/apex가 분리됨 |
| HR-5 | no-input / prepared grip / drift section 비교 | line, exit speed, section time이 서로 다른 유효 전략을 만듦 |

HR-0부터 HR-3까지는 코스 geometry를 통제 변수로 둔다. HR-1에서 heading 상태를 추가하기 전에 관성 상수를 더 키우지 않으며, HR-0 approval은 다음 절대 기준을 사용한다.

- `abs(lateralOffset) / pavedCenterLimit`: shoulder 접근과 진입의 1차 기준
- `guardrailShoulderRatio > 0`: 실제 shoulder 진입
- `guardrailImpactCount > 0`: rail collision
- entry 기준 상대 outward delta는 진단값으로만 기록하며 승인값으로 사용하지 않는다.

##### HR-0 — absolute S-curve production 계약

상태: **완료 (2026-07-23)**

물리·코스 상수는 변경하지 않고 `qa:corner-production`의 승인 기준을 교체했다.

- 각 sample과 corner에 `pavedCenterLimit`, `maxAbsOffsetPavedRatio`를 기록한다.
- progress `0.16~0.36`을 양방향 S-curve window로 고정하고 lateral span, absolute paved/rail ratio, shoulder와 impact를 기록한다.
- `maxOutwardRoadRatio`는 진단에 남기되 gameplay 승인을 통과시키지 않는다.
- selected sharp 승인은 absolute paved ratio `>= 0.9`, 실제 shoulder 진입 또는 rail impact 중 하나를 요구한다.

| 측정 | 첨부 runtime | deterministic HR-0 |
| --- | ---: | ---: |
| 진행 범위 | `0~0.8215` | S-window `0.16~0.359` |
| 상대 lateral 이동 | progress 30% 전후 약 `661u` | S-window span `674.166u` |
| 최대 absolute paved ratio | 로그에 직접 없음 | `0.511` |
| 최대 absolute rail ratio | `0.4676` | `0.386` |
| shoulder / rail impact | `0 / 0` | `0 / 0` |
| 기존 상대 outward 최대 | 해당 구간에서 큰 좌우 횡단 | `0.701` |

결과 상태는 `HR0_ABSOLUTE_CONTRACT_BLOCKED`, diagnosis `10/10 PASS`, gameplay approval `4/6 PASS`다. 실패 항목은 `selected-sharp-no-input-threatens-shoulder`와 `automatic-scrub-does-not-create-a-safe-line`이다. 이는 HR-0의 기대 결과이며, 기존 CH-3 `6/6` 완료 판정을 대체한다.

- [HR-0 JSON](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.json)
- [HR-0 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)

##### HR-1 — persistent vehicle heading debt

상태: **완료 (2026-07-23)**

현재 곡률 부호로 `cornerInertiaLateralVelocity`의 목표를 매 frame 교체하던 방식을 제거했다. `PlayerVehicleState.vehicleHeadingError`를 차량 방향과 현재 road tangent의 차이로 보존하고 아래 순서로 계산한다.

```text
roadHeadingRate
  = -currentCurve × 0.78 × longitudinalScale × speedRatio

steeringHeadingRate
  = gripSteerAxis × 2.0 × lateralAuthority × speedRatio

vehicleHeadingError
  += (roadHeadingRate + steeringHeadingRate) × dt
  clamp ±0.62rad

cornerInertiaTarget
  = headingError / 0.62
  × cornerInertiaMaxLateralSpeed
  × longitudinalScale
  × speedRatio
  × downhillLateralScale
```

직선에서는 road heading rate가 `0`일 뿐 heading error를 `0`으로 approach하지 않는다. 반대 방향 코너도 새 부호의 횡속도를 바로 지정하지 않고 기존 debt를 먼저 상쇄한다. 정지 수준에서는 상태를 reset하고, rail 충돌 때는 다른 횡속도와 같은 `0.22` damping을 적용한다. runtime telemetry와 debug HUD에도 `vehicleHeadingError`를 기록한다.

`qa:heading-debt` 결과:

| 계약 | 결과 |
| --- | ---: |
| 185km/h right curve exit heading / inertia | `-0.6158rad / -360u/s` |
| 0.35초 straight exit heading / inertia | `-0.6158rad / -432.9591u/s` |
| opposite curve 첫 frame heading / inertia | `-0.6021rad / -423.3378u/s` |
| opposite curve 0.75초 뒤 heading / inertia | `+0.0137rad / +7.9998u/s` |
| 같은 코너 steer `+0.65` heading | `-0.3151rad` |
| 구조 계약 | `5/5 PASS` |

production S-window는 HR-0의 `paved 0.511 / rail 0.386 / impact 0`에서 `paved 1.379 / rail 1.0 / impact 3`으로 바뀌었다. 따라서 무입력 S-curve가 이전 코너의 자동 안쪽 셋업만으로 안전하게 통과하던 문제는 제거됐다.

현재 production 진단은 `10/10 PASS`, gameplay는 `5/6 PASS`, 상태는 `HR1_HEADING_READY_HR3_TUNING_BLOCKED`다. prepared grip도 shoulder/rail에 닿는 한 항목은 실패로 유지한다. 또한 기존 drift useful-line과 corner-demand 수치 계약은 새 heading 구조에서 일부 실패한다. 이 값을 억지로 이전 baseline에 맞추지 않고 HR-2 이후 HR-3에서 grip/drift 응답과 scrub을 함께 재승인한다.

- [HR-1 구조 계약](../../games/apex-seoul/scripts/audit-heading-debt-contract.mjs)
- [HR-1 production 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)

##### HR-2 — neutral centering separation

상태: **완료 (2026-07-23)**

기존 controller는 무입력 straight/easy에서 `-lateralOffset × centeringResponse`를 steering force에 더했다. 또한 중앙 방향으로 움직이는 neutral steering velocity를 `neutralReturnVelocityCap`으로 위치 기준 제한했다. 이 두 동작 때문에 핸들을 놓은 상태가 “조향 입력 0”이 아니라 “도로 중앙으로 돌아가라”는 숨은 명령으로 작동했다.

HR-2에서는 다음 책임으로 분리했다.

```text
neutral input
  centeringForce = 0
  steeringVelocity → 0 by steerDamping
  visual steering → 0 by input response
  lateralOffset target 없음

active input
  steeringForce 적용
  기존 counter/line correction centering ramp 유지
```

neutral 상태의 `lateralOffsetDirection` 기반 inward velocity cap도 제거했다. 따라서 이미 존재하는 횡속도는 damping으로 자연스럽게 줄지만 중앙을 향해 반전되지 않는다. heading debt와 drift/inertia velocity는 별도 상태이므로 무입력에서도 자신의 물리 방향을 계속 반영한다.

`qa:neutral-centering` 결과:

| 계약 | 결과 |
| --- | ---: |
| offset `360u`, neutral 2초 뒤 offset | `360u` |
| 같은 run의 centering force / steering velocity | `0 / 0` |
| 초기 inward velocity `-120u/s`, 1.5초 뒤 | offset `350.2174u`, velocity `0` |
| release 뒤 visual steering | `0` |
| active `-0.55` correction 0.75초 뒤 offset | `163.9386u` |
| heading `+0.25rad`, neutral straight 0.5초 뒤 | heading `+0.25rad`, offset `417.1642u` |
| 구조 계약 | `6/6 PASS` |

production launch의 neutral sample `2,803`개에서 최대 centering force는 `0`이다. absolute threat는 계속 유지되며 S-window는 paved ratio `1.379`, shoulder `1`, impact `7`이다. HR-1의 같은 window impact `3`보다 충돌이 늘어난 것은 자동 중앙 복귀가 실제로 궤적을 구제하고 있었다는 증거다.

현재 상태는 `HR2_CENTERING_SEPARATED_HR3_TUNING_BLOCKED`다. production 진단 `11/11`, gameplay `5/6`이며 실패는 prepared grip 무접촉 통과다. corner handling의 drift useful-line과 일부 corner-demand 기존 수치도 계속 차단되어 있다. HR-3에서 persistent heading의 response, grip/drift authority, trajectory scrub과 collision damping을 하나의 production 계약으로 조정한다.

- [HR-2 구조 계약](../../games/apex-seoul/scripts/audit-neutral-centering-contract.mjs)
- [HR-2 production 보고서](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)

##### HR-2 runtime 재검증과 OutRun 비교

2026-07-23 HR-2 브라우저 로그 `apex-seoul-drive-2026-07-23T10-40-59-246Z_b3zo0g.jsonl`은 60초 동안 progress `0.6735`까지 진행했다. accel `533/538`, brake `0`, steer `142` sample의 full-throttle correction run이다.

| 측정 | 결과 |
| --- | ---: |
| neutral centering force 최대 | `0` |
| active-input centering force 최대 | `2695.555` |
| lateral offset 범위 | `-456.355 ~ +446.144u` |
| rail ratio 최대 | `0.5686` |
| shoulder / impact | `0 / 0` |
| heading error 범위 | `-0.62 ~ +0.62rad` |
| inertia 최대 절대값 | `485.63u/s` |
| 최고 속도 | `202.5km/h` |

HR-2의 자동 중앙 복귀 제거는 runtime에서도 확인됐다. 또한 플레이어 correction으로 모든 코너를 shoulder 없이 통과했으므로 현재 모델이 조작 불가능한 것은 아니다. 다만 heading이 양쪽 hard limit `±0.62rad`에 반복적으로 붙고, full steer가 이를 반대 hard limit까지 빠르게 넘긴다.

- 첫 right에서 무입력 `0~12.68초`: offset `0 → -380u`, heading `0 → -0.62rad`
- 이어진 steer `+1`, `12.78~14.78초`: heading `-0.61 → +0.62rad`
- progress `0.261~0.315` 무입력: curve `-0.03 → +0.64`, heading `+0.06 → -0.62rad`
- progress `0.384~0.432` 무입력: curve `+0.02 → -0.65`, heading `-0.25 → +0.60rad`

이 수치는 “코너 반대로 차를 던지고 다시 받는” 감각을 만들지만, road tangent 회전 전체를 미조향 debt로 적립한 뒤 hard clamp하는 현재 구조가 정상 grip 주행까지 관성 투사체처럼 보이게 만드는 원인이기도 하다.

원본 OutRun의 접근은 다르다. 원본 68000/Z80 코드를 C++로 다시 작성한 [Cannonball](https://github.com/djyt/cannonball)은 steering을 직접 car X 변화로 변환하고, 속도가 낮을 때 조향량을 줄이며, sharp/high-speed 조건에서는 코너 안쪽 조향 권한을 낮춘다. 별도의 [`set_curve_adjust()`](https://github.com/djyt/cannonball/blob/master/src/main/engine/oferrari.cpp#L3617-L3654)는 near/far road X 차이를 속도에 곱해 car X에 더한다. 소스 주석도 이것이 직선으로 코스를 뚫는 것을 막고 차를 track에 붙인다고 명시한다. 이후 wheel 위치가 road threshold를 넘었을 때 traction/off-road 상태를 바꾼다.

따라서 OutRun은 “도로가 꺾인 만큼 차량 heading debt를 전부 누적하고 결국 rail에 충돌”하는 모델이 아니다. 기본 road-follow 성분 위에서 조향 권한, off-road와 속도 손실을 게임화한다. OutRun 2도 drift를 평상시 무조향 결과가 아니라 lift→brake와 빠른 corner steering 또는 downshift+steering으로 시작하는 명시적 기술로 설명한다. [OutRun 2 SP 공식 운영 매뉴얼 47쪽](https://www.mamechannel.it/files_free/arcade_manuals_unpacked/outr2st.pdf)

Apex Seoul은 원본 OutRun보다 코너 공략과 line 선택이 중요한 time attack을 목표로 하므로 track-stick을 그대로 복제하지 않는다. 대신 HR-3을 **road-follow baseline + residual slip debt** 구조로 보강한다. 이는 HR-2를 되돌리는 lateral-position centering이 아니다. 도로 중앙 위치를 목표로 삼지 않고, 타이어가 감당 가능한 vehicle yaw만 road demand에 배분한다.

```text
requiredRoadYawRate
  = previewRoadTangentChange × worldSpeed

passiveGripYawRate
  = requiredRoadYawRate
  × gripFollowAuthority(speed, cornerGrade, traction)

steeringYawRate
  = input × steerAuthority(speed, grip/drift state)

unmetYawRate
  = requiredRoadYawRate
  - passiveGripYawRate
  - steeringYawRate

headingDebt += unmetYawRate × dt
lateralSlip = softResponse(headingDebt, speed, grip state)
```

보강된 HR-3 실행 순서 — 2026-07-23 완료:

1. **HR-3A — point curve를 preview tangent demand로 교체**
   - 단일 contact `currentCurve` 대신 차량 접점부터 near/far lookahead까지의 road tangent 변화량을 사용한다.
   - OutRun의 `road_x[170] - road_x[511]`처럼 코너 진입을 공간 window로 읽되 현재 road projection 좌표에 맞는 독립 함수를 만든다.
   - curve ramp의 순간값과 실제 화면에서 보이는 코너 진행이 어긋나지 않게 한다.
2. **HR-3B — passive grip yaw capacity 추가**
   - easy와 목표 속도 이하에서는 road demand의 대부분을 정상 타이어 yaw로 처리한다.
   - medium/sharp, overspeed, downhill carry에서는 follow authority가 부족해 residual heading debt가 생긴다.
   - `lateralOffset`을 참조하지 않으며 도로 중앙으로 복귀시키지 않는다.
3. **HR-3C — hard heading clamp를 soft slip response로 교체**
   - `±0.62rad` 체류 시간을 줄이고 heading 증가가 횡속도 최대값으로 즉시 고정되지 않게 한다.
   - 사용자가 좋다고 평가한 반대 방향 turn-in/counter transient는 유지하되, full steer 한 번으로 debt가 반대 hard limit까지 왕복하는 binary 응답을 완화한다.
4. **HR-3D — grip/drift/shoulder 결과 재조정**
   - prepared grip은 lift/brake와 turn-in으로 passive+steering yaw capacity를 확보한다.
   - drift는 명시적 entry 뒤 더 큰 slip 허용량과 counter 회수 window를 가진다.
   - shoulder scrub이 rail보다 먼저 경고와 시간 손실을 만들며, rail은 지속적인 미대응 또는 큰 overspeed의 결과로 둔다.
5. **HR-3E — production 속도×곡률 matrix 승인**
   - easy/medium/sharp × `120/160/200km/h`
   - neutral, late steer, prepared grip, intentional drift
   - time-to-paved-edge, time-to-shoulder, heading-limit residency, steer-to-yaw delay, exit speed와 section time을 기록한다.

HR-3 완료 gate를 다음처럼 수정한다.

- easy 또는 목표 속도 이하 neutral은 road-follow baseline으로 즉시 rail에 향하지 않는다.
- 선택 sharp의 overspeed neutral은 점진적으로 paved edge와 shoulder를 위협하며, 계속 미대응하면 rail에 도달한다.
- 위협이 발생하기 전에 화면상 코너와 telemetry에 최소한의 turn-in 판단 window가 존재한다.
- prepared grip은 shoulder 없이 통과하고 neutral보다 line·exit speed·section time이 좋다.
- intentional drift는 별도 entry와 counter가 필요하고 성공 시 유효한 line 또는 time 선택지를 만든다.
- neutral centering force는 계속 `0`이며 passive grip yaw가 lateral position을 중앙으로 당기지 않는다.
- heading hard-limit residency와 한 번의 입력으로 양 limit를 왕복하는 횟수를 진단값으로 고정한다.

##### HR-3 구현 결과

HR-3A~E를 순서대로 구현했다.

- `getRoadHeadingPreview()`가 차량 접점부터 `480u / 1,440u` 구간의 곡률을 적분하고 near `68%`, far `32%`로 preview demand를 만든다.
- controller는 `requiredRoadYawRate`, `passiveGripYawRate`, `residualRoadYawRate`를 분리한다. passive grip은 위치를 읽지 않고 corner grade, overspeed, lift/brake와 drift state만 사용한다.
- heading debt에는 residual yaw와 steering yaw만 적립한다. 기존 `±0.62rad` clamp를 제거하고 `tanh` 횡속도 응답과 `0.72rad` 이후의 progressive self-align으로 교체했다.
- steering yaw authority를 재조정하고, prepared grip 계약은 짧은 lift 뒤 heading-aware turn-in/recovery를 사용한다.
- runtime telemetry에 preview curve, near/far tangent change, required/passive/residual yaw와 grip follow authority를 추가했다.

Production 계약은 diagnosis `14/14`, gameplay approval `6/6`이다. 무입력 launch는 선택 sharp와 S-curve에서 shoulder/rail 위협을 유지한다. 같은 첫 코너의 prepared grip은 최대 paved ratio를 `1.333 → 0.718`, 최대 heading을 `0.689 → 0.330rad`, impact를 `2 → 0`으로 줄였고 동일 구간 종료 속도는 `121.225 → 138.834km/h`로 `17.609km/h` 높았다.

`easy / medium / sharp × 120 / 160 / 200km/h × neutral / late steer / prepared grip / intentional drift` 36개 조합도 `6/6` gate를 통과했다. 대표값은 다음과 같다.

| 대표 시나리오 | 최대 offset | 최대 heading | shoulder / rail |
| --- | ---: | ---: | --- |
| easy 120 neutral | `46.105u` | `0.0418rad` | no / no |
| sharp 200 neutral | `700u` | `0.8415rad` | yes / yes |
| sharp 200 prepared grip | `406.937u` | `0.4236rad` | no / no |
| sharp 200 intentional drift | `391.578u` | `1.0103rad` | no / no |

- [HR-3 production 계약](../../games/apex-seoul/assets/telemetry/generated/corner-production/production-corner-contract.md)
- [HR-3E 36-case matrix](../../games/apex-seoul/assets/telemetry/generated/hr3-handling-matrix/hr3-handling-matrix.md)
- [HR-3E audit](../../games/apex-seoul/scripts/audit-hr3-handling-matrix.mjs)
- [HR-2 runtime 로그](../../apex-seoul-drive-2026-07-23T10-40-59-246Z_b3zo0g.jsonl)

#### CH-4 — 선택적 코스 apex 재설계

CH-0~CH-3 뒤에도 판단 window가 짧을 때만 코스를 바꾼다.

- 첫 right, 대표 left와 후반 S에서 한 곳씩 후보를 고른다.
- `turn-in ramp → 2~4 segment sustained apex → exit unwind` 구조를 A/B한다.
- peak curve와 narrow road width를 동시에 키우지 않는다.
- easy sweep과 recovery straight는 그대로 유지한다.
- 화면 속도감을 위해 줄였던 전체 코너 체류 시간을 다시 장시간으로 되돌리지 않는다.

완료 gate:

- braking point, turn-in, apex와 exit가 조작 사건으로 구분된다.
- selected sharp는 조향 없이 통과하기 어렵지만 반복 학습이 가능하다.
- 전체 코스가 sharp 연속이나 긴 단일 steering hold로 바뀌지 않는다.

#### CH-5 — grip/drift time attack 승인

동일 start와 코너 section에서 최소 세 주행을 비교한다.

```text
no-input/full-throttle control
prepared grip
drift + counter steer
```

측정값:

- section time
- entry/apex/exit speed
- outward/road ratio와 line quality
- shoulder/rail contact
- drift entry, max ratio, counter time과 recovery
- steering workload와 exit 방향 안정성

완료 gate:

- no-input control은 가장 쉬운 정답이 아니다.
- prepared grip은 안정적인 기준선이며 반복할수록 line과 기록을 개선할 수 있다.
- drift는 일부 조건에서 진입 속도 또는 line 선택의 장점이 있지만 실패 비용도 있다.
- 두 주법의 차이가 sprite만이 아니라 section time과 exit state에 남는다.
- 이 계약을 승인한 뒤에만 countdown/result/best-record time attack UI를 구현한다.

### 필수 회귀

```bash
npm run qa:corner-handling --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:handling-relations --workspace @games/apex-seoul
npm run qa:guardrail-collision --workspace @games/apex-seoul
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:outrun-longitudinal-ab --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

CH-0에서 production track replay 명령을 별도 script로 추가한다. 기존 gate 완화를 먼저 하지 않고, 새 관성 관계 때문에 의도적으로 달라져야 하는 항목만 근거와 함께 갱신한다.

### 후속 블로그 기록 후보

이미 발행된 글은 수정하지 않는다. CH-0~CH-5 완료 뒤 별도 후속 글에서 다음 흐름을 사용한다.

1. `lateralOffset = 0`을 직진으로 오해해 도로 중심이 자동 주행선이 된 발견
2. 고정 곡률 3초 QA는 통과했지만 실제 U2 코너에서는 최대 `97u`만 움직인 차이
3. longitudinal speed를 두 배로 만들면서 횡관성이 작용할 시간은 절반으로 줄인 단위 불일치
4. 코너를 짧게 만든 화면 속도감 개선이 gameplay 판단 window와 충돌한 과정
5. 자동 speed scrub과 바깥 trajectory의 순서를 다시 나눈 이유
6. no-input, prepared grip, drift의 동일 section time 비교
7. 물리 수정 뒤에도 선택적 apex가 필요했는지에 대한 최종 판단

## 기존 0~185km/h 핸들링 기록

아래 내용은 2026-07-20 P0~P5의 설계 근거와 승인값을 보존한다. 현재 코너 관성 작업 순서는 위 CH-0~CH-5를 우선한다.

### 당시 결론

현재 어색함의 중심은 조향력이 단순히 너무 강하거나 약한 데 있지 않다. 저속에서는 같은 authority가 여러 단계에 중복 적용되고, 고속에서는 조향력·최대 조향각·입력 응답·횡속도 상한·차량 pose가 각각 감쇠된다. 그 결과 속도가 오를수록 자연스럽게 무거워지는 대신 아래와 같은 단절이 생기기 쉽다.

- `0~30km/h`: 입력은 들어오지만 차가 거의 움직이거나 보이지 않는다.
- `30~60km/h`: 잠겨 있던 횡이동과 pose가 한꺼번에 살아난다.
- `60~110km/h`: 가장 자연스러워야 할 일반 grip 구간의 명시적 목표가 없다.
- `110~170km/h`: 기본 고속 감쇠와 코너 과속 understeer의 역할이 겹친다.
- `170~185km/h`: 안정감보다 입력 지연과 화면 pose 약화가 먼저 느껴질 수 있다.

개선 방향은 **속도별 기본 조향 감각**과 **코너 과속의 결과**를 분리하는 것이다. 속도대는 QA와 의사소통을 위한 이름으로만 사용하고, 실제 값은 연속 곡선으로 보간한다. 구현 순서는 저속 연결성 → 일반 grip 기준 → 고속 무게 → 코너/드리프트 overlay → 시각 동기화다.

## 범위

이번 계획이 다루는 것:

- steering input의 시작, 유지, 해제 감각
- 속도별 lateral authority와 횡속도 상한
- 중앙 복귀와 반대 조향의 속도별 반응
- grip의 기본 조향각과 고속 안정성
- 차량 sprite pose가 실제 trajectory를 설명하는 정도
- grip, overspeed understeer, drift의 책임 분리
- 속도 sweep 자동 QA와 실주행 평가 절차

이번 반복에서 직접 바꾸지 않는 것:

- 엔진 출력, 기어비, `0–100km/h`, 표시 최고속. Raven Coupe의 FT86 기반 구동계 개선은 [별도 파워밴드 계획](./apex-seoul-raven-ft86-powerband-plan.md)에서 관리한다.
- 코스 geometry와 curve grade 경계
- 카메라 FOV, speed shader, roadside object 밀도
- 차량별 별도 grip 성격
- drift 물리를 시뮬레이터 수준으로 확장하는 작업

## 현재 기준선

2026-07-21 현재 Raven Coupe의 FT86 기반 물리 속도 envelope는 `225km/h`로 갱신됐다. 이 문서의 기존 `0~185km/h` 조향 sweep은 핸들링 회귀 기준으로 유지하고, 구동계·속도계·0-100 기준은 [Raven/FT86 파워밴드 계획](./apex-seoul-raven-ft86-powerband-plan.md)을 따른다.

자동 기준선:

| 항목 | 현재 결과 | 해석 |
| --- | ---: | --- |
| 정지 2초 풀 조향 | offset `0u`, visual `0` | 정지 횡이동 잠금은 정상 |
| 10km/h 2초 풀 조향 | offset `0.1637u`, visual `0.0213` | crawl 조향이 사실상 보이지 않음 |
| 30km/h authority | `0.432` | 수치 자체보다 중복 적용이 문제 |
| 60km/h 2초 풀 조향 | offset `233.0486u`, visual `0.7655` | 10→60km/h 사이 체감 변화가 너무 큼 |
| 185km/h sharp overspeed grip | understeer `1.0`, 평균 grip authority `0.433`, max offset `89.111u` | 제한은 강하지만 trajectory 변화는 작아 둔감함으로 읽힐 수 있음 |
| handling simulation baseline | `73.1/100` | 비교용 지표. 그대로 출시 gate로 쓰기에는 scoring 보정이 필요 |
| standing start | Raven `0–100=8.117초`, pass | 구동계 측정은 별도 파워밴드 문서에서 관리 |

`qa:handling-sim`의 가장 큰 관계 실패는 downhill sharp가 level sharp보다 바깥 이동을 `35u` 이상 더 만들어야 한다는 기준에서 실제 차이가 `-0.456u`였던 항목이다. 반면 prepared grip처럼 의도적으로 브레이크를 쓰는 시나리오도 공통 `speedDropFromPeak`에 감점된다. 따라서 현재 점수는 후보 간 비교에는 사용하되, P0에서 의도적 감속을 실패로 세는 scoring부터 분리해야 한다.

## 2026-07-20 구현 결과

P0~P4를 한 번에 적용했다.

- raw normalized speed에 `0 / 5 / 10 / 30 / 60 / 110 / 145 / 170 / 185km/h` 대응 knot를 만들었다.
- lateral authority, steering force, velocity cap, centering, neutral return cap, grip angle, input response, slew, visual yaw를 하나의 연속 sample로 계산한다.
- 저속 authority를 steering force와 최종 offset 적분에 중복 적용하던 구조를 제거했다.
- 정지 상태의 숨은 steering preload를 없앴다.
- controller visual yaw와 render visual scale의 기본 중복 감쇠를 제거했다. runtime visual scale은 기본 `1`인 명시적 QA override로만 남겼다.
- overspeed pose는 입력을 보여 주고, 실제 trajectory는 별도 understeer authority와 outward velocity로 제한한다.
- intentional brake/lift 시나리오를 공통 `speedDropFromPeak` 감점에서 분리했다.
- downhill 관계는 부호를 잃는 절대 offset보다 실제 도로 안전 여유 사용량 차이로 검사한다.

자동 검증 결과:

| 항목 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| 10km/h 2초 풀 조향 offset | `0.1637u` | `7.1385u` |
| 10km/h visual steering | `0.0213` | `0.0804` |
| 60km/h 2초 풀 조향 offset | `233.0486u` | `282.2302u` |
| 110→185km/h 1초 hold offset | 별도 sweep 없음 | `143.718→75.163u`, 연속 감소 |
| 110→185km/h hold pose | 별도 sweep 없음 | `1.000→0.629`, 최고속에서도 유지 |
| sharp overspeed max offset | `89.111u` | `127.366u` |
| sharp prepared understeer | 기준선에 scoring 오류 포함 | understeer `0`, authority `1.0` |
| downhill sharp safety margin | level 대비 증가 실패 | level `0.019` → downhill `0.254` |
| handling simulation baseline | `73.1/100` | `91.3/100` |

`qa:speed-handling-sweep`, `qa:low-speed-steering`, `qa:standing-start`, `qa:guardrail-collision`, `qa:vehicle-steering`, production build가 모두 통과했다. handling matrix에는 sharp drift outside/apex entry loss가 목표 `20u`보다 작은 `18.005u`인 warning 하나가 남아 있다. 이번 변경에서 drift 자체의 loss를 억지로 키우지 않고 P5 수동 주행에서 체감을 먼저 확인한다.

### 2026-07-20 언더스티어 발동 기준 보정

언더스티어 발동을 `가속 페달을 누른 상태`에서 분리했다. 이제 grip 상태에서 실제 조향 요청이 들어오면 효과의 크기는 코너가 요구하는 속도 예산과 현재 속도의 차이로 결정된다.

```text
cornerDemandOverspeed = smoothstep(
  max(currentSpeed - cornerSpeedBudget, 0) / overspeedSpeedWindow
)

understeerTarget =
  gripState
  × steeringDemandGate
  × cornerGradeDemandScale
  × cornerDemandOverspeed
```

- `accelPressed`는 계산에 참여하지 않는다. 코스팅 중에도 현재 속도가 코너 예산보다 높으면 언더스티어가 유지된다.
- 조향 최소 입력은 타이어에 실제 선회 요구가 들어왔는지 확인하는 gate로만 사용하며, 언더스티어 강도를 결정하지 않는다.
- 감속으로 `currentSpeed - cornerSpeedBudget`이 줄거나 코너를 벗어나면 기존 recovery rate로 자연스럽게 해제된다.
- drift 상태에서는 grip understeer overlay를 끄고 drift 모델에 authority를 넘긴다.
- straight/easy 또는 무조향 상태에는 추가 outward force를 만들지 않는다.

추가한 `sharp-overspeed-demand-only` 시나리오는 가속 입력 없이 sharp 코너에 진입한다. 결과는 entry understeer `0.42`, max understeer `1.0`, outward lateral velocity `146.549u/s`, accidental drift `0`으로 통과했다. 기존 `curve-no-input`은 understeer `0`, max offset `35.832u`로 유지됐다. 시나리오 추가 후 handling baseline은 `91.4/100`이며 기존 sharp drift warning 하나만 남는다.

## 구조 진단

### 1. 저속 authority가 중복 적용된다

현재 `lowSpeedLateralAuthority`는 다음 경로에 들어간다.

```text
steeringForce × authority
curveForce × authority
lateralVelocityLimit × authority
최종 lateralOffset 적분 × authority
```

30km/h의 authority `0.432`는 기본 steering 경로에서 체감상 약 `0.432²` 수준으로 다시 약해질 수 있다. 10km/h의 authority는 `0.0222`라 중복 적용 뒤에는 사실상 0에 가깝다. 정지 잠금은 필요하지만, 출발 뒤에도 차가 오래 죽어 있다가 60km/h 근처에서 갑자기 살아나는 것은 의도한 감각이 아니다.

### 2. 화면에 숨긴 조향과 내부 조향 상태가 다르다

정지 상태에서도 controller의 `steering`은 풀 입력에 거의 `1`까지 올라간다. render 단계가 `lowSpeedVisualSteeringAuthority=0`으로 이를 숨길 뿐이다. 속도가 오를 때 이미 포화된 내부 조향이 authority 곡선을 따라 나타날 수 있어, 입력 시작과 차량 pose 시작이 같은 사건으로 읽히지 않는다.

### 3. 고속 감쇠가 여러 채널에서 겹친다

현재 최고속으로 갈수록 다음 값이 동시에 줄어든다.

- steering force: 최대 `54%` 감소
- grip steer angle: 최고속 입력 상한 `0.72`
- input response: 최대 `28%` 감소
- lateral velocity cap: 최고속 `70u`
- controller visual steering: 최대 `43%` 감소
- render visual scale: 최고속 `0.62`
- sprite의 weak steering threshold: `0.14 → 0.34`

180km/h에서 full grip 입력의 기본 pose 전달량은 velocity cue를 제외하면 대략 `0.754 × 0.582 × 0.630 = 0.276`이다. 같은 구간의 weak pose threshold는 약 `0.335`다. 즉 큰 입력도 차량 그림에서는 중앙 pose처럼 남을 수 있다. 과속 sharp에서는 여기에 understeer 감쇠가 다시 곱해진다.

### 4. 중앙 복귀는 고속 steering 감쇠와 같은 비율로 줄지 않는다

고속에서 플레이어 steering force는 약해지지만 offset 기반 centering force는 저속 authority 외에는 같은 기본 응답을 유지한다. hold, neutral release, counter 입력에 따라 scale을 조정하는 로직은 있으나 속도별 목표는 없다. 이 조합은 고속 안정성이 아니라 보이지 않는 중앙 자석이나 입력과 싸우는 감각이 될 수 있다.

### 5. 속도 기준이 섞여 있다

- 저속 authority: 표시 `km/h`
- 일반 고속 감쇠: raw `speed / accelSpeed`
- drift entry: raw speed ratio `0.55`
- corner understeer: corner speed budget 초과 raw unit

표시 속도는 차량 profile별 보정값이다. 표시값이 물리에 다시 들어가면 같은 raw speed에서도 차량별 저속 조향이 달라질 수 있다. controller 안에서는 하나의 normalized handling speed를 사용하고, 문서와 HUD에서만 Raven 기준 km/h로 번역해야 한다.

## 목표 감각

### 공통 원칙

1. **즉시 읽히고, 천천히 움직인다.** 고속에서도 입력 cue 자체를 늦추지 않는다. 대신 지속 입력의 횡이동량과 최대 trajectory 변화량을 줄인다.
2. **저속 잠금은 한 번만 적용한다.** 정지 sidestep은 막되 authority를 force와 최종 적분 양쪽에 중복 적용하지 않는다.
3. **일반 grip이 기준이다.** understeer와 drift를 모두 끈 상태에서 속도별 tap/hold/release가 먼저 자연스러워야 한다.
4. **과속은 반경과 출구 비용으로 표현한다.** 단순 input lag나 화면 pose 삭제로 표현하지 않는다.
5. **pose는 trajectory를 설명한다.** 물리 steering, 실제 횡속도, slip 중 무엇을 보여 주는지 상태별로 명확히 한다.
6. **속도대 경계는 상태 전환이 아니다.** 모든 계수는 연속 보간하고 경계 통과 시 snap이 없어야 한다.

### 속도대별 설계

아래 km/h는 Raven Coupe의 현재 표시 속도다. controller 구현은 이에 대응하는 normalized raw speed knot를 사용한다.

| 속도대 | 역할 | 목표 감각 | 기본 grip 계획 | 코너/드리프트 계획 |
| --- | --- | --- | --- | --- |
| `0~5km/h` | 정지 | 입력해도 옆으로 미끄러지지 않음 | lateral authority `0`, steering command도 pose를 선행 포화시키지 않음 | drift 강제 해제 |
| `5~30km/h` | 출발·crawl | 느리지만 입력 방향은 읽힘 | authority를 한 번만 적용, visual steer는 약하게 먼저 반응, 10km/h 2초 offset 목표 `1~8u` | drift 잠금, curve force 최소화 |
| `30~60km/h` | 저속 연결 | 60km/h에서 갑자기 차가 풀리지 않음 | authority를 연속 회복, 30km/h 2초 offset 잠정 목표 `45~100u`, pose는 `steer-1` 중심 | grip만 허용, 중앙 복귀는 빠르되 overshoot 금지 |
| `60~110km/h` | 일반 grip 기준 | 가장 직접적이고 예측 가능한 구간 | steering response 기준값 `1.0`, 작은 tap과 1초 hold가 모두 읽힘, release가 한 번에 중앙으로 당기지 않음 | easy/medium은 grip 우선, drift entry는 상단부부터만 허용 |
| `110~145km/h` | technical 준비 | 반응은 즉시 보이되 지속 입력이 조금 무거워짐 | force 자체보다 lateral gain과 max trajectory를 완만히 낮춤, grip angle 약 `1.0→0.88` | medium은 lift가 line 선택에 의미를 갖고 sharp는 brake/lift 준비 구간 |
| `145~170km/h` | commitment | 입력을 바꾸면 차가 흔들리지 않지만, 미리 준 입력은 유지됨 | grip angle 약 `0.88→0.78`, neutral return을 저속보다 느리게, counter tap은 snap 없이 작동 | medium overspeed와 sharp 진입 비용 활성화, drift는 의도 입력일 때만 진입 |
| `170~185km/h` | 최고속 보상 | straight/easy에서 안정적이지만 조향 불능은 아님 | 기본 grip angle 하한 약 `0.72`, 입력 cue는 유지, 횡속도와 slew를 제한해 twitch만 억제 | sharp 과속은 별도 understeer overlay로 바깥 반경과 exit loss 생성 |

수치 범위는 첫 구현값이 아니라 자동 sweep과 실주행을 시작하기 위한 잠정 gate다. 특히 offset 절대값은 도로 폭과 vehicle anchor 조정의 영향을 받으므로, 최종 완료 조건은 인접 속도 간 연속성과 동일 입력 관계를 함께 본다.

## 제안 구조

### 1. 하나의 연속 speed handling profile

`playerVehicleController.ts`에 속도별 값을 흩뿌리지 않고, 한 번 계산한 profile sample을 사용한다.

```text
SpeedHandlingSample
  speedRatio
  lateralAuthority
  steeringCommandResponse
  steeringForceScale
  lateralVelocityCap
  gripAngleCap
  centeringScale
  neutralReturnVelocityCap
  visualYawScale
  visualYawResponse
```

권장 knot는 Raven 표시 기준 `0 / 5 / 30 / 60 / 110 / 145 / 170 / 185km/h`다. 실제 lookup key는 raw speed ratio이며, knot 사이는 monotonic cubic 또는 smoothstep으로 보간한다. 7개의 독립적인 if 분기를 만드는 방식은 사용하지 않는다.

### 2. 저속 authority 적용 지점 단일화

권장 순서:

```text
input → steering command → desired lateral acceleration
→ speed profile로 1회 제한 → velocity integration → offset integration
```

- 정지에서는 최종 lateral motion을 0으로 고정한다.
- `steeringForce`와 마지막 `lateralOffset` 적분에 같은 authority를 동시에 곱하지 않는다.
- curve, drift, counter처럼 별도 momentum을 가진 항목도 최종 합계에서 다시 authority를 중복 곱하지 않는다.
- 저속 pose는 물리 authority를 그대로 복사하지 않고 별도의 작고 빠른 visual cue로 만든다.

### 3. 기본 grip과 context overlay 분리

최종 조향은 다음 책임 순서로 조합한다.

```text
base speed profile
× grip/drift state authority
× corner overspeed trajectory penalty
+ drift momentum
+ guardrail impulse
```

- base profile: straight에서도 느껴지는 속도별 무게
- overspeed overlay: medium/sharp에서 budget을 넘겼을 때만 생기는 넓은 반경과 exit 비용
- drift: grip angle cap을 우회하지만 별도 momentum/counter cap을 사용
- guardrail: 속도 profile로 약화하지 않는 충돌 사건

이 분리 뒤에는 고속 기본 grip을 둔하게 만들어 과속을 표현하지 않는다.

### 4. visual steering 단일 소유권

현재 controller visual drop, render visual scale, threshold 상승의 3중 감쇠를 하나의 visual profile로 합친다.

- grip pose: steering command와 실제 횡속도를 혼합해 turn intent를 보여 준다.
- overspeed understeer: pose를 지우지 않고, 입력 대비 trajectory가 넓어지는 것으로 보여 준다.
- drift pose: 기존처럼 drift direction과 counter trim을 사용한다.
- threshold는 속도별 pose scale과 별도로 크게 올리지 않는다.

최고속 full input도 최소 `steer-1`은 읽혀야 하며, `steer-2` 사용 여부는 실제 lateral demand로 결정한다.

### 5. 속도 기준 통일

- controller: raw `speed / accelSpeed` 기반 `handlingSpeedRatio`
- telemetry/HUD/문서: engine profile을 이용해 표시 km/h 병기
- 차량별 차이: 이후 별도 `vehicleHandlingProfile` multiplier로 추가
- 표시 최고속만 바꿔도 lateral physics가 바뀌는 구조는 금지

## 실행 플랜

### P0 — 측정 기준 보정

핸들링 수치를 바꾸기 전에 현재 상태를 고정한다.

- 새 `qa:speed-handling-sweep`을 추가한다.
- Raven 기준 `0, 5, 10, 30, 60, 90, 110, 130, 145, 160, 170, 180, 185km/h`를 측정한다.
- 각 속도에서 neutral, `150ms tap`, `1s hold`, `hold→release`, `counter tap`을 실행한다.
- straight, easy, sharp를 분리하고 sharp는 prepared/overspeed를 나눈다.
- 측정값: input onset, steering command, lateral velocity, offset, pose, neutral half-life, overshoot, speed loss.
- 의도적으로 브레이크를 쓰는 시나리오는 공통 `speedDropFromPeak` 실패 기준에서 제외하고 entry/apex/exit 관계로 평가한다.
- 현재 handling simulation의 downhill outside excursion 실패를 별도 회귀 항목으로 유지한다.

완료 gate:

- 같은 입력에서 속도별 결과를 한 표로 비교할 수 있다.
- 수동 평가자가 느낀 “죽음/급격함/둔함”을 telemetry 항목과 연결할 수 있다.
- 종방향 `qa:standing-start` 결과는 기준선 안에 남는다.

### P1 — `0~60km/h` 저속 연결성

- low-speed authority 중복 적용을 제거한다.
- 정지 lateral lock과 저속 steering command를 분리한다.
- 5/10/30/60km/h authority knot를 연속 조정한다.
- launch 중 steering을 누르고 있어도 pose와 offset이 경계에서 튀지 않게 한다.
- 저속 drift lock은 유지하되 hard recovery 경계에는 hysteresis를 검토한다.

완료 gate:

- 0km/h offset은 계속 `0u`다.
- 10km/h 입력은 작지만 방향을 읽을 수 있다.
- 30→60km/h에서 offset, lateral velocity, pose가 모두 단조 증가하고 단일 frame snap이 없다.
- 60km/h 기존 정상 조향 범위는 크게 훼손하지 않는다.

### P2 — `60~110km/h` 일반 grip 기준 확립

- 이 구간을 steering response `1.0` 기준으로 둔다.
- tap, hold, neutral release를 각각 튜닝하고 하나의 큰 `steerAcceleration` 값으로 동시에 해결하지 않는다.
- centering spring과 neutral inward velocity cap을 speed profile에 포함한다.
- easy curve의 curve force가 플레이어 input을 이기지 않는지 확인한다.

완료 gate:

- `150ms tap`은 방향 cue를 남기지만 lane을 과도하게 넘지 않는다.
- `1s hold`는 명확한 lane change를 만든다.
- release 뒤 offset overshoot와 반대 방향 snap이 없다.
- easy curve grip은 accidental drift 없이 유지된다.

### P3 — `110~185km/h` 고속 무게 재구성

- force, input response, grip angle, lateral cap의 중복 감쇠를 speed profile 하나로 재배치한다.
- 초기 input cue는 60~110km/h와 크게 다르지 않게 유지하고, 지속 입력의 trajectory만 줄인다.
- 고속 centering을 느리게 만들어 lane hold와 neutral release가 자연스럽게 이어지게 한다.
- controller와 render의 visual scale을 합치고 최고속 pose가 사라지지 않게 한다.
- 이 단계에서는 corner overspeed 계수를 바꾸지 않고 straight/easy에서 먼저 검증한다.

완료 gate:

- 110/145/170/185km/h tap 결과가 연속적으로 변한다.
- 최고속에서 작은 tap은 차를 튕기지 않고, 1초 hold는 여전히 방향을 바꿀 수 있다.
- full input pose가 threshold 아래로 완전히 사라지지 않는다.
- lane hold 중 centering이 입력을 이겨 중앙으로 끌고 가지 않는다.

### P4 — corner overspeed와 drift overlay 재결합

- base 고속 무게가 안정된 뒤 medium/sharp understeer를 다시 얹는다.
- understeer는 input response를 더 늦추는 대신 outward trajectory와 exit scrub으로 표현한다.
- understeer 강도는 가속 페달이 아니라 코너 속도 예산 대비 현재 속도로 계산한다.
- lift/brake 뒤에도 실제 속도 부채가 남아 있으면 understeer를 유지하고, 감속에 따라 steering authority와 outward momentum을 회복한다.
- drift entry 속도는 raw ratio 기반으로 통일하고 진입/해제에 hysteresis를 둔다.
- grip angle cap은 drift setup/drift의 counter authority를 침범하지 않게 한다.

완료 gate:

- 동일 sharp에서 overspeed grip은 prepared grip보다 바깥 여유를 더 쓰고 exit가 나쁘다.
- prepared grip은 조향권을 회복하지만 자동으로 완벽한 line을 얻지 않는다.
- brake/lift가 accidental drift를 만들지 않는다.
- brake drift는 grip보다 무조건 빠른 정답이 아니라 line/exit 선택지로 남는다.
- downhill sharp는 level sharp보다 분명한 속도 부채 또는 바깥 trajectory를 남긴다.

### P5 — 실주행 튜닝과 기본값 확정

- 동일 controller 후보를 query parameter로 비교한다.
- 최소 3회의 60초 run을 `grip only / prepared grip / drift mixed`로 나눠 기록한다.
- 자동 점수 1등을 바로 채택하지 않고, 입력과 화면 trajectory가 일치하는 후보를 선택한다.
- 선택한 curve와 knot를 runtime default와 simulation config에 동시에 반영한다.
- 기존 handling review에 결과와 결정 이유를 기록한다.

## QA 매트릭스

| 축 | 샘플 |
| --- | --- |
| 속도 | `0, 5, 10, 30, 60, 90, 110, 130, 145, 160, 170, 180, 185km/h` |
| 입력 | neutral, 150ms tap, 1s hold, release, counter tap |
| 도로 | straight, easy, medium, sharp, downhill sharp |
| 상태 | grip, prepared grip, brake drift, lift drift, recovery |

필수 telemetry:

```text
handlingSpeedRatio
speedHandling.lateralAuthority
speedHandling.steeringForceScale
speedHandling.lateralVelocityCap
speedHandling.gripAngleCap
speedHandling.centeringScale
steeringCommand
steeringVelocity
lateralOffset
visualSteering
cornerSpeedOverBudget
overspeedUndersteerRatio
driftState / driftRatio
```

핵심 관계 검증:

1. 인접 속도 sample 사이에 부호 반전이나 급격한 gain jump가 없다.
2. 60~110km/h가 가장 직접적이며 저속과 고속이 양쪽에서 연속적으로 연결된다.
3. 110km/h 이후 tap onset은 유지되고 hold displacement만 점진적으로 줄어든다.
4. neutral release의 inward velocity와 overshoot가 속도에 따라 연속적으로 변한다.
5. straight 최고속 안정성과 sharp 최고속 비용이 동시에 성립한다.
6. 표시 최고속 변경만으로 같은 raw speed의 handling sample이 바뀌지 않는다.
7. 동일 코너·동일 속도·동일 조향에서는 가속 페달 유무로 understeer target이 꺼지지 않는다.

수동 평가 질문:

- 출발하면서 조향할 때 언제부터 차가 움직이는지 자연스럽게 알 수 있는가?
- 60~110km/h에서 입력과 차량 이동이 한 동작으로 읽히는가?
- 고속에서 차가 무거운가, 아니면 단순히 입력이 무시되는가?
- neutral로 놓았을 때 차가 스스로 중앙으로 튀는가?
- 과속 sharp에서 핸들이 잠긴 느낌보다 반경이 넓어진 느낌이 먼저 오는가?
- 차량 pose가 실제 진행 방향과 위험을 설명하는가?

## 적용 변경 지점

- `games/apex-seoul/src/game/playerVehicleController.ts`
  - speed profile sample, authority 단일화, centering/overlay 조합
- `games/apex-seoul/src/game/vehicle.ts`
  - speed handling telemetry state type
- `games/apex-seoul/src/main.ts`
  - 기본 profile knot, visual steering 단일화, telemetry export
- `games/apex-seoul/src/game/runtimeConfig.ts`
  - profile 또는 개발용 query override
- `games/apex-seoul/scripts/simulate-handling-matrix.mjs`
  - 의도적 감속 scoring 보정, 기존 관계 회귀
- `games/apex-seoul/scripts/simulate-speed-handling-sweep.mjs`
  - 신규 속도 sweep과 결과 표

## 리스크와 방어선

- **저속 authority 단일화 뒤 차가 너무 민감해질 수 있음**
  - force를 다시 이중 감쇠하지 않고 low-speed knot와 velocity cap으로 조정한다.
- **고속 pose를 살리면 차가 과장돼 보일 수 있음**
  - pose angle보다 response onset을 먼저 살리고 `steer-2`는 실제 lateral demand에 제한한다.
- **base grip 개선이 overspeed 비용을 약화할 수 있음**
  - P3까지 straight/easy를 먼저 고정하고 P4에서 sharp 관계를 별도 회귀한다.
- **자동 점수가 기존 의도를 잘못 보상할 수 있음**
  - 절대 점수보다 속도 인접성, prepared/overspeed pair, 수동 평가를 함께 gate로 둔다.
- **차량 표시 최고속에 따라 결과가 달라질 수 있음**
  - controller lookup은 raw normalized speed로 고정한다.

## 완료 조건

- 정지 잠금부터 최고속 grip까지 조향 변화가 연속적이다.
- 60~110km/h는 직접적이고, 110km/h 이후에는 입력 지연이 아니라 trajectory 제한으로 무게가 증가한다.
- 최고속 straight/easy는 안정적이면서 조향 가능하다.
- medium/sharp 과속은 별도의 outward trajectory와 exit 비용으로 읽힌다.
- grip, understeer, drift의 authority가 서로의 역할을 중복하지 않는다.
- 차량 pose가 실제 입력과 이동을 설명하며 최고속에서 사라지지 않는다.
- 저속, handling matrix, standing start, guardrail 회귀가 모두 통과한다.
- 3종 실주행 로그와 수동 체크에서 같은 문제를 재현하지 않는다.

## 조건부 회귀 확인

자동 기준은 P0~P4까지 충족했고 현재 handling 기준선으로 사용한다. 아래 `grip only / prepared grip / drift mixed` 확인은 상시 다음 단계가 아니라, 새 코스·차량·입력 장치에서 회귀가 보고될 때 [D-13](./apex-seoul-deferred-backlog.md)으로 재개한다.

- 30→60km/h에서 steering이 너무 빨리 강해지지 않는가?
- 60~110km/h full input pose가 과장되지 않는가?
- 170~185km/h에서 즉시 cue와 제한된 trajectory가 함께 읽히는가?
- sharp overspeed의 outward motion이 벌점이 아니라 진입 속도의 결과로 읽히는가?
- downhill sharp의 추가 outward motion이 과도한 shoulder 강제가 되지 않는가?

재개한 실주행에서 문제가 확인되면 speed knot 또는 overspeed overlay 중 한 축만 조정한다. 두 축을 같은 반복에서 동시에 바꾸지 않는다.

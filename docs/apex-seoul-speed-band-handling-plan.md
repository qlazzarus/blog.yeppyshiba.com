# Apex Seoul 속도대별 핸들링 개선 계획

갱신일: 2026-07-20

상태: P0~P4 구현 완료. P5 실주행 확인과 최종 체감 보정이 남아 있다.

## 결론

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

- 엔진 출력, 기어비, `0–100km/h`, 표시 최고속
- 코스 geometry와 curve grade 경계
- 카메라 FOV, speed shader, roadside object 밀도
- 차량별 별도 grip 성격
- drift 물리를 시뮬레이터 수준으로 확장하는 작업

## 현재 기준선

2026-07-20 현재 Raven Coupe 표시 최고속은 `185km/h`다. 기존 문서의 `200~205km/h` 표기는 과거 표시 스케일이므로 이번 계획의 속도대 기준으로 사용하지 않는다.

자동 기준선:

| 항목 | 현재 결과 | 해석 |
| --- | ---: | --- |
| 정지 2초 풀 조향 | offset `0u`, visual `0` | 정지 횡이동 잠금은 정상 |
| 10km/h 2초 풀 조향 | offset `0.1637u`, visual `0.0213` | crawl 조향이 사실상 보이지 않음 |
| 30km/h authority | `0.432` | 수치 자체보다 중복 적용이 문제 |
| 60km/h 2초 풀 조향 | offset `233.0486u`, visual `0.7655` | 10→60km/h 사이 체감 변화가 너무 큼 |
| 185km/h sharp overspeed grip | understeer `1.0`, 평균 grip authority `0.433`, max offset `89.111u` | 제한은 강하지만 trajectory 변화는 작아 둔감함으로 읽힐 수 있음 |
| handling simulation baseline | `73.1/100` | 비교용 지표. 그대로 출시 gate로 쓰기에는 scoring 보정이 필요 |
| standing start | Raven `0–100=13.133초`, pass | 종방향 성능은 이번 변경의 통제 변수 |

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

## 다음 확인

자동 기준은 P0~P4까지 충족했다. 다음 단계는 P5 실주행이다. `grip only / prepared grip / drift mixed` 세 run에서 다음 항목만 확인한다.

- 30→60km/h에서 steering이 너무 빨리 강해지지 않는가?
- 60~110km/h full input pose가 과장되지 않는가?
- 170~185km/h에서 즉시 cue와 제한된 trajectory가 함께 읽히는가?
- sharp overspeed의 outward motion이 벌점이 아니라 진입 속도의 결과로 읽히는가?
- downhill sharp의 추가 outward motion이 과도한 shoulder 강제가 되지 않는가?

실주행에서 문제가 확인되면 speed knot 또는 overspeed overlay 중 한 축만 조정한다. 두 축을 같은 반복에서 동시에 바꾸지 않는다.

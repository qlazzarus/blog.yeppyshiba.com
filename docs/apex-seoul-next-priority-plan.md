# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-16

## 현재 기준

`Bugak Ridge Downhill`의 고속 grip 주행과 의도적인 drift/counter-steer는 플레이 가능한 기반까지 도달했다. 드리프트 감각은 약 70점으로 유지하고, 다음 반복의 중심은 **속도감**과 **라인 선택이 있는 코너링**이다.

다만 현재 코스는 북악스카이웨이의 긴 내리막과 완만한 흐름을 가져오는 과정에서, 최고속 약 `200km/h`의 grip 주행만으로도 많은 corner를 통과할 수 있다. 이는 차량 최고속이 과한 문제만이 아니라, 코스 리듬과 고속 grip의 실패 조건이 함께 약한 문제다.

가장 최근 60초 full-throttle grip audit에서는 brake/drift 입력 없이 easy 평균 약 `750`, medium의 `700` 이상 sample `130개`, sharp 최고 `706`이 기록됐다. sharp에 자동 감속은 있으나 플레이어가 준비 동작을 선택하지 않아도 통과가 가능하다. 다음 반복은 controller를 한꺼번에 무겁게 만들지 않고, **P0 속도 예산 계측 → P1 초과 속도 비용화 → P2 코스 리듬 재배치 → P3 풀액셀 회귀 검증** 순서로 진행한다.

P0 계측은 완료했다. 예산은 표시 기준 easy/medium/sharp 약 `195 / 160 / 130km/h`로 telemetry에 기록되며, full-throttle/준비 grip/brake drift reference도 자동화했다. 측정상 medium prepared grip은 재가속 뒤 다시 예산을 넘고, sharp brake drift도 큰 초과량을 남긴다. 다음 구현은 코스 변경 없이 P1의 medium/sharp overspeed 비용화다.

P1의 범위는 현실 차량의 `60km/h` 조향 한계를 그대로 재현하는 것이 아니다. `0–80` 회복, `80–130` 일반 grip, `130–160` medium 준비, `160–185` commitment, `185–205` straight/easy 최고속 보상으로 역할을 나눈다. 먼저 P0.1의 budget km/h telemetry 보정 후, medium overspeed band → safety-margin exit cost → sharp brake-drift 연결 순서로 적용한다. 코스 곡률·segment 수정은 이 controller-only P1 검증이 실패할 때만 검토한다.

## 실행 순서

1. **속도 cue 재설계**
   - 저속·순항·최고속이 서로 다른 화면 밀도를 갖게 한다.
   - 상시 shader/FOV가 아니라 throttle, 내리막, drift 탈출 때의 짧은 burst를 쓴다.
   - guardrail reflector, chevron, 도시 불빛의 근거리 통과 흐름을 보강한다.
2. **코너 등급과 라인 보상** — 진행 중
   - `easy / medium / sharp`를 curve intensity로 나눠, 같은 curve 상한 감속을 적용하지 않는다.
   - easy bend는 grip으로 통과한다. 속도 손실과 steering scrub을 약하게 두고, drift를 요구하지 않는다.
   - sharp bend는 속도 상한, steering scrub, 라인 보상 계수를 높인다. 진입 위치와 짧은 drift, 탈출 정렬이 속도 회복을 달리한다.
   - 이번 단계의 `cornerLineQuality`는 **apex-ready(안쪽) 보상**이다. controller에 road preview가 없으므로, entry–apex–exit 전체 레이싱 라인을 흉내 내지 않는다.
   - 다음 단계에서 road preview/section phase를 추가할 때 바깥 진입 → apex → 탈출 정렬 보상으로 확장한다.
   - 구현 기준: easy `0.35x`, medium `1.0x`, sharp `1.18x` speed loss. sharp의 apex-ready line reward는 `1.35x`다.
   - 다음 보정: brake/lift entry는 grade별 진입 비용을 갖고, line miss/oversteer만 추가 loss를 받는다. exit 정렬이 나쁘면 짧은 재가속 지연을 둔다.
3. **코스 리듬/road-side cue**
   - grip → drift → S 전환 → 회복 직선을 의도적으로 배치한다.
   - 코너 진입 전 표지, 반사판, 가드레일로 위험도를 읽게 한다.
4. **주행 피드백**
   - brake, drift entry, counter trim, drift exit에 tail light, shadow, smoke/glow, RPM cue를 연결한다.
5. **게임 루프**
   - checkpoint/time attack, 기록, 결과 화면.
   - AI, 교통, 충돌, 차량 선택은 이후 단계다.

## 당장 하지 않을 것

- drift 물리를 시뮬레이터 수준으로 확장
- 항상 켜진 강한 drift pose
- AI/교통/충돌을 통한 난이도 추가
- 차량 수 확장

## 차후 검토: Lotus III 벤치마킹 백로그

`Lotus III: The Ultimate Challenge`의 화면을 그대로 복제하기보다, 하나의 주행 엔진에서 차량·환경·경기 규칙을 바꾸며 반복 플레이를 만든 구조를 참고한다.

| priority | 참고할 점 | Apex Seoul 적용 후보 |
| --- | --- | --- |
| high | 여러 레이스 성격 | 같은 Bugak A→B 코스를 `Time Attack`, `Night Run`, `Rival Chase`로 분화 |
| high | 서로 다른 차량 선택 | Raven / Vortex / Apex를 acceleration과 최고속뿐 아니라 drift 안정성, 충돌 손실, boost 회복까지 다르게 구성 |
| high | 환경별 장애물과 규칙 | 공사 콘, 젖은 구간, 터널 출구, 차선 축소를 코너 전에 읽을 수 있도록 배치 |
| medium | RECS 코스 조립 | 사용자 에디터에 앞서 `segment recipe`와 고정 seed 기반의 개발용 코스 조립기로 활용 |
| medium | 음악 선택과 구간 전환 | 원곡 재현이 아니라 RPM, 터널, checkpoint에 반응하는 자체 BGM layer로 해석 |
| low | 2인 split screen | 웹 화면에서는 replay ghost와 기록 경쟁을 먼저 구현한 뒤 재검토 |

우선 적용 후보는 차량 선택과 A→B run 규칙이다. 현재 engine profile과 checkpoint/finish 상태를 활용할 수 있어 기존 구조 변경이 비교적 작다. Rival Chase는 다수 AI traffic보다 replay ghost를 먼저 사용해 line 학습과 기록 경쟁을 겸한다.

랩 레이스, 무작위 교통량, 완전한 사용자 RECS 편집기는 보류한다. 현재 핵심인 “밤의 서울 산길을 한 번 잘 내려가는 감각”과 handling/visibility 검증을 먼저 완성한다.

## 다음 검증 지표

- straight/corner 평균 속도와 speed cue의 대비
- easy/medium/sharp별 평균 속도, 속도 손실, lateral offset 사용률
- sharp corner의 apex-ready line과 바깥 line의 speed budget 차이
- sharp grip/drive pair의 line-loss 관계와 accidental drift 여부
- roadside object pass rate
- brake-to-drift 성공률, counter trim 유지 시간, drift exit 후 1초 가속 회복량
- 차량 화면 앵커 높이에서의 도로 폭, 차량/도로 비율, 차량 크기 변화율

## 2026-07-14 코스 속도 예산 / 고속 Grip 합의안

## 백로그 — 차량별 파워밴드와 변속 감각 (핸들링 안정화 후)

### 현재 상태와 범위

Raven Coupe는 RPM별 torque curve, gear별 RPM/speed range, redline fuel cut을 이미 사용한다. Vortex GT와 Apex S는 여기에 turbo spool/peak 및 boost 보정이 있다. 따라서 이번 항목은 엔진 모델을 새로 만드는 일이 아니라, 현재의 차량 성격을 운전 중에 읽을 수 있게 만드는 작업이다.

속도계·corner budget·drift/understeer tuning과는 분리한다. 특히 gear shift를 이유로 corner speed budget이나 grip lateral force를 바꾸지 않는다.

### 구현 순서

1. **P1 — shift state와 짧은 torque cut**
   - 자동 upshift/downshift 순간을 별도 `shiftTimer` 상태로 기록한다.
   - upshift에는 약 `80~120ms`의 torque cut과 RPM drop을 넣되, steer/lateral/direction에는 힘을 주지 않는다.
   - fuel cut과 shift cut은 중첩하지 않고, shift 중 throttle 재입력도 기존 throttle intent를 보존한다.
2. **P2 — 차종별 powerband 대비 강화**
   - Raven: 고회전 자연흡기형. `5,500~6,800rpm`에서 가장 선명하게 당기고 redline 직전에는 완만하게 떨어진다.
   - Vortex: turbo spool 뒤 중회전 plateau와 더 긴 gear를 사용한다. boost peak를 과도한 최고속 보너스로 쓰지 않는다.
   - Apex S: Vortex보다 이른 spool·짧은 peak를 가져, 코너 탈출 재가속의 성격만 다르게 한다.
   - profile별 최고속 표기와 raw physics scaling은 분리해, 표시 속도 변경이 powerband를 바꾸지 않게 한다.
3. **P3 — 운전자 피드백**
   - HUD에는 gear/RPM/fuel cut/shift cut만 짧게 표시하고, 별도 복잡한 tachometer는 필요성이 확인된 뒤 추가한다.
   - shift 직전/직후에는 엔진음·sprite shake 같은 연출을 나중 단계로 두며, 먼저 torque·RPM telemetry가 설득력 있는지 확인한다.
4. **P4 — 자동 측정**
   - standing start, 중간 속도 재가속, uphill/downhill exit에서 `gear`, `rpm`, `torqueScale`, `boostRatio`, `fuelCutActive`, `shiftTimer`를 기록한다.
   - shift 직후 torque dip, profile별 `rpm/torque` peak 위치, 동력 회복 시간, 동일 raw speed에서의 drift/understeer 비개입을 검사한다.
   - pass 기준은 특정 차가 무조건 빠른지가 아니라, shift가 lateral snap·drift 오발·corner budget 변화 없이 반복 가능하게 재현되는 것이다.

### 3차량 재미 목표 (2026-07-15)

차량 재미는 표기 최고속보다 throttle response, shift rhythm, boost recovery의 차이로 만든다. 이 단계에서는 engine profile만 조정하고, 차량별 grip·corner budget·collision은 분리한다.

- **Raven Coupe:** 고회전 NA. 6,500~7,000rpm을 유지하면 가장 즐겁고, redline과 shift cut을 의식해야 한다. 최고속은 낮지만 throttle이 정직하고 변속 리듬이 재미의 중심이다.
- **Vortex GT:** twin turbo GT. 긴 기어와 중고속 boost plateau로 180km/h 이상에서 계속 밀어붙인다. 저·중속 spool 전환은 무겁게 읽히고, 힘은 강하지만 즉각적이지 않다.
- **Apex S:** single turbo lightweight. Vortex보다 이른 spool과 빠른 회복으로 60~150km/h 재가속이 경쾌하다. 최고속은 Vortex보다 낮지만 코너 탈출에서 살아나는 차로 둔다.

### P1 적용 기록 — shift state와 torque cut (2026-07-15)

파워밴드는 새 엔진 모델을 추가하지 않고, 기존 `gear`/`rpm`/`torqueCurve` 위에 shift state를 얹는 방식으로 시작한다. `PlayerVehicleState`에 `shiftTimer`, `shiftDirection`, `shiftCutRatio`를 추가하고, 자동 변속이 발생한 frame에서 짧은 torque cut을 적용한다.

- upshift: 약 `220ms`, peak `42%` torque cut
- downshift: 약 `100ms`, peak `16%` torque cut
- fuel cut 중에는 shift cut을 중첩하지 않는다.
- shift cut은 `engineTorqueScale`에만 반영하고, steering/lateral/drift/corner budget은 변경하지 않는다.
- HUD와 telemetry에 `shiftCutRatio`, `shiftDirection`, `shiftTimer`를 남겨 다음 주행 로그에서 torque dip과 lateral 비개입을 확인한다.
- `2026-07-15T08-05` 로그에서 기존 `110ms` upshift cut은 10Hz telemetry에 0~1 sample만 잡혀 체감이 약했다. 따라서 cut duration을 늘리고, Raven의 torque multiplier를 `0.70~1.14`로 넓혀 저회전/피크 회전의 추진력 대비를 조금 더 키운다.

### P1.1 적용 기록 — 초기 속도와 6단 도달 속도 보정 (2026-07-15)

`apex-seoul-drive-2026-07-15T08-18-50-124Z_2jn2x1.jsonl`에서는 시작 직후 이미 `4단 / 113.9km/h`였고, `t=4.136s`에 `6단 / 179.6km/h`, `t=5.003s`에 `183.9km/h`까지 도달했다. 기어비 자체는 5→6단이 180km/h 근처라 크게 틀어진 것은 아니지만, 시작 속도와 엔진 가속이 너무 높아 powerband와 shift rhythm을 체험할 시간이 부족했다.

따라서 시작 cruise speed를 `440u → 320u`로 낮추고, engine acceleration을 `170 → 150`으로 낮춘다. 목표는 6단 도달을 늦추고 3~5단의 RPM 상승과 shift cut을 더 오래 읽게 하는 것이다. 이 변경은 최고속 표기, gear ratio, corner budget, drift 조건은 직접 바꾸지 않는다.

### P1.2 적용 기록 — 0 출발과 차량별 acceleration scale (2026-07-15)

`apex-seoul-drive-2026-07-15T08-41-49-275Z_gtvwsj.jsonl`에서는 이전보다 개선되어 6단 도달이 `t=4.136s → t=8.956s`로 늦어졌고, 시작도 `3단 / 70.5km/h`까지 내려왔다. 그러나 여전히 0 출발이 아니고, 공통 `PLAYER_ENGINE_ACCELERATION`만으로는 차량별 powerband 성격이 최종 곱으로만 반영된다.

따라서 run 시작 속도를 `320u → 0u`로 낮추고, `VehicleEngineProfile.accelerationScale`을 추가한다. 실제 engine force는 `common engineAcceleration × vehicle accelerationScale × engineTorqueScale`로 계산한다.

- Raven Coupe: `1.00` — 기준 차량. 낮은 최고속과 고회전 유지가 재미인 NA
- Vortex GT: `1.05` — 무겁지만 중고속 boost plateau가 강한 GT
- Apex S: `1.00` — 빠른 spool과 코너 탈출 재가속형 single turbo

`qa:powerband-reference`는 이 프로필이 런타임에서 어떤 표로 읽히는지 확인하는 지표이며, 표 자체를 게임 로직 입력으로 사용하지 않는다.

### P1.3 적용 기록 — 저속 조향 authority와 0km/h 횡이동 잠금 (2026-07-15)

`apex-seoul-drive-2026-07-15T08-48-30-514Z_qpj0hy.jsonl` 이후 확인한 결함은, 0 출발은 적용됐지만 정지 상태에서도 좌우 입력이 실제 `lateralOffset`을 움직일 수 있다는 점이다. 이는 파워밴드 문제가 아니라 longitudinal speed와 lateral authority가 분리되지 않은 문제다.

개선 원칙은 시각 조향과 실제 횡이동을 분리하는 것이다. 정지 상태에서 steering sprite나 입력 의도는 읽을 수 있어도, 차량의 도로상 위치는 움직이지 않아야 한다.

- 표시 속도 `0~5km/h`: 실제 횡이동 authority `0`. 좌우 입력, centering, curve force, drift/counter lateral velocity가 `lateralOffset`을 바꾸지 않는다.
- 표시 속도 `5~60km/h`: smoothstep으로 횡이동 authority를 점진 회복한다. 출발 직후 차가 좌우로 순간 이동하는 느낌을 막는다.
- 표시 속도 `60km/h+`: 기존 high-speed steering/understeer 규칙을 그대로 사용한다.
- 표시 속도 `45km/h` 미만: drift setup/drift 유지를 recovery로 돌려, 저속에서 드리프트 sprite와 횡이동이 먼저 살아나는 오발을 막는다.
- telemetry에는 `lowSpeedLateralAuthority`를 남겨, 주행 로그에서 0 출발·저속 코너링·드리프트 진입 조건을 함께 검증한다.

자동 검증은 `qa:low-speed-steering`으로 분리한다. 0km/h 좌우 입력 2초는 `lateralOffset=0`을 유지해야 하며, 10km/h는 crawl 수준의 작은 움직임, 60km/h는 정상 조향권 회복을 기준으로 삼는다. 이 테스트는 차량별 powerband 수치표와 달리 실제 controller를 돌려 `lateralOffset` 회귀를 잡는 용도다.

### P1.4 적용 기록 — 저속 visual steering pose 잠금 (2026-07-15)

`apex-seoul-drive-2026-07-15T09-00-42-761Z_99pjbn.jsonl`에서는 P1.3의 물리 잠금은 정상 동작했다. `0~5km/h` 조향 입력 중 `lowSpeedLateralAuthority=0`, `lateralOffset=0`이 유지됐다. 하지만 같은 구간에서 `visualSteering`이 최대 `0.994`, frame이 `steer-right-2`, rotation이 약 `3.48°`까지 올라가 정지 상태에서 차량이 풀 조향처럼 보였다.

따라서 실제 횡이동 authority와 별도로 `lowSpeedVisualSteeringAuthority`를 둔다. 이 값은 render pose 전용이며, controller의 `lateralOffset`, drift, corner budget에는 관여하지 않는다.

- 표시 속도 `0~5km/h`: visual steering pose와 rotation을 거의 `center`로 고정한다.
- 표시 속도 `5~25km/h`: 입력 의도는 읽되 `steer-1` 이하의 약한 pose만 허용한다.
- 표시 속도 `25~60km/h`: `steer-2`까지 점진 회복한다.
- 표시 속도 `60km/h+`: 기존 visual steering을 그대로 사용한다.
- telemetry에는 `lowSpeedVisualSteeringAuthority`를 남겨, `steering`은 높아도 `visualSteering`이 저속에서 억제되는지 확인한다.

자동 검증은 `qa:low-speed-steering`에 visual 기준을 추가한다. 0km/h와 launch 초기에는 `visualSteering`·rotation이 거의 0이어야 하고, 60km/h에서는 정상 visual pose가 회복되어야 한다.

### P1.5 적용 기록 — standing start와 0–100km/h 재보정 (2026-07-15)

`apex-seoul-drive-2026-07-15T09-00-42-761Z_99pjbn.jsonl`에서는 accel 시작 시점을 `t=0.464s`로 잡았을 때 Raven Coupe가 `0–100km/h`를 약 `5.8초`에 통과했다. 이는 현재 게임의 downhill sports coupe 톤에 비해 너무 빠르고, powerband를 느끼기 전에 3~4단을 통과하는 문제를 만든다.

Raven 기준 목표를 `0–100km/h 약 13초`로 잡는다. 이 단계에서는 최고속 표기와 gear ratio를 먼저 바꾸지 않고, engine force와 launch throttle만 조정한다. `0–60km/h`는 별도 스포츠카 성능표 기준이 아니라 게임 내 display-speed curve 기준이므로, `0–100km/h` 목표를 우선하고 `0–60km/h`는 `8~10.5초` 범위로 완화한다.

적용값:

- `PLAYER_ENGINE_ACCELERATION`: `150 → 82`
- `PLAYER_LAUNCH_THROTTLE_MIN_RATIO`: `0.30 → 0.50`
- `PLAYER_LAUNCH_THROTTLE_FULL_SPEED_RATIO`: `0.38 → 0.70`

의도는 초반 launch가 완전히 죽지 않게 하되, 60km/h 이후 가속이 폭발적으로 이어지지 않게 하는 것이다. 너무 낮은 `launchThrottleMinRatio`는 `0–60`만 비정상적으로 늘리고 `60–100`이 여전히 짧아지는 형태를 만들었다.

자동 검증은 `qa:standing-start`로 추가한다. 현재 flat simulation 기준 Raven Coupe는 `0–60=10.17초`, `0–100=13.62초`, `0–150=21.48초`이며, 실제 코스 시작부의 약한 downhill slope가 들어가면 주행 로그에서는 `0–100`이 13초 근처로 내려오는지 확인한다. pass 기준은 Raven `0–100=12.0~13.8초`, `100km/h 이전 5단/6단 진입 금지`, `lateralOffset/drift 비개입`이다.

### 차량별 speed-to-powerband reference (2026-07-15)

`npm run qa:powerband-reference --workspace @games/apex-seoul`로 생성한다. 표시 속도 `km/h`를 runtime display-speed curve에서 다시 raw speed ratio로 역산해, 플레이어가 보는 속도 기준으로 각 차량의 `gear`/`rpm`/`torque`/`boost`/`engine torque`를 비교한다. 이 표는 문서·튜닝 기준이며, handling coefficient나 corner grip에 직접 연결하지 않는다.

#### Raven Coupe

| km/h | raw ratio | gear | rpm | torque | boost | engine torque | note |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 60 | 0.381 | 3 | 6055 | 0.854 | 0.000 | 1.076 | build-up |
| 90 | 0.491 | 3 | 7359 | 0.946 | 0.000 | 1.116 | redline edge |
| 120 | 0.600 | 4 | 6517 | 0.932 | 0.000 | 1.110 | strong pull |
| 150 | 0.722 | 5 | 5727 | 0.799 | 0.000 | 1.051 | build-up |
| 180 | 0.902 | 6 | 6323 | 0.900 | 0.000 | 1.096 | strong pull |
| 185 | 1.000 | 6 | 7800 | 0.700 | 0.000 | 1.008 | redline edge |

#### Vortex GT

| km/h | raw ratio | gear | rpm | torque | boost | engine torque | note |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 60 | 0.335 | 3 | 5070 | 0.936 | 0.717 | 1.198 | spooling pull |
| 90 | 0.427 | 3 | 6558 | 0.911 | 0.985 | 1.219 | redline edge |
| 120 | 0.514 | 4 | 5461 | 0.983 | 0.911 | 1.242 | spooling pull |
| 150 | 0.603 | 4 | 6641 | 0.876 | 1.000 | 1.205 | redline edge |
| 180 | 0.699 | 5 | 5918 | 0.992 | 1.000 | 1.257 | boost plateau |
| 210 | 0.818 | 6 | 5467 | 0.984 | 1.000 | 1.253 | boost plateau |
| 230 | 1.000 | 8 | 6200 | 0.985 | 1.000 | 1.253 | boost plateau |

#### Apex S

| km/h | raw ratio | gear | rpm | torque | boost | engine torque | note |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 60 | 0.348 | 3 | 5201 | 0.992 | 0.933 | 1.249 | spooling pull |
| 90 | 0.446 | 3 | 6531 | 0.872 | 0.949 | 1.198 | spooling pull |
| 120 | 0.539 | 4 | 5402 | 0.996 | 0.967 | 1.254 | boost plateau |
| 150 | 0.635 | 4 | 6522 | 0.874 | 0.983 | 1.203 | boost plateau |
| 180 | 0.744 | 5 | 5580 | 0.999 | 1.000 | 1.260 | boost plateau |
| 210 | 0.909 | 6 | 5594 | 1.000 | 1.000 | 1.260 | boost plateau |
| 215 | 1.000 | 6 | 6500 | 0.880 | 1.000 | 1.207 | boost plateau |

### 완료 조건

- Raven/Vortex/Apex S가 RPM과 재가속 리듬만으로 구분된다.
- 변속은 화면상 끊김이 아니라 짧은 추진력 호흡으로 읽힌다.
- 차종 차이가 최고속 숫자만의 차이로 환원되지 않는다.
- 현 handling matrix의 grip, counter, drift, downhill 관계가 모두 유지된다.

### 먼저 할 일: 현재 코스 분석

섹션별 목표 속도 예산은 새 감속 규칙을 바로 넣는 뜻이 아니다. 우선 현 `Bugak Ridge Downhill`을 section으로 분류하고 아래를 자동 측정한다.

```text
section id / 진행률 / curve grade / elevation 변화
무브레이크 최고속 grip의 entry·apex·exit speed
lateral offset 사용률, 바깥 safety margin, shoulder 접근률
brake·lift·drift 시도와 무브레이크 grip의 탈출 속도 차이
```

분류는 `cruise / commitment / technical / recovery`로 한다. 이 결과로 200km/h grip 통과가 의도된 cruise인지, 완만하지만 실제로는 brake를 요구해야 할 commitment인지 판정한다. provisional 목표는 easy `180~200km/h`, medium `150~175km/h`, sharp/technical `115~150km/h`이며, 수치는 현재 코스 audit 뒤 확정한다.

### 병합된 수정 순서

1. **P0 — section audit와 회귀 시나리오**
   - 현재 코스를 수정하지 않은 상태에서 무브레이크 최고속, 목표 속도 grip, brake/lift drift를 같은 구간에서 자동 비교한다.
   - 여기서 코스 수정 후보와 understeer 적용 지점을 수치로 정한다.
2. **P1 — high-speed grip understeer**
   - sharp/technical 구간의 speed budget을 넘기면, 단순한 상시 감속보다 steering authority를 먼저 낮춘다.
   - 플레이어는 핸들을 더 꺾어도 바깥 safety margin을 더 쓰고, brake로 속도를 준비하면 같은 입력으로 더 안정된 탈출 정렬을 만들어야 한다.
   - 이는 정답 apex를 강제하거나 조작권을 빼앗는 curve force가 아니라, 과속의 understeer를 읽히게 하는 규칙이다.
3. **P1 — 코스 리듬 재배치**
   - 실제 북악스카이웨이의 완만함은 분위기 참고로만 남기고, 게임 코스는 fictional downhill로 더 선명한 리듬을 만든다.
   - 긴 최고속 흐름 뒤에는 짧은 braking commitment, 이어지는 S/전환 구간, 그리고 짧은 recovery straight를 배치한다.
   - 단순히 급커브를 늘리지 않는다. 다음 진입을 준비할 여유와 차체 정렬의 가치가 생기도록 section 길이와 curve 부호 전환을 조정한다.
4. **P2 — 완전한 레이싱 라인과 shoulder 비용**
   - road preview를 이용해 outside entry → apex → exit alignment를 보상한다.
   - shoulder/rumble 접근은 작은 scrub과 회복 손실을 주되, 즉시 충돌이나 강제 감속으로 난이도를 만들지 않는다.

### 통과 기준

- cruise에서는 최고속 grip이 여전히 보상된다.
- commitment/technical에서는 무브레이크 최고속 grip이 더 큰 바깥 safety margin 사용 또는 명확한 exit loss를 만든다.
- 목표 속도 grip은 안정적으로 통과한다.
- 잘 준비한 brake/lift drift는 같은 구간에서 나쁜 무브레이크 grip보다 line 또는 exit speed 우위를 갖는다.
- S section은 명시적 전환을 보상하지만, 무작정 최고속 grip으로 직선처럼 통과되지 않는다.

### 2026-07-14 구현 기록 — 정답 라인 없는 과속 understeer

P1의 첫 단계를 sharp grip에 적용했다. `cornerLineQuality`로 apex miss를 판정하거나 특정 offset을 요구하지 않는다. sharp grade에서만 현재 속도가 해당 curve의 기본 speed budget을 넘을수록 `gripSteerAngleLimit`을 추가로 줄인다. 따라서 과속 차량은 같은 조향 입력으로도 바깥 safety margin을 더 쓰지만, 목표 속도로 준비한 차량은 조향 여유와 탈출 정렬을 되찾는다.

`qa:handling-sim`에는 두 회귀 시나리오를 추가했다.

```text
sharp-overspeed-grip:  200km/h 무브레이크 sharp 진입 → understeer 활성화/조향 여유 감소
sharp-prepared-grip:  사전 제동 뒤 같은 sharp 진입 → understeer 완화/조향 여유 회복
```

초기 자동 측정은 조향 여유 차이까지만 확인했지만, 실주행 로그에서 차량의 실제 offset 변화가 작아 체감이 약했다. 조향 감쇠를 더 키우면 ‘차가 무거운’ 감각만 커질 수 있으므로, 최대 감쇠는 `54%`로 두고 외측 force를 `overspeedUndersteerLateralVelocity` 상태로 교체했다. 이 횡운동은 과속 sharp 진입에서 쌓이고 브레이크 뒤 짧게 감쇠한다. 작은 understeer scrub은 과속의 exit 비용만 만들며, 특정 apex를 요구하지 않는다.

확장 baseline은 과속 진입 `understeer 1.000`, 외측 횡운동 `68.3u`, 준비 진입 `understeer 0.390`, 외측 횡운동 `25.6u`다. 새 speed sweep은 entry understeer `600=0.000 / 660=0.427 / 710=0.962`와 함께 outward displacement·scrub이 단계적으로 커지는지 확인한다. brake recovery는 `200ms` 안에 횡운동을 회복하고 drift를 오발하지 않아야 한다. `right-lane-hold`는 entry/exit `roadOffsetRatio`를 기록해 차선 유지 감각을 다음 코스·shoulder 작업의 수치 기반으로 남긴다.

### 2026-07-14 P1 후속 구현 — 중속 band·안전 여유 비용

P0 speed budget을 기준으로 P1을 medium까지 확장했다. activation은 `budget 초과 + accel hold + steer input`으로 제한하고, neutral·lift·straight에서 상시 외측 보정이 생기지 않게 했다. medium의 최대 understeer scale은 `0.58`, sharp는 `1.00`이며, understeer는 조향각 감쇠와 짧은 외측 횡운동으로 읽힌다. `cornerSafetyMarginRatio`는 road offset이 최대 폭의 26%를 넘을 때만 증가해, 과속 상태에서만 exit scrub에 참여한다.

자동 matrix는 sharp full-throttle / prepared grip과 `470 / 560 / 710` raw speed sweep을 비교한다. 최신 baseline은 `97.6/100`이며, sharp prepared entry는 budget 초과·understeer 모두 `0`, sharp full-throttle은 entry 초과 `+296u`, 최대 understeer `1.0`으로 분리된다. 이 단계도 road geometry는 변경하지 않았다. 다음 사용자 로그에서 high-speed grip 통과가 여전히 쉬운 section을 확인한 뒤에만 P2 코스 리듬 재배치로 진행한다.

### P0 완료 — 입력 의도 기반 차선 안정화

상시 centering spring은 우측 입력을 유지해도 차를 중앙으로 돌려보내는 문제를 만들었다. 이제 lane hold 중 같은 방향 입력에는 `0.35x` centering, neutral release에는 `0.45x` centering, 반대 입력에는 정상 centering을 적용한다. elevation은 이 보정에 직접 연결하지 않는다. `right-lane-hold-straight`, level/downhill pair, release-recenter 자동 시나리오로 `roadOffsetRatio`를 검사한다. baseline level/downhill hold 차이는 `0.008`이고, release 250ms 뒤 lane ratio가 `+0.190` 아래로 급락하면 회귀로 검출한다.

## 2026-07-14 차량-도로 화면 비율 계측 결정

도로의 원근과 높낮이는 변하는데 차량 sprite가 거의 고정 크기로 남아, 차량이 도로 위에 놓여 있기보다 HUD처럼 보일 수 있다는 관찰이 나왔다. 기존 telemetry는 `displaySize`, terrain scale, 원근 anchor scale만 남겼으므로 이 인상을 수치로 검증할 수 없었다.

이번에는 시각 튜닝을 바로 바꾸지 않고 아래를 telemetry에 추가한다.

```text
vehicle.roadWidthAtVehicleY : 차량 화면 앵커 Y를 가로지르는 포장도로 폭(px)
vehicle.vehicleBodyWidth    : 현재는 sprite의 렌더 폭(px)
vehicle.vehicleRoadRatio    : vehicleBodyWidth / roadWidthAtVehicleY
vehicle.sizeDeltaPerSec     : sprite 폭의 초당 변화량(px/s)
```

핵심은 실제 접지점의 투영 폭을 사용하지 않는 것이다. 플레이어 차량은 접지점보다 화면상 앞에 합성되므로, 접지점 폭을 기준으로 확대하면 과대 확대된다. 다음 주행 로그에서 평지·오르막·내리막·좌우 코너의 비율과 변화량을 먼저 비교한 뒤, road-relative scale을 적용할지와 목표 비율을 정한다.

`70%`는 즉시 적용할 상수가 아니라 비교 후보로 둔다. sprite 사각 프레임에는 투명 여백이 있을 수 있으므로, 후속 시각 튜닝에서는 필요하면 차체의 alpha bounds를 별도 메타데이터로 만들어 실차체 폭 기준으로 재측정한다.

### 백로그: road-relative vehicle scale

새 60초 telemetry에서 `vehicleRoadRatio`는 `48.6~64.6%`, 평균 `53.1%`였다. 차량 폭은 약 `360px`로 거의 고정인 반면, 차량 앵커 높이의 도로 폭은 `556~741px`로 변한다. 따라서 시각적 이질감은 실제로 측정됐다.

다음 시각 튜닝은 핸들링 입력 규칙과 분리해 아래 순서로 진행한다.

1. **54% 화면 기준값**
   - `roadWidthAtVehicleY × 0.54`를 목표 sprite 폭으로 계산한다. 평균 `53.1%`와 가까워 기본 구도를 보존한다.
   - `70%`는 즉시 적용할 기본값이 아니라, alpha-bound 측정 뒤 비교할 상한 후보로 둔다.
2. **soft road-relative scale**
   - 기존 `360px` 기준으로 우선 `±8%` (`331~389px`)만 허용한다.
   - `0.6~0.8초` 응답과 `±2%` dead zone을 둬 도로 고저차에서 차량이 펌핑하지 않게 한다.
   - terrain scale은 road-relative scale과 곱하되, 최종 크기 제한 뒤에 적용해 두 cue가 겹쳐 과장되지 않게 한다.
3. **자동/시각 QA**
   - 목표 `vehicleRoadRatio`는 약 `52~60%`다. dead zone과 보간을 포함한 자동 허용 범위는 `51~61%`로 둔다.
   - `sizeDeltaPerSec`는 `80px/s` 이하, 평지·오르막·내리막·sharp corner screenshot matrix를 통과 기준으로 둔다.
4. **차체 폭 보정은 후속 단계**
   - 현재 `vehicleBodyWidth`는 sprite 사각 렌더 폭이다. atlas alpha bounds를 추출해 실차체 폭을 기록한 뒤 `60% / 70%` 후보를 비교한다.

핵심은 차를 크게 만드는 것이 아니라, 차량이 HUD처럼 고정되고 도로만 움직이는 분리를 줄이는 것이다.

구현 후 `qa:vehicle-road-scale`은 실제 telemetry 폭 `556.4~740.8px`를 순환 입력으로 사용한다. baseline 결과는 ratio `51.5~60.8%`, 최대 크기 변화율 `71.3px/s`이며, ±8% clamp·51~61% ratio·80px/s 응답 상한을 모두 통과했다.

## 다음 시각 구현 계획 — 비대칭 다운힐 roadside와 도시 parallax

### 목표

`apex-seoul-drift-tuning-original-hero.png`의 구도를 분위기 참고로 삼는다. 게임 화면에서는 사진형 배경 한 장을 복제하지 않고, pseudo-3D 원근에 맞는 모듈형 roadside와 먼 배경 레이어로 아래의 비대칭을 만든다.

```text
왼쪽: 도로 → 낮은 가드레일 → 절벽/어두운 능선 → 아래쪽 서울 야경
오른쪽: 도로 → 가드레일 → 콘크리트 옹벽 → 벽 위 수목 실루엣
```

왼쪽은 내리막의 낙차와 열린 조망을 읽게 하고, 오른쪽은 가까운 옹벽·나무·반사판이 빠르게 지나가며 속도감을 만든다. 기본 팔레트는 black/blue이며, tail light 외의 빨강·노랑은 chevron 같은 위험 신호에만 제한한다.

### 범위와 비범위

- 이번 단계는 Speed cue / roadside flow의 시각 작업이다. 코너 물리, 충돌, speed budget, 차량 조작 규칙은 바꾸지 않는다.
- 처음부터 대형 bitmap background를 고정하지 않는다. 현재 `roadObjectRenderer`의 Graphics 레이어로 형태·원근·차폐 순서를 검증한 뒤, 통과한 모듈만 bitmap asset으로 전환한다.
- 가까운 roadside는 도로 투영과 함께 움직이고, 도시 전경은 별도 parallax background로 둔다. 도시를 road object처럼 빠르게 투영하거나, 화면 전체에 상시 강한 shader/FOV를 거는 방식은 사용하지 않는다.

### P1 — 좌우 roadside 환경 프로필

기존의 균일한 `guard-post`와 산발적인 `pine` 배치를, 구간별 좌우 환경 프로필로 확장한다.

```text
left-cliff-guardrail  : 낮은 난간, 기둥, 파란 reflector
left-cliff-face       : road edge 아래로 떨어지는 절벽/능선 실루엣
right-guardrail       : 옹벽 전면과 연결되는 연속 난간
right-retaining-wall  : 도로보다 한 단계 높은 콘크리트 사다리꼴 면
right-wall-tree       : 옹벽 상단 뒤에서 올라오는 수목 실루엣
chevron / sign        : curve 진입 위험도 안내
```

- 조망·긴 내리막 구간은 왼쪽 cliff/city 레이어를 열고 오른쪽 wall-tree 밀도를 낮춘다.
- commitment/technical 구간은 오른쪽 옹벽·reflector·chevron 밀도를 높여 가까운 위험도를 먼저 읽게 한다.
- 가드레일은 양쪽 모두 유지하되, 왼쪽은 낮고 끊겨 보이며 오른쪽은 옹벽과 연결되어 더 무겁게 보이게 한다.

### P2 — 도시 전경 parallax

도시 전경은 왼쪽 절벽 너머 horizon에 우선 배치한다. 낮은 능선, 먼 건물 실루엣, 작은 도시 불빛을 적어도 세 레이어로 분리한다.

1. **far haze / skyline**: horizon 근처의 가장 느린 레이어. 카메라 진행에 거의 반응하지 않고, curve 누적에만 매우 작게 반응한다.
2. **city-light band**: 건물 창·간선도로 같은 희소한 점광 레이어. skyline보다 조금 빠르지만 roadside보다 현저히 느리다.
3. **near ridge silhouette**: 왼쪽 절벽의 가까운 어두운 능선. 도시를 부분적으로 가려 깊이를 만들며 skyline보다 빠르게 흐른다.

parallax는 카메라의 월드 진행과 누적 curve offset에 반응하되, 차량의 순간적인 steer/road offset에 직접 묶지 않는다. 그래야 플레이어 조향 때 도시가 HUD처럼 흔들리지 않고, 다운힐의 큰 흐름만 남는다. loop track 경계에서도 horizon strip이 점프하지 않도록 wrap 가능한 폭과 offset을 사용한다.

### P3 — 속도 cue 연결

- 저속에서는 옹벽 블록, 수목, 가드레일이 개별 형태로 읽힌다.
- 순항에서는 오른쪽 reflector와 rail post의 통과 리듬이 선명해진다.
- 최고속·내리막·drift exit burst에서는 가까운 오른쪽 레이어의 통과 빈도와 짧은 speed effect만 높인다.
- curve 진입 전에는 바깥쪽 가드레일의 chevron/reflector 밀도를 높여, 강제 감속 없이 위험도를 예고한다.
- 먼 도시 parallax의 속도는 안정적으로 유지한다. 고속 표현은 가까운 물체의 흐름과 열린 좌측 조망의 대비로 만든다.

### P4 — 에셋 전환 계획

Graphics 시안의 화면 비율이 통과한 뒤, 아래 항목만 반복 가능한 bitmap 모듈로 생성·교체한다.

- 오른쪽 옹벽 타일 2종: 기본 / 습기와 푸른 반사광 강조
- 오른쪽 wall-tree 실루엣 3종: 낮음 / 중간 / 돌출
- 가드레일 및 blue reflector 모듈
- 왼쪽 절벽 전경 실루엣 2종
- 먼 도시 skyline 및 city-light horizon strip

각 모듈은 배경 glow, 차량 그림자, 읽을 수 있는 텍스트를 포함하지 않는다. 사진 같은 레퍼런스의 무드는 유지하되, 게임 원근에서 반복·차폐·성능 관리가 가능한 자산으로 분해한다.

#### 2026-07-15 첫 도시 전경 적용

먼 도시 전경의 첫 bitmap 후보로 [FabinhoSC의 Skyline Background](https://opengameart.org/content/skyline-background)를 선택했다. 원본은 CC0이며, 제공된 두 번째 preview(`Visualisation02`)를 다음처럼 보관·적용한다.

```text
assets/environment/source/skyline-background/visualisation-02-original.png
    → skyline/haze/light-density art-direction reference
```

원본의 주황 sunset palette는 현재의 black/blue night downhill과 충돌하므로, 원본 파일은 수정하지 않고 skyline/haze/light-density 참고로만 사용한다. 완성 배경 한 장을 runtime sprite로 올리지 않는다. `city-view` section에서만 Graphics 기반 `far haze → city light → near ridge` 레이어를 열고, road pitch와 분리된 고정 기준선에 배치한다. city light는 curve에 작은 parallax만 적용하고, 이후 속도감은 city 자체가 아니라 roadside reflector·옹벽·수목이 맡는다.

### QA 통과 기준

- 왼쪽 가드레일·절벽·능선·도시 레이어가 도로 경계 및 서로의 차폐 순서와 자연스럽게 이어진다.
- 오른쪽 옹벽이 도로를 침범하거나 차량 HUD와 겹쳐 보이지 않으며, 수목은 항상 벽 위에 있는 높이 관계를 유지한다.
- 도시 전경은 curve와 진행에 따라 부드럽게 흐르되, steer 입력이나 loop 경계에서 점프·깜빡임이 없다.
- 도시 불빛은 차량·chevron보다 밝은 주목점을 만들지 않는다.
- 최고속에서 가까운 reflector pass rate는 증가하지만 프레임 드롭과 과도한 화면 흔들림은 없다.
- 평지·내리막·좌우 sharp corner screenshot matrix에서 좌우 roadside와 parallax layer가 모두 안정적으로 보인다.

### 구현 순서

1. roadside 환경 프로필과 render layer 분리
2. Graphics 기반 left cliff / right wall-tree / guardrail 시안
3. 3-layer city parallax와 wrap·curve offset 검증
4. 속도별 reflector·chevron 밀도 및 burst 연결
5. screenshot/telemetry QA 후 bitmap 모듈 생성 및 교체

## Speed cue / roadside flow 세부 수정 계획

### 목표

속도감은 city-view의 이동이나 상시 shader로 만들지 않는다. 왼쪽의 열린 절벽 조망과 오른쪽의 가까운 옹벽·가드레일·수목, 그리고 코너 진입 전의 reflector·chevron 밀도 차이로 저속·순항·최고속을 읽게 한다.

### P1 — roadside 역할 분리

`roadObjectRenderer`의 균일한 `guard-post`와 산발적인 `pine`을 아래 역할로 분리한다.

```text
left-cliff-guardrail : 절벽 쪽의 낮은 가드레일과 기둥
right-guardrail      : 옹벽 전면과 이어지는 무거운 가드레일
right-retaining-wall : 오른쪽 도로 바깥의 콘크리트 벽 mockup
right-wall-tree      : 옹벽 상단 뒤에서 올라오는 수목 silhouette mockup
blue-reflector       : 가까운 통과 리듬과 curve 위험도 cue
chevron              : commitment 진입의 방향 안내
```

- 모두 기존 road projection과 elevation을 따른다. 배경 city-view와는 별도 레이어다.
- 이번 단계는 Graphics mockup이며, collision radius와 차량 handling은 바꾸지 않는다.
- 왼쪽 rail은 낮고 드물게, 오른쪽 rail은 옹벽과 연결된 더 무거운 형태로 그린다.

### P2 — 구간 환경 프로필

각 roadside object는 생성 시 아래 환경 프로필 중 하나를 받아, 같은 도로에서도 좌우 밀도와 오브젝트 조합이 달라지게 한다.

| 프로필 | 조건 | 왼쪽 | 오른쪽 | cue |
| --- | --- | --- | --- | --- |
| `open-view` | city-view 조망 구간 | cliff rail·열린 능선 | 낮은 rail·드문 수목 | 낙차/조망 |
| `wall-run` | 보통 curve 흐름 | cliff rail | retaining wall·wall-tree | 근접 속도 |
| `commitment` | 큰 curve 진입 | rail·바깥 chevron | wall·reflector 고밀도 | 제동 준비 |
| `recovery` | 완만한 직선/탈출 | 낮은 rail | 낮은 rail·드문 수목 | 재가속 |

- profile 판정은 현재 curve intensity와 track progress만 사용한다. road geometry와 speed budget은 수정하지 않는다.
- `commitment`의 reflector/chevron은 curve 방향의 바깥쪽에 우선 배치한다.
- P3에서만 profile별 object pass rate, speed burst, screenshot matrix를 추가 측정한다.

### P1/P2 통과 기준

- left/right roadside가 대칭적인 같은 도로처럼 보이지 않는다.
- `open-view`에서는 city-view와 절벽 조망이 열리고, `wall-run`에서는 오른쪽 가까운 질량이 우세하다.
- `commitment`는 HUD 없이도 reflector·chevron·wall 밀도로 다음 코너를 예고한다.
- road projection, 고저차, curve에서 wall/tree가 포장도로·차량 HUD를 침범하지 않는다.
- 기존 handling simulation과 telemetry baseline은 변하지 않는다.

#### P1.1 — 연속 guardrail span과 독립 post mockup (2026-07-15)

기존 Graphics guardrail은 하나의 object 안에 가로 레일과 양쪽 말뚝을 함께 그린 `|--|` 형태였다. 이를 `4 segment` 간격으로 반복하면, 가까운 원근에서 말뚝이 서로 겹치고 레일은 이어진 안전 구조물이 아니라 독립 표지판처럼 보인다. 따라서 말뚝을 더 많이 겹치는 방식은 채택하지 않는다.

이번 mockup은 `roadObjectRenderer`에서 road-relative projection을 공유하는 세 가지 역할로 분리한다.

```text
guardrail span : 인접 road segment의 투영점 두 개를 잇는 연속 rail 면
guardrail post : span 위에만 얹는 드문 세로 지지대
reflector      : post cadence와 독립된 속도/curve cue
```

- left cliff rail은 segment마다 연결되는 낮은 단일 rail과 `4 segment` cadence의 post로 둔다.
- right rail은 연속 main rail과 보조 lower rail, `3 segment` cadence의 조금 더 무거운 post로 둔다.
- right retaining wall도 독립 사다리꼴 반복 대신 segment span으로 연결한다. render layer는 `wall-tree → wall span → rail span → post/reflector/chevron` 순서다.
- span의 start가 camera near clip 뒤로 넘어가면 start만 near clip으로 보정해, camera가 segment 경계를 지날 때 rail gap이 생기지 않게 한다.

이 방식은 OutRun 계열의 “도로 중심 상대 좌표의 roadside를 먼 곳부터 그리는” pseudo-3D 규칙과 맞는다. 다만 원본 아케이드의 sprite를 그대로 복제하는 것이 아니라, 현 Graphics renderer에서 연속성·차폐 순서를 검증하는 구조 시안이다.

P1.1 확인 기준은 다음과 같다.

- 직선과 좌/우 curve의 near field에서 인접 rail span 사이에 배경 틈이나 이중 겹침이 없다.
- 말뚝 수가 rail의 연속성을 끊어 보이게 하지 않으며, left는 열린 절벽·right는 옹벽과 연결된 무게감으로 즉시 구분된다.
- wall/tree가 rail 앞에 잘못 덮이거나 paved road/차량을 침범하지 않는다.
- `blue-reflector`의 기존 motion-anchor telemetry와 road/handling 데이터는 바뀌지 않는다.

P1.1이 화면 검토를 통과한 뒤에만 span을 bitmap strip 또는 authored module로 전환한다. 그 전에는 새 sprite asset을 만들거나 collision/handling을 바꾸지 않는다.

#### G1~G5 — guardrail interaction 계획 및 첫 적용 (2026-07-15)

가드레일의 시각 span과 충돌은 분리한다. post 간격이나 Graphics의 화면 크기로 충돌을 잡으면 가까운 구간에서 접촉이 끊기거나 연속 hit가 발생하므로, 충돌은 각 frame의 실제 `roadHalfWidth`를 기준으로 한 좌/우 연속 boundary로만 판정한다.

현재 rail center는 paved edge 바깥에 있고 기존 차량 lateral limit은 그 안쪽이어서 충돌할 수 없었다. G1은 차량의 허용 offset을 `pavedHalfWidth + 130u`까지 열고, 아래 세 구간을 명시한다.

```text
paved road       : |offset| ≤ pavedHalfWidth
shoulder          : pavedHalfWidth < |offset| < railContactLimit
rail contact      : |offset| = pavedHalfWidth + 130u
```

G2는 shoulder에서 작고 지속적인 speed scrub을 주고, rail contact에서는 바깥쪽 횡속도만 감쇠/반사한다. contact는 차량을 경계 안으로 고정하지만 접선 방향 주행을 즉시 정지시키지 않는다. 첫 접촉만 `speed × outward lateral velocity` 기반의 impact loss를 추가하고, 짧은 cooldown 동안에는 지속 scrape 비용만 적용한다. drift/understeer 횡속도도 감쇠해 rail을 이용한 비정상적인 방향 전환을 막는다.

G3은 새 상시 shake가 아니라 `guardrailImpactCue`만을 `CameraEffects`에 전달한다. 강한 첫 접촉은 최대 `2.2px / 0.9px`의 짧은 impact offset과 `0.45°` FOV cue를 주며, shoulder/steady contact는 카메라를 흔들지 않는다. spark, rail highlight, sound는 G4 후보로 남긴다.

G5 자동 검증은 `npm run qa:guardrail-collision --workspace @games/apex-seoul`로 수행한다. mild scrape, high-speed impact, 좌측 대칭, sustained contact의 단일 impact, contact 해제 뒤 cue/timer 회복을 검사한다. telemetry에는 `guardrailShoulderRatio`, contact direction/timer/count, impact cue를 남긴다.

다음 visual iteration에서는 실제 주행 screenshot으로 `130u` clearance와 scrub/impact 수치를 조정한다. handling 난이도는 “가드레일을 스치면 손실은 있으나 즉시 정지하지 않고, 한 차선 고정으로 rail을 무시할 수는 없는” 상태를 목표로 한다.

#### G6 — guardrail visual collision tuning 기록 및 낮은 우선순위 백로그 (2026-07-15)

`apex-seoul-drive-2026-07-15T07-56-34-625Z_nk7poq.jsonl` 기준으로 guardrail interaction은 합격점으로 본다. 60초 샘플 543개에서 impact는 47회 발생했고, 좌측 26회/우측 21회로 양쪽 모두 감지된다. visual collision inset은 좌측 `56u`, 우측 `48u`로 적용 중이며 평균 active limit은 좌측 `140.205u`, 우측 `148.257u`다. 최대 active contact ratio는 좌측 `1.0037`, 우측 `1.0043`이고, 최대 boundary overshoot도 각각 `0.471u`, `0.605u` 수준이라 물리 판정상 가드레일 관통은 거의 제거되었다.

남은 이슈는 좌측 드리프트 sprite가 가드레일 위에 약간 올라탄 듯 보이는 visual mismatch다. 로그상 좌측 드리프트 impact는 14회이며 대부분 `activeLimit` 안쪽 또는 근접 경계에 머문다. 따라서 즉시 collision 수치를 더 줄이기보다 낮은 우선순위 백로그로 보류한다.

후속 후보는 다음 순서로 검토한다.

1. drift frame 전용 visual collision inset을 `+4u~8u`만 추가한다.
2. 충돌선 대신 차량 alpha bounds 기반 좌/우 접촉폭을 telemetry에 남긴다.
3. 좌측 guardrail sprite/Graphics rail을 차체보다 약간 앞 레이어로 그려, 차가 레일을 덮는 느낌을 줄인다.
4. collision 수치가 아닌 drift sprite anchor/origin을 프레임별로 보정한다.

### P3 — speed cue 분리와 계측

P1/P2의 Graphics mockup은 현 단계에서 최종 아트로 승인하지 않는다. P3는 아트 완성도와 분리해, 기존 상시 고속 shader를 아래 네 가지 cue로 나누고 runtime telemetry에 각 기여도를 기록한다.

```text
base             : 최고속에서도 매우 약한 지속감
throttleBurst    : 중고속 악셀 재입력 직후의 짧은 burst
downhill         : 속도와 내리막이 겹칠 때만 생기는 보조 cue
driftExitBurst   : recovery → grip 전환 뒤 재가속의 짧은 burst
```

- shader intensity는 네 cue의 합으로 제한하고, 상시 최대치에 머물지 않게 한다.
- P3는 FOV·handling·road geometry를 바꾸지 않는다.
- telemetry에는 `speedEffect.base`, `throttleBurst`, `downhill`, `driftExitBurst`, `intensity`를 기록한다.
- 다음 단계에서 60초 full-throttle, downhill, brake-to-drift-exit 로그를 비교해 cue의 활성 시간과 최고값을 조정한다.

#### P3 자동 기준선 — 2026-07-15

`npm run qa:speed-cue --workspace @games/apex-seoul`은 브라우저 없이 60fps로 아래 시나리오를 실행한다: `steady-cruise`, `throttle-reentry`, `level-vs-downhill`, `brake-drift-exit`, `lift-no-burst`. runtime도 같은 `speedCue` 모듈을 사용하므로, 자동 결과와 telemetry의 cue 정의가 갈라지지 않는다.

초기 통과 기준선은 다음과 같다.

```text
steady high-speed intensity after warmup <= 0.1100
throttle burst peak                     >= 0.1400
throttle burst duration                  0.1200–0.2600s
downhill delta over level               >= 0.1000
drift-exit burst peak                   >= 0.1800
drift-exit burst duration                0.1500–0.3400s
lift after release burst                <= 0.0010
```

현재 baseline은 steady `0.0957`, throttle peak/duration `0.1791 / 0.2167s`, downhill delta `0.1531`, drift-exit peak/duration `0.2366 / 0.3000s`, lift burst `0.0000`으로 모두 통과했다. 이 숫자는 속도감의 최종 품질 점수가 아니라, 상시 효과·누락·중복 burst 같은 회귀를 막는 하한선이다.

#### P3.1/P3.2 — 이벤트 대비와 FOV impulse

P3.1은 `eventIntensity(throttleBurst + driftExitBurst)`와 `downhillIntensity`를 shader uniform으로 분리한다. steady base는 약하게 유지하고, event burst에서는 asphalt glint의 강도·범위를 높이며 downhill에서는 shoulder glint를 우선 강화한다. 따라서 같은 `intensity`라도 평상시와 재가속 순간의 화면 대비가 달라진다.

P3.2는 같은 cue envelope에만 짧은 FOV impulse를 더한다.

```text
throttle re-entry: +0.8° max
downhill:          +0.45° max
drift exit:        +1.2° max
```

기존 speed FOV와 합산되지만, cue가 사라지면 빠르게 원래 FOV로 복귀한다. 화면 흔들림이나 상시 확대는 추가하지 않는다. `camera.fovCueDegrees`는 runtime telemetry에 기록한다.

#### P3.3/P3.4 — 근거리 motion anchor와 visual telemetry (2026-07-15)

OutRun 계열의 핵심은 원경의 빠른 scroll이 아니라, 도로와 분리된 roadside 오브젝트가 전방 투영으로 빠르게 확대·통과하는 데 있다. 따라서 P3.3은 final art 승인과 분리해 `blue-reflector`를 **motion anchor**로 정의한다. `commitment`와 `wall-run`에는 기존 wall/tree mockup의 밀도와 관계없이 작은 reflector marker를 일정 cadence로 추가한다. 도시·지평선·카메라 handling은 바꾸지 않는다.

- marker는 도로 바깥쪽으로 투영되며, 화면 높이 `74%`의 near gate를 위에서 아래로 지날 때 한 번의 pass로 기록한다.
- `motionAnchorPassRate`는 직전 1초에 near gate를 지난 reflector 수다.
- `motionAnchorScreenVelocity`는 보이는 reflector의 하향 screen-space 속도를 완만하게 평균낸 값(px/s)이다.
- `motionAnchorsVisible`과 누적 `motionAnchorPasses`도 함께 남겨, 오브젝트 부족과 실제 투영 속도 부족을 분리한다.

P3.4는 이 marker 계측을 기존 cue telemetry에 결합한다.

```text
camera.fovCueDegrees                         : P3.2 FOV impulse
speedEffect.expectedPeakAlpha                : shader uniform에서 계산한 이론상 최대 blend envelope
roadObjects.motionAnchorPassRate             : 직전 1초 near-gate 통과 수
roadObjects.motionAnchorScreenVelocity       : reflector 평균 하향 속도(px/s)
```

`expectedPeakAlpha`는 특정 프레임의 실제 pixel alpha가 아니라 shader uniform으로부터 계산한 상한 envelope다. 이 구분을 남겨 shader의 glint 위치가 달라도 telemetry가 거짓 정밀도를 갖지 않게 한다.

검증은 동일 코스·동일 조작에서 저속/중속/고속, steady/throttle re-entry/drift exit의 drive telemetry를 비교한다. 먼저 실제 baseline을 기록하고, 이후 속도 구간별 pass rate가 `1 : 1.6 : 2.4` 이상으로 증가하는지 목표를 확정한다. screenshot matrix는 브라우저 캡처 환경이 준비된 뒤 이 수치와 같은 timestamp의 화면을 비교하는 보조 검증으로 둔다.

#### 백로그 — P3.5 peripheral side streak 실험 (2026-07-15, 롤백)

도로 좌우/horizon 아래에 vanishing-point 방향 shader streak를 넣는 P3.5을 두 차례 실험했다. 첫 설정은 throttle coverage `0.80%`로 자동 검증에 실패했고, event alpha와 line width를 올린 보정은 coverage `2.53%`로 수치상 통과했다. 그러나 실제 주행에서는 효과가 눈에 띄지 않았다.

원인은 coverage 기준이 존재 여부만 검사했기 때문이다. 보정 뒤에도 throttle의 화면 전체 평균 alpha는 `0.00070`에 불과했고, 가는 절차적 line은 road/roadside의 실제 motion anchor보다 약한 신호였다. 따라서 shader와 telemetry, `qa:peripheral-flow`은 모두 제거하고 P3.5을 현재 runtime 범위에서 롤백한다.

향후 재검토 조건은 다음과 같다.

- shader line 확대가 아니라, 좌우 외곽의 명시적인 tapered edge-flow geometry를 별도 시안으로 검증한다.
- 단순 coverage 대신 peripheral luminance energy, streak의 화면상 길이·두께·개수를 자동 측정한다.
- city/중앙 driving line/차량 차폐를 침범하지 않는 screenshot matrix가 준비된 뒤에만 runtime 후보로 올린다.

camera shake는 P3.5의 대체 구현이 아니라 별도의 camera impulse 후보로 검토한다. 상시 speed shake는 넣지 않는다.

#### P3.6 — event camera impulse (2026-07-15)

P3.6은 constant speed shake를 쓰지 않는다. P3.2와 같은 cue envelope에서 throttle re-entry와 drift exit에만 짧은 world-space camera impulse를 준다. Need for Speed Unbound와 Forza Motorsport의 camera shake가 별도 조절 항목인 점을 참고해, runtime query `cameraShake=0~1`로 강도를 끌 수 있게 둔다.

- throttle: 수평 최대 `0.6px`, 수직 최대 `0.25px`
- drift exit: 수평 최대 `1.2px`, 수직 최대 `0.5px`
- downhill/steady high-speed: shake 없음. 기존 FOV/pitch cue만 유지한다.
- road, roadside, background, 차량과 그림자는 같은 offset을 받는다. HUD text와 course progress UI는 별도 UI layer로 고정한다.
- telemetry `camera.shake.x/y`로 최종 render offset을 기록한다.

이는 조작/물리/road projection을 바꾸지 않는 render-layer impulse다. P3.5처럼 화면 전체의 미세 texture를 늘리는 대신, event 순간에만 명확한 충격감을 주는 보조 신호로 사용한다.

#### P3.6 후속 — CameraEffects system 분리 및 조절 계약 (2026-07-15)

camera shake가 미세해서 체감 확인이 어렵다는 피드백을 반영해, `main.ts` 안의 FOV/shake 계산 상태를 `game/cameraEffects.js`로 분리했다. 이 모듈은 Phaser object나 scene을 참조하지 않고, `CameraEffectsState`와 speed cue 입력만 받아 다음 상태를 반환한다.

```text
CameraEffectsState (FOV, FOV cue, shake phase/offset)
  + CameraEffectsConfig (기본값 및 runtime tuning)
  + updateCameraEffects(state, cue, dt)
  = 다음 효과 상태
```

이는 전체 게임을 즉시 ECS framework로 교체한 것은 아니다. 다만 camera effect의 상태(component), 순수 갱신(system), 렌더 적용(adapter)을 분리해, 다음 road/vehicle system도 같은 경계로 옮길 수 있게 한 점진적 ECS-ready 구조다. `main.ts`는 cue를 갱신하고 결과를 world layer와 차량 sprite에 적용하는 역할만 남긴다.

기본 수치는 `DEFAULT_CAMERA_EFFECTS_CONFIG`에 모으고, 실행 중 비교가 필요한 값은 URL query로 제한 범위와 함께 명시한다.

| query | 기본값 | 범위 | 의미 |
| --- | ---: | ---: | --- |
| `cameraShake` | `1` | `0~1` | 전체 shake 강도/비활성화 |
| `cameraShakeHz` | `32` | `8~60` | 흔들림 주파수 |
| `cameraShakeThrottleX/Y` | `0.6 / 0.25` | `0~2 / 0~1` | throttle re-entry 최대 offset(px) |
| `cameraShakeDriftX/Y` | `1.2 / 0.5` | `0~3 / 0~1.5` | drift exit 최대 offset(px) |
| `fov`, `fovBonus` | `69`, `5.2` | `58~82`, `0~8` | 기본 FOV 및 속도 FOV 보너스 |

`npm run qa:camera-effects --workspace @games/apex-seoul`는 steady cruise의 shake `0`, `cameraShake=0`의 shake `0`, throttle/drift event의 최소 peak, throttle FOV cue를 검사한다. 기본 설정의 peak은 throttle `0.6398px`, drift exit `1.2796px`로 기록됐다. 이는 visual 만족도를 대신 판정하는 지표가 아니라, 이후 수치 보정 시 이벤트 효과가 사라지거나 상시 shake로 변질되는 회귀를 막는 경계값이다.

## 도로 리듬과 라인 선택 계획

### 판단

현 코스는 한 차선에 머문 채 통과할 수 있다는 관찰이 타당하다. 단, 현재 `lateralOffset`은 road-relative 좌표이고 `RoadSegment`는 curve/elevation만 표현한다. 즉 curve를 더 크게 만드는 R2만으로는 **시각적 리듬과 속도 준비**는 강화할 수 있어도, 한 차선 고정을 시스템적으로 무효화하지는 않는다. 차선 이동을 실제 선택으로 만들려면 후속 단계에서 segment별 line target 또는 선택적 width profile/shoulder 비용을 추가해야 한다.

따라서 먼저 도로폭을 전면적으로 줄이지 않는다. R2로 `순항 → commitment → 반대 방향 전환 → recovery`를 읽기 좋게 재배치하고, R1 수치가 여전히 line demand `0`임을 확인한 뒤에만 제한적인 R3 width/line 규칙을 검토한다.

### R1 — 자동 road-rhythm audit

`npm run qa:road-rhythm --workspace @games/apex-seoul`은 현재 track segment를 아래 기준으로 분류한다.

- `commitment`: 절대 curve `0.55` 이상인 좌/우 연속 run
- `recovery`: 절대 curve `0.16` 미만인 run
- reversal: 반대 방향 commitment 사이의 transition/recovery 길이
- `forcedLaneTransitions`: 현재 data model이 요구하는 강제 차선 전환 수

이 audit는 차량 조작 품질 점수가 아니라 코스 데이터가 주는 리듬·라인 요구도의 기준선이다. `forcedLaneTransitions: 0`은 실패가 아니라, R2만으로 lane-change 목표를 완료했다고 오판하지 않기 위한 명시적 진단이다.

### R2 — segment 리듬 재배치

R1 뒤 `road.ts`의 Bugak section table만 조정한다. controller 상수, 차량 최고속, 도로폭, collision은 변경하지 않는다.

1. 긴 같은 방향 commitment run은 짧게 나누고, 끝에 명시적인 recovery를 둔다.
2. recovery 뒤에 반대 방향 commitment를 넣어, 이전 탈출 정렬이 다음 진입의 시각적 준비가 되게 한다.
3. open-view는 충분한 길이로 남겨 최고속 grip 보상을 보존한다.
4. 모든 curve를 sharp로 만들지 않는다. easy bend와 회복 직선은 의도적으로 유지한다.

### R2 통과 기준

- R1 audit에서 같은 방향 최대 commitment run이 baseline보다 줄어든다.
- 반대 방향 commitment 사이에 최소 `8` segment의 recovery가 최소 한 번 이상 생긴다.
- 기존 handling simulation baseline은 유지된다.
- `forcedLaneTransitions`가 여전히 `0`인 점을 문서·QA 결과에 남긴다. 실제 차선 선택은 R3의 width/line 규칙 후보에서 별도로 검증한다.

#### R1 baseline 및 R2 적용 기록 — 2026-07-15

R1 baseline은 `commitment run 3개`, 같은 방향 최대 `54 segment`, reversal `2개`, 최소 길이 recovery `5개`를 기록했다. `forcedLaneTransitions`는 예상대로 `0`이었다. 즉 긴 고속 curve는 존재했지만 코스 데이터만으로는 플레이어의 road-relative lane을 바꾸게 할 근거가 없었다.

R2는 총 `284 segment`와 해발 `560 → -500`의 다운힐 예산을 유지한 채, 기존의 긴 same-direction curve를 아래 리듬으로 재배치한다.

```text
open → right commitment → recovery → left commitment → recovery
     → right commitment → recovery → left commitment → recovery
     → short late-course reversal → finish recovery
```

이번 적용은 curve/elevation section table만 변경한다. 폭·차량 handling·collision·lane target은 바꾸지 않는다. R2 후 audit와 handling simulation으로 새 최대 commitment 길이와 기존 조작 회귀를 확인한다.

R2 audit 결과는 commitment run `3 → 6개`, 같은 방향 최대 길이 `54 → 27 segment`, reversal `2 → 4개`, 최소 길이 recovery `5 → 9개`다. 네 reversal 모두 최소 `8 segment` recovery를 가진다. 코스 길이(`284 segment / 68,160u`)와 다운힐 고도 예산은 유지됐다. handling simulation baseline도 `93.9`로 유지됐다.

이 결과는 다음 코너를 더 자주 읽고 준비해야 하는 **리듬**을 만든 것이며, 한 차선 고정이 자동으로 실패한다는 뜻은 아니다. audit의 `forcedLaneTransitions: 0`은 유지된다. R3에서는 이 사실을 전제로, 필요한 section에만 width/line 규칙을 추가할지 별도 비교한다.

### 다음 후보 — R3 선택적 width/line 규칙

R2 후에도 한 차선 고정 주행이 속도·안정성 손실 없이 성립한다면, `wall-run`과 commitment 구간에만 폭 `10~15%` 축소 후보를 비교한다. 이 단계에서는 road width를 segment data로 만들고, outside entry → apex → exit을 위한 여유와 shoulder 비용을 함께 측정한다. open-view와 recovery 폭은 유지한다.

#### R3 — 실제 폭 축소, 차량 화면 크기 고정 (2026-07-15)

R3는 “차량이 도로에 비례해 작아지는” 방식을 사용하지 않는다. 목적은 현재 grip으로 한 차선 고정 통과가 가능한 넓은 road envelope를 줄이는 것이므로, commitment와 wall-run에서만 실제 paved half-width를 기본 `960u`에서 최소 `845u`(`-12.0%`)까지 줄인다. open-view/recovery는 `960u`로 돌아온다.

- `RoadSegment.roadHalfWidth`를 section data로 보간해 road body, shoulder, lane mark, guardrail/reflector의 위치가 같은 폭 변화를 따른다.
- 허용 lateral offset도 기존 비율(`700 / 960`)을 유지해, 최소 폭에서는 약 `±616u`로 함께 줄어든다. 따라서 visual만 좁히는 것이 아니라 실제 조작 여유도 감소한다.
- 차량 sprite는 실제 좁아진 screen width가 아니라, 이를 기본 폭으로 환산한 width를 기준으로 기존 road-relative scale을 계산한다. 즉 좁은 구간에서 차량은 축소되지 않고 도로 대비 상대적으로 커 보인다.
- telemetry의 `vehicle.roadWidthAtVehicleY`와 `vehicle.vehicleRoadRatio`는 실제 좁아진 폭을 계속 기록한다. 반면 `roadRelativeTargetSize`는 width 축소에 반응하지 않아 R3의 시각 정책을 보존한다.

R3은 아직 lane target이나 충돌을 추가하지 않는다. 도로폭·허용 offset 변화만으로 한 차선 고정 grip의 여유가 줄어드는지 확인한 뒤, 필요한 경우에만 line/shoulder 비용을 추가한다.

R3 audit는 최소 half-width `845u`(`88.02%`), width transition을 포함한 narrowed segment `216 / 284`를 기록했다. 최소 폭에서 차량 허용 offset은 약 `±616u`다. `qa:vehicle-road-scale`은 full-width와 최소-width 환산 입력의 target size가 모두 `380.16px`로 같은지 확인했고, 실제 좁은 화면 도로에서는 vehicle/road ratio가 약 `61.3%`까지 올라 차량이 작아지지 않는 정책을 통과했다.

##### R3.1 — 실제 차체/차선 폭 자동 추출

`npm run qa:road-width --workspace @games/apex-seoul`은 approved Genesis G70 sprite의 normal-driving frame alpha bounds와 pseudo-3D road projection을 결합한다. sprite 사각 frame 폭이 아니라 alpha `12` 초과 pixel의 실제 폭을 사용하고, 각 segment의 차량 앵커 높이에서 road width를 측정해 `actual car width / one lane width`를 계산한다.

첫 결과에서 normal-driving alpha 폭 중앙값은 cell 폭의 `54.69%`였다. 즉 기존 sprite frame 기준 수치만으로 “차량이 한 차선의 절반”이라고 판단하면 안 된다. commitment의 후보 비교는 아래와 같다.

| half-width | 실제 차체/한 차선 중앙값 | 최대값 | 판정 |
| ---: | ---: | ---: | --- |
| `845u` | `67.1%` | `69.8%` | 현 R3 |
| `820u` | `69.2%` | `71.9%` | 권장 |
| `780u` | `72.7%` | `75.6%` | 상한 초과 |
| `760u` | `74.6%` | `77.6%` | 제외 |

자동 선택은 목표 중앙값 `60~75%`, 최대 `75%` 이하를 만족하는 후보 중 가장 좁은 폭을 권장한다. 따라서 다음 수정(R3.2)은 **commitment 중심부 `845u → 820u`**로 제한한다. `780u/760u`은 실제 차체 최대 비율이 상한을 넘어 이번 반복에서 적용하지 않는다. open-view/recovery 폭, 차량 sprite 크기 정책, controller 상수는 유지한다.

R3.2를 적용했다. commitment 중심의 최소 half-width는 `820u`(`-14.6%`)이며, transition/recovery와 open-view의 폭 정책은 유지한다. 최소 폭에서 허용 lateral offset은 약 `±598u`다.

적용 뒤 `qa:road-width`는 commitment 구간의 실제 차체/한 차선 비율을 중앙값 `64.6%`, 최대 `68.2%`로 기록했다. 이는 transition을 포함한 현재 코스 측정값이며, 고정 `820u` 중심부 후보의 보수적 상한(`중앙 69.2% / 최대 71.9%`)도 목표 범위 안에 있다. `qa:road-rhythm`의 최소 half-width도 `820u`로 확인했고, handling simulation baseline `93.9`는 유지됐다.

### R4 — roadside cue 재배치

R3 width profile이 확정되면, reflector·chevron·가드레일을 각 구간의 실제 road edge에 붙여 재배치한다. commitment 진입의 바깥쪽 marker 밀도는 높이고, recovery에서는 낮춘다. R4는 별도 아트 생성 없이 현재 Graphics marker의 위치·cadence만 조정하며, motion-anchor pass telemetry로 과밀 여부를 확인한다.

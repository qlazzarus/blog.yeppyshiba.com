# Apex Seoul 다음 구현 우선순위

갱신일: 2026-07-14

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

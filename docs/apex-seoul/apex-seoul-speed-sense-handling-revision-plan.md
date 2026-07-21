# Apex Seoul 225km/h 속도감·핸들링 후속 개선 계획

갱신일: 2026-07-21

상태: HND-3 progressive corner speed loss 완료. 다음 단계는 HND-4 understeer 궤적 실패다.

## 목적

Raven Coupe의 FT86 기반 구동계와 0-100km/h는 정리됐지만, 화면 연출과 핸들링은 아직 기존 185km/h 기준을 일부 사용한다. 이번 작업은 최고속 숫자를 다시 키우는 일이 아니라, `60 → 100 → 150 → 185 → 225km/h`의 차이가 화면과 조작에서 연속적으로 읽히게 만드는 작업이다.

```text
구동계가 만드는 실제 속도
  → 도로와 roadside가 만드는 통과 리듬
  → 작은 FOV·shader 변화
  → 속도별 조향 가능 범위
  → 코너 진입·탈출의 속도 비용
```

## 변경하지 않을 기준

이번 반복에서는 아래 값을 통제 변수로 고정한다.

- `RAVEN_COUPE_ENGINE_PROFILE` 명칭과 FT86 참조 관계
- 실제 gear ratio, final drive, 타이어 둘레
- 0-100km/h 목표 `7.8~8.3초`
- 현재 측정값 `8.117초`
- 60km/h 2단, 100km/h 3단 기준
- 헤드라이트 광원과 차량 sprite anchor
- 코스 geometry와 고저차

속도감 조정 중 엔진 출력과 표시 속도를 함께 바꾸지 않는다. 핸들링 조정 중 roadside 밀도나 FOV를 함께 바꾸지 않는다.

## 현재 구조 진단

### 1. speed cue의 발동점이 raw ratio에 묶여 있다

`SPEED_CUE_CONFIG.minimumSpeedRatio = 0.36`은 225km/h 선형 envelope에서 약 81km/h다. 기존 185km/h 표시 곡선에서 느끼던 발동 시점과 달라졌으므로, 숫자만 유지하면 일반 주행과 고속 주행의 대비가 의도와 달라진다.

### 2. FOV는 최고속까지 계속 넓어지지만 역할이 분리되지 않았다

현재 camera FOV는 smooth speed ratio로 최대 `+5.2°`까지 넓어진다. throttle/downhill/drift exit impulse도 별도로 더해진다. 기본 고속 FOV와 사건성 impulse의 합이 어느 속도에서 얼마나 보이는지 speed sweep으로 고정돼 있지 않다.

### 3. shader는 보조 수단이지만 roadside 통과 리듬과 함께 측정되지 않는다

속도 shader에는 base, downhill, throttle burst, drift exit burst가 있다. 하지만 실제 속도감의 주 채널인 lane dash, reflector, guardrail post의 초당 통과량과 함께 비교하는 QA가 없다.

### 4. handling profile은 185km/h에서 끝난다

속도별 handling knot는 185km/h까지 정의돼 있다. 185~225km/h에서는 마지막 steering force, grip angle, lateral velocity cap, pose 값이 그대로 유지된다. 최고속 구간이 갑자기 고정되지는 않더라도, 225km/h를 별도의 commitment 구간으로 설명하지 못한다.

### 5. 속도감과 핸들링이 같은 raw ratio를 보지만 같은 책임을 가져서는 안 된다

- speed presentation: 플레이어가 얼마나 빠르다고 느끼는가
- base handling: straight에서도 느껴지는 조향 무게
- corner overlay: 코너 예산을 넘겼을 때 생기는 넓은 반경과 속도 손실
- drift: 의도적인 slip과 counter 조작

속도감을 키우기 위해 조향을 둔하게 만들거나, 과속을 표현하기 위해 차량 pose를 숨기지 않는다.

## 2026-07-21 handling 우선 재검토

### 결론

코너에서 **속도 손실과 understeer를 함께 구현하는 방향이 맞다.** 다만 두 효과를 독립적인 상수로 더 세게 만드는 방식은 사용하지 않는다. 같은 `corner demand`에서 다음 결과가 순서대로 나와야 한다.

```text
코너 강도 + 물리 속도 + line + 경사
  → 현재 속도에서 요구되는 횡그립
  → 예산 이내: 정상 grip
  → 예산 초과: 조향 궤적 확대 + 바깥쪽 slip
  → 과도한 초과: progressive speed scrub
  → lift/brake: demand 감소와 grip 회복
```

목표는 코너에서 자동으로 속도를 제한하는 것이 아니다. 준비 없이 최고속으로 들어가면 원하는 line을 지키지 못하고 출구 속도까지 손해를 보며, 미리 lift/brake한 경우에는 더 작은 understeer와 더 좋은 line으로 보상받는 구조다.

### 현재 구현이 understeer가 없는 것처럼 느껴지는 이유

코드와 deterministic simulation을 대조하면 understeer 계산 자체는 이미 작동한다.

| 항목 | 현재 값/동작 | 문제 |
| --- | --- | --- |
| easy 예산 | 약 `195km/h` | understeer scale이 `0`이라 225km/h에서도 trajectory penalty가 없음 |
| medium 예산 | 약 `157km/h` | 최대 효과가 sharp의 `0.58`이고 진입 line에 따른 차이가 작음 |
| sharp 예산 | 약 `133km/h` | ratio는 충분히 오르지만 실제 바깥쪽 이동이 도로 폭에 비해 작음 |
| 발동 입력 | steer axis `0.18` 이상 | 작은 유지 조향에서는 과속 코너여도 효과가 꺼짐 |
| 사용 가능한 lateral 범위 | `maxRoadOffset = 700` | understeer 수치가 커도 line 실패나 shoulder 위협으로 잘 읽히지 않음 |
| 감속 기준 | HND-1 당시 `cornerAccelSpeed` | HND-2에서 `CornerDemandSample.targetSpeed` 하나로 통합 완료 |

2026-07-21 현재 build의 `qa:handling-sim` baseline 예시는 다음과 같다. 속도는 raw unit을 Raven의 선형 225km/h envelope로 환산했다.

| scenario | 최고 속도 | 코너 예산 | 출구 속도 | understeer max | 최대 lateral offset |
| --- | ---: | ---: | ---: | ---: | ---: |
| easy grip | 206km/h | 195km/h | 150km/h | 0.00 | 203 |
| medium full throttle | 212km/h | 157km/h | 148km/h | 0.37 | 160 |
| sharp full throttle | 212km/h | 133km/h | 132km/h | 1.00 | 92 |
| sharp overspeed grip | 224km/h | 133km/h | 135km/h | 1.00 | 78 |

수치상 sharp 감속과 understeer는 강하다. 그러나 최고속 sharp의 최대 offset이 사용 가능 범위 `700`의 약 11%에 불과하고, 차량 pose에는 입력 방향이 계속 보이므로 플레이어에게는 "감속하면서도 코너를 정상 통과했다"로 전달된다. 따라서 우선순위는 감속 상수를 바로 키우는 것이 아니라 **하나의 코너 수요 기준, 도로 폭 대비 궤적 실패, 준비 조작의 보상**을 맞추는 것이다.

또한 현재 `qa:handling-sim` baseline 종합 점수는 `0`이며, drivetrain 변경 전 승인 후보와 동일한 조건으로 돌린 `stronger-engine` 후보도 `69.3`이다. 특히 downhill sharp의 prepared/full-throttle 관계와 apex/outside line 차이가 기존 gate를 만족하지 않는다. FT86 구동계 변경 뒤 handling 기준선을 다시 승인해야 한다.

## Handling 우선 실행 계획

아래 `HND-*`는 기존 `SH-5`와 `SH-6`을 구체화한 선행 트랙이다. handling 승인이 끝날 때까지 `SH-2~SH-4`의 FOV, shader, roadside tuning은 보류한다. 화면 속도감 변경이 물리 handling 평가를 가리지 않게 하기 위해서다.

### HND-1 — corner demand 기준선 자동화

상태: **완료 (2026-07-21)**

새 `qa:corner-demand-sweep`을 추가하거나 기존 `qa:handling-sim`에 동등한 전용 summary를 만든다.

측정 축:

```text
속도      : 130 / 160 / 195 / 225km/h
코너      : easy / medium / sharp
경사      : level / downhill
준비 조작 : full throttle / lift / brake-prepared
```

반드시 남길 값:

- entry, apex, exit의 물리 km/h와 손실률
- `speed / cornerSpeedBudget`과 제곱 기반 횡그립 demand
- understeer target/actual ratio, grip steer authority
- 바깥쪽 이동량과 `maxRoadOffset` 대비 비율
- line quality, safety margin, drift state
- lift/brake 후 understeer 회복 시간

이 단계에서는 runtime 상수를 변경하지 않는다. 현재 실제 코스의 curve와 road half-width를 사용한 최소 세 구간도 고정 scenario로 남긴다.

완료 조건:

- "ratio는 1인데 코너는 쉽게 통과"하는 현상을 offset/road-width 비율로 재현한다.
- 0-100 `7.8~8.3초`, gear ratio, final drive는 통제 변수로 기록한다.

구현 결과:

- `qa:corner-demand-sweep`을 추가했다.
- synthetic matrix `72개`: `4 speeds × 3 grades × 2 slopes × 3 preparation modes`
- understeer recovery `16개`: medium/sharp, 195/225km/h, level/downhill, lift/brake
- 실제 Bugak Ridge 고정 구간 `9개`: segment 25/31/64 × 세 preparation modes
- 모든 결과에 entry/apex/exit 속도, budget 대비 속도, `v²` demand, understeer, grip authority, line quality, drift, road-width 대비 offset을 기록한다.
- 실제 게임처럼 `roadHalfWidth + guardrail clearance 130`을 scenario별 `maxRoadOffset`으로 사용한다.
- 0-100 통제값 `8.117초`, 60km/h `2단 4958rpm`, final drive `4.1`을 같은 report에 고정했다.

자동 생성물:

- [HND-1 JSON baseline](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd1-baseline.json)
- [HND-1 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd1-baseline.md)

대표 결과:

| 조건 | entry | exit | 손실 | understeer max | outward/road |
| --- | ---: | ---: | ---: | ---: | ---: |
| easy / level / 225 / full | 207.2km/h | 174.8km/h | 15.7% | 0.00 | 0.000 |
| medium / level / 225 / full | 207.1km/h | 169.3km/h | 18.2% | 0.58 | 0.021 |
| sharp / level / 225 / full | 206.8km/h | 150.8km/h | 27.1% | 1.00 | 0.117 |
| sharp / downhill / 225 / full | 224.2km/h | 139.7km/h | 37.7% | 1.00 | 0.165 |
| Bugak segment 64 / 225 / full | 210.9km/h | 153.7km/h | 27.1% | 1.00 | 0.151 |

HND-1이 확정한 문제:

1. easy는 최고속에서도 understeer와 outward excursion이 모두 `0`이다.
2. medium/sharp는 속도 손실과 understeer 수치는 크지만 outward/road 비율이 작아 정상 통과처럼 보인다.
3. 실제 Bugak segment 64의 `maxRoadOffset`은 약 `960`이라 기존 고정 `700` simulation보다 궤적 실패가 더 약하게 읽힌다.
4. 225km/h downhill에서는 lift만으로 understeer가 corner window 안에 회복되지 않는 medium/sharp case가 있다.
5. 다음 단계는 감속 상수 추가가 아니라 `cornerSpeedBudget`, speed scrub, understeer recovery가 같은 demand를 사용하게 만드는 것이다.

### HND-2 — 하나의 `CornerDemandSample`로 기준 통합

상태: **완료 (2026-07-21)**

`cornerSpeedBudget`과 `cornerAccelSpeed`가 서로 다른 limit을 만들지 않게 다음 값을 한 번만 계산한다.

```text
grade / targetSpeedKmh / speedRatioToBudget
lateralDemand = cornerIntensity × (speed / targetSpeed)²
overspeedRatio / lineQuality / downhillCarry
```

- understeer와 speed scrub은 같은 `overspeedRatio`를 사용한다.
- 속도가 두 배면 같은 곡률에서 횡가속 요구가 네 배가 되는 `v²` 관계를 경량화해 사용한다.
- downhill은 grip을 상시 낮추지 않고, 이미 예산을 넘긴 demand만 키운다.
- drift entry와 drift authority는 이 모델에 합치지 않는다.

완료 조건:

- telemetry에서 한 코너에 target speed가 하나만 보인다.
- speed loss 시작점과 understeer 시작점의 불일치가 사라진다.

구현 결과:

- `PlayerCornerDemandSample`을 추가하고 frame마다 `grade`, `targetSpeed`, `speedRatioToBudget`, `lateralDemand`, `overspeedRatio`, `lineQuality`, `downhillCarryRatio`, `safetyMarginRatio`를 한 번만 계산한다.
- 별도 감속 limit을 만들던 `cornerAccelSpeedDrop`과 `cornerAccelDrop` runtime tuning 경로를 제거했다.
- corner speed pull, overspeed tire scrub, downhill/safety-margin scrub과 understeer target이 모두 같은 `cornerDemand.overspeedRatio`를 읽는다.
- line quality와 downhill 보정은 단일 `targetSpeed`를 만들 때 적용하고 drift entry/authority는 기존처럼 별도 상태로 유지한다.
- HUD에는 `demand`, telemetry에는 하나의 중첩 `player.cornerDemand`를 노출해 두 target이 동시에 보일 수 없게 했다.
- `qa:corner-demand-sweep` schema 2에 speed ratio 식, `v²` demand 식, understeer target 연결을 검증하는 세 invariant를 추가했고 최대 오차는 모두 `0`이었다.

자동 생성물:

- [HND-2 JSON baseline](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd2-baseline.json)
- [HND-2 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd2-baseline.md)
- `corner-demand-baseline.*`은 항상 가장 최근 runtime 결과를 가리키고, 단계별 비교는 `hnd1`/`hnd2` 파일로 고정한다.

HND-1 대비 대표 변화:

| 조건 | HND-1 손실 | HND-2 손실 | HND-2 understeer | HND-2 outward/road |
| --- | ---: | ---: | ---: | ---: |
| easy / level / 225 / full | 15.7% | 15.8% | 0.00 | 0.000 |
| medium / level / 225 / full | 18.2% | 24.9% | 0.57 | 0.006 |
| sharp / level / 225 / full | 27.1% | 36.1% | 1.00 | 0.041 |
| sharp / downhill / 225 / full | 37.7% | 41.8% | 1.00 | 0.090 |
| Bugak segment 64 / 225 / full | 27.1% | 35.9% | 1.00 | 0.057 |

해석:

1. 감속과 understeer의 발동 기준은 하나로 정렬됐다.
2. medium/sharp의 감속이 강해지면서 코너 안에서 바깥으로 이동할 시간과 속도도 함께 줄어 outward/road는 오히려 작아졌다.
3. easy 손실 `15.8%`는 HND-3 목표 `5~12%`보다 강하고, medium `24.9%`는 목표 상단에 가깝다. 수치 tuning은 구조 통합 범위에 섞지 않고 HND-3에서 수행한다.
4. easy understeer `0`과 약한 outward trajectory는 HND-4 대상이다.
5. 기존 `qa:handling-sim`도 실행해 baseline `24.4`를 기록했다. downhill 관계와 brake recovery의 기존 gate는 아직 미승인 상태이며 HND-3/HND-4에서 새 기준선에 맞춰 해결한다.

### HND-3 — progressive corner speed loss

상태: **완료 (2026-07-21)**

hard speed clamp나 보이지 않는 auto brake 대신 세 구간으로 나눈다.

1. 예산 이내: steer scrub만 작게 적용한다.
2. 예산 초과: throttle로 완전히 상쇄할 수 없는 tire scrub을 누적한다.
3. 심한 초과: line/safety-margin 손실과 함께 scrub을 추가한다.

초기 tuning 목표는 동일 길이의 고정 코너 window에서 다음 범위다. 실제 Bugak 주행에 가까운 downhill에서는 entry→exit raw loss로 그대로 승인한다.

| 조건 | 목표 속도 손실 | 의도 |
| --- | ---: | --- |
| easy 225km/h 진입 | 5~12% | 빠른 sweep은 가능하지만 완전 flat-out은 아님 |
| medium 225km/h 진입 | 15~25% | lift 여부가 출구에서 구분됨 |
| sharp 225km/h 진입 | 25~38% | 준비 없는 최고속 통과가 손해임 |

정확한 km/h보다 같은 window의 손실률을 gate로 사용한다. 코너 길이에 따라 결과가 달라지는 문제를 피하기 위해서다.

#### 측정 기준 보정

HND-3 구현 중 level 225km/h synthetic scenario는 코너가 없는 full-throttle 대조군도 같은 window에서 `207.2 → 174.8km/h`, 즉 약 `15.6%` 감속한다는 사실을 확인했다. 강제로 주입한 225km/h가 level 구동 평형보다 높기 때문에, level easy의 raw loss를 `5~12%`로 만드는 것은 corner force를 0으로 해도 불가능하다.

따라서 QA를 다음 두 기준으로 분리했다.

- downhill: 실제 주행처럼 raw entry→exit loss를 기존 `5~12 / 15~25 / 25~38%` gate로 승인한다.
- level: 같은 속도·경사·페달 준비를 가진 straight control의 exit와 비교한 **corner-only loss**를 사용한다.

| level 조건 | corner-only 목표 |
| --- | ---: |
| easy 225km/h | 0.5~3% |
| medium 225km/h | 6~12% |
| sharp 225km/h | 16~25% |

이 보정은 감속을 숨기기 위한 수치 변경이 아니다. 구동 저항으로 자연스럽게 사라진 속도와 타이어가 코너 때문에 잃은 속도를 분리하기 위한 대조군 측정이다.

#### 구현 결과

- `speedLossZone`을 `within-budget / overspeed / severe-overspeed` 세 구간으로 추가했다.
- 예산 이내에서는 steering command 기반의 작은 scrub만 적용해 easy sweep도 완전히 무비용이 되지 않게 했다.
- 예산 초과에서는 단일 `overspeedRatio` 기반 tire pull을 사용한다.
- `speed / targetSpeed = 1.18`부터 severe scrub을 시작하고 `1.45`에서 full strength가 되게 했다.
- severe 구간은 별도 scrub과 line/safety-margin scrub을 사용하며, drift authority에는 합치지 않았다.
- downhill target budget 감소와 별도 overspeed scrub의 production 기본값을 모두 `0`으로 만들어 이중 페널티를 제거했다. 경사로 실제 유지된 높은 속도가 `speedRatioToBudget`을 키우는 것으로 충분히 demand에 반영한다.
- telemetry와 HUD에 zone, severe ratio, steering/overspeed/severe/downhill/line-safety force 분해를 노출했다.
- `qa:corner-demand-sweep` schema 3에 straight control `24개`와 HND-3 관계형 gate를 추가했다.

대표 결과:

| 조건 | HND-2 raw loss | HND-3 raw loss | HND-3 corner-only | entry zone |
| --- | ---: | ---: | ---: | --- |
| easy / level / 225 / full | 15.8% | 16.4% | 0.75% | overspeed |
| medium / level / 225 / full | 24.9% | 24.1% | 8.70% | severe 0.54 |
| sharp / level / 225 / full | 36.1% | 35.3% | 20.15% | severe 1.00 |
| easy / downhill / 225 / full | 6.7% | 5.1% | 5.11% | overspeed |
| medium / downhill / 225 / full | 29.8% | 20.9% | 21.21% | severe 0.99 |
| sharp / downhill / 225 / full | 41.8% | 38.0% | 38.55% | severe 1.00 |

관계형 gate 결과:

- level corner-only loss는 `sharp 20.145 > medium 8.700 > easy 0.747` 순서로 통과했다.
- 세 grade 모두 `full-throttle > lift > brake-prepared` corner-only loss 관계를 통과했다.
- severe scrub 평균은 `easy 0 < medium 3.446 < sharp 20.422`로 단계적으로 증가했다.
- downhill raw loss 세 구간과 0-100 `8.117초` 통제값을 모두 통과했다.
- 기존 `qa:handling-sim`의 HND-3 baseline은 `44.8`이며, 이중 downhill budget gate를 shared-budget/natural-carry 관계로 교체했다.
- 해당 matrix에 남은 실패는 outside safety-margin trajectory와 brake recovery 두 가지로 HND-4 범위와 일치한다.
- downhill 225km/h에서 brake recovery는 동작하지만 lift-only recovery가 window 안에 끝나지 않는 medium/sharp case는 HND-4에 남긴다.

자동 생성물:

- [HND-3 JSON baseline](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd3-baseline.json)
- [HND-3 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd3-baseline.md)

### HND-4 — understeer를 실제 궤적 실패로 연결

현재의 grip angle 제한과 outward velocity를 유지하되 road-width 정규화 결과를 기준으로 재조정한다.

- easy도 최고속 과속에서는 약한 understeer를 허용하되 일상 속도에는 개입하지 않는다.
- medium/sharp는 overspeed가 커질수록 steering authority 감소와 바깥쪽 drift가 함께 증가한다.
- `overspeedUndersteerMinSteerInput`은 on/off gate가 아니라 demand 확인용 완만한 ramp로 바꾼다.
- 최대 바깥 이동은 raw px가 아니라 사용 가능한 도로 폭의 비율로 제한한다.
- lift/brake하면 속도 감소와 함께 authority가 연속 회복돼야 한다.

초기 trajectory gate:

| 조건 | road-width 대비 바깥 이동 | understeer max |
| --- | ---: | ---: |
| easy 195km/h 이하 | 0~0.12 | `≤0.15` |
| easy 225km/h | 0.10~0.22 | `0.15~0.35` |
| medium 225km/h | 0.22~0.38 | `0.40~0.70` |
| sharp 225km/h | 0.35~0.55 | `≥0.70` |

wall collision을 강제하는 값은 아니다. 최적 line을 놓치고 다음 코너 준비가 나빠지는 정도를 먼저 목표로 한다.

### HND-5 — trajectory와 차량 pose의 차이를 읽히게 하기

물리 결과가 HND-4 gate를 통과한 뒤에만 추가한다.

- steer input pose는 남기되, body yaw/trajectory cue는 제한된 grip authority를 따른다.
- understeer 중에는 차량이 더 돌아간 것처럼 보이는데 road trajectory는 정상인 모순을 없앤다.
- road가 바깥으로 밀려나는 움직임, 짧은 tire scrub cue, debug overlay를 우선한다.
- 상시 camera shake, 과도한 sprite 회전, drift smoke로 understeer를 대신하지 않는다.

### HND-6 — 관계형 QA와 실주행 승인

자동 QA는 절대 상수뿐 아니라 다음 관계를 검증한다.

- `prepared understeer < full-throttle understeer`
- `prepared line quality > full-throttle line quality`
- `sharp loss > medium loss > easy loss`
- 같은 sharp에서 `downhill overspeed loss > level overspeed loss`
- straight acceleration과 0-100은 handling 변경 전후 오차 범위 안에 있음
- grip understeer 중 accidental drift ratio는 0에 가까움

마지막으로 같은 build에서 level/left, downhill/right, sharp S-bend를 실주행하고 telemetry와 캡처를 남긴다. HND-6 승인 후 `SH-1~SH-4` 속도감 작업을 재개한다.

## 목표 감각

| 속도 | 화면 목표 | 조작 목표 |
| ---: | --- | --- |
| 0~60km/h | shader와 FOV가 거의 개입하지 않음 | 저속 연결성과 차량 방향이 명확함 |
| 60~110km/h | lane/reflector 통과가 읽히기 시작 | 가장 직접적인 grip 구간 |
| 110~150km/h | 가까운 roadside flow가 주 속도 cue | 입력은 즉시 보이고 지속 횡이동은 조금 감소 |
| 150~185km/h | base FOV와 road flow가 고속 상태를 유지 | 미리 준 조향은 유지되며 급한 입력만 억제 |
| 185~210km/h | 최고속 진입이 확실히 읽히되 상시 흔들리지 않음 | pose는 남고 trajectory 변화량이 더 제한됨 |
| 210~225km/h | shader 추가 증가보다 통과 리듬과 시야 압축이 주도 | 조향 불능이 아닌 commitment 상태 |

## 속도감 후속 구현 단계

### SH-1 — 속도감·핸들링 기준선 자동 측정

새 `qa:speed-presentation-sweep`을 추가한다.

측정 속도:

```text
0 / 30 / 60 / 90 / 110 / 130 / 150 / 170 / 185 / 200 / 210 / 225km/h
```

측정 항목:

- speed cue base/downhill/event intensity
- camera base FOV, speed bonus, impulse 포함 FOV
- shader intensity와 시간 배율
- lane dash / reflector / guardrail post 예상 초당 통과량
- steering force, grip angle, lateral velocity cap, visual yaw
- 1초 tap/hold/release의 offset, velocity, pose

완료 조건:

- 185~225km/h가 같은 값으로 뭉치는 채널을 표로 확인할 수 있다.
- 현재 build의 결과를 JSON과 사람이 읽는 표로 남긴다.

### SH-2 — speed cue를 물리 속도 기준으로 재정의

raw ratio 임계값을 직접 읽지 않고 Raven의 물리 km/h band를 명시한다.

권장 시작값:

```text
base cue start : 70~80km/h
base cue full  : 190~210km/h
top-speed hold : 210~225km/h에서 추가 포화 금지
```

- steady cruise base는 약하게 유지한다.
- throttle burst는 페달 재입력 사건에만 반응한다.
- downhill과 drift exit는 base에 영구적으로 누적하지 않는다.
- 최고속에서도 상시 camera shake를 사용하지 않는다.

### SH-3 — roadside flow를 주 속도 cue로 조정

우선순위는 shader보다 가까운 geometry다.

1. lane dash의 near pass cadence를 측정한다.
2. reflector와 guardrail post의 최소/최대 간격을 속도별로 비교한다.
3. straight/crest/open-view에서 과밀하지 않게 segment 역할별 밀도를 구분한다.
4. 코너 위험 표지와 속도 표지는 일반 속도 marker와 분리한다.

통과 기준:

- shader를 꺼도 100/150/210km/h를 roadside 통과 리듬으로 구분할 수 있다.
- 가까운 marker가 flicker나 한 프레임 pop으로 보이지 않는다.
- distant city/cloud가 빠르게 움직여 속도감을 대신하지 않는다.

### SH-4 — FOV와 shader를 보조 채널로 재조정

roadside flow가 안정된 뒤 진행한다.

- 기본 FOV bonus는 속도 상태만 표현한다.
- throttle/downhill/drift exit는 짧은 impulse로만 더한다.
- shader base는 고속 바닥 질감 보조에 한정한다.
- 210~225km/h에서 FOV와 shader가 동시에 계속 증가하지 않게 하나를 plateau시킨다.

잠정 gate:

| 항목 | 기준 |
| --- | ---: |
| steady base shader | `≤ 0.12` |
| event 포함 shader | `≤ 0.38` |
| speed FOV bonus | `4~5.5°` |
| throttle impulse | `≤ 0.8°` |
| drift-exit impulse | `≤ 1.2°` |

### SH-5 — handling profile을 225km/h까지 확장

> handling 우선순위 전환으로 `HND-1~HND-6`에서 함께 수행한다. 별도 tuning 단계로 중복 실행하지 않는다.

기존 0~185km/h knot의 승인값을 먼저 유지하고, 다음 두 knot를 추가한다.

```text
200km/h : 최고속 진입
225km/h : commitment 상한
```

조정 대상:

- steering force scale
- grip angle cap
- lateral velocity cap
- neutral return cap
- steering slew rate
- visual yaw scale

원칙:

- 입력 onset은 200ms 안에 보인다.
- full input pose를 완전히 지우지 않는다.
- 185→200→225km/h hold offset과 velocity는 연속 감소한다.
- release 시 반대편 overshoot를 만들지 않는다.
- 225km/h straight에서 작은 입력이 즉시 spin/drift로 연결되지 않는다.

### SH-6 — 코너 예산과 line economy 재검증

> `HND-1~HND-6`이 이 단계의 상세 실행 계획이다.

기본 handling 확장 뒤에만 진행한다.

- easy bend: 150km/h 이상에서도 grip 통과가 가능해야 한다.
- medium: 진입 line과 lift가 출구 속도에 의미를 가져야 한다.
- sharp: brake/lift 없이 진입하면 넓은 반경과 exit loss가 생겨야 한다.
- downhill: 직선 가속은 유지하고 이미 과속한 코너에서만 추가 비용이 생긴다.
- drift: grip understeer와 별도 상태로 유지한다.

`engineAcceleration`, gear ratio, final drive는 이 단계에서 변경하지 않는다.

### SH-7 — 통합 telemetry와 실주행 승인

자동 QA 뒤 같은 build로 최소 세 run을 기록한다.

1. straight acceleration: 0→225km/h
2. grip only: easy/medium/sharp
3. drift mixed: brake entry, counter, recovery

telemetry에 다음을 함께 남긴다.

```text
physics speed / gear / rpm
speed cue channels / FOV / shader intensity
roadside pass-rate estimate
handling sample
corner budget / understeer / drift state
```

## 자동 검증 계획

```bash
npm run qa:powerband-reference --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:speed-cue --workspace @games/apex-seoul
npm run qa:speed-presentation-sweep --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run qa:drive-telemetry --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

`qa:corner-demand-sweep`은 HND-1에서 추가했다. `qa:speed-presentation-sweep`은 SH-1에서 새로 추가한다. 나머지 명령의 기존 gate는 원인 없이 완화하지 않는다.

## 완료 조건

- 60/100/150/185/210/225km/h가 HUD 없이도 단계적으로 구분된다.
- 속도감의 주 채널은 roadside flow이고 FOV/shader는 보조로 남는다.
- 185~225km/h에서 조향 pose와 실제 trajectory가 모두 0이 되지 않는다.
- 0-100km/h가 `7.8~8.3초` 범위를 유지한다.
- 60km/h 2단, 100km/h 3단과 변속 RPM 기준이 유지된다.
- straight/easy에서는 고속 안정성, medium/sharp에서는 준비 여부에 따른 속도 비용이 읽힌다.
- 자동 QA와 production build가 통과하고 세 종류의 실주행 telemetry가 남는다.

## 블로그 글감

구현 중 다음 전후 자료를 보관한다.

- 185km/h 기준 연출이 225km/h에서 어떻게 어긋났는가
- raw ratio cue를 물리 km/h 기준으로 바꾼 이유
- shader보다 roadside cadence가 속도감에 더 크게 작용한 장면
- 185~225km/h handling knot를 추가하기 전후의 tap/hold/release 표
- 속도감을 키우면서 camera shake를 상시화하지 않은 이유
- FT86 기반 구동계를 유지하면서 아케이드 코너링을 조정한 타협점

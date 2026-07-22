# Apex Seoul 225km/h 속도감·핸들링 후속 개선 계획

갱신일: 2026-07-22

상태: HND-6, SH-1~SH-4, TSE-1~TSE-6 완료. Visual rail 수정과 grip/drift 재측정 전까지 통합 실주행 승인을 보류한다.

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

상태: **완료 (2026-07-22)**

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

#### 구현 결과

- easy 과속 응답을 별도 포화 곡선으로 추가해 195km/h 이하 평지에서는 개입하지 않고 225km/h에서만 약하게 발동시켰다.
- `overspeedUndersteerMinSteerInput`의 hard gate를 start→full `0.08~0.45` smooth ramp로 교체했다.
- lateral target velocity와 build/recovery를 `maxRoadOffset` 비율로 계산해 서로 다른 도로 폭에서도 같은 line-loss 비율을 사용한다.
- 최대 바깥 이동을 easy/medium/sharp `0.22 / 0.42 / 0.54`로 나누고 한계에 접근하면 velocity target을 완만하게 줄인다.
- downhill 증폭은 easy/medium/sharp별 반응을 다르게 해 완만한 코너가 급코너와 같은 폭으로 밀리지 않게 했다.
- lift는 target을 `0.55`, brake는 brake pressure에 따라 최대 `0.28`까지 줄여 front authority 회복을 연속적으로 표현한다.
- line miss가 guardrail 충돌을 강제하지 않도록 225km/h level/downhill 대표 6개 조건의 충돌 횟수 `0`을 gate로 고정했다.
- `qa:corner-demand-sweep`을 schema 4로 올리고 road-width trajectory, 조향 ramp, load-transfer recovery metric을 추가했다.

대표 결과:

| 조건 | outward/road | understeer max |
| --- | ---: | ---: |
| easy / level / 195 / full | 0.000 | 0.000 |
| easy / level / 225 / full | 0.103 | 0.265 |
| medium / level / 225 / full | 0.248 | 0.579 |
| sharp / level / 225 / full | 0.384 | 1.000 |
| easy / downhill / 225 / full | 0.223 | 0.300 |
| medium / downhill / 225 / full | 0.389 | 0.580 |
| sharp / downhill / 225 / full | 0.547 | 1.000 |

회복 gate 결과:

- 225km/h medium/sharp level/downhill의 400ms lift relief는 `0.626~0.914`다.
- 같은 조건의 brake relief는 `0.977~1.000`이다.
- 0-100 통제값은 `8.117초`, 60km/h 2단을 유지했다.
- 실제 Bugak sharp segment 64는 road-width 대비 약 `0.46` 바깥 이동을 만들어 정상 line 통과와 구분된다.

자동 생성물:

- [HND-4 JSON baseline](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd4-baseline.json)
- [HND-4 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-hnd4-baseline.md)

### HND-5 — trajectory와 차량 pose의 차이를 읽히게 하기

상태: **완료 (2026-07-22)**

물리 결과가 HND-4 gate를 통과한 뒤에만 추가한다.

- steer input pose는 남기되, body yaw/trajectory cue는 제한된 grip authority를 따른다.
- understeer 중에는 차량이 더 돌아간 것처럼 보이는데 road trajectory는 정상인 모순을 없앤다.
- road가 바깥으로 밀려나는 움직임, 짧은 tire scrub cue, debug overlay를 우선한다.
- 상시 camera shake, 과도한 sprite 회전, drift smoke로 understeer를 대신하지 않는다.

#### 구현 결과

- 기존에는 HND-4 물리가 `gripSteerAngleLimit`을 줄여도 sprite frame과 차체 회전이 제한 전 `player.steering`을 그대로 사용했다.
- input pose, frame pose, body yaw를 분리했다. 입력 방향은 남기되 frame은 부분 제한하고 실제 sprite rotation과 shadow는 grip authority를 더 직접적으로 따른다.
- easy/medium/sharp 225 기준 body yaw authority는 `0.953 / 0.689 / 0.460`, frame pose authority는 `0.973 / 0.820 / 0.687`로 단계적으로 줄어든다.
- understeer와 road-width 정규화 lateral velocity가 함께 클 때만 차량 뒤에 짧은 2선 tire-scrub cue를 표시한다. smoke, 추가 camera shake, 강제 sprite 회전은 사용하지 않았다.
- lift/brake 또는 drift 전환 시 body authority와 cue가 별도 attack/release response로 연속 회복된다.
- HUD와 runtime telemetry에 `grip/body/pose authority`, input pose, body yaw, scrub cue를 추가했다.
- `qa:understeer-visual`은 정상 grip 무변형, grade별 authority/cue 순서, input→frame→body 관계, 400ms 회복, drift bypass를 자동 검증한다.
- 실제 Bugak segment 64 runtime 캡처에서 understeer `1.00`, grip `0.38`, body `0.57`, pose `0.75`, scrub cue `0.61`을 확인했다.

자동 생성물:

- [HND-5 visual authority JSON](../../games/apex-seoul/assets/telemetry/generated/understeer-visual/understeer-visual-hnd5-baseline.json)
- [HND-5 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/understeer-visual/understeer-visual-hnd5-baseline.md)
- [HND-5 sharp runtime 캡처](../../games/apex-seoul/assets/telemetry/generated/understeer-visual/hnd5-sharp-understeer.png)

### HND-6 — 관계형 QA와 실주행 승인

상태: **자동 관계형 QA 완료 (2026-07-22) / 실주행 최종 승인 보류**

자동 QA는 절대 상수뿐 아니라 다음 관계를 검증한다.

- `prepared understeer < full-throttle understeer`
- `prepared line quality > full-throttle line quality`
- `sharp loss > medium loss > easy loss`
- 같은 sharp에서 `downhill overspeed loss > level overspeed loss`
- straight acceleration과 0-100은 handling 변경 전후 오차 범위 안에 있음
- grip understeer 중 accidental drift ratio는 0에 가까움

마지막으로 같은 build에서 level/left, downhill/right, sharp S-bend를 실주행하고 telemetry와 캡처를 남긴다. HND-6 승인 또는 사용자 별도 진행 결정 후 `SH-1~SH-4` 속도감 작업을 재개한다.

#### 자동 관계형 QA 결과

- 새 `qa:handling-relations`가 매 실행마다 `qa:corner-demand-sweep`과 `qa:understeer-visual`을 먼저 갱신한 뒤 HND-1/HND-3 고정 baseline과 현재 결과를 교차 검증한다.
- 준비 조작은 `brake-prepared`, line quality는 도로 폭 차이를 제거한 `1 - outward excursion / available road width`로 정의했다.
- level/downhill의 easy/medium/sharp 6개 조건 모두 준비 조작 후 평균 understeer가 감소했다. 감소량은 `0.028~0.289`다.
- 같은 6개 조건의 line retention은 모두 증가했으며 증가량은 `0.009~0.238`이다.
- 고정 Bugak easy/medium/sharp 구간에서도 understeer relief `0.045 / 0.247 / 0.059`, line retention gain `0.173 / 0.295 / 0.053`으로 같은 관계를 유지했다.
- 225km/h corner-only loss는 level `0.770 < 11.198 < 29.704%`, downhill `5.533 < 25.042 < 43.423%`로 easy→medium→sharp 순서를 통과했다.
- downhill sharp loss는 level sharp보다 `13.719%p` 크다.
- HND-3의 matched straight control 24개 대비 exit speed 최대 오차는 `0km/h`, HND-1 대비 0-100 오차는 `0초`다.
- synthetic/고정 Bugak grip scenario의 accidental drift ratio 최댓값은 `0`이다.

자동 생성물:

- [HND-6 관계형 QA JSON](../../games/apex-seoul/assets/telemetry/generated/handling-relations/handling-relations-hnd6-baseline.json)
- [HND-6 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/handling-relations/handling-relations-hnd6-baseline.md)

실주행 최종 승인은 자동 QA 통과와 분리한다. `level/left`, `downhill/right`, `sharp S-bend` 체크박스와 캡처는 사용자 체감 검토가 끝날 때까지 미완료로 유지하며, 현재 결과만으로 `SH-1~SH-4` 재개를 자동 승인하지 않는다. 다만 사용자가 별도로 진행을 지시한 SH-1~SH-4는 이 승인과 분리해 완료했다.

## 2026-07-22 속도→world unit 역산 진단

### 질문을 바꾼 이유

기존 구현은 주로 내부 `speed unit`을 표시 km/h로 바꾸고 그 ratio로 handling/FOV/shader를 구동했다. 하지만 플레이어가 느끼는 것은 속도계 숫자가 아니라 **그 속도에서 도로와 가까운 물체가 화면을 얼마나 자주 통과하는가**다. 따라서 이번 진단은 변환 방향을 반대로 놓았다.

```text
원래 질문: 이 world speed unit은 몇 km/h인가?
역산 질문: 60 / 100 / 150 / 185 / 225km/h라면 매초 몇 unit을 이동하고 무엇이 몇 번 지나가는가?
```

Raven Coupe는 `drivetrainModel = physical`이라 표시 속도가 선형이다.

```text
display km/h = speed unit / 760 × 225
speed unit/s = display km/h / 225 × 760
             = display km/h × 3.37778
```

`camera.z`는 매 frame `player.speed × seconds`만큼 증가하므로 이 값은 단순한 계기판용 숫자가 아니라 초당 world 이동량이기도 하다. 따라서 `accelSpeed`나 환산식을 속도감 목적으로 바꾸면 구동계뿐 아니라 코스 통과 시간, 코너 window, 오브젝트 cadence까지 동시에 달라진다.

### 현재 inverse baseline

현재 `segmentLength = 240 unit`, lane dash는 3 segment마다 하나, blue reflector는 해당 roadside profile에서 2 segment마다 하나다. reflector 값은 배치 가능한 구간에서의 이론상 최대 cadence이며 실제 open-view/recovery에서는 더 낮다.

| 표시 속도 | world unit/s | segment/s | lane dash/s | reflector 최대/s | FOV bonus | steady base cue |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0km/h | 0.0 | 0.00 | 0.00 | 0.00 | 0.00° | 0.000 |
| 30km/h | 101.3 | 0.42 | 0.14 | 0.21 | 0.25° | 0.000 |
| 60km/h | 202.7 | 0.84 | 0.28 | 0.42 | 0.91° | 0.000 |
| 90km/h | 304.0 | 1.27 | 0.42 | 0.63 | 1.83° | 0.001 |
| 110km/h | 371.6 | 1.55 | 0.52 | 0.77 | 2.51° | 0.011 |
| 130km/h | 439.1 | 1.83 | 0.61 | 0.91 | 3.20° | 0.027 |
| 150km/h | 506.7 | 2.11 | 0.70 | 1.06 | 3.85° | 0.047 |
| 170km/h | 574.2 | 2.39 | 0.80 | 1.20 | 4.42° | 0.067 |
| 185km/h | 624.9 | 2.60 | 0.87 | 1.30 | 4.77° | 0.081 |
| 200km/h | 675.6 | 2.81 | 0.94 | 1.41 | 5.02° | 0.092 |
| 210km/h | 709.3 | 2.96 | 0.99 | 1.48 | 5.13° | 0.097 |
| 225km/h | 760.0 | 3.17 | 1.06 | 1.58 | 5.20° | 0.100 |

물리 거리로 해석하는 것은 최종 게임 스케일이 아니라 진단용 sanity check다. 그래도 `225km/h = 62.5m/s`를 그대로 대입하면 `1m ≈ 12.16 unit`, 한 segment는 약 `19.7m`, lane dash cycle 3 segment는 약 `59.2m`가 된다. 이 때문에 최고속에서도 lane dash가 약 `0.95초`에 한 번, 150km/h에서는 약 `1.42초`에 한 번만 지나간다.

### 진단 결론

1. `760 unit = 225km/h` 선형 환산은 FT86 구동계와 현재 0-100 기준에 맞으므로 속도감 조정을 위해 바꾸지 않는다.
2. 가장 큰 병목은 가까운 marker cadence다. 최고속 lane dash가 약 `1.06Hz`라 150→225km/h의 증가가 화면 리듬에서 충분히 분리되지 않는다.
3. FOV는 150km/h에서 최대 bonus의 약 `74%`, 185km/h에서 약 `92%`에 도달한다. 185→225km/h에 남은 차이는 `0.43°`뿐이라 최고속 band가 압축된다.
4. steady base cue는 약 81km/h에서 시작하지만 100km/h에도 약 `0.005`이고, 185km/h에는 최대치의 `81%`다. 중속 발동은 약하고 고속에서는 FOV와 함께 포화되는 구조다.
5. 따라서 world speed를 과장하거나 distant city/cloud를 빠르게 움직이는 대신 lane dash/reflector 같은 near-field geometry의 통과 리듬을 먼저 재설계한다.

### 개선 방향과 실행 순서

설계 단계 명칭은 `SH-1~SH-4`를 유지하지만 실제 구현 우선순위는 다음처럼 판단한다.

```text
SH-1 inverse presentation baseline
  → SH-3 roadside cadence
  → SH-2 km/h speed cue bands
  → SH-4 FOV / shader 보조 조정
```

- SH-1은 단순 speed ratio 표가 아니라 `km/h → world unit/s → segment/lane/reflector/post pass rate → FOV/cue/shader`를 한 행에 남긴다.
- SH-3은 lane dash를 road geometry segment와 분리해 한 segment 안에 짧은 dash/gap cadence를 만들 수 있게 한다. 210~225km/h near marker의 첫 목표는 약 `3~4 pass/s`이며 실제 캡처로 flicker 여부를 확인한다.
- reflector는 commitment/wall-run 구간의 near-field 보조로 조밀하게 만들되 open-view의 공간 대비는 유지한다. guardrail post는 화면 과밀을 피하기 위해 첫 반복에서는 유지한다.
- SH-2는 raw `minimumSpeedRatio` 대신 `70 / 110 / 150 / 185 / 210km/h`처럼 의미가 드러나는 band를 사용한다.
- SH-4는 185→225km/h에 FOV 변화 약 `1.2~1.5°`를 남기는 piecewise envelope를 검토한다. roadside가 주 cue이며 shader와 camera impulse는 사건성 보조로 유지한다.
- 이 진단 단계에서는 drivetrain, `accelSpeed`, handling, corner budget을 변경하지 않는다.

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

상태: **완료 (2026-07-22)**

새 `qa:speed-presentation-sweep`을 추가한다.

측정 속도:

```text
0 / 30 / 60 / 90 / 110 / 130 / 150 / 170 / 185 / 200 / 210 / 225km/h
```

측정 항목:

- 표시 km/h에서 역산한 world unit/s와 변환 identity 오차
- speed cue base/downhill/event intensity
- camera base FOV, speed bonus, impulse 포함 FOV
- shader intensity와 시간 배율
- segment, lane dash, reflector, guardrail post의 spacing과 예상 초당 통과량
- steering force, grip angle, lateral velocity cap, visual yaw
- 1초 tap/hold/release의 offset, velocity, pose

완료 조건:

- physical drivetrain에서 `unit = km/h / 225 × 760` identity 오차가 `0`에 가깝다.
- 185~225km/h가 같은 값으로 뭉치는 채널을 표로 확인할 수 있다.
- 현재 build의 결과를 JSON과 사람이 읽는 표로 남긴다.

#### 구현 결과

- `qa:speed-presentation-sweep`을 추가해 `0 / 30 / 60 / 90 / 110 / 130 / 150 / 170 / 185 / 200 / 210 / 225km/h` 12개 band를 한 번에 측정한다.
- 각 행에 역산 world unit/s, segment/lane/reflector/좌우 post cadence, steady/downhill/event speed cue, speed FOV와 event impulse, shader 입력과 time scale을 기록한다.
- 같은 속도에서 straight 1초 tap/hold/release를 재현하고 steering force, grip cap, lateral cap, visual yaw와 pose/offset/velocity를 함께 남긴다.
- lane dash, reflector, guardrail post 간격과 shader time scale을 `SPEED_PRESENTATION_WORLD_CONFIG`로 모았다. 렌더러와 QA가 같은 값을 읽으며 기존 runtime 값과 화면 결과는 변경하지 않았다.
- physical inverse identity 최대 오차는 `0km/h`, cadence 식 오차는 직렬화 반올림 범위 안에서 `0`에 가깝다.

고정된 핵심 진단:

| 항목 | SH-1 결과 | 해석 |
| --- | ---: | --- |
| 225km/h segment cadence | `3.167/s` | world 이동량 자체는 충분히 증가함 |
| 225km/h lane cadence | `1.056/s` | near-field 목표 `3~4/s`보다 희박함 |
| 225km/h reflector 최대 cadence | `1.583/s` | profile 제한이 있어 실제 평균은 더 낮음 |
| 185→225km/h FOV 증가 | `0.435°` | top-speed band가 현재 smooth curve 끝에 압축됨 |
| 185 / 225 steady cue | `0.081 / 0.100` | 최고속 전에 base cue가 상당 부분 포화됨 |
| 185→225 handling profile delta | `0` | straight base handling knot가 185km/h 이후 plateau |

마지막 handling 항목은 HND-4/5가 실패했다는 뜻이 아니다. HND는 과속 코너의 trajectory/body authority overlay를 추가했고, SH-1은 straight에서 읽는 base speed handling profile이 185~225km/h 사이 동일하다는 사실을 별도로 고정한 것이다.

자동 생성물:

- [SH-1 inverse presentation JSON](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh1-baseline.json)
- [SH-1 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh1-baseline.md)

SH-1에서는 상수 tuning을 하지 않았고, 측정 결과에서 가장 큰 병목으로 확인된 roadside cadence를 SH-3에서 먼저 개선한 뒤 SH-2 km/h cue와 SH-4 FOV/shader를 완료했다. 후속 SH-7 통합 캡처에서는 presentation 회귀 통과와 별개인 physics/collision blocker를 발견했다.

### SH-2 — speed cue를 물리 속도 기준으로 재정의

상태: **완료 (2026-07-22)**

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

#### 구현 결과

- `minimumSpeedRatio: 0.36` 하나로 계산하던 envelope를 `70 / 110 / 150 / 185 / 210 / 225km/h` band로 교체했다.
- 각 band의 steady cue 비율은 `0 / 0.12 / 0.42 / 0.72 / 1 / 1`이며 band 사이는 smoothstep으로 이어진다.
- 실제 runtime은 차량의 물리 속도를 `getDisplaySpeedKmh()`로 환산해 cue에 전달한다. speed cue 내부는 더 이상 최고속 대비 raw ratio를 입력받지 않는다.
- steady base 최대 강도 `0.1`과 downhill/drift-exit 최대치는 유지했다. drivetrain, handling, SH-3 geometry cadence와 FOV 식은 변경하지 않았다.
- throttle burst의 첫 프레임 상태를 `null`로 분리해 고속 상태의 초기 hold에는 발동하지 않고, 명시적인 `false → true` 페달 재입력에만 발동한다.
- 210~225km/h steady/downhill/event cue는 같은 값으로 hold된다. 이 구간의 추가 속도감은 SH-3 roadside cadence가 담당한다.

| 속도 | SH-1/SH-3 base | SH-2 base | SH-2 의미 |
| ---: | ---: | ---: | --- |
| 60km/h | `0` | `0` | cue 미개입 |
| 90km/h | `0.001` | `0.006` | 흐름이 읽히기 시작 |
| 110km/h | `0.011` | `0.012` | cruise band |
| 150km/h | `0.047` | `0.042` | roadside가 주 cue |
| 185km/h | `0.081` | `0.072` | 최고속 전 포화 완화 |
| 210km/h | `0.097` | `0.100` | full steady cue |
| 225km/h | `0.100` | `0.100` | top-speed hold |

검증 결과:

- `qa:speed-cue`에서 0~225km/h envelope 단조 증가, 70km/h 미만 0, band별 강도와 210→225km/h delta `0`을 자동 확인한다.
- 207km/h에서 초기 throttle hold burst는 `0`, 페달 재입력 peak는 `0.1851`, drift-exit peak는 `0.2445`다.
- SH-2 presentation sweep은 km/h band identity, cue 범위, SH-3 cadence와 기존 물리/handling invariant를 함께 통과한다.

자동 생성물:

- [SH-2 km/h cue snapshot](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh2-baseline.md)

SH-2로 raw ratio cue와 최고속 상시 증가 문제는 해소됐다. 당시 남아 있던 185→225km/h FOV 압축은 SH-4에서 처리했다.

### SH-3 — roadside flow를 주 속도 cue로 조정

상태: **완료 (2026-07-22)**

우선순위는 shader보다 가까운 geometry다.

1. lane dash의 near pass cadence를 측정한다.
2. reflector와 guardrail post의 최소/최대 간격을 속도별로 비교한다.
3. straight/crest/open-view에서 과밀하지 않게 segment 역할별 밀도를 구분한다.
4. 코너 위험 표지와 속도 표지는 일반 속도 marker와 분리한다.

통과 기준:

- shader를 꺼도 100/150/210km/h를 roadside 통과 리듬으로 구분할 수 있다.
- 가까운 marker가 flicker나 한 프레임 pop으로 보이지 않는다.
- distant city/cloud가 빠르게 움직여 속도감을 대신하지 않는다.

#### 구현 결과

- lane dash를 `3 segment마다 한 segment 전체`를 칠하던 구조에서 `매 segment 안의 짧은 dash/gap`으로 바꿨다.
- 새 dash는 segment 시작의 `0.16` 지점부터 길이 `0.34 segment`만 그린다. 기존 painted duty 약 1/3은 유지하면서 통과 사건만 세 배로 늘렸다.
- dash의 시작/끝 world Z를 현재 road slice에 clip한 뒤 center/elevation/road width를 보간해 다시 투영한다. 가까운 첫 segment에서도 dash가 카메라 뒤에서 갑자기 생기지 않는다.
- blue reflector는 commitment/wall-run profile 제한을 유지한 채 간격만 `2 segment → 1 segment`로 줄였다.
- 좌우 guardrail post 간격 `4 / 3 segment`, forest, chevron, distant background는 변경하지 않았다.
- `SPEED_PRESENTATION_WORLD_CONFIG`가 lane dash의 start/length/interval과 reflector/post 간격을 함께 소유한다.

SH-1 대비 theoretical cadence:

| 속도 | lane SH-1 | lane SH-3 | reflector SH-1 | reflector SH-3 |
| ---: | ---: | ---: | ---: | ---: |
| 150km/h | `0.704/s` | `2.111/s` | `1.056/s` | `2.111/s` |
| 185km/h | `0.868/s` | `2.604/s` | `1.302/s` | `2.604/s` |
| 210km/h | `0.985/s` | `2.956/s` | `1.478/s` | `2.956/s` |
| 225km/h | `1.056/s` | `3.167/s` | `1.583/s` | `3.167/s` |

검증 결과:

- SH-3 snapshot의 210km/h lane cadence `2.956/s`, 225km/h lane/reflector cadence `3.167/s`가 자동 gate를 통과했다.
- 225km/h actual runtime에서 reflector rolling pass rate 최대 `4/s`, screen velocity 최대 약 `102px/s`, visible anchor `6~17개`를 기록했다.
- 실제 캡처에서 중앙선은 여러 개의 짧은 dash로 분리되고 guardrail post는 기존 밀도를 유지했다. 10초 runtime telemetry에서 보이는 motion anchor는 `6~17개`로 유지됐고 캡처에서 화면 전체 과밀은 없었다. 주행 중 flicker 체감은 최종 실주행 검토 항목으로 남긴다.
- inverse identity, speed cue, FOV, straight handling 값은 SH-1과 동일하다. 이번 단계는 presentation geometry cadence만 변경했다.

자동 생성물:

- [SH-1 변경 전 표](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh1-baseline.md)
- [SH-3 cadence snapshot](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh3-baseline.md)
- [SH-3 225km/h runtime summary](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh3-runtime/apex-seoul-drive-2026-07-22T01-36-44-958Z_curve-no-input.summary.json)
- [SH-3 225km/h runtime 캡처](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh3-runtime/sh3-225-cadence.png)

SH-3으로 near-field cadence 병목은 자동 기준상 해소됐다. km/h cue는 SH-2, top-band FOV 압축은 SH-4에서 완료했다.

### SH-4 — FOV와 shader를 보조 채널로 재조정

상태: **완료 (2026-07-22)**

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

#### 구현 결과

- 단일 `smoothstep(speedRatio)` FOV를 `0 / 60 / 110 / 150 / 185 / 210 / 225km/h` piecewise envelope로 교체했다.
- 최대 `5.2°`는 유지하되 bonus 비율을 `0 / 0.15 / 0.38 / 0.58 / 0.75 / 0.91 / 1`로 배치했다. 185km/h bonus를 `4.765° → 3.9°`로 낮춰 185→225km/h에 `1.3°`를 남겼다.
- runtime camera는 SH-2와 동일하게 실제 표시 km/h를 입력받는다. band 사이는 smoothstep으로 연결되고 기존 FOV response와 사건 impulse response는 유지된다.
- shader target intensity를 공용 `getSpeedEffectIntensity()`로 제한하고 최대치를 `0.38`로 고정했다. downhill, throttle, drift-exit가 동시에 겹쳐도 이를 넘지 않는다.
- steady shader는 210~225km/h에서 `0.1`로 hold된다. 이 구간에서는 FOV만 `4.732° → 5.2°`로 증가하므로 두 채널의 동시 포화를 피한다.
- throttle/drift-exit camera impulse 상수 `0.8° / 1.2°`와 shake 상수는 변경하지 않았다.

| 속도 | SH-2 FOV bonus | SH-4 FOV bonus |
| ---: | ---: | ---: |
| 60km/h | `0.912°` | `0.780°` |
| 110km/h | `2.513°` | `1.976°` |
| 150km/h | `3.852°` | `3.016°` |
| 185km/h | `4.765°` | `3.900°` |
| 210km/h | `5.134°` | `4.732°` |
| 225km/h | `5.200°` | `5.200°` |

검증 결과:

- 225km/h FOV bonus `5.2°`, 185→225km/h delta `1.3°`, steady shader `0.1`, 최악의 event overlap shader `0.38`로 잠정 gate를 통과했다.
- 1초 측정 camera impulse peak는 throttle `0.749°`, drift-exit `1.141°`로 상한 안에 있다.
- 실제 WebGL 185/225km/h 캡처에서 camera FOV 최대는 `72.913° / 74.217°`, 차이는 `1.304°`였다.
- 같은 downhill runtime의 shader intensity 최대는 `0.117 / 0.168`, 예상 peak alpha는 `0.011 / 0.018`로 과도한 전면 glow 없이 유지됐다.
- drivetrain, 0-100, handling, SH-2 cue와 SH-3 cadence는 변경하지 않았다.

자동 생성물:

- [SH-4 FOV/shader snapshot](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/speed-presentation-sh4-baseline.md)
- [185km/h runtime summary](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh4-runtime/185/apex-seoul-drive-2026-07-22T01-56-23-567Z_curve-no-input.summary.json)
- [185km/h runtime capture](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh4-runtime/185/sh4-185.png)
- [225km/h runtime summary](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh4-runtime/225/apex-seoul-drive-2026-07-22T01-56-56-113Z_curve-no-input.summary.json)
- [225km/h runtime capture](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh4-runtime/225/sh4-225.png)

SH-1~SH-4의 자동 gate는 모두 완료됐다. 후속 SH-7 통합 telemetry는 캡처를 마쳤지만 blocking gate 때문에 사용자 체감 승인을 보류했으며, FOV/shader 추가 tuning은 실제 비교 주행 리뷰가 있을 때만 진행한다.

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

상태: **자동 승인 READY / 사용자 실주행 승인 대기 (2026-07-22)**

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

#### 구현 및 측정 결과

- `qaStartSpeed`와 `qaStartZ`를 추가해 물리를 매 frame 덮어쓰지 않고 원하는 속도·코스 위치에서 실제 controller run을 시작할 수 있게 했다.
- 장시간 직선 측정용 `qaTimeScale`은 QA에서만 `1~4x`를 허용한다. 4x run은 같은 update 식을 사용하며, 별도로 남은 55초 1x run과 최고속 결과가 같았다.
- `sh7-straight-accel`, `sh7-grip-corners`, `sh7-drift-mixed` 입력 시나리오와 `qa:sh7-telemetry` 통합 audit를 추가했다.
- audit는 최신 세 JSONL을 자동 선택해 physics speed/gear/rpm, FOV/shader, theoretical segment cadence, corner grade, understeer, drift state, guardrail contact를 한 표로 합친다.
- 캡처 파일과 필수 채널의 유효성은 통과했다. 자동 승인과 사용자 실주행 승인은 blocking gate와 분리했다.

초기 진단 캡처는 다음과 같았다.

| run | 샘플 | 속도 | 관측 상태 | shader max | 결과 |
| --- | ---: | ---: | --- | ---: | --- |
| straight | `140` | `0.9~140.7km/h` | gear `1~4`, grip | `0.0401` | 225km/h 미도달 |
| grip | `90` | `34.4~183.5km/h` | easy/medium/sharp, grip only | `0.1215` | visual rail impact `3` |
| drift | `80` | `39.1~182.6km/h` | brake setup/drift/recovery | `0.1225` | impact `1`, counter/exit burst 미관측 |

확정된 blocking gate:

1. flat straight full-throttle는 55초 1x와 14초 4x 모두 `140.7km/h`에서 평형을 이뤄 목표 `223~225km/h`에 도달하지 못했다.
2. grip/drift run은 실제 road offset ratio가 각각 최대 `0.1335 / 0.1378`인데 visual rail contact ratio가 `1.0015 / 1.0010`에 도달해 충돌했다. 도로 폭 사용량과 충돌 경계가 맞지 않는다.
3. drift는 `setup → drift → recovery`와 brake entry를 기록했지만 counter-steer timer와 drift-exit burst는 모두 `0`이었다. 충돌 감속이 정상 exit cycle을 오염시켰다.

유지된 관계:

- straight에는 guardrail impact가 없고 grip run은 끝까지 accidental drift 없이 `grip`을 유지했다.
- grip은 easy/medium/sharp 세 grade, drift는 within-budget/overspeed와 brake entry를 모두 기록했다.
- shader 최대는 세 run 모두 `0.38` gate 아래이며 FOV, shader, cadence, handling 채널은 모두 finite다.
- 따라서 이 초기 시점에는 SH-1~SH-4 presentation 회귀만 통과했고 SH-7 자동 승인은 부여하지 않았다.

자동 생성물:

- [SH-7 통합 보고서](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/sh7-integrated-telemetry.md)
- [straight capture](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/straight/sh7-straight.png)
- [grip capture](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/grip/sh7-grip.png)
- [drift capture](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/drift/sh7-drift.png)

후속 진단에서 flat 최고속은 `4단 변속 도달 불가 + 6단 force budget 부족`, visual rail은 `화면 합성 좌표와 물리 lateral 좌표 혼합`이 원인으로 확정됐다. 수치와 실행 단계는 [최고속 평형·Visual Rail Boundary 진단 및 개선 계획](./apex-seoul-top-speed-equilibrium-diagnosis-plan.md)에 기록한다.

후속 `TSE-1~TSE-6`, `RAIL-1~RAIL-2`와 drift 입력 교정을 마친 최종 결과는 다음과 같다.

| run | 샘플 | 속도 | 관측 상태 | shader max | 결과 |
| --- | ---: | ---: | --- | ---: | --- |
| straight | `700` | `0.2~225km/h` | gear `1~6`, grip | `0.1056` | READY |
| grip | `90` | `113~193.6km/h` | easy/medium/sharp, grip only | `0.1089` | impact `0` |
| drift | `80` | `134.7~191.5km/h` | setup/drift/recovery/grip, counter `0.749초` | `0.1339` | impact `0`, exit burst `0.0354` |

브레이크는 drift entry threshold 직후 해제하고 반대 조향을 drift 상태 안에서 유지한다. 이후 neutral throttle로 recovery를 만들고 grip 복귀 직후 가속을 재입력한다. recovery→grip 전환과 브라우저 입력 반영이 한 프레임 어긋나도 cue가 사라지지 않도록 `0.28초` 재가속 허용 창을 추가했다. `qa:sh7-telemetry` 결과는 `Approval: READY`, `Blocking gates: none`이다. 사용자 실주행 승인은 별도로 요청한다.

## 자동 검증 계획

```bash
npm run qa:powerband-reference --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:speed-cue --workspace @games/apex-seoul
npm run qa:speed-presentation-sweep --workspace @games/apex-seoul
npm run qa:top-speed-equilibrium --workspace @games/apex-seoul
npm run qa:top-speed-force-budget --workspace @games/apex-seoul
npm run qa:top-speed-calibration --workspace @games/apex-seoul
npm run qa:top-speed-regression --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:corner-demand-sweep --workspace @games/apex-seoul
npm run qa:handling-sim --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run qa:drive-telemetry --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

`qa:corner-demand-sweep`은 HND-1, `qa:speed-presentation-sweep`은 SH-1에서 추가했다. 나머지 명령의 기존 gate는 원인 없이 완화하지 않는다.

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
- `unit → km/h`만 보다가 `km/h → unit → 초당 통과 횟수`로 질문을 뒤집은 계기
- 환산식은 맞았지만 225km/h lane dash가 약 `1.06Hz`라 느리게 보였던 시행착오
- 한 segment 약 `19.7m`, 기존 lane dash cycle 약 `59.2m`라는 sanity check와 pseudo-3D 스케일의 차이
- FOV가 185km/h에서 이미 약 `92%` 포화되어 최고속 band가 `0.43°`에 압축됐던 문제
- raw ratio cue를 물리 km/h 기준으로 바꾼 이유
- shader보다 roadside cadence가 속도감에 더 크게 작용한 장면
- painted duty는 거의 유지하면서 `긴 dash/긴 공백`을 `짧은 dash/짧은 공백`으로 바꿔 pass rate를 세 배 만든 과정
- SH-1 `1.056/s`와 SH-3 `3.167/s` 표, 225km/h runtime reflector 최대 `4/s` 캡처 비교
- 185~225km/h handling knot를 추가하기 전후의 tap/hold/release 표
- 속도감을 키우면서 camera shake를 상시화하지 않은 이유
- FT86 기반 구동계를 유지하면서 아케이드 코너링을 조정한 타협점
- 225km/h 표시 envelope를 통과했지만 실제 구동력은 4단 140.7km/h에서 평형을 이뤘던 실패
- 기존 speed ratio 변속표와 실제 기어비 기반 7,400rpm 변속점이 동시에 남아 4단 고착을 만든 과정
- 0-100 자동 측정만으로 terminal speed를 보장할 수 없었던 이유
- 화면 도로 폭과 차량 display size를 물리 collision 폭으로 역산해 도로의 12~14%에서 rail impact가 발생한 사례

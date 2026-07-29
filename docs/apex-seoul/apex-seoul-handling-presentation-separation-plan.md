# Apex Seoul 핸들링·시각 분리 병행 계획

갱신일: 2026-07-28

상태: **GDS-2B·VSD-2 자동 검증 완료, runtime replay 대기**

## 배경

실주행 telemetry에서 strong steering sprite는 단순 texture가 아니라 drift 상태와 함께 선택된다. 따라서 플레이어는 pose 전환과 실제 drift 감속, 약한 speed cue를 하나의 “차가 느려졌다”는 사건으로 인식한다.

두 축은 분리해 진행한다.

```text
handling
  직접 turn-in을 먼저 만든다
  → heading inertia / drift는 실패 비용으로 유지한다

presentation
  pose 전환에도 road-flow / body motion을 유지한다
  → 실제 speed loss는 FOV·speed effect로 읽히게 한다
```

시각 변경은 player physics, speed, drift entry, collision 값을 수정하지 않는다. 핸들링 변경은 sprite frame 선택이나 camera cue를 수정하지 않는다.

## 병행 단계

| 단계 | 축 | 상태 | 범위 |
| --- | --- | --- | --- |
| GDS-2A | handling | 구현 | grip direct steering `0.14 → 0.30` |
| VSD-1 | presentation | 구현 | strong drift pose의 body roll을 0이 아닌 작은 값으로 유지 |
| GDS-2B | handling | 구현 | 바깥 heading debt를 full corner steer로 먼저 회복 |
| VSD-2 | presentation | 구현 | drift speed loss에 맞춘 FOV/speed-effect floor |
| VSD-3 | presentation | 대기 | strong input pose와 drift pose를 asset/state 차원에서 분리할지 결정 |
| GDS-3 | handling | 대기 | drift entry·counter-steer·exit 재검증 |

## VSD-1 — Strong pose body-roll 연속화

상태: **구현**

### 관측

첨부 `apex-seoul-drive-2026-07-28T01-01-00-935Z_rr12zr.jsonl`에서 `steer-right-2`는 drift/recovery 때만 나타났고, `rotationDeg`는 모두 `0`이었다. 동시에 실제 속도는 예를 들어 `136.7 → 117.7km/h`로 떨어지고 speed effect는 `0.044 → 0.020` 수준이었다.

### 변경

- strong drift frame의 texture yaw는 그대로 유지한다.
- 기존 `rotationValue = 0`을 `driftPoseValue × 0.34`로 변경한다.
- 결과적인 차체 roll은 통상 약 `0.5~1.2°` 범위이며, strong sprite가 이미 가진 yaw를 중복하지 않는다.
- shadow도 같은 `visualRotationValue`를 공유하므로 차체와 접지 shadow가 함께 연속적으로 움직인다.

### 완료 gate

- drift physics와 speed는 VSD-1 전후 동일하다.
- `steer-right-2`/`downhill-right-2`에서 `rotationDeg`가 `0`에 고정되지 않는다.
- 같은 strong pose가 sprite 자체의 yaw와 합쳐 과도하게 회전하지 않는다.

## GDS-2A — Direct turn-in 증강

상태: **구현**

- [grip 직접 조향 전환 계획](./apex-seoul-grip-direct-steering-plan.md)의 GDS-2A를 이 병행 계획의 handling 기준선으로 사용한다.
- 130km/h, 0.18초 full steer에서 직접 steering velocity는 `9.2667 → 19.8572u/s`, grip line quality는 `0.648 → 0.720`으로 개선됐다.
- VSD-1은 이 값과 무관해야 한다.

## GDS-2B — Outward heading-debt recovery

상태: **구현**

### 실주행 관측

첨부 `apex-seoul-drive-2026-07-28T03-58-21-632Z_8zwy5l.jsonl`에서 `steer-right-*`는 좌·우 공용 asset 이름이며 왼쪽은 `flipX=true`로 표현된다. 따라서 sprite 이름 자체가 한쪽 물리를 만드는 원인은 아니다. 다만 full steering이 이미 반대 방향 heading/횡이동 debt를 해소하는 동안 화면상 lane offset이 계속 바깥으로 진행했다.

| 구간 | 입력/조향 | heading·offset 변화 | 판정 |
| --- | --- | --- | --- |
| 15.44→17.66초 | full-right, physical `0.70→1.00` | heading `-0.315→0.002`, offset `-187→-381` | 입력은 즉시 도달했지만 debt를 갚는 동안 바깥 진행이 지속 |
| 27.67→29.24초 | full-left, physical `-1.00` | heading `0.536→0.269`, offset `432→601` | grip recovery에서도 같은 지연 인상이 발생 |

### 변경

- `grip` 상태에서 render-space `currentCurve`가 아니라 실제 `requiredRoadYawRate` 방향으로 입력하고, **실제 physical steering도 그 방향으로 교차한 뒤**, 현재 heading이 그 반대 방향일 때만 steering heading rate를 `1.4×`로 높인다.
- 이는 lateral centering이나 road auto-follow가 아니다. neutral, 이미 코너 안쪽을 향한 입력, drift/recovery에는 적용하지 않는다.
- 빠른 회복이 새 반대 heading을 만들지 않게 grip inside-heading allowance를 `0.06 → 0.02`로 제한한다. drift allowance는 유지한다.
- GDS-2B-2는 raw input만 먼저 반전되고 physical steering이 아직 이전 방향인 경우에는 보정을 보류한다. 따라서 rapid reversal에서 반대 yaw를 증폭하지 않는다.
- GDS-2B-3는 render curve와 vehicle yaw의 부호가 반대라는 점을 반영한다. 좌코너의 우조향처럼 실제 road yaw와 반대인 입력은 recovery로 오인하지 않으며, 바깥 rail 위험을 보존한다.

### 완료 gate 및 결과

130km/h, curve `0.45`, outward heading `-0.34`, offset `-180` fixture에서 0.4초 full corner steer를 검사한다.

| 항목 | GDS-2A 기준 | GDS-2B | 결과 |
| --- | ---: | ---: | --- |
| outward heading | `-0.204` | `-0.1178` | 회복 가속 |
| outward corner inertia | `-64.6u/s` | `-37.3694u/s` | 42% 감소 |
| 최대 추가 outward offset | 약 `25u` | `20.0426u` | 감소 |
| neutral fixture | 직접 횡조향 없음 | steering velocity `0` | 유지 |

- `qa:grip-outward-recovery`: `5/5 PASS` — 좌우 대칭, outward debt 회복, neutral 비개입, physical steering 교차 전 보류, 좌코너 우조향의 오른쪽 rail contact.
- `qa:gds2b3-runtime`: `3/3 PASS` — browser replay가 `qaStartZ=6200`(progress `0.0747`), speed `435`에서 시작해 full-right physical command 50개 sample 뒤 progress `0.0878`에 오른쪽 rail을 접촉한다.
- `qa:grip-turn-in`: `3/3 PASS`.
- `qa:corner-exit-recovery`: `6/6 PASS` — 반대 heading/inertia launch 없음.

## VSD-2 — Drift road-flow floor

상태: **구현**

### 실주행 재측정

첨부 `apex-seoul-drive-2026-07-28T01-16-09-268Z_cictx2.jsonl`에서 VSD-1 strong pose는 `rotationDeg -1.15~-0.91°`, `+0.87~+1.12°`로 더 이상 0에 고정되지 않았다. 하지만 strong pose의 speed effect는 `0.013~0.039`, FOV cue는 대체로 `0.08°` 이하였다. pose 연속성은 회복됐지만 road-flow가 감속과 함께 너무 빨리 사라진다.

### 변경

- `setup`, `drift`, `recovery` 동안 90~150km/h 속도 범위에 비례하는 `driftFlow` cue를 추가한다.
- 90km/h 이하는 `0`, 150km/h 이상은 최대 `0.18`이며 중간은 smoothstep으로 보간한다.
- 이 cue는 speed-effect intensity와 shader event strength에 함께 더해 near-road streak가 strong pose에서 끊기지 않게 한다.
- camera FOV cue에는 최대 `0.38°`만 더한다. 실제 speed FOV와 speed loss는 보존하며 fake acceleration처럼 읽히지 않게 한다.
- `driftFlow`는 속도에만 의존하며, physics speed·drift force·entry 조건·camera shake는 수정하지 않는다.
- runtime telemetry의 `speedEffect.driftFlow`와 `expectedPeakAlpha`에도 이 cue를 포함해, 다음 replay에서 시각 보강량을 직접 판독한다.

| 실제 속도 | `driftFlow` |
| --- | ---: |
| 90km/h | `0.0000` |
| 110km/h | `0.0467` |
| 130km/h | `0.1333` |
| 150km/h 이상 | `0.1800` |

### 완료 gate

- strong pose에서 driftFlow가 실제 km/h에 따라 연속적으로 변하고, 90km/h 이하에서는 사라진다.
- strong pose frame 전환만으로 speed, corner loss, drift state가 달라지지 않는다.
- 기존 drift exit burst와 rail impact cue는 유지한다.

### 검증 결과

| 검사 | 결과 |
| --- | --- |
| `qa:speed-presentation-sweep` | PASS — speed/FOV/cadence identity 유지 |
| `qa:grip-turn-in` | `3/3 PASS` |
| `qa:corner-exit-recovery` | `6/6 PASS` |
| production build | PASS |

다음 runtime log에서는 `speedEffect.driftFlow`와 `fovCueDegrees`를 VSD-1 fixture의 strong-pose 범위와 직접 비교한다.

## 다음 runtime 비교

동일한 130~140km/h, curve `0.30~0.45` turn-in에서 다음을 기록한다.

1. 입력 뒤 `0.1 / 0.2 / 0.3초`의 net lateral velocity
2. `setup`, `drift` 진입 시각과 speed loss
3. frame 전환 전후 `rotationDeg`, FOV cue, speed effect intensity
4. strong pose에서 실제 감속을 충분히 읽을 수 있는지에 대한 사용자 리뷰

VSD-2와 GDS-2B는 구현했으며, 다음 비교에서 실제 감속을 유지하면서 road-flow가 충분히 읽히는지와, full corner steer의 바깥 heading debt가 더 빨리 해소되는지를 확인한다.

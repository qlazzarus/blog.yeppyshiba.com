# Apex Seoul 핸들링·시각 분리 병행 계획

갱신일: 2026-07-28

상태: **GDS-2A 자동 검증 완료, VSD-2 자동 검증 완료·runtime replay 대기**

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
| GDS-2B | handling | 대기 | 새 runtime log에서 turn-in net lateral response·drift entry를 재측정 |
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

VSD-2는 구현했으며, 다음 비교에서 실제 감속을 유지하면서 strong pose의 road-flow가 충분히 읽히는지 확인한다. GDS-2B는 turn-in이 여전히 늦다고 확인될 때만 direct force 범위를 다시 조정한다.

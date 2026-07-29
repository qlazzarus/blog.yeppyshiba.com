# Apex Seoul grip 직접 조향 전환 계획

갱신일: 2026-07-28

상태: **GDS-2A·GDS-2B 구현·자동 회귀 검증 완료, browser replay 대기**

## 문제 정의

현재 grip 상태의 횡이동은 주로 world-heading debt의 road-relative 투영으로 발생한다. 이 규칙은 무입력 차량이 도로를 자동으로 따라가지 않게 하지만, steering 입력도 차체 heading이 먼저 변할 때까지 기다리게 한다. 그 결과 turn-in의 즉시성이 약하고, 고속 조향의 감각을 하나의 heading 채널에 과도하게 의존한다.

공개 pseudo-3D 구현은 대체로 두 힘을 분리한다.

- 입력은 즉시 횡방향 반응을 만든다.
- 커브는 별도의 바깥쪽 힘 또는 trajectory cost를 만든다.

Apex Seoul은 이 단순한 구조를 그대로 복사하지 않는다. 이미 구현한 world-line 관성, understeer, drift, counter steer를 보존하면서 grip 입력의 첫 반응만 단계적으로 복원한다.

## 목표 계약

```text
grip input
  작은 직접 tire response
  + heading debt 변화
  + 과속이면 understeer / 바깥 trajectory

neutral input
  직접 조향력 0
  + 기존 heading debt / 커브 위험 유지

drift
  기존 drift lateral / counter-steer authority 유지
```

직접 조향은 road curvature를 입력으로 사용하지 않는다. 따라서 무입력 road-follow를 되살리거나 neutral 차량을 중앙으로 끌어당기지 않는다.

## 공개 pseudo-3D 구현과의 비교

비교 대상은 rendering 방식이 아니라 조향력을 합성하는 순서다.

| 구현 | 입력 직후의 횡반응 | 커브 힘 | Apex Seoul에 적용할 점 |
| --- | --- | --- | --- |
| [JavaScript Racer](https://github.com/jakesgordon/javascript-racer) | 입력이 매 frame `playerX`를 직접 이동시킨다. 최고속에서는 약 1초에 road 폭 `-1 → +1`을 횡단할 수 있다. | 별도 centrifugal term이 차를 커브 바깥으로 민다. | 입력과 커브 위험을 한 식으로 섞지 않는다. turn-in은 즉시, 늦은 조향의 비용은 별도다. |
| [Phaser Driving](https://github.com/pinkkis/phaser-driving) | `turn`을 누적하고 `turn × speed`로 플레이어 x를 직접 이동시킨다. 키를 놓으면 turn을 감쇠시킨다. | 별도 centrifugal term을 적용한다. | steering state의 완만한 복귀는 유지하되, 실제 횡이동은 heading 변화만 기다리지 않는다. |
| Apex Seoul GDS-2 | command는 빠르게 차지만, grip 직접 횡속도는 약 `20u/s`로 작다. | heading debt 투영이 먼저 쌓인 `190~290u/s` 바깥 관성을 남긴다. | 직접 grip turn-in을 올리고, neutral/late-input 관성은 유지한다. |

두 공개 구현은 단순한 arcade 모델이므로 Apex Seoul의 world-line, understeer, drift를 제거할 근거는 아니다. 다만 둘 다 **입력 반응을 커브 바깥 힘보다 앞에 둔다**는 점이 이번 수정의 기준이다.

## 2026-07-28 실주행 로그 판정

첨부 `apex-seoul-drive-2026-07-28T00-53-35-692Z_or4fcu.jsonl`의 첫 full-right turn-in을 분석했다. 10Hz telemetry이므로 시간값은 약 `0.1초` 해상도다.

| 시각 | 입력 | 속도 / curve | physical command | steer velocity | heading inertia | 합산 횡속도 |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 14.418초 | `0` | 133.5km/h / `0.308` | `0.000` | `0.0` | `-287.8` | `-287.8` |
| 14.535초 | `+1` | 134.9km/h / `0.347` | `0.769` | `+6.8` | `-232.4` | `-225.7` |
| 14.635초 | `+1` | 135.7km/h / `0.388` | `0.961` | `+14.3` | `-205.4` | `-191.2` |
| 14.735초 | `+1` | 136.4km/h / `0.428` | `0.993` | `+17.8` | `-190.5` | `-172.7` |
| 14.851초 | `+1` | 123.9km/h / `0.472` | `0.999` | `+113.0` | `-215.0` | `-55.1` |

판정:

- input smoothing이 원인이 아니다. physical command는 첫 0.1초 안에 `0.961`까지 도달한다.
- grip 직접 횡속도는 full command에서도 약 `+20u/s`이며, 이미 쌓인 바깥 inertia `-190~-290u/s`를 즉시 상쇄하지 못한다.
- 14.851초부터 state가 `grip → setup → drift`로 바뀐다. 따라서 full steer의 체감 turn-in은 grip 반응이 아니라 약 0.3초 뒤의 drift kick에 의존한다.
- GDS-2의 heading 관성 재분배는 first-response를 키우지 않았다. 독립 QA에서 0.18초 offset은 GDS-1의 `2.9136u`보다 작은 `2.6337u`였다.

## 단계

### GDS-1 — Grip 직접 turn-in 채널

상태: **구현**

- grip에서도 `steerAcceleration`의 `14%`를 입력 전용 횡가속도로 적용한다.
- 기존 `physicalSteeringCommand`, speed-band authority, grip angle cap, damping, 횡속도 상한을 그대로 공유한다.
- neutral에서는 힘이 정확히 `0`이고, drift에서는 기존 `100%` authority를 유지한다.
- heading debt 기반 관성은 이번 단계에서 줄이지 않는다. 따라서 early turn-in의 반응만 추가하고 late input의 바깥 trajectory 비용은 보존한다.
- `qa:grip-turn-in`으로 130km/h 직선에서 0.18초 조향 시 즉시 횡응답, 좌우 대칭, neutral 정지를 검사한다.

완료 기준:

- 130km/h, `steer=±0.62`, 0.18초에서 offset `1.5u` 이상과 steering velocity `8u/s` 이상이 즉시 같은 방향으로 발생한다.
- 좌우 오차는 반올림 기준 `0.05` 이하이다.
- 같은 조건 `steer=0`에서는 direct lateral motion이 없다.

검증 결과:

| 검사 | 결과 |
| --- | --- |
| `qa:grip-turn-in` | `3/3 PASS` — 130km/h, 0.18초 turn-in은 `2.9136u`, `9.2667u/s`; 좌우 대칭·neutral 정지 통과 |
| `qa:heading-debt` | `5/5 PASS` |
| `qa:corner-exit-recovery` | `6/6 PASS` |
| production build | PASS |

`qa:corner-handling`의 고속 무입력 거리 비율 gate는 현재 작업 트리에 이미 있는 CST-1 heading-inertia cap 보정으로 `1.229`가 되어 실패한다. GDS-1은 입력이 `0`인 해당 scenario에 직접 힘을 적용하지 않으므로, 이 실패를 GDS-1 tuning으로 보정하거나 gate를 약화하지 않는다. CST 기준선 정리가 끝난 뒤 동일 QA를 다시 승인한다.

### GDS-2 — Heading 관성 재분배

상태: **구현**

- grip의 유효 steering command에 비례해 heading 기반 횡투영을 부드럽게 `0~28%` 낮춘다. full steer는 `72%`, 입력 해제는 `100%`로 복귀한다.
- 이 비율은 heading state 자체나 road yaw를 지우지 않는다. 직접 tire response가 생긴 turn-in에 한해서만 동일 heading으로 계산되는 lateral output을 재분배한다.
- neutral no-follow, strong-corner outward threat, counter-steer exit 계약을 함께 재측정한다.

완료 기준:

- `steer=0`의 heading inertia는 GDS-1 기준과 동일하다.
- turn-in/release 중 scale은 command와 함께 연속적으로 `0.72~1.00` 범위에서만 변한다.
- direct steering과 합쳐도 grip line, heading debt, drift exit 회귀가 발생하지 않는다.

검증 결과:

| 검사 | 결과 |
| --- | --- |
| active grip 최대 heading inertia | `26.332 → 24.054u/s` |
| active grip 최대 offset | `85.065 → 77.014u` |
| `qa:grip-turn-in` | `3/3 PASS` |
| `qa:heading-debt` | `5/5 PASS` |
| `qa:corner-exit-recovery` | `6/6 PASS` |
| production build | PASS |

### GDS-2B — 바깥 heading debt 회복

상태: **구현**

2026-07-28 실주행 로그에서 full steer가 이미 반대 부호인 heading debt를 먼저 해소하는 동안 lateral offset이 계속 바깥으로 진행했다. GDS-2B는 다음의 제한된 보정만 추가한다.

- `grip`, `requiredRoadYawRate` 기준 corner 방향 input, **같은 방향으로 교차한 physical steering**, 반대 heading debt가 동시에 있을 때 steering heading rate `1.4×`.
- neutral, 반대 방향 steer, 이미 안쪽 heading, drift/recovery에는 보정 `1×`.
- grip inside heading allowance를 `0.06 → 0.02`로 줄여 빠른 debt 해소가 반대 inertia launch로 바뀌지 않게 한다.
- GDS-2B-2: raw input 반전 직후 physical steering이 아직 이전 부호면 보정을 기다린다. 130km/h rapid-reversal fixture에서 교차 전 physical steering은 `-0.0815`, 교차 뒤 `+0.1778`이며, 이때부터 heading은 `-0.3511 → -0.1552`로 회복한다.
- GDS-2B-3: `currentCurve`는 render-space bend이고 실제 road yaw는 반대 부호다. 모든 same/counter steer 비교를 `requiredRoadYawRate` 기준으로 전환했다. left-curve/right-steer fixture는 오른쪽 front rail에 `1회` 접촉한다(`lateralOffset 333.3222`, contact direction `+1`).

검증 fixture(130km/h, curve `0.45`, heading `-0.34`)의 0.4초 full steer 결과는 heading `-0.204 → -0.1178`, outward inertia `-64.6 → -37.3694u/s`, 최대 추가 outward offset 약 `25 → 20.0426u`다.

| 검사 | 결과 |
| --- | --- |
| `qa:grip-outward-recovery` | `5/5 PASS` — 좌우 대칭·neutral 비개입·rapid reversal 보류·opposite-steer rail impact |
| `qa:gds2b3-runtime` | `3/3 PASS` — 실제 browser track replay의 left-curve/right-steer가 right guardrail contact |

`qa:gds2b3-runtime`은 Playwright/Windows Edge로 `qaStartZ=6200`, `qaStartSpeed=435`에서 시작하고 우조향을 유지한다. 실행 결과는 `assets/telemetry/generated/gds-2b3-runtime/`에 기록되며, fixture 시작 curve `0.5504`, full-right physical command 50 sample, progress `0.0878`의 right rail contact를 계약으로 검사한다.
| `qa:grip-turn-in` | `3/3 PASS` |
| `qa:corner-exit-recovery` | `6/6 PASS` |

무입력 110/185km/h corner inertia와 offset은 각각 동일하게 유지됐다. `qa:corner-handling`의 실패는 GDS-1에서 기록한 CST-1 high-speed neutral gate 하나뿐이며, GDS-2의 active-input scaling과는 독립적이다.

### GDS-2A — Grip 직접 turn-in 증강

상태: **구현**

- `GRIP_DIRECT_STEER_FORCE_SCALE`을 `0.14 → 0.30`으로 올린다. 같은 damping 기준으로 full-command grip 횡속도는 약 `20u/s → 45~60u/s`가 목표다.
- GDS-2의 `0.72~1.00` heading inertia scale은 더 낮추지 않는다. 현재 불만은 관성이 부족해서가 아니라 direct grip 힘이 관성을 이기지 못해서 생긴다.
- drift entry 조건, slip angle, drift kick은 이 단계에서 변경하지 않는다. 먼저 drift 전 `0.1~0.3초` 동안 path가 안쪽으로 명확히 반응하는지를 확인한다.

완료 gate:

- 130~140km/h, curve `0.30~0.45`, full steer 첫 0.2초에서 합산 횡속도의 바깥쪽 크기가 현재보다 최소 40% 줄어든다.
- 같은 입력을 유지했을 때 drift entry 시점과 drift lateral authority는 GDS-2 기준에서 과도하게 앞당겨지거나 증가하지 않는다.
- `steer=0`의 heading inertia/offset은 정확히 유지한다.

자동 검증 결과:

| 검사 | 결과 |
| --- | --- |
| 130km/h 직선, 0.18초 full steer offset | `2.6337 → 3.7150u` |
| 같은 조건 steering velocity | `9.2667 → 19.8572u/s` |
| `qa:grip-turn-in` | `3/3 PASS` |
| `qa:heading-debt` | `5/5 PASS` |
| `qa:corner-exit-recovery` | `6/6 PASS` |
| 130km/h grip line quality | `0.648 → 0.720` |
| grip 최대 offset | `77.014 → 114.812u` — road limit 안 |
| production build | PASS |

`qa:corner-handling` 전체 실패는 이전부터 존재한 high-speed neutral 거리 비율 gate 하나(`1.229 < 1.5`)다. GDS-2A는 `steer=0` scenario의 offset과 inertia를 바꾸지 않았고, 나머지 7개 check는 통과했다. 다음 browser replay에서는 130~140km/h의 curve `0.30~0.45` turn-in에서 합산 횡속도와 drift entry 시점을 GDS-2 로그와 직접 비교한다.

### GDS-3 — Drift 경계 재검증

상태: **대기**

- grip direct response가 drift 진입 직전에 이중 가속으로 읽히지 않는지 확인한다.
- brake/lift entry, counter steer, exit heading cap과 rail impulse를 실주행 telemetry로 비교한다.
- drift의 lateral authority나 slip angle은 GDS-2까지 변경하지 않는다.

## 검증 순서

1. `npm run qa:grip-turn-in --workspace @games/apex-seoul`
2. `npm run qa:heading-debt --workspace @games/apex-seoul`
3. `npm run qa:corner-handling --workspace @games/apex-seoul`
4. `npm run qa:corner-exit-recovery --workspace @games/apex-seoul`

GDS-1은 자동 계약만 통과했다고 완료되지 않는다. 이후 browser telemetry에서 같은 속도·곡률의 turn-in/release/counter-steer를 확인하고 GDS-2 진입 여부를 결정한다.

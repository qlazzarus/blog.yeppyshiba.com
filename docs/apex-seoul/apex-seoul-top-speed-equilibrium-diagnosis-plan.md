# Apex Seoul 최고속 평형·Visual Rail Boundary 진단 및 개선 계획

갱신일: 2026-07-22

상태: **TSE-1~TSE-6 완료 / Visual Rail RAIL-1~RAIL-2 완료 / SH-7 자동 승인 READY**

## 문서 목적

SH-7 통합 주행에서 드러난 두 blocking issue를 같은 근거 위에서 추적한다.

1. Raven Coupe가 직선 full throttle에서 표시 최고속 `225km/h`가 아니라 약 `141km/h`에 머무는 이유
2. 차량이 물리 도로 폭의 약 `12~14%`만 사용했는데도 visual rail collision이 발생하는 이유

두 문제를 동시에 tuning하지 않는다. 최고속 평형을 먼저 해결하고 직선 가속 회귀를 고정한 뒤 visual rail boundary를 별도 작업으로 진행한다. 이 순서는 레일 충돌과 shoulder scrub이 최고속 직선 측정에 섞이지 않게 하고, 반대로 파워트레인 변경이 코너 충돌 분석을 흔들지 않게 한다.

관련 기준 문서:

- [Raven Coupe(FT86 참조) 파워밴드·구동계 계획](./apex-seoul-raven-ft86-powerband-plan.md)
- [225km/h 속도감·핸들링 후속 계획](./apex-seoul-speed-sense-handling-revision-plan.md)
- [다음 구현 우선순위](./apex-seoul-next-priority-plan.md)

## 진단 요약

| 항목 | 관측 결과 | 판정 |
| --- | --- | --- |
| 최고속 | 59.4초 full throttle에서 `140.7km/h`, 4단 `6,176rpm` | 225km/h는 현재 표시/clamp envelope일 뿐 실제 평형점이 아님 |
| 4→5 변속 | 프로필 speed boundary는 `135km/h`, 실제 7,400rpm은 약 `175.3km/h` | 추상 speed envelope와 물리 RPM 조건 불일치 |
| 6단 225km/h | 구동력 약 `18.3`, 저항 약 `83.3` | 변속만 고쳐도 225km/h 유지 불가 |
| Grip 우측 rail | 물리 한계 약 `1086`, 실제 적용 한계 약 `130.8` | 물리 도로 폭의 약 12%에서 충돌 |
| Drift 좌측 rail | 물리 한계 약 `961`, 실제 적용 한계 약 `133.1` | 물리 도로 폭의 약 14%에서 충돌 |

결론은 서로 다르다.

- 최고속은 **변속 도달성과 고속 구동력/저항 평형이 함께 어긋난 파워트레인 모델 문제**다.
- visual rail은 **화면 합성 좌표와 물리 lateral 좌표를 한 계산에 섞은 collision boundary 문제**다.

## 1. 최고속 평형 상세 진단

### 측정 조건과 결과

SH-7 straight run은 중앙 고정, 조향 없음, 코너 감속 없음, guardrail impact 없음 상태에서 full throttle을 유지했다.

| 항목 | 최종 관측값 |
| --- | ---: |
| elapsed | `59.439s` |
| physics speed | `475.085 unit/s` |
| 표시 속도 | `140.7km/h` |
| gear / rpm | `4단 / 6,176rpm` |
| torque scale | `0.9664` |
| engine torque scale | `1.1252` |
| slope acceleration | `+3.988` |
| corner loss | `0` |
| guardrail impact | `0` |

근거: [SH-7 straight JSONL](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/straight/apex-seoul-drive-2026-07-22T02-16-36-870Z_sh7-straight-accel.jsonl)

현재 가속식에 마지막 sample을 대입하면 다음과 같다.

```text
engine force       +37.8
slope acceleration  +4.0
rolling resistance -14.0
aero drag           -27.1
--------------------------------
net acceleration     +0.7 unit/s²
```

60초 시점에 이미 순가속이 거의 0이다. 같은 식을 충분히 오래 적분하면 현재 약한 내리막에서는 약 `140.9km/h`, slope가 정확히 0인 평지에서는 약 `126.7km/h`에 수렴한다. 따라서 캡처 시간이 짧아서 생긴 문제가 아니다.

### 원인 A — 물리 RPM과 speed envelope가 서로 다른 변속점을 만든다

Raven은 실제 FT86 기어비, final drive, 타이어 둘레로 RPM을 계산한다. 하지만 upshift는 다음 두 조건을 동시에 요구한다.

```text
speedRatio > gear.speedRatioMax - margin
physical gear RPM >= shiftUpRpm
```

4단의 선언된 `speedRatioMax = 0.600`은 표시 속도 약 `135km/h`다. 반면 실제 `1.213 × 4.1 × 1.964m` 계산에서 4단 7,400rpm은 약 `175.3km/h`다. 4단 평형점이 그보다 낮으므로 5단 조건에 도달하지 못한다.

기어별 7,400rpm 속도는 다음과 같다.

| 기어 | 7,400rpm 속도 | 225km/h 대비 ratio |
| ---: | ---: | ---: |
| 1 | `58.7km/h` | `0.261` |
| 2 | `97.2km/h` | `0.432` |
| 3 | `138.0km/h` | `0.613` |
| 4 | `175.3km/h` | `0.779` |
| 5 | `212.7km/h` | `0.945` |
| 6 | `277.3km/h` | `1.232` |

물리 프로필에서 `speedRatioMin/Max`를 변속 판정에 계속 사용하는 것은 실제 기어비 기반 RPM과 중복되며, downshift까지 서로 다른 경계를 가질 수 있다.

### 원인 B — 최고단 구동력이 저항과 평형을 이루지 못한다

현재 구동력은 다음 요소를 모두 곱한다.

```text
engineAcceleration
× accelerationScale
× gear ratio relative force
× drivetrain efficiency/calibration
× torque response
× (1 - speedRatio × 0.45)
```

반면 aero drag는 raw world speed의 제곱으로 증가한다.

```text
aeroDrag = physicsSpeed² × 0.00012
```

6단 225km/h를 강제로 대입하면 다음과 같다.

| 항목 | 값 |
| --- | ---: |
| 6단 RPM, throttle lift 포함 | 약 `6,244rpm` |
| engine force | 약 `+18.3` |
| rolling resistance | `-14.0` |
| aero drag | `-69.3` |
| 평형에 추가로 필요한 downhill acceleration | 약 `+65.0` |

즉, 4→5 변속 고착을 제거해도 평지 225km/h는 유지되지 않는다. 최고속을 hard clamp로 밀어 넣거나 `engineAcceleration`을 전 구간에서 크게 키우면 이미 승인된 0-100 `8.117초`가 무너진다.

### 진단 판정

현재의 `225km/h envelope` 검증은 환산식과 clamp 상한만 확인했다. 실제 최고속 승인은 다음을 확인해야 한다.

```text
도달 가능성  : 낮은 기어에서 최고단까지 실제로 변속 가능한가
힘의 평형    : 평지에서 drive force와 rolling+aero resistance가 목표 속도에서 만나는가
수렴 안정성  : clamp에 기대지 않고 목표 범위 안에서 가속도가 0으로 수렴하는가
저속 회귀    : 같은 변경 뒤 0-60 / 0-100 / 변속 RPM이 유지되는가
경사 관계    : uphill < level < downhill 순서가 유지되는가
```

## 2. Visual Rail Collision Boundary 상세 진단

### Runtime 증거

| run | side | lateral offset | 물리 rail limit | visual rail | inset | 실제 적용 limit | physical 대비 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| SH-7 grip | right | `130.218` | 약 `1086.1` | `178.813` | `48` | `130.813` | `12.0%` |
| SH-7 drift | left | `-132.239` | 약 `961.0` | `189.110` | `56` | `133.110` | `13.9%` |

근거:

- [SH-7 grip JSONL](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/grip/apex-seoul-drive-2026-07-22T02-23-30-865Z_sh7-grip-corners.jsonl)
- [SH-7 drift JSONL](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/drift/apex-seoul-drive-2026-07-22T02-24-08-688Z_sh7-drift-mixed.jsonl)

### 원인

visual limit은 화면에서 측정한 road width와 차량 `displaySize`를 contact point의 `anchor.scale`로 나눠 물리 lateral 값처럼 사용한다. 그러나 세 값은 같은 공간의 물리 치수가 아니다.

1. `roadWidthAtVehicleY`는 고정에 가까운 합성 화면 Y에서 측정한다.
2. `anchor.scale`은 별도 `playerRoadContactDistance`의 ground point에서 얻는다.
3. 차량 `displaySize`는 물리 차폭이 아니라 화면에서 도로 대비 약 `54%`를 목표로 하는 프레젠테이션 크기다.
4. 이 결과에 물리 단위 `contactClearance = 130`을 더하고, 충돌 단계에서 좌우 `48/56` inset을 다시 뺀다.
5. 마지막으로 `min(physical, visual)`을 선택하므로 잘못 작아진 visual 값이 항상 실제 물리 경계를 덮어쓴다.

Grip 충돌 sample에서는 화면 도로 폭 `534px`, 차량 표시 크기 `338px`, anchor scale `2.007`이다. 차량이 화면 도로 폭의 `63.3%`를 차지하는 프레젠테이션 상태를 실제 차체 폭처럼 환산하면서 visual paved half-width가 `48.8`로 축소됐다.

### 영향

- 정상 grip 주행도 실제 도로 중심에서 가까운 위치에 충돌한다.
- shoulder/contact speed scrub이 코너 속도 손실에 섞인다.
- drift lateral velocity와 counter/recovery가 충돌 bounce로 덮인다.
- SH-7의 drift counter/exit 미관측을 순수 drift tuning 문제로 판정할 수 없다.

이 문제는 최고속 평형을 고친 뒤 `RAIL-*` 별도 단계로 진행한다. 최고속 작업에서는 straight center run의 `guardrailImpactCount = 0`을 통제 조건으로 유지한다.

## 최고속 평형 우선 실행 계획

### TSE-1 — 힘의 평형 자동 측정기 고정

상태: **완료 (2026-07-22)**

상수를 바꾸기 전에 현재 controller 식을 그대로 호출하는 deterministic straight equilibrium audit를 만든다.

측정 조건:

```text
slope : uphill / level 0 / SH-7 mild downhill
input : full throttle, steer 0, brake 0
time  : terminal 판정까지 또는 최대 시간
```

매 sample에 다음을 분리해 남긴다.

- physics unit/s와 표시 km/h
- gear, base RPM, throttle lift 적용 RPM, torque scale
- engine force, rolling resistance, aero drag, slope acceleration
- net acceleration과 최근 5초 speed delta
- gear별 upshift RPM 속도와 실제 shift 시점
- hard clamp 접촉 여부

완료 조건:

- 현재 level 평형 약 `126.7km/h`, SH-7 slope 평형 약 `140.9km/h`, 4단 고착을 재현한다.
- 힘 항목의 합과 실제 frame speed delta 오차가 허용 범위 안이다.
- 결과를 JSON과 사람이 읽는 Markdown 표로 함께 남긴다.

#### 구현 결과

- production `PlayerVehicleState`에 frame에서 실제 사용한 종방향 힘 sample을 기록한다. 엔진/경사/구름저항/aero/corner loss/net acceleration을 관측만 하며 가속식과 상수는 변경하지 않았다.
- `qa:top-speed-equilibrium`은 production baseline config와 실제 `updatePlayerVehicle()`을 60Hz로 호출한다.
- uphill `-10`, level `0`, SH-7 mild downhill `+3.987697` 세 조건을 최대 600초 적분한다.
- 최근 5초 속도 변화 `≤0.01km/h`와 순가속 절댓값 `≤0.01 unit/s²`를 동시에 만족할 때 terminal로 판정한다.
- 실제 frame speed delta와 기록된 force sum의 최대 오차는 `0`이었다.

| scenario | terminal | gear / RPM | drive | rolling | aero | slope | net acceleration |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| uphill `-10` | `128.399km/h` | `3단 / 7,124rpm` | `46.576` | `-14` | `-22.572` | `-10` | `+0.0041` |
| level `0` | `126.759km/h` | `4단 / 5,590rpm` | `35.993` | `-14` | `-21.999` | `0` | `-0.0056` |
| SH-7 `+3.988` | `140.835km/h` | `4단 / 6,184rpm` | `37.173` | `-14` | `-27.156` | `+3.988` | `+0.0052` |

SH-7 runtime `140.7km/h`와 deterministic terminal `140.835km/h`가 일치해 기존 진단을 자동 재현했다. level은 목표보다 `98.241km/h` 낮으며 세 조건 모두 hard clamp와 corner loss를 사용하지 않았다.

추가로 **uphill이 level보다 약 1.64km/h 빠른 비단조 관계**를 발견했다. uphill은 3단에서 평형을 이루지만 level은 3단 7,400rpm을 넘어 4단으로 변속한 뒤 더 약한 구동력 때문에 `126.8km/h`까지 다시 감속한다. 현재 downshift speed envelope는 이를 즉시 3단으로 되돌리지 않는다. 따라서 TSE-2는 단순 4→5 고착뿐 아니라 변속 후 평형과 downshift hysteresis까지 같은 물리 기준으로 다뤄야 한다.

자동 생성물:

- [TSE-1 JSON baseline](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse1-baseline.json)
- [TSE-1 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse1-baseline.md)

### TSE-2 — 물리 프로필의 변속 기준 단일화

상태: **완료 (2026-07-22)**

`drivetrainModel = physical`인 Raven은 실제 gear ratio/final drive/tire RPM을 upshift의 단일 기계 기준으로 사용한다.

- physical profile에서 `speedRatioMin/Max`를 powered upshift의 추가 gate로 사용하지 않는다.
- downshift도 물리 RPM 또는 물리 기어 경계에서 파생해 upshift와 같은 모델을 사용한다.
- `speedRatioMin/Max`는 non-physical 프로필 fallback 또는 표시/문서용으로만 남길지 명시한다.
- 1→2, 2→3, 3→4의 현재 실제 변속 속도와 shift drop RPM은 먼저 보존한다.

완료 조건:

- 물리 기어 경계와 선언된 speed envelope가 서로 다른 변속을 지시하지 않는다.
- 4단이 힘 부족이 아닌 중복 gate 때문에 고착되는 경로가 사라진다.
- `60km/h 2단`, `100km/h 3단`, 0-100 `7.8~8.3초`가 유지된다.

#### 구현 결과

- `drivetrainModel = physical`은 초기 기어와 powered upshift를 실제 gear ratio/final drive/tire RPM만으로 선택한다.
- physical powered upshift에서 `speedRatioMax` 추가 gate를 제거했다. arcade profile은 기존 authored speed envelope와 RPM 조건을 그대로 유지한다.
- physical downshift는 현재 단의 `speedRatioMin` 대신, 한 단 내린 뒤 프로필의 `shiftDropRpm = 5,400rpm`에 도달하도록 인접 실제 기어비에서 역산한다.
- 80/120/150/180km/h의 초기 기어가 기존 잘못된 `3/4/5/6단`에서 실제 가속 주행과 같은 `2/3/4/5단`으로 정렬됐다. 60/100/225km/h는 `2/3/6단`을 유지한다.
- full-throttle 1→2, 2→3, 3→4는 모두 기계 RPM `7,400 ± 50rpm`에서 일어났다.

물리 downshift 경계:

| shift | 현재 단 RPM | 속도 | downshift 후 RPM |
| --- | ---: | ---: | ---: |
| 2→1 | `3,258rpm` | `42.8km/h` | `5,400rpm` |
| 3→2 | `3,803rpm` | `70.9km/h` | `5,400rpm` |
| 4→3 | `4,251rpm` | `100.7km/h` | `5,400rpm` |
| 5→4 | `4,452rpm` | `128.0km/h` | `5,400rpm` |
| 6→5 | `4,142rpm` | `155.2km/h` | `5,400rpm` |

각 경계의 `-50rpm`에서는 정확히 한 단 downshift하고 `+50rpm`에서는 현재 단을 유지하는 runtime probe가 통과했다. 첫 후보였던 “upshift RPM의 80%” 기준은 6→5를 기존보다 너무 일찍 발생시켜 easy brake-prepared corner 관계를 뒤집었으므로 폐기했다. 새 임의 상수를 추가하지 않고 기존 `shiftDropRpm`의 의미를 물리 기어비에 연결한 이유다.

TSE-1 대비 terminal speed 최대 차이는 `0km/h`다. 이는 중복 변속 기준 제거가 현재 최고속 부족을 가리지 않았다는 뜻이다. level `126.759km/h`, SH-7 slope `140.835km/h`, uphill 3단/level 4단의 비단조 관계는 그대로 남아 TSE-3 force budget의 순수 입력이 됐다.

HND 회귀에서는 과거 synthetic straight control이 잘못된 초기 기어를 전제로 해 최대 `8.817km/h` 차이를 보였다. HND-3 자료는 시행착오 비교용으로 보존하고, TSE-2 물리 기어 기준선을 새 control snapshot으로 고정했다. 새 기준 대비 오차 `0km/h`, 준비 조작/line/grade 관계, accidental drift, 0-100 gate가 모두 통과했다.

자동 생성물:

- [TSE-2 변속·평형 JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse2-baseline.json)
- [TSE-2 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse2-baseline.md)
- [TSE-2 corner control JSON](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-tse2-baseline.json)
- [TSE-2 corner control 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-tse2-baseline.md)

### TSE-3 — 225km/h level force budget 설계

상태: **완료 (2026-07-22) / 선택값 production 미적용**

목표를 `225 clamp에 닿음`이 아니라 다음 평형으로 정의한다.

```text
level straight, full throttle, 6th
223~225km/h에서 net acceleration → 0
225km/h 위로 외삽하면 net acceleration < 0
hard clamp는 안전 상한일 뿐 평형 생성 수단이 아님
```

후보는 한 번에 하나씩 비교한다.

1. raw world unit에 맞지 않게 큰 `aeroDrag` 재보정
2. rolling/aero resistance의 단위 환산 명시
3. 필요할 때만 최고단 force calibration 검토

우선순위는 **aero/단위 모델 → 최고단 보정 → 전역 엔진 출력** 순서다. 현재 수치를 단순 역산하면 225km/h의 허용 aero force는 약 `4.3`인데 실제 값은 `69.3`이다. 따라서 전역 `engineAcceleration`을 약 네 배 키우는 방식보다 raw unit 제곱에 곱해지는 drag scale을 먼저 검증한다.

금지:

- 표시 속도만 225로 보정
- 최고속 근처에서 speed를 직접 760으로 clamp/pull
- 0-100을 깨뜨리는 전역 engine force 증폭
- downhill acceleration에 의존한 최고속 승인

#### 구현 결과

`qa:top-speed-force-budget`을 추가해 production force, 223/224/225km/h에서 역산한 aero coefficient, 전역 engine force 대안을 같은 controller로 비교했다. 이 단계에서는 production 상수를 변경하지 않았다.

현재 production steady force:

| 속도 | gear / RPM | drive | rolling | aero | net acceleration |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100km/h | `3단 / 5,604rpm` | `43.804` | `-14` | `-13.691` | `+16.113` |
| 150km/h | `4단 / 6,570rpm` | `37.143` | `-14` | `-30.805` | `-7.662` |
| 175.34km/h | `5단 / 6,338rpm` | `28.396` | `-14` | `-42.093` | `-27.697` |
| 225km/h | `6단 / 6,240rpm` | `18.343` | `-14` | `-69.312` | `-64.969` |

223/224/225km/h에서 `drive - rolling = aero`가 되도록 역산한 계수:

| 목표 평형 | aeroDrag | production 대비 |
| ---: | ---: | ---: |
| 223km/h | `0.000007796780` | `6.50%` |
| 224km/h | `0.000007661283` | `6.38%` |
| 225km/h | `0.000007527021` | `6.27%` |

TSE-4 입력으로 **224km/h 평형 후보 `aeroDrag = 0.000007661283`**을 선택했다.

- 223km/h 순가속: `+0.0766`
- 224km/h 순가속: 약 `0`
- 225km/h 순가속: `-0.0776`
- deterministic terminal: `223.913km/h`, 6단
- hard clamp: 사용하지 않음
- 1→6단 전체 도달: 확인

224km/h를 선택한 이유는 223km/h에서는 계속 가속하고 225km/h에서는 자연 감속하므로, `accelSpeed = 760` hard clamp가 평형을 만들지 않기 때문이다.

비교 중 두 대안을 폐기했다.

1. production aero를 유지한 전역 engine 증폭은 약 `4.542배`, `engineAcceleration ≈ 372.43`이 필요하다. 0-100이 `1.317초`가 되고 clamp에 닿아 승인할 수 없다.
2. 6단 전용 boost는 production 차량이 4단 `126.8km/h`에서 멈춰 5/6단에 도달하지 못하므로 자기 활성 조건까지 갈 수 없다.

선택한 drag-only 후보도 0-100이 `8.1초 → 7.083초`로 빨라진다. 이는 실패가 아니라 TSE-4가 분리해서 해결할 calibration 항목이다. TSE-4에서는 선택 aero를 production에 적용한 뒤 launch/저중속 force 또는 저속 resistance를 최소 범위로 보정하되, 최고속 force bracket을 다시 흔들지 않는다.

자동 생성물:

- [TSE-3 force budget JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-force-budget-tse3.json)
- [TSE-3 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-force-budget-tse3.md)

### TSE-4 — 가속 곡선과 경사 관계 calibration

상태: **완료 (2026-07-22)**

TSE-3 후보 중 다음 관계를 동시에 만족하는 최소 변경을 선택한다.

| 구간 | gate |
| --- | --- |
| 0-60 | 기존 `3.5~5.0초` 유지 |
| 0-100 | `7.8~8.3초` 유지 |
| 60km/h | 2단 유지 |
| 100km/h | 3단 유지 |
| 4→5 / 5→6 | 물리 RPM에 도달해 자연 변속 |
| level terminal | `223~225km/h`, 최근 5초 변화량과 순가속이 평형 허용치 안 |
| uphill/downhill | `uphill < level < downhill`; level은 clamp 금지, 양의 경사인 SH-7 downhill은 safety cap 상태를 평형과 구분 |
| 6단 RPM | max RPM/fuel cut에 붙지 않음 |

0-100 통과만으로 승인하지 않고 `100→175`, `175→213`, `213→223km/h` 구간 시간을 별도로 기록한다. 최고속 평형을 맞췄지만 중고속 가속이 지나치게 길거나 짧은 후보를 걸러낸다.

Production에는 TSE-3에서 선택한 `aeroDrag = 0.000007661283025835461`을 적용했다. drag 감소로 0-100이 7.083초까지 짧아진 영향은 새로운 힘 항을 추가하지 않고 `launchThrottleFullSpeedRatio = 0.7 → 1.0` 한 항목으로 보정했다. `launchThrottleMinRatio = 0.5`, engine force, rolling resistance와 실제 기어비는 유지했다.

자동 측정 결과:

| 항목 | 결과 | 판정 |
| --- | ---: | --- |
| 0-60 / 0-100 | `4.05s / 8.10s` | 기존 gate 유지 |
| 60 / 100km/h 기어 | `2단 / 3단` | 유지 |
| 4→5 / 5→6 | 약 `7,400rpm` | 실제 RPM으로 자연 변속 |
| level 300s | `223.953km/h`, 6단 | clamp 없는 force equilibrium |
| level 최근 5초 변화 | `0.00424km/h` | 평형 허용치 통과 |
| level 순가속 | `+0.00271 unit/s²` | 평형 허용치 통과 |
| uphill 300s | `168.711km/h`, 5단 | level보다 낮음 |
| SH-7 mild downhill | `225km/h`, 6단 | safety cap; 평형으로 표기하지 않음 |

`223 / 224 / 225km/h`의 순가속은 각각 양수 / 거의 0 / 음수라 평지 평형이 hard clamp로 만들어지지 않는다. 반면 SH-7의 `+3.987697` 경사 가속은 225km/h에서도 남으므로 내리막이 safety cap에 닿는 것은 물리적으로 예상되는 결과다. 이 둘을 같은 “최고속 평형”으로 부르지 않는다.

중고속 split은 자동 산출물에 별도로 저장했다. 현재 값은 `100→175.34 = 13.750s`, `175.34→212.687 = 16.467s`, `212.687→223 = 113.533s`이며 TSE-5 실제 runtime과 비교할 기준선으로 사용한다.

자동 생성물:

- [TSE-4 calibration JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-calibration-tse4.json)
- [TSE-4 사람이 읽는 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-calibration-tse4.md)

검증 중 기존 HND-3의 225km/h 절대 corner-loss percentage gate는 실패했다. 이전 baseline은 225km/h에서 직선 차량 자체가 강하게 감속하던 force budget을 분모로 사용했지만, TSE-4 이후 직선 225km/h가 평형점이 되면서 같은 코너 힘도 `easy / medium / sharp = 6.557% / 28.414% / 48.133%`로 계산된다. 이는 handling 상수를 TSE-4에서 다시 조정할 근거가 아니라 비교 기준의 의미가 바뀐 결과다. TSE-4에서는 gate를 임의 완화하지 않고, TSE-6에서 새 직선 평형을 기준으로 corner-only metric과 관계형 gate를 다시 정의한다. Speed presentation 동일 입력 sweep과 production build는 그대로 통과했다.

### TSE-5 — Runtime SH-7 직선 재측정

상태: **완료 (2026-07-22)**

deterministic audit 통과 뒤 실제 WebGL runtime의 동일 SH-7 straight scenario를 다시 캡처한다.

- 1x run을 최종 근거로 사용한다.
- 4x는 시간 단축용 보조 비교로만 남긴다.
- 실제 track slope, gear/RPM, FOV, shader, cadence를 함께 기록한다.
- steer/corner/rail impact가 0인지 확인한다.
- deterministic level 결과와 runtime mild-downhill 결과를 섞어 같은 최고속으로 주장하지 않는다.

완료 조건:

- `straightReaches225Kmh` gate를 평형 정의에 맞게 통과한다.
- presentation SH-1~SH-4 값은 변경 없이 같은 속도 입력에서 기존 결과를 유지한다.

기존 14초 시나리오에 `--duration-sec 70`만 덧붙이면 throttle release 이벤트는 여전히 14초에 발생한다. 첫 캡처가 201.5km/h에서 끝난 이유는 파워트레인 회귀가 아니라 이후 56초가 coast였기 때문이다. 이를 막기 위해 70초 전체에서 throttle을 유지하는 전용 `sh7-straight-tse5-1x` 시나리오를 추가했다.

최종 근거는 `qaTimeScale=1`, SH-7 직선 probe `z=0`, 10Hz, 700 sample 캡처다. headless browser의 wall clock과 Phaser runtime 경과가 일치하지 않으므로 구간 시간은 샘플러 wall clock이 아니라 telemetry의 `elapsedSec`를 사용했다.

| runtime 항목 | 결과 |
| --- | ---: |
| 0→60 | `3.886s`, 2단 |
| 0→100 | `7.561s`, 3단 |
| 0→175.34 | `18.774s`, 5단 |
| 0→212.687 | `29.554s`, 6단 |
| 0→223 | `37.520s`, 6단 |
| 0→225 | `39.383s`, 6단 |
| SH-7 slope acceleration | `3.9359~4.0189` |
| FOV | `69~74.2157°` |
| shader intensity max | `0.1056` |
| theoretical cadence max | `3.1667 segment/s` |
| steer / corner loss / guardrail impact | `0 / 0 / 0` |
| fuel cut samples | `0` |

TSE-4 level은 `223.953km/h`의 clamp 없는 힘 평형이고, TSE-5 SH-7 mild downhill은 양의 경사 가속으로 `225km/h` safety cap에 도달한다. Runtime에서도 이 구분이 유지됐다. `straightReaches225Kmh`와 TSE-5 전용 gate는 모두 통과했다.

카메라 `z`를 같은 직선 probe에 고정했으므로 실제 motion-anchor pass count는 의도적으로 0이다. cadence는 raw speed에서 계산한 theoretical segment pass rate로 기록했으며, 움직이는 트랙 전체의 실감 평가는 별도 실주행 승인 범위다.

산출물:

- [TSE-5 1× telemetry](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/straight/apex-seoul-drive-2026-07-22T04-07-58-110Z_sh7-straight-tse5-1x.jsonl)
- [TSE-5 1× summary](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/straight/apex-seoul-drive-2026-07-22T04-07-58-110Z_sh7-straight-tse5-1x.summary.json)
- [TSE-5 225km/h 화면](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/straight/sh7-straight-tse5-1x.png)
- [SH-7 통합 runtime 보고서](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/sh7-integrated-telemetry.md)

RAIL-1 재측정에서 grip/drift rail impact는 모두 `0회`가 되어 visual rail impact blocker는 해소됐다. 이후 SH-7 입력 시나리오와 drift-exit 재가속 허용 창을 교정해 counter/exit 관측도 완료했다.

### TSE-6 — 회귀 고정과 블로그 자료 정리

상태: **완료 (2026-07-22)**

다음 전후 자료를 한 묶음으로 보관한다.

- 4단 `140.7km/h` 고착 telemetry
- speed envelope `135km/h`와 physical 4단 7,400rpm `175.3km/h` 비교표
- 225km/h에서 drive `18.3` 대 resistance `83.3` force budget
- 변경 전후 gear/RPM/speed/time 그래프 또는 표
- 0-100 보존 결과
- level/uphill/downhill terminal speed 표
- clamp 도달과 실제 힘의 평형이 다른 이유

`qa:top-speed-regression`은 TSE-1~TSE-5 산출물을 읽는 데 그치지 않고 production standing start, TSE-4 calibration, TSE-5 runtime audit, corner demand, handling relations, speed presentation을 먼저 다시 실행한다. 이후 변경 전후를 하나의 JSON/Markdown으로 묶어 다음 관계를 고정한다.

| 비교 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| level | `126.759km/h`, 4단 평형 | `223.953km/h`, 6단 자연 평형 |
| SH-7 runtime | `140.7km/h`, 4단 고착 | `225km/h`, 6단 safety cap |
| 225km/h net acceleration | `-64.969` | `-0.0776` |
| drag-only 0-100 | `7.083s` | launch 보정 후 `8.083s` |

225km/h corner-loss 기준도 새 직선 평형에 맞춰 갱신했다. 같은 speed/slope/pedal의 straight control과 corner exit를 비교하며, level의 easy/medium/sharp corner-only loss는 `6.557% / 28.414% / 48.133%`다. 극단 downhill은 양의 경사 힘과 225km/h safety cap 때문에 `0% / 21.450% / 42.717%`로 더 작다. 모든 경사에서 brake-prepared 관계는 양의 개선을 유지하고, level에서는 understeer relief와 line retention gain이 각각 최소 `0.08` 이상이어야 한다.

자동 생성물:

- [TSE-6 통합 회귀 JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-regression-tse6.json)
- [TSE-6 통합 회귀 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-regression-tse6.md)
- [TSE-6 corner baseline JSON](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-tse6-baseline.json)
- [TSE-6 corner baseline 표](../../games/apex-seoul/assets/telemetry/generated/corner-demand/corner-demand-tse6-baseline.md)

내부 블로그 글 [가드레일, 저속 조향, 0-100km/h를 다시 잡기](../../contents/phaser4-apex-seoul-roadside-collision-powerband.md)에는 초기 13초 목표를 당시 시행착오로 보존하고, 실제 FT86 기준 `7.8~8.3초` 재설정부터 최고속 평형 복구까지 후속 교정 섹션을 추가했다.

TSE-1~TSE-6 최고속 체인과 visual rail `RAIL-1~RAIL-2`를 완료했다. 충돌 없는 grip/drift cycle과 counter/recovery/exit도 재측정했으며 SH-7 자동 gate는 모두 통과했다. 사용자 실주행 승인은 자동 승인과 별도로 남긴다.

## Visual Rail 실행 계획과 결과

### RAIL-1 — 물리 경계 단일화

상태: **완료 (2026-07-22)**

물리 충돌은 아래 한 식만 사용한다.

```text
rail line          = paved half-width + shoulder clearance
vehicle center max = rail line - physical vehicle half-width
```

RAIL-1 기준값은 shoulder clearance `220u`, FT86 gameplay physical half-width `240u`다. 따라서 기본 폭 `960u` 구간은 rail line `1180u`, 차량 중심 충돌 한계 `940u`가 되고, 좁은 폭 `820u` 구간은 각각 `1040u / 800u`가 된다. 화면 road width, `displaySize`, anchor scale을 물리 lateral 좌표로 역산하던 경로와 좌우별 `48/56u` 보정은 제거했다.

가드레일 span/post도 고정 `1180u` 대신 각 segment의 `roadHalfWidth + 220u`에 놓는다. 플레이어 충돌 폭은 카메라 원점이 아니라 실제 player contact distance의 도로 폭에서 읽는다. 코너 스윕의 `maxRoadOffset` 역시 같은 차량 중심 한계를 사용한다.

자동 검증 결과:

| 항목 | 결과 |
| --- | ---: |
| 기본 폭 rail line / center limit | `1180u / 940u` |
| 좁은 폭 rail line / center limit | `1040u / 800u` |
| shoulder 중간 지점 ratio | `0.5` |
| 과거 false boundary `130u` impact | `0회` |
| SH-7 grip impact | `0회` |
| SH-7 drift impact | `0회` |
| corner demand 관계형 QA | `PASS` |
| production build | `PASS` |

RAIL-1 런타임에서 grip의 최대 물리 rail ratio는 `0.6263`, drift는 `0.3528`이었다. 기존처럼 도로 폭의 `12~14%`에서 충돌하지 않았고 둘 다 rail impact `0회`를 유지했다.

산출물:

- [SH-7 RAIL-1 통합 보고서](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/sh7-integrated-telemetry.md)
- [RAIL-1 grip 캡처](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/grip/sh7-grip-rail1.png)
- [RAIL-1 drift 캡처](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/drift/sh7-drift-rail1.png)

### RAIL-2 — 물리 contact point의 화면 투영 검증

상태: **완료 (2026-07-22)**

RAIL-1은 조기 물리 충돌을 제거했지만 차량 스프라이트 외곽과 화면 가드레일이 맞닿는 픽셀 위치까지 승인하지 않았다. RAIL-2에서는 아래 원칙으로 물리 contact point를 화면에 투영해 캡처와 수치가 같은 지점을 가리키도록 변경했다.

```text
physics collision : road half-width와 차량의 물리 half-width를 같은 lateral world 좌표로 계산
screen validation  : 계산된 physics contact point를 화면에 투영해 rail sprite와 시각적으로 대조
presentation size  : displaySize를 물리 차폭으로 직접 사용하지 않음
```

기존 차량 X는 `playerRoadContactDistance = 260u`의 원근 배율로 계산한 뒤 화면 가장자리에서 clamp했다. 반면 차량 스프라이트는 고정에 가까운 screen Y에 합성되어 그 Y의 도로 배율과 맞지 않았다. RAIL-2는 차량 Y에서 렌더러가 실제로 사용한 road span을 읽고 다음 순서로 투영한다.

```text
road screen scale = road span px / physical paved width
screen rail       = paved edge ± shoulder px
normalized offset = physical lateral offset / physical rail center limit
vehicle center    = road center → side contact center 보간
contact invariant = vehicle contact edge x == rail x at normalized ±1
```

차량의 화면 접촉 폭은 전체 sprite cell 폭이 아니라 FT86 atlas의 center shadow chassis 폭을 사용한다. 이는 투명 여백과 차체 상단 실루엣을 충돌 폭으로 오인하지 않도록 하기 위함이다. 물리 collision 값은 변경하지 않고 화면상 차량 중심 위치만 이 투영 결과를 사용한다.

자동 검증 결과:

| 항목 | 결과 |
| --- | ---: |
| 순수 함수 좌/우 contact gap | `0px / 0px` |
| contact width `100/120/150px` 불변식 | 모두 `PASS` |
| SH-7 grip projection sample | `90 / 90` |
| SH-7 drift projection sample | `80 / 80` |
| 물리 ratio ↔ 화면 normalized ratio 최대 오차 | `0` |
| 일반 grip active screen gap | `139.3255~384.1525px` |
| 일반 drift active screen gap | `187.4925~383.7954px` |
| 고정 left `-940u` rail/edge/gap | `211.3216 / 211.3216 / 0px` |
| 고정 right `+940u` rail/edge/gap | `1067.9557 / 1067.9557 / 0px` |

산출물:

- [RAIL-2 runtime audit](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/rail-projection/rail2-projection-runtime.md)
- [RAIL-2 left contact](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/rail-projection/rail2-left-contact.png)
- [RAIL-2 right contact](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/rail-projection/rail2-right-contact.png)
- [RAIL-2 grip 주행](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/grip/sh7-grip-rail2.png)
- [RAIL-2 drift 주행](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/drift/sh7-drift-rail2.png)

`qa:guardrail-projection`은 화면 폭과 접촉 폭 변화에 대한 수학적 불변식을 검사한다. `qa:guardrail-projection-runtime`은 실제 WebGL 고정 캡처에서 world limit, rail pixel, vehicle contact edge를 대조한다. SH-7 통합 audit에도 projection coverage, ratio identity, 음수 gap 방지 gate를 추가했다.

## SH-7 통합 자동 승인 완료

상태: **READY (2026-07-22) / 사용자 실주행 승인 별도**

기존 `sh7-drift-mixed`는 브레이크를 너무 오래 유지해 drift 진입 직후 약 `95km/h` 아래로 떨어졌고, 반대 조향 전에 recovery로 전환됐다. 진입 임계가 형성된 직후 브레이크를 해제하고 drift 안에서 counter를 유지한 뒤 neutral throttle로 recovery를 유도하도록 입력을 교정했다.

브라우저 캡처는 recovery가 짧아 가속 재입력이 다음 프레임에 반영될 수 있다. 따라서 speed cue는 `recovery → grip` 순간에만 가속을 요구하지 않고, grip 복귀 후 `0.28초` 안의 재가속도 동일한 drift-exit burst로 인정한다. 즉시 재가속 동작은 그대로 유지한다.

| SH-7 gate | 최종 결과 |
| --- | ---: |
| straight 0→225km/h | `225km/h`, 6단, READY |
| grip/drift rail impact | `0 / 0회` |
| drift state cycle | `setup / drift / recovery / grip` |
| counter-steer timer max | `0.749초` |
| counter trim max | `0.62` |
| drift-exit burst max | `0.0354` |
| shader max straight/grip/drift | `0.1056 / 0.1089 / 0.1339` |
| blocking gate | `none` |

- [SH-7 최종 통합 보고서](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/sh7-integrated-telemetry.md)
- [SH-7 drift exit 캡처](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/drift/sh7-drift-exit-approved.png)

## 블로그 글감

### 최고속 숫자가 있다고 최고속에 도달하는 것은 아니다

`760 unit = 225km/h` 환산과 HUD 상한은 맞았지만, 실제 drive force와 resistance는 약 141km/h에서 이미 균형을 이뤘다. 표시 속도 mapping, 기어 RPM, 종방향 힘의 평형을 별도 검증해야 했던 사례다.

### 실제 기어비를 넣은 뒤 생긴 두 기준의 충돌

기존 arcade `speedRatioMin/Max`를 남긴 채 물리 RPM을 추가하면서 변속 조건이 더 정확해진 것이 아니라 두 개가 됐다. 4단의 선언 경계는 135km/h였지만 실제 7,400rpm은 175km/h였고, 차량은 그 전에 힘을 잃었다.

### 0-100만 맞추면 고속 구간은 검증되지 않는다

0-100 `8.117초`, 60km/h 2단, 100km/h 3단은 모두 통과했지만 최고속 평형은 실패했다. standing-start QA와 terminal-speed QA가 서로 다른 질문임을 보여준다.

### 화면에 보이는 차폭은 물리 차폭이 아니다

차량을 보기 좋게 도로 화면 폭의 절반 이상으로 키운 값을 collision에 사용하면서, 차가 도로 중심에서 조금만 움직여도 rail impact가 발생했다. pseudo-3D에서 물리 좌표를 화면으로 투영하는 것과 화면 값을 물리로 역산하는 것이 왜 비대칭인지 설명할 수 있다.

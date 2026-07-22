# Apex Seoul Raven Coupe(FT86 참조) 파워밴드·구동계 개선 계획

갱신일: 2026-07-22

상태: DRV-1~DRV-6와 TSE-1~TSE-6 완료. FT86 기준 가속·평지 평형·SH-7 runtime 최고속 회귀를 고정했다.

## 문서 목적

`Raven Coupe`는 게임 안에서 사용하는 차량명이다. 실제 주행 모델은 Toyota GT86/FT86을 참고하므로, 별도의 `FT86_ENGINE_PROFILE`을 만들지 않는다.

앞으로도 차량 연결은 다음 구조를 유지한다.

```text
ft86-retro asset
  → RAVEN_COUPE_ENGINE_PROFILE
      → FT86 기반 파워밴드
      → FT86 기반 기어비·final drive
      → FT86 기반 타이어 회전 계산
```

Genesis G70과 Apex S 프로필은 이번 작업의 범위가 아니다.

## 실제 참조 기준

Toyota GT86 6단 수동 사양을 기준으로 한다.

| 항목 | 기준값 |
| --- | ---: |
| 엔진 | FA20 2.0L 자연흡기 |
| 최고 출력 | 200hp @ 7,000rpm |
| 최대 토크 | 205Nm @ 6,400~6,600rpm |
| 1단 | 3.626 |
| 2단 | 2.188 |
| 3단 | 1.541 |
| 4단 | 1.213 |
| 5단 | 1.000 |
| 6단 | 0.767 |
| final drive | 4.100 |
| 타이어 | 215/45R17 |
| 공식 0-62mph | 7.6초(수동) |

출처: [Toyota GT86 Technical Specifications](https://media.toyota.co.uk/wp-content/uploads/sites/5/2021/03/1599217620200312MGT86techspecWLTP.pdf)

## 현재 문제

현재 `RAVEN_COUPE_ENGINE_PROFILE`은 FT86의 인상을 가진 아케이드 프로필이다.

- `speedRatio` 구간을 RPM으로 보간한다.
- 실제 gear ratio와 final drive가 없다.
- 타이어 둘레가 속도 계산에 참여하지 않는다.
- 토크 최고점이 7,000rpm으로 실제보다 늦다.
- 현재 QA 기준 0-100km/h가 약 13.1초다.
- 표시 속도 `smoothstep`과 물리 속도가 결합되어 속도 상승 기울기가 실제 구동계와 다르다.

목표는 `engineAcceleration`만 키우는 것이 아니라, Raven 프로필 내부의 속도·RPM·토크 관계를 FT86 기준으로 바꾸는 것이다.

## 목표값

게임 감각과 실차 수치 사이의 여유를 두고 다음을 1차 목표로 삼는다.

| 측정 | 목표 |
| --- | ---: |
| 0-60km/h | 3.5~5.0초 |
| 0-100km/h | 7.8~8.3초 |
| 6단 표시 최고속 | 약 225km/h |
| 100km/h 기어 | 3단 후반~4단 진입 |
| 1→2 변속 후 RPM | 약 4,470rpm |
| 2→3 변속 후 RPM | 약 5,215rpm |
| 3→4 변속 후 RPM | 약 5,830rpm |
| 4→5 변속 후 RPM | 약 6,100rpm |
| 5→6 변속 후 RPM | 약 5,680rpm |

0-100km/h는 실차 공식값을 그대로 강제하지 않고, 게임의 출발·노면·내리막 연출을 고려해 8초 전후로 검증한다.

## 구현 단계

### DRV-1 — 현재 기준선과 차량 연결 고정

- `ft86-retro → RAVEN_COUPE_ENGINE_PROFILE` 연결을 유지한다.
- `RAVEN_COUPE_ENGINE_PROFILE`을 참조하는 모든 경로를 목록화한다.
- 기존 `qa:standing-start`, `qa:powerband-reference` 출력과 현재 캡처를 보관한다.
- Genesis G70/Apex S의 결과가 바뀌지 않는 회귀 기준을 만든다.

완료 조건:

- 새 FT86 프로필을 만들지 않고 Raven 프로필만 수정한다.
- 변경 전 0-60/0-100, 단수, RPM 출력이 저장된다.

### DRV-2 — Raven 프로필에 물리 구동계 데이터 추가

프로필에 다음 필드를 추가한다.

```ts
gearRatios: [3.626, 2.188, 1.541, 1.213, 1.000, 0.767]
finalDriveRatio: 4.1
tireCircumferenceM: 1.964
drivetrainEfficiency: 0.85
```

기존 `speedRatioMin/Max`는 즉시 삭제하지 않는다. 물리 계산으로 전환하는 동안 비교·fallback용으로 남긴다.

### DRV-3 — 속도에서 엔진 RPM 계산

Raven의 실행 경로에서 다음 계산을 도입한다.

```text
wheelRpm = vehicleSpeedMps / tireCircumferenceM × 60
engineRpm = wheelRpm × gearRatio × finalDriveRatio
```

이 단계에서는 물리 속도와 RPM만 교체하고, 가속력은 기존 값을 유지한다. 먼저 변속 후 RPM과 단수 경계를 검증한다.

### DRV-4 — 파워밴드 재작성

Raven의 토크 곡선을 FT86 기준으로 조정한다.

```text
2500rpm: 0.45
3500rpm: 0.58
4500rpm: 0.70
5200rpm: 0.82
6000rpm: 0.94
6400rpm: 1.00
6600rpm: 1.00
7000rpm: 0.96
7400rpm: 0.84
7800rpm: 0.65
```

핵심은 6,400~6,600rpm의 넓은 토크 고점과 7,000rpm 이후의 완만한 하락이다.

### DRV-5 — 구동력과 0-100 보정

기어비와 RPM이 안정된 뒤에만 가속력을 조정한다.

```text
engine torque
  × gear ratio
  × final drive
  × drivetrain efficiency
  → wheel force
  → rolling resistance / aero drag
  → vehicle speed
```

기존 `engineAcceleration`과 `accelerationScale`은 마지막 보정값으로만 사용한다. 이를 먼저 키워 목표 시간을 맞추지 않는다.

### DRV-6 — 표시 속도와 물리 속도 분리

다음 세 값을 분리한다.

```text
physics speed : 구동계·RPM 계산용
world speed   : 도로 진행용
display speed : HUD 표시용
```

0-60/0-100 QA는 physics speed를 기준으로 측정한다. HUD가 필요하면 display speed에만 별도 보정을 적용한다.

### DRV-7 — 회귀 검증과 체감 조정

- Raven 직선 풀스로틀
- Raven level/downhill/uphill
- 변속 직후 재가속
- 60~100km/h 일반 grip 코너
- 100km/h 전후 3단/4단 전환
- 최고속 6단 유지

파워밴드 수치를 바꾸는 반복과 핸들링 수치를 바꾸는 반복을 분리한다.

## QA 계획

기존 명령을 확장한다.

```bash
npm run qa:powerband-reference --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:road-rhythm --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

추가할 자동 검증:

- Raven만 실제 gear ratio/final drive를 사용한다.
- 100km/h에서 기어가 비정상적으로 4단 이상으로 건너뛰지 않는다.
- 변속 후 RPM이 기준 범위 안에 들어온다.
- 0-60/0-100 목표 시간 범위를 통과한다.
- 6단 최고속과 RPM이 동시에 포화되지 않는다.
- Genesis G70/Apex S의 기존 QA 결과가 변하지 않는다.
- 고저차가 없는 직선에서 slope acceleration이 파워밴드를 왜곡하지 않는다.

## 2026-07-21 구현·측정 결과

Raven 프로필에만 실제 구동계 경로를 연결했다. 별도 FT86 프로필은 만들지 않았다.

```text
RAVEN_COUPE_ENGINE_PROFILE
  → gear ratios / final drive / tire circumference
  → physical engine RPM
  → gear-ratio-weighted wheel force
  → linear physics-speed HUD mapping
```

자동 측정 결과:

| 항목 | 결과 | 상태 |
| --- | ---: | --- |
| 0-60km/h | 3.933초 | 통과 |
| 0-100km/h | 8.117초 | 통과 |
| 60km/h 기어/RPM | 2단 / 4,958rpm | 통과 |
| 100km/h 기어/RPM | 3단 / 5,587rpm | 통과 |
| Raven 최고 표시 속도 | 225km/h envelope | 환산/clamp 통과, 실제 평형 미검증 |
| Genesis G70/Apex S standing-start 회귀 | 기존 기준 유지 | 통과 |

통과한 명령:

```bash
npm run qa:powerband-reference --workspace @games/apex-seoul
npm run qa:standing-start --workspace @games/apex-seoul
npm run qa:speed-handling-sweep --workspace @games/apex-seoul
npm run qa:low-speed-steering --workspace @games/apex-seoul
npm run build --workspace @games/apex-seoul
```

현재 0-60은 0-100 목표를 맞추는 과정에서 실차 공식 0-62mph보다 빠르게 측정된다. 다음 반복에서는 launch traction/저단 구동력 곡선을 별도 조정하되, 0-100 목표와 기어 전환 RPM을 먼저 보존한다.

## 2026-07-22 SH-7 최고속 평형 재진단

SH-7 straight runtime에서 Raven은 59.4초 full throttle 후에도 `140.7km/h`, 4단 `6,176rpm`에 머물렀다. 기존 표의 `225km/h envelope 통과`는 unit↔km/h 환산과 표시/clamp 상한을 뜻했으며, 평지에서 실제 구동력과 저항이 225km/h에 평형을 이룬다는 뜻이 아니었다.

진단 결과는 두 층으로 나뉜다.

1. 물리 4단 7,400rpm은 약 `175.3km/h`인데 기존 speed envelope의 4단 끝은 `135km/h`다. upshift가 두 조건을 동시에 요구하고 차량이 약 141km/h에서 먼저 평형을 이루므로 4단에 고착된다.
2. 강제로 6단 225km/h를 대입해도 drive force 약 `18.3`보다 rolling+aero resistance 약 `83.3`이 크다. 변속 조건만 고쳐서는 최고속 평형을 만들 수 없다.

후속 작업은 [최고속 평형·Visual Rail Boundary 진단 및 개선 계획](./apex-seoul-top-speed-equilibrium-diagnosis-plan.md)의 `TSE-1~TSE-6`을 따른다. 0-100과 저단 변속을 통제 변수로 유지하고, level terminal force budget을 별도 자동 측정한 뒤에만 225km/h 최고속을 승인한다.

TSE-1 자동 측정은 level `126.759km/h`, SH-7 slope `140.835km/h`를 terminal로 확정했다. SH-7 실제값 `140.7km/h`와 일치하며 힘 합계 오차는 `0`이다. uphill은 3단에 남아 `128.399km/h`, level은 4단으로 변속 후 `126.759km/h`로 감속해 경사 관계까지 역전됐다. TSE-2에서 중복 변속 기준을 제거해 이 현상 중 shift schedule과 force budget의 책임을 분리한다.

TSE-2에서 physical profile의 초기 기어와 powered upshift는 실제 RPM만 사용하게 됐다. downshift 역시 legacy `speedRatioMin` 대신 한 단 내린 뒤 `shiftDropRpm = 5,400`이 되도록 실제 인접 기어비에서 경계를 파생한다. 80/120/150/180km/h 초기 단수는 `2/3/4/5단`으로 실제 가속 주행과 일치하며, TSE-1 terminal 결과와 0-100 `8.117초`는 변하지 않았다. 변속 기준 중복을 제거해도 최고속 부족이 그대로 남았으므로 다음 원인은 TSE-3의 고속 force budget으로 격리됐다.

TSE-3은 production 값을 바꾸지 않고 223/224/225km/h 평형용 aero coefficient를 역산했다. 선택값은 `0.000007661283`, 목표는 level `224km/h`다. 이 후보는 223km/h에서 가속, 225km/h에서 감속하며 6단 `223.913km/h`에 clamp 없이 수렴한다. 전역 engine 증폭은 약 4.542배가 필요해 0-100이 1.317초가 되므로 폐기했고, 6단 전용 boost는 현재 차량이 4단에서 멈춰 활성화될 수 없어 폐기했다. 선택 aero만 적용할 때 0-100이 7.083초가 되는 영향은 TSE-4 calibration 대상으로 넘겼다.

TSE-4에서는 선택한 aero를 production에 적용하고 `launchThrottleFullSpeedRatio`만 `0.7 → 1.0`으로 늘렸다. 그 결과 0-60 `4.05초`, 0-100 `8.10초`를 유지하면서 level은 6단 `223.953km/h`에서 hard clamp 없이 자연 평형을 이룬다. uphill/level/downhill 속도 관계도 복구됐다. SH-7 내리막의 225km/h는 양의 경사 가속이 남은 safety cap이므로 평지 force equilibrium과 별도로 표기한다.

TSE-5 실제 WebGL 1× 캡처에서도 SH-7 직선은 runtime `39.383초`에 225km/h·6단에 도달했다. 전체 700 sample 동안 조향, corner loss, guardrail impact와 fuel cut은 발생하지 않았다. 평지 223.953km/h는 force equilibrium, SH-7 225km/h는 mild downhill safety cap이라는 분류도 deterministic/runtime 사이에서 일치한다.

TSE-6은 위 결과를 `qa:top-speed-regression` 한 명령으로 고정했다. 기존 4단 고착, 4단 선언/물리 경계 불일치, 225km/h force deficit, drag-only 후보의 0-100 과속, launch 보정 후 결과, level/uphill/downhill 관계와 runtime 1×를 한 보고서에서 비교한다. 225km/h corner-loss도 새 production straight control을 기준으로 재설정해 handling 관계형 QA가 다시 통과한다.

자동 생성물:

- [TSE-1 최고속 평형 JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse1-baseline.json)
- [TSE-1 최고속 평형 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse1-baseline.md)
- [TSE-2 물리 변속·평형 JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse2-baseline.json)
- [TSE-2 물리 변속·평형 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-equilibrium-tse2-baseline.md)
- [TSE-3 force budget JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-force-budget-tse3.json)
- [TSE-3 force budget 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-force-budget-tse3.md)
- [TSE-4 calibration JSON](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-calibration-tse4.json)
- [TSE-4 calibration 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-calibration-tse4.md)
- [TSE-5 SH-7 runtime 표](../../games/apex-seoul/assets/telemetry/generated/speed-presentation/sh7-runtime/sh7-integrated-telemetry.md)
- [TSE-6 통합 회귀 표](../../games/apex-seoul/assets/telemetry/generated/top-speed-equilibrium/top-speed-regression-tse6.md)

## 블로그 글감 / 시행착오 로그

이 문서는 구현 중 다음 내용을 계속 기록한다.

1. `speedRatio → RPM` 보간이 왜 실제 기어비와 달랐는가
2. Raven 명칭은 유지하면서 FT86 참조 모델을 강화한 이유
3. 기어비만 바꿨을 때 0-100이 어떻게 변했는가
4. 토크 피크를 7,000rpm에서 6,400~6,600rpm으로 옮긴 결과
5. 실제 RPM 계산 도입 후 변속 직후 체감이 어떻게 달라졌는가
6. 물리 속도와 HUD 표시 속도를 분리해야 했던 이유
7. 실차 수치와 게임 코스/내리막 감각 사이에서 어떤 타협을 했는가
8. 225km/h 환산과 clamp는 맞았지만 실제 차량은 4단 140.7km/h에서 멈춘 이유
9. standing-start QA와 terminal-speed equilibrium QA가 서로 다른 문제를 검증한다는 사실

각 단계의 전후 `qa:powerband-reference` 출력, standing-start 결과, 대표 캡처를 남긴다. 최종 구현이 안정되면 공개 글에서 전체 과정을 시행착오 순서로 재구성한다.

## 범위 밖

- Raven Coupe라는 게임 내 명칭 변경
- 별도 `FT86_ENGINE_PROFILE` 생성
- Genesis G70/Apex S의 구동계 재설계
- 엔진 사운드·배기음 구현
- 클러치 열, 변속기 손상, 실제 타이어 슬립까지 포함한 시뮬레이터화

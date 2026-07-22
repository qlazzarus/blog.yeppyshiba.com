# Apex Seoul TSE-2 물리 변속·최고속 평형 기준선

생성: 2026-07-22T03:58:09.062Z

상태: **PASS**

Physical drivetrain의 초기 기어, powered upshift, downshift hysteresis를 실제 gear RPM 하나로 통일한 뒤 경사별 terminal speed와 종방향 힘을 기록한다. PASS는 변속 기준 단일화와 TSE-1 평형 보존을 뜻하며 225km/h 최고속 승인을 의미하지 않는다.

## Terminal equilibrium

| scenario | slope | time | terminal km/h | unit/s | gear | RPM | drive | rolling | aero | net accel | 5s delta | clamp |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| uphill | -10 | 63.383s | 128.399 | 433.703 | 3 | 7124.222 | 46.576 | 14 | 22.572 | 0.004058 | 0.009992 | no |
| level | 0 | 105.567s | 126.759 | 428.165 | 4 | 5589.738 | 35.993 | 14 | 21.999 | -0.005638 | 0.009996 | no |
| sh7-mild-downhill | 3.988 | 69.95s | 140.835 | 475.709 | 4 | 6183.773 | 37.173 | 14 | 27.156 | 0.005244 | 0.009991 | no |

## Physical shift envelope

| gear | declared max km/h | physical 7,400rpm km/h | delta |
| ---: | ---: | ---: | ---: |
| 1 | 45.225 | 58.656 | 13.431 |
| 2 | 74.925 | 97.206 | 22.281 |
| 3 | 106.425 | 138.019 | 31.594 |
| 4 | 135 | 175.34 | 40.34 |
| 5 | 163.8 | 212.687 | 48.887 |
| 6 | 225 | 277.297 | 52.297 |

## Physical downshift envelope

이전 단으로 내렸을 때 profile shift-drop target 5400rpm에 도달하도록 경계를 파생한다.

| current → previous | current RPM | speed km/h | previous gear landing RPM |
| --- | ---: | ---: | ---: |
| 2→1 | 3258.467 | 42.803 | 5400 |
| 3→2 | 3803.199 | 70.934 | 5400 |
| 4→3 | 4250.616 | 100.716 | 5400 |
| 5→4 | 4451.772 | 127.95 | 5400 |
| 6→5 | 4141.8 | 155.204 | 5400 |

Runtime ±50rpm probe도 각 경계 아래에서 한 단만 내려가고 위에서는 현재 단을 유지해야 한다.

## Initial physical gear selection

| speed km/h | expected | selected |
| ---: | ---: | ---: |
| 60 | 2 | 2 |
| 80 | 2 | 2 |
| 100 | 3 | 3 |
| 120 | 3 | 3 |
| 150 | 4 | 4 |
| 180 | 5 | 5 |
| 225 | 6 | 6 |

## Observed shifts

### uphill

| shift | time | speed km/h | pre-shift mechanical RPM |
| --- | ---: | ---: | ---: |
| 1→2 | 4.65s | 58.734 | 7374.528 |
| 2→3 | 9.867s | 97.267 | 7396.489 |

### level

| shift | time | speed km/h | pre-shift mechanical RPM |
| --- | ---: | ---: | ---: |
| 1→2 | 3.733s | 58.66 | 7358.678 |
| 2→3 | 7.467s | 97.296 | 7394.851 |
| 3→4 | 20.1s | 138.02 | 7399.22 |

### sh7-mild-downhill

| shift | time | speed km/h | pre-shift mechanical RPM |
| --- | ---: | ---: | ---: |
| 1→2 | 3.467s | 58.712 | 7362.628 |
| 2→3 | 6.817s | 97.337 | 7396.471 |
| 3→4 | 15.667s | 138.047 | 7399.63 |

## Findings

- Level terminal: **126.759km/h**
- Level gap to 225km/h: **98.241km/h**
- SH-7 measured/simulated: **140.7 / 140.835km/h**
- 4th declared/physical shift boundary: **135 / 175.34km/h**
- Level target equilibrium reached: **no**
- Uphill < level < downhill monotonic relation: **no**
- TSE-1 terminal maximum delta: **0km/h**
- 현재 uphill은 3단에 남아 level의 4단 평형보다 빠르다. 변속 기준 중복은 제거됐지만 이 비단조 관계의 근본 원인은 고속 force budget이므로 TSE-3/TSE-4 대상으로 보존한다.

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| allScenariosReachTerminalWindow | yes | true | {"id":"uphill","reached":true}, {"id":"level","reached":true}, {"id":"sh7-mild-downhill","reached":true} |
| forceIdentityErrorMax | yes | 0, 0.000001 | 0 |
| tse1TerminalDeltaKmhMax | yes | 0, 0.001 | 0 |
| physicalInitialGearSelection | yes | {"expectedGear":2,"speedKmh":60}, {"expectedGear":2,"speedKmh":80}, {"expectedGear":3,"speedKmh":100}, {"expectedGear":3,"speedKmh":120}, {"expectedGear":4,"speedKmh":150}, {"expectedGear":5,"speedKmh":180}, {"expectedGear":6,"speedKmh":225} | {"gear":2,"speedKmh":60}, {"gear":2,"speedKmh":80}, {"gear":3,"speedKmh":100}, {"gear":3,"speedKmh":120}, {"gear":4,"speedKmh":150}, {"gear":5,"speedKmh":180}, {"gear":6,"speedKmh":225} |
| physicalInitialGearIgnoresLegacyEnvelope | yes | {"80kmh":2,"120kmh":3} | {"80kmh":2,"120kmh":3} |
| observedUpshiftsMatchPhysicalRpm | yes | all powered shifts are upward within 50rpm of 7400 | {"id":"uphill","shifts":[{"fromGear":1,"mechanicalRpm":7374.52815548,"toGear":2},{"fromGear":2,"mechanicalRpm":7396.48917224,"toGear":3}]}, {"id":"level","shifts":[{"fromGear":1,"mechanicalRpm":7358.67813193,"toGear":2},{"fromGear":2,"mechanicalRpm":7394.85116347,"toGear":3},{"fromGear":3,"mechanicalRpm":7399.21968096,"toGear":4}]}, {"id":"sh7-mild-downhill","shifts":[{"fromGear":1,"mechanicalRpm":7362.62761857,"toGear":2},{"fromGear":2,"mechanicalRpm":7396.47077553,"toGear":3},{"fromGear":3,"mechanicalRpm":7399.6295438,"toGear":4}]} |
| physicalDownshiftTargetIdentity | yes | 5400 | {"gear":2,"previousGearLandingRpm":5400}, {"gear":3,"previousGearLandingRpm":5400}, {"gear":4,"previousGearLandingRpm":5400}, {"gear":5,"previousGearLandingRpm":5400}, {"gear":6,"previousGearLandingRpm":5400} |
| physicalDownshiftRuntimeBoundary | yes | 50rpm below threshold downshifts once; 50rpm above holds current gear | {"above":{"mechanicalRpm":3308.4666299,"selectedGear":2,"speedKmh":43.45985951},"below":{"mechanicalRpm":3208.4666299,"selectedGear":1,"speedKmh":42.14626429},"gear":2,"thresholdRpm":3258.4666299}, {"above":{"mechanicalRpm":3853.19926874,"selectedGear":3,"speedKmh":71.86670072},"below":{"mechanicalRpm":3753.19926874,"selectedGear":2,"speedKmh":70.00158304},"gear":3,"thresholdRpm":3803.19926874}, {"above":{"mechanicalRpm":4300.6164828,"selectedGear":4,"speedKmh":101.90108104},"below":{"mechanicalRpm":4200.6164828,"selectedGear":3,"speedKmh":99.53162816},"gear":4,"thresholdRpm":4250.6164828}, {"above":{"mechanicalRpm":4501.77246496,"selectedGear":5,"speedKmh":129.3875286},"below":{"mechanicalRpm":4401.77246496,"selectedGear":4,"speedKmh":126.51338226},"gear":5,"thresholdRpm":4451.77246496}, {"above":{"mechanicalRpm":4191.8,"selectedGear":6,"speedKmh":157.07753108},"below":{"mechanicalRpm":4091.8,"selectedGear":5,"speedKmh":153.33027379},"gear":6,"thresholdRpm":4141.8} |
| gearHysteresisSlopeOrderingReproduced | yes | current baseline keeps uphill in 3rd above the level 4th-gear terminal | {"gear":3,"id":"uphill","speedKmh":128.39893526}, {"gear":4,"id":"level","speedKmh":126.75937832}, {"gear":4,"id":"sh7-mild-downhill","speedKmh":140.83503104} |
| levelTerminalBaselineKmh | yes | 120, 135 | 126.759378 |
| sh7TerminalBaselineKmh | yes | 135, 150 | 140.835031 |
| levelAndSh7RemainFourthGear | yes | {"level":4,"sh7":4} | {"level":4,"sh7":4} |
| noScenarioUsesHardClamp | yes | false | {"hitHardClamp":false,"id":"uphill"}, {"hitHardClamp":false,"id":"level"}, {"hitHardClamp":false,"id":"sh7-mild-downhill"} |
| straightHasNoCornerLoss | yes | 0 | {"cornerLossMax":0,"id":"uphill"}, {"cornerLossMax":0,"id":"level"}, {"cornerLossMax":0,"id":"sh7-mild-downhill"} |
| fourthGearEnvelopeMismatchReproduced | yes | physical 7,400rpm speed exceeds declared max by >= 35km/h | {"declaredMaxSpeedKmh":135,"gear":4,"physicalShiftSpeedKmh":175.339513,"shiftRpm":7400} |


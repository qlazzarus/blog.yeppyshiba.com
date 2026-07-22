# Apex Seoul TSE-1 최고속 평형 기준선

생성: 2026-07-22T02:53:48.233Z

상태: **PASS**

현재 production controller를 변경 없이 적분해 경사별 terminal speed와 종방향 힘을 기록한다. PASS는 기존 문제를 정확히 재현했다는 뜻이며 225km/h 최고속 승인을 의미하지 않는다.

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
- 현재 uphill은 3단에 남아 level의 4단 평형보다 빠르다. 이 비단조 관계는 TSE-2/TSE-4 개선 대상으로 보존한다.

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| allScenariosReachTerminalWindow | yes | true | {"id":"uphill","reached":true}, {"id":"level","reached":true}, {"id":"sh7-mild-downhill","reached":true} |
| forceIdentityErrorMax | yes | 0, 0.000001 | 0 |
| gearHysteresisSlopeOrderingReproduced | yes | current baseline keeps uphill in 3rd above the level 4th-gear terminal | {"gear":3,"id":"uphill","speedKmh":128.39893526}, {"gear":4,"id":"level","speedKmh":126.75937832}, {"gear":4,"id":"sh7-mild-downhill","speedKmh":140.83503104} |
| levelTerminalBaselineKmh | yes | 120, 135 | 126.759378 |
| sh7TerminalBaselineKmh | yes | 135, 150 | 140.835031 |
| levelAndSh7RemainFourthGear | yes | {"level":4,"sh7":4} | {"level":4,"sh7":4} |
| noScenarioUsesHardClamp | yes | false | {"hitHardClamp":false,"id":"uphill"}, {"hitHardClamp":false,"id":"level"}, {"hitHardClamp":false,"id":"sh7-mild-downhill"} |
| straightHasNoCornerLoss | yes | 0 | {"cornerLossMax":0,"id":"uphill"}, {"cornerLossMax":0,"id":"level"}, {"cornerLossMax":0,"id":"sh7-mild-downhill"} |
| fourthGearEnvelopeMismatchReproduced | yes | physical 7,400rpm speed exceeds declared max by >= 35km/h | {"declaredMaxSpeedKmh":135,"gear":4,"physicalShiftSpeedKmh":175.339513,"shiftRpm":7400} |


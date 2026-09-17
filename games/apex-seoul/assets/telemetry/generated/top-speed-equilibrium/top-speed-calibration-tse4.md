# Apex Seoul TSE-4 최고속 Calibration

생성: 2026-09-17T04:05:30.570Z

상태: **PASS**

TSE-3에서 선택한 aero 계수와 launch 보정을 production에 적용하고, 저속 가속·물리 변속·평지 limiter·경사 관계를 같은 controller로 검증한다.

## Scenario result

| scenario | slope | 300s km/h | gear | mechanical RPM | limiter frames | net | 5s delta | class | clamp |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| uphill | -10 | 168.333 | 5 | 5856.784 | 0 | -0.139206 | 0.203517 | observed-at-300s | no |
| level | 0 | 223.211 | 6 | 7533.186 | 4160 | 2.574285 | 0.133986 | rpm-limiter | no |
| sh7-mild-downhill | 3.988 | 225 | 6 | 7593.559 | 5552 | 6.753101 | 0.030585 | safety-cap | yes |

## Level acceleration splits

| 0-60 | 0-100 | 100-175.34 | 175.34-212.687 | 212.687-223 |
| ---: | ---: | ---: | ---: | ---: |
| 4.067s | 8.133s | 13.767s | 16.517s | 11.967s |

## 223/224/225km/h force bracket

| km/h | gear | RPM | drive | rolling | aero | net |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 223 | 6 | 7709.306 | 21 | 14 | 4.347 | 2.652836 |
| 224 | 6 | 7603.678 | 9.589 | 14 | 4.386 | -8.796897 |
| 225 | 6 | 7616.22 | 21.187 | 14 | 4.425 | 2.761845 |

## Decision

- production aeroDrag: **0.000007661283**
- launch full-speed ratio: **1**
- 평지는 hard clamp 없이 profile RPM limiter를 반복해야 한다.
- SH-7 내리막은 양의 경사 가속 때문에 225km/h safety cap에 닿을 수 있으며, 이 경우 평형으로 표기하지 않는다.

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| level0to60Sec | yes | 3.5, 5 | 4.066666667 |
| level0to100Sec | yes | 7.8, 8.3 | 8.133333333 |
| levelGearAt60 | yes | 2 | 2 |
| levelGearAt100 | yes | 3 | 3 |
| levelReachesFourthFifthSixth | yes | 4, 5, 6 | 1, 2, 3, 4, 5, 6 |
| levelHighGearShiftsUsePhysicalRpm | yes | 4→5 and 5→6 within 50rpm of 7400 | {"fromGear":4,"mechanicalRpm":7397.693783450906,"speedKmh":175.34726390166,"timeSec":21.9,"toGear":5}, {"fromGear":5,"mechanicalRpm":7399.711744505454,"speedKmh":212.7017486737,"timeSec":38.416666666667,"toGear":6} |
| levelTerminalKmh | yes | 223, 225 | 223.211119851 |
| levelTerminalGear | yes | 6 | 6 |
| levelAvoidsHardClamp | yes | false | false |
| levelLimiterSpeedSwing | yes | 0, 0.3 | 0.133986004 |
| levelUsesRpmLimiter | yes | reaches 7750rpm and drops at least 100rpm while limited | {"frames":4160,"maxRpm":7751.800842698314,"minRpmDuringLimiter":7526.353358939925} |
| slopeSpeedOrdering | yes | uphill < level < downhill | {"id":"uphill","speedKmh":168.332554400046}, {"id":"level","speedKmh":223.211119851103}, {"id":"sh7-mild-downhill","speedKmh":225} |
| levelUsesLimiterDownhillUsesSafetyCap | yes | {"downhill":true,"levelLimiter":true} | {"uphill":{"clamp":false,"limiterFrames":0},"level":{"clamp":false,"limiterFrames":4160},"sh7-mild-downhill":{"clamp":true,"limiterFrames":5552}} |
| levelSegmentTimesOrdered | yes | 60, 100, 175.34, 212.687, 223 | {"speedKmh":60,"timeSec":4.066666666667}, {"speedKmh":100,"timeSec":8.133333333333}, {"speedKmh":175.34,"timeSec":21.9}, {"speedKmh":212.687,"timeSec":38.416666666667}, {"speedKmh":223,"timeSec":50.383333333333} |
| forceIdentityErrorMax | yes | 0, 0.000001 | 0 |


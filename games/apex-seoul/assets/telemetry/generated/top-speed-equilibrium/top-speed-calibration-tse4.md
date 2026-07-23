# Apex Seoul TSE-4 최고속 Calibration

생성: 2026-07-23T05:16:49.310Z

상태: **PASS**

TSE-3에서 선택한 aero 계수와 launch 보정을 production에 적용하고, 저속 가속·물리 변속·평지 평형·경사 관계를 같은 controller로 검증한다.

## Scenario result

| scenario | slope | 300s km/h | gear | mechanical RPM | net | 5s delta | class | clamp |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| uphill | -10 | 168.711 | 5 | 5869.949 | -0.133038 | 0.194576 | observed-at-300s | no |
| level | 0 | 223.953 | 6 | 5976.459 | 0.00271 | 0.004244 | force-equilibrium | no |
| sh7-mild-downhill | 3.988 | 225 | 6 | 6004.392 | 3.910147 | 0 | safety-cap | yes |

## Level acceleration splits

| 0-60 | 0-100 | 100-175.34 | 175.34-212.687 | 212.687-223 |
| ---: | ---: | ---: | ---: | ---: |
| 4.033s | 8.083s | 13.75s | 16.467s | 113.533s |

## 223/224/225km/h force bracket

| km/h | gear | RPM | drive | rolling | aero | net |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 223 | 6 | 6191.024 | 18.421 | 14 | 4.347 | 0.074416 |
| 224 | 6 | 6217.705 | 18.385 | 14 | 4.386 | -0.000836 |
| 225 | 6 | 6244.386 | 18.348 | 14 | 4.425 | -0.077555 |

## Decision

- production aeroDrag: **0.000007661283**
- launch full-speed ratio: **1**
- 평지는 hard clamp 없이 force equilibrium이어야 한다.
- SH-7 내리막은 양의 경사 가속 때문에 225km/h safety cap에 닿을 수 있으며, 이 경우 평형으로 표기하지 않는다.

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| level0to60Sec | yes | 3.5, 5 | 4.033333333 |
| level0to100Sec | yes | 7.8, 8.3 | 8.083333333 |
| levelGearAt60 | yes | 2 | 2 |
| levelGearAt100 | yes | 3 | 3 |
| levelReachesFourthFifthSixth | yes | 4, 5, 6 | 1, 2, 3, 4, 5, 6 |
| levelHighGearShiftsUsePhysicalRpm | yes | 4→5 and 5→6 within 50rpm of 7400 | {"fromGear":4,"mechanicalRpm":7399.454095124966,"speedKmh":175.388635985634,"timeSec":21.833333333333,"toGear":5}, {"fromGear":5,"mechanicalRpm":7399.537435374826,"speedKmh":212.69667738885,"timeSec":38.3,"toGear":6} |
| levelTerminalKmh | yes | 223, 225 | 223.953313489 |
| levelTerminalGear | yes | 6 | 6 |
| levelAvoidsHardClamp | yes | false | false |
| levelFiveSecondDeltaKmh | yes | 0, 0.02 | 0.004243932 |
| levelNetAcceleration | yes | 0, 0.02 | 0.002709512 |
| selectedForceBrackets224 | yes | positive at 223, approximately zero at 224, negative at 225 | {"netAcceleration":0.074416324086,"speedKmh":223}, {"netAcceleration":-0.000835741632,"speedKmh":224}, {"netAcceleration":-0.077555010389,"speedKmh":225} |
| slopeSpeedOrdering | yes | uphill < level < downhill | {"id":"uphill","speedKmh":168.710930168434}, {"id":"level","speedKmh":223.953313488908}, {"id":"sh7-mild-downhill","speedKmh":225} |
| onlyDownhillUsesSafetyCap | yes | {"downhill":true,"level":false,"uphill":false} | {"uphill":false,"level":false,"sh7-mild-downhill":true} |
| levelSegmentTimesOrdered | yes | 60, 100, 175.34, 212.687, 223 | {"speedKmh":60,"timeSec":4.033333333333}, {"speedKmh":100,"timeSec":8.083333333333}, {"speedKmh":175.34,"timeSec":21.833333333333}, {"speedKmh":212.687,"timeSec":38.3}, {"speedKmh":223,"timeSec":151.833333333333} |
| forceIdentityErrorMax | yes | 0, 0.000001 | 0 |
| levelAvoidsFuelCut | yes | < 7200 mechanical rpm | 5976.459478348 |


# Apex Seoul TSE-6 최고속 회귀 묶음

생성: 2026-07-22T11:37:09.818Z

상태: **PASS**

표시 상한, 실제 기어 RPM, 종방향 힘의 평형, runtime SH-7 결과를 한 회귀 묶음으로 고정한다.

## Before / after

| stage | speed km/h | gear | classification |
| --- | ---: | ---: | --- |
| before-level-tse2 | 126.759 | 4 | historical level force equilibrium |
| before-sh7-runtime | 140.7 | 4 | historical SH-7 runtime observation |
| after-level-tse4 | 223.953 | 6 | force-equilibrium |
| after-sh7-runtime-tse5 | 225 | 6 | mild-downhill-safety-cap |

## The hidden fourth-gear boundary

- Legacy declared boundary: **135km/h**
- Physical 7400rpm boundary: **175.34km/h**

## Force budget at 225km/h

| stage | drive | rolling | aero | net acceleration |
| --- | ---: | ---: | ---: | ---: |
| before | 18.343 | 14 | 69.312 | -64.969 |
| after | 18.348 | 14 | 4.425 | -0.078 |

## Acceleration preservation

| candidate | 0-60 | 0-100 |
| --- | ---: | ---: |
| drag-only intermediate | 3.817s | 7.083s |
| corrected production | 4.033s | 8.083s |

## Mid/high-speed splits

| source | 100→175.34 | 175.34→212.687 | 212.687→223 |
| --- | ---: | ---: | ---: |
| deterministic level | 13.75s | 16.467s | 113.533s |
| runtime SH-7 downhill | 11.213s | 10.78s | 7.966s |

## Slope relationship

| scenario | speed km/h | classification |
| --- | ---: | --- |
| uphill | 168.711 | observed-at-300s |
| level | 223.953 | force-equilibrium |
| sh7-mild-downhill | 225 | safety-cap |

Level은 clamp 없는 force equilibrium이고 SH-7 mild downhill은 양의 경사 가속이 남은 safety cap이다.

## TSE-6 corner-loss reference

| grade | level corner-only % | downhill corner-only % | downhill raw % | level - downhill pp |
| --- | ---: | ---: | ---: | ---: |
| easy | 6.501 | 0 | 0 | 6.501 |
| medium | 28.242 | 21.44 | 21.257 | 6.802 |
| sharp | 47.956 | 42.714 | 42.296 | 5.242 |

과거 HND-3 손실률은 225km/h 직선 자체가 감속하던 상태를 기준으로 했다. TSE-6은 같은 speed/slope/pedal의 calibrated straight control과 코너 출구를 비교한다.

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| historicalTse1Pass | yes | true | true |
| historicalTse2Pass | yes | true | true |
| historicalTse3Pass | yes | true | true |
| productionTse4Pass | yes | true | true |
| runtimeTse5Ready | yes | true | true |
| cornerDemandTse6Pass | yes | true | true |
| handlingRelationsTse6Pass | yes | true | true |
| speedPresentationPreserved | yes | true | true |
| standingStart0to100Sec | yes | 7.8, 8.3 | 8.083333333 |
| standingStartGearAt60 | yes | 2 | 2 |
| standingStartGearAt100 | yes | 3 | 3 |
| levelNaturalEquilibriumKmh | yes | 223, 225 | 223.953313489 |
| levelAvoidsClamp | yes | false | false |
| runtimeReaches225 | yes | 225 | 225 |
| runtimeStraightIsClean | yes | 0 | {"cornerLoss":0,"guardrailImpacts":0,"steering":0} |
| slopeOrderingAndClassification | yes | uphill < level equilibrium < downhill safety-cap | {"downhill":[225,"safety-cap"],"level":[223.953313488908,"force-equilibrium"],"uphill":[168.710930168434,"observed-at-300s"]} |
| forceBracketStillNatural | yes | positive / approximately zero / negative at 223 / 224 / 225km/h | 0.074416324, -0.000835742, -0.07755501 |
| cornerLossUsesCalibratedStraightReference | yes | level loss exceeds safety-cap downhill by >= 5 percentage points for each grade | {"downhillCornerLossPercent":0,"downhillRawLossPercent":0,"grade":"easy","levelCornerLossPercent":6.501,"levelMinusDownhillPercentagePoints":6.501}, {"downhillCornerLossPercent":21.44,"downhillRawLossPercent":21.257,"grade":"medium","levelCornerLossPercent":28.242,"levelMinusDownhillPercentagePoints":6.802}, {"downhillCornerLossPercent":42.714,"downhillRawLossPercent":42.296,"grade":"sharp","levelCornerLossPercent":47.956,"levelMinusDownhillPercentagePoints":5.242} |

이 PASS는 최고속 회귀가 고정됐다는 뜻이다. Visual rail과 drift cycle의 통합 실주행 승인은 별도 blocker로 남는다.


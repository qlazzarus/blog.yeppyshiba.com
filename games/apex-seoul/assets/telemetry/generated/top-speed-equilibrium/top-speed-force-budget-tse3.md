# Apex Seoul TSE-3 최고속 Force Budget

생성: 2026-07-22T03:58:09.283Z

상태: **PASS**

Production 상수를 변경하지 않고 level 223/224/225km/h 평형 후보를 비교한다. 선택 결과는 TSE-4 입력이며 아직 runtime에 적용되지 않았다.

## Production steady force

| km/h | gear | RPM | drive | rolling | aero | net |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 3 | 5603.599 | 43.804 | 14 | 13.691 | 16.113 |
| 150 | 4 | 6569.824 | 37.143 | 14 | 30.805 | -7.662 |
| 175.34 | 5 | 6338.355 | 28.396 | 14 | 42.093 | -27.697 |
| 200 | 5 | 7195.077 | 25.332 | 14 | 54.765 | -43.433 |
| 212.687 | 6 | 5912.262 | 18.797 | 14 | 61.933 | -57.136 |
| 223 | 6 | 6187.072 | 18.419 | 14 | 68.085 | -63.666 |
| 224 | 6 | 6213.718 | 18.381 | 14 | 68.697 | -64.316 |
| 225 | 6 | 6240.363 | 18.343 | 14 | 69.312 | -64.969 |

## Derived aero coefficients

| target km/h | drive | rolling | available aero | coefficient | production ratio |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 223 | 18.424 | 14 | 4.424 | 0.00000779678 | 0.065 |
| 224 | 18.386 | 14 | 4.386 | 0.000007661283 | 0.0638 |
| 225 | 18.348 | 14 | 4.348 | 0.000007527021 | 0.0627 |

## Candidate simulation

| candidate | aero | engine accel | 0-60 | 0-100 | 175 | 213 | 223 | terminal | gear | clamp |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| production | 0.00012 | 82 | 3.917 | 8.1 | - | - | - | 126.759 | 4 | no |
| aero-equilibrium-223 | 0.00000779678 | 82 | 3.817 | 7.083 | 17.883 | 33.317 | - | 222.914 | 6 | no |
| aero-equilibrium-224 | 0.000007661283 | 82 | 3.817 | 7.083 | 17.883 | 33.183 | 141.25 | 223.913 | 6 | no |
| aero-equilibrium-225 | 0.000007527021 | 82 | 3.817 | 7.067 | 17.85 | 33.033 | 114.617 | 224.917 | 6 | no |
| global-engine-equilibrium-225 | 0.00012 | 372.43 | 0.7 | 1.317 | 3.183 | 5.767 | 13.8 | 225 | 6 | yes |

## Decision

- Selected for TSE-4: **aero-equilibrium-224**
- Proposed aeroDrag: **0.000007661283**
- Production aeroDrag: **0.00012**
- Target 224km/h leaves positive force at 223km/h and negative force at 225km/h, so the clamp does not create the equilibrium.
- Global engine scaling is rejected because it multiplies low-gear force. Sixth-only boost is rejected because the production car never reaches sixth.
- The selected drag-only candidate reaches 100km/h in **7.083s**, so TSE-4 must restore the approved 7.8~8.3s low-speed curve separately.

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| productionMatchesTse2Level | yes | 126.75937832 | 126.759378318 |
| derivedAeroOrdering | yes | aero(223) > aero(224) > aero(225) | {"aeroDrag":0.00000779678,"targetSpeedKmh":223}, {"aeroDrag":0.000007661283,"targetSpeedKmh":224}, {"aeroDrag":0.000007527021,"targetSpeedKmh":225} |
| selectedForceAt224 | yes | 0, 0.001 | 0.00029256 |
| selectedForceBracketsTarget | yes | net acceleration positive at 223 and negative at 225 | {"223":0.076587046976,"224":-0.000292560476,"225":-0.077555010389} |
| selectedTerminalKmh | yes | 223, 225 | 223.91342578 |
| selectedTerminalSixthGear | yes | 6 | 6 |
| selectedAvoidsHardClamp | yes | false | false |
| selectedReachesFourthFifthSixth | yes | 4, 5, 6 | 1, 2, 3, 4, 5, 6 |
| selectedExposesLowSpeedRegressionForTse4 | yes | 0-100 becomes faster than the 7.8s lower gate before TSE-4 compensation | 7.083333333 |
| topGearOnlyCannotUnblockCurrentRun | yes | production run never reaches 5th/6th, so a 6th-only boost cannot solve reachability | 4 |
| globalEngineAlternativeBreaksStandingStart | yes | global force scaling makes 0-100 unrealistically faster than the 7.8s gate | 1.316666667 |


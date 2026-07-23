# Apex Seoul Corner Speed Sense Baseline

Generated: 2026-07-22T11:25:36.750Z

Status: **PASS**

Track: 348 segments / 83520 units

## Commitment runs

| direction | segments | start | end | peak | 130km/h | 150km/h | 185km/h |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| right | 14 | 20 | 33 | 0.66 | 7.6518s | 6.6316s | 5.377s |
| left | 11 | 63 | 73 | 0.62 | 6.0121s | 5.2105s | 4.2248s |
| right | 11 | 105 | 115 | 0.64 | 6.0121s | 5.2105s | 4.2248s |
| left | 11 | 145 | 155 | 0.66 | 6.0121s | 5.2105s | 4.2248s |
| left | 12 | 208 | 219 | 0.56 | 6.5587s | 5.6842s | 4.6088s |
| right | 12 | 254 | 265 | 0.56 | 6.5587s | 5.6842s | 4.6088s |

## Near-field cadence

| km/h | straight lane/s | corner lane/s | corner reflector/s |
| ---: | ---: | ---: | ---: |
| 110 | 1.5481 | 3.0963 | 3.0963 |
| 130 | 1.8296 | 3.6593 | 3.6593 |
| 150 | 2.1111 | 4.2222 | 4.2222 |
| 185 | 2.6037 | 5.2074 | 5.2074 |

## Checks

| check | pass | target | value |
| --- | --- | --- | ---: |
| trackSegments | yes | 340..380 | 348 |
| commitmentRunCount | yes | 6..8 | 6 |
| longestCommitmentSegments | yes | <= 14 | 14 |
| shortestCommitmentSegments | yes | >= 8 | 11 |
| longestCommitmentDurationAt130Kmh | yes | <= 8 | 7.6518 |
| cornerLaneCadenceAt150Kmh | yes | 4..6 | 4.2222 |
| cornerReflectorCadenceAt185Kmh | yes | 4..6 | 5.2074 |
| recoveryRunsAtLeastEightSegments | yes | >= 7 | 8 |
| displaySpeedIdentityError | yes | <= 0.000001 | 0 |


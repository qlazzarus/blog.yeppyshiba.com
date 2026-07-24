# Apex Seoul HND-6 Handling Relationship QA

Generated: 2026-07-24T05:03:47.122Z

Automated relationship status: **PASS**

Manual driving approval: **deferred-by-user**

> This report approves the deterministic relationship gates only. It does not approve final driving feel.

## Relationship checks

| check | pass | target | value |
| --- | --- | --- | --- |
| source.cornerDemandPass | yes | true | true |
| source.understeerVisualPass | yes | true | true |
| control.straightExitSpeedStable | yes | <= 0.05km/h versus TSE-6 calibrated straight controls | {"comparedRows":24,"maxExitSpeedDeltaKmh":0} |
| control.zeroTo100Stable | yes | <= 0.05s versus HND-1 and within 7.8~8.3s | {"currentSec":8.1,"deltaSec":0.017,"hnd1Sec":8.117} |
| control.sixtyKmhStable | yes | <= 0.05s versus TSE-6, same gear, and within 3.5~5.0s | {"current":{"gear":2,"rpm":4961,"timeSec":4.05},"deltaSec":0,"tse6":{"gear":2,"rpm":4961,"timeSec":4.05}} |
| control.drivetrainIdentityStable | yes | gear ratios/final drive/tire circumference unchanged from HND-1 | {"finalDrive":4.1,"gearRatios":[3.626,2.188,1.541,1.213,1,0.767],"tireCircumferenceM":1.964} |
| relation.gripAccidentalDriftNearZero | yes | <= 0.01 across synthetic and fixed Bugak grip scenarios | 0 |
| relation.hr3hDirectOverspeedTranslationRemoved | yes | 0 | 0 |
| relation.hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 35.023 |

## Prepared versus full-throttle

| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| level | easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| level | medium | 0.558 | 0.428 | 0.13 | 0.973 | 0.999 | 0.026 |
| level | sharp | 0.932 | 0.932 | 0 | 0.248 | 0.463 | 0.215 |
| downhill | easy | 0.295 | 0.279 | 0.016 | 1 | 1 | 0 |
| downhill | medium | 0.558 | 0.558 | 0 | 0.973 | 0.976 | 0.003 |
| downhill | sharp | 0.932 | 0.932 | 0 | 0.199 | 0.242 | 0.043 |

Line retention is `1 - outward excursion / available road width`. Higher is better.

## Corner-only loss ordering

| slope | easy | medium | sharp |
| --- | ---: | ---: | ---: |
| level | 0.733% | 0.662% | 11.358% |
| downhill | 0% | 0% | 0.244% |

## Fixed Bugak segment relationships

| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| medium | 0.558 | 0.526 | 0.032 | 0.888 | 0.942 | 0.054 |
| sharp | 0.932 | 0.932 | 0 | 0.288 | 0.467 | 0.179 |

## Deferred manual approval

- [ ] level/left
- [ ] downhill/right
- [ ] sharp S-bend


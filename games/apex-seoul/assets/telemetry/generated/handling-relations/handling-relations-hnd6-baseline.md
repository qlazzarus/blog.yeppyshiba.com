# Apex Seoul HND-6 Handling Relationship QA

Generated: 2026-07-31T08:48:15.158Z

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
| relation.hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 47.213 |

## Prepared versus full-throttle

| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| level | easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| level | medium | 0.558 | 0.321 | 0.237 | 1 | 1 | 0 |
| level | sharp | 0.932 | 0.932 | 0 | 0.594 | 0.552 | -0.042 |
| downhill | easy | 0.295 | 0.278 | 0.017 | 1 | 1 | 0 |
| downhill | medium | 0.558 | 0.558 | 0 | 1 | 1 | 0 |
| downhill | sharp | 0.932 | 0.932 | 0 | 0.59 | 0.606 | 0.016 |

Line retention is `1 - outward excursion / available road width`. Higher is better.

## Corner-only loss ordering

| slope | easy | medium | sharp |
| --- | ---: | ---: | ---: |
| level | 1.478% | 4.946% | 15.163% |
| downhill | 0% | 0% | 0.128% |

## Fixed Bugak segment relationships

| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| medium | 0.558 | 0.438 | 0.12 | 0.923 | 1 | 0.077 |
| sharp | 0.932 | 0.932 | 0 | 0.603 | 0.585 | -0.018 |

## Deferred manual approval

- [ ] level/left
- [ ] downhill/right
- [ ] sharp S-bend


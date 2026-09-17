# Apex Seoul HND-6 Handling Relationship QA

Generated: 2026-09-17T04:05:33.617Z

Automated relationship status: **PASS**

Manual driving approval: **deferred-by-user**

> This report approves the deterministic relationship gates only. It does not approve final driving feel.

## Relationship checks

| check | pass | target | value |
| --- | --- | --- | --- |
| source.cornerDemandPass | yes | true | true |
| source.understeerVisualPass | yes | true | true |
| control.straightExitSpeedStable | yes | <= 0.05km/h versus v5 limiter straight controls | {"comparedRows":24,"maxExitSpeedDeltaKmh":0} |
| control.zeroTo100Stable | yes | <= 0.05s versus engine v5 and within 7.8~8.3s | {"currentSec":8.15,"deltaSec":0,"engineV5Sec":8.15} |
| control.sixtyKmhStable | yes | <= 0.05s versus engine v5, same gear, and within 3.5~5.0s | {"current":{"gear":2,"rpm":5470,"timeSec":4.083},"deltaSec":0,"engineV5":{"gear":2,"rpm":5470,"timeSec":4.083}} |
| control.drivetrainIdentityStable | yes | limiter-approved gear ratios/final drive/tire circumference match engine v5 | {"finalDrive":4.1,"gearRatios":[3.626,2.188,1.541,1.213,1,0.97],"tireCircumferenceM":1.964} |
| relation.gripAccidentalDriftNearZero | yes | <= 0.01 across synthetic and fixed Bugak grip scenarios | 0 |
| relation.hr3hDirectOverspeedTranslationRemoved | yes | 0 | 0 |
| relation.hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 25.298 |

## Prepared versus full-throttle

| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| level | easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| level | medium | 0.558 | 0.464 | 0.094 | 1 | 1 | 0 |
| level | sharp | 0.932 | 0.932 | 0 | 0.632 | 0.671 | 0.039 |
| downhill | easy | 0.295 | 0.283 | 0.012 | 1 | 1 | 0 |
| downhill | medium | 0.558 | 0.558 | 0 | 1 | 1 | 0 |
| downhill | sharp | 0.932 | 0.932 | 0 | 0.631 | 0.642 | 0.011 |

Line retention is `1 - outward excursion / available road width`. Higher is better.

## Corner-only loss ordering

| slope | easy | medium | sharp |
| --- | ---: | ---: | ---: |
| level | 0.557% | 0.5% | 7.602% |
| downhill | 0% | 0% | 0.215% |

## Fixed Bugak segment relationships

| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 0.295 | 0 | 0.295 | 1 | 1 | 0 |
| medium | 0.558 | 0.536 | 0.022 | 1 | 1 | 0 |
| sharp | 0.932 | 0.932 | 0 | 0.647 | 0.686 | 0.039 |

## Deferred manual approval

- [ ] level/left
- [ ] downhill/right
- [ ] sharp S-bend


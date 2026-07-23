# Apex Seoul HND-6 Handling Relationship QA

Generated: 2026-07-23T08:41:34.310Z

Automated relationship status: **PASS**

Manual driving approval: **deferred-by-user**

> This report approves the deterministic relationship gates only. It does not approve final driving feel.

## Relationship checks

| check | pass | target | value |
| --- | --- | --- | --- |
| source.cornerDemandPass | yes | true | true |
| source.understeerVisualPass | yes | true | true |
| relation.preparedUndersteerBelowFull | yes | brake-prepared mean understeer relief > 0 for every grade/slope | {"grade":"easy","slopeId":"level","understeerRelief":0.295}, {"grade":"medium","slopeId":"level","understeerRelief":0.067}, {"grade":"sharp","slopeId":"level","understeerRelief":0.096}, {"grade":"easy","slopeId":"downhill","understeerRelief":0.014}, {"grade":"medium","slopeId":"downhill","understeerRelief":0.012}, {"grade":"sharp","slopeId":"downhill","understeerRelief":0.033} |
| relation.ch3LevelPreparedUndersteerRelief | yes | level brake-prepared mean understeer relief >= 0.02 for every grade | {"grade":"easy","understeerRelief":0.295}, {"grade":"medium","understeerRelief":0.067}, {"grade":"sharp","understeerRelief":0.096} |
| relation.preparedLineQualityAboveFull | yes | brake-prepared road-normalized line retention gain > 0 for every grade/slope | {"grade":"easy","lineRetentionGain":0.209,"slopeId":"level"}, {"grade":"medium","lineRetentionGain":0.024,"slopeId":"level"}, {"grade":"sharp","lineRetentionGain":0.034,"slopeId":"level"}, {"grade":"easy","lineRetentionGain":0.01,"slopeId":"downhill"}, {"grade":"medium","lineRetentionGain":0.025,"slopeId":"downhill"}, {"grade":"sharp","lineRetentionGain":0.024,"slopeId":"downhill"} |
| relation.ch3LevelPreparedLineQualityGain | yes | level brake-prepared road-normalized line retention gain >= 0.02 | {"grade":"easy","lineRetentionGain":0.209}, {"grade":"medium","lineRetentionGain":0.024}, {"grade":"sharp","lineRetentionGain":0.034} |
| relation.fixedBugakPreparedUndersteerBelowFull | yes | fixed Bugak segments mean understeer relief >= 0.02 | {"grade":"easy","understeerRelief":0.295}, {"grade":"medium","understeerRelief":0.049}, {"grade":"sharp","understeerRelief":0.088} |
| relation.fixedBugakPreparedLineQualityAboveFull | yes | fixed Bugak segments road-normalized line retention gain >= 0.005 | {"grade":"easy","lineRetentionGain":0.204}, {"grade":"medium","lineRetentionGain":0.019}, {"grade":"sharp","lineRetentionGain":0.029} |
| relation.cornerLossGradeOrdering | yes | sharp > medium > easy for level and downhill | {"easy":2.457,"medium":27.321,"sharp":47.293,"slopeId":"level"}, {"easy":0,"medium":21.268,"sharp":42.466,"slopeId":"downhill"} |
| relation.ch3LevelSharpLossAboveDownhill | yes | level sharp corner-only loss exceeds safety-cap downhill by >= 4.5 percentage points | 4.827 |
| control.straightExitSpeedStable | yes | <= 0.05km/h versus TSE-6 calibrated straight controls | {"comparedRows":24,"maxExitSpeedDeltaKmh":0} |
| control.zeroTo100Stable | yes | <= 0.05s versus HND-1 and within 7.8~8.3s | {"currentSec":8.1,"deltaSec":0.017,"hnd1Sec":8.117} |
| control.sixtyKmhStable | yes | <= 0.05s versus TSE-6, same gear, and within 3.5~5.0s | {"current":{"gear":2,"rpm":4961,"timeSec":4.05},"deltaSec":0,"tse6":{"gear":2,"rpm":4961,"timeSec":4.05}} |
| control.drivetrainIdentityStable | yes | gear ratios/final drive/tire circumference unchanged from HND-1 | {"finalDrive":4.1,"gearRatios":[3.626,2.188,1.541,1.213,1,0.767],"tireCircumferenceM":1.964} |
| relation.gripAccidentalDriftNearZero | yes | <= 0.01 across synthetic and fixed Bugak grip scenarios | 0 |

## Prepared versus full-throttle

| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| level | easy | 0.295 | 0 | 0.295 | 0.786 | 0.995 | 0.209 |
| level | medium | 0.443 | 0.376 | 0.067 | 0.603 | 0.627 | 0.024 |
| level | sharp | 0.549 | 0.453 | 0.096 | 0.489 | 0.523 | 0.034 |
| downhill | easy | 0.295 | 0.281 | 0.014 | 0.762 | 0.772 | 0.01 |
| downhill | medium | 0.52 | 0.508 | 0.012 | 0.489 | 0.514 | 0.025 |
| downhill | sharp | 0.687 | 0.654 | 0.033 | 0.367 | 0.391 | 0.024 |

Line retention is `1 - outward excursion / available road width`. Higher is better.

## Corner-only loss ordering

| slope | easy | medium | sharp |
| --- | ---: | ---: | ---: |
| level | 2.457% | 27.321% | 47.293% |
| downhill | 0% | 21.268% | 42.466% |

## Fixed Bugak segment relationships

| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 0.295 | 0 | 0.295 | 0.785 | 0.989 | 0.204 |
| medium | 0.444 | 0.395 | 0.049 | 0.598 | 0.617 | 0.019 |
| sharp | 0.589 | 0.501 | 0.088 | 0.481 | 0.51 | 0.029 |

## Deferred manual approval

- [ ] level/left
- [ ] downhill/right
- [ ] sharp S-bend


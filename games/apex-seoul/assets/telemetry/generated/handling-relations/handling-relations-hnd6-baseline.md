# Apex Seoul HND-6 Handling Relationship QA

Generated: 2026-07-22T05:08:29.295Z

Automated relationship status: **PASS**

Manual driving approval: **deferred-by-user**

> This report approves the deterministic relationship gates only. It does not approve final driving feel.

## Relationship checks

| check | pass | target | value |
| --- | --- | --- | --- |
| source.cornerDemandPass | yes | true | true |
| source.understeerVisualPass | yes | true | true |
| relation.preparedUndersteerBelowFull | yes | brake-prepared mean understeer relief > 0 for every grade/slope | {"grade":"easy","slopeId":"level","understeerRelief":0.295}, {"grade":"medium","slopeId":"level","understeerRelief":0.16}, {"grade":"sharp","slopeId":"level","understeerRelief":0.089}, {"grade":"easy","slopeId":"downhill","understeerRelief":0.015}, {"grade":"medium","slopeId":"downhill","understeerRelief":0.013}, {"grade":"sharp","slopeId":"downhill","understeerRelief":0.048} |
| relation.levelPreparedUndersteerRelief | yes | level brake-prepared mean understeer relief >= 0.08 for every grade | {"grade":"easy","understeerRelief":0.295}, {"grade":"medium","understeerRelief":0.16}, {"grade":"sharp","understeerRelief":0.089} |
| relation.preparedLineQualityAboveFull | yes | brake-prepared road-normalized line retention gain > 0 for every grade/slope | {"grade":"easy","lineRetentionGain":0.207,"slopeId":"level"}, {"grade":"medium","lineRetentionGain":0.184,"slopeId":"level"}, {"grade":"sharp","lineRetentionGain":0.089,"slopeId":"level"}, {"grade":"easy","lineRetentionGain":0.001,"slopeId":"downhill"}, {"grade":"medium","lineRetentionGain":0.002,"slopeId":"downhill"}, {"grade":"sharp","lineRetentionGain":0.032,"slopeId":"downhill"} |
| relation.levelPreparedLineQualityGain | yes | level brake-prepared road-normalized line retention gain >= 0.08 | {"grade":"easy","lineRetentionGain":0.207}, {"grade":"medium","lineRetentionGain":0.184}, {"grade":"sharp","lineRetentionGain":0.089} |
| relation.fixedBugakPreparedUndersteerBelowFull | yes | fixed Bugak segments mean understeer relief >= 0.02 | {"grade":"easy","understeerRelief":0.295}, {"grade":"medium","understeerRelief":0.064}, {"grade":"sharp","understeerRelief":0.078} |
| relation.fixedBugakPreparedLineQualityAboveFull | yes | fixed Bugak segments road-normalized line retention gain >= 0.005 | {"grade":"easy","lineRetentionGain":0.207}, {"grade":"medium","lineRetentionGain":0.019}, {"grade":"sharp","lineRetentionGain":0.036} |
| relation.cornerLossGradeOrdering | yes | sharp > medium > easy for level and downhill | {"easy":6.501,"medium":28.242,"sharp":47.956,"slopeId":"level"}, {"easy":0,"medium":21.44,"sharp":42.714,"slopeId":"downhill"} |
| relation.levelSharpLossAboveDownhill | yes | level sharp corner-only loss exceeds safety-cap downhill by >= 5 percentage points | 5.242 |
| control.straightExitSpeedStable | yes | <= 0.05km/h versus TSE-6 calibrated straight controls | {"comparedRows":24,"maxExitSpeedDeltaKmh":0} |
| control.zeroTo100Stable | yes | <= 0.05s versus HND-1 and within 7.8~8.3s | {"currentSec":8.1,"deltaSec":0.017,"hnd1Sec":8.117} |
| control.sixtyKmhStable | yes | <= 0.05s versus TSE-6, same gear, and within 3.5~5.0s | {"current":{"gear":2,"rpm":4961,"timeSec":4.05},"deltaSec":0,"tse6":{"gear":2,"rpm":4961,"timeSec":4.05}} |
| control.drivetrainIdentityStable | yes | gear ratios/final drive/tire circumference unchanged from HND-1 | {"finalDrive":4.1,"gearRatios":[3.626,2.188,1.541,1.213,1,0.767],"tireCircumferenceM":1.964} |
| relation.gripAccidentalDriftNearZero | yes | <= 0.01 across synthetic and fixed Bugak grip scenarios | 0 |

## Prepared versus full-throttle

| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| level | easy | 0.295 | 0 | 0.295 | 0.793 | 1 | 0.207 |
| level | medium | 0.406 | 0.246 | 0.16 | 0.647 | 0.831 | 0.184 |
| level | sharp | 0.451 | 0.362 | 0.089 | 0.546 | 0.635 | 0.089 |
| downhill | easy | 0.295 | 0.28 | 0.015 | 0.779 | 0.78 | 0.001 |
| downhill | medium | 0.51 | 0.497 | 0.013 | 0.61 | 0.612 | 0.002 |
| downhill | sharp | 0.632 | 0.584 | 0.048 | 0.442 | 0.474 | 0.032 |

Line retention is `1 - outward excursion / available road width`. Higher is better.

## Corner-only loss ordering

| slope | easy | medium | sharp |
| --- | ---: | ---: | ---: |
| level | 6.501% | 28.242% | 47.956% |
| downhill | 0% | 21.44% | 42.714% |

## Fixed Bugak segment relationships

| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 0.295 | 0 | 0.295 | 0.793 | 1 | 0.207 |
| medium | 0.456 | 0.392 | 0.064 | 0.625 | 0.644 | 0.019 |
| sharp | 0.533 | 0.455 | 0.078 | 0.519 | 0.555 | 0.036 |

## Deferred manual approval

- [ ] level/left
- [ ] downhill/right
- [ ] sharp S-bend


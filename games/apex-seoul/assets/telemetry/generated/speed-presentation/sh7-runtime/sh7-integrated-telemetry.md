# Apex Seoul SH-7 Integrated Runtime Telemetry

Generated: 2026-07-23T05:16:50.445Z

Capture validity: **PASS**

Approval: **READY**

TSE-5 runtime straight: **READY**

Manual approval: **pending**

Blocking gates: none

## Runtime runs

| run | samples | speed km/h | gear | FOV | shader max | segment/s max | grades | drift states | impacts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| straight | 700 | 0.2~225 | 1~6 | 69~74.2157° | 0.1056 | 3.1667 | straight | grip | 0 |
| grip | 90 | 113~193.6 | 4~5 | 69.3531~73.0219° | 0.1089 | 2.724 | easy/medium/sharp/straight | grip | 0 |
| drift | 80 | 134.7~191.5 | 5~5 | 69.3717~72.9981° | 0.1339 | 2.6958 | easy/medium/sharp/straight | drift/grip/recovery/setup | 0 |

## TSE-5 1× straight

- Source: `assets/telemetry/generated/speed-presentation/sh7-runtime/straight/apex-seoul-drive-2026-07-22T04-07-58-110Z_sh7-straight-tse5-1x.jsonl`
- Runtime elapsed: **0.078~126.716s** at qaTimeScale **1×**
- Slope acceleration: **3.9359~4.0189**
- 0→100 / 0→223 / 0→225: **7.561 / 37.52 / 39.383s**
- 100→175.34 / 175.34→212.687 / 212.687→223: **11.213 / 10.78 / 7.966s**
- Final envelope: **225km/h**, gear **6**, FOV **74.2157°**, shader **0.1056**, theoretical cadence **3.1667 segment/s**
- The camera z is pinned to the SH-7 straight probe, so observed motion-anchor passes are intentionally zero; theoretical segment cadence is recorded from raw speed.

## Findings

- flatStraightTopSpeedShortfall: **resolved** — `{"id":"flatStraightTopSpeedShortfall","observedKmh":225,"status":"resolved","targetKmh":225}`
- railScreenProjectionMismatch: **resolved** — `{"driftActiveGapPx":{"max":382.8621,"min":260.5679},"driftProjectionRatioError":0,"gripActiveGapPx":{"max":384.1525,"min":139.3255},"gripProjectionRatioError":0,"id":"railScreenProjectionMismatch","status":"resolved"}`
- visualRailContactMismatch: **resolved** — `{"driftRoadRatio":0.1291,"driftVisualRailRatio":0.1291,"gripRoadRatio":0.5304,"gripVisualRailRatio":0.5304,"id":"visualRailContactMismatch","status":"resolved"}`
- driftCounterExitNotObserved: **resolved** — `{"counterSteerTimer":0.749,"driftExitBurst":0.0354,"id":"driftCounterExitNotObserved","status":"resolved"}`

## Gates

| gate | blocking | pass | target | value |
| --- | --- | --- | --- | --- |
| threeRuntimeRuns | no | yes | true | true |
| straightStartsNearZeroKmh | no | yes | <= 5km/h | 0.2 |
| straightReaches225Kmh | yes | yes | >= 223km/h | 225 |
| straightNoGuardrailImpact | no | yes | 0 | 0 |
| straightUsesOneXTimeScale | yes | yes | 1 | 1 |
| straightThrottleHeld | yes | yes | 0 | 0 |
| straightRemainsStraight | yes | yes | straight | straight |
| straightNoSteering | yes | yes | <= 0.001 | {"input":0,"state":0} |
| straightNoCornerLoss | yes | yes | 0 | 0 |
| straightReachesSixthGear | yes | yes | 6 | 6 |
| straightAvoidsFuelCut | yes | yes | 0 | 0 |
| straightUsesSh7MildDownhill | yes | yes | 3.5~4.5 slope acceleration | {"max":4.0189,"min":3.9359} |
| gripCoversAllGrades | no | yes | easy, medium, sharp | easy, medium, sharp, straight |
| gripRemainsGripOnly | no | yes | grip | grip |
| gripNoGuardrailImpact | yes | yes | 0 | 0 |
| gripRailProjectionCoverage | no | yes | 90 | 90 |
| gripRailProjectionIdentity | no | yes | <= 0.0002 | 0 |
| gripRailScreenGapNonNegative | no | yes | >= -0.01px | 139.3255 |
| driftBrakeEntry | no | yes | brake | brake, none |
| driftStateCycle | no | yes | setup, drift, recovery | drift, grip, recovery, setup |
| driftCounterObserved | yes | yes | > 0s | 0.749 |
| driftExitBurstObserved | yes | yes | > 0.01 | 0.0354 |
| driftNoGuardrailImpact | yes | yes | 0 | 0 |
| driftRailProjectionCoverage | no | yes | 80 | 80 |
| driftRailProjectionIdentity | no | yes | <= 0.0002 | 0 |
| driftRailScreenGapNonNegative | no | yes | >= -0.01px | 260.5679 |
| shaderEnvelopeBounded | no | yes | <= 0.38 | {"straight":0.1056,"grip":0.1089,"drift":0.1339} |
| presentationChannelsFinite | no | yes | true | true |

Automatic capture validity does not grant manual driving approval.


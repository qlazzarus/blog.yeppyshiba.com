# Apex Seoul HR-3 Preview Grip / Residual Slip Contract

Generated: 2026-09-16T05:39:40.456Z

Status: **HR3_GAMEPLAY_CONTRACT_READY**

HR-3 samples near/far road demand, assigns normal tire yaw without lateral-position centering, and turns only the unmet yaw into persistent soft slip.

## Diagnosis

| Check | Result | Evidence |
| --- | --- | --- |
| bugak-production-track-loaded | PASS | `{"id":"bugak-ridge-downhill","length":95040,"segments":396}` |
| launch-u2-observes-multiple-strong-corners | PASS | `{"strongCornerCount":3}` |
| corner-inertia-executes-in-production-replay | PASS | `{"maxAbsCornerInertia":397.251}` |
| neutral-input-does-not-apply-position-centering | PASS | `{"maxAbsNeutralCenteringForce":0,"neutralSampleCount":4700}` |
| persistent-heading-creates-absolute-threat | PASS | `{"guardrailImpactCount":9,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"maxRelativeOutwardRoadRatio":2.005}` |
| u2-halves-first-corner-time-window | PASS | `{"durationRatio":0.5,"u1DurationSec":6.133,"u2DurationSec":3.067}` |
| u1-u2-shorter-window-retains-shoulder-threat | PASS | `{"outwardRatio":0.569,"u1MaxOutwardDelta":861.439,"u2MaxOutwardDelta":489.941}` |
| production-corner-speed-response-remains-bounded | PASS | `{"highLowInertiaRatio":0.455,"highSpeedKmh":185,"highSpeedMaxAbsCornerInertia":166.558,"lowSpeedKmh":120,"lowSpeedMaxAbsCornerInertia":366.403}` |
| trajectory-precedes-automatic-scrub | PASS | `{"cameraZ":5436.808,"outwardRoadRatio":0.174,"physicalSpeedKmh":130.412,"t":11.133,"trajectoryScrubRatio":0.01}` |
| s-curve-no-input-reaches-absolute-threat | PASS | `{"endProgressRatio":0.316,"guardrailImpactCountDelta":7,"lateralOffsetEnd":-897.008,"lateralOffsetStart":-930,"lateralSpan":1868.552,"maxAbsOffsetPavedRatio":1.34,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"vehicleHeadingErrorEnd":-0.261,"vehicleHeadingErrorStart":-0.01,"startProgressRatio":0.141,"strongCurveDirections":[-1,1]}` |
| base-and-contact-curve-mismatch-is-measurable | PASS | `{"maxAbsContactCurveDelta":0.344}` |
| preview-demand-is-spatial-not-point-curve | PASS | `{"maxAbsPreviewCurveDelta":0.208}` |
| road-yaw-demand-is-conserved | PASS | `{"maxGripFollowAuthority":0,"maxYawDecompositionError":0,"minGripFollowAuthority":0}` |
| soft-heading-response-avoids-safety-clamp | PASS | `{"maxHeadingByScenario":[{"id":"bugak-launch-u2-no-input","maxAbsVehicleHeadingError":0.845},{"id":"bugak-first-corner-185-u1-no-input","maxAbsVehicleHeadingError":0.811},{"id":"bugak-first-corner-185-u2-no-input","maxAbsVehicleHeadingError":0.984},{"id":"bugak-first-corner-120-u2-no-input","maxAbsVehicleHeadingError":0.843},{"id":"bugak-first-corner-185-u2-free-no-input","maxAbsVehicleHeadingError":0.979},{"id":"bugak-first-corner-185-u2-prepared-grip","maxAbsVehicleHeadingError":0.02}]}` |

## Gameplay approval contract

| Check | Result | Evidence |
| --- | --- | --- |
| selected-sharp-no-input-threatens-shoulder | PASS | `{"sharpCorners":[{"id":"corner-1-right","maxAbsOffsetPavedRatio":1.373,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":0.977,"maxShoulderRatio":1,"railImpactCountDelta":1},{"id":"corner-2-left","maxAbsOffsetPavedRatio":1.34,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":2.005,"maxShoulderRatio":1,"railImpactCountDelta":2},{"id":"corner-3-right","maxAbsOffsetPavedRatio":1.339,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":2.003,"maxShoulderRatio":1,"railImpactCountDelta":2}]}` |
| u2-shorter-window-still-threatens-shoulder | PASS | `{"maxShoulderRatio":1,"outwardRatio":0.569}` |
| physics-curve-matches-contact-curve | PASS | `{"maxAbsPhysicsCurveDelta":0}` |
| automatic-scrub-does-not-create-a-safe-line | PASS | `{"cornerId":null,"maxAbsOffsetPavedRatio":1.373,"maxShoulderRatio":1}` |
| prepared-grip-reduces-outward-trajectory | PASS | `{"noInputOutwardRoadRatio":0.662,"preparedOutwardRatio":0,"preparedOutwardRoadRatio":0}` |

## Deferred HR-5 metrics

- Prepared-grip exit-speed delta: -14.496km/h (final line, exit-speed and section-time approval is deferred to HR-5).

## Scenario summary

| Scenario | Scale | Fixed speed | Duration | Max offset/paved | Max offset/rail | Max heading | Max inertia | Shoulder | Impacts |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | 2 | launch | 78.333s | 1.373 | 1 | 0.845rad | 397.251u/s | 1 | 9 |
| bugak-first-corner-185-u1-no-input | 1 | 185km/h | 9.233s | 1.333 | 1 | 0.811rad | 166.558u/s | 1 | 1 |
| bugak-first-corner-185-u2-no-input | 2 | 185km/h | 4.617s | 0.994 | 0.747 | 0.984rad | 166.558u/s | 1 | 2 |
| bugak-first-corner-120-u2-no-input | 2 | 120km/h | 7.117s | 1.375 | 1 | 0.843rad | 366.403u/s | 1 | 1 |
| bugak-first-corner-185-u2-free-no-input | 2 | launch | 4.85s | 1.282 | 0.964 | 0.979rad | 242.243u/s | 1 | 2 |
| bugak-first-corner-185-u2-prepared-grip | 2 | launch | 6.667s | 0.252 | 0.19 | 0.02rad | 16.789u/s | 0 | 0 |

## Strong corner windows

| Scenario | Corner | Peak | Duration | Strong | Speed loss | Outward | Outward/road | Shoulder |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | corner-1-right | 0.66 | 4.883s | 2.183s | 36.284km/h | 859.967u | 0.977 | 1 |
| bugak-launch-u2-no-input | corner-2-left | 0.62 | 10.083s | 3.25s | 0km/h | 1791.231u | 2.005 | 1 |
| bugak-launch-u2-no-input | corner-3-right | 0.64 | 9.533s | 3.217s | 0km/h | 1790.212u | 2.003 | 1 |
| bugak-first-corner-185-u1-no-input | corner-1-right | 0.66 | 6.133s | 2.683s | 0.315km/h | 861.439u | 0.979 | 1 |
| bugak-first-corner-185-u2-no-input | corner-1-right | 0.66 | 3.067s | 1.333s | 0.001km/h | 489.941u | 0.557 | 1 |
| bugak-first-corner-120-u2-no-input | corner-1-right | 0.66 | 4.733s | 2.067s | 0.241km/h | 861.129u | 0.979 | 1 |
| bugak-first-corner-185-u2-free-no-input | corner-1-right | 0.66 | 3.133s | 1.4s | 23.883km/h | 582.146u | 0.662 | 1 |
| bugak-first-corner-185-u2-prepared-grip | corner-1-right | 0.66 | 4.65s | 2s | 1.879km/h | 0u | 0 | 0 |

## Interpretation

- Near/far road preview starts corner demand before the point curve reaches its peak and smooths curve exit.
- Passive grip yaw consumes speed- and grade-dependent road demand without pulling lateral position toward road center.
- Only residual road yaw and steering update persistent heading debt; lateral speed uses a soft tanh response instead of the old ±0.62rad clamp.
- Neutral steering applies exactly zero lateral-position centering force; velocity damping can settle motion without seeking road center.
- Selected overspeed sharp corners still threaten shoulder/rail when ignored.
- Prepared lift and heading-aware turn-in avoid shoulder/rail; comparative exit-speed and section-time tuning remain an HR-5 decision.


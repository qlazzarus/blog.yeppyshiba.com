# Apex Seoul HR-3 Preview Grip / Residual Slip Contract

Generated: 2026-07-23T10:57:53.401Z

Status: **HR3_GAMEPLAY_CONTRACT_READY**

HR-3 samples near/far road demand, assigns normal tire yaw without lateral-position centering, and turns only the unmet yaw into persistent soft slip.

## Diagnosis

| Check | Result | Evidence |
| --- | --- | --- |
| bugak-production-track-loaded | PASS | `{"id":"bugak-ridge-downhill","length":83520,"segments":348}` |
| launch-u2-observes-multiple-strong-corners | PASS | `{"strongCornerCount":3}` |
| corner-inertia-executes-in-production-replay | PASS | `{"maxAbsCornerInertia":283.125}` |
| neutral-input-does-not-apply-position-centering | PASS | `{"maxAbsNeutralCenteringForce":0,"neutralSampleCount":2332}` |
| persistent-heading-creates-absolute-threat | PASS | `{"guardrailImpactCount":3,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"maxRelativeOutwardRoadRatio":0.733}` |
| u2-halves-first-corner-time-window | PASS | `{"durationRatio":0.5,"u1DurationSec":6.133,"u2DurationSec":3.067}` |
| u1-u2-spatial-risk-is-stable | PASS | `{"outwardRatio":1.001,"u1MaxOutwardDelta":792.794,"u2MaxOutwardDelta":793.821}` |
| production-corner-risk-scales-nonlinearly-with-speed | PASS | `{"highLowInertiaRatio":1.977,"highSpeedKmh":185,"highSpeedMaxAbsCornerInertia":436.186,"lowSpeedKmh":120,"lowSpeedMaxAbsCornerInertia":220.614}` |
| trajectory-precedes-automatic-scrub | PASS | `{"cameraZ":6647.003,"outwardRoadRatio":0.177,"physicalSpeedKmh":143.545,"t":12.4,"trajectoryScrubRatio":0.019}` |
| s-curve-no-input-reaches-absolute-threat | PASS | `{"endProgressRatio":0.359,"guardrailImpactCountDelta":1,"lateralOffsetEnd":-197.225,"lateralOffsetStart":-904.633,"lateralSpan":1390.342,"maxAbsOffsetPavedRatio":1.379,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"vehicleHeadingErrorEnd":-0.259,"vehicleHeadingErrorStart":-0.006,"startProgressRatio":0.16,"strongCurveDirections":[-1,1]}` |
| base-and-contact-curve-mismatch-is-measurable | PASS | `{"maxAbsContactCurveDelta":0.349}` |
| preview-demand-is-spatial-not-point-curve | PASS | `{"maxAbsPreviewCurveDelta":0.236}` |
| road-yaw-demand-is-conserved | PASS | `{"maxGripFollowAuthority":0.98,"maxYawDecompositionError":0,"minGripFollowAuthority":0.302}` |
| soft-heading-response-avoids-safety-clamp | PASS | `{"maxHeadingByScenario":[{"id":"bugak-launch-u2-no-input","maxAbsVehicleHeadingError":0.521},{"id":"bugak-first-corner-185-u1-no-input","maxAbsVehicleHeadingError":0.714},{"id":"bugak-first-corner-185-u2-no-input","maxAbsVehicleHeadingError":0.716},{"id":"bugak-first-corner-120-u2-no-input","maxAbsVehicleHeadingError":0.394},{"id":"bugak-first-corner-185-u2-free-no-input","maxAbsVehicleHeadingError":0.689},{"id":"bugak-first-corner-185-u2-prepared-grip","maxAbsVehicleHeadingError":0.33}]}` |

## Gameplay approval contract

| Check | Result | Evidence |
| --- | --- | --- |
| selected-sharp-no-input-threatens-shoulder | PASS | `{"sharpCorners":[{"id":"corner-1-right","maxAbsOffsetPavedRatio":0.981,"maxAbsOffsetRoadRatio":0.736,"maxOutwardRoadRatio":0.733,"maxShoulderRatio":0,"railImpactCountDelta":0},{"id":"corner-2-left","maxAbsOffsetPavedRatio":1.379,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":0.662,"maxShoulderRatio":1,"railImpactCountDelta":0},{"id":"corner-3-right","maxAbsOffsetPavedRatio":0.821,"maxAbsOffsetRoadRatio":0.596,"maxOutwardRoadRatio":0.655,"maxShoulderRatio":0,"railImpactCountDelta":0}]}` |
| u1-u2-risk-relationship-is-preserved | PASS | `{"outwardRatio":1.001}` |
| physics-curve-matches-contact-curve | PASS | `{"maxAbsPhysicsCurveDelta":0}` |
| automatic-scrub-does-not-create-a-safe-line | PASS | `{"cornerId":null,"maxAbsOffsetPavedRatio":1.379,"maxShoulderRatio":1}` |
| prepared-grip-reduces-outward-trajectory | PASS | `{"noInputOutwardRoadRatio":0.901,"preparedOutwardRatio":0.596,"preparedOutwardRoadRatio":0.537}` |
| prepared-grip-earns-higher-exit-speed | PASS | `{"exitSpeedAdvantageKmh":17.609,"noInputSectionEndSpeedKmh":121.225,"preparedSectionEndSpeedKmh":138.834}` |

## Scenario summary

| Scenario | Scale | Fixed speed | Duration | Max offset/paved | Max offset/rail | Max heading | Max inertia | Shoulder | Impacts |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | 2 | launch | 38.867s | 1.379 | 1 | 0.521rad | 283.125u/s | 1 | 3 |
| bugak-first-corner-185-u1-no-input | 1 | 185km/h | 9.233s | 1.333 | 1 | 0.714rad | 217.889u/s | 1 | 2 |
| bugak-first-corner-185-u2-no-input | 2 | 185km/h | 4.617s | 1.333 | 1 | 0.716rad | 436.186u/s | 1 | 2 |
| bugak-first-corner-120-u2-no-input | 2 | 120km/h | 7.117s | 1.316 | 0.99 | 0.394rad | 220.614u/s | 0.958 | 0 |
| bugak-first-corner-185-u2-free-no-input | 2 | launch | 5.45s | 1.333 | 1 | 0.689rad | 360.179u/s | 1 | 2 |
| bugak-first-corner-185-u2-prepared-grip | 2 | launch | 5.417s | 0.718 | 0.524 | 0.33rad | 231.198u/s | 0 | 0 |

## Strong corner windows

| Scenario | Corner | Peak | Duration | Strong | Speed loss | Outward | Outward/road | Shoulder |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | corner-1-right | 0.66 | 4.217s | 1.8s | 0km/h | 644.946u | 0.733 | 0 |
| bugak-launch-u2-no-input | corner-2-left | 0.62 | 7.583s | 2.7s | 0km/h | 594.096u | 0.662 | 1 |
| bugak-launch-u2-no-input | corner-3-right | 0.64 | 4.333s | 1.467s | 0km/h | 587.185u | 0.655 | 0 |
| bugak-first-corner-185-u1-no-input | corner-1-right | 0.66 | 6.133s | 2.683s | 0.035km/h | 792.794u | 0.901 | 0.611 |
| bugak-first-corner-185-u2-no-input | corner-1-right | 0.66 | 3.067s | 1.333s | 0.035km/h | 793.821u | 0.902 | 0.616 |
| bugak-first-corner-120-u2-no-input | corner-1-right | 0.66 | 4.733s | 2.067s | 0km/h | 568.338u | 0.646 | 0 |
| bugak-first-corner-185-u2-free-no-input | corner-1-right | 0.66 | 3.45s | 1.65s | 52.727km/h | 792.745u | 0.901 | 0.611 |
| bugak-first-corner-185-u2-prepared-grip | corner-1-right | 0.66 | 3.533s | 1.667s | 48.945km/h | 442.556u | 0.537 | 0 |

## Interpretation

- Near/far road preview starts corner demand before the point curve reaches its peak and smooths curve exit.
- Passive grip yaw consumes speed- and grade-dependent road demand without pulling lateral position toward road center.
- Only residual road yaw and steering update persistent heading debt; lateral speed uses a soft tanh response instead of the old ±0.62rad clamp.
- Neutral steering applies exactly zero lateral-position centering force; velocity damping can settle motion without seeking road center.
- Selected overspeed sharp corners still threaten shoulder/rail when ignored.
- Prepared lift and heading-aware turn-in avoid shoulder/rail and retain more speed by the end of the same section.


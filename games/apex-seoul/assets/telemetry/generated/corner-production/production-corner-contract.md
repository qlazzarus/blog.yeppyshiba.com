# Apex Seoul HR-3 Preview Grip / Residual Slip Contract

Generated: 2026-07-24T05:24:06.797Z

Status: **HR3_GAMEPLAY_CONTRACT_READY**

HR-3 samples near/far road demand, assigns normal tire yaw without lateral-position centering, and turns only the unmet yaw into persistent soft slip.

## Diagnosis

| Check | Result | Evidence |
| --- | --- | --- |
| bugak-production-track-loaded | PASS | `{"id":"bugak-ridge-downhill","length":83520,"segments":348}` |
| launch-u2-observes-multiple-strong-corners | PASS | `{"strongCornerCount":3}` |
| corner-inertia-executes-in-production-replay | PASS | `{"maxAbsCornerInertia":527.588}` |
| neutral-input-does-not-apply-position-centering | PASS | `{"maxAbsNeutralCenteringForce":0,"neutralSampleCount":3990}` |
| persistent-heading-creates-absolute-threat | PASS | `{"guardrailImpactCount":14,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"maxRelativeOutwardRoadRatio":1.953}` |
| u2-halves-first-corner-time-window | PASS | `{"durationRatio":0.5,"u1DurationSec":6.133,"u2DurationSec":3.067}` |
| u1-u2-spatial-risk-is-stable | PASS | `{"outwardRatio":0.999,"u1MaxOutwardDelta":861.439,"u2MaxOutwardDelta":860.618}` |
| production-corner-risk-scales-nonlinearly-with-speed | PASS | `{"highLowInertiaRatio":1.572,"highSpeedKmh":185,"highSpeedMaxAbsCornerInertia":933.288,"lowSpeedKmh":120,"lowSpeedMaxAbsCornerInertia":593.726}` |
| trajectory-precedes-automatic-scrub | PASS | `{"cameraZ":5437.713,"outwardRoadRatio":0.174,"physicalSpeedKmh":130.624,"t":11.1,"trajectoryScrubRatio":0.011}` |
| s-curve-no-input-reaches-absolute-threat | PASS | `{"endProgressRatio":0.359,"guardrailImpactCountDelta":12,"lateralOffsetEnd":-846.058,"lateralOffsetStart":-925.914,"lateralSpan":1862.471,"maxAbsOffsetPavedRatio":1.34,"maxAbsOffsetRoadRatio":1,"maxShoulderRatio":1,"vehicleHeadingErrorEnd":-0.06,"vehicleHeadingErrorStart":-0.008,"startProgressRatio":0.16,"strongCurveDirections":[-1,1]}` |
| base-and-contact-curve-mismatch-is-measurable | PASS | `{"maxAbsContactCurveDelta":0.35}` |
| preview-demand-is-spatial-not-point-curve | PASS | `{"maxAbsPreviewCurveDelta":0.208}` |
| road-yaw-demand-is-conserved | PASS | `{"maxGripFollowAuthority":0,"maxYawDecompositionError":0,"minGripFollowAuthority":0}` |
| soft-heading-response-avoids-safety-clamp | PASS | `{"maxHeadingByScenario":[{"id":"bugak-launch-u2-no-input","maxAbsVehicleHeadingError":0.84},{"id":"bugak-first-corner-185-u1-no-input","maxAbsVehicleHeadingError":0.806},{"id":"bugak-first-corner-185-u2-no-input","maxAbsVehicleHeadingError":0.843},{"id":"bugak-first-corner-120-u2-no-input","maxAbsVehicleHeadingError":0.82},{"id":"bugak-first-corner-185-u2-free-no-input","maxAbsVehicleHeadingError":0.829},{"id":"bugak-first-corner-185-u2-prepared-grip","maxAbsVehicleHeadingError":0.035}]}` |

## Gameplay approval contract

| Check | Result | Evidence |
| --- | --- | --- |
| selected-sharp-no-input-threatens-shoulder | PASS | `{"sharpCorners":[{"id":"corner-1-right","maxAbsOffsetPavedRatio":1.376,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":0.976,"maxShoulderRatio":1,"railImpactCountDelta":1},{"id":"corner-2-left","maxAbsOffsetPavedRatio":1.34,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":1.953,"maxShoulderRatio":1,"railImpactCountDelta":3},{"id":"corner-3-right","maxAbsOffsetPavedRatio":1.339,"maxAbsOffsetRoadRatio":1,"maxOutwardRoadRatio":1.94,"maxShoulderRatio":1,"railImpactCountDelta":3}]}` |
| u1-u2-risk-relationship-is-preserved | PASS | `{"outwardRatio":0.999}` |
| physics-curve-matches-contact-curve | PASS | `{"maxAbsPhysicsCurveDelta":0}` |
| automatic-scrub-does-not-create-a-safe-line | PASS | `{"cornerId":null,"maxAbsOffsetPavedRatio":1.376,"maxShoulderRatio":1}` |
| prepared-grip-reduces-outward-trajectory | PASS | `{"noInputOutwardRoadRatio":0.977,"preparedOutwardRatio":0.002,"preparedOutwardRoadRatio":0.002}` |
| prepared-grip-earns-higher-exit-speed | PASS | `{"exitSpeedAdvantageKmh":39.369,"noInputSectionEndSpeedKmh":95.251,"preparedSectionEndSpeedKmh":134.62}` |

## Scenario summary

| Scenario | Scale | Fixed speed | Duration | Max offset/paved | Max offset/rail | Max heading | Max inertia | Shoulder | Impacts |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | 2 | launch | 66.5s | 1.376 | 1 | 0.84rad | 527.588u/s | 1 | 14 |
| bugak-first-corner-185-u1-no-input | 1 | 185km/h | 9.233s | 1.375 | 1 | 0.806rad | 450.44u/s | 1 | 1 |
| bugak-first-corner-185-u2-no-input | 2 | 185km/h | 4.617s | 1.375 | 1 | 0.843rad | 933.288u/s | 1 | 1 |
| bugak-first-corner-120-u2-no-input | 2 | 120km/h | 7.117s | 1.376 | 1 | 0.82rad | 593.726u/s | 1 | 1 |
| bugak-first-corner-185-u2-free-no-input | 2 | launch | 5.717s | 1.375 | 1 | 0.829rad | 716.73u/s | 1 | 1 |
| bugak-first-corner-185-u2-prepared-grip | 2 | launch | 6.683s | 0.093 | 0.07 | 0.035rad | 29.269u/s | 0 | 0 |

## Strong corner windows

| Scenario | Corner | Peak | Duration | Strong | Speed loss | Outward | Outward/road | Shoulder |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugak-launch-u2-no-input | corner-1-right | 0.66 | 4.917s | 2.217s | 38.675km/h | 859.025u | 0.976 | 1 |
| bugak-launch-u2-no-input | corner-2-left | 0.62 | 9.817s | 3.25s | 0km/h | 1754.004u | 1.953 | 1 |
| bugak-launch-u2-no-input | corner-3-right | 0.64 | 9.467s | 3.417s | 0km/h | 1739.346u | 1.94 | 1 |
| bugak-first-corner-185-u1-no-input | corner-1-right | 0.66 | 6.133s | 2.683s | 0.315km/h | 861.439u | 0.979 | 1 |
| bugak-first-corner-185-u2-no-input | corner-1-right | 0.66 | 3.067s | 1.333s | 0.315km/h | 860.618u | 0.978 | 1 |
| bugak-first-corner-120-u2-no-input | corner-1-right | 0.66 | 4.733s | 2.067s | 0.241km/h | 861.129u | 0.979 | 1 |
| bugak-first-corner-185-u2-free-no-input | corner-1-right | 0.66 | 3.5s | 1.633s | 66.008km/h | 860.081u | 0.977 | 1 |
| bugak-first-corner-185-u2-prepared-grip | corner-1-right | 0.66 | 4.667s | 2.017s | 2.608km/h | 2.274u | 0.002 | 0 |

## Interpretation

- Near/far road preview starts corner demand before the point curve reaches its peak and smooths curve exit.
- Passive grip yaw consumes speed- and grade-dependent road demand without pulling lateral position toward road center.
- Only residual road yaw and steering update persistent heading debt; lateral speed uses a soft tanh response instead of the old ±0.62rad clamp.
- Neutral steering applies exactly zero lateral-position centering force; velocity damping can settle motion without seeking road center.
- Selected overspeed sharp corners still threaten shoulder/rail when ignored.
- Prepared lift and heading-aware turn-in avoid shoulder/rail and retain more speed by the end of the same section.


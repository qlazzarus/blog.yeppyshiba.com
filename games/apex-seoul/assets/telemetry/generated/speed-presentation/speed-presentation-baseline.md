# Apex Seoul Speed Presentation Baseline

Generated: 2026-07-31T08:48:15.481Z

Status: **PASS**

Snapshot: **current**

This report records the current `km/h → world unit → screen cue` relationships and their automated gates.

## Presentation sweep

| km/h | unit/s | segment/s | straight lane/s | corner lane/s | corner reflector/s | right post/s | FOV bonus | base cue | downhill cue | throttle peak | time scale |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0° | 0 | 0 | 0 | 0.4 |
| 30 | 101.333 | 0.422 | 0.422 | 0.844 | 0.844 | 0.141 | 0.39° | 0 | 0 | 0 | 0.64 |
| 60 | 202.667 | 0.844 | 0.844 | 1.689 | 1.689 | 0.281 | 0.78° | 0 | 0 | 0 | 0.88 |
| 90 | 304 | 1.267 | 1.267 | 2.533 | 2.533 | 0.422 | 1.555° | 0.005 | 0.005 | 0 | 1.12 |
| 110 | 371.556 | 1.548 | 1.548 | 3.096 | 3.096 | 0.516 | 1.976° | 0.019 | 0.019 | 0.022 | 1.28 |
| 130 | 439.111 | 1.83 | 1.83 | 3.659 | 3.659 | 0.61 | 2.496° | 0.043 | 0.043 | 0.051 | 1.44 |
| 150 | 506.667 | 2.111 | 2.111 | 4.222 | 4.222 | 0.704 | 3.016° | 0.067 | 0.067 | 0.079 | 1.6 |
| 170 | 574.222 | 2.393 | 2.393 | 4.785 | 4.785 | 0.798 | 3.552° | 0.096 | 0.096 | 0.113 | 1.76 |
| 185 | 624.889 | 2.604 | 2.604 | 5.207 | 5.207 | 0.868 | 3.9° | 0.115 | 0.115 | 0.135 | 1.88 |
| 200 | 675.556 | 2.815 | 2.815 | 5.63 | 5.63 | 0.938 | 4.439° | 0.144 | 0.144 | 0.169 | 2 |
| 210 | 709.333 | 2.956 | 2.956 | 5.911 | 5.911 | 0.985 | 4.732° | 0.16 | 0.16 | 0.187 | 2.08 |
| 225 | 760 | 3.167 | 3.167 | 6.333 | 6.333 | 1.056 | 5.2° | 0.16 | 0.16 | 0.187 | 2.2 |

## Straight steering response

| km/h | force | grip cap | lateral cap | yaw scale | tap offset | hold offset | hold velocity | hold pose | release offset 1s |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0.75 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| 30 | 0.94 | 1 | 110 | 1 | 3.454 | 17.467 | 18.206 | 0.552 | 25.577 |
| 60 | 1 | 1 | 220 | 1 | 16.13 | 66.871 | 53.799 | 1 | 134.797 |
| 90 | 0.974 | 1 | 210.28 | 1 | 25.989 | 90.982 | 52.405 | 1 | 231.574 |
| 110 | 0.96 | 1 | 205 | 1 | 34.819 | 112.443 | 51.647 | 1 | 315.259 |
| 130 | 0.911 | 0.927 | 183.775 | 0.976 | 41.91 | 127.171 | 45.469 | 0.91 | 384.372 |
| 150 | 0.87 | 0.87 | 165.32 | 0.954 | 49.488 | 145.135 | 40.683 | 0.834 | 454.223 |
| 170 | 0.78 | 0.78 | 125 | 0.9 | 54.014 | 154.712 | 32.731 | 0.706 | 390.896 |
| 185 | 0.68 | 0.72 | 90 | 0.86 | 55.229 | 136.31 | 26.339 | 0.622 | 307.131 |
| 200 | 0.68 | 0.72 | 90 | 0.86 | 63.902 | 142.669 | 26.339 | 0.622 | 313.49 |
| 210 | 0.68 | 0.72 | 90 | 0.86 | 70.057 | 146.188 | 26.339 | 0.622 | 317.009 |
| 225 | 0.68 | 0.72 | 90 | 0.86 | 79.849 | 150.646 | 26.339 | 0.622 | 321.467 |

## Findings retained for the next stages

- nearFieldCadenceBelowTarget: **resolved** — {"id":"nearFieldCadenceBelowTarget","status":"resolved","targetPassesPerSec":[3,4],"value":3.166667}
- topBandSpeedCueSaturation: **resolved** — {"baseCueDelta":0,"fromKmh":210,"id":"topBandSpeedCueSaturation","status":"resolved","toKmh":225}
- topBandFovCompression: **resolved** — {"deltaDegrees":1.3,"fromKmh":185,"id":"topBandFovCompression","status":"resolved","toKmh":225}
- shaderEventOverlapCap: **resolved** — {"id":"shaderEventOverlapCap","maxIntensity":0.38,"status":"resolved"}
- topBandHandlingPlateau: **observed** — {"id":"topBandHandlingPlateau","profileDelta":0,"status":"observed"}

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| sampleCount | yes | 12 | 12 |
| inverseIdentityErrorKmhMax | yes | 0, 0.000001 | 0 |
| cadenceIdentityErrorMax | yes | 0, 0.000001 | 0 |
| cssCornerLaneCadenceAt150Kmh | yes | 4, 6 | 4.222222 |
| cssCornerReflectorCadenceAt185Kmh | yes | 4, 6 | 5.207407 |
| fovIdentityErrorMax | yes | 0, 0.00001 | 0 |
| sh4SteadyShaderMax | yes | 0, 0.16 | 0.16 |
| sh4EventShaderMax | yes | 0, 0.38 | 0.38 |
| sh4SpeedFovBonusMax | yes | 4, 5.5 | 5.2 |
| sh4TopBandFovDelta | yes | 1.2, 1.5 | 1.3 |
| sh4ThrottleImpulseMax | yes | 0, 0.8 | 0.748705 |
| sh4DriftExitImpulseMax | yes | 0, 1.2 | 1.141157 |
| sh4TopBandShaderHoldDelta | yes | 0, 0.000001 | 0 |
| worldUnitProgression | yes | strictly increasing above 0km/h | 0, 101.333333, 202.666667, 304, 371.555556, 439.111111, 506.666667, 574.222222, 624.888889, 675.555556, 709.333333, 760 |
| speedCueEnvelopeBounds | yes | all cue channels remain within runtime maxima | true |
| sh2SpeedBandsExplicitKmh | yes | 80, 110, 150, 185, 210, 225 | 80, 110, 150, 185, 210, 225 |
| sh2BelowStartBase | yes | 0, 0.000001 | 0 |
| sh2BandProgression | yes | 110 < 150 < 185 < 210km/h base cue | 0.0192, 0.0672, 0.1152, 0.16 |
| sh2CueBandIdentity | yes | runtime km/h envelope | all sampled rows match |
| sh2TopSpeedHoldDelta | yes | 0, 0.000001 | 0 |
| laneDashRatiosValid | yes | 0 <= start, 0 < length, start + length <= 1 | {"length":0.34,"start":0.16} |
| sh3LaneCadence210 | yes | 2.9, 4 | 2.955556 |
| sh3LaneCadence225 | yes | 3, 4 | 3.166667 |
| sh3ReflectorCadence225 | yes | 3, 4 | 3.166667 |
| stationaryHoldOffset | yes | 0, 0.001 | 0 |
| stationaryHoldPose | yes | 0, 0.001 | 0 |
| handlingSamplesFinite | yes | true | true |


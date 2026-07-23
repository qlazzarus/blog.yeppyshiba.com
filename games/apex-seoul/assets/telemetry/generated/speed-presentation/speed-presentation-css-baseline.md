# Apex Seoul Speed Presentation Baseline

Generated: 2026-07-22T11:36:11.512Z

Status: **PASS**

Snapshot: **css**

This report records the current `km/h → world unit → screen cue` relationships and their automated gates.

## Presentation sweep

| km/h | unit/s | segment/s | straight lane/s | corner lane/s | corner reflector/s | right post/s | FOV bonus | base cue | downhill cue | throttle peak | time scale |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0° | 0 | 0 | 0 | 0.4 |
| 30 | 101.333 | 0.422 | 0.422 | 0.844 | 0.844 | 0.141 | 0.39° | 0 | 0 | 0 | 0.64 |
| 60 | 202.667 | 0.844 | 0.844 | 1.689 | 1.689 | 0.281 | 0.78° | 0 | 0 | 0 | 0.88 |
| 90 | 304 | 1.267 | 1.267 | 2.533 | 2.533 | 0.422 | 1.555° | 0.006 | 0.01 | 0 | 1.12 |
| 110 | 371.556 | 1.548 | 1.548 | 3.096 | 3.096 | 0.516 | 1.976° | 0.012 | 0.019 | 0.022 | 1.28 |
| 130 | 439.111 | 1.83 | 1.83 | 3.659 | 3.659 | 0.61 | 2.496° | 0.027 | 0.043 | 0.051 | 1.44 |
| 150 | 506.667 | 2.111 | 2.111 | 4.222 | 4.222 | 0.704 | 3.016° | 0.042 | 0.067 | 0.079 | 1.6 |
| 170 | 574.222 | 2.393 | 2.393 | 4.785 | 4.785 | 0.798 | 3.552° | 0.06 | 0.096 | 0.113 | 1.76 |
| 185 | 624.889 | 2.604 | 2.604 | 5.207 | 5.207 | 0.868 | 3.9° | 0.072 | 0.115 | 0.135 | 1.88 |
| 200 | 675.556 | 2.815 | 2.815 | 5.63 | 5.63 | 0.938 | 4.439° | 0.09 | 0.144 | 0.169 | 2 |
| 210 | 709.333 | 2.956 | 2.956 | 5.911 | 5.911 | 0.985 | 4.732° | 0.1 | 0.16 | 0.187 | 2.08 |
| 225 | 760 | 3.167 | 3.167 | 6.333 | 6.333 | 1.056 | 5.2° | 0.1 | 0.16 | 0.187 | 2.2 |

## Straight steering response

| km/h | force | grip cap | lateral cap | yaw scale | tap offset | hold offset | hold velocity | hold pose | release offset 1s |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0.75 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| 30 | 0.94 | 1 | 110 | 1 | 8.771 | 53.328 | 56.505 | 0.557 | 53.064 |
| 60 | 1 | 1 | 220 | 1 | 25.025 | 149.706 | 148.942 | 1 | 141.363 |
| 90 | 0.974 | 1 | 210.28 | 1 | 24.376 | 145.826 | 145.082 | 1 | 137.302 |
| 110 | 0.96 | 1 | 205 | 1 | 24.024 | 143.718 | 142.984 | 1 | 135.095 |
| 130 | 0.911 | 0.927 | 183.775 | 0.976 | 21.212 | 127.17 | 127.33 | 0.922 | 119.061 |
| 150 | 0.87 | 0.87 | 165.32 | 0.954 | 19.029 | 114.26 | 115.002 | 0.845 | 106.655 |
| 170 | 0.78 | 0.78 | 125 | 0.9 | 15.382 | 92.621 | 94.096 | 0.714 | 86.436 |
| 185 | 0.68 | 0.72 | 90 | 0.86 | 12.447 | 75.163 | 77.155 | 0.629 | 70.746 |
| 200 | 0.68 | 0.72 | 90 | 0.86 | 12.447 | 75.163 | 77.155 | 0.629 | 70.746 |
| 210 | 0.68 | 0.72 | 90 | 0.86 | 12.447 | 75.163 | 77.155 | 0.629 | 70.746 |
| 225 | 0.68 | 0.72 | 90 | 0.86 | 12.447 | 75.163 | 77.155 | 0.629 | 70.746 |

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
| sh4SteadyShaderMax | yes | 0, 0.12 | 0.1 |
| sh4EventShaderMax | yes | 0, 0.38 | 0.38 |
| sh4SpeedFovBonusMax | yes | 4, 5.5 | 5.2 |
| sh4TopBandFovDelta | yes | 1.2, 1.5 | 1.3 |
| sh4ThrottleImpulseMax | yes | 0, 0.8 | 0.748705 |
| sh4DriftExitImpulseMax | yes | 0, 1.2 | 1.141157 |
| sh4TopBandShaderHoldDelta | yes | 0, 0.000001 | 0 |
| worldUnitProgression | yes | strictly increasing above 0km/h | 0, 101.333333, 202.666667, 304, 371.555556, 439.111111, 506.666667, 574.222222, 624.888889, 675.555556, 709.333333, 760 |
| speedCueEnvelopeBounds | yes | all cue channels remain within runtime maxima | true |
| sh2SpeedBandsExplicitKmh | yes | 70, 110, 150, 185, 210, 225 | 70, 110, 150, 185, 210, 225 |
| sh2BelowStartBase | yes | 0, 0.000001 | 0 |
| sh2BandProgression | yes | 110 < 150 < 185 < 210km/h base cue | 0.012, 0.042, 0.072, 0.1 |
| sh2CueBandIdentity | yes | runtime km/h envelope | all sampled rows match |
| sh2TopSpeedHoldDelta | yes | 0, 0.000001 | 0 |
| laneDashRatiosValid | yes | 0 <= start, 0 < length, start + length <= 1 | {"length":0.34,"start":0.16} |
| sh3LaneCadence210 | yes | 2.9, 4 | 2.955556 |
| sh3LaneCadence225 | yes | 3, 4 | 3.166667 |
| sh3ReflectorCadence225 | yes | 3, 4 | 3.166667 |
| stationaryHoldOffset | yes | 0, 0.001 | 0 |
| stationaryHoldPose | yes | 0, 0.001 | 0 |
| handlingSamplesFinite | yes | true | true |


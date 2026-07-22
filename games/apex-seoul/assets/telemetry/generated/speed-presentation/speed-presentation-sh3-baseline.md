# Apex Seoul Speed Presentation Baseline

Generated: 2026-07-22T01:36:09.860Z

Status: **PASS**

Snapshot: **sh3**

This baseline changes no presentation or handling constants. It records the current `km/h → world unit → screen cue` relationships.

## Presentation sweep

| km/h | unit/s | segment/s | lane/s | reflector max/s | right post/s | FOV bonus | base cue | downhill cue | throttle peak | time scale |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 | 0 | 0 | 0° | 0 | 0 | 0 | 0.4 |
| 30 | 101.333 | 0.422 | 0.422 | 0.422 | 0.141 | 0.253° | 0 | 0 | 0 | 0.64 |
| 60 | 202.667 | 0.844 | 0.844 | 0.844 | 0.281 | 0.912° | 0 | 0 | 0 | 0.88 |
| 90 | 304 | 1.267 | 1.267 | 1.267 | 0.422 | 1.83° | 0.001 | 0.002 | 0 | 1.12 |
| 110 | 371.556 | 1.548 | 1.548 | 1.548 | 0.516 | 2.513° | 0.011 | 0.017 | 0.02 | 1.28 |
| 130 | 439.111 | 1.83 | 1.83 | 1.83 | 0.61 | 3.202° | 0.027 | 0.043 | 0.05 | 1.44 |
| 150 | 506.667 | 2.111 | 2.111 | 2.111 | 0.704 | 3.852° | 0.047 | 0.075 | 0.088 | 1.6 |
| 170 | 574.222 | 2.393 | 2.393 | 2.393 | 0.798 | 4.42° | 0.067 | 0.108 | 0.126 | 1.76 |
| 185 | 624.889 | 2.604 | 2.604 | 2.604 | 0.868 | 4.765° | 0.081 | 0.13 | 0.152 | 1.88 |
| 200 | 675.556 | 2.815 | 2.815 | 2.815 | 0.938 | 5.022° | 0.092 | 0.147 | 0.172 | 2 |
| 210 | 709.333 | 2.956 | 2.956 | 2.956 | 0.985 | 5.134° | 0.097 | 0.155 | 0.182 | 2.08 |
| 225 | 760 | 3.167 | 3.167 | 3.167 | 1.056 | 5.2° | 0.1 | 0.16 | 0.187 | 2.2 |

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
- topBandFovCompression: **observed** — {"deltaDegrees":0.435,"fromKmh":185,"id":"topBandFovCompression","status":"observed","toKmh":225}
- topBandHandlingPlateau: **observed** — {"id":"topBandHandlingPlateau","profileDelta":0,"status":"observed"}

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| sampleCount | yes | 12 | 12 |
| inverseIdentityErrorKmhMax | yes | 0, 0.000001 | 0 |
| cadenceIdentityErrorMax | yes | 0, 0.000001 | 0 |
| fovIdentityErrorMax | yes | 0, 0.00001 | 0.000003 |
| worldUnitProgression | yes | strictly increasing above 0km/h | 0, 101.333333, 202.666667, 304, 371.555556, 439.111111, 506.666667, 574.222222, 624.888889, 675.555556, 709.333333, 760 |
| speedCueEnvelopeBounds | yes | all cue channels remain within runtime maxima | true |
| laneDashRatiosValid | yes | 0 <= start, 0 < length, start + length <= 1 | {"length":0.34,"start":0.16} |
| sh3LaneCadence210 | yes | 2.9, 4 | 2.955556 |
| sh3LaneCadence225 | yes | 3, 4 | 3.166667 |
| sh3ReflectorCadence225 | yes | 3, 4 | 3.166667 |
| stationaryHoldOffset | yes | 0, 0.001 | 0 |
| stationaryHoldPose | yes | 0, 0.001 | 0 |
| handlingSamplesFinite | yes | true | true |


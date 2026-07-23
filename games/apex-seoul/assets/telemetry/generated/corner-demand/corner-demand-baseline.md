# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-07-23T10:35:07.594Z

Status: **FAIL**

## Control variables

- Raven 0-100km/h: 8.1s (target 7.8~8.3s)
- 60km/h: gear 2, 4961rpm
- drivetrain: physical, final drive 4.1
- gear ratios: 3.626 / 2.188 / 1.541 / 1.213 / 1 / 0.767
- HND-2 invariant: speed scrub and understeer read the same corner-demand target
- TSE-6 comparison: corner-only loss uses the calibrated production straight control with the same speed, slope and pedal preparation
- A positive downhill force can hold the 225km/h safety cap, so level loss is expected to exceed downhill loss after TSE-4
- HND-4 trajectory: outward motion is normalized by available road width and capped per corner grade
- HND-4 recovery: lift/brake load transfer reduces understeer demand continuously

## Baseline observations

- easy 225 full-throttle raw loss 1.557% / corner-only 1.538% / zone overspeed
- medium 225 full-throttle raw loss 25.774% / corner-only 25.75% / severe 0.991
- sharp 225 full-throttle raw loss 47.214% / corner-only 47.19% / severe 1
- HND-4 outward/road easy 0.2 / medium 0.344 / sharp 0.494
- Bugak sharp segment 31 uses maxRoadOffset 808.32 and reaches outward road ratio 0.5
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.825 | 147.798 | -8.019 | 148.865 | 0.78 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.538 | 140.092 | -11.594 | 140.895 | 0.64 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.778 | 111.185 | -14.887 | 112.439 | 1.296 | within-budget | 0 | 194.85 | 0.068 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.872 | 209.008 | -34.956 | 210.292 | 0.829 | within-budget | 0 | 194.85 | 0.175 | 0.287 | 0 | 0 |
| easy | downhill | 130 | lift | 144.654 | 200.094 | -38.326 | 201.333 | 0.857 | within-budget | 0 | 194.85 | 0.152 | 0.003 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.669 | 173.148 | -49.693 | 174.283 | 0.981 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.832 | 144.619 | -5.691 | 148.865 | 3.103 | within-budget | 0 | 156.825 | 0.422 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.544 | 137.798 | -9.761 | 140.895 | 2.467 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.783 | 107.149 | -10.711 | 112.439 | 5.466 | within-budget | 0 | 156.825 | 0.211 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.88 | 208.479 | -34.607 | 210.292 | 1.171 | within-budget | 0 | 156.825 | 0.539 | 0.58 | 0 | 0 |
| medium | downhill | 130 | lift | 144.661 | 199.109 | -37.638 | 201.333 | 1.537 | within-budget | 0 | 156.825 | 0.47 | 0.444 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 115.675 | 170.108 | -47.057 | 174.283 | 3.609 | within-budget | 0 | 156.825 | 0.301 | 0.002 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.832 | 141.457 | -3.38 | 148.865 | 5.414 | overspeed | 0 | 132.75 | 0.913 | 0.027 | 0 | 0 |
| sharp | level | 130 | lift | 125.544 | 134.44 | -7.086 | 140.895 | 5.142 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.783 | 103.159 | -6.588 | 112.439 | 9.588 | within-budget | 0 | 132.75 | 0.457 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.88 | 130.143 | 15.972 | 210.292 | 51.749 | overspeed | 0 | 132.75 | 1.166 | 1 | 0.53 | 0 |
| sharp | downhill | 130 | lift | 144.661 | 130.134 | 10.042 | 201.333 | 49.218 | overspeed | 0 | 132.75 | 1.017 | 0.983 | 0.499 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.675 | 166.143 | -43.629 | 174.283 | 7.037 | within-budget | 0 | 132.75 | 0.65 | 0.106 | 0 | 0 |
| easy | level | 160 | full-throttle | 164.647 | 173.7 | -5.498 | 174.878 | 0.715 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.459 | 164.833 | -6.716 | 165.977 | 0.741 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.588 | 134.962 | -7.464 | 136.037 | 0.856 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.249 | 225 | -22.784 | 225 | 0 | within-budget | 0 | 194.85 | 0.245 | 0.3 | 0.193 | 0 |
| easy | downhill | 160 | lift | 173.869 | 224.251 | -28.977 | 225 | 0.431 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0.194 | 0 |
| easy | downhill | 160 | brake-prepared | 145.139 | 200.532 | -38.166 | 201.787 | 0.865 | within-budget | 0 | 194.85 | 0.153 | 0.005 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.655 | 172.63 | -4.843 | 174.878 | 1.365 | overspeed | 0 | 156.825 | 0.612 | 0.054 | 0 | 0 |
| medium | level | 160 | lift | 154.467 | 162.977 | -5.509 | 165.977 | 1.942 | within-budget | 0 | 156.825 | 0.538 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.595 | 131.039 | -4.334 | 136.037 | 3.979 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.258 | 177.956 | 2.893 | 225 | 25.671 | overspeed | 0 | 156.825 | 0.756 | 0.58 | 0.368 | 0 |
| medium | downhill | 160 | lift | 173.877 | 178.005 | -2.374 | 225 | 27.028 | overspeed | 0 | 156.825 | 0.68 | 0.577 | 0.36 | 0 |
| medium | downhill | 160 | brake-prepared | 145.146 | 199.566 | -37.493 | 201.787 | 1.53 | within-budget | 0 | 156.825 | 0.474 | 0.451 | 0 | 0 |
| sharp | level | 160 | full-throttle | 164.655 | 119.05 | 27.697 | 174.878 | 33.906 | severe-overspeed | 0.125 | 132.75 | 1.324 | 1 | 0.42 | 0 |
| sharp | level | 160 | lift | 154.467 | 120.12 | 22.236 | 165.977 | 29.687 | overspeed | 0 | 132.75 | 1.165 | 0.962 | 0.382 | 0 |
| sharp | level | 160 | brake-prepared | 125.595 | 127.002 | -1.12 | 136.037 | 7.194 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 183.258 | 129.307 | 29.44 | 225 | 52.218 | severe-overspeed | 0.823 | 132.75 | 1.634 | 1 | 0.553 | 0 |
| sharp | downhill | 160 | lift | 173.877 | 129.27 | 25.655 | 225 | 55.056 | severe-overspeed | 0.455 | 132.75 | 1.471 | 1 | 0.55 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.146 | 130.057 | 10.396 | 201.787 | 49.419 | overspeed | 0 | 132.75 | 1.024 | 0.985 | 0.5 | 0 |
| easy | level | 195 | full-throttle | 197.44 | 201.453 | -2.033 | 202.865 | 0.715 | overspeed | 0 | 194.85 | 0.285 | 0.018 | 0 | 0 |
| easy | level | 195 | lift | 188.359 | 193.411 | -2.683 | 194.8 | 0.737 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.428 | 164.74 | -3.332 | 165.975 | 0.775 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.145 | 225 | -4.097 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0.212 | 0 |
| easy | downhill | 195 | lift | 207.744 | 225 | -8.307 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0.209 | 0 |
| easy | downhill | 195 | brake-prepared | 178.899 | 225 | -25.769 | 225 | 0 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0.193 | 0 |
| medium | level | 195 | full-throttle | 197.45 | 167.788 | 15.022 | 202.865 | 17.765 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.58 | 0.328 | 0 |
| medium | level | 195 | lift | 188.368 | 169.362 | 10.09 | 194.8 | 13.504 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.569 | 0.302 | 0 |
| medium | level | 195 | brake-prepared | 159.437 | 163.064 | -2.275 | 165.975 | 1.826 | overspeed | 0 | 156.825 | 0.574 | 0.006 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 216.156 | 177.324 | 17.965 | 225 | 22.056 | severe-overspeed | 0.817 | 156.825 | 1.052 | 0.58 | 0.37 | 0 |
| medium | downhill | 195 | lift | 207.754 | 177.113 | 14.749 | 225 | 23.05 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0.37 | 0 |
| medium | downhill | 195 | brake-prepared | 178.908 | 177.868 | 0.581 | 225 | 26.344 | overspeed | 0 | 156.825 | 0.72 | 0.58 | 0.366 | 0 |
| sharp | level | 195 | full-throttle | 197.45 | 118.421 | 40.025 | 202.865 | 42.767 | severe-overspeed | 1 | 132.75 | 1.904 | 1 | 0.476 | 0 |
| sharp | level | 195 | lift | 188.368 | 118.463 | 37.111 | 194.8 | 40.525 | severe-overspeed | 0.963 | 132.75 | 1.733 | 1 | 0.465 | 0 |
| sharp | level | 195 | brake-prepared | 159.437 | 119.278 | 25.188 | 165.975 | 29.289 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.996 | 0.395 | 0 |
| sharp | downhill | 195 | full-throttle | 216.156 | 129.485 | 40.096 | 225 | 44.188 | severe-overspeed | 1 | 132.75 | 2.276 | 1 | 0.592 | 0 |
| sharp | downhill | 195 | lift | 207.754 | 129.429 | 37.701 | 225 | 46.002 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.59 | 0 |
| sharp | downhill | 195 | brake-prepared | 178.908 | 129.147 | 27.814 | 225 | 53.577 | severe-overspeed | 0.666 | 132.75 | 1.558 | 1 | 0.55 | 0 |
| easy | level | 225 | full-throttle | 224.96 | 221.458 | 1.557 | 224.918 | 1.538 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.2 | 0 |
| easy | level | 225 | lift | 217.117 | 214.642 | 1.14 | 217.476 | 1.305 | overspeed | 0 | 194.85 | 0.345 | 0.3 | 0.2 | 0 |
| easy | level | 225 | brake-prepared | 188.005 | 187.177 | 0.44 | 188.597 | 0.755 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.213 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.213 | 0 |
| easy | downhill | 225 | brake-prepared | 200.789 | 225 | -12.058 | 225 | 0 | overspeed | 0 | 194.85 | 0.294 | 0.3 | 0.207 | 0 |
| medium | level | 225 | full-throttle | 224.972 | 166.988 | 25.774 | 224.918 | 25.75 | severe-overspeed | 0.991 | 156.825 | 1.143 | 0.58 | 0.344 | 0 |
| medium | level | 225 | lift | 217.128 | 166.612 | 23.266 | 217.476 | 23.426 | severe-overspeed | 0.852 | 156.825 | 1.065 | 0.58 | 0.34 | 0 |
| medium | level | 225 | brake-prepared | 188.014 | 170.146 | 9.504 | 188.597 | 9.814 | severe-overspeed | 0.014 | 156.825 | 0.799 | 0.547 | 0.277 | 0 |
| medium | downhill | 225 | full-throttle | 225 | 177.328 | 21.188 | 225 | 21.188 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.369 | 0 |
| medium | downhill | 225 | lift | 225 | 177.328 | 21.188 | 225 | 21.188 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.369 | 0 |
| medium | downhill | 225 | brake-prepared | 200.799 | 176.833 | 11.936 | 225 | 23.988 | severe-overspeed | 0.303 | 156.825 | 0.908 | 0.58 | 0.37 | 0 |
| sharp | level | 225 | full-throttle | 224.972 | 118.754 | 47.214 | 224.918 | 47.19 | severe-overspeed | 1 | 132.75 | 2.473 | 1 | 0.494 | 0 |
| sharp | level | 225 | lift | 217.128 | 118.554 | 45.399 | 217.476 | 45.559 | severe-overspeed | 1 | 132.75 | 2.304 | 1 | 0.49 | 0 |
| sharp | level | 225 | brake-prepared | 188.014 | 118.255 | 37.103 | 188.597 | 37.413 | severe-overspeed | 0.958 | 132.75 | 1.728 | 1 | 0.462 | 0 |
| sharp | downhill | 225 | full-throttle | 225 | 129.492 | 42.448 | 225 | 42.448 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.591 | 0 |
| sharp | downhill | 225 | lift | 225 | 129.492 | 42.448 | 225 | 42.448 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.591 | 0 |
| sharp | downhill | 225 | brake-prepared | 200.799 | 129.25 | 35.632 | 225 | 47.685 | severe-overspeed | 1 | 132.75 | 1.965 | 1 | 0.583 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.45 | 173.463 | 0.58 | 0.55 | - | 0.257 | 0 |
| medium | level | 195 | brake-recovery | 197.45 | 156.562 | 0.58 | 0.92 | 267 | 0.26 | 0 |
| medium | downhill | 195 | lift-recovery | 216.156 | 179.319 | 0.58 | 0.497 | - | 0.37 | 0 |
| medium | downhill | 195 | brake-recovery | 216.156 | 179.036 | 0.58 | 0.793 | 317 | 0.37 | 0 |
| sharp | level | 195 | lift-recovery | 197.45 | 113.577 | 1 | 0.83 | 267 | 0.476 | 0 |
| sharp | level | 195 | brake-recovery | 197.45 | 100.491 | 1 | 1 | 133 | 0.476 | 0 |
| sharp | downhill | 195 | lift-recovery | 216.156 | 129.098 | 1 | 0.685 | 783 | 0.592 | 0 |
| sharp | downhill | 195 | brake-recovery | 216.156 | 126.197 | 1 | 0.93 | 250 | 0.592 | 0 |
| medium | level | 225 | lift-recovery | 224.972 | 172.29 | 0.58 | 0.479 | - | 0.285 | 0 |
| medium | level | 225 | brake-recovery | 224.972 | 160.95 | 0.58 | 0.778 | 333 | 0.29 | 0 |
| medium | downhill | 225 | lift-recovery | 225 | 179.481 | 0.58 | 0.496 | - | 0.369 | 0 |
| medium | downhill | 225 | brake-recovery | 225 | 179.103 | 0.58 | 0.792 | 317 | 0.369 | 0 |
| sharp | level | 225 | lift-recovery | 224.972 | 115.814 | 1 | 0.796 | 417 | 0.494 | 0 |
| sharp | level | 225 | brake-recovery | 224.972 | 104.107 | 1 | 1 | 200 | 0.494 | 0 |
| sharp | downhill | 225 | lift-recovery | 225 | 129.127 | 1 | 0.682 | - | 0.591 | 0 |
| sharp | downhill | 225 | brake-recovery | 225 | 126.303 | 1 | 0.926 | 250 | 0.591 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | full-throttle | 225 | 224.969 | 0.014 | 0.3 | 0.201 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | lift | 218.259 | 219.488 | -0.563 | 0.3 | 0.2 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | brake-prepared | 189.148 | 192.491 | -1.767 | 0 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | full-throttle | 225 | 165.851 | 26.288 | 0.58 | 0.353 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | lift | 219.38 | 165.675 | 24.48 | 0.58 | 0.352 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | brake-prepared | 190.27 | 165.039 | 13.261 | 0.58 | 0.329 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | full-throttle | 225 | 122.501 | 45.555 | 1 | 0.5 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | lift | 219.264 | 122.342 | 44.203 | 1 | 0.497 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | brake-prepared | 190.154 | 121.414 | 36.15 | 1 | 0.477 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| ch3LevelEasy225DelayedCornerLoss | no | 2, 3 | 1.538 |
| tse6LevelMedium225CornerLoss | no | 26, 31 | 25.75 |
| tse6LevelSharp225CornerLoss | yes | 45, 51 | 47.19 |
| tse6DownhillEasy225RawLoss | yes | -0.1, 0.1 | 0 |
| tse6DownhillMedium225RawLoss | yes | 18, 25 | 21.188 |
| tse6DownhillSharp225RawLoss | yes | 39, 46 | 42.448 |
| ch3LevelLossAboveDownhillByGrade | no | level corner-only loss exceeds downhill by >= 2 percentage points for every grade | {"easy":1.538,"medium":4.562,"sharp":4.742} |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 47.19 > 25.75 > 1.538 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[1.538,1.305,0.755],"medium":[25.75,23.426,9.814],"sharp":[47.19,45.559,37.413]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.991, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 32.722, 67.424 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| ch3Easy195OutwardRoadRatio | no | 0.15, 0.22 | 0 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.018 |
| hnd4Easy225OutwardRoadRatio | yes | 0.1, 0.22 | 0.2 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| ch3Medium225OutwardRoadRatio | no | 0.35, 0.44 | 0.344 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225OutwardRoadRatio | yes | 0.35, 0.55 | 0.494 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4OutwardTrajectoryOrdering | yes | sharp > medium > easy | 0.494, 0.344, 0.2 |
| ch3RoadWidthCaps | yes | {"easy":0.26,"medium":0.54,"sharp":0.66} | {"easy":0.213,"medium":0.369,"sharp":0.591} |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.479, 0.496, 0.796, 0.682 |
| hnd4BrakeRecoveryRelief | yes | >= 0.55 at 400ms | 0.778, 0.792, 1, 0.926 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.1 |
| sixtyKmhSecondGear | yes | 2 | 2 |


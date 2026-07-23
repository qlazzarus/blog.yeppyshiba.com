# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-07-22T11:26:31.726Z

Status: **PASS**

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

- easy 225 full-throttle raw loss 6.463% / corner-only 6.501% / zone overspeed
- medium 225 full-throttle raw loss 27.94% / corner-only 28.242% / severe 0.991
- sharp 225 full-throttle raw loss 47.418% / corner-only 47.956% / severe 1
- HND-4 outward/road easy 0.207 / medium 0.353 / sharp 0.454
- Bugak sharp segment 31 uses maxRoadOffset 808.32 and reaches outward road ratio 0.471
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.825 | 147.798 | -8.019 | 148.865 | 0.78 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.538 | 140.092 | -11.593 | 140.895 | 0.64 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.778 | 111.173 | -14.875 | 112.439 | 1.308 | within-budget | 0 | 194.85 | 0.068 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.872 | 208.471 | -34.608 | 210.292 | 1.176 | within-budget | 0 | 194.85 | 0.175 | 0.3 | 0.117 | 0 |
| easy | downhill | 130 | lift | 144.654 | 200.075 | -38.312 | 201.333 | 0.87 | within-budget | 0 | 194.85 | 0.152 | 0.013 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.669 | 173.148 | -49.693 | 174.283 | 0.981 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.832 | 144.568 | -5.654 | 148.865 | 3.14 | within-budget | 0 | 156.825 | 0.422 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.544 | 137.753 | -9.725 | 140.895 | 2.503 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.783 | 107.121 | -10.681 | 112.439 | 5.495 | within-budget | 0 | 156.825 | 0.211 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.88 | 178.187 | -15.049 | 210.292 | 20.729 | within-budget | 0 | 156.825 | 0.539 | 0.507 | 0.385 | 0 |
| medium | downhill | 130 | lift | 144.661 | 180.065 | -24.474 | 201.333 | 14.702 | within-budget | 0 | 156.825 | 0.47 | 0.52 | 0.362 | 0 |
| medium | downhill | 130 | brake-prepared | 115.675 | 169.932 | -46.905 | 174.283 | 3.761 | within-budget | 0 | 156.825 | 0.301 | 0.032 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.817 | 141.001 | -3.058 | 148.865 | 5.748 | overspeed | 0 | 132.75 | 0.913 | 0.027 | 0 | 0 |
| sharp | level | 130 | lift | 125.544 | 134.385 | -7.042 | 140.895 | 5.185 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.783 | 103.127 | -6.555 | 112.439 | 9.622 | within-budget | 0 | 132.75 | 0.457 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.559 | 130.123 | 15.81 | 210.292 | 51.87 | overspeed | 0 | 132.75 | 1.166 | 0.911 | 0.49 | 0 |
| sharp | downhill | 130 | lift | 144.551 | 130.12 | 9.983 | 201.333 | 49.265 | overspeed | 0 | 132.75 | 1.017 | 0.851 | 0.488 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.675 | 141.501 | -22.327 | 174.283 | 28.34 | within-budget | 0 | 132.75 | 0.65 | 0.936 | 0.411 | 0 |
| easy | level | 160 | full-throttle | 164.647 | 173.7 | -5.498 | 174.878 | 0.715 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.459 | 164.833 | -6.716 | 165.977 | 0.741 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.588 | 134.958 | -7.46 | 136.037 | 0.859 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.249 | 225 | -22.784 | 225 | 0 | within-budget | 0 | 194.85 | 0.245 | 0.3 | 0.222 | 0 |
| easy | downhill | 160 | lift | 173.869 | 220.162 | -26.625 | 225 | 2.783 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0.222 | 0 |
| easy | downhill | 160 | brake-prepared | 145.139 | 200.506 | -38.148 | 201.787 | 0.883 | within-budget | 0 | 194.85 | 0.153 | 0.019 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.627 | 167.993 | -2.045 | 174.878 | 4.182 | overspeed | 0 | 156.825 | 0.612 | 0.058 | 0 | 0 |
| medium | level | 160 | lift | 154.467 | 162.926 | -5.476 | 165.977 | 1.975 | within-budget | 0 | 156.825 | 0.538 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.595 | 130.992 | -4.297 | 136.037 | 4.017 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.037 | 177.758 | 2.884 | 225 | 25.81 | overspeed | 0 | 156.825 | 0.756 | 0.551 | 0.386 | 0 |
| medium | downhill | 160 | lift | 173.766 | 177.701 | -2.265 | 225 | 27.22 | overspeed | 0 | 156.825 | 0.68 | 0.511 | 0.385 | 0 |
| medium | downhill | 160 | brake-prepared | 145.146 | 179.899 | -23.943 | 201.787 | 15.08 | within-budget | 0 | 156.825 | 0.474 | 0.52 | 0.366 | 0 |
| sharp | level | 160 | full-throttle | 164.048 | 120.501 | 26.545 | 174.878 | 33.147 | severe-overspeed | 0.125 | 132.75 | 1.324 | 0.75 | 0.331 | 0 |
| sharp | level | 160 | lift | 154.149 | 127.298 | 17.419 | 165.977 | 25.092 | overspeed | 0 | 132.75 | 1.165 | 0.498 | 0.232 | 0 |
| sharp | level | 160 | brake-prepared | 125.595 | 126.945 | -1.075 | 136.037 | 7.239 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 182.106 | 129.187 | 29.06 | 225 | 52.614 | severe-overspeed | 0.823 | 132.75 | 1.634 | 0.999 | 0.511 | 0 |
| sharp | downhill | 160 | lift | 172.957 | 130.128 | 24.763 | 225 | 54.853 | severe-overspeed | 0.455 | 132.75 | 1.471 | 0.977 | 0.502 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.027 | 130.043 | 10.332 | 201.787 | 49.469 | overspeed | 0 | 132.75 | 1.024 | 0.851 | 0.488 | 0 |
| easy | level | 195 | full-throttle | 197.438 | 200.792 | -1.699 | 202.865 | 1.05 | overspeed | 0 | 194.85 | 0.285 | 0.049 | 0.025 | 0 |
| easy | level | 195 | lift | 188.359 | 193.411 | -2.683 | 194.8 | 0.737 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.428 | 164.74 | -3.332 | 165.975 | 0.775 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.068 | 225 | -4.134 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0.221 | 0 |
| easy | downhill | 195 | lift | 207.711 | 225 | -8.324 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0.221 | 0 |
| easy | downhill | 195 | brake-prepared | 178.899 | 222.876 | -24.582 | 225 | 1.187 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0.224 | 0 |
| medium | level | 195 | full-throttle | 197.027 | 163.166 | 17.186 | 202.865 | 20.149 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.545 | 0.322 | 0 |
| medium | level | 195 | lift | 188.082 | 164.664 | 12.451 | 194.8 | 16.023 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.439 | 0.213 | 0 |
| medium | level | 195 | brake-prepared | 159.433 | 162.815 | -2.121 | 165.975 | 1.982 | overspeed | 0 | 156.825 | 0.574 | 0.006 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 215.491 | 176.744 | 17.981 | 225 | 22.394 | severe-overspeed | 0.817 | 156.825 | 1.052 | 0.58 | 0.39 | 0 |
| medium | downhill | 195 | lift | 207.195 | 177.934 | 14.122 | 225 | 22.716 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0.389 | 0 |
| medium | downhill | 195 | brake-prepared | 178.738 | 177.65 | 0.609 | 225 | 26.491 | overspeed | 0 | 156.825 | 0.72 | 0.53 | 0.385 | 0 |
| sharp | level | 195 | full-throttle | 196.193 | 118.349 | 39.677 | 202.865 | 43.078 | severe-overspeed | 1 | 132.75 | 1.904 | 1 | 0.391 | 0 |
| sharp | level | 195 | lift | 187.133 | 118.917 | 36.453 | 194.8 | 40.55 | severe-overspeed | 0.963 | 132.75 | 1.733 | 0.99 | 0.371 | 0 |
| sharp | level | 195 | brake-prepared | 158.996 | 124.393 | 21.764 | 165.975 | 26.153 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.612 | 0.272 | 0 |
| sharp | downhill | 195 | full-throttle | 214.899 | 129.259 | 39.851 | 225 | 44.552 | severe-overspeed | 1 | 132.75 | 2.276 | 1 | 0.551 | 0 |
| sharp | downhill | 195 | lift | 206.497 | 129.235 | 37.415 | 225 | 46.376 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.541 | 0 |
| sharp | downhill | 195 | brake-prepared | 177.85 | 129.032 | 27.449 | 225 | 53.96 | severe-overspeed | 0.666 | 132.75 | 1.558 | 0.988 | 0.504 | 0 |
| easy | level | 225 | full-throttle | 224.833 | 210.302 | 6.463 | 224.918 | 6.501 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.207 | 0 |
| easy | level | 225 | lift | 217.033 | 207.053 | 4.598 | 217.476 | 4.802 | overspeed | 0 | 194.85 | 0.345 | 0.3 | 0.206 | 0 |
| easy | level | 225 | brake-prepared | 188.005 | 187.177 | 0.44 | 188.597 | 0.755 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.221 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.221 | 0 |
| easy | downhill | 225 | brake-prepared | 200.782 | 225 | -12.062 | 225 | 0 | overspeed | 0 | 194.85 | 0.294 | 0.3 | 0.22 | 0 |
| medium | level | 225 | full-throttle | 224.241 | 161.587 | 27.94 | 224.918 | 28.242 | severe-overspeed | 0.991 | 156.825 | 1.143 | 0.58 | 0.353 | 0 |
| medium | level | 225 | lift | 216.451 | 161.218 | 25.517 | 217.476 | 25.991 | severe-overspeed | 0.852 | 156.825 | 1.065 | 0.58 | 0.347 | 0 |
| medium | level | 225 | brake-prepared | 187.732 | 162.628 | 13.372 | 188.597 | 13.833 | severe-overspeed | 0.014 | 156.825 | 0.799 | 0.426 | 0.169 | 0 |
| medium | downhill | 225 | full-throttle | 224.589 | 176.848 | 21.257 | 225 | 21.44 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.39 | 0 |
| medium | downhill | 225 | lift | 224.589 | 176.848 | 21.257 | 225 | 21.44 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.39 | 0 |
| medium | downhill | 225 | brake-prepared | 200.332 | 176.459 | 11.917 | 225 | 24.23 | severe-overspeed | 0.303 | 156.825 | 0.908 | 0.58 | 0.388 | 0 |
| sharp | level | 225 | full-throttle | 223.715 | 117.634 | 47.418 | 224.918 | 47.956 | severe-overspeed | 1 | 132.75 | 2.473 | 1 | 0.454 | 0 |
| sharp | level | 225 | lift | 215.872 | 117.632 | 45.508 | 217.476 | 46.251 | severe-overspeed | 1 | 132.75 | 2.304 | 1 | 0.44 | 0 |
| sharp | level | 225 | brake-prepared | 186.782 | 118.812 | 36.39 | 188.597 | 37.362 | severe-overspeed | 0.958 | 132.75 | 1.728 | 0.982 | 0.365 | 0 |
| sharp | downhill | 225 | full-throttle | 224.064 | 129.293 | 42.296 | 225 | 42.714 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.558 | 0 |
| sharp | downhill | 225 | lift | 224.063 | 129.293 | 42.296 | 225 | 42.714 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.558 | 0 |
| sharp | downhill | 225 | brake-prepared | 199.542 | 129.061 | 35.321 | 225 | 48.08 | severe-overspeed | 1 | 132.75 | 1.965 | 1 | 0.526 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.027 | 159.479 | 0.545 | 0.705 | 500 | 0.243 | 0 |
| medium | level | 195 | brake-recovery | 197.027 | 142.749 | 0.545 | 1 | 167 | 0.245 | 0 |
| medium | downhill | 195 | lift-recovery | 215.491 | 174.618 | 0.58 | 0.555 | - | 0.388 | 0 |
| medium | downhill | 195 | brake-recovery | 215.491 | 166.493 | 0.58 | 0.904 | 250 | 0.389 | 0 |
| sharp | level | 195 | lift-recovery | 196.193 | 110.842 | 1 | 0.851 | 83 | 0.388 | 0 |
| sharp | level | 195 | brake-recovery | 196.193 | 94.887 | 1 | 1 | 83 | 0.388 | 0 |
| sharp | downhill | 195 | lift-recovery | 214.899 | 127.933 | 1 | 0.691 | 483 | 0.551 | 0 |
| sharp | downhill | 195 | brake-recovery | 214.899 | 124.015 | 1 | 1 | 150 | 0.551 | 0 |
| medium | level | 225 | lift-recovery | 224.241 | 157.238 | 0.58 | 0.67 | 650 | 0.32 | 0 |
| medium | level | 225 | brake-recovery | 224.241 | 145.019 | 0.58 | 0.995 | 200 | 0.32 | 0 |
| medium | downhill | 225 | lift-recovery | 224.589 | 174.848 | 0.58 | 0.55 | - | 0.389 | 0 |
| medium | downhill | 225 | brake-recovery | 224.589 | 167.113 | 0.58 | 0.888 | 267 | 0.389 | 0 |
| sharp | level | 225 | lift-recovery | 223.715 | 112.06 | 1 | 0.836 | 167 | 0.454 | 0 |
| sharp | level | 225 | brake-recovery | 223.715 | 97.486 | 1 | 1 | 100 | 0.454 | 0 |
| sharp | downhill | 225 | lift-recovery | 224.064 | 128.117 | 1 | 0.71 | 533 | 0.558 | 0 |
| sharp | downhill | 225 | brake-recovery | 224.064 | 124.319 | 1 | 0.999 | 150 | 0.558 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | full-throttle | 224.886 | 212.92 | 5.321 | 0.3 | 0.207 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | lift | 218.166 | 210.205 | 3.649 | 0.3 | 0.206 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | brake-prepared | 189.148 | 192.491 | -1.767 | 0 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | full-throttle | 224.252 | 162.055 | 27.735 | 0.58 | 0.358 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | lift | 218.612 | 161.862 | 25.959 | 0.58 | 0.355 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | brake-prepared | 189.926 | 161.783 | 14.818 | 0.465 | 0.277 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | full-throttle | 223.846 | 121.335 | 45.795 | 1 | 0.471 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | lift | 218.057 | 121.198 | 44.419 | 1 | 0.465 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | brake-prepared | 188.954 | 120.571 | 36.191 | 0.999 | 0.419 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| tse6LevelEasy225CornerLoss | yes | 5.5, 7.5 | 6.501 |
| tse6LevelMedium225CornerLoss | yes | 26, 31 | 28.242 |
| tse6LevelSharp225CornerLoss | yes | 45, 51 | 47.956 |
| tse6DownhillEasy225RawLoss | yes | -0.1, 0.1 | 0 |
| tse6DownhillMedium225RawLoss | yes | 18, 25 | 21.257 |
| tse6DownhillSharp225RawLoss | yes | 39, 46 | 42.296 |
| tse6LevelLossAboveDownhillByGrade | yes | level corner-only loss exceeds downhill by >= 5 percentage points for every grade | {"easy":6.501,"medium":6.802,"sharp":5.242} |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 47.956 > 28.242 > 6.501 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[6.501,4.802,0.755],"medium":[28.242,25.991,13.833],"sharp":[47.956,46.251,37.362]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.991, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 29.995, 65.539 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195OutwardRoadRatio | yes | 0, 0.12 | 0.025 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.049 |
| hnd4Easy225OutwardRoadRatio | yes | 0.1, 0.22 | 0.207 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| hnd4Medium225OutwardRoadRatio | yes | 0.22, 0.38 | 0.353 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225OutwardRoadRatio | yes | 0.35, 0.55 | 0.454 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4OutwardTrajectoryOrdering | yes | sharp > medium > easy | 0.454, 0.353, 0.207 |
| hnd4RoadWidthCaps | yes | {"easy":0.24,"medium":0.44,"sharp":0.56} | {"easy":0.221,"medium":0.39,"sharp":0.558} |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.67, 0.55, 0.836, 0.71 |
| hnd4BrakeRecoveryRelief | yes | >= 0.55 at 400ms | 0.995, 0.888, 1, 0.999 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.1 |
| sixtyKmhSecondGear | yes | 2 | 2 |


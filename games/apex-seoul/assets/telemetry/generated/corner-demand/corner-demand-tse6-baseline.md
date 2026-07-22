# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-07-22T04:18:03.856Z

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

- easy 225 full-throttle raw loss 6.519% / corner-only 6.557% / zone overspeed
- medium 225 full-throttle raw loss 28.112% / corner-only 28.414% / severe 0.991
- sharp 225 full-throttle raw loss 47.595% / corner-only 48.133% / severe 1
- HND-4 outward/road easy 0.208 / medium 0.357 / sharp 0.459
- Bugak sharp segment 64 uses maxRoadOffset 960.096 and reaches outward road ratio 0.485
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.825 | 147.798 | -8.019 | 148.865 | 0.78 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.538 | 140.092 | -11.593 | 140.895 | 0.64 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.778 | 111.173 | -14.875 | 112.439 | 1.308 | within-budget | 0 | 194.85 | 0.068 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.872 | 208.462 | -34.603 | 210.292 | 1.182 | within-budget | 0 | 194.85 | 0.175 | 0.3 | 0.129 | 0 |
| easy | downhill | 130 | lift | 144.654 | 200.075 | -38.312 | 201.333 | 0.87 | within-budget | 0 | 194.85 | 0.152 | 0.013 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.669 | 173.148 | -49.693 | 174.283 | 0.981 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.832 | 144.568 | -5.654 | 148.865 | 3.14 | within-budget | 0 | 156.825 | 0.422 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.544 | 137.753 | -9.725 | 140.895 | 2.503 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.783 | 107.121 | -10.681 | 112.439 | 5.495 | within-budget | 0 | 156.825 | 0.211 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.88 | 177.885 | -14.853 | 210.292 | 20.924 | within-budget | 0 | 156.825 | 0.539 | 0.496 | 0.388 | 0 |
| medium | downhill | 130 | lift | 144.661 | 179.046 | -23.769 | 201.333 | 15.406 | within-budget | 0 | 156.825 | 0.47 | 0.511 | 0.373 | 0 |
| medium | downhill | 130 | brake-prepared | 115.675 | 169.931 | -46.904 | 174.283 | 3.762 | within-budget | 0 | 156.825 | 0.301 | 0.033 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.817 | 140.972 | -3.037 | 148.865 | 5.769 | overspeed | 0 | 132.75 | 0.913 | 0.027 | 0 | 0 |
| sharp | level | 130 | lift | 125.544 | 134.385 | -7.042 | 140.895 | 5.185 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.783 | 103.127 | -6.555 | 112.439 | 9.622 | within-budget | 0 | 132.75 | 0.457 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.559 | 130.119 | 15.813 | 210.292 | 51.872 | overspeed | 0 | 132.75 | 1.166 | 0.929 | 0.492 | 0 |
| sharp | downhill | 130 | lift | 144.551 | 130.115 | 9.987 | 201.333 | 49.268 | overspeed | 0 | 132.75 | 1.017 | 0.86 | 0.491 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.675 | 137.808 | -19.134 | 174.283 | 31.532 | within-budget | 0 | 132.75 | 0.65 | 0.943 | 0.45 | 0 |
| easy | level | 160 | full-throttle | 164.647 | 173.7 | -5.498 | 174.878 | 0.715 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.459 | 164.833 | -6.716 | 165.977 | 0.741 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.588 | 134.958 | -7.46 | 136.037 | 0.859 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.249 | 224.99 | -22.778 | 225 | 0.005 | within-budget | 0 | 194.85 | 0.245 | 0.3 | 0.219 | 0 |
| easy | downhill | 160 | lift | 173.869 | 220.093 | -26.586 | 225 | 2.822 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0.226 | 0 |
| easy | downhill | 160 | brake-prepared | 145.139 | 200.506 | -38.148 | 201.787 | 0.883 | within-budget | 0 | 194.85 | 0.153 | 0.019 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.627 | 167.766 | -1.907 | 174.878 | 4.32 | overspeed | 0 | 156.825 | 0.612 | 0.063 | 0 | 0 |
| medium | level | 160 | lift | 154.467 | 162.926 | -5.476 | 165.977 | 1.975 | within-budget | 0 | 156.825 | 0.538 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.595 | 130.992 | -4.297 | 136.037 | 4.017 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.037 | 177.734 | 2.897 | 225 | 25.823 | overspeed | 0 | 156.825 | 0.756 | 0.552 | 0.389 | 0 |
| medium | downhill | 160 | lift | 173.766 | 177.658 | -2.24 | 225 | 27.245 | overspeed | 0 | 156.825 | 0.68 | 0.504 | 0.387 | 0 |
| medium | downhill | 160 | brake-prepared | 145.146 | 178.931 | -23.276 | 201.787 | 15.747 | within-budget | 0 | 156.825 | 0.474 | 0.511 | 0.376 | 0 |
| sharp | level | 160 | full-throttle | 164.048 | 117.748 | 28.224 | 174.878 | 34.825 | severe-overspeed | 0.125 | 132.75 | 1.324 | 0.797 | 0.331 | 0 |
| sharp | level | 160 | lift | 154.149 | 119.146 | 22.707 | 165.977 | 30.38 | overspeed | 0 | 132.75 | 1.165 | 0.587 | 0.292 | 0 |
| sharp | level | 160 | brake-prepared | 125.595 | 126.945 | -1.075 | 136.037 | 7.239 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 182.106 | 129.179 | 29.064 | 225 | 52.618 | severe-overspeed | 0.823 | 132.75 | 1.634 | 1 | 0.502 | 0 |
| sharp | downhill | 160 | lift | 172.957 | 130.124 | 24.766 | 225 | 54.855 | severe-overspeed | 0.455 | 132.75 | 1.471 | 0.99 | 0.495 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.027 | 130.038 | 10.335 | 201.787 | 49.473 | overspeed | 0 | 132.75 | 1.024 | 0.861 | 0.491 | 0 |
| easy | level | 195 | full-throttle | 197.438 | 200.779 | -1.692 | 202.865 | 1.057 | overspeed | 0 | 194.85 | 0.285 | 0.053 | 0.039 | 0 |
| easy | level | 195 | lift | 188.359 | 193.411 | -2.683 | 194.8 | 0.737 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.428 | 164.74 | -3.332 | 165.975 | 0.775 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.068 | 225 | -4.134 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0.223 | 0 |
| easy | downhill | 195 | lift | 207.711 | 225 | -8.324 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0.223 | 0 |
| easy | downhill | 195 | brake-prepared | 178.899 | 222.798 | -24.539 | 225 | 1.231 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0.219 | 0 |
| medium | level | 195 | full-throttle | 197.027 | 162.486 | 17.531 | 202.865 | 20.494 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.547 | 0.334 | 0 |
| medium | level | 195 | lift | 188.082 | 162.317 | 13.699 | 194.8 | 17.271 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.442 | 0.265 | 0 |
| medium | level | 195 | brake-prepared | 159.433 | 162.813 | -2.12 | 165.975 | 1.983 | overspeed | 0 | 156.825 | 0.574 | 0.006 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 215.491 | 176.719 | 17.992 | 225 | 22.405 | severe-overspeed | 0.817 | 156.825 | 1.052 | 0.58 | 0.392 | 0 |
| medium | downhill | 195 | lift | 207.195 | 177.915 | 14.132 | 225 | 22.725 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0.391 | 0 |
| medium | downhill | 195 | brake-prepared | 178.738 | 177.618 | 0.626 | 225 | 26.509 | overspeed | 0 | 156.825 | 0.72 | 0.529 | 0.388 | 0 |
| sharp | level | 195 | full-throttle | 196.193 | 116.628 | 40.554 | 202.865 | 43.955 | severe-overspeed | 1 | 132.75 | 1.904 | 1 | 0.392 | 0 |
| sharp | level | 195 | lift | 187.133 | 116.863 | 37.551 | 194.8 | 41.648 | severe-overspeed | 0.963 | 132.75 | 1.733 | 0.997 | 0.369 | 0 |
| sharp | level | 195 | brake-prepared | 158.996 | 118.479 | 25.483 | 165.975 | 29.872 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.676 | 0.302 | 0 |
| sharp | downhill | 195 | full-throttle | 214.899 | 129.253 | 39.854 | 225 | 44.554 | severe-overspeed | 1 | 132.75 | 2.276 | 1 | 0.548 | 0 |
| sharp | downhill | 195 | lift | 206.497 | 129.231 | 37.418 | 225 | 46.378 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.54 | 0 |
| sharp | downhill | 195 | brake-prepared | 177.85 | 129.023 | 27.454 | 225 | 53.965 | severe-overspeed | 0.666 | 132.75 | 1.558 | 0.997 | 0.496 | 0 |
| easy | level | 225 | full-throttle | 224.833 | 210.175 | 6.519 | 224.918 | 6.557 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.208 | 0 |
| easy | level | 225 | lift | 217.033 | 206.929 | 4.655 | 217.476 | 4.86 | overspeed | 0 | 194.85 | 0.345 | 0.3 | 0.207 | 0 |
| easy | level | 225 | brake-prepared | 188.005 | 187.177 | 0.44 | 188.597 | 0.755 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | brake-prepared | 200.782 | 225 | -12.062 | 225 | 0 | overspeed | 0 | 194.85 | 0.294 | 0.3 | 0.222 | 0 |
| medium | level | 225 | full-throttle | 224.241 | 161.203 | 28.112 | 224.918 | 28.414 | severe-overspeed | 0.991 | 156.825 | 1.143 | 0.58 | 0.357 | 0 |
| medium | level | 225 | lift | 216.451 | 160.793 | 25.714 | 217.476 | 26.187 | severe-overspeed | 0.852 | 156.825 | 1.065 | 0.58 | 0.351 | 0 |
| medium | level | 225 | brake-prepared | 187.732 | 160.816 | 14.338 | 188.597 | 14.798 | severe-overspeed | 0.014 | 156.825 | 0.799 | 0.429 | 0.196 | 0 |
| medium | downhill | 225 | full-throttle | 224.589 | 176.826 | 21.267 | 225 | 21.45 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.392 | 0 |
| medium | downhill | 225 | lift | 224.589 | 176.825 | 21.267 | 225 | 21.45 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.392 | 0 |
| medium | downhill | 225 | brake-prepared | 200.332 | 176.434 | 11.929 | 225 | 24.243 | severe-overspeed | 0.303 | 156.825 | 0.908 | 0.58 | 0.39 | 0 |
| sharp | level | 225 | full-throttle | 223.715 | 117.237 | 47.595 | 224.918 | 48.133 | severe-overspeed | 1 | 132.75 | 2.473 | 1 | 0.459 | 0 |
| sharp | level | 225 | lift | 215.872 | 117.009 | 45.797 | 217.476 | 46.54 | severe-overspeed | 1 | 132.75 | 2.304 | 1 | 0.445 | 0 |
| sharp | level | 225 | brake-prepared | 186.782 | 116.716 | 37.512 | 188.597 | 38.484 | severe-overspeed | 0.958 | 132.75 | 1.728 | 0.992 | 0.363 | 0 |
| sharp | downhill | 225 | full-throttle | 224.064 | 129.287 | 42.299 | 225 | 42.717 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.56 | 0 |
| sharp | downhill | 225 | lift | 224.063 | 129.287 | 42.299 | 225 | 42.717 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.56 | 0 |
| sharp | downhill | 225 | brake-prepared | 199.542 | 129.057 | 35.324 | 225 | 48.082 | severe-overspeed | 1 | 132.75 | 1.965 | 1 | 0.525 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.027 | 157.338 | 0.547 | 0.693 | 533 | 0.258 | 0 |
| medium | level | 195 | brake-recovery | 197.027 | 141.182 | 0.547 | 1 | 183 | 0.26 | 0 |
| medium | downhill | 195 | lift-recovery | 215.491 | 174.561 | 0.58 | 0.555 | - | 0.39 | 0 |
| medium | downhill | 195 | brake-recovery | 215.491 | 166.348 | 0.58 | 0.907 | 250 | 0.391 | 0 |
| sharp | level | 195 | lift-recovery | 196.193 | 110.139 | 1 | 0.856 | 67 | 0.385 | 0 |
| sharp | level | 195 | brake-recovery | 196.193 | 94.301 | 1 | 1 | 67 | 0.386 | 0 |
| sharp | downhill | 195 | lift-recovery | 214.899 | 127.906 | 1 | 0.688 | 483 | 0.548 | 0 |
| sharp | downhill | 195 | brake-recovery | 214.899 | 121.729 | 1 | 1 | 150 | 0.548 | 0 |
| medium | level | 225 | lift-recovery | 224.241 | 156.042 | 0.58 | 0.678 | 617 | 0.326 | 0 |
| medium | level | 225 | brake-recovery | 224.241 | 143.895 | 0.58 | 0.996 | 200 | 0.325 | 0 |
| medium | downhill | 225 | lift-recovery | 224.589 | 174.8 | 0.58 | 0.552 | - | 0.391 | 0 |
| medium | downhill | 225 | brake-recovery | 224.589 | 166.978 | 0.58 | 0.892 | 267 | 0.391 | 0 |
| sharp | level | 225 | lift-recovery | 223.715 | 111.666 | 1 | 0.837 | 167 | 0.459 | 0 |
| sharp | level | 225 | brake-recovery | 223.715 | 97.237 | 1 | 1 | 100 | 0.459 | 0 |
| sharp | downhill | 225 | lift-recovery | 224.064 | 128.085 | 1 | 0.707 | 533 | 0.56 | 0 |
| sharp | downhill | 225 | brake-recovery | 224.064 | 122.383 | 1 | 0.999 | 150 | 0.56 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | full-throttle | 224.874 | 211.767 | 5.829 | 0.3 | 0.208 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | lift | 218.105 | 209.206 | 4.08 | 0.3 | 0.207 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | brake-prepared | 189.094 | 192.123 | -1.602 | 0 | 0 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | full-throttle | 224.423 | 169.045 | 24.676 | 0.58 | 0.377 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | lift | 220.125 | 168.833 | 23.301 | 0.58 | 0.376 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | brake-prepared | 191.362 | 167.036 | 12.712 | 0.503 | 0.361 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | full-throttle | 223.925 | 124.014 | 44.618 | 1 | 0.485 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | lift | 218.989 | 123.911 | 43.417 | 1 | 0.481 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | brake-prepared | 189.884 | 123.187 | 35.125 | 1 | 0.449 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| tse6LevelEasy225CornerLoss | yes | 5.5, 7.5 | 6.557 |
| tse6LevelMedium225CornerLoss | yes | 26, 31 | 28.414 |
| tse6LevelSharp225CornerLoss | yes | 45, 51 | 48.133 |
| tse6DownhillEasy225RawLoss | yes | -0.1, 0.1 | 0 |
| tse6DownhillMedium225RawLoss | yes | 18, 25 | 21.267 |
| tse6DownhillSharp225RawLoss | yes | 39, 46 | 42.299 |
| tse6LevelLossAboveDownhillByGrade | yes | level corner-only loss exceeds downhill by >= 5 percentage points for every grade | {"easy":6.557,"medium":6.964,"sharp":5.416} |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 48.133 > 28.414 > 6.557 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[6.557,4.86,0.755],"medium":[28.414,26.187,14.798],"sharp":[48.133,46.54,38.484]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.991, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 31.555, 66.38 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195OutwardRoadRatio | yes | 0, 0.12 | 0.039 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.053 |
| hnd4Easy225OutwardRoadRatio | yes | 0.1, 0.22 | 0.208 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| hnd4Medium225OutwardRoadRatio | yes | 0.22, 0.38 | 0.357 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225OutwardRoadRatio | yes | 0.35, 0.55 | 0.459 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4OutwardTrajectoryOrdering | yes | sharp > medium > easy | 0.459, 0.357, 0.208 |
| hnd4RoadWidthCaps | yes | {"easy":0.24,"medium":0.44,"sharp":0.56} | {"easy":0.223,"medium":0.392,"sharp":0.56} |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.678, 0.552, 0.837, 0.707 |
| hnd4BrakeRecoveryRelief | yes | >= 0.55 at 400ms | 0.996, 0.892, 1, 0.999 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.1 |
| sixtyKmhSecondGear | yes | 2 | 2 |


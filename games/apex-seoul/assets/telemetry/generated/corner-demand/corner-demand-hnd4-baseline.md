# Apex Seoul HND-4 Understeer Trajectory Failure

Generated: 2026-07-22T00:39:34.628Z

Status: **PASS**

## Control variables

- Raven 0-100km/h: 8.117s (target 7.8~8.3s)
- 60km/h: gear 2, 4958rpm
- drivetrain: physical, final drive 4.1
- gear ratios: 3.626 / 2.188 / 1.541 / 1.213 / 1 / 0.767
- HND-2 invariant: speed scrub and understeer read the same corner-demand target
- HND-3 comparison: corner-only loss uses a matched straight control with the same speed, slope and pedal preparation
- HND-4 trajectory: outward motion is normalized by available road width and capped per corner grade
- HND-4 recovery: lift/brake load transfer reduces understeer demand continuously

## Baseline observations

- easy 225 full-throttle raw loss 16.381% / corner-only 0.77% / zone overspeed
- medium 225 full-throttle raw loss 26.598% / corner-only 11.198% / severe 0.543
- sharp 225 full-throttle raw loss 44.818% / corner-only 29.704% / severe 1
- HND-4 outward/road easy 0.103 / medium 0.248 / sharp 0.384
- Bugak sharp segment 64 uses maxRoadOffset 960.096 and reaches outward road ratio 0.46
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 129.749 | 128.293 | 1.122 | 129.256 | 0.742 | within-budget | 0 | 194.85 | 0.123 | 0 | 0 | 0 |
| easy | level | 130 | lift | 119.045 | 119.026 | 0.016 | 120.179 | 0.969 | within-budget | 0 | 194.85 | 0.104 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 91.528 | 101.012 | -10.362 | 102.144 | 1.237 | within-budget | 0 | 194.85 | 0.061 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 148.445 | 180.999 | -21.931 | 181.956 | 0.645 | within-budget | 0 | 194.85 | 0.161 | 0 | 0 | 0 |
| easy | downhill | 130 | lift | 137.668 | 174.899 | -27.044 | 175.705 | 0.585 | within-budget | 0 | 194.85 | 0.138 | 0 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 109.839 | 154.011 | -40.214 | 155.009 | 0.909 | within-budget | 0 | 194.85 | 0.088 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 129.756 | 124.726 | 3.876 | 129.256 | 3.491 | within-budget | 0 | 156.825 | 0.38 | 0 | 0 | 0 |
| medium | level | 130 | lift | 119.051 | 115.05 | 3.36 | 120.179 | 4.308 | within-budget | 0 | 156.825 | 0.32 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 91.533 | 97.332 | -6.335 | 102.144 | 5.257 | within-budget | 0 | 156.825 | 0.189 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 148.452 | 174.69 | -17.674 | 181.956 | 4.895 | within-budget | 0 | 156.825 | 0.496 | 0.263 | 0.071 | 0 |
| medium | downhill | 130 | lift | 137.675 | 172.175 | -25.06 | 175.705 | 2.564 | within-budget | 0 | 156.825 | 0.426 | 0.087 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 109.845 | 150.713 | -37.205 | 155.009 | 3.911 | within-budget | 0 | 156.825 | 0.271 | 0 | 0 | 0 |
| sharp | level | 130 | full-throttle | 129.756 | 121.097 | 6.673 | 129.256 | 6.288 | within-budget | 0 | 132.75 | 0.823 | 0 | 0 | 0 |
| sharp | level | 130 | lift | 119.051 | 110.994 | 6.767 | 120.179 | 7.715 | within-budget | 0 | 132.75 | 0.692 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 91.533 | 93.675 | -2.34 | 102.144 | 9.252 | within-budget | 0 | 132.75 | 0.409 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 148.268 | 127.799 | 13.805 | 181.956 | 36.526 | overspeed | 0 | 132.75 | 1.073 | 0.848 | 0.488 | 0 |
| sharp | downhill | 130 | lift | 137.655 | 127.944 | 7.054 | 175.705 | 34.696 | overspeed | 0 | 132.75 | 0.922 | 0.768 | 0.487 | 0 |
| sharp | downhill | 130 | brake-prepared | 109.845 | 147.36 | -34.152 | 155.009 | 6.963 | within-budget | 0 | 132.75 | 0.587 | 0 | 0 | 0 |
| easy | level | 160 | full-throttle | 154.294 | 142.118 | 7.892 | 143.091 | 0.631 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | lift | 144.952 | 134.932 | 6.912 | 135.885 | 0.657 | within-budget | 0 | 194.85 | 0.154 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 117.49 | 116.407 | 0.922 | 117.621 | 1.033 | within-budget | 0 | 194.85 | 0.101 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 172.54 | 194.655 | -12.817 | 195.774 | 0.649 | within-budget | 0 | 194.85 | 0.217 | 0 | 0 | 0 |
| easy | downhill | 160 | lift | 163.305 | 188.652 | -15.521 | 189.742 | 0.667 | within-budget | 0 | 194.85 | 0.195 | 0 | 0 | 0 |
| easy | downhill | 160 | brake-prepared | 135.649 | 168.688 | -24.356 | 169.68 | 0.731 | within-budget | 0 | 194.85 | 0.134 | 0 | 0 | 0 |
| medium | level | 160 | full-throttle | 154.302 | 139.439 | 9.633 | 143.091 | 2.367 | within-budget | 0 | 156.825 | 0.538 | 0 | 0 | 0 |
| medium | level | 160 | lift | 144.959 | 131.947 | 8.977 | 135.885 | 2.717 | within-budget | 0 | 156.825 | 0.475 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 117.496 | 112.35 | 4.38 | 117.621 | 4.486 | within-budget | 0 | 156.825 | 0.312 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 172.45 | 169.554 | 1.679 | 195.774 | 15.204 | overspeed | 0 | 156.825 | 0.671 | 0.391 | 0.375 | 0 |
| medium | downhill | 160 | lift | 163.294 | 170.251 | -4.261 | 189.742 | 11.936 | overspeed | 0 | 156.825 | 0.601 | 0.366 | 0.365 | 0 |
| medium | downhill | 160 | brake-prepared | 135.656 | 166.459 | -22.707 | 169.68 | 2.374 | within-budget | 0 | 156.825 | 0.414 | 0.01 | 0 | 0 |
| sharp | level | 160 | full-throttle | 153.984 | 124.561 | 19.108 | 143.091 | 12.034 | overspeed | 0 | 132.75 | 1.165 | 0.426 | 0.137 | 0 |
| sharp | level | 160 | lift | 144.835 | 127.102 | 12.244 | 135.885 | 6.064 | overspeed | 0 | 132.75 | 1.028 | 0.177 | 0.016 | 0 |
| sharp | level | 160 | brake-prepared | 117.496 | 108.321 | 7.809 | 117.621 | 7.915 | within-budget | 0 | 132.75 | 0.675 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 171.665 | 127.72 | 25.599 | 195.774 | 39.643 | severe-overspeed | 0.408 | 132.75 | 1.452 | 0.956 | 0.489 | 0 |
| sharp | downhill | 160 | lift | 162.757 | 127.713 | 21.532 | 189.742 | 38.111 | severe-overspeed | 0.086 | 132.75 | 1.3 | 0.923 | 0.488 | 0 |
| sharp | downhill | 160 | brake-prepared | 135.649 | 127.893 | 5.718 | 169.68 | 30.805 | overspeed | 0 | 132.75 | 0.896 | 0.754 | 0.485 | 0 |
| easy | level | 195 | full-throttle | 182.034 | 156.751 | 13.889 | 157.526 | 0.426 | within-budget | 0 | 194.85 | 0.243 | 0 | 0 | 0 |
| easy | level | 195 | lift | 174.33 | 152.98 | 12.247 | 153.818 | 0.481 | within-budget | 0 | 194.85 | 0.223 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 147.045 | 135.638 | 7.757 | 136.599 | 0.654 | within-budget | 0 | 194.85 | 0.158 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 200.053 | 205.352 | -2.649 | 209.279 | 1.963 | overspeed | 0 | 194.85 | 0.293 | 0.296 | 0.208 | 0 |
| easy | downhill | 195 | lift | 192.461 | 202.526 | -5.229 | 204.341 | 0.943 | within-budget | 0 | 194.85 | 0.271 | 0.148 | 0.127 | 0 |
| easy | downhill | 195 | brake-prepared | 164.864 | 183.847 | -11.514 | 184.962 | 0.676 | within-budget | 0 | 194.85 | 0.199 | 0 | 0 | 0 |
| medium | level | 195 | full-throttle | 181.83 | 151.252 | 16.817 | 157.526 | 3.45 | overspeed | 0 | 156.825 | 0.75 | 0.314 | 0.06 | 0 |
| medium | level | 195 | lift | 174.216 | 149.57 | 14.147 | 153.818 | 2.438 | overspeed | 0 | 156.825 | 0.688 | 0.187 | 0.018 | 0 |
| medium | level | 195 | brake-prepared | 147.052 | 132.69 | 9.767 | 136.599 | 2.658 | within-budget | 0 | 156.825 | 0.489 | 0 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 199.61 | 168.14 | 15.766 | 209.279 | 20.61 | severe-overspeed | 0.286 | 156.825 | 0.904 | 0.572 | 0.384 | 0 |
| medium | downhill | 195 | lift | 192.126 | 167.889 | 12.615 | 204.341 | 18.973 | severe-overspeed | 0.079 | 156.825 | 0.836 | 0.539 | 0.381 | 0 |
| medium | downhill | 195 | brake-prepared | 164.843 | 168.158 | -2.011 | 184.962 | 10.194 | overspeed | 0 | 156.825 | 0.613 | 0.313 | 0.299 | 0 |
| sharp | level | 195 | full-throttle | 180.905 | 114.312 | 36.811 | 157.526 | 23.888 | severe-overspeed | 0.801 | 132.75 | 1.623 | 0.921 | 0.325 | 0 |
| sharp | level | 195 | lift | 173.387 | 114.707 | 33.844 | 153.818 | 22.557 | severe-overspeed | 0.498 | 132.75 | 1.488 | 0.835 | 0.31 | 0 |
| sharp | level | 195 | brake-prepared | 146.888 | 126.67 | 13.764 | 136.599 | 6.76 | overspeed | 0 | 132.75 | 1.058 | 0.227 | 0.03 | 0 |
| sharp | downhill | 195 | full-throttle | 198.813 | 127.754 | 35.741 | 209.279 | 41.006 | severe-overspeed | 1 | 132.75 | 1.954 | 1 | 0.516 | 0 |
| sharp | downhill | 195 | lift | 191.214 | 127.737 | 33.197 | 204.341 | 40.062 | severe-overspeed | 1 | 132.75 | 1.808 | 1 | 0.497 | 0 |
| sharp | downhill | 195 | brake-prepared | 164.259 | 127.558 | 22.343 | 184.962 | 34.947 | severe-overspeed | 0.131 | 132.75 | 1.326 | 0.923 | 0.488 | 0 |
| easy | level | 225 | full-throttle | 207.14 | 173.208 | 16.381 | 174.802 | 0.77 | overspeed | 0 | 194.85 | 0.315 | 0.265 | 0.103 | 0 |
| easy | level | 225 | lift | 199.674 | 168.529 | 15.598 | 169.717 | 0.595 | overspeed | 0 | 194.85 | 0.292 | 0.026 | 0.002 | 0 |
| easy | level | 225 | brake-prepared | 172.19 | 151.449 | 12.046 | 152.28 | 0.483 | within-budget | 0 | 194.85 | 0.218 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 224.861 | 212.558 | 5.471 | 225 | 5.533 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | lift | 217.521 | 210.574 | 3.194 | 220.43 | 4.531 | overspeed | 0 | 194.85 | 0.346 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | brake-prepared | 190.255 | 200.997 | -5.646 | 202.453 | 0.765 | within-budget | 0 | 194.85 | 0.265 | 0.044 | 0 | 0 |
| medium | level | 225 | full-throttle | 206.624 | 151.665 | 26.598 | 174.802 | 11.198 | severe-overspeed | 0.543 | 156.825 | 0.972 | 0.579 | 0.248 | 0 |
| medium | level | 225 | lift | 199.231 | 152.177 | 23.618 | 169.717 | 8.804 | severe-overspeed | 0.284 | 156.825 | 0.903 | 0.541 | 0.193 | 0 |
| medium | level | 225 | brake-prepared | 172.099 | 148.415 | 13.762 | 152.28 | 2.246 | overspeed | 0 | 156.825 | 0.672 | 0.15 | 0.01 | 0 |
| medium | downhill | 225 | full-throttle | 224.269 | 168.839 | 24.716 | 225 | 25.042 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.389 | 0 |
| medium | downhill | 225 | lift | 216.937 | 168.642 | 22.262 | 220.43 | 23.872 | severe-overspeed | 0.864 | 156.825 | 1.07 | 0.58 | 0.388 | 0 |
| medium | downhill | 225 | brake-prepared | 189.952 | 167.548 | 11.794 | 202.453 | 18.376 | severe-overspeed | 0.041 | 156.825 | 0.817 | 0.523 | 0.38 | 0 |
| sharp | level | 225 | full-throttle | 205.927 | 113.634 | 44.818 | 174.802 | 29.704 | severe-overspeed | 1 | 132.75 | 2.103 | 1 | 0.384 | 0 |
| sharp | level | 225 | lift | 198.433 | 113.784 | 42.659 | 169.717 | 28.187 | severe-overspeed | 1 | 132.75 | 1.953 | 1 | 0.362 | 0 |
| sharp | level | 225 | brake-prepared | 171.313 | 114.431 | 33.204 | 152.28 | 22.093 | severe-overspeed | 0.411 | 132.75 | 1.453 | 0.801 | 0.303 | 0 |
| sharp | downhill | 225 | full-throttle | 223.743 | 127.843 | 42.862 | 225 | 43.423 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.547 | 0 |
| sharp | downhill | 225 | lift | 216.363 | 127.812 | 40.927 | 220.43 | 42.807 | severe-overspeed | 1 | 132.75 | 2.314 | 1 | 0.538 | 0 |
| sharp | downhill | 225 | brake-prepared | 189.014 | 127.583 | 32.501 | 202.453 | 39.611 | severe-overspeed | 0.988 | 132.75 | 1.768 | 1 | 0.494 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 181.83 | 141.103 | 0.314 | 1 | 0 | 0.06 | 0 |
| medium | level | 195 | brake-recovery | 181.83 | 124.32 | 0.314 | 1 | 0 | 0.06 | 0 |
| medium | downhill | 195 | lift-recovery | 199.61 | 163.757 | 0.572 | 0.631 | 783 | 0.383 | 0 |
| medium | downhill | 195 | brake-recovery | 199.61 | 156.54 | 0.572 | 0.993 | 183 | 0.383 | 0 |
| sharp | level | 195 | lift-recovery | 180.905 | 104.084 | 0.921 | 0.933 | 33 | 0.324 | 0 |
| sharp | level | 195 | brake-recovery | 180.905 | 89.38 | 0.921 | 1 | 67 | 0.324 | 0 |
| sharp | downhill | 195 | lift-recovery | 198.813 | 124.169 | 1 | 0.715 | 233 | 0.516 | 0 |
| sharp | downhill | 195 | brake-recovery | 198.813 | 116.556 | 1 | 1 | 117 | 0.516 | 0 |
| medium | level | 225 | lift-recovery | 206.624 | 144.66 | 0.579 | 0.856 | 200 | 0.233 | 0 |
| medium | level | 225 | brake-recovery | 206.624 | 128.123 | 0.579 | 1 | 117 | 0.234 | 0 |
| medium | downhill | 225 | lift-recovery | 224.269 | 164.676 | 0.58 | 0.626 | - | 0.389 | 0 |
| medium | downhill | 225 | brake-recovery | 224.269 | 157.969 | 0.58 | 0.977 | 200 | 0.389 | 0 |
| sharp | level | 225 | lift-recovery | 205.927 | 104.319 | 1 | 0.914 | 33 | 0.382 | 0 |
| sharp | level | 225 | brake-recovery | 205.927 | 89.893 | 1 | 1 | 67 | 0.382 | 0 |
| sharp | downhill | 225 | lift-recovery | 223.743 | 124.543 | 1 | 0.73 | 333 | 0.547 | 0 |
| sharp | downhill | 225 | brake-recovery | 223.743 | 117.735 | 1 | 1 | 133 | 0.547 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | full-throttle | 208.631 | 177.14 | 15.094 | 0.298 | 0.173 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | lift | 201.18 | 172.75 | 14.132 | 0.056 | 0.009 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | brake-prepared | 173.713 | 154.819 | 10.877 | 0 | 0 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | full-throttle | 211.688 | 157.359 | 25.665 | 0.58 | 0.354 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | lift | 204.315 | 157.006 | 23.155 | 0.577 | 0.342 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | brake-prepared | 177.199 | 157.634 | 11.041 | 0.24 | 0.059 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | full-throttle | 210.223 | 120.251 | 42.798 | 1 | 0.46 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | lift | 202.754 | 120.086 | 40.773 | 1 | 0.449 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | brake-prepared | 175.521 | 119.547 | 31.89 | 0.893 | 0.407 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| hnd3Easy225CornerLoss | yes | 0.5, 3 | 0.77 |
| hnd3Medium225CornerLoss | yes | 6, 14 | 11.198 |
| hnd3Sharp225CornerLoss | yes | 25, 34 | 29.704 |
| hnd3Easy225DownhillRawLoss | yes | 5, 12 | 5.471 |
| hnd3Medium225DownhillRawLoss | yes | 15, 30 | 24.716 |
| hnd3Sharp225DownhillRawLoss | yes | 38, 48 | 42.862 |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 29.704 > 11.198 > 0.77 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[0.77,0.595,0.483],"medium":[11.198,8.804,2.246],"sharp":[29.704,28.187,22.093]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.543, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 6.109, 46.87 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195OutwardRoadRatio | yes | 0, 0.12 | 0 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0 |
| hnd4Easy225OutwardRoadRatio | yes | 0.1, 0.22 | 0.103 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.265 |
| hnd4Medium225OutwardRoadRatio | yes | 0.22, 0.38 | 0.248 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.579 |
| hnd4Sharp225OutwardRoadRatio | yes | 0.35, 0.55 | 0.384 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4OutwardTrajectoryOrdering | yes | sharp > medium > easy | 0.384, 0.248, 0.103 |
| hnd4RoadWidthCaps | yes | {"easy":0.24,"medium":0.44,"sharp":0.56} | {"easy":0.223,"medium":0.389,"sharp":0.547} |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.856, 0.626, 0.914, 0.73 |
| hnd4BrakeRecoveryRelief | yes | >= 0.55 at 400ms | 1, 0.977, 1, 1 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.117 |
| sixtyKmhSecondGear | yes | 2 | 2 |


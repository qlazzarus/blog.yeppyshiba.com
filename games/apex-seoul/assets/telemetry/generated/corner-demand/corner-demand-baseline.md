# Apex Seoul HND-3 Progressive Corner Speed Loss

Generated: 2026-07-21T11:34:19.379Z

Status: **PASS**

## Control variables

- Raven 0-100km/h: 8.117s (target 7.8~8.3s)
- 60km/h: gear 2, 4958rpm
- drivetrain: physical, final drive 4.1
- gear ratios: 3.626 / 2.188 / 1.541 / 1.213 / 1 / 0.767
- HND-2 invariant: speed scrub and understeer read the same corner-demand target
- HND-3 comparison: corner-only loss uses a matched straight control with the same speed, slope and pedal preparation

## Baseline observations

- easy 225 full-throttle raw loss 16.359% / corner-only 0.747% / zone overspeed
- medium 225 full-throttle raw loss 24.101% / corner-only 8.7% / severe 0.543
- sharp 225 full-throttle raw loss 35.259% / corner-only 20.145% / severe 1
- Bugak sharp segment 64 uses maxRoadOffset 960.096 and reaches outward road ratio 0.053
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
| medium | downhill | 130 | full-throttle | 148.452 | 175.991 | -18.551 | 181.956 | 4.018 | within-budget | 0 | 156.825 | 0.496 | 0.154 | 0 | 0 |
| medium | downhill | 130 | lift | 137.675 | 172.293 | -25.145 | 175.705 | 2.478 | within-budget | 0 | 156.825 | 0.426 | 0.072 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 109.845 | 150.713 | -37.205 | 155.009 | 3.911 | within-budget | 0 | 156.825 | 0.271 | 0 | 0 | 0 |
| sharp | level | 130 | full-throttle | 129.756 | 121.097 | 6.673 | 129.256 | 6.288 | within-budget | 0 | 132.75 | 0.823 | 0 | 0 | 0 |
| sharp | level | 130 | lift | 119.051 | 110.994 | 6.767 | 120.179 | 7.715 | within-budget | 0 | 132.75 | 0.692 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 91.533 | 93.675 | -2.34 | 102.144 | 9.252 | within-budget | 0 | 132.75 | 0.409 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 148.268 | 145.622 | 1.785 | 181.956 | 24.506 | overspeed | 0 | 132.75 | 1.073 | 0.436 | 0.083 | 0 |
| sharp | downhill | 130 | lift | 137.655 | 150.297 | -9.184 | 175.705 | 18.458 | overspeed | 0 | 132.75 | 0.922 | 0.415 | 0.025 | 0 |
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
| medium | downhill | 160 | full-throttle | 172.45 | 177.308 | -2.817 | 195.774 | 10.708 | overspeed | 0 | 156.825 | 0.671 | 0.263 | 0.008 | 0 |
| medium | downhill | 160 | lift | 163.294 | 177.147 | -8.483 | 189.742 | 7.713 | overspeed | 0 | 156.825 | 0.601 | 0.22 | 0 | 0 |
| medium | downhill | 160 | brake-prepared | 135.656 | 166.46 | -22.707 | 169.68 | 2.374 | within-budget | 0 | 156.825 | 0.414 | 0.01 | 0 | 0 |
| sharp | level | 160 | full-throttle | 153.984 | 130.153 | 15.476 | 143.091 | 8.402 | overspeed | 0 | 132.75 | 1.165 | 0.373 | 0 | 0 |
| sharp | level | 160 | lift | 144.835 | 127.766 | 11.785 | 135.885 | 5.606 | overspeed | 0 | 132.75 | 1.028 | 0.17 | 0 | 0 |
| sharp | level | 160 | brake-prepared | 117.496 | 108.321 | 7.809 | 117.621 | 7.915 | within-budget | 0 | 132.75 | 0.675 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 171.665 | 141.537 | 17.551 | 195.774 | 31.595 | severe-overspeed | 0.408 | 132.75 | 1.452 | 0.78 | 0.112 | 0 |
| sharp | downhill | 160 | lift | 162.757 | 142.572 | 12.402 | 189.742 | 28.982 | severe-overspeed | 0.086 | 132.75 | 1.3 | 0.64 | 0.095 | 0 |
| sharp | downhill | 160 | brake-prepared | 135.649 | 152.301 | -12.276 | 169.68 | 12.812 | overspeed | 0 | 132.75 | 0.896 | 0.256 | 0 | 0 |
| easy | level | 195 | full-throttle | 182.034 | 156.751 | 13.889 | 157.526 | 0.426 | within-budget | 0 | 194.85 | 0.243 | 0 | 0 | 0 |
| easy | level | 195 | lift | 174.33 | 152.98 | 12.247 | 153.818 | 0.481 | within-budget | 0 | 194.85 | 0.223 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 147.045 | 135.638 | 7.757 | 136.599 | 0.654 | within-budget | 0 | 194.85 | 0.158 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 200.053 | 206.026 | -2.986 | 209.279 | 1.626 | overspeed | 0 | 194.85 | 0.293 | 0 | 0 | 0 |
| easy | downhill | 195 | lift | 192.461 | 202.618 | -5.277 | 204.341 | 0.895 | within-budget | 0 | 194.85 | 0.271 | 0 | 0 | 0 |
| easy | downhill | 195 | brake-prepared | 164.864 | 183.847 | -11.514 | 184.962 | 0.676 | within-budget | 0 | 194.85 | 0.199 | 0 | 0 | 0 |
| medium | level | 195 | full-throttle | 181.83 | 152.223 | 16.283 | 157.526 | 2.916 | overspeed | 0 | 156.825 | 0.75 | 0.306 | 0 | 0 |
| medium | level | 195 | lift | 174.216 | 149.87 | 13.975 | 153.818 | 2.266 | overspeed | 0 | 156.825 | 0.688 | 0.186 | 0 | 0 |
| medium | level | 195 | brake-prepared | 147.052 | 132.69 | 9.767 | 136.599 | 2.658 | within-budget | 0 | 156.825 | 0.489 | 0 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 199.61 | 176.114 | 11.771 | 209.279 | 16.615 | severe-overspeed | 0.286 | 156.825 | 0.904 | 0.558 | 0.067 | 0 |
| medium | downhill | 195 | lift | 192.126 | 175.707 | 8.546 | 204.341 | 14.904 | severe-overspeed | 0.079 | 156.825 | 0.836 | 0.488 | 0.051 | 0 |
| medium | downhill | 195 | brake-prepared | 164.843 | 174.387 | -5.79 | 184.962 | 6.415 | overspeed | 0 | 156.825 | 0.613 | 0.154 | 0 | 0 |
| sharp | level | 195 | full-throttle | 180.905 | 132.802 | 26.59 | 157.526 | 13.667 | severe-overspeed | 0.801 | 132.75 | 1.623 | 0.793 | 0.012 | 0 |
| sharp | level | 195 | lift | 173.387 | 132.483 | 23.591 | 153.818 | 12.305 | severe-overspeed | 0.498 | 132.75 | 1.488 | 0.701 | 0.006 | 0 |
| sharp | level | 195 | brake-prepared | 146.888 | 127.773 | 13.013 | 136.599 | 6.009 | overspeed | 0 | 132.75 | 1.058 | 0.214 | 0 | 0 |
| sharp | downhill | 195 | full-throttle | 198.813 | 140.115 | 29.524 | 209.279 | 34.788 | severe-overspeed | 1 | 132.75 | 1.954 | 1 | 0.134 | 0 |
| sharp | downhill | 195 | lift | 191.214 | 140.524 | 26.51 | 204.341 | 33.375 | severe-overspeed | 1 | 132.75 | 1.808 | 0.971 | 0.127 | 0 |
| sharp | downhill | 195 | brake-prepared | 164.259 | 142.52 | 13.235 | 184.962 | 25.838 | severe-overspeed | 0.131 | 132.75 | 1.326 | 0.652 | 0.092 | 0 |
| easy | level | 225 | full-throttle | 207.14 | 173.255 | 16.359 | 174.802 | 0.747 | overspeed | 0 | 194.85 | 0.315 | 0 | 0 | 0 |
| easy | level | 225 | lift | 199.674 | 168.529 | 15.598 | 169.717 | 0.595 | overspeed | 0 | 194.85 | 0.292 | 0 | 0 | 0 |
| easy | level | 225 | brake-prepared | 172.19 | 151.449 | 12.046 | 152.28 | 0.483 | within-budget | 0 | 194.85 | 0.218 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 224.861 | 213.502 | 5.051 | 225 | 5.113 | overspeed | 0 | 194.85 | 0.37 | 0 | 0 | 0 |
| easy | downhill | 225 | lift | 217.521 | 211.51 | 2.764 | 220.43 | 4.101 | overspeed | 0 | 194.85 | 0.346 | 0 | 0 | 0 |
| easy | downhill | 225 | brake-prepared | 190.255 | 201.01 | -5.653 | 202.453 | 0.758 | within-budget | 0 | 194.85 | 0.265 | 0 | 0 | 0 |
| medium | level | 225 | full-throttle | 206.624 | 156.825 | 24.101 | 174.802 | 8.7 | severe-overspeed | 0.543 | 156.825 | 0.972 | 0.573 | 0.007 | 0 |
| medium | level | 225 | lift | 199.231 | 155.761 | 21.819 | 169.717 | 7.005 | severe-overspeed | 0.284 | 156.825 | 0.903 | 0.525 | 0.004 | 0 |
| medium | level | 225 | brake-prepared | 172.099 | 148.627 | 13.639 | 152.28 | 2.123 | overspeed | 0 | 156.825 | 0.672 | 0.148 | 0 | 0 |
| medium | downhill | 225 | full-throttle | 224.269 | 177.439 | 20.881 | 225 | 21.207 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.101 | 0 |
| medium | downhill | 225 | lift | 216.937 | 177.046 | 18.388 | 220.43 | 19.998 | severe-overspeed | 0.864 | 156.825 | 1.07 | 0.58 | 0.093 | 0 |
| medium | downhill | 225 | brake-prepared | 189.952 | 175.342 | 7.691 | 202.453 | 14.273 | severe-overspeed | 0.041 | 156.825 | 0.817 | 0.459 | 0.044 | 0 |
| sharp | level | 225 | full-throttle | 205.927 | 133.318 | 35.259 | 174.802 | 20.145 | severe-overspeed | 1 | 132.75 | 2.103 | 1 | 0.034 | 0 |
| sharp | level | 225 | lift | 198.433 | 133.215 | 32.867 | 169.717 | 18.395 | severe-overspeed | 1 | 132.75 | 1.953 | 0.973 | 0.027 | 0 |
| sharp | level | 225 | brake-prepared | 171.313 | 131.757 | 23.09 | 152.28 | 11.98 | severe-overspeed | 0.411 | 132.75 | 1.453 | 0.676 | 0.004 | 0 |
| sharp | downhill | 225 | full-throttle | 223.743 | 138.753 | 37.986 | 225 | 38.547 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.155 | 0 |
| sharp | downhill | 225 | lift | 216.363 | 139.16 | 35.682 | 220.43 | 37.562 | severe-overspeed | 1 | 132.75 | 2.314 | 1 | 0.149 | 0 |
| sharp | downhill | 225 | brake-prepared | 189.014 | 140.564 | 25.633 | 202.453 | 32.743 | severe-overspeed | 0.988 | 132.75 | 1.768 | 0.948 | 0.124 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 181.83 | 142.25 | 0.306 | 0 | 0 | 0 |
| medium | level | 195 | brake-recovery | 181.83 | 125.446 | 0.306 | 0 | 0 | 0 |
| medium | downhill | 195 | lift-recovery | 199.61 | 172.182 | 0.558 | - | 0.053 | 0 |
| medium | downhill | 195 | brake-recovery | 199.61 | 164.7 | 0.558 | 267 | 0.049 | 0 |
| sharp | level | 195 | lift-recovery | 180.905 | 123.211 | 0.793 | 50 | 0.012 | 0 |
| sharp | level | 195 | brake-recovery | 180.905 | 103.885 | 0.793 | 33 | 0.012 | 0 |
| sharp | downhill | 195 | lift-recovery | 198.813 | 140.778 | 1 | 883 | 0.101 | 0 |
| sharp | downhill | 195 | brake-recovery | 198.813 | 136.714 | 1 | 250 | 0.094 | 0 |
| medium | level | 225 | lift-recovery | 206.624 | 149.769 | 0.573 | 200 | 0.007 | 0 |
| medium | level | 225 | brake-recovery | 206.624 | 131.547 | 0.573 | 117 | 0.007 | 0 |
| medium | downhill | 225 | lift-recovery | 224.269 | 173.71 | 0.58 | - | 0.082 | 0 |
| medium | downhill | 225 | brake-recovery | 224.269 | 166.225 | 0.58 | 350 | 0.07 | 0 |
| sharp | level | 225 | lift-recovery | 205.927 | 125.026 | 1 | 167 | 0.034 | 0 |
| sharp | level | 225 | brake-recovery | 205.927 | 106.546 | 1 | 100 | 0.034 | 0 |
| sharp | downhill | 225 | lift-recovery | 223.743 | 138.988 | 1 | - | 0.129 | 0 |
| sharp | downhill | 225 | brake-recovery | 223.743 | 137.857 | 1 | 300 | 0.111 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | full-throttle | 208.631 | 177.259 | 15.037 | 0 | 0 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | lift | 201.18 | 172.753 | 14.13 | 0 | 0 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | brake-prepared | 173.713 | 154.819 | 10.877 | 0 | 0 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | full-throttle | 211.688 | 165.109 | 22.003 | 0.58 | 0.019 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | lift | 204.315 | 164.205 | 19.632 | 0.57 | 0.013 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | brake-prepared | 177.199 | 158.652 | 10.467 | 0.233 | 0 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | full-throttle | 210.223 | 138.198 | 34.261 | 1 | 0.053 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | lift | 202.754 | 138.418 | 31.731 | 1 | 0.045 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | brake-prepared | 175.521 | 138.775 | 20.935 | 0.763 | 0.015 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| hnd3Easy225CornerLoss | yes | 0.5, 3 | 0.747 |
| hnd3Medium225CornerLoss | yes | 6, 12 | 8.7 |
| hnd3Sharp225CornerLoss | yes | 16, 25 | 20.145 |
| hnd3Easy225DownhillRawLoss | yes | 5, 12 | 5.051 |
| hnd3Medium225DownhillRawLoss | yes | 15, 25 | 20.881 |
| hnd3Sharp225DownhillRawLoss | yes | 25, 38 | 37.986 |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 20.145 > 8.7 > 0.747 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[0.747,0.595,0.483],"medium":[8.7,7.005,2.123],"sharp":[20.145,18.395,11.98]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.543, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 3.446, 20.422 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.117 |
| sixtyKmhSecondGear | yes | 2 | 2 |


# Apex Seoul HND-4 Understeer Trajectory Failure

Generated: 2026-07-22T03:03:27.781Z

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
- medium 225 full-throttle raw loss 26.85% / corner-only 11.45% / severe 0.543
- sharp 225 full-throttle raw loss 44.828% / corner-only 29.714% / severe 1
- HND-4 outward/road easy 0.103 / medium 0.248 / sharp 0.383
- Bugak sharp segment 64 uses maxRoadOffset 960.096 and reaches outward road ratio 0.46
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 132.485 | 135.911 | -2.585 | 136.689 | 0.587 | within-budget | 0 | 194.85 | 0.128 | 0 | 0 | 0 |
| easy | level | 130 | lift | 120.26 | 128.044 | -6.473 | 128.996 | 0.792 | within-budget | 0 | 194.85 | 0.106 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 92.534 | 102.087 | -10.323 | 103.22 | 1.224 | within-budget | 0 | 194.85 | 0.063 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 149.151 | 181.397 | -21.62 | 182.358 | 0.644 | within-budget | 0 | 194.85 | 0.162 | 0 | 0 | 0 |
| easy | downhill | 130 | lift | 138.58 | 175.377 | -26.553 | 176.089 | 0.514 | within-budget | 0 | 194.85 | 0.14 | 0 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 111.399 | 158.945 | -42.681 | 159.824 | 0.789 | within-budget | 0 | 194.85 | 0.09 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 132.492 | 133.121 | -0.475 | 136.689 | 2.693 | within-budget | 0 | 156.825 | 0.396 | 0 | 0 | 0 |
| medium | level | 130 | lift | 120.266 | 124.512 | -3.531 | 128.996 | 3.728 | within-budget | 0 | 156.825 | 0.326 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 92.539 | 98.395 | -6.328 | 103.22 | 5.214 | within-budget | 0 | 156.825 | 0.193 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 149.158 | 174.647 | -17.088 | 182.358 | 5.17 | within-budget | 0 | 156.825 | 0.501 | 0.276 | 0.088 | 0 |
| medium | downhill | 130 | lift | 138.587 | 172.516 | -24.482 | 176.089 | 2.578 | within-budget | 0 | 156.825 | 0.432 | 0.097 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 111.404 | 156.146 | -40.162 | 159.824 | 3.301 | within-budget | 0 | 156.825 | 0.279 | 0 | 0 | 0 |
| sharp | level | 130 | full-throttle | 132.492 | 130.236 | 1.703 | 136.689 | 4.87 | within-budget | 0 | 132.75 | 0.857 | 0 | 0 | 0 |
| sharp | level | 130 | lift | 120.266 | 120.858 | -0.492 | 128.996 | 6.767 | within-budget | 0 | 132.75 | 0.706 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 92.539 | 94.706 | -2.342 | 103.22 | 9.2 | within-budget | 0 | 132.75 | 0.418 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 148.96 | 127.8 | 14.205 | 182.358 | 36.626 | overspeed | 0 | 132.75 | 1.083 | 0.854 | 0.488 | 0 |
| sharp | downhill | 130 | lift | 138.558 | 127.905 | 7.689 | 176.089 | 34.775 | overspeed | 0 | 132.75 | 0.935 | 0.776 | 0.487 | 0 |
| sharp | downhill | 130 | brake-prepared | 111.404 | 152.699 | -37.068 | 159.824 | 6.396 | within-budget | 0 | 132.75 | 0.603 | 0.083 | 0 | 0 |
| easy | level | 160 | full-throttle | 156.3 | 148.617 | 4.915 | 149.571 | 0.61 | within-budget | 0 | 194.85 | 0.179 | 0 | 0 | 0 |
| easy | level | 160 | lift | 145.777 | 141.141 | 3.18 | 142.098 | 0.656 | within-budget | 0 | 194.85 | 0.156 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 118.172 | 117.047 | 0.952 | 118.254 | 1.021 | within-budget | 0 | 194.85 | 0.102 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 174.006 | 195.52 | -12.364 | 196.641 | 0.644 | within-budget | 0 | 194.85 | 0.221 | 0 | 0 | 0 |
| easy | downhill | 160 | lift | 164.046 | 189.831 | -15.718 | 190.895 | 0.649 | within-budget | 0 | 194.85 | 0.196 | 0 | 0 | 0 |
| easy | downhill | 160 | brake-prepared | 136.718 | 174.379 | -27.546 | 175.342 | 0.704 | within-budget | 0 | 194.85 | 0.136 | 0 | 0 | 0 |
| medium | level | 160 | full-throttle | 156.308 | 146.205 | 6.463 | 149.571 | 2.153 | within-budget | 0 | 156.825 | 0.552 | 0 | 0 | 0 |
| medium | level | 160 | lift | 145.784 | 138.332 | 5.112 | 142.098 | 2.583 | within-budget | 0 | 156.825 | 0.48 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 118.178 | 112.993 | 4.388 | 118.254 | 4.452 | within-budget | 0 | 156.825 | 0.316 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 173.9 | 170.679 | 1.852 | 196.641 | 14.929 | overspeed | 0 | 156.825 | 0.682 | 0.414 | 0.377 | 0 |
| medium | downhill | 160 | lift | 164.031 | 170.966 | -4.228 | 190.895 | 12.15 | overspeed | 0 | 156.825 | 0.606 | 0.382 | 0.375 | 0 |
| medium | downhill | 160 | brake-prepared | 136.725 | 171.762 | -25.626 | 175.342 | 2.618 | within-budget | 0 | 156.825 | 0.421 | 0.076 | 0 | 0 |
| sharp | level | 160 | full-throttle | 155.945 | 121.039 | 22.383 | 149.571 | 18.296 | overspeed | 0 | 132.75 | 1.195 | 0.506 | 0.213 | 0 |
| sharp | level | 160 | lift | 145.646 | 130.71 | 10.255 | 142.098 | 7.819 | overspeed | 0 | 132.75 | 1.039 | 0.2 | 0.027 | 0 |
| sharp | level | 160 | brake-prepared | 118.178 | 108.953 | 7.806 | 118.254 | 7.87 | within-budget | 0 | 132.75 | 0.683 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 173.085 | 127.831 | 26.145 | 196.641 | 39.755 | severe-overspeed | 0.468 | 132.75 | 1.476 | 0.966 | 0.491 | 0 |
| sharp | downhill | 160 | lift | 163.474 | 127.821 | 21.81 | 190.895 | 38.584 | severe-overspeed | 0.104 | 132.75 | 1.311 | 0.935 | 0.49 | 0 |
| sharp | downhill | 160 | brake-prepared | 136.712 | 127.888 | 6.454 | 175.342 | 34.711 | overspeed | 0 | 132.75 | 0.91 | 0.772 | 0.487 | 0 |
| easy | level | 195 | full-throttle | 184.108 | 163.225 | 11.343 | 164.316 | 0.593 | within-budget | 0 | 194.85 | 0.248 | 0 | 0 | 0 |
| easy | level | 195 | lift | 175.159 | 157.075 | 10.325 | 158.13 | 0.602 | within-budget | 0 | 194.85 | 0.225 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 147.724 | 136.182 | 7.813 | 137.145 | 0.652 | within-budget | 0 | 194.85 | 0.16 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 201.822 | 208.175 | -3.148 | 212.936 | 2.359 | overspeed | 0 | 194.85 | 0.298 | 0.3 | 0.209 | 0 |
| easy | downhill | 195 | lift | 193.231 | 205.565 | -6.383 | 208.327 | 1.429 | within-budget | 0 | 194.85 | 0.273 | 0.298 | 0.209 | 0 |
| easy | downhill | 195 | brake-prepared | 165.947 | 190.07 | -14.537 | 191.186 | 0.673 | within-budget | 0 | 194.85 | 0.201 | 0 | 0 | 0 |
| medium | level | 195 | full-throttle | 183.88 | 153.717 | 16.404 | 164.316 | 5.764 | overspeed | 0 | 156.825 | 0.767 | 0.351 | 0.083 | 0 |
| medium | level | 195 | lift | 175.037 | 152.089 | 13.11 | 158.13 | 3.451 | overspeed | 0 | 156.825 | 0.694 | 0.201 | 0.024 | 0 |
| medium | level | 195 | brake-prepared | 147.731 | 133.254 | 9.8 | 137.145 | 2.634 | within-budget | 0 | 156.825 | 0.494 | 0 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 201.36 | 170.533 | 15.309 | 212.936 | 21.058 | severe-overspeed | 0.344 | 156.825 | 0.919 | 0.578 | 0.386 | 0 |
| medium | downhill | 195 | lift | 192.885 | 170.323 | 11.697 | 208.327 | 19.703 | severe-overspeed | 0.095 | 156.825 | 0.842 | 0.552 | 0.383 | 0 |
| medium | downhill | 195 | brake-prepared | 165.918 | 169.667 | -2.26 | 191.186 | 12.97 | overspeed | 0 | 156.825 | 0.621 | 0.362 | 0.372 | 0 |
| sharp | level | 195 | full-throttle | 182.939 | 114.154 | 37.6 | 164.316 | 27.42 | severe-overspeed | 0.867 | 132.75 | 1.659 | 0.947 | 0.332 | 0 |
| sharp | level | 195 | lift | 174.194 | 114.554 | 34.238 | 158.13 | 25.016 | severe-overspeed | 0.531 | 132.75 | 1.502 | 0.858 | 0.314 | 0 |
| sharp | level | 195 | brake-prepared | 147.553 | 126.062 | 14.565 | 137.145 | 7.511 | overspeed | 0 | 132.75 | 1.068 | 0.243 | 0.036 | 0 |
| sharp | downhill | 195 | full-throttle | 200.586 | 127.543 | 36.415 | 212.936 | 42.572 | severe-overspeed | 1 | 132.75 | 1.989 | 1 | 0.524 | 0 |
| sharp | downhill | 195 | lift | 191.984 | 127.535 | 33.57 | 208.327 | 42.083 | severe-overspeed | 1 | 132.75 | 1.822 | 1 | 0.501 | 0 |
| sharp | downhill | 195 | brake-prepared | 165.304 | 127.385 | 22.939 | 191.186 | 38.596 | severe-overspeed | 0.162 | 132.75 | 1.343 | 0.932 | 0.488 | 0 |
| easy | level | 225 | full-throttle | 207.14 | 173.208 | 16.381 | 174.802 | 0.77 | overspeed | 0 | 194.85 | 0.315 | 0.265 | 0.103 | 0 |
| easy | level | 225 | lift | 199.674 | 168.529 | 15.598 | 169.717 | 0.595 | overspeed | 0 | 194.85 | 0.292 | 0.026 | 0.002 | 0 |
| easy | level | 225 | brake-prepared | 172.19 | 150.63 | 12.521 | 151.412 | 0.454 | within-budget | 0 | 194.85 | 0.218 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 224.861 | 212.558 | 5.471 | 225 | 5.533 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | lift | 217.521 | 210.574 | 3.194 | 220.43 | 4.531 | overspeed | 0 | 194.85 | 0.346 | 0.3 | 0.223 | 0 |
| easy | downhill | 225 | brake-prepared | 190.255 | 200.997 | -5.646 | 202.453 | 0.765 | within-budget | 0 | 194.85 | 0.265 | 0.044 | 0 | 0 |
| medium | level | 225 | full-throttle | 206.624 | 151.144 | 26.85 | 174.802 | 11.45 | severe-overspeed | 0.543 | 156.825 | 0.972 | 0.579 | 0.248 | 0 |
| medium | level | 225 | lift | 199.231 | 151.524 | 23.946 | 169.717 | 9.132 | severe-overspeed | 0.284 | 156.825 | 0.903 | 0.541 | 0.193 | 0 |
| medium | level | 225 | brake-prepared | 172.099 | 147.663 | 14.199 | 151.412 | 2.178 | overspeed | 0 | 156.825 | 0.672 | 0.15 | 0.01 | 0 |
| medium | downhill | 225 | full-throttle | 224.269 | 168.839 | 24.716 | 225 | 25.042 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.389 | 0 |
| medium | downhill | 225 | lift | 216.937 | 168.642 | 22.262 | 220.43 | 23.872 | severe-overspeed | 0.864 | 156.825 | 1.07 | 0.58 | 0.388 | 0 |
| medium | downhill | 225 | brake-prepared | 189.952 | 167.548 | 11.794 | 202.453 | 18.376 | severe-overspeed | 0.041 | 156.825 | 0.817 | 0.523 | 0.38 | 0 |
| sharp | level | 225 | full-throttle | 205.927 | 113.613 | 44.828 | 174.802 | 29.714 | severe-overspeed | 1 | 132.75 | 2.103 | 1 | 0.383 | 0 |
| sharp | level | 225 | lift | 198.433 | 113.759 | 42.671 | 169.717 | 28.2 | severe-overspeed | 1 | 132.75 | 1.953 | 1 | 0.361 | 0 |
| sharp | level | 225 | brake-prepared | 171.313 | 114.432 | 33.203 | 151.412 | 21.586 | severe-overspeed | 0.411 | 132.75 | 1.453 | 0.8 | 0.302 | 0 |
| sharp | downhill | 225 | full-throttle | 223.743 | 127.578 | 42.98 | 225 | 43.542 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.547 | 0 |
| sharp | downhill | 225 | lift | 216.363 | 127.564 | 41.042 | 220.43 | 42.921 | severe-overspeed | 1 | 132.75 | 2.314 | 1 | 0.538 | 0 |
| sharp | downhill | 225 | brake-prepared | 189.014 | 127.394 | 32.601 | 202.453 | 39.711 | severe-overspeed | 0.988 | 132.75 | 1.768 | 1 | 0.493 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 183.88 | 142.815 | 0.351 | 0.992 | 0 | 0.083 | 0 |
| medium | level | 195 | brake-recovery | 183.88 | 125.788 | 0.351 | 1 | 50 | 0.083 | 0 |
| medium | downhill | 195 | lift-recovery | 201.36 | 165.52 | 0.578 | 0.629 | - | 0.385 | 0 |
| medium | downhill | 195 | brake-recovery | 201.36 | 157.041 | 0.578 | 0.989 | 183 | 0.385 | 0 |
| sharp | level | 195 | lift-recovery | 182.939 | 103.941 | 0.947 | 0.922 | 33 | 0.331 | 0 |
| sharp | level | 195 | brake-recovery | 182.939 | 89.222 | 0.947 | 1 | 67 | 0.331 | 0 |
| sharp | downhill | 195 | lift-recovery | 200.586 | 124.207 | 1 | 0.717 | 250 | 0.524 | 0 |
| sharp | downhill | 195 | brake-recovery | 200.586 | 116.681 | 1 | 1 | 117 | 0.524 | 0 |
| medium | level | 225 | lift-recovery | 206.624 | 144.659 | 0.579 | 0.856 | 200 | 0.233 | 0 |
| medium | level | 225 | brake-recovery | 206.624 | 127.396 | 0.579 | 1 | 117 | 0.234 | 0 |
| medium | downhill | 225 | lift-recovery | 224.269 | 164.676 | 0.58 | 0.626 | - | 0.389 | 0 |
| medium | downhill | 225 | brake-recovery | 224.269 | 157.967 | 0.58 | 0.977 | 200 | 0.389 | 0 |
| sharp | level | 225 | lift-recovery | 205.927 | 104.258 | 1 | 0.915 | 33 | 0.382 | 0 |
| sharp | level | 225 | brake-recovery | 205.927 | 89.803 | 1 | 1 | 67 | 0.382 | 0 |
| sharp | downhill | 225 | lift-recovery | 223.743 | 124.542 | 1 | 0.73 | 333 | 0.547 | 0 |
| sharp | downhill | 225 | brake-recovery | 223.743 | 117.731 | 1 | 1 | 133 | 0.547 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | full-throttle | 208.631 | 177.14 | 15.094 | 0.298 | 0.173 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | lift | 201.18 | 172.75 | 14.132 | 0.056 | 0.009 |
| 25 | easy | 0.22 | 5.47 | 960 | 1090 | brake-prepared | 173.713 | 153.787 | 11.47 | 0 | 0 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | full-throttle | 211.688 | 157.031 | 25.819 | 0.58 | 0.354 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | lift | 204.315 | 156.512 | 23.397 | 0.577 | 0.342 |
| 31 | medium | 0.365 | 18.475 | 913.801 | 1043.801 | brake-prepared | 177.199 | 157.097 | 11.344 | 0.24 | 0.059 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | full-throttle | 210.223 | 120.172 | 42.836 | 1 | 0.46 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | lift | 202.754 | 120.01 | 40.81 | 1 | 0.448 |
| 64 | sharp | -0.567 | 15.247 | 830.096 | 960.096 | brake-prepared | 175.521 | 119.48 | 31.928 | 0.892 | 0.406 |

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
| hnd3Medium225CornerLoss | yes | 6, 14 | 11.45 |
| hnd3Sharp225CornerLoss | yes | 25, 34 | 29.714 |
| hnd3Easy225DownhillRawLoss | yes | 5, 12 | 5.471 |
| hnd3Medium225DownhillRawLoss | yes | 15, 30 | 24.716 |
| hnd3Sharp225DownhillRawLoss | yes | 38, 48 | 42.98 |
| hnd3CornerLossGradeOrdering | yes | sharp > medium > easy | 29.714 > 11.45 > 0.77 |
| hnd3PreparedLossRelief | yes | full-throttle > lift > brake-prepared | {"easy":[0.77,0.595,0.454],"medium":[11.45,9.132,2.178],"sharp":[29.714,28.2,21.586]} |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.543, severe-overspeed/1 |
| hnd3SevereScrubProgression | yes | easy = 0 < medium < sharp | 0, 6.109, 46.836 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195OutwardRoadRatio | yes | 0, 0.12 | 0 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0 |
| hnd4Easy225OutwardRoadRatio | yes | 0.1, 0.22 | 0.103 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.265 |
| hnd4Medium225OutwardRoadRatio | yes | 0.22, 0.38 | 0.248 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.579 |
| hnd4Sharp225OutwardRoadRatio | yes | 0.35, 0.55 | 0.383 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4OutwardTrajectoryOrdering | yes | sharp > medium > easy | 0.383, 0.248, 0.103 |
| hnd4RoadWidthCaps | yes | {"easy":0.24,"medium":0.44,"sharp":0.56} | {"easy":0.223,"medium":0.389,"sharp":0.547} |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.856, 0.626, 0.915, 0.73 |
| hnd4BrakeRecoveryRelief | yes | >= 0.55 at 400ms | 1, 0.977, 1, 1 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.117 |
| sixtyKmhSecondGear | yes | 2 | 2 |


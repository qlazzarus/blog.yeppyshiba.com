# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-07-31T08:48:14.934Z

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

- easy 225 full-throttle raw loss 1.497% / corner-only 1.478% / zone overspeed
- medium 225 full-throttle raw loss 4.97% / corner-only 4.946% / severe 0.991
- sharp 225 full-throttle raw loss 15.187% / corner-only 15.163% / severe 1
- HND-4 outward/road easy 0 / medium 0 / sharp 0.406
- Bugak sharp segment 31 uses maxRoadOffset 808.32 and reaches outward road ratio 0.397
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.825 | 146.057 | -6.747 | 148.865 | 2.052 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.538 | 138.849 | -10.603 | 140.895 | 1.63 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.778 | 109.374 | -13.015 | 112.439 | 3.167 | within-budget | 0 | 194.85 | 0.068 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.872 | 207.384 | -33.907 | 210.292 | 1.878 | within-budget | 0 | 194.85 | 0.175 | 0.223 | 0 | 0 |
| easy | downhill | 130 | lift | 144.654 | 198.481 | -37.211 | 201.333 | 1.972 | within-budget | 0 | 194.85 | 0.152 | 0 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.669 | 171.432 | -48.209 | 174.283 | 2.465 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.832 | 136.931 | -0.072 | 148.865 | 8.722 | within-budget | 0 | 156.825 | 0.422 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.544 | 128.694 | -2.509 | 140.895 | 9.719 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.783 | 97.02 | -0.245 | 112.439 | 15.932 | within-budget | 0 | 156.825 | 0.211 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.88 | 199.184 | -28.606 | 210.292 | 7.172 | within-budget | 0 | 156.825 | 0.539 | 0.465 | 0 | 0 |
| medium | downhill | 130 | lift | 144.661 | 189.723 | -31.15 | 201.333 | 8.026 | within-budget | 0 | 156.825 | 0.47 | 0.268 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 115.675 | 160.043 | -38.356 | 174.283 | 12.31 | within-budget | 0 | 156.825 | 0.301 | 0 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.832 | 125.504 | 8.279 | 148.865 | 17.073 | overspeed | 0 | 132.75 | 0.913 | 0.024 | 0 | 0 |
| sharp | level | 130 | lift | 125.544 | 114.498 | 8.798 | 140.895 | 21.026 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.783 | 81.853 | 15.427 | 112.439 | 31.603 | within-budget | 0 | 132.75 | 0.457 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.88 | 181.662 | -17.292 | 210.292 | 18.485 | overspeed | 0 | 132.75 | 1.166 | 1 | 0.301 | 0 |
| sharp | downhill | 130 | lift | 144.661 | 177.06 | -22.396 | 201.333 | 16.779 | overspeed | 0 | 132.75 | 1.017 | 1 | 0.139 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.675 | 145.322 | -25.629 | 174.283 | 25.037 | within-budget | 0 | 132.75 | 0.65 | 0 | 0 | 0 |
| easy | level | 160 | full-throttle | 164.647 | 172.107 | -4.531 | 174.878 | 1.683 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.459 | 163.192 | -5.654 | 165.977 | 1.803 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.588 | 133.189 | -6.052 | 136.037 | 2.268 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.249 | 225 | -22.784 | 225 | 0 | within-budget | 0 | 194.85 | 0.245 | 0.3 | 0 | 0 |
| easy | downhill | 160 | lift | 173.869 | 222.896 | -28.198 | 225 | 1.21 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0 | 0 |
| easy | downhill | 160 | brake-prepared | 145.139 | 198.919 | -37.054 | 201.787 | 1.976 | within-budget | 0 | 194.85 | 0.153 | 0 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.655 | 163.329 | 0.805 | 174.878 | 7.014 | overspeed | 0 | 156.825 | 0.612 | 0.048 | 0 | 0 |
| medium | level | 160 | lift | 154.467 | 153.017 | 0.938 | 165.977 | 8.39 | within-budget | 0 | 156.825 | 0.538 | 0 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.595 | 120.703 | 3.895 | 136.037 | 12.209 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.258 | 223.588 | -22.007 | 225 | 0.77 | overspeed | 0 | 156.825 | 0.756 | 0.58 | 0 | 0 |
| medium | downhill | 160 | lift | 173.877 | 215.577 | -23.982 | 225 | 5.419 | overspeed | 0 | 156.825 | 0.68 | 0.58 | 0 | 0 |
| medium | downhill | 160 | brake-prepared | 145.146 | 190.173 | -31.022 | 201.787 | 8.002 | within-budget | 0 | 156.825 | 0.474 | 0.277 | 0 | 0 |
| sharp | level | 160 | full-throttle | 164.655 | 148.986 | 9.516 | 174.878 | 15.725 | severe-overspeed | 0.125 | 132.75 | 1.324 | 0.815 | 0.215 | 0 |
| sharp | level | 160 | lift | 154.467 | 138.995 | 10.017 | 165.977 | 17.468 | overspeed | 0 | 132.75 | 1.165 | 0.462 | 0 | 0 |
| sharp | level | 160 | brake-prepared | 125.595 | 105.493 | 16.006 | 136.037 | 24.319 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 183.258 | 203.543 | -11.069 | 225 | 11.709 | severe-overspeed | 0.823 | 132.75 | 1.634 | 1 | 0.378 | 0 |
| sharp | downhill | 160 | lift | 173.877 | 195.597 | -12.491 | 225 | 16.91 | severe-overspeed | 0.455 | 132.75 | 1.471 | 1 | 0.361 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.146 | 177.614 | -22.369 | 201.787 | 16.654 | overspeed | 0 | 132.75 | 1.024 | 1 | 0.145 | 0 |
| easy | level | 195 | full-throttle | 197.44 | 199.838 | -1.214 | 202.865 | 1.533 | overspeed | 0 | 194.85 | 0.285 | 0.004 | 0 | 0 |
| easy | level | 195 | lift | 188.359 | 191.75 | -1.801 | 194.8 | 1.619 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.428 | 162.999 | -2.239 | 165.975 | 1.867 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.145 | 225 | -4.097 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0 | 0 |
| easy | downhill | 195 | lift | 207.744 | 225 | -8.307 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0 | 0 |
| easy | downhill | 195 | brake-prepared | 178.899 | 225 | -25.769 | 225 | 0 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0 | 0 |
| medium | level | 195 | full-throttle | 197.45 | 192.246 | 2.636 | 202.865 | 5.378 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.566 | 0 | 0 |
| medium | level | 195 | lift | 188.368 | 183.937 | 2.352 | 194.8 | 5.767 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.459 | 0 | 0 |
| medium | level | 195 | brake-prepared | 159.437 | 152.689 | 4.232 | 165.975 | 8.333 | overspeed | 0 | 156.825 | 0.574 | 0.006 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 216.156 | 225 | -4.092 | 225 | 0 | severe-overspeed | 0.817 | 156.825 | 1.052 | 0.58 | 0 | 0 |
| medium | downhill | 195 | lift | 207.754 | 225 | -8.301 | 225 | 0 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0 | 0 |
| medium | downhill | 195 | brake-prepared | 178.908 | 219.956 | -22.944 | 225 | 2.819 | overspeed | 0 | 156.825 | 0.72 | 0.58 | 0 | 0 |
| sharp | level | 195 | full-throttle | 197.45 | 170.63 | 13.583 | 202.865 | 16.326 | severe-overspeed | 1 | 132.75 | 1.904 | 1 | 0.415 | 0 |
| sharp | level | 195 | lift | 188.368 | 162.138 | 13.925 | 194.8 | 17.339 | severe-overspeed | 0.963 | 132.75 | 1.733 | 1 | 0.449 | 0 |
| sharp | level | 195 | brake-prepared | 159.437 | 138.224 | 13.305 | 165.975 | 17.406 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.601 | 0.037 | 0 |
| sharp | downhill | 195 | full-throttle | 216.156 | 224.717 | -3.961 | 225 | 0.131 | severe-overspeed | 1 | 132.75 | 2.276 | 1 | 0.406 | 0 |
| sharp | downhill | 195 | lift | 207.754 | 221.853 | -6.786 | 225 | 1.515 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.4 | 0 |
| sharp | downhill | 195 | brake-prepared | 178.908 | 199.961 | -11.768 | 225 | 13.995 | severe-overspeed | 0.666 | 132.75 | 1.558 | 1 | 0.371 | 0 |
| easy | level | 225 | full-throttle | 224.96 | 221.592 | 1.497 | 224.918 | 1.478 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | level | 225 | lift | 217.117 | 214.192 | 1.347 | 217.476 | 1.513 | overspeed | 0 | 194.85 | 0.345 | 0.3 | 0 | 0 |
| easy | level | 225 | brake-prepared | 188.005 | 185.45 | 1.359 | 188.597 | 1.674 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | brake-prepared | 200.789 | 225 | -12.058 | 225 | 0 | overspeed | 0 | 194.85 | 0.294 | 0.3 | 0 | 0 |
| medium | level | 225 | full-throttle | 224.972 | 213.79 | 4.97 | 224.918 | 4.946 | severe-overspeed | 0.991 | 156.825 | 1.143 | 0.58 | 0 | 0 |
| medium | level | 225 | lift | 217.128 | 206.339 | 4.969 | 217.476 | 5.129 | severe-overspeed | 0.852 | 156.825 | 1.065 | 0.58 | 0 | 0 |
| medium | level | 225 | brake-prepared | 188.014 | 177.193 | 5.756 | 188.597 | 6.066 | severe-overspeed | 0.014 | 156.825 | 0.799 | 0.445 | 0 | 0 |
| medium | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0 | 0 |
| medium | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0 | 0 |
| medium | downhill | 225 | brake-prepared | 200.799 | 225 | -12.052 | 225 | 0 | severe-overspeed | 0.303 | 156.825 | 0.908 | 0.58 | 0 | 0 |
| sharp | level | 225 | full-throttle | 224.972 | 190.805 | 15.187 | 224.918 | 15.163 | severe-overspeed | 1 | 132.75 | 2.473 | 1 | 0.406 | 0 |
| sharp | level | 225 | lift | 217.128 | 183.58 | 15.451 | 217.476 | 15.611 | severe-overspeed | 1 | 132.75 | 2.304 | 1 | 0.4 | 0 |
| sharp | level | 225 | brake-prepared | 188.014 | 155.274 | 17.414 | 188.597 | 17.724 | severe-overspeed | 0.958 | 132.75 | 1.728 | 1 | 0.448 | 0 |
| sharp | downhill | 225 | full-throttle | 225 | 224.712 | 0.128 | 225 | 0.128 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.41 | 0 |
| sharp | downhill | 225 | lift | 225 | 224.712 | 0.128 | 225 | 0.128 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.41 | 0 |
| sharp | downhill | 225 | brake-prepared | 200.799 | 214.582 | -6.864 | 225 | 5.188 | severe-overspeed | 1 | 132.75 | 1.965 | 1 | 0.394 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.45 | 180.265 | 0.566 | 0.546 | - | 0 | 0 |
| medium | level | 195 | brake-recovery | 197.45 | 158.212 | 0.566 | 0.955 | 250 | 0 | 0 |
| medium | downhill | 195 | lift-recovery | 216.156 | 225 | 0.58 | 0.45 | - | 0 | 0 |
| medium | downhill | 195 | brake-recovery | 216.156 | 214.663 | 0.58 | 0.45 | - | 0 | 0 |
| sharp | level | 195 | lift-recovery | 197.45 | 158.447 | 1 | 0.45 | - | 0.419 | 0 |
| sharp | level | 195 | brake-recovery | 197.45 | 138.065 | 1 | 0.5 | - | 0.346 | 0 |
| sharp | downhill | 195 | lift-recovery | 216.156 | 218.27 | 1 | 0.45 | - | 0.402 | 0 |
| sharp | downhill | 195 | brake-recovery | 216.156 | 196.572 | 1 | 0.49 | - | 0.403 | 0 |
| medium | level | 225 | lift-recovery | 224.972 | 203.417 | 0.58 | 0.45 | - | 0 | 0 |
| medium | level | 225 | brake-recovery | 224.972 | 181.543 | 0.58 | 0.541 | - | 0 | 0 |
| medium | downhill | 225 | lift-recovery | 225 | 225 | 0.58 | 0.45 | - | 0 | 0 |
| medium | downhill | 225 | brake-recovery | 225 | 214.663 | 0.58 | 0.45 | - | 0 | 0 |
| sharp | level | 225 | lift-recovery | 224.972 | 180.379 | 1 | 0.45 | - | 0.404 | 0 |
| sharp | level | 225 | brake-recovery | 224.972 | 158.215 | 1 | 0.49 | - | 0.484 | 0 |
| sharp | downhill | 225 | lift-recovery | 225 | 218.106 | 1 | 0.45 | - | 0.405 | 0 |
| sharp | downhill | 225 | brake-recovery | 225 | 196.404 | 1 | 0.49 | - | 0.406 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | full-throttle | 225 | 225 | 0 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | lift | 218.259 | 219.283 | -0.469 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | brake-prepared | 189.148 | 190.702 | -0.822 | 0 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | full-throttle | 225 | 219.939 | 2.249 | 0.58 | 0.077 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | lift | 219.38 | 214.621 | 2.169 | 0.58 | 0.072 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | brake-prepared | 190.27 | 185.872 | 2.312 | 0.486 | 0 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | full-throttle | 225 | 199.831 | 11.186 | 1 | 0.397 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | lift | 219.264 | 194.595 | 11.251 | 1 | 0.392 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | brake-prepared | 190.154 | 166.935 | 12.211 | 1 | 0.415 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.991, severe-overspeed/1 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.004 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.45, 0.45, 0.45, 0.45 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.1 |
| sixtyKmhSecondGear | yes | 2 | 2 |
| hr3hDirectOverspeedTranslationRemoved | yes | 0 | 0 |
| hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 47.213 |


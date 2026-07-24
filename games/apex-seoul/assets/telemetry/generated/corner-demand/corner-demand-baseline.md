# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-07-24T05:03:46.918Z

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

- easy 225 full-throttle raw loss 0.752% / corner-only 0.733% / zone overspeed
- medium 225 full-throttle raw loss 0.686% / corner-only 0.662% / severe 0.991
- sharp 225 full-throttle raw loss 11.382% / corner-only 11.358% / severe 1
- HND-4 outward/road easy 0 / medium 0.027 / sharp 0.752
- Bugak sharp segment 31 uses maxRoadOffset 808.32 and reaches outward road ratio 0.712
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.825 | 147.798 | -8.019 | 148.865 | 0.78 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.538 | 140.11 | -11.608 | 140.895 | 0.625 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.778 | 111.238 | -14.942 | 112.439 | 1.241 | within-budget | 0 | 194.85 | 0.068 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.872 | 209.008 | -34.956 | 210.292 | 0.829 | within-budget | 0 | 194.85 | 0.175 | 0.3 | 0 | 0 |
| easy | downhill | 130 | lift | 144.654 | 200.094 | -38.326 | 201.333 | 0.857 | within-budget | 0 | 194.85 | 0.152 | 0.014 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.669 | 173.167 | -49.709 | 174.283 | 0.965 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.832 | 144.772 | -5.803 | 148.865 | 2.991 | within-budget | 0 | 156.825 | 0.422 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.544 | 137.945 | -9.878 | 140.895 | 2.35 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.783 | 107.325 | -10.892 | 112.439 | 5.284 | within-budget | 0 | 156.825 | 0.211 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.88 | 208.57 | -34.666 | 210.292 | 1.112 | within-budget | 0 | 156.825 | 0.539 | 0.58 | 0 | 0 |
| medium | downhill | 130 | lift | 144.661 | 199.177 | -37.685 | 201.333 | 1.49 | within-budget | 0 | 156.825 | 0.47 | 0.552 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 115.675 | 170.265 | -47.192 | 174.283 | 3.474 | within-budget | 0 | 156.825 | 0.301 | 0.077 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.832 | 141.74 | -3.587 | 148.865 | 5.207 | overspeed | 0 | 132.75 | 0.913 | 0.045 | 0.001 | 0 |
| sharp | level | 130 | lift | 125.544 | 134.741 | -7.326 | 140.895 | 4.902 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.783 | 103.482 | -6.922 | 112.439 | 9.255 | within-budget | 0 | 132.75 | 0.457 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.88 | 192.759 | -24.457 | 210.292 | 11.32 | overspeed | 0 | 132.75 | 1.166 | 1 | 0.467 | 0 |
| sharp | downhill | 130 | lift | 144.661 | 189.655 | -31.103 | 201.333 | 8.073 | overspeed | 0 | 132.75 | 1.017 | 1 | 0.319 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.675 | 167.1 | -44.457 | 174.283 | 6.21 | within-budget | 0 | 132.75 | 0.65 | 0.731 | 0 | 0 |
| easy | level | 160 | full-throttle | 164.647 | 173.7 | -5.498 | 174.878 | 0.715 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.459 | 164.833 | -6.716 | 165.977 | 0.741 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.588 | 134.996 | -7.491 | 136.037 | 0.829 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.249 | 225 | -22.784 | 225 | 0 | within-budget | 0 | 194.85 | 0.245 | 0.3 | 0 | 0 |
| easy | downhill | 160 | lift | 173.869 | 224.452 | -29.093 | 225 | 0.315 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0 | 0 |
| easy | downhill | 160 | brake-prepared | 145.139 | 200.532 | -38.166 | 201.787 | 0.865 | within-budget | 0 | 194.85 | 0.153 | 0.02 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.655 | 172.727 | -4.902 | 174.878 | 1.306 | overspeed | 0 | 156.825 | 0.612 | 0.113 | 0 | 0 |
| medium | level | 160 | lift | 154.467 | 163.097 | -5.587 | 165.977 | 1.864 | within-budget | 0 | 156.825 | 0.538 | 0.008 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.595 | 131.217 | -4.476 | 136.037 | 3.838 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.258 | 225 | -22.778 | 225 | 0 | overspeed | 0 | 156.825 | 0.756 | 0.58 | 0.005 | 0 |
| medium | downhill | 160 | lift | 173.877 | 224.478 | -29.102 | 225 | 0.3 | overspeed | 0 | 156.825 | 0.68 | 0.58 | 0 | 0 |
| medium | downhill | 160 | brake-prepared | 145.146 | 199.637 | -37.542 | 201.787 | 1.481 | within-budget | 0 | 156.825 | 0.474 | 0.556 | 0 | 0 |
| sharp | level | 160 | full-throttle | 164.655 | 158.08 | 3.993 | 174.878 | 10.202 | severe-overspeed | 0.125 | 132.75 | 1.324 | 1 | 0.392 | 0 |
| sharp | level | 160 | lift | 154.467 | 158.106 | -2.356 | 165.977 | 5.096 | overspeed | 0 | 132.75 | 1.165 | 0.99 | 0.222 | 0 |
| sharp | level | 160 | brake-prepared | 125.595 | 127.36 | -1.406 | 136.037 | 6.909 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 183.258 | 212.565 | -15.992 | 225 | 6.786 | severe-overspeed | 0.823 | 132.75 | 1.634 | 1 | 0.669 | 0 |
| sharp | downhill | 160 | lift | 173.877 | 205.689 | -18.296 | 225 | 11.106 | severe-overspeed | 0.455 | 132.75 | 1.471 | 1 | 0.609 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.146 | 189.853 | -30.801 | 201.787 | 8.222 | overspeed | 0 | 132.75 | 1.024 | 1 | 0.324 | 0 |
| easy | level | 195 | full-throttle | 197.44 | 201.453 | -2.033 | 202.865 | 0.715 | overspeed | 0 | 194.85 | 0.285 | 0.043 | 0 | 0 |
| easy | level | 195 | lift | 188.359 | 193.411 | -2.683 | 194.8 | 0.737 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.428 | 164.74 | -3.332 | 165.975 | 0.775 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.145 | 225 | -4.097 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0 | 0 |
| easy | downhill | 195 | lift | 207.744 | 225 | -8.307 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0 | 0 |
| easy | downhill | 195 | brake-prepared | 178.899 | 225 | -25.769 | 225 | 0 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0 | 0 |
| medium | level | 195 | full-throttle | 197.45 | 201.539 | -2.071 | 202.865 | 0.672 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.58 | 0.019 | 0 |
| medium | level | 195 | lift | 188.368 | 193.482 | -2.715 | 194.8 | 0.7 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.521 | 0.001 | 0 |
| medium | level | 195 | brake-prepared | 159.437 | 163.183 | -2.35 | 165.975 | 1.751 | overspeed | 0 | 156.825 | 0.574 | 0.008 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 216.156 | 225 | -4.092 | 225 | 0 | severe-overspeed | 0.817 | 156.825 | 1.052 | 0.58 | 0.026 | 0 |
| medium | downhill | 195 | lift | 207.754 | 225 | -8.301 | 225 | 0 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0.025 | 0 |
| medium | downhill | 195 | brake-prepared | 178.908 | 225 | -25.763 | 225 | 0 | overspeed | 0 | 156.825 | 0.72 | 0.58 | 0.001 | 0 |
| sharp | level | 195 | full-throttle | 197.45 | 180.465 | 8.602 | 202.865 | 11.345 | severe-overspeed | 1 | 132.75 | 1.904 | 1 | 0.606 | 0 |
| sharp | level | 195 | lift | 188.368 | 173.284 | 8.008 | 194.8 | 11.422 | severe-overspeed | 0.963 | 132.75 | 1.733 | 1 | 0.557 | 0 |
| sharp | level | 195 | brake-prepared | 159.437 | 153.436 | 3.764 | 165.975 | 7.865 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.991 | 0.288 | 0 |
| sharp | downhill | 195 | full-throttle | 216.156 | 224.475 | -3.849 | 225 | 0.243 | severe-overspeed | 1 | 132.75 | 2.276 | 1 | 0.796 | 0 |
| sharp | downhill | 195 | lift | 207.754 | 224.527 | -8.074 | 225 | 0.228 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.782 | 0 |
| sharp | downhill | 195 | brake-prepared | 178.908 | 209.896 | -17.321 | 225 | 8.442 | severe-overspeed | 0.666 | 132.75 | 1.558 | 1 | 0.642 | 0 |
| easy | level | 225 | full-throttle | 224.96 | 223.269 | 0.752 | 224.918 | 0.733 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | level | 225 | lift | 217.117 | 215.877 | 0.571 | 217.476 | 0.736 | overspeed | 0 | 194.85 | 0.345 | 0.3 | 0 | 0 |
| easy | level | 225 | brake-prepared | 188.005 | 187.177 | 0.44 | 188.597 | 0.755 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | brake-prepared | 200.789 | 225 | -12.058 | 225 | 0 | overspeed | 0 | 194.85 | 0.294 | 0.3 | 0 | 0 |
| medium | level | 225 | full-throttle | 224.972 | 223.429 | 0.686 | 224.918 | 0.662 | severe-overspeed | 0.991 | 156.825 | 1.143 | 0.58 | 0.027 | 0 |
| medium | level | 225 | lift | 217.128 | 216.016 | 0.512 | 217.476 | 0.672 | severe-overspeed | 0.852 | 156.825 | 1.065 | 0.58 | 0.025 | 0 |
| medium | level | 225 | brake-prepared | 188.014 | 187.247 | 0.408 | 188.597 | 0.718 | severe-overspeed | 0.014 | 156.825 | 0.799 | 0.455 | 0.001 | 0 |
| medium | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.027 | 0 |
| medium | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0.027 | 0 |
| medium | downhill | 225 | brake-prepared | 200.799 | 225 | -12.052 | 225 | 0 | severe-overspeed | 0.303 | 156.825 | 0.908 | 0.58 | 0.024 | 0 |
| sharp | level | 225 | full-throttle | 224.972 | 199.365 | 11.382 | 224.918 | 11.358 | severe-overspeed | 1 | 132.75 | 2.473 | 1 | 0.752 | 0 |
| sharp | level | 225 | lift | 217.128 | 192.672 | 11.264 | 217.476 | 11.424 | severe-overspeed | 1 | 132.75 | 2.304 | 1 | 0.705 | 0 |
| sharp | level | 225 | brake-prepared | 188.014 | 167.04 | 11.156 | 188.597 | 11.466 | severe-overspeed | 0.958 | 132.75 | 1.728 | 1 | 0.537 | 0 |
| sharp | downhill | 225 | full-throttle | 225 | 224.452 | 0.244 | 225 | 0.244 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.801 | 0 |
| sharp | downhill | 225 | lift | 225 | 224.452 | 0.244 | 225 | 0.244 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.801 | 0 |
| sharp | downhill | 225 | brake-prepared | 200.799 | 223.645 | -11.377 | 225 | 0.675 | severe-overspeed | 1 | 132.75 | 1.965 | 1 | 0.758 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.45 | 189.931 | 0.577 | 0.487 | - | 0.006 | 0 |
| medium | level | 195 | brake-recovery | 197.45 | 168.305 | 0.577 | 0.874 | 283 | 0.006 | 0 |
| medium | downhill | 195 | lift-recovery | 216.156 | 225 | 0.58 | 0.45 | - | 0.008 | 0 |
| medium | downhill | 195 | brake-recovery | 216.156 | 220.561 | 0.58 | 0.45 | - | 0.008 | 0 |
| sharp | level | 195 | lift-recovery | 197.45 | 169.06 | 1 | 0.45 | - | 0.505 | 0 |
| sharp | level | 195 | brake-recovery | 197.45 | 148.133 | 1 | 0.49 | - | 0.45 | 0 |
| sharp | downhill | 195 | lift-recovery | 216.156 | 217.628 | 1 | 0.45 | - | 0.684 | 0 |
| sharp | downhill | 195 | brake-recovery | 216.156 | 197.002 | 1 | 0.49 | - | 0.633 | 0 |
| medium | level | 225 | lift-recovery | 224.972 | 213.129 | 0.58 | 0.45 | - | 0.009 | 0 |
| medium | level | 225 | brake-recovery | 224.972 | 191.391 | 0.58 | 0.473 | - | 0.009 | 0 |
| medium | downhill | 225 | lift-recovery | 225 | 225 | 0.58 | 0.45 | - | 0.009 | 0 |
| medium | downhill | 225 | brake-recovery | 225 | 220.561 | 0.58 | 0.45 | - | 0.009 | 0 |
| sharp | level | 225 | lift-recovery | 224.972 | 189.154 | 1 | 0.45 | - | 0.638 | 0 |
| sharp | level | 225 | brake-recovery | 224.972 | 167.237 | 1 | 0.49 | - | 0.583 | 0 |
| sharp | downhill | 225 | lift-recovery | 225 | 217.515 | 1 | 0.45 | - | 0.689 | 0 |
| sharp | downhill | 225 | brake-recovery | 225 | 196.836 | 1 | 0.49 | - | 0.638 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | full-throttle | 225 | 225 | 0 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | lift | 218.259 | 221.026 | -1.268 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | brake-prepared | 189.148 | 192.491 | -1.767 | 0 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | full-throttle | 225 | 225 | 0 | 0.58 | 0.112 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | lift | 219.38 | 225 | -2.562 | 0.58 | 0.11 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | brake-prepared | 190.27 | 197.734 | -3.923 | 0.579 | 0.058 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | full-throttle | 225 | 205.389 | 8.716 | 1 | 0.712 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | lift | 219.264 | 203.037 | 7.401 | 1 | 0.692 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | brake-prepared | 190.154 | 177.66 | 6.571 | 1 | 0.533 |

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
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.043 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.45, 0.45, 0.45, 0.45 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.1 |
| sixtyKmhSecondGear | yes | 2 | 2 |
| hr3hDirectOverspeedTranslationRemoved | yes | 0 | 0 |
| hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 35.023 |


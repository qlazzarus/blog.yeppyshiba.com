# Apex Seoul TSE-6 Corner Demand Regression

Generated: 2026-09-17T00:53:29.882Z

Status: **PASS**

## Control variables

- Raven 0-100km/h: 8.15s (target 7.8~8.3s)
- 60km/h: gear 2, 5470rpm
- drivetrain: physical, final drive 4.1
- gear ratios: 3.626 / 2.188 / 1.541 / 1.213 / 1 / 0.97
- HND-2 invariant: speed scrub and understeer read the same corner-demand target
- TSE-6 comparison: corner-only loss uses the calibrated production straight control with the same speed, slope and pedal preparation
- A positive downhill force can hold the 225km/h safety cap, so level loss is expected to exceed downhill loss after TSE-4
- HND-4 trajectory: outward motion is normalized by available road width and capped per corner grade
- HND-4 recovery: lift/brake load transfer reduces understeer demand continuously

## Baseline observations

- easy 225 full-throttle raw loss 0.833% / corner-only 0.557% / zone overspeed
- medium 225 full-throttle raw loss 0.781% / corner-only 0.5% / severe 0.988
- sharp 225 full-throttle raw loss 7.882% / corner-only 7.602% / severe 1
- HND-4 outward/road easy 0 / medium 0 / sharp 0.368
- Bugak sharp segment 31 uses maxRoadOffset 808.32 and reaches outward road ratio 0.353
- single target alignment error: demand 0 / understeer 0

## Synthetic matrix

| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | level | 130 | full-throttle | 136.878 | 147.636 | -7.859 | 148.703 | 0.78 | within-budget | 0 | 194.85 | 0.137 | 0 | 0 | 0 |
| easy | level | 130 | lift | 125.56 | 139.982 | -11.486 | 140.771 | 0.628 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | level | 130 | brake-prepared | 96.834 | 111.258 | -14.896 | 112.481 | 1.263 | within-budget | 0 | 194.85 | 0.069 | 0 | 0 | 0 |
| easy | downhill | 130 | full-throttle | 154.717 | 208.788 | -34.949 | 210.086 | 0.839 | within-budget | 0 | 194.85 | 0.174 | 0.3 | 0 | 0 |
| easy | downhill | 130 | lift | 144.684 | 200.012 | -38.241 | 201.253 | 0.858 | within-budget | 0 | 194.85 | 0.152 | 0.015 | 0 | 0 |
| easy | downhill | 130 | brake-prepared | 115.718 | 173.157 | -49.637 | 174.282 | 0.972 | within-budget | 0 | 194.85 | 0.097 | 0 | 0 | 0 |
| medium | level | 130 | full-throttle | 136.885 | 144.543 | -5.595 | 148.703 | 3.039 | within-budget | 0 | 156.825 | 0.423 | 0 | 0 | 0 |
| medium | level | 130 | lift | 125.566 | 137.971 | -9.879 | 140.771 | 2.23 | within-budget | 0 | 156.825 | 0.355 | 0 | 0 | 0 |
| medium | level | 130 | brake-prepared | 96.839 | 107.316 | -10.819 | 112.481 | 5.334 | within-budget | 0 | 156.825 | 0.212 | 0 | 0 | 0 |
| medium | downhill | 130 | full-throttle | 154.725 | 208.305 | -34.629 | 210.086 | 1.151 | within-budget | 0 | 156.825 | 0.538 | 0.58 | 0 | 0 |
| medium | downhill | 130 | lift | 144.691 | 199.048 | -37.568 | 201.253 | 1.524 | within-budget | 0 | 156.825 | 0.47 | 0.557 | 0 | 0 |
| medium | downhill | 130 | brake-prepared | 115.724 | 170.186 | -47.062 | 174.282 | 3.539 | within-budget | 0 | 156.825 | 0.301 | 0.07 | 0 | 0 |
| sharp | level | 130 | full-throttle | 136.885 | 141.495 | -3.368 | 148.703 | 5.266 | overspeed | 0 | 132.75 | 0.914 | 0.035 | 0 | 0 |
| sharp | level | 130 | lift | 125.566 | 134.748 | -7.312 | 140.771 | 4.797 | within-budget | 0 | 132.75 | 0.769 | 0 | 0 | 0 |
| sharp | level | 130 | brake-prepared | 96.839 | 103.497 | -6.875 | 112.481 | 9.277 | within-budget | 0 | 132.75 | 0.458 | 0 | 0 | 0 |
| sharp | downhill | 130 | full-throttle | 154.725 | 202.715 | -31.016 | 210.086 | 4.764 | overspeed | 0 | 132.75 | 1.164 | 1 | 0.24 | 0 |
| sharp | downhill | 130 | lift | 144.691 | 197.571 | -36.547 | 201.253 | 2.545 | overspeed | 0 | 132.75 | 1.017 | 1 | 0.126 | 0 |
| sharp | downhill | 130 | brake-prepared | 115.724 | 167.013 | -44.32 | 174.282 | 6.281 | within-budget | 0 | 132.75 | 0.651 | 0.675 | 0 | 0 |
| easy | level | 160 | full-throttle | 164.668 | 173.75 | -5.516 | 174.933 | 0.718 | within-budget | 0 | 194.85 | 0.198 | 0 | 0 | 0 |
| easy | level | 160 | lift | 154.467 | 164.863 | -6.73 | 166.01 | 0.743 | within-budget | 0 | 194.85 | 0.174 | 0 | 0 | 0 |
| easy | level | 160 | brake-prepared | 125.611 | 135.003 | -7.477 | 136.053 | 0.836 | within-budget | 0 | 194.85 | 0.115 | 0 | 0 | 0 |
| easy | downhill | 160 | full-throttle | 183.108 | 225 | -22.878 | 225 | 0 | within-budget | 0 | 194.85 | 0.244 | 0.3 | 0 | 0 |
| easy | downhill | 160 | lift | 173.893 | 224.798 | -29.274 | 225 | 0.116 | within-budget | 0 | 194.85 | 0.22 | 0.3 | 0 | 0 |
| easy | downhill | 160 | brake-prepared | 145.168 | 200.426 | -38.065 | 201.681 | 0.865 | within-budget | 0 | 194.85 | 0.153 | 0.021 | 0 | 0 |
| medium | level | 160 | full-throttle | 164.676 | 172.727 | -4.889 | 174.933 | 1.34 | overspeed | 0 | 156.825 | 0.612 | 0.119 | 0 | 0 |
| medium | level | 160 | lift | 154.475 | 163.062 | -5.559 | 166.01 | 1.908 | within-budget | 0 | 156.825 | 0.538 | 0.008 | 0 | 0 |
| medium | level | 160 | brake-prepared | 125.618 | 131.174 | -4.423 | 136.053 | 3.884 | within-budget | 0 | 156.825 | 0.356 | 0 | 0 | 0 |
| medium | downhill | 160 | full-throttle | 183.117 | 225 | -22.872 | 225 | 0 | overspeed | 0 | 156.825 | 0.754 | 0.58 | 0 | 0 |
| medium | downhill | 160 | lift | 173.902 | 224.796 | -29.266 | 225 | 0.117 | overspeed | 0 | 156.825 | 0.68 | 0.58 | 0 | 0 |
| medium | downhill | 160 | brake-prepared | 145.175 | 199.484 | -37.409 | 201.681 | 1.513 | within-budget | 0 | 156.825 | 0.474 | 0.56 | 0 | 0 |
| sharp | level | 160 | full-throttle | 164.676 | 170.154 | -3.326 | 174.933 | 2.902 | severe-overspeed | 0.126 | 132.75 | 1.324 | 1 | 0.202 | 0 |
| sharp | level | 160 | lift | 154.475 | 160.836 | -4.118 | 166.01 | 3.349 | overspeed | 0 | 132.75 | 1.165 | 0.595 | 0 | 0 |
| sharp | level | 160 | brake-prepared | 125.618 | 127.334 | -1.366 | 136.053 | 6.941 | within-budget | 0 | 132.75 | 0.771 | 0 | 0 | 0 |
| sharp | downhill | 160 | full-throttle | 183.117 | 219.141 | -19.672 | 225 | 3.2 | severe-overspeed | 0.819 | 132.75 | 1.632 | 1 | 0.339 | 0 |
| sharp | downhill | 160 | lift | 173.902 | 212.587 | -22.245 | 225 | 7.138 | severe-overspeed | 0.456 | 132.75 | 1.471 | 1 | 0.321 | 0 |
| sharp | downhill | 160 | brake-prepared | 145.175 | 198.018 | -36.399 | 201.681 | 2.523 | overspeed | 0 | 132.75 | 1.025 | 1 | 0.13 | 0 |
| easy | level | 195 | full-throttle | 197.452 | 201.473 | -2.036 | 202.887 | 0.716 | overspeed | 0 | 194.85 | 0.285 | 0.051 | 0 | 0 |
| easy | level | 195 | lift | 188.365 | 193.424 | -2.685 | 194.814 | 0.738 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | level | 195 | brake-prepared | 159.444 | 164.754 | -3.33 | 165.988 | 0.774 | within-budget | 0 | 194.85 | 0.186 | 0 | 0 | 0 |
| easy | downhill | 195 | full-throttle | 216.215 | 225 | -4.063 | 225 | 0 | overspeed | 0 | 194.85 | 0.341 | 0.3 | 0 | 0 |
| easy | downhill | 195 | lift | 207.761 | 225 | -8.297 | 225 | 0 | overspeed | 0 | 194.85 | 0.315 | 0.3 | 0 | 0 |
| easy | downhill | 195 | brake-prepared | 178.919 | 225 | -25.755 | 225 | 0 | within-budget | 0 | 194.85 | 0.233 | 0.3 | 0 | 0 |
| medium | level | 195 | full-throttle | 197.462 | 201.535 | -2.062 | 202.887 | 0.685 | severe-overspeed | 0.206 | 156.825 | 0.88 | 0.58 | 0 | 0 |
| medium | level | 195 | lift | 188.375 | 193.469 | -2.704 | 194.814 | 0.714 | severe-overspeed | 0.017 | 156.825 | 0.801 | 0.506 | 0 | 0 |
| medium | level | 195 | brake-prepared | 159.452 | 163.14 | -2.313 | 165.988 | 1.786 | overspeed | 0 | 156.825 | 0.574 | 0.009 | 0 | 0 |
| medium | downhill | 195 | full-throttle | 216.226 | 225 | -4.058 | 225 | 0 | severe-overspeed | 0.819 | 156.825 | 1.053 | 0.58 | 0 | 0 |
| medium | downhill | 195 | lift | 207.772 | 225 | -8.292 | 225 | 0 | severe-overspeed | 0.542 | 156.825 | 0.972 | 0.58 | 0 | 0 |
| medium | downhill | 195 | brake-prepared | 178.928 | 225 | -25.749 | 225 | 0 | overspeed | 0 | 156.825 | 0.721 | 0.58 | 0 | 0 |
| sharp | level | 195 | full-throttle | 197.462 | 187.345 | 5.124 | 202.887 | 7.871 | severe-overspeed | 1 | 132.75 | 1.905 | 1 | 0.339 | 0 |
| sharp | level | 195 | lift | 188.375 | 180.32 | 4.276 | 194.814 | 7.694 | severe-overspeed | 0.963 | 132.75 | 1.733 | 1 | 0.329 | 0 |
| sharp | level | 195 | brake-prepared | 159.452 | 161.071 | -1.015 | 165.988 | 3.084 | severe-overspeed | 0.017 | 132.75 | 1.242 | 0.73 | 0.013 | 0 |
| sharp | downhill | 195 | full-throttle | 216.226 | 224.593 | -3.869 | 225 | 0.188 | severe-overspeed | 1 | 132.75 | 2.278 | 1 | 0.368 | 0 |
| sharp | downhill | 195 | lift | 207.772 | 224.661 | -8.129 | 225 | 0.163 | severe-overspeed | 1 | 132.75 | 2.102 | 1 | 0.364 | 0 |
| sharp | downhill | 195 | brake-prepared | 178.928 | 216.354 | -20.917 | 225 | 4.832 | severe-overspeed | 0.666 | 132.75 | 1.559 | 1 | 0.332 | 0 |
| easy | level | 225 | full-throttle | 224.66 | 222.789 | 0.833 | 224.041 | 0.557 | overspeed | 0 | 194.85 | 0.369 | 0.3 | 0 | 0 |
| easy | level | 225 | lift | 216.937 | 218.061 | -0.518 | 219.581 | 0.701 | overspeed | 0 | 194.85 | 0.344 | 0.3 | 0 | 0 |
| easy | level | 225 | brake-prepared | 188.108 | 192.512 | -2.341 | 193.937 | 0.758 | within-budget | 0 | 194.85 | 0.259 | 0 | 0 | 0 |
| easy | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | overspeed | 0 | 194.85 | 0.37 | 0.3 | 0 | 0 |
| easy | downhill | 225 | brake-prepared | 201.123 | 225 | -11.872 | 225 | 0 | overspeed | 0 | 194.85 | 0.295 | 0.3 | 0 | 0 |
| medium | level | 225 | full-throttle | 224.671 | 222.917 | 0.781 | 224.041 | 0.5 | severe-overspeed | 0.988 | 156.825 | 1.141 | 0.58 | 0 | 0 |
| medium | level | 225 | lift | 216.948 | 218.164 | -0.561 | 219.581 | 0.653 | severe-overspeed | 0.847 | 156.825 | 1.063 | 0.58 | 0 | 0 |
| medium | level | 225 | brake-prepared | 188.118 | 192.559 | -2.361 | 193.937 | 0.733 | severe-overspeed | 0.015 | 156.825 | 0.799 | 0.493 | 0 | 0 |
| medium | downhill | 225 | full-throttle | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0 | 0 |
| medium | downhill | 225 | lift | 225 | 225 | 0 | 225 | 0 | severe-overspeed | 0.991 | 156.825 | 1.144 | 0.58 | 0 | 0 |
| medium | downhill | 225 | brake-prepared | 201.133 | 225 | -11.866 | 225 | 0 | severe-overspeed | 0.313 | 156.825 | 0.911 | 0.58 | 0 | 0 |
| sharp | level | 225 | full-throttle | 224.671 | 206.962 | 7.882 | 224.041 | 7.602 | severe-overspeed | 1 | 132.75 | 2.467 | 1 | 0.368 | 0 |
| sharp | level | 225 | lift | 216.948 | 202.113 | 6.838 | 219.581 | 8.052 | severe-overspeed | 1 | 132.75 | 2.299 | 1 | 0.361 | 0 |
| sharp | level | 225 | brake-prepared | 188.118 | 179.405 | 4.631 | 193.937 | 7.725 | severe-overspeed | 0.959 | 132.75 | 1.729 | 1 | 0.329 | 0 |
| sharp | downhill | 225 | full-throttle | 225 | 224.516 | 0.215 | 225 | 0.215 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.369 | 0 |
| sharp | downhill | 225 | lift | 225 | 224.585 | 0.184 | 225 | 0.184 | severe-overspeed | 1 | 132.75 | 2.474 | 1 | 0.369 | 0 |
| sharp | downhill | 225 | brake-prepared | 201.133 | 225 | -11.866 | 225 | 0 | severe-overspeed | 1 | 132.75 | 1.971 | 1 | 0.358 | 0 |

## Understeer recovery

| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| medium | level | 195 | lift-recovery | 197.462 | 189.922 | 0.575 | 0.494 | - | 0 | 0 |
| medium | level | 195 | brake-recovery | 197.462 | 168.29 | 0.575 | 0.887 | 283 | 0 | 0 |
| medium | downhill | 195 | lift-recovery | 216.226 | 225 | 0.58 | 0.45 | - | 0 | 0 |
| medium | downhill | 195 | brake-recovery | 216.226 | 222.207 | 0.58 | 0.45 | - | 0 | 0 |
| sharp | level | 195 | lift-recovery | 197.462 | 180.013 | 1 | 0.45 | - | 0.289 | 0 |
| sharp | level | 195 | brake-recovery | 197.462 | 160.469 | 1 | 0.49 | - | 0.259 | 0 |
| sharp | downhill | 195 | lift-recovery | 216.226 | 223.652 | 1 | 0.45 | - | 0.352 | 0 |
| sharp | downhill | 195 | brake-recovery | 216.226 | 208.166 | 1 | 0.49 | - | 0.34 | 0 |
| medium | level | 225 | lift-recovery | 224.671 | 213.448 | 0.58 | 0.45 | - | 0 | 0 |
| medium | level | 225 | brake-recovery | 224.671 | 192.963 | 0.58 | 0.486 | - | 0 | 0 |
| medium | downhill | 225 | lift-recovery | 225 | 225 | 0.58 | 0.45 | - | 0 | 0 |
| medium | downhill | 225 | brake-recovery | 225 | 222.207 | 0.58 | 0.45 | - | 0 | 0 |
| sharp | level | 225 | lift-recovery | 224.671 | 198.302 | 1 | 0.45 | - | 0.346 | 0 |
| sharp | level | 225 | brake-recovery | 224.671 | 178.946 | 1 | 0.49 | - | 0.337 | 0 |
| sharp | downhill | 225 | lift-recovery | 225 | 223.587 | 1 | 0.45 | - | 0.354 | 0 |
| sharp | downhill | 225 | brake-recovery | 225 | 208.005 | 1 | 0.49 | - | 0.342 | 0 |

## Fixed Bugak Ridge segments

| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |
| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | full-throttle | 224.941 | 225 | -0.026 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | lift | 218.313 | 222.694 | -2.007 | 0.3 | 0 |
| 21 | easy | 0.204 | 5.741 | 960 | 940 | brake-prepared | 189.49 | 197.956 | -4.468 | 0.002 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | full-throttle | 225 | 225 | 0 | 0.58 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | lift | 219.452 | 225 | -2.528 | 0.58 | 0 |
| 26 | medium | 0.44 | 11.389 | 890 | 870 | brake-prepared | 190.632 | 203.037 | -6.507 | 0.58 | 0 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | full-throttle | 225 | 212.787 | 5.428 | 1 | 0.353 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | lift | 219.337 | 211.836 | 3.42 | 1 | 0.349 |
| 31 | sharp | 0.596 | 10.8 | 828.32 | 808.32 | brake-prepared | 190.516 | 190.551 | -0.018 | 1 | 0.314 |

## Invariant checks

| check | pass | target | value |
| --- | --- | --- | --- |
| syntheticScenarioCount | yes | 72 | 72 |
| recoveryScenarioCount | yes | 16 | 16 |
| straightControlScenarioCount | yes | 24 | 24 |
| trackScenarioCount | yes | 9 | 9 |
| trackGradeCoverage | yes | easy, medium, sharp | easy, medium, sharp |
| requiredMetricsPresent | yes | true | true |
| hnd3SpeedLossZoneProgression | yes | easy overspeed < medium severe < sharp severe | overspeed/0, severe-overspeed/0.988, severe-overspeed/1 |
| singleTargetSpeedRatioIdentity | yes | 0 | 0 |
| singleTargetLateralDemandIdentity | yes | 0 | 0 |
| understeerUsesCornerDemandOverspeed | yes | 0 | 0 |
| hnd4Easy195Understeer | yes | 0, 0.15 | 0.051 |
| hnd4Easy225Understeer | yes | 0.15, 0.35 | 0.3 |
| hnd4Medium225Understeer | yes | 0.4, 0.7 | 0.58 |
| hnd4Sharp225Understeer | yes | 0.7, 1 | 1 |
| hnd4LiftRecoveryRelief | yes | >= 0.35 at 400ms | 0.45, 0.45, 0.45, 0.45 |
| hnd4NoForcedGuardrailImpact | yes | 0 | 0, 0, 0, 0, 0, 0 |
| zeroTo100Control | yes | 7.8, 8.3 | 8.15 |
| sixtyKmhSecondGear | yes | 2 | 2 |
| hr3hDirectOverspeedTranslationRemoved | yes | 0 | 0 |
| hr3hAutomaticTireLossBudget | yes | <= 20% of full brake force (66) | 25.298 |


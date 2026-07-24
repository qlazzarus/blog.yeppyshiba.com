# Apex Seoul HR-3H Handling Matrix

Generated: 2026-07-24T05:03:45.530Z

Status: **PASS**

## Approval checks

| Check | Result | Evidence |
| --- | --- | --- |
| neutral-steering-has-no-road-follow-authority | PASS | `{"maxNeutralFollowAuthority":0}` |
| sharp-overspeed-neutral-threatens-edge | PASS | `{"endSpeedKmh":158.688,"enteredDrift":false,"maxAbsHeading":1.0271,"maxAbsOffset":700,"reachedRail":true,"reachedShoulder":true}` |
| medium-neutral-does-not-auto-follow-road | PASS | `{"maxGripFollowAuthority":0,"maxAbsOffset":700}` |
| prepared-grip-builds-player-steering-authority | PASS | `{"maxGripFollowAuthority":0.9282}` |
| prepared-grip-beats-sharp-neutral-line | PASS | `{"neutral":{"endSpeedKmh":158.688,"enteredDrift":false,"maxAbsHeading":1.0271,"maxAbsOffset":700,"reachedRail":true,"reachedShoulder":true},"prepared":{"endSpeedKmh":124.3908,"enteredDrift":false,"maxAbsHeading":0.388,"maxAbsOffset":457.8476,"reachedRail":false,"reachedShoulder":false}}` |
| intentional-drift-requires-entry-and-counter | PASS | `{"endSpeedKmh":126.8055,"enteredDrift":true,"maxAbsHeading":0.8242,"maxAbsOffset":661.5719,"reachedRail":false,"reachedShoulder":true}` |
| soft-slip-does-not-live-on-safety-clamp | PASS | `{"maxResidencyRatio":0}` |
| neutral-position-centering-remains-disabled | PASS | `{"maxNeutralCenteringForce":0}` |

## Matrix

| Grade | km/h | Mode | Max offset | Max heading | Grip follow | End km/h | Shoulder | Rail | Drift |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| easy | 120 | neutral | 700 | 0.5974 | 0~0 | 139.7038 | yes | yes | no |
| easy | 120 | late-steer | 249.9435 | 0.1731 | 0~1 | 139.0034 | no | no | no |
| easy | 120 | prepared-grip | 8.0218 | 0.0134 | 0~1 | 83.5493 | no | no | no |
| easy | 120 | intentional-drift | 323.2812 | 0.5832 | 0~1 | 111.1925 | no | no | no |
| easy | 160 | neutral | 700 | 0.7561 | 0~0 | 172.9613 | yes | yes | no |
| easy | 160 | late-steer | 555.0141 | 0.23 | 0~1 | 171.8612 | no | no | no |
| easy | 160 | prepared-grip | 12.9471 | 0.0126 | 0~1 | 121.1622 | no | no | no |
| easy | 160 | intentional-drift | 557.731 | 0.7383 | 0~1 | 145.7725 | no | no | no |
| easy | 200 | neutral | 700 | 0.8236 | 0~0 | 203.2129 | yes | yes | no |
| easy | 200 | late-steer | 700 | 0.3166 | 0~0.9615 | 202.178 | yes | yes | no |
| easy | 200 | prepared-grip | 30.8795 | 0.0152 | 0~1 | 158.303 | no | no | no |
| easy | 200 | intentional-drift | 700 | 0.7885 | 0~1 | 180.0012 | yes | yes | no |
| medium | 120 | neutral | 700 | 0.8749 | 0~0 | 139.7038 | yes | yes | no |
| medium | 120 | late-steer | 700 | 0.5631 | 0~0.7357 | 138.6194 | yes | yes | no |
| medium | 120 | prepared-grip | 14.5145 | 0.0253 | 0~1 | 79.5449 | no | no | no |
| medium | 120 | intentional-drift | 436.5072 | 0.775 | 0~1 | 103.2725 | no | no | no |
| medium | 160 | neutral | 700 | 0.9086 | 0~0 | 159.3101 | yes | yes | no |
| medium | 160 | late-steer | 700 | 0.7858 | 0~0.5924 | 158.9286 | yes | yes | no |
| medium | 160 | prepared-grip | 25.9915 | 0.028 | 0~1 | 115.2944 | no | no | no |
| medium | 160 | intentional-drift | 395.1413 | 0.1795 | 0~1 | 130.3393 | no | no | yes |
| medium | 200 | neutral | 700 | 0.9238 | 0~0 | 165.9914 | yes | yes | no |
| medium | 200 | late-steer | 700 | 0.8302 | 0~0.5174 | 165.8461 | yes | yes | no |
| medium | 200 | prepared-grip | 49.8687 | 0.0226 | 0~1 | 153.0396 | no | no | no |
| medium | 200 | intentional-drift | 366.671 | 0.2537 | 0~1 | 165.1152 | no | no | yes |
| sharp | 120 | neutral | 700 | 0.9342 | 0~0 | 121.3591 | yes | yes | no |
| sharp | 120 | late-steer | 700 | 0.8316 | 0~0.4686 | 120.0947 | yes | yes | no |
| sharp | 120 | prepared-grip | 18.9739 | 0.0361 | 0~1 | 73.5759 | no | no | no |
| sharp | 120 | intentional-drift | 637.4984 | 0.878 | 0~1 | 90.6711 | yes | no | no |
| sharp | 160 | neutral | 700 | 0.964 | 0~0 | 127.5612 | yes | yes | no |
| sharp | 160 | late-steer | 700 | 0.9086 | 0~0.3816 | 127.375 | yes | yes | no |
| sharp | 160 | prepared-grip | 35.4938 | 0.0426 | 0~1 | 101.0069 | no | no | no |
| sharp | 160 | intentional-drift | 294.6344 | 0.7013 | 0~1 | 119.0155 | no | no | yes |
| sharp | 200 | neutral | 700 | 1.0271 | 0~0 | 158.688 | yes | yes | no |
| sharp | 200 | late-steer | 700 | 0.9792 | 0~0.2635 | 158.688 | yes | yes | no |
| sharp | 200 | prepared-grip | 457.8476 | 0.388 | 0~0.9282 | 124.3908 | no | no | no |
| sharp | 200 | intentional-drift | 661.5719 | 0.8242 | 0~1 | 126.8055 | yes | no | yes |


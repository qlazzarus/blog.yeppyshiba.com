# Apex Seoul HR-3E Handling Matrix

Generated: 2026-07-23T10:57:41.885Z

Status: **PASS**

## Approval checks

| Check | Result | Evidence |
| --- | --- | --- |
| easy-target-speed-neutral-avoids-shoulder | PASS | `{"endSpeedKmh":139.7038,"enteredDrift":false,"maxAbsHeading":0.0418,"maxAbsOffset":46.1047,"reachedRail":false,"reachedShoulder":false}` |
| sharp-overspeed-neutral-threatens-edge | PASS | `{"endSpeedKmh":120.4797,"enteredDrift":false,"maxAbsHeading":0.8415,"maxAbsOffset":700,"reachedRail":true,"reachedShoulder":true}` |
| prepared-grip-beats-sharp-neutral-line | PASS | `{"neutral":{"endSpeedKmh":120.4797,"enteredDrift":false,"maxAbsHeading":0.8415,"maxAbsOffset":700,"reachedRail":true,"reachedShoulder":true},"prepared":{"endSpeedKmh":115.9918,"enteredDrift":false,"maxAbsHeading":0.4236,"maxAbsOffset":406.9369,"reachedRail":false,"reachedShoulder":false}}` |
| intentional-drift-requires-entry-and-counter | PASS | `{"endSpeedKmh":121.7549,"enteredDrift":true,"maxAbsHeading":1.0103,"maxAbsOffset":391.578,"reachedRail":false,"reachedShoulder":false}` |
| soft-slip-does-not-live-on-safety-clamp | PASS | `{"maxResidencyRatio":0}` |
| neutral-position-centering-remains-disabled | PASS | `{"maxNeutralCenteringForce":0}` |

## Matrix

| Grade | km/h | Mode | Max offset | Max heading | Grip follow | End km/h | Shoulder | Rail | Drift |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| easy | 120 | neutral | 46.1047 | 0.0418 | 0.93~0.93 | 139.7038 | no | no | no |
| easy | 120 | late-steer | 407.8847 | 0.5454 | 0.93~0.93 | 138.9893 | no | no | no |
| easy | 120 | prepared-grip | 136.1925 | 0.095 | 0.93~0.98 | 134.5072 | no | no | no |
| easy | 120 | intentional-drift | 298.0327 | 0.3505 | 0.93~0.98 | 134.4611 | no | no | no |
| easy | 160 | neutral | 75.1101 | 0.0534 | 0.93~0.93 | 172.9613 | no | no | no |
| easy | 160 | late-steer | 475.6809 | 0.5827 | 0.93~0.93 | 171.8612 | no | no | no |
| easy | 160 | prepared-grip | 169.0808 | 0.0943 | 0.93~0.98 | 167.7458 | no | no | no |
| easy | 160 | intentional-drift | 408.8306 | 0.387 | 0.93~0.98 | 167.4459 | no | no | no |
| easy | 200 | neutral | 143.0159 | 0.0969 | 0.8386~0.9258 | 206.0265 | no | no | no |
| easy | 200 | late-steer | 54.5546 | 0.5536 | 0.89~0.9258 | 204.72 | no | no | no |
| easy | 200 | prepared-grip | 205.0214 | 0.0934 | 0.9265~0.98 | 201.5285 | no | no | no |
| easy | 200 | intentional-drift | 509.1351 | 0.4178 | 0.9246~0.98 | 200.8027 | no | no | no |
| medium | 120 | neutral | 282.9253 | 0.2737 | 0.76~0.76 | 139.7038 | no | no | no |
| medium | 120 | late-steer | 257.5719 | 0.314 | 0.76~0.76 | 138.5436 | no | no | no |
| medium | 120 | prepared-grip | 72.3378 | 0.017 | 0.76~0.88 | 134.5072 | no | no | no |
| medium | 120 | intentional-drift | 225.3169 | 0.2693 | 0.76~0.88 | 131.5922 | no | no | no |
| medium | 160 | neutral | 523.139 | 0.5411 | 0.4674~0.7595 | 162.1578 | no | no | no |
| medium | 160 | late-steer | 63.9028 | 0.1349 | 0.6376~0.7595 | 172.4275 | no | no | no |
| medium | 160 | prepared-grip | 43.9958 | 0.016 | 0.7357~0.88 | 167.7458 | no | no | no |
| medium | 160 | intentional-drift | 333.9092 | 0.784 | 0.228~0.7595 | 156.3805 | no | no | yes |
| medium | 200 | neutral | 700 | 0.8083 | 0.3952~0.5379 | 163.0391 | yes | yes | no |
| medium | 200 | late-steer | 604.0849 | 0.4424 | 0.3952~0.5491 | 162.6237 | yes | no | no |
| medium | 200 | prepared-grip | 419.7565 | 0.2586 | 0.3952~0.5642 | 162.0703 | no | no | no |
| medium | 200 | intentional-drift | 262.2274 | 0.9535 | 0.12~0.3952 | 178.0888 | no | no | yes |
| sharp | 120 | neutral | 547.7917 | 0.7757 | 0.3783~0.58 | 122.9196 | no | no | no |
| sharp | 120 | late-steer | 227.9188 | 0.243 | 0.3593~0.58 | 132.7281 | no | no | no |
| sharp | 120 | prepared-grip | 44.0618 | 0.1449 | 0.577~0.7 | 134.1807 | no | no | no |
| sharp | 120 | intentional-drift | 177.0571 | 0.544 | 0.553~0.7 | 126.4703 | no | no | no |
| sharp | 160 | neutral | 700 | 0.8258 | 0.3016~0.5316 | 120.3416 | yes | yes | no |
| sharp | 160 | late-steer | 459.3053 | 0.6419 | 0.3016~0.5499 | 118.7524 | no | no | no |
| sharp | 160 | prepared-grip | 356.7947 | 0.3371 | 0.3016~0.5684 | 116.3349 | no | no | no |
| sharp | 160 | intentional-drift | 291.9236 | 0.9896 | 0.12~0.4099 | 126.0591 | no | no | yes |
| sharp | 200 | neutral | 700 | 0.8415 | 0.3016~0.5298 | 120.4797 | yes | yes | no |
| sharp | 200 | late-steer | 510.2189 | 0.7523 | 0.3016~0.5468 | 119.0555 | no | no | no |
| sharp | 200 | prepared-grip | 406.9369 | 0.4236 | 0.3016~0.57 | 115.9918 | no | no | no |
| sharp | 200 | intentional-drift | 391.578 | 1.0103 | 0.12~0.3036 | 121.7549 | no | no | yes |


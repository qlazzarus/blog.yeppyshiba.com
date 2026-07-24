# Apex Seoul HR-3H World-line Cornering Contract

Generated: 2026-07-24T05:25:33.670Z

Status: **PASS**

| Check | Result | Evidence |
| --- | --- | --- |
| preview-does-not-move-player-physics | PASS | `{"endSpeedKmh":185.0465,"finalHeading":0,"finalOffset":0,"maxAbsHeading":0,"maxAbsOffset":0,"maxGripFollowAuthority":0}` |
| neutral-wheel-has-zero-road-follow-authority | PASS | `{"left":0,"right":0}` |
| neutral-world-line-exits-opposite-curve-direction | PASS | `{"leftCornerOffset":700,"rightCornerOffset":-700}` |
| left-right-world-line-is-symmetric | PASS | `{"left":{"endSpeedKmh":184.7209,"finalHeading":1.0489,"finalOffset":700,"maxAbsHeading":1.0489,"maxAbsOffset":700,"maxGripFollowAuthority":0},"right":{"endSpeedKmh":184.7209,"finalHeading":-1.0489,"finalOffset":-700,"maxAbsHeading":1.0489,"maxAbsOffset":700,"maxGripFollowAuthority":0}}` |
| lateral-motion-is-heading-projection | PASS | `{"leftError":0,"preparedError":0,"rightError":0}` |
| prepared-grip-beats-neutral-without-rail | PASS | `{"neutral":{"endSpeedKmh":184.7209,"finalHeading":-1.0489,"finalOffset":-700,"maxAbsHeading":1.0489,"maxAbsOffset":700,"maxGripFollowAuthority":0},"prepared":{"endSpeedKmh":118.9711,"finalHeading":0.0283,"finalOffset":-0.2951,"maxAbsHeading":0.0283,"maxAbsOffset":20.5294,"maxGripFollowAuthority":1}}` |
| automatic-tire-loss-stays-below-brake-budget | PASS | `{"fullBrakeForce":330,"maxAutomaticCornerLossForce":66}` |

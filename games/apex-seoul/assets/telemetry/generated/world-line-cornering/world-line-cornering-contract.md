# Apex Seoul HR-3H World-line Cornering Contract

Generated: 2026-07-27T08:46:59.835Z

Status: **PASS**

| Check | Result | Evidence |
| --- | --- | --- |
| preview-does-not-move-player-physics | PASS | `{"endSpeedKmh":185.0465,"finalHeading":0,"finalOffset":0,"maxAbsHeading":0,"maxAbsOffset":0,"maxGripFollowAuthority":0}` |
| neutral-wheel-has-zero-road-follow-authority | PASS | `{"left":0,"right":0}` |
| neutral-world-line-builds-meaningful-opposite-curve-excursion | PASS | `{"leftCornerOffset":487.055,"rightCornerOffset":-487.055}` |
| left-right-world-line-is-symmetric | PASS | `{"left":{"endSpeedKmh":184.7209,"finalHeading":1.0489,"finalOffset":487.055,"maxAbsHeading":1.0489,"maxAbsOffset":487.055,"maxGripFollowAuthority":0},"right":{"endSpeedKmh":184.7209,"finalHeading":-1.0489,"finalOffset":-487.055,"maxAbsHeading":1.0489,"maxAbsOffset":487.055,"maxGripFollowAuthority":0}}` |
| lateral-motion-is-heading-projection | PASS | `{"leftError":0,"preparedError":0,"rightError":0}` |
| prepared-grip-beats-neutral-without-rail | PASS | `{"neutral":{"endSpeedKmh":184.7209,"finalHeading":-1.0489,"finalOffset":-487.055,"maxAbsHeading":1.0489,"maxAbsOffset":487.055,"maxGripFollowAuthority":0},"prepared":{"endSpeedKmh":120.7379,"finalHeading":0.0253,"finalOffset":-3.9375,"maxAbsHeading":0.0281,"maxAbsOffset":21.4738,"maxGripFollowAuthority":1}}` |
| automatic-tire-loss-stays-below-brake-budget | PASS | `{"fullBrakeForce":330,"maxAutomaticCornerLossForce":65.9999}` |

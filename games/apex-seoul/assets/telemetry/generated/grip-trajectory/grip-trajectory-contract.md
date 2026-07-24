# Apex Seoul Grip Trajectory Coherence

Generated: 2026-07-24T05:25:34.143Z

Status: **PASS**

| Check | Result | Evidence |
| --- | --- | --- |
| full-digital-input-does-not-hit-full-physics-on-first-frame | PASS | `{"input":1,"physicalSteeringCommand":0.1898}` |
| held-input-builds-useful-physics-command | PASS | `{"peakCommand":0.9992}` |
| released-physics-command-returns-neutral | PASS | `{"commandHalfSecondAfterRelease":0.0003}` |
| sprite-sign-follows-physical-command | PASS | `{"commandedSamples":34,"mismatches":0}` |
| neutral-command-keeps-center-pose-after-release | PASS | `{"maxAbsBodyPose":0.0002,"samples":43}` |
| release-does-not-auto-align-world-heading-to-road | PASS | `{"headingAtCommandNeutral":0.2765,"headingAtEnd":0.2781,"headingRetentionRatio":1.0058}` |
| straight-neutral-remains-centered | PASS | `{"maxAbsHeading":0,"maxAbsOffset":0,"maxAbsPhysicalCommand":0}` |
| left-corner-neutral-command-keeps-center-pose | PASS | `{"bodyPose":0,"headingError":0.7849,"lateralOffset":473.8472,"physicalSteeringCommand":0,"speedKmh":178.3344}` |

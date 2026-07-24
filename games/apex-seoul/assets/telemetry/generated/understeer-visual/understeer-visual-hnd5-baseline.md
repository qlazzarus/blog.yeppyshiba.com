# Apex Seoul HND-5 Understeer Visual Authority

Generated: 2026-07-24T05:03:47.070Z

Status: **PASS**

| case | grip authority | body authority | pose authority | input pose | frame pose | body yaw | scrub cue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| within-budget | 1 | 1 | 1 | 0.58 | 0.58 | 0.58 | 0 |
| easy-225 | 0.836 | 0.953 | 0.973 | 0.58 | 0.564 | 0.553 | 0.086 |
| medium-225 | 0.642 | 0.689 | 0.82 | 0.58 | 0.475 | 0.4 | 0.631 |
| sharp-225 | 0.408 | 0.46 | 0.687 | 0.58 | 0.398 | 0.267 | 1 |

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| withinBudget.bodyYawAuthority | yes | 0.999, 1 | 1 |
| withinBudget.poseAuthority | yes | 0.999, 1 | 1 |
| withinBudget.cueIntensity | yes | 0, 0.001 | 0 |
| bodyAuthorityOrdering | yes | easy > medium > sharp | 0.9531, 0.6891, 0.46 |
| easy.bodyYawAuthority | yes | 0.85, 1 | 0.9531 |
| medium.bodyYawAuthority | yes | 0.58, 0.82 | 0.6891 |
| sharp.bodyYawAuthority | yes | 0.44, 0.55 | 0.46 |
| easy.poseAuthority | yes | 0.9, 1 | 0.9728 |
| medium.poseAuthority | yes | 0.72, 0.9 | 0.8197 |
| sharp.poseAuthority | yes | 0.62, 0.75 | 0.6868 |
| inputPoseRemainsAheadOfBodyYaw | yes | input pose >= frame pose > body yaw | [object Object], [object Object], [object Object] |
| cueOrdering | yes | easy < medium < sharp | 0.0857, 0.6309, 1 |
| easy.cueIntensity | yes | 0.02, 0.2 | 0.0857 |
| medium.cueIntensity | yes | 0.45, 0.8 | 0.6309 |
| sharp.cueIntensity | yes | 0.9, 1 | 1 |
| sharp.authorityStepMax | yes | 0, 0.09 | 0.0752 |
| sharp.cueStepMax | yes | 0, 0.22 | 0.2081 |
| recovery.bodyYawAuthority400ms | yes | 0.9, 1 | 0.9836 |
| recovery.cueIntensity400ms | yes | 0, 0.08 | 0.0409 |
| driftBypass.bodyYawAuthority | yes | 0.99, 1 | 0.9987 |
| driftBypass.cueIntensity | yes | 0, 0.05 | 0.0183 |


# Apex Seoul HR-3G Corner Exit Recovery Contract

Generated: 2026-07-28T04:28:29.962Z

Status: **PASS**

| Check | Result | Evidence |
| --- | --- | --- |
| neutral-forks-keep-moving-outward | PASS | `[{"finalOutwardHeading":0.5745,"fixture":"runtime-progress-008","outwardOffsetDelta":440.4844},{"finalOutwardHeading":0.7886,"fixture":"runtime-progress-020","outwardOffsetDelta":370.0059},{"finalOutwardHeading":0.7653,"fixture":"runtime-progress-030","outwardOffsetDelta":274.5508}]` |
| recorded-corrections-do-not-build-large-opposite-heading | PASS | `[{"fixture":"runtime-progress-008","maxOppositeHeading":0.0204},{"fixture":"runtime-progress-020","maxOppositeHeading":0},{"fixture":"runtime-progress-030","maxOppositeHeading":0}]` |
| recorded-corrections-do-not-launch-opposite-inertia | PASS | `[{"fixture":"runtime-progress-008","maxOppositeInertia":19.8059},{"fixture":"runtime-progress-020","maxOppositeInertia":0},{"fixture":"runtime-progress-030","maxOppositeInertia":0}]` |
| short-correction-reduces-debt-without-opposite-launch | PASS | `[{"finalAbsHeading":0.2829,"fixture":"runtime-progress-008","initialAbsHeading":0.34,"maxOppositeHeading":0,"maxOppositeInertia":0,"neutralFinalAbsHeading":0.5745},{"finalAbsHeading":0.7004,"fixture":"runtime-progress-020","initialAbsHeading":0.375,"maxOppositeHeading":0,"maxOppositeInertia":0,"neutralFinalAbsHeading":0.7886},{"finalAbsHeading":0.582,"fixture":"runtime-progress-030","initialAbsHeading":0.312,"maxOppositeHeading":0,"maxOppositeInertia":0,"neutralFinalAbsHeading":0.7653}]` |
| overspeed-direct-lateral-launch-is-removed | PASS | `[{"correctionPeak":0,"fixture":"runtime-progress-008","shortPeak":0},{"correctionPeak":0,"fixture":"runtime-progress-020","shortPeak":0},{"correctionPeak":0,"fixture":"runtime-progress-030","shortPeak":0}]` |
| front-corner-can-hit-before-center-reaches-side-rail | PASS | `{"guardrailContactDirection":1,"guardrailImpactCount":1,"initialHeading":0.55,"lateralOffset":600,"railCenterLimit":800,"vehicleHeadingError":0.198}` |

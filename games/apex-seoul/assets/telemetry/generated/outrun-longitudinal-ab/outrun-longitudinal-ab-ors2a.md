# Apex Seoul ORS-2A Longitudinal A/B

Generated: 2026-07-23T05:15:47.284Z

Status: **PASS**

Production selection: **U2 / 2.00**. `U3 / 3.00` remains a diagnostic upper bound.

## Flow matrix

| candidate | scale | 150 segment/s | 185 segment/s | 225 segment/s | 185 60->85% | 225 60->85% | 225 step @30Hz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| U0 | 1.00 | 2.1111 | 2.6037 | 3.1667 | 2.5668s | 2.0612s | 0.1056 segment |
| U1 | 1.50 | 3.1667 | 3.9056 | 4.75 | 1.7112s | 1.3741s | 0.1583 segment |
| U2 | 2.00 | 4.2222 | 5.2074 | 6.3333 | 1.2834s | 1.0306s | 0.2111 segment |
| U3 diagnostic | 3.00 | 6.3333 | 7.8111 | 9.5 | 0.8556s | 0.6871s | 0.3167 segment |

## Handling-time matrix

| candidate | 185 shortest / median / longest | 185 min samples | 225 shortest | 225 min samples | 185 rail exposure upper bound | course resample if needed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| U0 | 4.2248s / 4.4168s / 5.377s | 253.5 | 3.4737s | 208.4 | 0.4753 | x1.00 |
| U1 | 2.8165s / 2.9445s / 3.5846s | 169 | 2.3158s | 138.9 | 0.3169 | x1.50 |
| U2 | 2.1124s / 2.2084s / 2.6885s | 126.7 | 1.7368s | 104.2 | 0.2376 | x2.00 |
| U3 | 1.4083s / 1.4723s / 1.7923s | 84.5 | 1.1579s | 69.5 | 0.1584 | x3.00 |

The rail exposure value is an upper-bound timing ratio, not a simulated racing line. Runtime telemetry and user review remain required for approval.

## 185km/h entry / apex / exit windows

| candidate | turn | segments | apex | entry->apex | apex->exit | total | samples @60Hz |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| U0 | right | 20-33 | 29 | 3.6486s | 1.7283s | 5.377s | 322.6 |
| U0 | left | 63-73 | 68 | 2.1124s | 2.1124s | 4.2248s | 253.5 |
| U0 | right | 105-115 | 110 | 2.1124s | 2.1124s | 4.2248s | 253.5 |
| U0 | left | 145-155 | 150 | 2.1124s | 2.1124s | 4.2248s | 253.5 |
| U0 | left | 208-219 | 213 | 2.1124s | 2.4964s | 4.6088s | 276.5 |
| U0 | right | 254-265 | 259 | 2.1124s | 2.4964s | 4.6088s | 276.5 |
| U1 | right | 20-33 | 29 | 2.4324s | 1.1522s | 3.5846s | 215.1 |
| U1 | left | 63-73 | 68 | 1.4083s | 1.4083s | 2.8165s | 169 |
| U1 | right | 105-115 | 110 | 1.4083s | 1.4083s | 2.8165s | 169 |
| U1 | left | 145-155 | 150 | 1.4083s | 1.4083s | 2.8165s | 169 |
| U1 | left | 208-219 | 213 | 1.4083s | 1.6643s | 3.0725s | 184.4 |
| U1 | right | 254-265 | 259 | 1.4083s | 1.6643s | 3.0725s | 184.4 |
| U2 | right | 20-33 | 29 | 1.8243s | 0.8642s | 2.6885s | 161.3 |
| U2 | left | 63-73 | 68 | 1.0562s | 1.0562s | 2.1124s | 126.7 |
| U2 | right | 105-115 | 110 | 1.0562s | 1.0562s | 2.1124s | 126.7 |
| U2 | left | 145-155 | 150 | 1.0562s | 1.0562s | 2.1124s | 126.7 |
| U2 | left | 208-219 | 213 | 1.0562s | 1.2482s | 2.3044s | 138.3 |
| U2 | right | 254-265 | 259 | 1.0562s | 1.2482s | 2.3044s | 138.3 |
| U3 | right | 20-33 | 29 | 1.2162s | 0.5761s | 1.7923s | 107.5 |
| U3 | left | 63-73 | 68 | 0.7041s | 0.7041s | 1.4083s | 84.5 |
| U3 | right | 105-115 | 110 | 0.7041s | 0.7041s | 1.4083s | 84.5 |
| U3 | left | 145-155 | 150 | 0.7041s | 0.7041s | 1.4083s | 84.5 |
| U3 | left | 208-219 | 213 | 0.7041s | 0.8321s | 1.5363s | 92.2 |
| U3 | right | 254-265 | 259 | 0.7041s | 0.8321s | 1.5363s | 92.2 |

## Runtime A/B

- Query: `?longitudinalScale=1`, `1.5`, `2`, or `3`.
- In game: press `B` to cycle candidates and reload from a clean run.
- HUD and telemetry report candidate, scale, physical speed and canonical worldTravelSpeed.

## Checks

| check | pass | target | value |
| --- | --- | --- | --- |
| candidateMatrix | yes | = 1,1.5,2,3 | 1,1.5,2,3 |
| defaultCandidate | yes | = 2 | 2 |
| candidateCycle | yes | = 1.5,2,3,1 | 1.5,2,3,1 |
| candidateParsing | yes | = true | true |
| canonicalCameraProgression | yes | = true | true |
| noLegacyDirectPhysicalProgression | yes | = false | false |
| powertrainHasNoLongitudinalScaleDependency | yes | = false | false |
| historicalSh7ScenariosPinnedToU0 | yes | = 4 | 4 |
| displaySpeedIdentityErrorKmh | yes | <= 0.000001 | 0 |
| maximumSegmentsPer30HzStep | yes | <= 0.5 | 0.3167 |
| commitmentRunCount | yes | >= 6 | 6 |

## Review order

- Use U2 / 2.00 as the production default after user A/B review.
- Keep U0/U1 URL overrides for regression comparison and U3 as a diagnostic upper bound.
- If 2.00 or 3.00 fixes flow but makes the grip window too short, resample the course longitudinally by the selected scale before changing handling.


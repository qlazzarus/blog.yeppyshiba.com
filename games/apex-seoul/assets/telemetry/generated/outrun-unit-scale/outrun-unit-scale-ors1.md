# Apex Seoul ORS-1 Unit / Screen-flow Audit

Generated: 2026-07-23T01:54:08.824Z

Status: **PASS**

## Outcome

- Primary: longitudinal unit scale.
- Secondary: homogeneous content gaps and, to a smaller degree, projection.
- Not primary: micro-marker density; it is already in the intended 4-6/s corner band.
- ORS-2A diagnostic matrix: `1.00 / 1.50 / 2.00 / 3.00`.

## Apex current build

| HUD km/h | world u/s | segment/s | road-width/s | visible depth | 60->85% | 60->95% | reflector 16->32px | reflector 32->64px |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 110 | 371.5556 | 1.5481 | 0.1935 | 26.3756s | 4.4721s | 5.1626s | 6.8047s | 3.4023s |
| 150 | 506.6667 | 2.1111 | 0.2639 | 19.3421s | 3.2174s | 3.7141s | 4.8955s | 2.4477s |
| 185 | 624.8889 | 2.6037 | 0.3255 | 15.6828s | 2.5668s | 2.9631s | 3.9056s | 1.9528s |
| 225 | 760 | 3.1667 | 0.3958 | 12.8947s | 2.0612s | 2.3794s | 3.1362s | 1.5681s |

The screen times use the actual steady speed FOV at 1200x760 on flat ground. The 9,800u visible-depth value is nominal; fog and crest occlusion shorten actual visibility.

## Open-source engine normalization

| engine | speed basis | segment/s | road-width/s | visible depth | 60->85% | 60->95% |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Apex Seoul | 225km/h / 760u/s | 3.1667 | 0.3958 | 12.8947s | 2.0612s | 2.3794s |
| Javascript Racer | configured max / 12000u/s | 60 | 3 | 5s | 0.2497s | 0.2719s |
| CannonBall | HUD high word 294, then × 303 | n/a | n/a | n/a | n/a | n/a |

Javascript Racer deliberately caps movement at one segment per frame for collision safety. Its 60 segment/s is evidence of a very different scale, not a production target. CannonBall confirms the architectural point: display speed and road-position progression have an explicit conversion layer.

## Official 60 fps footage annotations

| game | sample | HUD speed | 60->85% | 60->95% | 16->32px | 32->64px | sample note |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Horizon Chase Turbo | 11s California easy sweep | n/a | 0.27-0.33s | 0.35-0.42s | 0.15-0.23s | 0.12-0.18s | acceleration debris makes this a medium-confidence reference |
| Slipstream | 58.25s Resort Islands easy sweep | 250 | 0.075-0.1s | 0.095-0.125s | 0.1-0.17s | 0.08-0.14s | dialog overlay does not cover the road probe |

These are manual frame ranges, not reverse-engineered commercial units. Trailer video files are not stored in the repository.

## Cause separation

| factor | classification | evidence |
| --- | --- | --- |
| cameraProjection | secondary | Steady FOV changes from 70.976 to 74.2 degrees across the audit speeds. Even with the speed FOV applied, the 225km/h 60->85% pass remains 2.0612s. |
| contentGap | secondary | 3 distinctive sign/chevron placements exist across 83520u, while no gate, traffic or sector-transition event kind exists. The longest sign/chevron-free interval is 46776u (74.8549s at 185km/h). Forest clusters are geometrically large but repeat every segment, so raw sprite count is not treated as event variety. |
| longitudinalUnitScale | primary | Apex reaches 3.1667 segment/s and 0.3958 road-width/s at 225km/h. Javascript Racer reaches 60 segment/s and 3 road-width/s at its configured maximum. Apex 225km/h needs 8.25x the Javascript Racer 60->85% ground-pass time. Apex 225km/h needs 6.87x to 23.56x the manually annotated commercial-reference time. |
| markerDensity | not-primary | Corner lane and reflector cadence is already 5.2074/s at 185km/h. Increasing the same marker count would raise frequency without shortening a single anchor's approach time. |

## ORS-2A diagnostic sweep

| scale | 150 segment/s | 150 60->85% | 185 segment/s | 185 60->85% | 225 segment/s | 225 60->85% |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.00 | 2.1111 | 3.2174s | 2.6037 | 2.5668s | 3.1667 | 2.0612s |
| 1.50 | 3.1666 | 2.1449s | 3.9055 | 1.7112s | 4.75 | 1.3741s |
| 2.00 | 4.2222 | 1.6087s | 5.2074 | 1.2834s | 6.3334 | 1.0306s |
| 3.00 | 6.3333 | 1.0725s | 7.8111 | 0.8556s | 9.5001 | 0.6871s |

- The former 1.00/1.25/1.50/1.75 matrix is too narrow to falsify the longitudinal-scale hypothesis.
- Use 1.00/1.50/2.00/3.00 as the diagnostic sweep; 3.00 is an upper probe, not a production target.
- Keep displayed km/h, drivetrain, FOV, marker density and audio fixed.
- If scale 2.00+ reads correctly but shortens grip-corner control below the existing gate, pair the chosen flow scale with longitudinal course resampling instead of hiding the issue with camera shake.

## Content-gap baseline

- Distinctive sign/chevron objects: 3
- Repeating forest sprites: 2760
- Longest distinctive-event gap: 46776u / 74.8549s at 185km/h
- Macro traffic/gate/sector transition kinds: 0

## Checks

| check | pass | target | value |
| --- | --- | --- | ---: |
| segmentLength | yes | = 240 | 240 |
| defaultFullRoadWidth | yes | = 1920 | 1920 |
| objectDrawDistance | yes | = 9800 | 9800 |
| playerAccelSpeed | yes | = 760 | 760 |
| displaySpeedIdentityErrorKmh | yes | <= 0.000001 | 0 |
| commercial60FpsReferenceCount | yes | >= 2 | 2 |
| ors2aDiagnosticScaleCeiling | yes | >= 3 | 3 |

## Sources

- [Javascript Racer source](https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html)
- [CannonBall road-position conversion](https://github.com/djyt/cannonball/blob/master/src/main/engine/oferrari.cpp#L1527-L1549)
- [Horizon Chase Turbo Demo Version Trailer](https://store.steampowered.com/app/389140/Horizon_Chase_Turbo/)
- [Slipstream Release Trailer](https://store.steampowered.com/app/732810/Slipstream/)
- [SEGA AGES Out Run official introduction video](https://www.youtube.com/watch?v=RQk2dy6Zw1M) — qualitative only


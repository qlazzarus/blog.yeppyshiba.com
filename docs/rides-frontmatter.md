# Rides frontmatter specification

Ride posts are regular article posts under `contents/` with `category: ride`.
The canonical detail URL is `/article/<slug>/`; `/rides/` is a curated index
that lists ride articles with GPX stats. Legacy `/rides/<slug>/` pages redirect
to the canonical article URL.

Required fields:

- `title`: Human readable title. Example: `2026년 5월 10일 하트코스`
- `date`: ISO date `YYYY-MM-DD`
- `category`: Must be `ride`
- `summary`: Short one-sentence summary describing the ride
- `tags`: YAML list of short tags, included in normal tag pages
- `image`: Preview/cover image path under `/images/`
- `gpxUrl`: Path under `/gpx/` to the GPX file used by the viewer

Optional ride fields:

- `mediaManifestUrl`: Path under `/rides/` for synchronized ride media
- `coverCredit`: Photographer or source credit
- `coverLicense`: License label, such as `CC BY 3.0` or `Public domain`
- `coverSource`: Full source URL for the cover image
- `roadviewUpdateIntervalMs`: Roadview overlay update interval, default `10000`

Guidelines:

- Keep `summary` concise and tags limited to 4-6 relevant tags.
- Prefer `GPX`, `라이딩 기록`, and a course/context tag for discoverability.
- Store GPX files under `public/gpx/YYYYMM/` and reference them as `/gpx/...`.
- Store images under `public/images/...` and reference them as `/images/...`.

Example:

```yaml
---
title: 2026년 5월 10일 하트코스
date: 2026-05-10
category: ride
summary: 하트코스를 따라 길게 페달을 밟으며 한강과 도심의 리듬을 다시 느낀 아침 라이딩 기록입니다.
tags:
    - GPX
    - 하트코스
    - 라이딩 기록
    - 자전거 코스
image: /images/posts/202605/20260510_heart_course.jpg
gpxUrl: /gpx/202605/20260510_morning_ride.gpx
coverCredit: Han river bike path - gary4now
coverLicense: CC BY 3.0
coverSource: https://commons.wikimedia.org/wiki/File:Han_river_bike_path_-_panoramio.jpg
roadviewUpdateIntervalMs: 10000
---
```

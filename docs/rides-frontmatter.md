# Rides frontmatter specification

Project expects ride posts under `rides/` to use the following YAML frontmatter fields:

- `title`: Human readable title. Example: `2026년 5월 10일 하트코스`
- `date`: ISO date `YYYY-MM-DD`
- `summary`: Short one-sentence summary describing the ride
- `tags`: YAML list of short tags (e.g., `GPX`, `스프린트`, `한강 자전거길`)
- `gpxUrl`: Path under `/gpx/` to the GPX file used by the viewer. Example: `/gpx/202605/20260510_morning_ride.gpx`
- `coverImage`: Path to the cover image used for previews (under `/images/rides/...`)
- `coverCredit`: Photographer or source credit (string)
- `coverLicense`: License label (e.g., `CC BY 3.0`, `Public Domain`)
- `coverSource`: A URL to the image source (preferably Wikimedia Commons) or a short note when the image is public domain
- `roadviewUpdateIntervalMs`: Integer; how often the roadview overlay updates in milliseconds (default `10000`)

Guidelines:

- Prefer public domain images for `coverImage` when available. Use Wikimedia Commons images that are clearly marked `Public domain` or `CC0`. Put the full Commons file page URL in `coverSource` and set `coverLicense` accordingly.
- Store cover images under `public/images/rides/YYYYMM/` and reference them from `coverImage` using that path.
- `gpxUrl` should point to files under `public/gpx/YYYYMM/` and use the `/gpx/...` URL in frontmatter.
- Keep `summary` concise (one sentence) and `tags` limited to 4-6 relevant tags.

Example frontmatter:

---

title: 2026년 5월 10일 하트코스
date: 2026-05-10
summary: 하트코스를 따라 길게 페달을 밟으며 한강과 도심의 리듬을 다시 느낀 아침 라이딩 기록입니다.
tags: - GPX - 하트코스 - 한강 자전거길 - 라이딩 기록 - 자전거 코스
gpxUrl: /gpx/202605/20260510*morning_ride.gpx
coverImage: /images/rides/202605/20260510_heart_course.jpg
coverCredit: Han river bike path - gary4now
coverLicense: CC BY 3.0
coverSource: https://commons.wikimedia.org/wiki/File:Han_river_bike_path*-\_panoramio.jpg
roadviewUpdateIntervalMs: 10000

---

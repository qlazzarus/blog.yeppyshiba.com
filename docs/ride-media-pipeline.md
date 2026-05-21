# 라이딩 미디어 파이프라인

이 문서는 GoPro 영상과 GPX 파일을 융합해서 라이딩 블로그 글을 만드는
후속 MVP 계획을 정리한다.

목표는 브라우저에서 큰 영상을 직접 처리하지 않는 것이다. 블로그 발행 전에
로컬 스크립트로 영상과 GPX를 정리하고, Astro 사이트는 정적 GPX, JSON, 이미지
파일만 배포한다.

## 전체 흐름

```text
GoPro MP4 + 원본 GPX
        ↓
prepare-ride-media.ts
        ↓
trimmed GPX + 프레임 이미지 + media.json
        ↓
create-ride-draft.ts
        ↓
rides/*.md 초안
        ↓
assist-ride-writing.ts + OpenAI API
        ↓
제목/요약/구간 설명/캡션/질문 후보
        ↓
GpxRouteViewer
        ↓
지도 + GoPro 프레임 기반 라이딩 뷰어
```

## 1단계: 미디어 준비

`scripts/prepare-ride-media.ts`는 영상과 GPX를 정적 산출물로 변환한다.

입력:

- GoPro 영상 파일, 보통 `.MP4`
- 원본 GPX 파일
- 라이딩 slug
- 선택: GoPro 시작 시각
- 선택: 프레임 추출 간격

실행 예:

```bash
npm run ride:prepare -- \
  --video ./raw/GX010123.MP4 \
  --gpx ./raw/ride.gpx \
  --slug 20260601-morning-ride \
  --frame-interval 5
```

정확한 동기화가 필요하면 `--video-start`를 직접 넘긴다.

```bash
npm run ride:prepare -- \
  --video ./raw/GX010123.MP4 \
  --gpx ./raw/ride.gpx \
  --slug 20260601-morning-ride \
  --video-start 2026-06-01T07:20:00+09:00 \
  --frame-interval 5
```

`--video-start`를 생략하면 스크립트는 `ffprobe`의 `creation_time` 메타데이터로
영상 시작 시각을 추정한다. 다만 GoPro 시간 설정, 타임존, 파일 복사 방식에 따라
틀어질 수 있으므로 최종 발행용으로는 명시 입력이 가장 안전하다.

산출물:

```text
public/gpx/202606/20260601-morning-ride.trimmed.gpx
public/rides/202606/20260601-morning-ride/media.json
public/images/rides/202606/20260601-morning-ride/frames/frame-000001.jpg
```

동기화 기준:

```text
viewerStartTime = max(gpxStartTime, videoStartTime)
viewerEndTime = min(gpxEndTime, videoEndTime)
```

GoPro가 GPX보다 늦게 시작하면 GPX 앞부분을 자른다. GoPro가 GPX보다 먼저
시작하면 GPX 시작 시각에 맞춰 영상 프레임 추출 시작점을 뒤로 민다.

## 2단계: 블로그 초안 생성

`scripts/create-ride-draft.ts`는 `media.json`을 읽어서 `rides/*.md` 초안을 만든다.

실행 예:

```bash
npm run ride:draft -- \
  --media public/rides/202606/20260601-morning-ride/media.json \
  --title "2026년 6월 1일 아침 라이딩" \
  --summary "GoPro와 GPX로 다시 보는 아침 라이딩 기록"
```

산출 예:

```text
rides/20260601-morning-ride.md
```

생성되는 frontmatter 예:

```yaml
---
title: 2026년 6월 1일 아침 라이딩
date: 2026-06-01
summary: GoPro와 GPX로 다시 보는 아침 라이딩 기록
tags:
    - GPX
    - GoPro
    - 라이딩 기록
gpxUrl: /gpx/202606/20260601-morning-ride.trimmed.gpx
mediaManifestUrl: /rides/202606/20260601-morning-ride/media.json
coverImage: /images/rides/202606/20260601-morning-ride/frames/frame-000001.jpg
roadviewUpdateIntervalMs: 10000
---
```

본문에는 우선 하이라이트 이미지와 간단한 메모 자리만 만든다. 글의 감정,
상황, 기억은 사람이 채우는 방식이 좋다.

## 3단계: OpenAI API 기반 반자동 글쓰기 보조

`scripts/assist-ride-writing.ts`는 완성 글을 대신 쓰는 도구가 아니라, 글쓴이가
선택할 수 있는 편집 후보를 만드는 도구다.

입력:

- `rides/*.md` 초안
- `media.json`
- 선택: 사람이 직접 적은 `notes.md`

실행 예:

```bash
npm run ride:assist -- \
  --post rides/20260601-morning-ride.md \
  --media public/rides/202606/20260601-morning-ride/media.json \
  --notes raw/rides/20260601/notes.md
```

API 호출 전에 프롬프트만 확인하려면:

```bash
npm run ride:assist -- \
  --post rides/20260601-morning-ride.md \
  --media public/rides/202606/20260601-morning-ride/media.json \
  --notes raw/rides/20260601/notes.md \
  --dry-run
```

출력:

```text
drafts/20260601-morning-ride.assist.md
```

출력 문서는 다음 내용을 포함한다.

- 제목 후보
- summary 후보
- 구간별 관찰
- 하이라이트 이미지 캡션 후보
- 본문을 쓰기 위한 질문
- 사용자가 쓴 문단을 다듬은 후보

중요한 원칙:

- 없는 사건이나 감정을 만들지 않는다.
- 사용자가 `notes.md`에 적은 감정만 확장한다.
- 데이터에서 확인 가능한 사실과 추측을 구분한다.
- 최종 원고가 아니라 선택 가능한 편집 후보를 만든다.

`notes.md` 예:

```md
- 출발 전 컨디션이 별로였다.
- 탄천 합류 지점에서 바람이 셌다.
- 한강에 들어가고 나서 기분이 좋아졌다.
- 돌아오는 길에는 무릎이 조금 불편했다.
```

기본 모델은 `gpt-5.4-mini`를 사용한다. 공식 OpenAI 모델 문서 기준으로 최신
모델은 Responses API에서 사용할 수 있고, `gpt-5.4-mini`와 `gpt-5.4-nano`는
비용과 속도를 줄이고 싶을 때 적합한 선택지다. 더 강한 문장 편집이 필요하면
`--model gpt-5.4`처럼 명시할 수 있다.

## 4단계: 뷰어 연결

다음 MVP에서는 `GpxRouteViewer`가 `mediaManifestUrl`을 읽는다.

- `mediaManifestUrl`이 없으면 기존 카카오 로드뷰를 사용한다.
- `mediaManifestUrl`이 있으면 로드뷰 영역에 GoPro 프레임 이미지를 표시한다.
- 슬라이더, 재생, 고도 그래프 클릭 시 현재 GPX 시각과 가장 가까운 프레임을 찾는다.
- 이후에는 GoPro/로드뷰 전환 UI를 추가할 수 있다.

## media.json 형식

```json
{
    "frameIntervalSec": 5,
    "frames": [
        {
            "index": 1,
            "elapsedSec": 0,
            "time": "2026-06-01T07:20:00.000Z",
            "src": "/images/rides/202606/20260601-morning-ride/frames/frame-000001.jpg",
            "lat": 37.123,
            "lng": 127.123,
            "distanceKm": 0,
            "heading": 82,
            "speedKmh": 21.4,
            "heartRate": 132,
            "cadence": 84
        }
    ],
    "gpxStartTime": "2026-06-01T07:12:00.000Z",
    "highlights": [],
    "slug": "20260601-morning-ride",
    "trimmedGpxUrl": "/gpx/202606/20260601-morning-ride.trimmed.gpx",
    "version": 1,
    "videoStartTime": "2026-06-01T07:20:00.000Z",
    "viewerStartTime": "2026-06-01T07:20:00.000Z"
}
```

`highlights`는 MVP에서는 비어 있어도 된다. 나중에 방향 전환, 정차, 오르막,
속도 변화, 심박 변화, 수동 선택 프레임 등을 기반으로 채운다.

## 다음 작업 순서

1. `mediaManifestUrl`을 ride content schema에 추가한다.
2. `create-ride-draft.ts`로 블로그 초안 생성을 지원한다.
3. `assist-ride-writing.ts`로 OpenAI API 기반 편집 보조를 지원한다.
4. 실제 다음 라이딩의 GoPro 영상과 GPX로 `ride:prepare`를 검증한다.
5. `GpxRouteViewer`에서 GoPro 프레임 표시를 구현한다.
6. 하이라이트 수동 선택 또는 자동 추천 스크립트를 추가한다.
7. 초안 본문에 하이라이트 설명과 방향 정보를 더 풍부하게 넣는다.

## 운영 메모

- 첫 테스트는 `--frame-interval 30` 정도가 좋다. 긴 영상에서 5초 간격은 이미지가
  너무 많이 생길 수 있다.
- 원본 영상은 저장소에 커밋하지 않는다.
- 최종 블로그에는 trimmed GPX, media.json, 압축된 프레임 이미지만 포함한다.
- 자동 블로깅은 완성 글이 아니라 초안 생성으로 보는 편이 좋다.

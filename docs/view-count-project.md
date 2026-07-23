# 자체 조회수 집계 프로젝트

## 상태

방향 합의 단계. 구현 전 설계 문서이며, 아직 서비스·DB·비밀 값은 만들거나 연결하지 않는다.

### 결정 사항

- 콘텐츠와 정적 배포는 **GitHub Pages + Astro**를 계속 사용한다.
- 동적 기능은 별도 **Cloudflare Worker + D1**으로 제공한다.
- 1차 기능은 **자체 조회수와 좋아요**다.
- GA4는 유입·검색·체류 분석용으로 유지하며, 자체 지표를 대체하지 않는다.
- 익명 식별은 localStorage UUID가 아니라, Worker가 발급하는 **HttpOnly 1st-party 쿠키**를 사용한다.

## 배경과 문제

현재 카드의 조회수는 배포 시 GitHub Actions가 GA4 Data API에서 받아 정적 파일에 넣는다.
이는 콘텐츠 성과 분석에는 유용하지만, 사이트에 표시할 누적 조회수로는 다음 한계가 있다.

- GA 설치 이전 조회는 복구할 수 없다.
- 광고 차단, 추적 거부, 자바스크립트 차단 방문은 집계되지 않을 수 있다.
- GA4 속성/스트림 설정이 바뀌면 표시 값의 연속성이 끊길 수 있다.
- 정적 사이트이므로 재배포 전에는 표시 수치가 갱신되지 않는다.
- 이전 URL의 조회를 현재 URL과 합치려면 별도 alias 관리가 필요하다.

목표는 GA4를 대체하는 것이 아니라, 사이트 표시용으로 소유·검증 가능한 **자체 페이지 조회·좋아요 지표**를 갖는 것이다. GA4는 유입원, 검색, 체류시간 등 분석용으로 계속 유지한다.

## 목표와 비목표

### 목표

- `/article/{slug}/` 단위의 누적 조회수와 일별 조회수를 제공한다.
- 글별 좋아요 수와 현재 브라우저의 좋아요 상태를 제공한다.
- URL의 trailing slash, 쿼리스트링, 해시 차이로 같은 글의 수치가 갈라지지 않게 한다.
- 자동화된 봇·반복 새로고침을 완화하고, 개인 식별 정보는 저장하지 않는다.
- 정적 GitHub Pages 배포와 독립적으로 수치를 갱신한다.
- 현재 GA4 표시값과 병행 비교할 수 있게 한다.

### 비목표

- 사람 1명당 정확히 한 번만 세는 완벽한 unique visitor 측정
- 광고 차단을 우회하거나 브라우저 지문을 수집하는 것
- GA4의 유입 채널·전환·체류 분석 기능 대체
- 과거의 누락된 조회수 복원

## 지표 정의

초기 화면의 숫자는 `자체 집계 조회`로 표기한다.

- **조회 이벤트**: 문서가 실제로 표시된 뒤, 짧은 지연 시간(예: 2초)과 `visibilityState === 'visible'` 조건을 통과한 요청 1건
- **중복 제한**: 같은 브라우저의 같은 글은 하루 1회만 카운트한다. 이 기준은 DB의 일별 익명 방문자 키로 강제한다.
- **경로**: `/article/{slug}`로 정규화한다. trailing slash, query string, hash는 제거한다.
- **누적 조회수**: 일별 수치의 합계. 숫자가 언제부터의 것인지 UI에서 명시한다.
- **좋아요**: 익명 브라우저 하나가 글 하나에 남길 수 있는 반응 1개. 재클릭하면 취소하는 토글 방식이다.

"조회수"와 "순 방문자"는 다르다. 순 방문자 수가 필요해지면 별도 지표로 추가한다.

## 권장 아키텍처

GitHub Pages는 서버 함수를 제공하지 않으므로, API는 별도 서버리스 런타임에 둔다.

```text
GitHub Pages / Astro
  ├─ POST https://api.blog.yeppyshiba.com/v1/views
  ├─ POST/DELETE https://api.blog.yeppyshiba.com/v1/likes
  └─ GET https://api.blog.yeppyshiba.com/v1/stats?paths=...
                 │
                 ▼
Cloudflare Worker
  ├─ 익명 HttpOnly 쿠키 발급·검증
  ├─ 경로·Origin 검증, rate limit, 봇 완화
  ├─ CDN 캐시된 stats 응답
  └─ Cloudflare D1
      ├─ article_view_daily
      ├─ article_view_totals
      └─ article_likes
```

어느 조합이든 API에서 DB 자격증명을 보관하며, 브라우저는 DB에 직접 연결하지 않는다.

## 저비용 솔루션 비교

요금과 무료 한도는 2026-07-22 기준이며, 도입 직전에 각 서비스의 가격 페이지를 다시 확인한다. 여기서 비용은 수집 API와 DB의 비용만 뜻하며, 도메인·기존 GitHub Pages 비용은 제외한다.

| 선택지 | 월 고정비(소규모) | 장점 | 주의점 | 적합도 |
| --- | --- | --- | --- | --- |
| **Cloudflare Worker + D1** | **$0부터** | 수집 API·DB·캐시를 한 플랫폼에 두고, 정적 GitHub Pages와 쉽게 연결한다. 단순 카운터에 SQL이면 충분하다. | D1은 SQLite 계열이며 PostgreSQL이 아니다. DB 스키마/쿼리가 Postgres 전용이면 이식성이 낮다. | **1순위** |
| **Cloudflare Worker + Neon Postgres** | **$0부터** | 표준 PostgreSQL과 scale-to-zero를 쓴다. 이후 통계 대시보드나 다른 서비스 데이터와 합치기 좋다. | 플랫폼이 둘로 나뉘고, 저트래픽에서는 DB 기동 지연이 있을 수 있다. | Postgres가 필요한 경우 1순위 |
| **Supabase Edge Function + Postgres** | **$0부터** | DB·함수·관리 UI·Auth를 한 제품에서 제공한다. SQL 관리 경험이 편하다. | Free 프로젝트는 1주 비활성 후 pause될 수 있어, 공개 조회수의 무중단 운영에는 부적합할 수 있다. Pro는 $25/월부터다. | 향후 Auth/관리 기능까지 필요할 때 |
| **GA4만 유지 + 정기 정적 갱신** | $0 | 구현·운영이 거의 없다. 유입 분석을 그대로 쓴다. | 현재의 정확성·갱신·독립성 문제를 해결하지 못한다. | 임시 fallback |

### 무료 한도와 대략적인 규모

- Cloudflare Workers Free는 하루 100,000 요청, D1 Free는 하루 100,000행 쓰기·500만행 읽기·총 5GB 저장을 제공한다. 이 프로젝트는 페이지뷰 1건을 보통 1~몇 행 쓰기로 처리하므로, 소규모 블로그라면 충분한 여유가 있다. 목록 조회 API는 CDN 캐시를 둬서 DB 읽기를 줄인다. [Workers 가격](https://developers.cloudflare.com/workers/platform/pricing/) · [D1 가격](https://developers.cloudflare.com/d1/platform/pricing/)
- Neon Free는 프로젝트당 월 100 CU-hours와 0.5GB 저장을 제공하고, 유휴 상태에서는 5분 후 scale-to-zero 된다. 실제 트래픽이 낮으면 $0로 가능하지만, DB가 깨어나는 지연과 별도 Worker 운영은 감수해야 한다. [Neon 가격](https://neon.com/pricing)
- Supabase Free는 DB 500MB·월 50만 Edge Function 호출을 제공하지만, 1주 비활성 시 프로젝트가 pause된다. Pro 시작가는 월 $25다. [Supabase 가격](https://supabase.com/pricing) · [Edge Functions 가격](https://supabase.com/docs/guides/functions/pricing)

### 선택 결론

**Phase 1 PoC는 Cloudflare Worker + D1으로 시작하는 것을 권장한다.** 조회수 카운터의 핵심은 단순한 `INSERT`/`UPSERT`와 합계 조회이므로 Postgres 고유 기능이 필요하지 않다. 무료 한도가 충분하고, API·rate limit·캐시를 한 곳에서 운영해 비용과 장애 지점을 가장 적게 만들 수 있다.

다만 아래 중 하나가 확정되면 처음부터 **Cloudflare Worker + Neon Postgres**를 선택한다.

- 기존 또는 가까운 미래의 서비스가 PostgreSQL을 이미 사용한다.
- 복잡한 분석 쿼리, materialized view, Postgres 확장 기능을 실제로 쓸 계획이 있다.
- D1/SQLite와 다른 데이터 모델로 다시 옮길 비용이 지금의 단순성보다 크다.

Supabase는 사용자 인증·관리 페이지·DB UI까지 곧바로 만들 계획일 때만 고려한다. 단순 카운터 하나를 위해 유료 전환 가능성이 높은 선택지로 시작하지 않는다.

### 익명 식별과 클라이언트 요청

- 글 본문 페이지에서만 작은 클라이언트 스크립트를 실행한다.
- 조회와 좋아요 요청은 `fetch(..., { credentials: 'include', keepalive: true })`로 보낸다. 별도 API 서브도메인 쿠키를 안정적으로 전송하기 위해 cross-origin `sendBeacon()`에는 의존하지 않는다.
- 첫 API 요청에서 Worker는 암호학적으로 안전한 랜덤 ID를 만들고, 서명한 불투명 쿠키 `blog_aid`를 설정한다.
- 쿠키에는 `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 적절한 `Max-Age`(초기안: 180일)를 적용한다. 프론트엔드 JavaScript는 이 ID를 읽거나 수정할 수 없다.
- Worker는 원본 쿠키 ID를 D1에 저장하지 않는다. 조회수에는 `HMAC(secret, 쿠키ID + 날짜)`, 좋아요에는 `HMAC(secret, 쿠키ID)`만 저장해 각각 일별 중복 제한·좋아요 소유 확인에 쓴다.
- localStorage UUID, 브라우저 지문, 이메일, 원본 IP는 식별 수단으로 사용하거나 저장하지 않는다.
- 사용자가 쿠키를 삭제하거나 다른 브라우저·기기를 쓰면 새 익명 사용자로 취급된다. 이는 로그인 없는 서비스에서 허용하는 한계다.
- Do Not Track 또는 향후 동의 설정을 존중할 수 있도록 전송 여부를 하나의 설정으로 분리한다.

### API 보호

- `Origin: https://blog.yeppyshiba.com`만 허용하고, credentials 요청용 CORS를 정확한 origin으로 제한한다. 와일드카드(`*`)는 사용하지 않는다.
- `/article/` allowlist 및 최대 경로 길이를 검증한다.
- IP/토큰 기준 rate limit을 KV 등에 짧게 보관한다.
- User-Agent 기반 차단은 보조 수단으로만 사용한다. 비정상 요청은 204로 조용히 버린다.
- API secret, DB URL, salt는 서버리스 환경 변수에만 둔다.

완전한 봇 방지는 불가능하다. 이 설계의 목적은 조작 비용을 높이고 공개 지표를 안정화하는 것이다.

## 최소 스키마 초안

아래는 D1(SQLite) 기준 초안이다. 시간은 ISO 8601 UTC 문자열(`text`)로 저장하고, 날짜는 `YYYY-MM-DD` 문자열(`text`)로 저장한다.

```sql
create table article_view_daily (
  view_date text not null,
  canonical_path text not null,
  visitor_day_hash text not null,
  first_seen_at text not null,
  primary key (view_date, canonical_path, visitor_day_hash)
);

create table article_view_totals (
  canonical_path text primary key,
  total_views bigint not null default 0,
  updated_at text not null
);

create table article_likes (
  canonical_path text not null,
  visitor_hash text not null,
  created_at text not null,
  primary key (canonical_path, visitor_hash)
);
```

`article_view_daily` 삽입이 실제로 새 행을 만들었을 때에만 `article_view_totals`를 1 증가시키는 D1 batch/트랜잭션이 필요하다. 좋아요 추가·취소와 집계도 Worker에서 원자적으로 처리한다. 원본 쿠키 ID, IP, referrer 전문, 브라우저 지문은 저장하지 않는다.

데이터가 늘면 일별 중복 방지 테이블은 보존 기간(예: 90일)을 두고 삭제할 수 있다. 총계와 일별 집계는 유지한다.

## 화면 적용 원칙

1. 1차: 글 상세에서 이벤트만 수집하고, 조회수 표시는 기존 GA4 값을 유지한다.
2. 2차: 카드 목록은 API의 bulk endpoint에서 수치를 받아 표시한다. 목록 전체가 실패해도 레이아웃은 유지하고 `—` 또는 기존 GA4 fallback을 표시한다.
3. 3차: 충분한 비교 기간 후, UI 표기를 `자체 집계 조회`로 바꾸거나 GA4 값과 병기한다.

초기에는 표시 API 응답을 CDN에서 5~15분 캐시한다. 집계 POST는 캐시하지 않는다.

## 도입 단계와 완료 기준

### Phase 0 — 현재 상태 기준선

- [ ] GA4 속성 ID와 실제 측정 ID가 같은 데이터 스트림인지 확인한다.
- [ ] 대표 글 10개의 GA4 UI 값과 Data API 값을 비교한다.
- [ ] URL 변경 이력을 alias 목록으로 정리한다.

완료 기준: 자체 집계와 비교할 기준값·정규 경로가 문서화되어 있다.

### Phase 1 — 수집 PoC

- [ ] 별도 개발 D1 DB와 Cloudflare Worker endpoint를 만든다.
- [ ] 단일 테스트 글에서 익명 쿠키가 발급되고, 일별 조회 중복과 좋아요 토글이 올바르게 동작하는지 확인한다.
- [ ] Origin 검증, 경로 검증, rate limit, 비밀 환경 변수를 적용한다.

완료 기준: 새로고침을 반복해도 같은 브라우저·같은 날에는 조회 총계가 한 번만 증가하며, 좋아요는 한 번만 남고 재클릭으로 취소된다.

### Phase 2 — 읽기 API와 관측

- [ ] 단일/복수 경로 조회 endpoint와 CDN 캐시를 추가한다.
- [ ] 실패율, 차단 수, DB 오류만 운영 로그로 관측한다. 개인 데이터는 남기지 않는다.
- [ ] GA4와 2~4주 병행 비교한다.

완료 기준: 페이지 표시 성능 저하 없이 수치가 안정적으로 갱신되고, 이상 급증을 식별할 수 있다.

### Phase 3 — 운영 전환

- [ ] UI 라벨과 개인정보처리방침을 실제 수집 방식에 맞게 갱신한다.
- [ ] GA4 fallback/병기 여부를 결정한다.
- [ ] DB 백업·보존 기간·월 비용 알림을 설정한다.

완료 기준: 독립 지표의 의미와 한계가 사용자와 운영자 모두에게 명확하다.

## 결정이 필요한 항목

- API 호스트명: `api.blog.yeppyshiba.com` 사용 여부와 DNS/CORS 설정
- 익명 쿠키 보존 기간: 초기안 180일
- UI: GA4와 병기할지, 자체 집계로 전환할지 및 좋아요 버튼 문구
- 개인정보정책과 동의 배너의 적용 범위
- 무료 티어 한도, 장애 시 fallback 방식

## 다음 작업

Phase 0의 GA4 속성/스트림 검증이 끝난 뒤, Cloudflare Worker + D1 기준으로 API 계약과 migration SQL을 확정한다. Cloudflare 계정·DNS·DB 연결은 이 문서 승인 후에만 진행한다.

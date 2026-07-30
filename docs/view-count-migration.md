# GA4 조회수에서 자체 집계로 이전

## 결정

Astro 정적 사이트와 콘텐츠 배포는 GitHub Pages에 그대로 둔다. Cloudflare에는
`workers/view-counter/`의 Worker와 그 Worker에 binding된 D1만 배포한다. 따라서
기존 GitHub Pages 배포 workflow와 Worker의 Wrangler 배포 workflow는 분리한다.

기존 GA4 누적 조회수를 버리지 않고, 전환 시점의 `src/data/ga-views.json`
스냅샷을 D1의 `article_view_baselines`에 한 번 가져온다. 이후 새 조회는
`article_view_totals`에만 더한다. API가 두 값을 합쳐 표시한다.

이렇게 하면 카드의 숫자가 전환일에 0으로 떨어지지 않고, 과거 GA4 집계와
자체 집계가 데이터베이스 안에서도 구분된다. GA4의 과거 개별 방문자를
일별 익명 방문 데이터로 복원하려 하지는 않는다.

## 전환 순서

1. `workers/view-counter`의 D1 DB를 만들고 `0001` migration을 적용한다.
2. 배포 직전 `src/data/ga-views.json`을 고정한다.
3. 해당 파일의 `/article/...` 경로를 정규화해 `source = 'ga4'` baseline으로
   한 번 import한다. 같은 source/path는 UPSERT로 덮어쓰므로 재시도 가능해야 한다.
4. Worker의 조회 수집을 켠다. 이 시점부터 새 조회만 자체 총계에 추가한다.
5. 목록 API는 `GA4 baseline + 자체 총계`를 반환한다. UI 문구는 처음에는
   `누적 조회`를 사용하고, 개인정보처리방침도 익명 쿠키 기반 집계를 반영한다.

## 2026-07-30 완료 기록

- 원격 D1에 `0002_increment_total_on_new_daily_view.sql` migration을 적용했다.
- `VIEW_COUNTER_HMAC_SECRET`을 Worker secret으로 등록했다.
- `yeppyshiba-view-counter` Worker를 배포했다. 배포 버전 ID는
  `99e4fd96-1f24-4a65-bb6a-be139900cb0e`이다.
- `src/data/ga-views.json`에서 정규화한 GA4 baseline 65개를 import했다.
  D1 실행 결과는 65개 쿼리, 130개 행 쓰기, DB 크기 0.06MB였다.

첫 import는 SQL transaction 문을 포함해 실패했지만, D1이 전체 작업을 원상 복구했다.
transaction 문을 제거한 idempotent UPSERT import를 재실행해 성공했다. 따라서 중복 baseline은
생기지 않았다.

## 배포 경계

```text
GitHub Actions → Astro build → GitHub Pages (blog.yeppyshiba.com)
Worker 배포       → Cloudflare Worker + D1 (api.yeppyshiba.com)
```

브라우저는 정적 페이지에서 `api.yeppyshiba.com`의 API만 호출한다. API는
`Origin: https://blog.yeppyshiba.com`을 정확히 허용하고, D1은 Worker binding을 통해서만 접근한다.

## Cloudflare 콘솔에서 따라 하는 생성 순서

이 절차는 GitHub Pages의 `blog.yeppyshiba.com`을 건드리지 않고,
`api.yeppyshiba.com`만 Worker의 전용 hostname으로 추가하는 순서다.

### 0. 시작 전 확인

- 현재 DNS 제공자에서 `yeppyshiba.com`의 모든 DNS 레코드를 내보내거나 캡처한다.
  특히 GitHub Pages에 연결된 `blog` 레코드와 이메일(MX, SPF, DKIM, DMARC) 레코드는
  이름·종류·값·TTL을 모두 보관한다.
- `api`라는 이름의 CNAME/A/AAAA 레코드가 이미 있는지 확인한다. 있으면 Custom Domain을
  만들기 전에 무엇이 사용 중인지 확인하고, 임의로 삭제하지 않는다.
- 이 작업은 GitHub Pages 프로젝트를 Cloudflare Pages로 이전하는 작업이 아니다.
  기존 GitHub Actions 배포와 GitHub Pages 설정은 그대로 둔다.

### 1. Cloudflare 계정과 DNS zone 준비

1. [Cloudflare dashboard](https://dash.cloudflare.com/)에 로그인하고, 조회수 서비스를
   관리할 계정을 선택한다.
2. Account Home에서 **Add a domain**을 선택해 `yeppyshiba.com` zone을 추가한다.
   이미 zone이 있고 상태가 **Active**라면 이 단계는 건너뛴다.
3. Cloudflare가 기존 DNS 레코드를 import하면, 0단계에서 보관한 목록과 하나씩 대조한다.
   `blog`의 GitHub Pages 레코드와 이메일 레코드가 빠지지 않았는지 확인한다.
4. 아직 Cloudflare가 authoritative DNS가 아니라면, 도메인 등록기관 화면에서
   nameserver를 Cloudflare가 제시한 두 값으로 변경한다. 변경 후 zone 상태가 **Active**가
   될 때까지 기다린다.
5. `https://blog.yeppyshiba.com`을 열어 기존 정적 블로그가 정상인지 다시 확인한다.
   정상이라면 GitHub Pages의 origin과 배포 흐름은 그대로 유지되고 있는 것이다.

Cloudflare zone이 Active가 아니면 Worker Custom Domain을 붙일 수 없다. nameserver 변경 전
레코드 검증을 건너뛰면 GitHub Pages나 이메일이 끊길 수 있으므로, 이 단계가 가장 중요하다.

### 2. D1 데이터베이스 생성

1. Dashboard 왼쪽 메뉴에서 **Workers & Pages** > **D1 SQL Database**로 이동한다.
2. **Create database**를 선택한다.
3. 이름은 `yeppyshiba-view-counter`로 입력하고, Location hint는 `APAC`로 선택한다.
4. **Create**를 누른 뒤, 데이터베이스의 ID를 복사한다.
5. 저장소의 `workers/view-counter/wrangler.jsonc`에서
   `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`를 그 ID로 교체한다. binding 이름
   `VIEW_COUNTER_DB`와 database name은 바꾸지 않는다.
6. migration은 저장소의 SQL을 기준으로 적용한다.

```bash
npx wrangler@latest d1 migrations apply yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --remote
npx wrangler@latest d1 migrations list yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --remote
```

첫 명령은 Cloudflare 로그인 또는 API 권한을 요구할 수 있다. Console SQL 창에 schema를
복사해 붙여넣는 방법도 가능하지만, 운영 schema의 기준을 Git에 남기기 위해 migration
명령을 사용한다.

### 3. Worker 배포와 D1 binding 확인

1. 저장소 루트에서 아래 명령을 실행한다.

```bash
npx wrangler@latest deploy --config workers/view-counter/wrangler.jsonc
```

2. Dashboard의 **Workers & Pages**에서 `yeppyshiba-view-counter` Worker를 연다.
3. **Settings** > **Bindings**에서 `VIEW_COUNTER_DB`가
   `yeppyshiba-view-counter` D1 database에 연결됐는지 확인한다.
4. Worker가 제공한 `workers.dev` URL 끝에 `/healthz`를 붙여 연다. 현재는
   `{ "ok": true }`만 반환하는 연결 점검 endpoint다. 이 URL은 운영 API hostname이
   아니라 배포 확인용이다.

### 4. `api` hostname을 Worker Custom Domain으로 연결

1. Worker 화면에서 **Settings** > **Domains & Routes** (UI에 따라 **Domains**)로 이동한다.
2. **Add** > **Custom Domain**을 선택한다.
3. `api.yeppyshiba.com`을 입력하고 **Add Custom Domain**을 선택한다.
4. 인증서 발급과 상태가 Active가 될 때까지 기다린다.
5. `https://api.yeppyshiba.com/healthz`를 열어 `{ "ok": true }`를 확인한다.

여기서는 DNS Records 화면에서 `api` CNAME을 직접 만들지 않는다. Worker가 해당 hostname의
origin이므로 Custom Domain이 DNS 레코드와 인증서를 자동으로 만든다. 기존 `api` CNAME이
있으면 Custom Domain 생성이 거부되므로, 용도를 확인한 뒤에만 정리한다. `api.yeppyshiba.com`은
기존 Universal 인증서의 `*.yeppyshiba.com` 범위에 들어가므로, `api.blog.yeppyshiba.com`처럼
별도 Advanced Certificate가 필요하지 않다. `blog` hostname에 Route를 걸거나 GitHub Pages의
DNS를 Worker로 바꾸면 안 된다.

### 5. 다음 구현 전에 기록할 값

- Cloudflare account 이름과 D1 database ID (ID는 비밀값은 아니지만 저장소에서 관리한다)
- Worker 이름: `yeppyshiba-view-counter`
- API origin: `https://api.yeppyshiba.com`
- 정적 사이트 origin: `https://blog.yeppyshiba.com`

Worker API는 운영 origin `https://blog.yeppyshiba.com`과 개발 검증용
`http://localhost:4321`, `http://127.0.0.1:4321`만 CORS allowlist에 넣었다.
`/v1/views`는 서명된 HttpOnly 쿠키를 발급하고, `/v1/stats`는 GA4 baseline과 자체 총계를
합쳐 반환한다. 아직 Astro 클라이언트가 이 API를 호출하지 않으므로 `/healthz` 확인만으로 실제
조회가 쌓이지는 않는다.

### 기존 `api.blog` 설정 정리

`api.yeppyshiba.com/healthz`가 정상 응답하는 것을 확인한 뒤에만 기존
`api.blog.yeppyshiba.com` Custom Domain을 Worker에서 제거한다. 그 hostname만을 위해
만든 Pending Advanced Certificate가 남아 있다면, SAN 목록에 다른 사용 중인 hostname이 없는지
확인한 뒤 정리한다. Cloudflare가 Universal 인증서용 CAA 레코드를 관리한다고 안내하면 수동
CAA 레코드를 추가하지 않는다. 인증서 화면에 `CAA records block issuance` 오류가 실제로
나타날 때만, 해당 화면과 Cloudflare 문서가 요구하는 CA 허용값을 검토한다.

## Worker 배포와 GA4 기준값 import

`0002` migration까지 적용한 뒤, Worker 비밀값을 interactive prompt로 설정하고 배포한다.
비밀값은 `wrangler.jsonc`, Git, 명령줄 인자에 넣지 않는다.

```bash
npx wrangler secret put VIEW_COUNTER_HMAC_SECRET --config workers/view-counter/wrangler.jsonc
npx wrangler deploy --config workers/view-counter/wrangler.jsonc
```

그 다음 현재 `src/data/ga-views.json`의 GA4 누적값을 한번만 D1 baseline으로 import한다.
먼저 dry run으로 대상 행 수를 확인하고, 전환 시점의 JSON이 맞을 때만 `--apply`를 붙인다.

```bash
npm run views:import-ga-baseline
npm run views:import-ga-baseline -- --apply
```

import는 `source = 'ga4'` 기준으로 UPSERT하므로, 중간 실패 후 같은 스냅샷으로 재실행할 수
있다. 이후에 GA4 JSON을 다시 생성했다면 기준값을 의도치 않게 바꾸지 않도록 `--apply`를
실행하지 않는다.

이 작업은 2026-07-30에 완료됐다. 이후의 Astro 연결 코드도 준비됐다. 글 상세는
`POST /v1/views { "id": "글-id" }`를 보내고, 카드 목록은 한 번의
`GET /v1/stats?ids=글-id-1,글-id-2` 요청으로 숫자를 갱신한다. Worker는 각 ID를
`/article/{id}`로 정규화하므로, 브라우저가 canonical path를 직접 조합할 필요가 없다.
정적 사이트와 Worker를 배포한 뒤 실제 브라우저 검증만 남아 있다.

## 데이터 경계

- `article_view_baselines`: 전환 시점 이전의 GA4 누적 스냅샷
- `article_view_daily`: 같은 브라우저·같은 글·같은 UTC 날짜 중복 방지용 HMAC 값
- `article_view_totals`: 전환 뒤 Worker가 집계한 누적 조회

원본 쿠키 ID, IP 주소, 전체 referrer, 브라우저 지문은 D1에 저장하지 않는다.

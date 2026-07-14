# 블로그 SEO를 뒤늦게 다시 연결한 날 — Search Console 0개 색인에서 시작한 점검 기록

> 내부 초안. 게시 전에는 캡처 3장을 `public/images/posts/202607/`에 저장하고,
> 실제 파일 경로·alt 텍스트를 아래 표시 위치에 반영한다. 이 파일은 콘텐츠 컬렉션에
> 포함되지 않으므로 배포되거나 색인되지 않는다.

## 글의 한 줄 방향

글이 없어서 검색 노출이 없는 것이 아니라, **검색엔진에 어떤 URL을 우선 확인해 달라고
알리는 기본 연결이 늦어졌을 때 무엇부터 정리하는지**를 기록한다. 숫자가 바로 회복될
것이라는 성공담이 아니라, 기준점을 다시 만드는 작업 일지로 쓴다.

## 제목 후보

1. 블로그 sitemap을 이제야 다시 제출했다 — Search Console 0개 색인에서 시작한 정리
2. 검색 노출이 멈춘 개인 블로그에서 먼저 한 일: sitemap과 얇은 페이지 정리
3. 251개 미색인 페이지를 보고 sitemap부터 손본 이유

권장 제목은 1번이다. ‘이제야’라는 솔직한 시작점과 실제 작업이 함께 드러난다.

## 추천 frontmatter

```yaml
title: 블로그 sitemap을 이제야 다시 제출했다 — Search Console 0개 색인에서 시작한 정리
date: 2026-07-15T09:00:00+09:00
summary: Search Console에서 0개의 색인 생성 페이지와 251개의 미색인 페이지를 확인한 뒤, 개인 블로그의 sitemap·robots·canonical·태그 아카이브를 정리한 기록입니다. 바로 순위가 오르기를 기대하기보다 Google이 읽을 URL의 기준부터 다시 만들었습니다.
category: coding
image: /images/posts/202607/search-console-sitemap-recovery-cover.png
tags:
  - google-search-console
  - seo
  - static-site
  - astro
  - blog-management
```

## 본문 초안

### 검색 성과보다 먼저, 색인 상태를 봤다

블로그의 최근 성과 화면을 열었을 때, 선택 기간 기준 클릭은 45회, 노출은 3.71천 회였다.
평균 CTR은 1.2%, 평균 게재순위는 6.6으로 표시됐다. 숫자만 보면 완전히 아무 일도 없던
사이트는 아니었다.

하지만 그래프를 보면 클릭과 노출은 4월 이후 거의 이어지지 않았다. 여기서 바로 제목이나
키워드를 바꾸는 대신, 먼저 Search Console의 색인 상태와 sitemap을 확인하기로 했다.

![Search Console 성과 화면: 클릭 45회, 노출 3.71천 회, CTR 1.2%, 평균 게재순위 6.6](/images/posts/202607/search-console-performance-before-sitemap.png)

> 캡처 1. 성과 화면. 글에서는 ‘16개월 선택 기간의 화면’이라는 범위를 함께 적고,
> 이 숫자가 새 sitemap 제출 후 성과라는 뜻은 아니라고 명시한다.

### sitemap은 있었지만, 지금 사이트를 가리키지 못하고 있었다

제출된 sitemap 목록에는 예전 주소들이 ‘가져올 수 없음’ 상태로 남아 있었다. 반면
`sitemap-index.xml`은 2026년 7월 14일에 새로 제출됐고, 상태는 성공이었다. 발견된
페이지가 0개인 것은 제출 직후의 화면이라, 성공/실패와 별개로 Google이 URL 목록을
처리하기 전일 수 있다.

그러므로 이 시점에 할 일은 ‘0이니까 sitemap이 실패했다’고 결론 내리는 것이 아니라,
배포된 sitemap이 **canonical인 실제 콘텐츠 URL만** 담는지 확인하고 다음 크롤링을 기다리는
일이다.

![Search Console sitemap 제출 화면: sitemap-index.xml 성공, 발견된 페이지 0개](/images/posts/202607/search-console-sitemap-submitted.png)

> 캡처 2. 오래된 실패 sitemap은 이력으로 남아 있어도 된다. 새 index sitemap이 정상
> 처리되는지를 기준으로 본다. 삭제는 필수가 아니다.

### 251개의 미색인은 원인 목록이지, 하나의 오류가 아니다

색인 보고서에는 색인 생성됨 0개, 색인이 생성되지 않음 251개가 표시됐다. 이 숫자를
‘251개가 모두 고장 났다’고 읽으면 다음 작업이 흐려진다. 목록을 열면 대개 중복 URL,
페이지네이션, 리디렉션, 얇은 태그 페이지, 아직 발견·크롤링되지 않은 새 글처럼 서로 다른
사유가 섞인다.

이번에는 특히 한두 개의 글만 가진 태그 아카이브와 목록 페이지가 많이 생성되고 있었다.
이 페이지들도 독자에게는 탐색 수단이지만, 모두 sitemap의 대표 URL이 될 필요는 없다.

![Search Console 페이지 색인 생성 화면: 색인 생성 0개와 미색인 251개](/images/posts/202607/search-console-page-indexing-before-cleanup.png)

> 캡처 3. 이 화면은 개선 전 기준선이다. ‘며칠 뒤 모두 0이 된다’는 약속 대신, 사유별
> 숫자가 어떻게 나뉘는지 확인하는 출발점으로 설명한다.

### 그래서 sitemap에는 대표 페이지 127개만 남겼다

정리 후 생성 sitemap에는 총 127개 URL만 남겼다.

- 게시글 105개
- 카테고리, 라이딩, 도구, 게임, 지도 같은 실제 허브 페이지 22개

반대로 다음 URL은 sitemap에서 제외했다.

- 한두 개 글만 가진 태그 아카이브와 태그 페이지네이션
- 홈·카테고리·라이딩 목록의 2페이지 이후
- canonical 글로 이동하는 라이딩 리디렉션 URL
- 검색 결과보다 실행이 목적인 `/play/` 게임 런타임
- 매번 내용이 달라지는 trending 페이지

제외는 삭제나 차단과 다르다. 필요한 페이지는 내부 링크로 계속 갈 수 있게 두고,
특히 얇은 태그와 페이지네이션에는 `noindex,follow`를 적용했다. Google에게는 대표 글과
허브부터 읽어 달라고 신호를 분명히 한 셈이다.

### 검색엔진이 사이트 구조를 읽을 수 있게 기본값도 다시 맞췄다

이번 점검에는 sitemap만 포함되지 않았다.

- `robots.txt`에 sitemap index 주소를 명시했다.
- 모든 페이지의 canonical URL을 확인했다.
- Open Graph의 사이트명·한국어 locale과 Twitter 카드 메타를 보강했다.
- 게시글에는 발행일, 수정일, 섹션, 태그 정보를 넣었다.
- 카테고리와 반복적으로 쌓인 핵심 태그는 탐색 허브로 유지했다.

이 작업이 검색 순위를 직접 보장하지는 않는다. 대신 검색엔진이 **무엇이 원문이고,
무엇이 목록이며, 어떤 URL을 대표로 다뤄야 하는지** 판단할 재료를 만든다.

게시글의 sitemap에는 `updated`가 있으면 그 값을, 없으면 최초 발행일을 `<lastmod>`로
넣는다. 글을 실질적으로 고친 날에만 `updated`를 바꾼다. 매 배포 때 모든 URL의 수정일을
오늘로 바꾸는 방식은 쓰지 않는다.

### 배포 뒤에는 sitemap 하나와 핵심 URL 몇 개만 확인한다

배포가 끝나면 `https://blog.yeppyshiba.com/sitemap-index.xml`을 다시 제출한다. 그 다음
URL 검사에서 홈, 가장 최근 글, 대표 허브 글처럼 실제로 새롭거나 수정한 URL만 골라
색인 생성 요청을 한다. 사이트의 모든 URL을 연속으로 요청하는 방식은 쓰지 않는다.

다음 확인은 즉시가 아니라 1~2주 뒤에 한다. sitemap의 발견된 페이지 수, 페이지 색인
생성 보고서의 사유별 분포, 검색 성과의 노출이 기준선에서 움직이기 시작하는지를 차례로
본다.

### 마무리

SEO는 제목에 키워드를 더 넣는 일부터 시작하지 않았다. 내 블로그가 지금 어떤 URL을
공개하고 있고, 그중 무엇을 대표로 검색엔진에 보여 줄지 정하는 일부터 다시 시작했다.

이제 할 일은 단순하다. 새 글을 꾸준히 쓰고, 관련 글끼리 연결하고, 몇 주 뒤 Search
Console의 사유별 숫자를 다시 읽는다. 이번 캡처는 그 전과 후를 비교할 기준점으로 남긴다.

## 게시 전 편집 메모

- ‘색인 0’은 캡처 시점의 Search Console 보고 수치다. 실제 Google 색인 전체와 같은
  의미라고 단정하지 않는다.
- `251개 미색인`의 정확한 사유는 페이지 색인 생성 보고서의 상세 목록을 열어야 알 수
  있다. 캡처만으로 원인을 ‘sitemap 누락’ 하나로 단정하지 않는다.
- 실적 숫자는 화면의 선택 기간(16개월)과 마지막 업데이트 시각을 함께 적는다.
- 독자가 따라 할 수 있게 마지막에 sitemap URL과 URL 검사 절차를 짧게 남긴다.

## 배포 후 Search Console 실행 체크리스트

### 1. 먼저 배포 확인

- [ ] `https://blog.yeppyshiba.com/robots.txt`에서 `Sitemap: https://blog.yeppyshiba.com/sitemap-index.xml`을 확인한다.
- [ ] `https://blog.yeppyshiba.com/sitemap-index.xml`이 열리고 `sitemap-0.xml`을 가리키는지 확인한다.
- [ ] `https://blog.yeppyshiba.com/sitemap-0.xml`에서 URL 수가 127개인지 확인한다.

### 2. sitemap 다시 제출

- [ ] Search Console → **Sitemaps**에서 `sitemap-index.xml`을 다시 제출한다.
- [ ] 상태가 **성공**인지 확인한다. ‘발견된 페이지 0’은 제출 직후에는 정상일 수 있으므로,
  바로 재제출을 반복하지 않는다.
- [ ] 이전에 ‘가져올 수 없음’으로 남은 옛 sitemap은 새 sitemap이 정상 처리된 뒤에만
  선택적으로 삭제한다. 새 sitemap의 처리에는 영향을 주지 않는다.

### 3. URL 검사 → 색인 생성 요청

아래 순서로만 요청한다. 각 URL 검사 결과가 이미 ‘Google에 등록됨’이라면 요청하지 않고
다음 URL로 넘어간다.

1. `https://blog.yeppyshiba.com/`
2. `https://blog.yeppyshiba.com/article/phaser4-apex-seoul-downhill-grip-cost/`
3. `https://blog.yeppyshiba.com/article/phaser4-apex-seoul-drift-state-telemetry/`
4. `https://blog.yeppyshiba.com/article/phaser4-overview/`
5. `https://blog.yeppyshiba.com/games/apex-seoul/`
6. 내일 이 SEO 기록 글을 발행한 뒤 그 글의 URL

각 URL에서의 동작은 동일하다.

1. Search Console 상단의 **URL 검사** 입력칸에 전체 URL을 붙여 넣는다.
2. 결과가 나오면 **실제 URL 테스트**를 눌러 live test가 성공하는지 확인한다.
3. canonical URL이 자기 자신인지, robots 차단이 없는지 확인한다.
4. **색인 생성 요청**을 한 번만 누른다.

요청은 우선순위를 알리는 신호일 뿐 즉시 색인을 보장하지 않는다. 같은 URL을 며칠 연속
요청하는 대신, 1~2주 뒤 페이지 색인 생성 보고서의 상세 사유를 확인한다.

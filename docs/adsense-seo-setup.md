# AdSense·SEO 운영 가이드

## 1. 구현 개요

이 사이트는 `BaseHead.astro`에서 title, description, canonical, robots, Open
Graph, Twitter Card와 페이지 성격별 JSON-LD를 한 번만 출력한다. canonical의
기준 URL은 `astro.config.mjs`의 `site`이며 개발 호스트를 사용하지 않는다.

색인 정책은 다음과 같다.

- 색인: 홈페이지, article, category 첫 페이지, 설명이 있는 games/tools/rides,
  충분한 태그, 소개·문의·개인정보 안내
- `noindex,follow`: `/play/*`, 전체·category·tag·rides의 2페이지 이후,
  게시글 3개 미만의 얇은 태그, 태그 목록, trending, 404
- sitemap 제외: 모든 `noindex` 페이지, `/rides/{slug}/` article 리디렉션,
  legacy tag 리디렉션
- 태그 예외: `featured: true`이며 직접 작성한 `description`이 있는 태그는 글이
  3개 미만이어도 index 가능

태그 임계값은 `src/config/seo.ts`의 `MIN_INDEXABLE_TAG_POSTS`에서 관리한다.
게시글 URL, 태그 URL과 기존 frontmatter의 slug 생성 규칙은 변경하지 않았다.

광고는 일반 Markdown/MDX 본문을 변형하지 않는다. 1,500자 이상인 게시글의
본문·위치 정보가 끝난 뒤, 관련 글보다 앞에 article-bottom 슬롯 하나만 둘 수 있다.
`ads: false` frontmatter로 개별 글을 끌 수 있다. `/play/*`와 도구 입력·결과 영역에는
광고 컴포넌트가 없다.

재사용 시 Astro의 예약 속성인 `slot` 대신
`<AdSlot slotId="..." placement="article-bottom" />` API를 사용한다.

## 2. 환경 변수

`.env.example`을 배포 환경의 변수 설정 기준으로 사용한다. 실제 ID나 토큰은 Git에
커밋하지 않는다.

| 변수                                 | 필수                 | 기본값       | 설명                                      |
| ------------------------------------ | -------------------- | ------------ | ----------------------------------------- |
| `PUBLIC_ADSENSE_ENABLED`             | 광고 사용 시         | `false`      | `true`이고 프로덕션 빌드일 때만 광고 허용 |
| `PUBLIC_ADSENSE_CLIENT`              | 광고 사용 시         | 빈 값        | AdSense의 `ca-pub-...` client ID          |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM` | article 광고 사용 시 | 빈 값        | 현재 실제 배치에 연결된 슬롯              |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_TOP`    | 아니요               | 빈 값        | 향후 상단 배치용, 현재 미사용             |
| `PUBLIC_ADSENSE_SLOT_ARTICLE_MIDDLE` | 아니요               | 빈 값        | 향후 중간 배치용, 현재 미사용             |
| `PUBLIC_ADSENSE_SLOT_SIDEBAR`        | 아니요               | 빈 값        | 향후 sidebar용, 현재 미사용               |
| `PUBLIC_ADSENSE_SLOT_TOOLS_BOTTOM`   | 아니요               | 빈 값        | 향후 도구 설명 하단용, 현재 미사용        |
| `PUBLIC_ADSENSE_DEBUG`               | 아니요               | `false`      | 광고 요청 없는 레이아웃 placeholder 표시  |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`    | 아니요               | 빈 값        | Search Console HTML meta 인증 토큰        |
| `PUBLIC_ANALYTICS_ENABLED`           | 아니요               | `true`       | 프로덕션 GA 전송 비활성화 스위치          |
| `PUBLIC_GOOGLE_ANALYTICS_ID`         | 아니요               | 기존 측정 ID | GA 측정 ID 교체 시 사용                   |
| `PUBLIC_KAKAO_MAP_API_KEY`           | 지도 사용 시         | 빈 값        | 기존 Kakao 지도 공개 키                   |

`PUBLIC_` 변수는 생성 HTML에 노출될 수 있다. 비밀 키를 넣지 않는다.

## 3. Publisher ID와 광고 슬롯 적용

1. AdSense 관리 화면에서 사이트 소유권과 Publisher ID를 확인한다.
2. 배포 환경에 `PUBLIC_ADSENSE_CLIENT=ca-pub-실제값`을 입력한다.
3. 반응형 display 광고 슬롯을 만든 뒤 숫자 slot ID를
   `PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM`에 넣는다.
4. 먼저 `PUBLIC_ADSENSE_ENABLED=false` 상태로 배포해 SEO 변경을 확인한다.
5. 승인 후 `PUBLIC_ADSENSE_ENABLED=true`로 바꾸고 다시 빌드·배포한다.

세 조건(프로덕션, enabled, client)이 충족되어야 loader가 출력된다. 슬롯 컴포넌트는
여기에 slot ID까지 있어야 출력된다. 슬롯 초기화 실패는 잡아서 본문 렌더링을 막지
않는다. 현재 Astro ClientRouter/View Transitions는 사용하지 않으므로 클라이언트 경로
전환에 따른 중복 초기화 처리가 필요하지 않다. 추후 ClientRouter를 도입하면
`astro:page-load`에서 미초기화 슬롯만 처리하는 회귀 테스트를 추가한다.

## 4. ads.txt 배포

`public/ads.txt.example`에는 실제 ID가 없으며 `/ads.txt`로 서비스되지 않는다.
Publisher ID가 확정된 뒤에만 다음 절차를 수행한다.

1. AdSense가 제공하는 정확한 한 줄을 복사한다.
2. `public/ads.txt`를 만들고 placeholder 없이 실제 값만 넣는다.
3. 배포 후 `https://blog.yeppyshiba.com/ads.txt`가 text 응답으로 열리는지 확인한다.
4. AdSense 관리 화면에서 상태가 반영될 때까지 기다린다.

가짜 `pub-` 값을 넣은 `public/ads.txt`는 배포하지 않는다.

## 5. 광고 제외 경로와 배치 원칙

- 항상 제외: `/play/*`, game canvas 주변, 메뉴·내비게이션, 관련 글 카드 사이
- 현재 제외: `/tools/*`, `/games/*`, `/rides/*` 허브, 페이지네이션
- 도구에 추가할 때: 계산 폼·버튼·결과·다운로드·GPX 업로드에서 충분히 떨어진 설명
  본문 하단만 사용
- 자동 광고와 Markdown AST 기반 문단 삽입은 사용하지 않음

광고 슬롯은 데스크톱 250px, 작은 화면 100px의 최소 높이를 예약한다. 실제 슬롯 크기와
수익·CLS 데이터를 확인해 placement별 높이를 조정한다. 모바일 가로 스크롤과 과도한
빈 공간도 함께 확인한다.

## 6. Search Console 확인

1. Domain 속성의 DNS 인증 상태를 확인한다.
2. HTML meta 인증이 필요할 때 토큰만 `PUBLIC_GOOGLE_SITE_VERIFICATION`에 넣는다.
3. `https://blog.yeppyshiba.com/robots.txt`에서 sitemap 선언을 확인한다.
4. `https://blog.yeppyshiba.com/sitemap-index.xml`을 제출하거나 다시 읽도록 요청한다.
5. sitemap의 표본 URL과 각 페이지 canonical이 완전히 같은지 확인한다.
6. URL 검사로 홈, 최신 article, category, index 가능한 tag, game, tool, rides를 검사한다.
7. `/play/*`, `/page/2/`, tag 2페이지, 얇은 tag는 라이브 테스트에서
   `noindex,follow`인지 확인한다.
8. 색인 제외 보고서의 “noindex 태그에 의해 제외됨” 증가는 의도한 URL과 대조한다.

페이지를 `robots.txt`로 차단하지 않는다. 크롤러가 HTML robots meta를 읽을 수 있어야
한다. 별도 staging 환경은 현재 코드에 정의되어 있지 않다. staging을 만들면 배포 플랫폼
인증 또는 응답 헤더와 전역 `noindex`를 함께 쓰고, 프로덕션 도메인으로 공개 링크하지
않는다.

## 7. 개인정보와 동의 설정

신청 전에 `/about/`, `/privacy/`, `/contact/` 내용을 운영자가 직접 검토한다.

- 운영 주체 표기와 실제 문의 가능 채널
- GA와 AdSense의 실제 활성 상태
- 쿠키·외부 서비스 설명
- Google의 EEA/영국/스위스 동의 관리 요구가 적용되는지
- Google 인증 CMP를 사용할지와 광고 개인화 기본값
- 정책 시행일과 내용 변경 시 수정일 관리

이 문서는 법률 자문이 아니다. 서비스 지역과 실제 데이터 처리 방식에 맞춰 별도 검토가
필요하다.

## 8. AdSense 신청 전 체크리스트

- 사이트 전체가 HTTPS로 열리고 주요 링크에 404가 없음
- 홈에서 소개, 카테고리, 개인정보 안내, 문의에 접근 가능
- 게시글·게임 소개·도구 설명이 원본 콘텐츠로 충분함
- 빈 category/tag, 개발·테스트 URL이 sitemap에 없음
- `/play/*`에 광고와 GA가 없고 `noindex,follow`임
- Publisher ID와 slot ID를 임의 생성하지 않음
- 실제 `ads.txt`는 승인된 계정 정보와 일치함
- 모바일에서 광고가 콘텐츠·버튼을 가리지 않음
- CSP를 도입했다면 AdSense가 요구하는 script/frame/connect/image 도메인을 Google 최신
  문서와 대조해 허용함. 현재 저장소에는 CSP 설정이 없음

## 9. 배포 후 검증

1. 페이지 소스에서 AdSense loader가 페이지당 1개인지 확인한다.
2. article-bottom 외에 `<ins class="adsbygoogle">`가 없는지 확인한다.
3. `/play/*`와 slot 미설정 페이지에 AdSense 문자열이 없는지 확인한다.
4. 개발 서버에는 GA와 AdSense 외부 스크립트가 없는지 확인한다.
5. Lighthouse 또는 실제 사용자 데이터로 LCP와 CLS를 배포 전후 비교한다.
6. DevTools Console에서 중복 초기화와 CSP 오류를 확인한다.
7. Search Console sitemap 성공 건수와 제외 사유를 이전 값과 비교한다.
8. GA DebugView에서 단일 페이지 로드당 page_view가 한 번인지 확인한다.

내부 테스트 트래픽은 GA 관리 화면의 내부 트래픽 규칙과 개발자 필터로 제외한다. 이
저장소는 프로덕션 빌드가 아닌 경우 GA 자체를 출력하지 않는다.

## 10. 권장 배포 순서

1. SEO·색인 변경만 먼저 배포
2. Search Console에서 sitemap 재제출
3. 주요 URL 검사
4. 개인정보 안내와 소개·문의 페이지 검토
5. AdSense 신청
6. 승인 후 Publisher ID 입력
7. article-bottom 슬롯 하나만 활성화
8. CLS, 광고 오류, 이탈률 확인
9. 문제가 없을 때만 새 placement를 코드 리뷰 후 추가

## 11. 회귀 위험과 롤백

| 위험                  | 확인                                    | 롤백                                                               |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| meta 중복             | 생성 HTML에서 name/property별 개수 확인 | 페이지별 직접 meta를 제거하거나 `BaseHead` 이전 버전 복원          |
| sitemap URL 급감      | 이전/현재 `<loc>` 목록 비교             | `astro.config.mjs` filter 조건을 이전 정책으로 되돌림              |
| 태그 색인 감소        | Search Console 제외 URL과 글 수 대조    | 임계값 변경 또는 해당 태그에 직접 작성한 description+featured 설정 |
| 광고 loader/slot 오류 | 소스와 Console 확인                     | `PUBLIC_ADSENSE_ENABLED=false` 후 재배포                           |
| View Transitions 충돌 | 경로 전환 후 중복 slot 오류 확인        | ClientRouter 변경 롤백 또는 전환 이벤트 초기화 구현                |
| CLS·빈 공간           | 모바일/데스크톱 실측                    | slot 환경변수를 비우거나 placement 높이 조정                       |
| GA 중복/누락          | Network·DebugView 확인                  | `PUBLIC_ANALYTICS_ENABLED=false`로 긴급 중지 후 loader 수정        |

가장 빠르고 안전한 광고 롤백은 코드를 되돌리는 대신 배포 환경의
`PUBLIC_ADSENSE_ENABLED`를 `false`로 바꾸고 재빌드하는 것이다.

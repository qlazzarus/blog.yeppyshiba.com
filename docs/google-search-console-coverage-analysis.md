# Google Search Console 색인 범위 분석

기준일: 2026-07-28  
대상 속성: `https://blog.yeppyshiba.com/`

이 문서는 Search Console의 색인 범위 내보내기와 현재 정적 빌드 결과를 대조한 기록이다. 새 내보내기를 받거나 콘텐츠·URL을 수정할 때 이 문서를 먼저 갱신한다.

## 1. 결론과 우선순위

| Search Console 사유 | 보고 URL | 판단 | 조치 우선순위 |
| --- | ---: | --- | --- |
| 크롤링됨 - 현재 색인이 생성되지 않음 | 139 | 과거 태그 URL이 대부분이며, 실제 색인 후보인 게시글은 소수 | 게시글 콘텐츠 보강 |
| `NOINDEX` 태그에 의해 제외됨 | 2 | 태그·페이지네이션 등 의도된 제외 | 조치하지 않음 |
| 찾을 수 없음(404) | 59 | 이전 태그 페이지네이션의 외부/과거 크롤링 흔적 | 내부 링크가 없으면 유지 |
| 리디렉션이 포함된 페이지 | 1 | 정상적인 URL 정리 결과 | 최종 URL만 링크·사이트맵에 사용 |

`noindex` URL을 사이트맵에서 제외하고 있으므로, 경고 수를 줄이려고 무차별적으로 `index`로 바꾸지 않는다. 얇은 태그와 목록 페이지를 색인시키면 품질 신호만 약해질 수 있다.

## 2. 크롤링됨 - 현재 색인이 생성되지 않음 (139)

내보내기: `blog.yeppyshiba.com-Coverage-Drilldown-2026-07-28.zip`의 첫 번째 제공본.

### URL 구성

| 유형 | 수 | 현재 처리 |
| --- | ---: | --- |
| 태그 | 106 | 예전 자동 태그·중복 태그가 대부분 |
| 게시글 | 24개 행 / 실제 16개 글 | `index,follow`; 콘텐츠 품질 검토 대상 |
| 홈·소개·카테고리·페이지네이션 | 9 | 핵심 페이지 또는 목록 URL |

현재 빌드(`dist`) 기준 재분류는 다음과 같다.

| 현재 상태 | 수 | 의미 |
| --- | ---: | --- |
| `index,follow` | 39 | 게시글·핵심 허브. 품질을 보강한 뒤 개별 색인 요청 |
| `noindex,follow` | 50 | 의도된 태그/레거시 태그 제외. Google 재크롤링 뒤 사유가 바뀔 수 있음 |
| 현재 빌드에 없음 | 50 | 삭제된 예전 태그. 404로 자연 정리 대상 |

### 실제 색인 후보 게시글

`/article/` URL은 현재 모두 `index,follow`이며 canonical도 자기 자신의 슬래시 포함 URL이다. 슬래시 유무가 둘 다 보고된 행은 같은 글로 묶어 판단한다.

- `game-of-life`
- `php8-attributes`
- `akita-inu`
- `phaser3-with-parallax-scroll`
- `image-drm-implementation`
- `quarter-view`
- `chunk-upload-vue-axios-laravel`
- `what-is-babel`
- `adding-view-count-in-gatsby`
- `github-page-static-deploy`
- `jekyll-with-docker-and-wsl2`
- `what-we-expect-from-software-developers-on-each-level`
- `migration-to-nextjs`
- `svn-to-git`
- `migration-to-gatsby`
- `a-look-back-in-november-2023`

우선 콘텐츠 보강 대상 및 진행 상태:

| 글 | 대략적인 본문 단어 수 | 권장 |
| --- | ---: | --- |
| `migration-to-gatsby` | 12 | 완료 — 이전 기준, URL·이미지 점검, 후속 이전 글 링크 추가 |
| `svn-to-git` | 198 | 완료 — SVN/Git 대응표, 안전한 작업 순서, 충돌 대응 추가 |
| `akita-inu` | 216 | 완료 — 생활 환경·사회화·건강 관리 고려사항과 사진 관찰 추가 |
| `a-look-back-in-november-2023` | 224 | 완료 — 목표를 실행 단위로 나누는 기준과 회고의 맥락 추가 |
| `quarter-view` | 269 | 완료 — 타일 좌표/역변환, depth 정렬, 구현 체크리스트 추가 |

다음 후보는 `chunk-upload-vue-axios-laravel`, `github-page-static-deploy`,
`jekyll-with-docker-and-wsl2`처럼 오래됐지만 현재도 검색 수요가 있을 수 있는 기술 글이다.
코드·명령어의 현재 호환성을 별도로 점검한 뒤 보강한다.

콘텐츠를 보강하고 배포한 뒤에만 각 URL을 Search Console의 **URL 검사 → 색인 생성 요청**으로 제출한다. 보고서 전체에 대한 유효성 검사는 콘텐츠를 수정하지 않은 과거 URL까지 포함하므로 우선순위가 낮다.

## 3. 404 (59)

내보내기: `blog.yeppyshiba.com-Coverage-Drilldown-2026-07-28.zip`의 두 번째 제공본.

| 유형 | 수 | 예시 | 처리 |
| --- | ---: | --- | --- |
| 이전 태그 페이지네이션 | 55 | `/tag/react/1/`, `/tag/gatsby/2/`, `/tag/phaser/0/` | 404 유지 |
| 이전 전체 목록 페이지네이션 | 3 | `/page`, `/page/`, `/page/1/` | 404 유지 |
| 이전 게시글 | 1 | `/article/jeju-tour-review-byeoldobong/` | 현재 별도봉 글로 정적 호환 리디렉션 추가 |

### 확인 결과

- 현재 `src`, `contents`, `public`과 사이트맵 생성 규칙에서 위 59개 URL을 직접 링크하는 참조는 발견되지 않았다.
- 따라서 404 자체는 정상이다. 없는 콘텐츠를 홈페이지로 일괄 리디렉션하지 않는다.
- 외부 링크 가치가 큰 URL에만 가장 가까운 대체 페이지로 301을 추가한다. GitHub Pages는 서버 수준 301을 직접 제공하지 않으므로, 정확한 HTTP 301이 필요하면 Cloudflare Redirect Rules/Worker 같은 프록시 계층이 필요하다.
- 현재 레거시 태그 이동 페이지는 `meta refresh`와 JavaScript 이동을 사용하므로 HTTP 응답은 200이다. 이는 임시 호환에는 유용하지만 Search Console에서는 301과 다르게 처리될 수 있다.

### 처리 완료: 이전 별도봉 글 URL

`/article/jeju-tour-review-byeoldobong/`은 현재 글
`/article/jeju-tour-review-%EB%B3%84%EB%8F%84%EB%B4%89/`의 이전 영문 슬러그임을 확인했다.

- 조회수 집계의 URL 별칭에는 이미 같은 대응 관계가 있었다.
- 정적 호환 리디렉션 페이지를 추가했다. `noindex,follow`, 대상 canonical, 즉시 이동을 함께 제공한다.
- 사이트맵에서도 이전 URL을 제외했다. 사이트맵에는 최종 현재 URL만 남긴다.
- GitHub Pages에서는 HTTP 301을 직접 응답할 수 없으므로, 외부 링크 신호까지 완전하게 이전하려면 추후 Cloudflare Redirect Rules/Worker에서 동일 URL의 301을 설정한다.

## 4. 재검증 체크리스트

1. 콘텐츠 보강 또는 URL 정책 변경 후 `npm run build:site`를 실행한다.
2. 색인 대상 게시글에 `index,follow`과 자기 canonical이 있는지 확인한다.
3. 사이트맵에 `noindex` URL·404 URL이 들어가지 않았는지 확인한다.
4. 배포 후 Search Console URL 검사에서 대표 게시글 5개만 개별 색인 요청한다.
5. 다음 크롤링 주기에 404/레거시 태그 보고서 수가 자연스럽게 감소하는지 관찰한다.

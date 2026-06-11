# 웹게임 서비스 계획

이 문서는 Astro 블로그 안에서 Phaser 기반 웹게임을 여러 개 서비스하기 위한
소스 구조, iframe 제공 방식, CI/CD 방향을 정리한다.

목표는 블로그 글과 실제 게임 런타임을 느슨하게 분리하는 것이다. 글은
`contents/`에서 일반 article로 관리하고, 게임은 정적 앱으로 빌드해서
`/play/<slug>/` 아래에 배포한다. 블로그 화면에서는 `/games/<slug>/` wrapper
페이지나 article 본문 iframe으로 게임을 보여준다.

## 기본 방향

- 게임은 정적 웹앱으로 빌드한다.
- 블로그 글은 구현 배경, 설계 판단, AI 협업 메모를 담는다.
- 실제 게임 실행 페이지는 iframe에 넣기 좋은 독립 HTML로 둔다.
- `/games/`는 게임 목록과 소개를 위한 블로그 내부 메뉴로 사용한다.
- `/play/`는 순수 게임 런타임 산출물만 배치한다.

권장 URL 구조:

```text
/article/isometric-minesweeper/
  구현 글, 설계 기록, 코드 설명

/games/isometric-minesweeper/
  게임 소개 + iframe wrapper

/play/isometric-minesweeper/
  Phaser/Vite로 빌드된 실제 게임
```

## 추천 디렉터리 구조

```text
contents/
  isometric-minesweeper.md

src/pages/games/
  index.astro
  isometric-minesweeper.astro

games/
  isometric-minesweeper/
    package.json
    vite.config.ts
    src/
      main.ts
      scenes/
      ecs/
      components/
      systems/
      world/
    public/
    README.md

  _shared/
    ecs/
    iso/
```

초기에는 공통화를 서두르지 않는다. 첫 게임에서는 게임 내부에 필요한 구조를
두고, 두 번째 게임부터 반복되는 부분만 `games/_shared/`로 이동한다.

공통화 후보:

- 얇은 ECS world/entity/component helper
- isometric 좌표 변환 함수
- 입력 좌표를 tile 좌표로 되돌리는 picking helper
- 공통 debug overlay
- iframe resize/message helper

## iframe 서비스 방식

article 또는 `/games/<slug>/` 페이지에서 게임을 iframe으로 삽입한다.

```html
<iframe
    src="/play/isometric-minesweeper/"
    title="Isometric Minesweeper"
    loading="lazy"
    class="game-frame"
></iframe>
```

권장 wrapper 정책:

- iframe 주변에는 조작법, 새 창 열기, 관련 글 링크만 둔다.
- 게임 자체 UI는 `/play/<slug>/` 내부에서 완결되게 만든다.
- 게임은 부모 페이지 CSS에 의존하지 않는다.
- 게임 canvas 크기는 iframe 내부에서 responsive하게 처리한다.
- localStorage key는 게임 slug prefix를 붙인다.

예:

```text
isometric-minesweeper:settings
isometric-minesweeper:best-time
```

## CI/CD 방향

현재 배포는 GitHub Actions에서 다음 흐름으로 동작한다.

```text
npm ci
↓
npm run ga:fetch
↓
npm run build
↓
dist 업로드
↓
GitHub Pages 배포
```

웹게임은 Astro 빌드 전에 정적 산출물로 준비한다.

추천 흐름:

```text
npm ci
↓
npm run ga:fetch
↓
npm run build:games
↓
npm run build:site
↓
dist 업로드
```

`package.json` 스크립트 예:

```json
{
    "scripts": {
        "build": "npm run build:games && npm run build:site",
        "build:site": "astro build",
        "build:games": "node scripts/build-games.mjs"
    }
}
```

`scripts/build-games.mjs`의 책임:

- `games/*/package.json` 탐색
- 각 게임의 빌드 스크립트 실행
- `games/<slug>/dist`를 `public/play/<slug>/` 또는 빌드용 임시 디렉터리로 복사
- Astro 빌드가 `/play/<slug>/` 산출물을 포함하게 준비

처음에는 복잡한 monorepo tooling 없이 단순 스크립트로 시작한다. 게임 수가 많아져
빌드 시간이 길어지면 변경된 게임만 빌드하는 캐시 전략을 추가한다.

## 배포 산출물 관리

권장안:

- 게임 소스는 `games/<slug>/`에 커밋한다.
- 게임 빌드 결과물은 커밋하지 않는다.
- CI에서 매번 `/play/<slug>/` 산출물을 생성한다.
- local preview가 필요하면 `npm run build:games`를 실행해 확인한다.

주의:

- `public/play/<slug>/`를 실제 커밋 대상으로 쓰면 빌드 산출물이 repo에 쌓일 수
  있다.
- 가능하면 `scripts/build-games.ts`에서 임시 staging 디렉터리를 만들고, Astro
  빌드 전에 필요한 정적 파일만 `public/play/`로 복사한 뒤 clean할 수 있게 한다.
- 단순성을 우선한다면 초기에는 `public/play/`를 `.gitignore`에 추가하고 CI/로컬
  빌드에서 생성하는 방식으로 시작한다.

## 게임별 문서 규칙

각 게임은 `games/<slug>/README.md`를 둔다.

포함할 내용:

- 게임 목표
- 조작법
- 구현 상태
- article URL
- 주요 구조
- 빌드/실행 명령
- AI coding agent에게 맡기기 쉬운 부분과 사람이 판단한 부분

예:

```md
# Isometric Minesweeper

- Article: /article/isometric-minesweeper/
- Play: /play/isometric-minesweeper/
- Wrapper: /games/isometric-minesweeper/

## Focus

- Isometric tile projection
- Mouse picking from screen coordinate to tile coordinate
- Phaser scene adapter + small ECS pattern
```

## 첫 번째 후보: Isometric Minesweeper

기존 isometric 글을 기반으로 지뢰찾기 게임을 만든다.

핵심 구현 포인트:

- grid 좌표를 isometric screen 좌표로 변환
- screen 좌표를 grid 좌표로 역변환
- tile hover/reveal/flag 상태 분리
- mine/revealed/flagged/neighbor count component 구성
- Phaser Scene은 rendering/input adapter 역할만 담당
- game rule과 ECS system은 Phaser 의존도를 낮게 유지

초기 범위:

- 10x10 보드
- 좌클릭 reveal
- 우클릭 flag
- 첫 클릭 안전 처리
- 승패 판정
- restart
- 모바일은 후순위

article에서 다룰 내용:

- isometric 좌표 변환 복습
- picking에서 생기는 오차 처리
- ECS로 나눈 이유
- AI가 잘 생성한 부분과 직접 설계한 경계
- Scene 중심 구현과 ECS 구현의 차이

## 장기 운영 기준

게임이 1~2개일 때:

- same repo 유지
- 단순 `build-games.mjs`
- 공통화 최소화

게임이 3~5개가 되면:

- `/games` 인덱스 정리
- 공통 ECS/iso helper 추출
- iframe wrapper 컴포넌트화
- 게임별 썸네일/메타데이터 manifest 도입

게임이 많아지거나 빌드가 무거워지면:

- workspace 구조 검토
- 변경된 게임만 빌드
- 게임별 독립 preview workflow
- 별도 repo 또는 submodule 검토

## 판단 기준

단순 Phaser 튜토리얼은 AI coding agent 시대에 차별점이 약하다. 대신 이 블로그에서
서비스할 게임은 다음 기준을 만족하는 것이 좋다.

- 직접 플레이 가능한 작은 결과물이 있다.
- 글에서 구조와 설계 판단을 설명할 수 있다.
- AI가 생성한 코드와 사람이 잡은 경계를 비교할 수 있다.
- 기존 블로그 주제와 연결된다.
- 재사용 가능한 작은 패턴이 쌓인다.

따라서 첫 게임은 완성도 높은 대형 게임보다, 작은 규칙과 명확한 구조를 가진
isometric minesweeper가 적합하다.

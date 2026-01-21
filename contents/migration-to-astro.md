---
title: astro + tailwind로 이전 했습니다.
date: 2025-12-31T11:00:00+09:00
summary: Next.js 기반 정적 블로그를 Astro + Tailwind로 이주하면서 얻은 것들(속도, 단순함, 디자인 시스템).
category: coding
image: https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y29mZmVlJTIwbGFwdG9wfGVufDB8fDB8fHww&ixlib=rb-4.1.0&q=60&w=3000
tags:
  - analytics
  - astro
  - coding
  - gatsby
  - git
  - migration
  - nextjs
  - static-site
  - tailwind
  - to
---

## 또 이사냐고요? 네, 또 이사입니다.

블로그는 ‘글을 쓰는 공간’이기도 하지만, 저한텐 동시에 **기술 스택을 가볍게 실험해볼 수 있는 샌드박스**이기도 합니다.  
예전에 Gatsby로 한번 옮겼고, 그 다음엔 Next.js로 옮겼습니다. (그때도 “다시 블로그를 시작해봅니다”라고 썼네요.)  

이번엔 **Astro + Tailwind**로 정착(?)을 시도했습니다.

---

## 왜 Next.js에서 Astro로?

Next.js는 좋은 프레임워크입니다. 다만 “정적 블로그”라는 목적에 한정하면, 시간이 지날수록 이런 생각이 들었습니다.

- **내가 필요한 건 SSR/ISR이 아니라, 결국 정적 페이지**  
- 빌드 파이프라인/의존성/렌더링 계층이 커질수록 “블로그 유지보수”가 프로젝트처럼 변함
- 마크다운 기반 콘텐츠가 많아질수록, React 레이어가 오히려 부담

Astro는 이 지점에서 매력적이었습니다.

- 기본 철학이 **Content-first / SSG 친화적**
- React를 “필요한 컴포넌트만” 섞어 쓸 수 있음(아일랜드)
- 결과물이 단순하게 떨어져서 GitHub Pages 같은 정적 호스팅에 잘 맞음

---

![cafe desk](https://images.unsplash.com/photo-1532584615605-f4525a324e41?fm=jpg&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29mZmVlJTIwbGFwdG9wfGVufDB8fDB8fHww&ixlib=rb-4.1.0&q=60&w=3000)

## 이번 마이그레이션 목표

이번 이주에서 목표는 딱 4가지였습니다.

1. **빌드/배포 단순화** (정적 생성 + GitHub Pages 유지)
2. **마크다운 작성 경험 개선** (TOC, 코드 블럭, typography)
3. **디자인 시스템 정리** (light/dark + 토큰화된 컬러)
4. “나중에 내가 봐도” 유지보수하기 쉬운 구조로 정리

---

## 핵심 구조: Layout + Content Slot + Typography

Astro의 글 페이지는 결국 이렇게 정리됐습니다.

- 글 메타(title/date/tags/image)는 frontmatter 기반
- 상단 헤더(제목/날짜/태그/커버)는 컴포넌트로 고정
- 본문은 `<slot />`로 넣고, 그 영역에 `prose`를 적용

예시(개념):

```astro
<BaseLayout title={title} description={summary}>
  <header>
    <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
    <div class="text-muted text-sm">
      <FormattedDate date={date} />
    </div>
  </header>

  <div class="prose lg:prose-xl dark:prose-invert mx-auto">
    <slot />
  </div>
</BaseLayout>
```

## Tailwind 4.x에서 “h1이 안 먹히는” 이유와 해결

이주하면서 가장 당황했던 포인트 중 하나가 이거였습니다.

> “마크다운 본문(slot) 안의 h1/h2가 다 기본값처럼 보이는데?”

Tailwind v4는 기본적으로 **의미(semantic)는 남기되, 태그 스타일은 강하게 주지 않는 방향**으로 바뀌었습니다.
그래서 “태그 자체(h1/h2/p)”에 기대면 안 되고, 콘텐츠 영역에는 **Typography 플러그인**을 쓰는 쪽이 정석입니다.

### 1) typography 플러그인 활성화

`global.css` 상단에:

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
```

### 2) 본문 영역에 prose 적용

```html
<div class="prose dark:prose-invert">
  <!-- markdown content -->
</div>
```

이렇게 하면 **마크다운의 h1/h2/ul/blockquote/code**가 전부 자연스럽게 스타일을 갖게 됩니다.

---

![latte + laptop](https://images.unsplash.com/photo-1444418776041-9c7e33cc5a9c?fm=jpg\&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Y29mZmVlJTIwbGFwdG9wfGVufDB8fDB8fHww\&ixlib=rb-4.1.0\&q=60\&w=3000)

## 디자인 시스템: “클래스”보다 “토큰”을 먼저

이번엔 컬러를 “대충 bg-gray-100 / dark:bg-gray-800”로 밀어붙이면,
나중에 테마를 바꾸려 할 때 HTML을 다시 갈아엎어야 한다는 걸 절감했습니다.

그래서 Tailwind v4의 CSS-first 방식에 맞춰:

* `:root / .dark`에 OKLCH 컬러 토큰 선언
* `@theme inline`에서 Tailwind 토큰으로 매핑
* 컴포넌트는 최대한 `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground` 같은 **의미 기반 클래스**로 통일

이 방식의 장점은 분명합니다.

* 테마를 바꿀 때 **CSS 변수만 교체하면 전체 UI가 바뀜**
* light/dark 대비를 유지하기 쉬움
* prose(typography)까지 포함해서 톤을 한 번에 맞추기 쉬움

---

## 이주하면서 느낀 점

* **“블로그는 블로그답게”**: Astro는 글을 위한 프레임워크라는 느낌이 강했습니다.
* **속도가 빠르다**: 빌드/번들/로컬 개발이 가볍습니다.
* Tailwind는 결국 **디자인 시스템의 언어**: class 남발보다 토큰화가 훨씬 오래 갑니다.

---

## 다음 할 일

당장은 “글을 더 자주 쓰는 것”이 제일 중요하니, 기술 욕심은 잠깐 접어두고…

* TOC 자동 생성 개선
* 조회수/통계(Analytics)는 다음번에 😅

---

### 마무리

Gatsby → Next.js → Astro까지 오면서 느끼는 건 결국 하나입니다.

> **내가 글을 쓰는 속도를 방해하지 않는 도구**가 제일 좋은 도구다.

이번엔 Astro + Tailwind 조합이 꽤 오래 갈 것 같습니다.
---
title: nextjs로 이전 했습니다.
date: 2025-01-22T09:35:21.959Z
summary: 다시 또한번 블로그를 시작해봅니다.
category: coding
image: https://images.pexels.com/photos/4240511/pexels-photo-4240511.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1
tags:
  - analytics
  - chakra-ui
  - coding
  - gatsby
  - git
  - material-ui
  - migration
  - nextjs
  - react
  - to
---

## 1. 왜 Gatsby에서 Next.js로 옮겼을까?

### 1) Gatsby의 장점과 한계

- **장점**: 정적 사이트 생성(SSG)에 최적화된 방식, 풍부한 플러그인 생태계, GraphQL을 통한 데이터 수집 관리.
- **한계**: 빌드 시간이 길어질 수 있음, 필요 이상의 의존성이 생길 수도 있음, SSR(서버 사이드 렌더링) 기능이 제한적.

### 2) Next.js의 주요 장점

- **서버 사이드 렌더링(SSR)** 및 **정적 페이지 생성(SSG)** 를 모두 지원해 유연한 아키텍처 구축 가능.
- 페이지 단위의 라우팅이 간단하며, 파일 기반 라우팅('app' 폴더)으로 개발 생산성이 높음.
- ISR(Incremental Static Regeneration)을 통해 부분적인 정적 페이지 리빌드가 가능해 확장성, 성능에서 강점.
- React 18 이후 지원되는 기능들과의 호환성 우수, 빠른 업데이트.

따라서 **다양한 렌더링 옵션**을 활용해 유연하고 효율적인 블로그를 만들어보고자 Next.js를 선택했습니다.

---

## 2. next-mdx-remote vs MDX 플러그인

### 1) MDX란?

MDX는 **Markdown** 문법에 **React 컴포넌트**를 섞어 쓸 수 있게 해주는 포맷입니다. 기존에도 Gatsby MDX 플러그인을 활용하여 블로그 포스트를 작성할 수 있었지만, Next.js에서 MDX를 사용하기 위해선 'next-mdx-remote'나 '@next/mdx' 같은 패키지를 도입하게 됩니다.

### 2) next-mdx-remote의 특징

- **파일 시스템 기반**으로 MDX를 불러오지 않고, 콘텐츠 문자열을 받아서 SSR 시점에 파싱해주기 때문에 더욱 유연하게 MDX를 처리할 수 있음.
- 서버에서 텍스트를 받아 파싱하고, 클라이언트에선 React 컴포넌트로 렌더링하기 때문에 더 세밀한 컨트롤 가능.
- 코드 스플리팅, 동적 import 등 Next.js 기능과도 궁합이 잘 맞음.

저는 블로그 포스트를 각 마크다운(MDX) 파일로 관리하고, 빌드 시점(혹은 ISR) 또는 요청 시점(SSR)에 해당 MDX 파일을 파싱해주도록 설정했습니다. 이를 통해 새로운 글을 작성하거나 수정할 때의 프로세스를 간소화할 수 있었습니다.

---

## 3. UI 라이브러리: Chakra UI에서 MUI로 옮긴 이유

### 1) Chakra UI의 장점과 MUI 선택 배경

- **Chakra UI** 는 간단하고 직관적인 컴포넌트 스타일링을 제공해서 학습 비용이 낮고, 유연하게 테마 커스터마이징이 가능하다는 장점이 있습니다.
- **MUI(Material UI)** 는 구글의 Material Design을 기반으로, 다양한 컴포넌트를 제공하고, 커뮤니티와 생태계가 매우 활발합니다.
    - MUI v5 이후 스타일링 방식도 유연하게 바뀌어 **Emotion** 또는 **styled-components** 등 원하는 CSS-in-JS 솔루션을 선택해 사용할 수 있음.
    - 이미 디자인적으로 구축된 컴포넌트가 풍부하여 빠른 프로토타이핑, 유지보수에 유리함.

### 2) MUI를 적용하며 느낀 차이점

- **테마 설정**: Chakra UI에서 theme 객체를 활용하던 방식을, MUI의 'createTheme' + 'ThemeProvider'로 변경했습니다. 구조는 유사하지만, MUI는 Material Design 원칙에 맞춘 **default theme**가 풍부해, 좀 더 세부적으로 커스터마이징할 수 있었습니다.
- **컴포넌트 사용성**: 이미 Material 디자인에 맞춰 구성된 컴포넌트(버튼, 카드, Modal, 메뉴 등)가 많아 빠른 개발이 가능했습니다.
- **스타일 커스텀**: Chakra UI처럼 'sx' prop이나 styled API를 사용해 컴포넌트 별로 커스텀할 수 있어, 적응하는 데 큰 어려움은 없었습니다.

결국, **다양한 컴포넌트, 풍부한 Material 생태계, 그리고 디자인 표준성** 때문에 MUI를 선택했습니다.

---

## 4. 마이그레이션 주요 단계

### 1) Next.js 프로젝트 초기 설정

1. **Next.js 설치**
    ```bash
    npx create-next-app my-blog
    ```
2. **타입스크립트 설정(선택사항)**
    ```bash
    touch tsconfig.json
    npm install --save-dev typescript @types/react @types/node
    ```
3. **폴더 구조 설계**
    - 'app' 폴더: 메인 페이지, 블로그 리스트, 각종 라우트 관리.
    - 'components' 폴더: 재사용 가능한 컴포넌트 보관.
    - 'libraries' 폴더: MDX 파싱, 데이터 처리 로직 분리.
    - 'public' 폴더: 이미지, 정적 리소스.

### 2) next-mdx-remote 설치 및 설정

1. **의존성 설치**
    ```bash
    npm install next-mdx-remote gray-matter remark remark-html
    ```
2. **MDX 파일 로딩 로직 구현**

    - 'libraries/PostManager.ts' 같은 곳에, 아래와 같은 함수를 만들어서 마크다운을 파싱합니다.

        ```tsx
        import matter from 'gray-matter';
        import { serialize } from 'next-mdx-remote/serialize';

        export async function getPostBySlug(slug: string): Promise<PostData | null> {
            ...
            // 3) MDX 변환
            const source = await serialize(content, {
                mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [],
                    format: 'mdx',
                },
            });
            ...
        }
        ```

3. **페이지에서 MDX 렌더링**

    ```tsx
    import components from '@/components';
    import { Box, Container } from '@mui/material';
    import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
    import React from 'react';

    import { PostData } from '@/libraries/PostManager';

    const ArticleContainer = ({ post }: { post: PostData }) => {
        const source = post.source as MDXRemoteSerializeResult;
        return (
            <Container maxWidth='xl'>
                <Box py={4}>
                    <MDXRemote {...source} components={components} />
                </Box>
            </Container>
        );
    };

    export default ArticleContainer;
    ```

### 3) MUI 설치 및 테마 설정

1. **의존성 설치**
    ```bash
    npm install @mui/material @emotion/react @emotion/styled
    ```
2. **테마 생성 및 적용**

    ```tsx
    // theme.ts
    export default responsiveFontSizes(
        createTheme({
            palette: {
                primary: {
                    light: brand[200],
                    main: brand[400],
                    dark: brand[700],
                    contrastText: brand[50],
                },
            },
            typography: {
                fontFamily: robotoFont.style.fontFamily,
            },
            shadows: customShadows,
            components: {
                MuiLink: {
                    styleOverrides: {
                        root: {
                            textDecoration: 'none', // 기본적으로 밑줄 제거
                            color: 'palette.link.main', // 테마 링크 색상 적용
                            '&:hover': {
                                color: 'palette.link.hover', // 호버 시 색상 변경
                                textDecoration: 'underline', // 호버 시 밑줄 추가
                            },
                            '&:visited': {
                                color: 'palette.link.visited', // 방문한 링크 색상
                            },
                        },
                    },
                },
            },
            colorSchemes: {
                light: true,
                dark: true,
            },
            cssVariables: {
                colorSchemeSelector: 'class',
            },
        }),
    );
    ```

3. **layout.tsx에서 ThemeProvider 적용**

    ```tsx
    const RootLayout = async ({
        children,
    }: Readonly<{
        children: React.ReactNode;
    }>) => {
        const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string;

        return (
            <html lang='en' suppressHydrationWarning>
                <body>
                    <InitColorSchemeScript attribute='class' />
                    <AppRouterCacheProvider>
                        <ThemeProvider theme={theme} defaultMode={'system'}>
                            <CssBaseline enableColorScheme />
                            {children}
                        </ThemeProvider>
                    </AppRouterCacheProvider>
                </body>
                <GoogleAnalytics gaId={gaId} />
            </html>
        );
    };
    ```

---

## 5. 마이그레이션 후 느낀 점

1. **빌드 시간**:

    - Gatsby는 모든 페이지를 빌드 시에 정적으로 생성하기 때문에, 포스트가 많아질수록 빌드 시간이 길어질 수 있었습니다.
    - Next.js는 ISR이나 SSR을 통해 필요한 시점에 생성하거나 갱신할 수 있기 때문에, 상대적으로 빌드 부담이 줄고 배포가 유연해졌습니다.

2. **유연한 라우팅**:

    - Gatsby도 라우팅이 자동화되어 있지만, Next.js의 파일 기반 라우팅은 구조를 직관적으로 파악하기 쉬웠습니다.
    - 동적 라우팅(예: '/post/[slug].tsx')도 쉽게 적용할 수 있어, 블로그 포스트 페이지에 딱 맞았습니다.

3. **MDX 관리**:

    - Gatsby에서 플러그인으로 MDX를 사용했을 때는 어느 정도 추상화된 방식으로 동작했지만, Next.js에서는 'next-mdx-remote'를 통해 **직접 MDX를 파싱하고** 컴포넌트를 주입하는 형태라 세밀한 제어가 가능했습니다.
    - Markdown/MDX 문서를 받아와 렌더링하기가 훨씬 유연해졌고, **API 연동, 파일 시스템 연동, CMS 연동** 모두 자유도 높아졌습니다.

4. **스타일링, 디자인**:

    - Chakra UI도 훌륭했지만, MUI는 **Material Design** 기반이라 컴포넌트 종류가 더 방대하고, UI 디자인의 일관성이 유지됩니다.
    - 마이그레이션 시 "디자인 언어" 자체가 달라진다는 점을 감안해 레이아웃, 컬러 시스템 등을 재정의해야 했으나, 그 덕분에 결과물의 완성도와 확장성은 크게 상승했습니다.

5. **생태계, 커뮤니티**:
    - Next.js와 MUI 모두 널리 쓰이는 라이브러리이기 때문에, **문서나 예제, 문제가 발생했을 때 찾을 수 있는 자료**가 풍부합니다.
    - 블로그를 넘어 다른 프로젝트와의 호환성을 고려할 때도 MUI와 Next.js 조합은 학습 투자 대비 가치가 높았습니다.

---

## 6. 결론 및 향후 계획

- **Next.js + next-mdx-remote + MUI** 조합을 사용하면서 **SSR/SSG/ISR**의 유연한 제공, **MDX**의 높은 확장성, 그리고 **Material UI**의 방대한 컴포넌트 라이브러리에 힘입어 블로그 구조를 보다 단단하게 만들 수 있었습니다.
- 추후 계획으로는, MDX에 **머리말/각주/TOC** 추가, **이미지 최적화**(Next.js의 'next/image' 사용) 등을 더 섬세하게 적용할 예정입니다.
- 또한 CMS 연동(예: Headless CMS)이나 GitHub Actions를 통한 자동 빌드&배포 파이프라인을 구축해, 작성/수정/배포를 더욱 간편하게 만들 생각입니다.

---

### 마무리하며

이번 마이그레이션 과정은, **기존에 안정적으로 사용하던 Gatsby 블로그**에서 **Next.js로의 전환**이 과연 큰 이점을 줄 수 있을지 의구심을 갖고 시작했지만, 결과적으로 **SSR/ISR, MDX 확장성, MUI 생태계**라는 세 마리 토끼를 모두 잡는 성공적인 선택이 되었습니다.

앞으로도 프로젝트 환경과 요구사항에 맞춰 **최적의 스택**을 탐색하고 적용해보는 과정을 즐겨보시길 바랍니다. 혹시 마이그레이션 과정에 궁금한 점이나 피드백이 있다면 언제든지 이슈로 남겨주세요!

감사합니다.

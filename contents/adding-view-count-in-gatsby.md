---
title: gatsby 블로그에 조회수 추가하기
date: 2022-06-06T05:13:01.903Z
summary: gatsby 는 정적 사이트 생성기로써, 훌륭한 블로그 툴입니다. 다만 조회수등 여러가지 다이나믹한 기능들은 (바로) 지원하지 않는데요...
category: coding
image: /images/posts/202206/justin-morgan-_Lnid7JAWFQ-unsplash.jpg
embeddedImagesLocal: /images/posts/202206/justin-morgan-_Lnid7JAWFQ-unsplash.jpg
tags:
    - dev
    - coding
    - google analytics
    - gatsby
---

## 서론

gatsby 는 정적 사이트 생성기로, 훌륭한 블로그 툴입니다. 😍😍

![Official Gatsbyjs logo](https://www.gatsbyjs.com/Gatsby-Logo.svg)

다만 조회수등 여러가지 다이나믹한 기능들은 당연히 되지 않는데요. 물론 언제나 그렇듯 답은 있습니다.

![우리는 답을 찾을 것이다. 늘 그랬듯이](/images/posts/202206/kyle-johnson-CT8NvobyYuk-unsplash.jpg)

예전 웹 초창기때는 여러 카운터 서비스가 있었을듯, 요즘에는 방문자 분석을 위해서 [구글 애널리틱스](https://analytics.google.com/analytics/web/)를 많이 활용하고 있는데요.

저희는 ✨ _구글 애널리틱스_ ✨ 를 활용하여, 게시글의 조회수를 조회해보도록 하겠습니다.

## API 를 활성하여 보자

https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries

먼저 저 API 문서를 통해서 확인했었는데요. API 부터 활성화 시켜봅시다.

![Enable the Google Analytics Data API v1](/images/posts/202206/google-analytics-data-enable-api.png)

이후에 ✨ **DOWNLOAD CLIENT CONFIGURATION** ✨ 를 눌러서 credentials.json 파일을 꼭 놓치지 말아주세요.

## 구글 애널리틱스에 접근 권한을 추가하기

아까 다운 받았던 credentials.json 파일을 여시면, servcie account email 항목이 있는데요. 이 부분을 복사하여야 합니다.
대충 이렇게 생겼어요!

> quickstart@PROJECT-ID.iam.gserviceaccount.com

이런 이메일을 접근 권한에 추가하여야 합니다! 구글 애널리틱스 설정 화면에 들어가봅시다.

> 관리 > 속성 > 속성 액세스 관리

여기에서 추가 버튼으로, 아까 복사한 이메일을 붙여넣기 합니다. 권한은 뷰어로만 주시면 됩니다.

![Google Analytics Access](/images/posts/202206/google-analytics-access.png)

## 권한 설정은 아직 끝난게 아닙니다...

저희 블로그는 github action 을 통해서 빌드 배포가 진행되고 있는데요. 민감한 키들을 코드에 남기는건 보안상에 아주 좋지 않습니다.
실제로 github 검색을 통해서 키가 유출되는 일이 많은 정도이니까요.

그래서 저희는 .env 파일을 통해서 별도로 민감한 키를 관리하고자 합니다. 또한 github environemnt 기능을 통해서 코드에서 분리하기도 하고요.
(추가로 .gitignore 에 빼두셔야 합니다.)

아까 다운받은 json 파일을 jq 명령어를 이용해서 한줄 스트링으로 바꾸고 이걸 .env 파일로 세팅했습니다.

```bash
jq -c . < ./credentials.json
```

이걸 ANALYTICS_CREDENTIALS 항목으로 저장하고, Single Quote 로 묶어줬습니다.
또한 조회할 사이트의 속성 ID 들도 ANALYTICS_PROPERTY_ID 항목으로 저장했습니다.

```
ANALYTICS_CREDENTIALS='{"type":"service_account","project_id":"foobar-project-9999999999999","private_key_id":"..."}'
ANALYTICS_PROPERTY_ID='999999999'
```

https://ji5485.github.io/post/2021-06-26/create-env-with-github-actions-secrets/

위 문서를 참조하시어, github 에서도 동일하게 추가 합니다.

## 먼저 조회할 API 에 대해 전문을 만들어 봅시다.

저는 볼르그에 게시글만 조회할 예정이며, 게시물들은 /articles 라는 디렉토리부터 시작되게끔 URL 을 설정 했습니다.
해당 조건들로 검색하기 위해서 아래 요청 parameter 들을 작성해봤습니다.

Google은 Analytics Reporting v4 API를 사용하여 데이터를 쿼리하는 방법을 보여주는 간단한 양식인 를인 [Request Composer](https://ga-dev-tools.web.app/ga4/query-explorer/)
제공합니다. 여기에서 생성한 JSON 을 저장해둡시다.

![Google Analytics Reporting V4 API Query](/images/posts/202206/google-analytics-query.png)

아래는 해당 JSON 전문입니다.

```json
{
    "dimensions": [{ "name": "pagePath" }],
    "metrics": [{ "name": "screenPageViews" }],
    "dateRanges": [{ "startDate": "2022-05-30", "endDate": "yesterday" }],
    "dimensionFilter": {
        "filter": { "fieldName": "pagePath", "stringFilter": { "matchType": "BEGINS_WITH", "value": "/article/" } }
    }
}
```

## 조회하는 코드를 작성해보자!

먼저 저는 gatby-node 파일을 통해서 빌드시에 조회수를 조회하고, 게시물 node 생성시에 field 를 추가하는 형식으로 조회수 항목을 추가하고자 했습니다.

그러기 위해서 다음과 같은 프로세스를 진행할 예정입니다.

1. onPluginInit 시점시, 조회수를 조회한다.
2. 이후 onCreateNode 시점에서 게시물일 경우, 조회수를 가져와서 연결한다.

![말은 참 쉬운데요....](/images/posts/202206/ignacio-amenabar-2dkgXTfPfTg-unsplash.jpg)

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import 'dotenv/config';

const articlePrefix = '/article';

const getViewCount = async () => {
    let analyticsResult = [];
    try {
        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: JSON.parse(process.env.ANALYTICS_CREDENTIALS || '{}'),
        });

        analyticsResult = await analyticsDataClient.runReport({
            property: `properties/${process.env.ANALYTICS_PROPERTY_ID || ''}`,
            dateRanges: [{ startDate: '2022-05-30', endDate: 'today' }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }],
            dimensionFilter: {
                filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                        matchType: 'BEGINS_WITH',
                        value: `${articlePrefix}/`,
                    },
                },
            },
        });
    } catch (error) {
        console.error(error);
    }

    // analytics data arrange
    return (
        analyticsResult
            .filter((item: any) => item !== null && item.rows)
            .map((item: any) => {
                return item.rows.map((row: any) => {
                    return {
                        path: row.dimensionValues[0].value,
                        totalCount: row.metricValues[0].value,
                    };
                });
            })[0] || []
    );
};
```

![tired...](/images/posts/202206/luis-villasmil-mlVbMbxfWI4-unsplash.jpg)

코드를 길게 설명하지는 않겠습니다. 주요 보여야 하는 포인트는 다음과 같습니다.

- credentials 항목을 process.env.ANALYTICS_CREDENTIALS 으로 넘김
- 아까 [Request Composer](https://ga-dev-tools.web.app/ga4/query-explorer/) 에서 생성한 쿼리에서 property 항목을 추가
- 조회한 결과를 { path: string, totalCount: string } 항목으로 리턴함

이 함수를 아까 이야기했던 onPluginInit 에서 호출하도록 합니다. 이후 cache 로 적재 했는데요. 자세한 내용은 [Gatsby Node API Helpers](https://www.gatsbyjs.com/docs/reference/config-files/node-api-helpers/) 문서를 참조 하세요!

```typescript
export const onPluginInit = async ({ cache }) => {
    await cache.set('viewCount', await getViewCount());
};
```

이후 onCreateNode 에서 slug를 비교하고 조회수 필드를 추가하는 로직을 구현 했습니다.

```typescript
export const onCreateNode = async ({ node, getNode, actions, cache }) => {
    const viewCount = await cache.get('viewCount');

    // total count
    const slug = `${articlePrefix}${createFilePath({ node, getNode, basePath: `./contents` })}`;
    const totalCount = (viewCount.filter((item: any) => item.path === slug)[0] || { totalCount: 0 }).totalCount;
    createNodeField({ node, name: 'totalCount', value: parseInt(totalCount) });
};
```

이렇게 조회수 항목을 추가하는 코드는 끝났습니다.

다음으로 graphql 에서 정상적으로 출력하는 것을 확인해보겠습니다.

## 끝

![Gatsby Graphql Result](/images/posts/202206/gatsby-graphql-result.png)

보시면 정상적으로 조회수가 추가된 것을 확인할 수 있습니다. 이제 UI 단에서 추가만 하면 끝!

![드디어 끝났네요... 고생하셨습니다!](/images/posts/202206/eden-constantino-32aK4c8Iekc-unsplash.jpg)

## 출처 및 참고

- https://decodenatura.com/how-to-add-a-trending-section-to-gatsby-blog/
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries
- https://googleapis.dev/nodejs/analytics-data/latest/index.html
- https://www.npmjs.com/package/google-auth-library
- https://ji5485.github.io/post/2021-06-26/create-env-with-github-actions-secrets/

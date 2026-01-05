// 간단화한 예시 (사용하던 코드 기반)
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';

export interface GAViewResult {
    path: string;
    totalCount: string;
}

async function readLocalMock() {
    try {
        const p = path.resolve('./src/data/ga-views.json');
        if (fs.existsSync(p)) {
            const raw = await fs.promises.readFile(p, 'utf-8');
            return JSON.parse(raw) as GAViewResult[];
        }
    } catch {}
    return [];
}

export const getViewCount = async (articlePrefix: string): Promise<GAViewResult[]> => {
    // 로컬에서 credentials 없으면 mock 읽기
    if (
        !process.env.ANALYTICS_CREDENTIALS &&
        !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
        return readLocalMock();
    }

    // credentials가 base64로 들어왔을 경우 처리 (선택)
    const credentialsEnv = process.env.ANALYTICS_CREDENTIALS_B64
        ? JSON.parse(
              Buffer.from(process.env.ANALYTICS_CREDENTIALS_B64, 'base64').toString(),
          )
        : process.env.ANALYTICS_CREDENTIALS
          ? JSON.parse(process.env.ANALYTICS_CREDENTIALS)
          : undefined;

    const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: credentialsEnv,
    });

    const [response] = await analyticsDataClient.runReport({
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

    try {
        if (response && response.rows) {
            // 1) GA가 내려준 각 row에서, pagePath의 트레일링 슬래시 제거
            // 2) 같은 cleanPath 라면 숫자 합산
            const aggregated: Record<string, number> = {};

            response.rows.forEach((row: any) => {
                const rawPath = row.dimensionValues[0].value;
                const cleanPath = rawPath.replace(/\/+$/, ''); // 맨 뒤 슬래시 제거
                const count = parseInt(row.metricValues[0].value, 10) || 0;

                if (!aggregated[cleanPath]) {
                    aggregated[cleanPath] = 0;
                }
                aggregated[cleanPath] += count;
            });

            // 이제 aggregated에 합산된 값들이 들어있음
            // { '/article/foo-bar': 10, '/article/hello-world': 5, ... } 형태

            // 3) 우리가 원하는 GAViewResult[] 형태로 변환해서 반환
            return Object.entries(aggregated).map(([path, totalCount]) => ({
                path,
                totalCount: String(totalCount),
            }));
        }
    } catch (error) {
        console.error('Google Analytics API call failed:', error);
    }

    // 실패 시 빈 배열 반환
    return [];
};

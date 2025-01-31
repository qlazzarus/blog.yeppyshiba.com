import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GAViewResult {
    path: string;
    totalCount: string;
}

export const getViewCount = async (articlePrefix: string): Promise<GAViewResult[]> => {
    try {
        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: JSON.parse(process.env.ANALYTICS_CREDENTIALS || '{}'),
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

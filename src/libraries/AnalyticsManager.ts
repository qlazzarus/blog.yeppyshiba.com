import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GAViewResult {
    path: string;
    totalCount: string;
}

export const getViewCount = async (articlePrefix: string): Promise<GAViewResult[]> => {
    let analyticsResult: any[] = [];
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
            return response.rows.map((row: any) => ({
                path: row.dimensionValues[0].value,
                totalCount: row.metricValues[0].value,
            }));
        }
    } catch (error) {
        console.error('Google Analytics API call failed:', error);
    }

    return [];
};

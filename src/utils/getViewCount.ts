import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';

export interface GAViewResult {
    path: string;
    totalCount: string;
}

const DEFAULT_PATH_ALIASES: Record<string, string> = {
    '/article/jeju-tour-review-byeoldobong': '/article/jeju-tour-review-별도봉',
    '/article/review-2023-november': '/article/a-look-back-in-november-2023',
};

const normalizePagePath = (rawPath = '') => {
    const pathWithoutQuery = rawPath.split('?')[0].split('#')[0];
    const withLeadingSlash = pathWithoutQuery.startsWith('/')
        ? pathWithoutQuery
        : `/${pathWithoutQuery}`;
    const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');

    return withoutTrailingSlash || '/';
};

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

export const getViewCount = async (
    articlePrefix: string,
    pathAliases: Record<string, string> = DEFAULT_PATH_ALIASES,
): Promise<GAViewResult[]> => {
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
        dimensions: [{ name: 'pagePathPlusQueryString' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
            filter: {
                fieldName: 'pagePathPlusQueryString',
                stringFilter: {
                    matchType: 'BEGINS_WITH',
                    value: `${articlePrefix}/`,
                },
            },
        },
        limit: 100000,
        orderBys: [
            {
                desc: true,
                metric: {
                    metricName: 'screenPageViews',
                },
            },
        ],
    });

    try {
        if (response && response.rows) {
            const aggregated: Record<string, number> = {};

            response.rows.forEach((row: any) => {
                const rawPath = row.dimensionValues[0].value;
                const normalizedPath = normalizePagePath(rawPath);
                const canonicalPath = pathAliases[normalizedPath] ?? normalizedPath;
                const count = parseInt(row.metricValues[0].value, 10) || 0;

                if (!canonicalPath.startsWith(`${articlePrefix}/`)) {
                    return;
                }

                aggregated[canonicalPath] = (aggregated[canonicalPath] ?? 0) + count;
            });

            return Object.entries(aggregated)
                .sort(([, a], [, b]) => b - a)
                .map(([path, totalCount]) => ({
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

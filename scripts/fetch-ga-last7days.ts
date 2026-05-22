import { BetaAnalyticsDataClient } from '@google-analytics/data';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('./src/data/ga-last7days.csv');

function csvEscape(value: string | number) {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

async function main() {
    const credentialsEnv = process.env.ANALYTICS_CREDENTIALS_B64
        ? JSON.parse(
              Buffer.from(process.env.ANALYTICS_CREDENTIALS_B64, 'base64').toString(),
          )
        : process.env.ANALYTICS_CREDENTIALS
          ? JSON.parse(process.env.ANALYTICS_CREDENTIALS)
          : undefined;

    if (!credentialsEnv) {
        throw new Error(
            'ANALYTICS_CREDENTIALS or ANALYTICS_CREDENTIALS_B64 is required',
        );
    }

    if (!process.env.ANALYTICS_PROPERTY_ID) {
        throw new Error('ANALYTICS_PROPERTY_ID is required');
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: credentialsEnv,
    });

    const [response] = await analyticsDataClient.runReport({
        property: `properties/${process.env.ANALYTICS_PROPERTY_ID}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePathPlusQueryString' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
        dimensionFilter: {
            filter: {
                fieldName: 'pagePathPlusQueryString',
                stringFilter: {
                    matchType: 'BEGINS_WITH',
                    value: '/article/',
                },
            },
        },
        limit: 10000,
        orderBys: [
            {
                desc: true,
                metric: {
                    metricName: 'screenPageViews',
                },
            },
        ],
    });

    const lines = [
        'pagePathPlusQueryString,screenPageViews,averageSessionDuration_seconds',
    ];

    for (const row of response.rows ?? []) {
        const pagePath = row.dimensionValues?.[0]?.value ?? '';
        const views = row.metricValues?.[0]?.value ?? '0';
        const avgSec = row.metricValues?.[1]?.value ?? '0';

        lines.push(
            [
                csvEscape(pagePath),
                csvEscape(views),
                csvEscape(Number(avgSec).toFixed(2)),
            ].join(','),
        );
    }

    await fs.promises.mkdir(path.dirname(OUT), { recursive: true });
    await fs.promises.writeFile(OUT, lines.join('\n'), 'utf8');

    console.log('Wrote', OUT);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

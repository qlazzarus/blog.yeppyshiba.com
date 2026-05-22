const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../src/data/ga-last7days.csv');
const CONTENTS_DIR = path.resolve(__dirname, '../contents');
const OUT_PROMOTION_CSV = path.resolve(__dirname, '../src/data/ga-promotion.csv');
const OUT_LINK_SUGGESTIONS = path.resolve(
    __dirname,
    '../src/data/internal-links-suggestions.json',
);

function parseCsv(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const headers = lines
        .shift()
        .split(',')
        .map((h) => h.trim());
    return lines.map((line) => {
        const parts =
            line
                .match(/(?:\"([^\"]*)\"|([^,]+))(?:,|$)/g)
                ?.map((s) => s.replace(/(^,|,$)/g, '')) || [];
        const raw = parts.map((p) => p.replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => (obj[h] = raw[i]));
        return obj;
    });
}

function normalizePath(p) {
    return p.split('?')[0].replace(/\/+$/, '') || '/';
}

function slugTokensFromPath(p) {
    const slug = normalizePath(p).replace(/^\//, '').replace(/\/$/, '');
    return slug
        .split(/[^\p{L}0-9]+/u)
        .filter(Boolean)
        .map((s) => s.toLowerCase());
}

function findRelatedContents(targetPath) {
    const files = fs.readdirSync(CONTENTS_DIR).filter((f) => f.endsWith('.md'));
    const targetTokens = new Set(slugTokensFromPath(targetPath));
    const scored = files
        .map((f) => {
            const slug = f.replace(/\.md$/, '');
            const tokens = slug
                .split(/[^\p{L}0-9]+/u)
                .filter(Boolean)
                .map((s) => s.toLowerCase());
            const common = tokens.filter((t) => targetTokens.has(t)).length;
            return { file: slug, tokens, common };
        })
        .filter((x) => x.common > 0);
    scored.sort((a, b) => b.common - a.common);
    return scored.slice(0, 8).map((s) => `/${s.file}/`);
}

function main() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error('CSV not found:', CSV_PATH);
        process.exit(1);
    }

    const csv = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseCsv(csv).map((r) => ({
        path: (r.pagePathPlusQueryString || '').replace(/^"|"$/g, ''),
        views: Number(r.screenPageViews || 0),
        avgSec: Number(r.averageSessionDuration_seconds || 0),
    }));

    if (!rows.length) {
        console.error('No rows parsed');
        process.exit(1);
    }

    const topPost = rows.reduce(
        (prev, cur) => (cur.views > prev.views ? cur : prev),
        rows[0],
    );

    const highEngagementLowViews = rows.filter(
        (r) =>
            r.avgSec >= 60 &&
            r.views <= 5 &&
            normalizePath(r.path) !== normalizePath(topPost.path),
    );

    const lowEngagement = rows.filter((r) => r.avgSec <= 10 && r.views >= 1);

    const related = findRelatedContents(topPost.path).slice(0, 6);

    const suggestions = {
        topPost: normalizePath(topPost.path),
        topPostViews: topPost.views,
        relatedSuggestions: related,
        amplifyCandidates: highEngagementLowViews.map((r) => ({
            path: normalizePath(r.path),
            views: r.views,
            avgSec: r.avgSec,
        })),
        fixCandidates: lowEngagement.map((r) => ({
            path: normalizePath(r.path),
            views: r.views,
            avgSec: r.avgSec,
        })),
    };

    fs.writeFileSync(
        OUT_LINK_SUGGESTIONS,
        JSON.stringify(suggestions, null, 2),
        'utf8',
    );

    const promoLines = [
        'pagePath,screenPageViews,averageSessionDuration_seconds,reason',
        `${normalizePath(topPost.path)},${topPost.views},${topPost.avgSec},top_post`,
        ...highEngagementLowViews.map(
            (r) =>
                `${normalizePath(r.path)},${r.views},${r.avgSec},high_engagement_low_views`,
        ),
    ];
    fs.writeFileSync(OUT_PROMOTION_CSV, promoLines.join('\n'), 'utf8');

    console.log('Wrote suggestions to', OUT_LINK_SUGGESTIONS);
    console.log('Wrote promotion CSV to', OUT_PROMOTION_CSV);
}

main();

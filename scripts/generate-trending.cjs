const fs = require('fs');
const path = require('path');

const SUGGESTIONS = path.resolve(
    __dirname,
    '../src/data/internal-links-suggestions.json',
);
const PROMO_CSV = path.resolve(__dirname, '../src/data/ga-promotion.csv');
const OUT = path.resolve(__dirname, '../src/data/ga-trending.json');

// Minimum age between updates (hours) to avoid frequent churn
const MIN_AGE_HOURS = Number(process.env.GA_TRENDING_MIN_HOURS || 24);
// Number of items to expose
const MAX_ITEMS = Number(process.env.GA_TRENDING_MAX_ITEMS || 6);

function readSuggestions() {
    if (fs.existsSync(SUGGESTIONS)) {
        try {
            const raw = fs.readFileSync(SUGGESTIONS, 'utf8');
            return JSON.parse(raw);
        } catch (e) {}
    }
    return null;
}

function readPromoCsv() {
    if (!fs.existsSync(PROMO_CSV)) return null;
    const raw = fs.readFileSync(PROMO_CSV, 'utf8').trim();
    const lines = raw.split(/\r?\n/).slice(1);
    return lines.map((l) => {
        const [pagePath, screenPageViews, averageSessionDuration_seconds, reason] =
            l.split(',');
        return {
            path: pagePath,
            views: Number(screenPageViews),
            avgSec: Number(averageSessionDuration_seconds),
            reason,
        };
    });
}

function loadExisting() {
    if (!fs.existsSync(OUT)) return null;
    try {
        return JSON.parse(fs.readFileSync(OUT, 'utf8'));
    } catch (e) {
        return null;
    }
}

function writeOut(trending) {
    const payload = { generatedAt: new Date().toISOString(), trending };
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
    console.log('Wrote', OUT);
}

function arraysEqual(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function main() {
    const suggestions = readSuggestions();
    let items = [];

    if (suggestions && suggestions.topPost) {
        // include topPost first
        items.push({
            path: suggestions.topPost,
            views: suggestions.topPostViews || 0,
            reason: 'top_post',
        });
        if (Array.isArray(suggestions.amplifyCandidates)) {
            suggestions.amplifyCandidates.slice(0, MAX_ITEMS).forEach((c) =>
                items.push({
                    path: c.path,
                    views: c.views || 0,
                    avgSec: c.avgSec || 0,
                    reason: 'amplify',
                }),
            );
        }
    } else {
        const promo = readPromoCsv();
        if (promo) {
            items = promo.slice(0, MAX_ITEMS).map((p) => ({
                path: p.path,
                views: p.views,
                avgSec: p.avgSec,
                reason: p.reason,
            }));
        }
    }

    // fallback: nothing to do
    if (!items.length) {
        console.log('No trending items found.');
        return;
    }

    // prepare normalized paths
    // filter invalid/incomplete paths like '/tag' or '/category' without identifier
    const isInvalidPath = (p) => {
        if (!p) return true;
        const cleaned = p.replace(/\/+$/, '');
        // match exactly '/tag' or '/category' (case-insensitive)
        if (/^\/(tag|category)$/i.test(cleaned)) return true;
        return false;
    };

    const filteredItems = items.filter((i) => {
        if (isInvalidPath(i.path)) {
            console.log('Dropping invalid trending path:', i.path);
            return false;
        }
        return true;
    });

    const newPaths = filteredItems.map((i) => i.path.replace(/\/+$/, ''));

    const existing = loadExisting();
    if (existing && existing.generatedAt) {
        const last = new Date(existing.generatedAt);
        const ageMs = Date.now() - last.getTime();
        const minMs = MIN_AGE_HOURS * 3600 * 1000;
        if (ageMs < minMs) {
            console.log(
                `Skipping update: last generated ${Math.round(ageMs / 3600000)}h ago (< ${MIN_AGE_HOURS}h)`,
            );
            return;
        }
        const oldPaths = (existing.trending || []).map((i) =>
            i.path.replace(/\/+$/, ''),
        );
        if (arraysEqual(oldPaths, newPaths)) {
            console.log('Skipping update: trending list unchanged');
            return;
        }
    }

    // write new trending
    const trending = filteredItems.slice(0, MAX_ITEMS).map((i) => ({
        path: i.path.replace(/\/+$/, ''),
        views: i.views || 0,
        avgSec: i.avgSec || 0,
        reason: i.reason || 'auto',
    }));
    writeOut(trending);
}

main();

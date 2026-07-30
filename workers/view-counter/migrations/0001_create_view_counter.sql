-- Page-view storage only. Likes and other reactions deliberately do not belong
-- in this first migration.
--
-- All timestamps are UTC ISO-8601 strings and all dates are UTC YYYY-MM-DD.
-- `visitor_day_hash` is an HMAC digest generated in the Worker; never store a
-- raw cookie ID, IP address, referrer, or browser fingerprint in this database.

CREATE TABLE IF NOT EXISTS article_view_daily (
    view_date TEXT NOT NULL,
    canonical_path TEXT NOT NULL,
    visitor_day_hash TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    PRIMARY KEY (view_date, canonical_path, visitor_day_hash),
    CHECK (length(canonical_path) BETWEEN 2 AND 512),
    CHECK (canonical_path LIKE '/article/%')
);

-- This is the post-cutover counter. Migration 0002 adds the trigger that
-- increases it only after a newly inserted daily visitor row.
CREATE TABLE IF NOT EXISTS article_view_totals (
    canonical_path TEXT PRIMARY KEY,
    total_views INTEGER NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    updated_at TEXT NOT NULL,
    CHECK (length(canonical_path) BETWEEN 2 AND 512),
    CHECK (canonical_path LIKE '/article/%')
);

-- A GA4 baseline keeps the existing displayed number separate from views that
-- the Worker counted itself. Import it once from src/data/ga-views.json at
-- cutover; the read API can add it to article_view_totals.total_views.
CREATE TABLE IF NOT EXISTS article_view_baselines (
    source TEXT NOT NULL,
    canonical_path TEXT NOT NULL,
    view_count INTEGER NOT NULL CHECK (view_count >= 0),
    imported_at TEXT NOT NULL,
    PRIMARY KEY (source, canonical_path),
    CHECK (source = 'ga4'),
    CHECK (length(canonical_path) BETWEEN 2 AND 512),
    CHECK (canonical_path LIKE '/article/%')
);

CREATE INDEX IF NOT EXISTS idx_article_view_daily_path_date
    ON article_view_daily (canonical_path, view_date);

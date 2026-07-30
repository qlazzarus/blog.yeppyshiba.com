-- Keep the aggregate exactly aligned with newly accepted daily visitor rows.
-- A trigger avoids a partially completed request leaving a daily row without
-- its corresponding total increment.
CREATE TRIGGER IF NOT EXISTS article_view_daily_increment_total
AFTER INSERT ON article_view_daily
BEGIN
    INSERT INTO article_view_totals (canonical_path, total_views, updated_at)
    VALUES (NEW.canonical_path, 1, NEW.first_seen_at)
    ON CONFLICT(canonical_path) DO UPDATE SET
        total_views = total_views + 1,
        updated_at = NEW.first_seen_at;
END;

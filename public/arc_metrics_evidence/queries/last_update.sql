SELECT MAX(latest_timestamp) AS last_updated
FROM (
    SELECT MAX(timestamp) AS latest_timestamp FROM telegram_metrics
    UNION ALL
    SELECT MAX(timestamp) AS latest_timestamp FROM github_forks
    UNION ALL
    SELECT MAX(timestamp) AS latest_timestamp FROM token_holders
    UNION ALL
    SELECT MAX(timestamp) AS latest_timestamp FROM github_stars
    UNION ALL
    SELECT MAX(timestamp) AS latest_timestamp FROM github_release_version
    UNION ALL
    SELECT MAX(timestamp) AS latest_timestamp FROM x_metrics
) AS combined;

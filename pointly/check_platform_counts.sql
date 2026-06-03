-- Run in phpMyAdmin to check per-platform product counts
SELECT sc.name, COUNT(sa.id) AS total
FROM social_categories sc
LEFT JOIN social_accounts sa ON sa.category_id = sc.id
WHERE sa.source = 'hstockplus'
GROUP BY sc.name
ORDER BY total DESC;

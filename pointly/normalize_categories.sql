-- ============================================================
-- Normalize social_categories names to consistent prefixes
-- Email providers  → Email-[Name]
-- Social platforms → Accounts-[Name]
-- ============================================================

-- ── Email providers ───────────────────────────────────────────
UPDATE social_categories SET name = 'Email-Gmail'          WHERE name = 'Gmail';
UPDATE social_categories SET name = 'Email-Hotmail'        WHERE name = 'Hotmail';
UPDATE social_categories SET name = 'Email-Outlook'        WHERE name = 'Outlook';
UPDATE social_categories SET name = 'Email-Yahoo'          WHERE name = 'Yahoo';
UPDATE social_categories SET name = 'Email-Yandex'        WHERE name = 'Yandex';
UPDATE social_categories SET name = 'Email-ProtonMail'    WHERE name = 'ProtonMail';
UPDATE social_categories SET name = 'Email-iCloud'        WHERE name = 'iCloud';

-- ── Social platforms missing Accounts- prefix ────────────────
UPDATE social_categories SET name = 'Accounts-Facebook'   WHERE name = 'Facebook';
UPDATE social_categories SET name = 'Accounts-Instagram'  WHERE name = 'Instagram';
UPDATE social_categories SET name = 'Accounts-Twitter'    WHERE name = 'Twitter';
UPDATE social_categories SET name = 'Accounts-TikTok'     WHERE name = 'TikTok';
UPDATE social_categories SET name = 'Accounts-Telegram'   WHERE name = 'Telegram';
UPDATE social_categories SET name = 'Accounts-WhatsApp'   WHERE name = 'WhatsApp';
UPDATE social_categories SET name = 'Accounts-Snapchat'   WHERE name = 'Snapchat';
UPDATE social_categories SET name = 'Accounts-Discord'    WHERE name = 'Discord';
UPDATE social_categories SET name = 'Accounts-Reddit'     WHERE name = 'Reddit';
UPDATE social_categories SET name = 'Accounts-LinkedIn'   WHERE name = 'LinkedIn';
UPDATE social_categories SET name = 'Accounts-Twitch'     WHERE name = 'Twitch';
UPDATE social_categories SET name = 'Accounts-Spotify'    WHERE name = 'Spotify';
UPDATE social_categories SET name = 'Accounts-YouTube'    WHERE name = 'YouTube';
UPDATE social_categories SET name = 'Accounts-Pinterest'  WHERE name = 'Pinterest';
UPDATE social_categories SET name = 'Accounts-GitHub'     WHERE name = 'GitHub';
UPDATE social_categories SET name = 'Accounts-Microsoft'  WHERE name = 'Microsoft';
UPDATE social_categories SET name = 'Accounts-Apple'      WHERE name = 'Apple';
UPDATE social_categories SET name = 'Accounts-Netflix'    WHERE name = 'Netflix';
UPDATE social_categories SET name = 'Accounts-Amazon'     WHERE name = 'Amazon';
UPDATE social_categories SET name = 'Accounts-PayPal'     WHERE name = 'PayPal';
UPDATE social_categories SET name = 'Accounts-Kick'       WHERE name = 'Kick';
UPDATE social_categories SET name = 'Accounts-Dating'     WHERE name = 'Dating';

-- ── Verify result ─────────────────────────────────────────────
SELECT name, COUNT(sa.id) AS total
FROM social_categories sc
LEFT JOIN social_accounts sa ON sa.category_id = sc.id
GROUP BY sc.id
ORDER BY total DESC;

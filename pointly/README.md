# Pointly — Fix Files

These are the production fix files for pointly.com.ng.

## Deployment paths on server

| File here | Deploy to |
|---|---|
| `api/hstock_sync.php` | `/public_html/api/hstock_sync.php` |
| `demo/index.html` | `/public_html/demo/index.html` |
| `demo/registerSW.js` | `/public_html/demo/registerSW.js` |
| `demo/.htaccess` | `/public_html/demo/.htaccess` |
| `Data.jsx` | React source (rebuild to patch bundle) |
| `normalize_categories.sql` | Run once in phpMyAdmin |
| `check_platform_counts.sql` | Run in phpMyAdmin to verify platform counts |

## Per-platform count check

Run `check_platform_counts.sql` in phpMyAdmin after each sync.
Target: ≥ 100 products per platform.

## Sync URL

```
https://pointly.com.ng/api/hstock_sync.php?token=pL9mK2xQ7nR4wB8vT3
```

Fetches up to 6000 products across 30 pages (200/page) + verified shop supplements.

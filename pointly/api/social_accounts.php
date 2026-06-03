<?php
ini_set('memory_limit', '256M');
set_time_limit(120);
require_once __DIR__ . '/config.php';
$conn->set_charset('utf8mb4');

// ── Fetch categories — exclude Growth Services ────────────────
$catRes = $conn->query("
    SELECT
        sc.id, sc.name, sc.icon, sc.color,
        COUNT(sa.id) AS total_stock,
        SUM(CASE WHEN sa.status = 'sold' THEN 1 ELSE 0 END) AS total_sold,
        SUM(CASE WHEN sa.status = 'available' THEN 1 ELSE 0 END) AS total_available
    FROM social_categories sc
    LEFT JOIN social_accounts sa ON sa.category_id = sc.id
    WHERE sc.name NOT LIKE '%Growth Services%'
      AND sc.name NOT LIKE '%growth services%'
      AND sc.name NOT LIKE '%Digital Products%'
      AND sc.name NOT LIKE '%digital products%'
      AND sc.name NOT LIKE '%SMM%'
      AND sc.name NOT LIKE '%Video Bundle%'
      AND sc.name NOT LIKE '%video bundle%'
    GROUP BY sc.id
    HAVING total_stock > 0
    ORDER BY sc.name ASC
");
$categories = [];
while ($row = $catRes->fetch_assoc()) {
    $categories[] = $row;
}

// ── Inject virtual UK TikTok folder ──────────────────────────
// Find the TikTok category ID to use for UK accounts query
$tiktokCatId = null;
foreach ($categories as $cat) {
    if (stripos($cat['name'], 'tiktok') !== false && stripos($cat['name'], 'UK') === false) {
        $tiktokCatId = $cat['id'];
        break;
    }
}
if ($tiktokCatId) {
    $ukRes = $conn->prepare("
        SELECT COUNT(*) AS total_available,
               SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) AS total_sold
        FROM social_accounts
        WHERE category_id = ? AND (title LIKE '%UK%' OR title LIKE '%United Kingdom%' OR title LIKE '%uk %')
    ");
    $ukRes->bind_param('i', $tiktokCatId);
    $ukRes->execute();
    $ukRow = $ukRes->get_result()->fetch_assoc();
    $ukRes->close();
    if ($ukRow['total_available'] > 0) {
        $categories[] = [
            'id'              => 'uk_tiktok_' . $tiktokCatId,
            'name'            => 'UK TikTok Accounts',
            'icon'            => 'fab fa-tiktok',
            'color'           => '#000000',
            'total_stock'     => $ukRow['total_available'],
            'total_sold'      => $ukRow['total_sold'],
            'total_available' => $ukRow['total_available'],
            '_virtual'        => true,
            '_parent_id'      => $tiktokCatId,
        ];
    }
}

// ── Pin priority platforms to the top ────────────────────────
$PINNED = ['facebook','tiktok','instagram','twitter','reddit','linkedin','gmail','hotmail','telegram','netflix'];
usort($categories, function($a, $b) use ($PINNED) {
    $aKey = strtolower($a['name']);
    $bKey = strtolower($b['name']);
    $aIdx = false; $bIdx = false;
    foreach ($PINNED as $i => $p) {
        if (str_contains($aKey, $p)) { $aIdx = $i; break; }
    }
    foreach ($PINNED as $i => $p) {
        if (str_contains($bKey, $p)) { $bIdx = $i; break; }
    }
    if ($aIdx !== false && $bIdx !== false) return $aIdx - $bIdx;
    if ($aIdx !== false) return -1;
    if ($bIdx !== false) return 1;
    return strcasecmp($a['name'], $b['name']);
});

// ── Fetch selected category accounts ─────────────────────────
$raw_cat     = $_GET['cat'] ?? null;
$is_uk_tiktok = ($raw_cat && strpos($raw_cat, 'uk_tiktok_') === 0);
$selected_cat = $is_uk_tiktok ? intval(str_replace('uk_tiktok_', '', $raw_cat)) : ($raw_cat ? intval($raw_cat) : null);

$accounts = [];
$selected_cat_name  = '';
$selected_cat_color = '#6A00DF';
$selected_cat_icon  = 'fas fa-store';

if ($selected_cat) {
    if ($is_uk_tiktok) {
        $selected_cat_name  = 'UK TikTok Accounts';
        $selected_cat_color = '#000000';
        $selected_cat_icon  = 'fab fa-tiktok';
        $accRes = $conn->prepare("
            SELECT id, title, description, price, status, tags, image, created_at
            FROM social_accounts
            WHERE category_id = ? AND status = 'available'
              AND (title LIKE '%UK%' OR title LIKE '%United Kingdom%' OR title LIKE '%uk %')
            ORDER BY created_at DESC
        ");
        $accRes->bind_param('i', $selected_cat);
        $accRes->execute();
        $result = $accRes->get_result();
    } else {
        $catInfo = $conn->prepare("SELECT name, color, icon FROM social_categories WHERE id = ?");
        $catInfo->bind_param('i', $selected_cat);
        $catInfo->execute();
        $catRow = $catInfo->get_result()->fetch_assoc();
        $catInfo->close();
        if ($catRow) {
            $selected_cat_name  = $catRow['name'];
            $selected_cat_color = $catRow['color'] ?: '#6A00DF';
            $selected_cat_icon  = $catRow['icon']  ?: 'fas fa-store';
        }
        $accRes = $conn->prepare("
            SELECT id, title, description, price, status, tags, image, created_at
            FROM social_accounts
            WHERE category_id = ? AND status = 'available'
            ORDER BY created_at DESC
        ");
        $accRes->bind_param('i', $selected_cat);
        $accRes->execute();
        $result = $accRes->get_result();
    }

    while ($row = $result->fetch_assoc()) {
        preg_match('/\b(20\d{2})\b/', $row['title'] . ' ' . $row['created_at'], $matches);
        $row['year'] = $matches[1] ?? date('Y', strtotime($row['created_at']));
        $accounts[] = $row;
    }
    $accRes->close();

    $by_year = [];
    foreach ($accounts as $acc) {
        $by_year[$acc['year']][] = $acc;
    }
    krsort($by_year);
}

// ── Platform logo map (Simple Icons CDN) ─────────────────────
// Format: https://cdn.simpleicons.org/{slug}/{hex-color}
$platform_icons = [
    'facebook'   => ['slug' => 'facebook',          'color' => '1877F2', 'bg' => '#e8f0fe'],
    'instagram'  => ['slug' => 'instagram',          'color' => 'E4405F', 'bg' => '#fce4ec'],
    'twitter'    => ['slug' => 'x',                  'color' => '000000', 'bg' => '#f5f5f5'],
    'tiktok'     => ['slug' => 'tiktok',             'color' => '000000', 'bg' => '#f0f0f0'],
    'youtube'    => ['slug' => 'youtube',            'color' => 'FF0000', 'bg' => '#ffebee'],
    'telegram'   => ['slug' => 'telegram',           'color' => '26A5E4', 'bg' => '#e3f2fd'],
    'discord'    => ['slug' => 'discord',            'color' => '5865F2', 'bg' => '#ede7f6'],
    'spotify'    => ['slug' => 'spotify',            'color' => '1DB954', 'bg' => '#e8f5e9'],
    'linkedin'   => ['slug' => 'linkedin',           'color' => '0A66C2', 'bg' => '#e3f2fd'],
    'reddit'     => ['slug' => 'reddit',             'color' => 'FF4500', 'bg' => '#fbe9e7'],
    'gmail'      => ['slug' => 'gmail',              'color' => 'EA4335', 'bg' => '#ffebee'],
    'hotmail'    => ['slug' => 'microsoftoutlook',   'color' => '0078D4', 'bg' => '#e3f2fd'],
    'outlook'    => ['slug' => 'microsoftoutlook',   'color' => '0078D4', 'bg' => '#e3f2fd'],
    'netflix'    => ['slug' => 'netflix',            'color' => 'E50914', 'bg' => '#ffebee'],
    'whatsapp'   => ['slug' => 'whatsapp',           'color' => '25D366', 'bg' => '#e8f5e9'],
    'snapchat'   => ['slug' => 'snapchat',           'color' => 'FFFC00', 'bg' => '#fffde7'],
    'pinterest'  => ['slug' => 'pinterest',          'color' => 'BD081C', 'bg' => '#ffebee'],
    'twitch'     => ['slug' => 'twitch',             'color' => '9146FF', 'bg' => '#ede7f6'],
    'apple'      => ['slug' => 'apple',              'color' => '000000', 'bg' => '#f5f5f5'],
    'icloud'     => ['slug' => 'icloud',             'color' => '3693F3', 'bg' => '#e3f2fd'],
    'amazon'     => ['slug' => 'amazon',             'color' => 'FF9900', 'bg' => '#fff8e1'],
    'github'     => ['slug' => 'github',             'color' => '181717', 'bg' => '#f5f5f5'],
    'chatgpt'    => ['slug' => 'openai',             'color' => '412991', 'bg' => '#ede7f6'],
    'openai'     => ['slug' => 'openai',             'color' => '412991', 'bg' => '#ede7f6'],
    'microsoft'  => ['slug' => 'microsoft',          'color' => '5E5E5E', 'bg' => '#f5f5f5'],
    'google'     => ['slug' => 'google',             'color' => '4285F4', 'bg' => '#e8f0fe'],
    'yahoo'      => ['slug' => 'yahoo',              'color' => '6001D2', 'bg' => '#ede7f6'],
    'proton'     => ['slug' => 'protonmail',         'color' => '6D4AFF', 'bg' => '#ede7f6'],
    'twitter/x'  => ['slug' => 'x',                  'color' => '000000', 'bg' => '#f5f5f5'],
    'beboo'      => ['slug' => 'b',                  'color' => '6A00DF', 'bg' => '#ede7f6'],
    'bluesky'    => ['slug' => 'bluesky',            'color' => '0085FF', 'bg' => '#e3f2fd'],
    'threads'    => ['slug' => 'threads',            'color' => '000000', 'bg' => '#f5f5f5'],
    'mastodon'   => ['slug' => 'mastodon',           'color' => '6364FF', 'bg' => '#ede7f6'],
];

function getPlatformIcon(string $name, array $map): ?array {
    $lower = strtolower($name);
    foreach ($map as $key => $data) {
        if (str_contains($lower, $key)) return $data;
    }
    return null;
}

function getSimpleIconUrl(array $icon): string {
    return 'https://cdn.simpleicons.org/' . $icon['slug'] . '/' . $icon['color'];
}

// Get icon data for selected category (accounts view)
$selected_icon_data = $selected_cat ? getPlatformIcon($selected_cat_name, $platform_icons) : null;
$selected_icon_url  = $selected_icon_data ? getSimpleIconUrl($selected_icon_data) : null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title><?php echo $selected_cat ? htmlspecialchars($selected_cat_name) . ' Accounts' : 'Social Accounts'; ?> | Pointly</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        :root {
            --bg:        #0a0514;
            --card:      #1a1333;
            --card2:     #120d26;
            --border:    rgba(106,0,223,0.15);
            --purple:    #6A00DF;
            --purple2:   #8B3DFF;
            --text:      #f8fafc;
            --muted:     #a78bfa;
            --green:     #4ade80;
            --red:       #f87171;
            --yellow:    #facc15;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding-bottom: 60px;
        }

        /* ── TOP BAR ── */
        .topbar {
            position: sticky; top: 0; z-index: 100;
            background: rgba(10,5,20,0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 14px 16px;
            display: flex; align-items: center; gap: 12px;
        }
        .topbar-back {
            width: 38px; height: 38px; flex-shrink: 0;
            border-radius: 10px;
            background: rgba(106,0,223,0.15);
            border: 1px solid rgba(106,0,223,0.3);
            color: var(--purple2);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; text-decoration: none;
        }
        .topbar-info { flex: 1; min-width: 0; }
        .topbar-title { font-size: 16px; font-weight: 800; color: var(--text); }
        .topbar-subtitle { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .topbar-logo {
            font-size: 14px; font-weight: 900;
            color: var(--purple2); letter-spacing: 2px;
            flex-shrink: 0;
        }

        /* ── HERO BANNER ── */
        .hero {
            margin: 16px 16px 0;
            border-radius: 20px; padding: 20px;
            background: linear-gradient(135deg, rgba(106,0,223,0.3), rgba(139,61,255,0.1));
            border: 1px solid rgba(106,0,223,0.2);
            display: flex; align-items: center; gap: 16px;
        }
        .hero-icon {
            width: 56px; height: 56px; border-radius: 16px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; overflow: hidden;
            background: rgba(106,0,223,0.2);
        }
        .hero-icon img { width: 36px; height: 36px; object-fit: contain; }
        .hero-icon i { font-size: 24px; color: var(--purple2); }
        .hero-title { font-size: 20px; font-weight: 900; }
        .hero-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

        /* ── STATS ROW ── */
        .stats-row { display: flex; gap: 10px; margin: 14px 16px 0; }
        .stat-pill {
            flex: 1;
            background: var(--card); border: 1px solid var(--border);
            border-radius: 12px; padding: 12px 14px; text-align: center;
        }
        .stat-pill-val { font-size: 20px; font-weight: 900; }
        .stat-pill-label { font-size: 10px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.8px; }

        /* ── SECTION TITLE ── */
        .section-title {
            margin: 22px 16px 12px;
            font-size: 13px; font-weight: 800; color: var(--muted);
            text-transform: uppercase; letter-spacing: 1.5px;
            display: flex; align-items: center; gap: 8px;
        }
        .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        /* ── 2FA BANNER ── */
        .twofa-banner {
            margin: 12px 16px 0;
            border-radius: 12px; padding: 11px 16px;
            background: linear-gradient(135deg, rgba(106,0,223,0.18), rgba(139,61,255,0.08));
            border: 1px solid rgba(106,0,223,0.3);
            display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .twofa-banner a {
            color: #c4b5fd; text-decoration: none;
            font-size: 13.5px; font-weight: 700;
            display: flex; align-items: center; gap: 7px;
        }
        .twofa-banner a:hover { color: #fff; }
        .twofa-arrow { font-size: 11px; opacity: 0.7; }

        /* ── FOLDER GRID ── */
        .folder-grid {
            display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 12px; margin: 0 16px;
        }
        @media (min-width: 480px) { .folder-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 700px) { .folder-grid { grid-template-columns: repeat(4, 1fr); } }

        .folder-card {
            background: var(--card); border: 1px solid var(--border);
            border-radius: 18px; padding: 16px 14px;
            text-decoration: none; color: var(--text);
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative; overflow: hidden;
        }
        .folder-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
            background: var(--cat-color, var(--purple)); border-radius: 18px 18px 0 0;
        }
        .folder-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(106,0,223,0.2); }

        /* Brand icon box — white bg so SVG colours show properly */
        .folder-icon-box {
            width: 52px; height: 52px; border-radius: 14px;
            background: #fff;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; flex-shrink: 0;
        }
        .folder-icon-box img {
            width: 32px; height: 32px; object-fit: contain;
        }
        .folder-icon-fallback {
            width: 52px; height: 52px; border-radius: 14px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; font-weight: 900; color: #fff;
            flex-shrink: 0;
        }

        .folder-name { font-size: 13px; font-weight: 700; text-align: center; line-height: 1.3; }
        .folder-stats { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; }
        .folder-stock { font-size: 11px; font-weight: 700; color: var(--green); background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); border-radius: 6px; padding: 2px 8px; }
        .folder-sold { font-size: 10px; color: var(--muted); }

        /* ── YEAR GROUP ── */
        .year-section { margin: 0 16px 8px; }
        .year-header {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 10px; padding: 10px 14px;
            background: var(--card2); border-radius: 12px;
            border-left: 3px solid var(--purple);
        }
        .year-label { font-size: 15px; font-weight: 900; color: var(--yellow); }
        .year-count { font-size: 11px; font-weight: 700; background: rgba(250,204,21,0.1); color: var(--yellow); border: 1px solid rgba(250,204,21,0.2); border-radius: 20px; padding: 2px 8px; }

        /* ── ACCOUNT CARD ── */
        .acc-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .acc-card {
            background: var(--card); border: 1px solid var(--border);
            border-radius: 14px; padding: 14px;
            display: flex; align-items: flex-start; gap: 12px;
            cursor: pointer; transition: border-color 0.2s;
        }
        .acc-card:hover { border-color: rgba(106,0,223,0.4); }
        .acc-avatar {
            width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; background: #fff;
        }
        .acc-avatar img { width: 28px; height: 28px; object-fit: contain; }
        .acc-avatar-fallback {
            width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 900; color: #fff;
        }
        .acc-body { flex: 1; min-width: 0; }
        .acc-title { font-size: 13px; font-weight: 700; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
        .acc-desc { font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .acc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
        .acc-tag { font-size: 10px; font-weight: 600; background: rgba(106,0,223,0.12); color: var(--purple2); border: 1px solid rgba(106,0,223,0.2); border-radius: 5px; padding: 1px 6px; }
        .acc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .acc-price { font-size: 15px; font-weight: 900; }
        .acc-buy-btn {
            background: linear-gradient(135deg, var(--purple), var(--purple2));
            border: none; border-radius: 8px; padding: 7px 14px;
            font-size: 12px; font-weight: 800; color: #fff; cursor: pointer;
            box-shadow: 0 4px 12px rgba(106,0,223,0.3);
        }
        .acc-buy-btn:active { transform: scale(0.96); }

        /* ── EMPTY STATE ── */
        .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
        .empty-state i { font-size: 48px; opacity: 0.2; display: block; margin-bottom: 16px; }

        /* ── SEARCH BAR ── */
        .search-wrap { margin: 16px 16px 0; position: relative; }
        .search-input {
            width: 100%; background: var(--card); border: 1px solid var(--border);
            border-radius: 12px; padding: 12px 16px 12px 42px;
            color: var(--text); font-size: 14px; outline: none; transition: border-color 0.2s;
        }
        .search-input::placeholder { color: rgba(167,139,250,0.4); }
        .search-input:focus { border-color: rgba(106,0,223,0.5); }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }

        /* ── BREADCRUMB ── */
        .breadcrumb { margin: 12px 16px 0; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
        .breadcrumb a { color: var(--purple2); text-decoration: none; }

        /* ── DETAIL SHEET (popup) ── */
        .sheet-overlay {
            display: none; position: fixed; inset: 0; z-index: 500;
            background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        }
        .sheet-overlay.open { display: block; }
        .sheet {
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 501;
            background: var(--bg);
            border-radius: 24px 24px 0 0;
            max-height: 90vh; overflow-y: auto;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        .sheet.open { transform: translateY(0); }

        .sheet-banner {
            width: 100%; height: 220px;
            display: flex; align-items: center; justify-content: center;
            position: relative; flex-shrink: 0;
            border-radius: 24px 24px 0 0; overflow: hidden;
        }
        .sheet-banner-logo {
            width: 110px; height: 110px; object-fit: contain;
            filter: drop-shadow(0 4px 24px rgba(0,0,0,0.4));
            background: #fff; border-radius: 24px; padding: 12px;
        }
        .sheet-banner-icon { font-size: 72px; opacity: 0.9; }
        .sheet-banner-fallback {
            width: 110px; height: 110px; border-radius: 28px;
            display: flex; align-items: center; justify-content: center;
            font-size: 48px; font-weight: 900; color: #fff;
        }

        .sheet-back {
            position: absolute; top: 14px; left: 14px;
            width: 38px; height: 38px; border-radius: 50%;
            background: rgba(0,0,0,0.45); backdrop-filter: blur(8px);
            border: none; color: #fff; font-size: 16px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
        }

        .sheet-body { padding: 20px 20px 40px; }
        .sheet-category { font-size: 11px; font-weight: 800; color: var(--purple2); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        .sheet-title { font-size: 20px; font-weight: 900; color: var(--text); line-height: 1.35; margin-bottom: 10px; }
        .sheet-price { font-size: 28px; font-weight: 900; color: #F5C842; margin-bottom: 16px; }

        .sheet-features { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .sheet-feature {
            background: rgba(106,0,223,0.08); border: 1px solid rgba(106,0,223,0.15);
            border-radius: 10px; padding: 10px 12px;
            display: flex; align-items: center; gap: 8px;
            font-size: 12px; font-weight: 600; color: var(--text);
        }
        .sheet-feature i { color: var(--green); font-size: 14px; }

        .sheet-section-label { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
        .sheet-desc { font-size: 13px; color: #c4b5fd; line-height: 1.75; background: rgba(106,0,223,0.07); border-radius: 12px; padding: 14px; margin-bottom: 16px; white-space: pre-wrap; word-break: break-word; }
        .sheet-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
        .sheet-tag { font-size: 11px; font-weight: 600; background: rgba(106,0,223,0.15); color: var(--purple2); border: 1px solid rgba(106,0,223,0.25); border-radius: 6px; padding: 4px 10px; }

        .sheet-buy-btn {
            width: 100%; padding: 16px;
            background: #F5C842; color: #1a0820;
            border: none; border-radius: 14px;
            font-size: 17px; font-weight: 900; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            box-shadow: 0 6px 24px rgba(245,200,66,0.35);
        }
        .sheet-buy-btn:active { transform: scale(0.98); }
        .sheet-buy-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── TOAST ── */
        .toast {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            z-index: 9999; padding: 13px 24px;
            background: #1e1533; color: #fff;
            border: 1px solid rgba(106,0,223,0.3); border-radius: 14px;
            font-size: 14px; font-weight: 600;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            white-space: nowrap; opacity: 0; pointer-events: none;
            transition: opacity 0.2s;
        }
        .toast.show { opacity: 1; }
        .toast.error { border-color: rgba(248,113,113,0.5); color: #f87171; }
        .toast.success { border-color: rgba(74,222,128,0.5); color: #4ade80; }
    </style>
</head>
<body>

<!-- TOP BAR -->
<div class="topbar">
    <?php if ($selected_cat): ?>
        <a href="/api/social_accounts.php" class="topbar-back" onclick="history.back();return false;"><i class="fas fa-arrow-left"></i></a>
        <div class="topbar-info">
            <div class="topbar-title"><?php echo htmlspecialchars($selected_cat_name); ?></div>
            <div class="topbar-subtitle">Available Accounts</div>
        </div>
    <?php else: ?>
        <a href="/demo/market" class="topbar-back"><i class="fas fa-arrow-left"></i></a>
        <div class="topbar-info">
            <div class="topbar-title">Social Accounts</div>
            <div class="topbar-subtitle">Premium verified accounts marketplace</div>
        </div>
    <?php endif; ?>
    <span class="topbar-logo">Pointly</span>
</div>

<?php if (!$selected_cat): ?>
<!-- ══ FOLDERS VIEW ══ -->
<div class="search-wrap">
    <i class="fas fa-search search-icon"></i>
    <input type="text" class="search-input" id="searchInput" placeholder="Search platforms...">
</div>

<!-- 2FA BANNER -->
<div class="twofa-banner">
    <a href="https://2fa.cn" target="_blank" rel="noopener noreferrer">
        🔐 Get your 2FA here <span class="twofa-arrow">→</span>
    </a>
</div>

<div class="section-title"><i class="fas fa-folder"></i> All Platforms</div>
<div class="folder-grid" id="folderGrid">
    <?php foreach ($categories as $cat):
        $iconData = getPlatformIcon($cat['name'], $platform_icons);
        $iconUrl  = $iconData ? getSimpleIconUrl($iconData) : null;
        $color    = $cat['color'] ?: '#6A00DF';
        $firstLetter = strtoupper(substr($cat['name'], 0, 1));
    ?>
    <a href="/api/social_accounts.php?cat=<?php echo htmlspecialchars($cat['id']); ?>"
       class="folder-card"
       style="--cat-color: <?php echo htmlspecialchars($color); ?>"
       data-name="<?php echo strtolower(htmlspecialchars($cat['name'])); ?>">

        <?php if ($iconUrl): ?>
            <div class="folder-icon-box">
                <img src="<?php echo htmlspecialchars($iconUrl); ?>"
                     alt="<?php echo htmlspecialchars($cat['name']); ?>"
                     onerror="this.parentElement.style.display='none';this.parentElement.nextElementSibling.style.display='flex'">
            </div>
            <div class="folder-icon-fallback" style="display:none;background:<?php echo htmlspecialchars($color); ?>"><?php echo $firstLetter; ?></div>
        <?php else: ?>
            <div class="folder-icon-fallback" style="background:<?php echo htmlspecialchars($color); ?>"><?php echo $firstLetter; ?></div>
        <?php endif; ?>

        <div class="folder-name"><?php echo htmlspecialchars($cat['name']); ?></div>
        <div class="folder-stats">
            <span class="folder-stock"><?php echo number_format($cat['total_available']); ?> in stock</span>
            <span class="folder-sold"><?php echo number_format($cat['total_sold']); ?> sold</span>
        </div>
    </a>
    <?php endforeach; ?>
</div>
<?php if (empty($categories)): ?>
<div class="empty-state"><i class="fas fa-folder-open"></i>No platforms available right now.</div>
<?php endif; ?>

<?php else: ?>
<!-- ══ ACCOUNTS VIEW ══ -->
<?php $total_available = count($accounts); ?>

<div class="breadcrumb">
    <a href="/api/social_accounts.php"><i class="fas fa-folder"></i> Platforms</a>
    <i class="fas fa-chevron-right" style="font-size:9px"></i>
    <span><?php echo htmlspecialchars($selected_cat_name); ?></span>
</div>

<div class="hero">
    <div class="hero-icon" style="background:<?php echo htmlspecialchars($selected_cat_color); ?>20">
        <?php if ($selected_icon_url): ?>
            <img src="<?php echo htmlspecialchars($selected_icon_url); ?>" alt=""
                 onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
            <i class="<?php echo htmlspecialchars($selected_cat_icon); ?>" style="display:none;color:<?php echo htmlspecialchars($selected_cat_color); ?>"></i>
        <?php else: ?>
            <i class="<?php echo htmlspecialchars($selected_cat_icon); ?>" style="color:<?php echo htmlspecialchars($selected_cat_color); ?>"></i>
        <?php endif; ?>
    </div>
    <div>
        <div class="hero-title"><?php echo htmlspecialchars($selected_cat_name); ?></div>
        <div class="hero-sub">Verified premium accounts — instant delivery</div>
    </div>
</div>

<div class="stats-row">
    <div class="stat-pill">
        <div class="stat-pill-val" style="color:var(--green)"><?php echo $total_available; ?></div>
        <div class="stat-pill-label">In Stock</div>
    </div>
    <div class="stat-pill">
        <div class="stat-pill-val" style="color:var(--yellow)"><?php echo count($by_year); ?></div>
        <div class="stat-pill-label">Year Groups</div>
    </div>
    <div class="stat-pill">
        <div class="stat-pill-val" style="color:var(--purple2)">₦50+</div>
        <div class="stat-pill-label">From</div>
    </div>
</div>

<div class="search-wrap">
    <i class="fas fa-search search-icon"></i>
    <input type="text" class="search-input" id="accSearch" placeholder="Search accounts...">
</div>

<?php if (empty($by_year)): ?>
<div class="empty-state"><i class="fas fa-inbox"></i>No accounts available right now.</div>
<?php else: ?>
    <?php foreach ($by_year as $year => $accs): ?>
    <div class="year-section" data-year="<?php echo $year; ?>">
        <div class="year-header">
            <i class="fas fa-calendar-alt" style="color:var(--yellow);font-size:13px"></i>
            <span class="year-label"><?php echo $year; ?></span>
            <span class="year-count"><?php echo count($accs); ?> accounts</span>
        </div>
        <div class="acc-list">
            <?php foreach ($accs as $acc):
                $tags = !empty($acc['tags'])
                    ? array_filter(array_map('trim', explode(',', $acc['tags'])))
                    : [];
                // Auto-detect logo from product title
                $titleIconData = getPlatformIcon($acc['title'], $platform_icons);
                $titleIconUrl  = $titleIconData ? getSimpleIconUrl($titleIconData) : null;
                $avatarIconUrl = $titleIconUrl ?: $selected_icon_url;
                $avatarColor   = $selected_cat_color;
                $avatarLetter  = strtoupper(substr($selected_cat_name, 0, 1));
            ?>
            <div class="acc-card acc-item"
                 data-id="<?php echo (int)$acc['id']; ?>"
                 data-title="<?php echo htmlspecialchars($acc['title'], ENT_QUOTES|ENT_HTML5); ?>"
                 data-desc="<?php echo htmlspecialchars($acc['description'] ?? '', ENT_QUOTES|ENT_HTML5); ?>"
                 data-price="<?php echo (float)$acc['price']; ?>"
                 data-tags="<?php echo htmlspecialchars(json_encode(array_values($tags)), ENT_QUOTES|ENT_HTML5); ?>"
                 data-platform="<?php echo htmlspecialchars($selected_cat_name, ENT_QUOTES|ENT_HTML5); ?>"
                 data-color="<?php echo htmlspecialchars($avatarColor, ENT_QUOTES|ENT_HTML5); ?>"
                 data-logo="<?php echo htmlspecialchars($avatarIconUrl ?? '', ENT_QUOTES|ENT_HTML5); ?>"
                 data-icon="<?php echo htmlspecialchars($selected_cat_icon, ENT_QUOTES|ENT_HTML5); ?>"
                 onclick="openSheet(this)">

                <?php if ($avatarIconUrl): ?>
                <div class="acc-avatar">
                    <img src="<?php echo htmlspecialchars($avatarIconUrl); ?>" alt=""
                         onerror="this.parentElement.style.display='none';this.parentElement.nextElementSibling.style.display='flex'">
                </div>
                <div class="acc-avatar-fallback" style="display:none;background:<?php echo htmlspecialchars($avatarColor); ?>"><?php echo $avatarLetter; ?></div>
                <?php else: ?>
                <div class="acc-avatar-fallback" style="background:<?php echo htmlspecialchars($avatarColor); ?>"><?php echo $avatarLetter; ?></div>
                <?php endif; ?>

                <div class="acc-body">
                    <div class="acc-title acc-searchable"><?php echo htmlspecialchars($acc['title']); ?></div>
                    <?php if (!empty($acc['description'])): ?>
                    <div class="acc-desc"><?php echo htmlspecialchars($acc['description']); ?></div>
                    <?php endif; ?>
                    <?php if (!empty($tags)): ?>
                    <div class="acc-tags">
                        <?php foreach (array_slice($tags, 0, 3) as $tag): ?>
                        <span class="acc-tag"><?php echo htmlspecialchars($tag); ?></span>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
                <div class="acc-right">
                    <div class="acc-price">₦<?php echo number_format((float)$acc['price'], 0); ?></div>
                    <button class="acc-buy-btn" onclick="event.stopPropagation();triggerBuy(<?php echo (int)$acc['id']; ?>)">Buy</button>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
<?php endif; ?>
<?php endif; ?>

<!-- ── DETAIL SHEET ── -->
<div class="sheet-overlay" id="sheetOverlay" onclick="closeSheet()"></div>
<div class="sheet" id="sheet">
    <div class="sheet-banner" id="sheetBanner">
        <button class="sheet-back" onclick="closeSheet()"><i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="sheet-body">
        <div class="sheet-category" id="sheetCategory"></div>
        <div class="sheet-title" id="sheetTitle"></div>
        <div class="sheet-price" id="sheetPrice"></div>
        <div class="sheet-features">
            <div class="sheet-feature"><i class="fas fa-bolt"></i> Instant Delivery</div>
            <div class="sheet-feature"><i class="fas fa-shield-alt"></i> Verified Account</div>
            <div class="sheet-feature"><i class="fas fa-key"></i> Immediate Access</div>
            <div class="sheet-feature"><i class="fas fa-box"></i> Digital Product</div>
        </div>
        <div class="sheet-section-label">Description</div>
        <div class="sheet-desc" id="sheetDesc"></div>
        <div class="sheet-tags" id="sheetTags"></div>
        <button class="sheet-buy-btn" id="sheetBuyBtn" onclick="doBuy()">
            <i class="fas fa-shopping-bag"></i> <span id="sheetBuyLabel">Buy Now</span>
        </button>
    </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.className = 'toast'; }, 3500);
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.folder-card').forEach(c => {
            c.style.display = (!q || (c.dataset.name||'').includes(q)) ? '' : 'none';
        });
    });
}
const accSearch = document.getElementById('accSearch');
if (accSearch) {
    accSearch.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.acc-item').forEach(c => {
            const t = c.querySelector('.acc-searchable')?.textContent.toLowerCase() || '';
            c.style.display = (!q || t.includes(q)) ? '' : 'none';
        });
        document.querySelectorAll('.year-section').forEach(s => {
            s.style.display = [...s.querySelectorAll('.acc-item')].some(c => c.style.display !== 'none') ? '' : 'none';
        });
    });
}

let currentId = null;

function openSheet(el) {
    currentId = el.dataset.id;
    const logo  = el.dataset.logo;
    const color = el.dataset.color || '#6A00DF';
    const icon  = el.dataset.icon  || 'fas fa-store';

    const banner = document.getElementById('sheetBanner');
    banner.style.background = `linear-gradient(135deg, ${color}55, ${color}22)`;
    [...banner.children].forEach(c => { if (!c.classList.contains('sheet-back')) c.remove(); });

    if (logo) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'background:#fff;border-radius:24px;padding:14px;display:flex;align-items:center;justify-content:center;';
        const img = document.createElement('img');
        img.src = logo;
        img.style.cssText = 'width:80px;height:80px;object-fit:contain;';
        img.onerror = () => { wrap.remove(); addFallback(banner, color, el.dataset.platform); };
        wrap.appendChild(img);
        banner.appendChild(wrap);
    } else {
        addFallback(banner, color, el.dataset.platform);
    }

    document.getElementById('sheetCategory').textContent = el.dataset.platform || '';
    document.getElementById('sheetTitle').textContent    = el.dataset.title    || '';
    document.getElementById('sheetPrice').textContent    = '₦' + Number(el.dataset.price).toLocaleString();
    document.getElementById('sheetDesc').textContent     = el.dataset.desc     || 'No description available.';

    const tagsEl = document.getElementById('sheetTags');
    tagsEl.innerHTML = '';
    try {
        JSON.parse(el.dataset.tags || '[]').forEach(tag => {
            const s = document.createElement('span');
            s.className = 'sheet-tag'; s.textContent = tag;
            tagsEl.appendChild(s);
        });
    } catch(e) {}

    const btn = document.getElementById('sheetBuyBtn');
    btn.disabled = false;
    document.getElementById('sheetBuyLabel').textContent = 'Buy Now — ₦' + Number(el.dataset.price).toLocaleString();

    document.getElementById('sheetOverlay').classList.add('open');
    document.getElementById('sheet').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function addFallback(banner, color, name) {
    const div = document.createElement('div');
    div.className = 'sheet-banner-fallback';
    div.style.background = color;
    div.textContent = (name || '?').charAt(0).toUpperCase();
    banner.appendChild(div);
}

function closeSheet() {
    document.getElementById('sheetOverlay').classList.remove('open');
    document.getElementById('sheet').classList.remove('open');
    document.body.style.overflow = '';
}

function triggerBuy(id) { currentId = id; doBuy(); }

function doBuy() {
    const token = localStorage.getItem('pointly_token');
    if (!token) { window.location.href = '/demo/login'; return; }

    const btn   = document.getElementById('sheetBuyBtn');
    const label = document.getElementById('sheetBuyLabel');
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Processing…';

    fetch('https://pointly.com.ng/api/buy_products.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ type: 'social', id: currentId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast('Purchase successful! Redirecting…', 'success');
            closeSheet();
            setTimeout(() => { window.location.href = '/demo/orders'; }, 1400);
        } else {
            showToast(data.message || 'Purchase failed. Please try again.', 'error');
            if (btn) btn.disabled = false;
            if (label) label.textContent = 'Buy Now';
        }
    })
    .catch(() => {
        showToast('Network error. Please try again.', 'error');
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Buy Now';
    });
}
</script>
</body>
</html>

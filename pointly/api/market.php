<?php
/**
 * market.php - Unified API for the Marketplace Frontend
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'config.php';

// ── Platform icon map (Simple Icons CDN) ─────────────────────────────────────
// Always generated from platform/title name — never from DB image field
// so cron jobs resetting the image column cannot break logos.
// URL format: https://cdn.simpleicons.org/{slug}/{hex}
$PLATFORM_ICONS = [
    'facebook'   => ['slug' => 'facebook',          'color' => '1877F2'],
    'instagram'  => ['slug' => 'instagram',          'color' => 'E4405F'],
    'twitter'    => ['slug' => 'x',                  'color' => '000000'],
    'tiktok'     => ['slug' => 'tiktok',             'color' => '000000'],
    'youtube'    => ['slug' => 'youtube',            'color' => 'FF0000'],
    'telegram'   => ['slug' => 'telegram',           'color' => '26A5E4'],
    'discord'    => ['slug' => 'discord',            'color' => '5865F2'],
    'spotify'    => ['slug' => 'spotify',            'color' => '1DB954'],
    'linkedin'   => ['slug' => 'linkedin',           'color' => '0A66C2'],
    'reddit'     => ['slug' => 'reddit',             'color' => 'FF4500'],
    'gmail'      => ['slug' => 'gmail',              'color' => 'EA4335'],
    'hotmail'    => ['slug' => 'microsoftoutlook',   'color' => '0078D4'],
    'outlook'    => ['slug' => 'microsoftoutlook',   'color' => '0078D4'],
    'netflix'    => ['slug' => 'netflix',            'color' => 'E50914'],
    'whatsapp'   => ['slug' => 'whatsapp',           'color' => '25D366'],
    'snapchat'   => ['slug' => 'snapchat',           'color' => 'FFFC00'],
    'pinterest'  => ['slug' => 'pinterest',          'color' => 'BD081C'],
    'twitch'     => ['slug' => 'twitch',             'color' => '9146FF'],
    'apple'      => ['slug' => 'apple',              'color' => '000000'],
    'icloud'     => ['slug' => 'icloud',             'color' => '3693F3'],
    'amazon'     => ['slug' => 'amazon',             'color' => 'FF9900'],
    'github'     => ['slug' => 'github',             'color' => '181717'],
    'chatgpt'    => ['slug' => 'openai',             'color' => '412991'],
    'openai'     => ['slug' => 'openai',             'color' => '412991'],
    'microsoft'  => ['slug' => 'microsoft',          'color' => '5E5E5E'],
    'google'     => ['slug' => 'google',             'color' => '4285F4'],
    'yahoo'      => ['slug' => 'yahoo',              'color' => '6001D2'],
    'proton'     => ['slug' => 'protonmail',         'color' => '6D4AFF'],
    'bluesky'    => ['slug' => 'bluesky',            'color' => '0085FF'],
    'threads'    => ['slug' => 'threads',            'color' => '000000'],
    'mastodon'   => ['slug' => 'mastodon',           'color' => '6364FF'],
    'leonardo'   => ['slug' => 'openai',             'color' => '7C3AED'],
    'midjourney' => ['slug' => 'midjourney',         'color' => '000000'],
];

/**
 * Look up icon data by matching any keyword in the text.
 * Checks title first, then falls back to platform/category name.
 */
function resolvePlatformIcon(string $title, string $platformName, array $map): ?array {
    $sources = [strtolower($title), strtolower($platformName)];
    foreach ($sources as $text) {
        foreach ($map as $keyword => $data) {
            if (str_contains($text, $keyword)) return $data;
        }
    }
    return null;
}

function buildIconUrl(array $icon): string {
    return 'https://cdn.simpleicons.org/' . $icon['slug'] . '/' . $icon['color'];
}

try {
    $marketData = [
        "products"        => [],
        "social_accounts" => [],
        "categories"      => []
    ];

    // ── 1. GENERAL PRODUCTS ───────────────────────────────────────────
    $productQuery = "
        SELECT
            p.*,
            (SELECT COUNT(*)
             FROM product_stock ps
             WHERE ps.product_id = p.id AND ps.is_sold = 0) AS available_stock
        FROM products p
        WHERE p.is_active = 1
        HAVING available_stock > 0
        ORDER BY p.is_boosted DESC, p.created_at DESC
    ";
    $pResult = $conn->query($productQuery);
    if ($pResult) {
        while ($row = $pResult->fetch_assoc()) {
            $row['price']           = (float) $row['price'];
            $row['available_stock'] = (int)   $row['available_stock'];
            $row['is_boosted']      = (bool)  $row['is_boosted'];
            $row['is_active']       = (bool)  $row['is_active'];

            // Auto-generate logo from product name — cron-job-proof
            $iconData = resolvePlatformIcon($row['name'] ?? '', $row['category'] ?? '', $PLATFORM_ICONS);
            $row['logo_url'] = $iconData ? buildIconUrl($iconData) : null;

            $marketData['products'][] = $row;
        }
    }

    // ── 2. SOCIAL / DIGITAL ACCOUNTS ─────────────────────────────────
    // Always show 1 Facebook account — if none available fall back to
    // the most recent available account from any platform.
    $socialQuery = "
        SELECT
            sa.id,
            sa.title,
            sa.description,
            sa.price,
            sa.status,
            sa.tags,
            sa.image,
            sa.created_at,
            sc.id    AS category_id,
            sc.name  AS platform_name,
            sc.icon  AS platform_icon,
            sc.color AS platform_color
        FROM social_accounts sa
        LEFT JOIN social_categories sc ON sa.category_id = sc.id
        WHERE sa.status = 'available'
          AND LOWER(sc.name) LIKE '%facebook%'
        ORDER BY sa.created_at DESC
        LIMIT 1
    ";
    $sResult = $conn->query($socialQuery);
    // If no Facebook accounts available, fall back to most recent account
    if (!$sResult || $sResult->num_rows === 0) {
        $socialQuery = "
            SELECT
                sa.id,
                sa.title,
                sa.description,
                sa.price,
                sa.status,
                sa.tags,
                sa.image,
                sa.created_at,
                sc.id    AS category_id,
                sc.name  AS platform_name,
                sc.icon  AS platform_icon,
                sc.color AS platform_color
            FROM social_accounts sa
            LEFT JOIN social_categories sc ON sa.category_id = sc.id
            WHERE sa.status = 'available'
            ORDER BY sa.created_at DESC
            LIMIT 1
        ";
        $sResult = $conn->query($socialQuery);
    }
    if ($sResult) {
        while ($row = $sResult->fetch_assoc()) {
            $row['price']       = (float) $row['price'];
            $row['category_id'] = (int)   $row['category_id'];

            if (!empty($row['tags'])) {
                $row['tags'] = array_values(array_filter(
                    array_map('trim', explode(',', $row['tags']))
                ));
            } else {
                $row['tags'] = [];
            }

            // Auto-generate logo from title + platform name.
            // This is ALWAYS set from the name — never depends on the DB image column
            // so cron jobs that reset/clear the image field cannot break the logo.
            $iconData = resolvePlatformIcon(
                $row['title']         ?? '',
                $row['platform_name'] ?? '',
                $PLATFORM_ICONS
            );
            $row['logo_url'] = $iconData ? buildIconUrl($iconData) : null;
            $row['icon_color'] = $iconData ? '#' . $iconData['color'] : ($row['platform_color'] ?? '#6A00DF');

            // Keep original DB image as fallback (only used if logo_url is null)
            $img = isset($row['image']) ? trim($row['image']) : '';
            if ($img !== '' && $img !== '0' && $img !== 'null') {
                if (!preg_match('/^https?:\/\//', $img)) {
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                    $host     = $_SERVER['HTTP_HOST'];
                    $img      = $protocol . '://' . $host . '/' . ltrim($img, '/');
                }
                $row['image'] = $img;
            } else {
                $row['image'] = null;
            }

            // If no DB image, use the auto-generated logo as the image
            // so existing frontend code that reads `image` also gets the logo
            if (!$row['image'] && $row['logo_url']) {
                $row['image'] = $row['logo_url'];
            }

            $marketData['social_accounts'][] = $row;
        }
    }

    // ── 3. CATEGORIES ─────────────────────────────────────────────────
    $catQuery = "
        SELECT
            sc.*,
            COUNT(sa.id) AS product_count
        FROM social_categories sc
        LEFT JOIN social_accounts sa
            ON sa.category_id = sc.id AND sa.status = 'available'
        GROUP BY sc.id
        HAVING product_count > 0
        ORDER BY sc.name ASC
    ";
    $catResult = $conn->query($catQuery);
    if ($catResult) {
        while ($row = $catResult->fetch_assoc()) {
            $row['product_count'] = (int) $row['product_count'];

            // Auto-generate logo for each category too
            $iconData = resolvePlatformIcon('', $row['name'] ?? '', $PLATFORM_ICONS);
            $row['logo_url'] = $iconData ? buildIconUrl($iconData) : null;

            $marketData['categories'][] = $row;
        }
    }

    // ── 4. SUMMARY COUNTS ─────────────────────────────────────────────
    $marketData['meta'] = [
        'total_products'        => count($marketData['products']),
        'total_social_accounts' => count($marketData['social_accounts']),
        'total_categories'      => count($marketData['categories']),
    ];

    echo json_encode([
        "success" => true,
        "data"    => $marketData
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}

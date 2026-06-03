<?php
// ============================================================
// POINTLY — hstockplus Product Sync
// File: /public_html/api/hstock_sync.php
// ============================================================

declare(strict_types=1);

set_time_limit(600); // 10 minutes — enough for 30 pages with rate-limit delays
ini_set('max_execution_time', '600');

define('HSTOCK_API_URL',  'https://hstockplus.com/api/v2');
define('HSTOCK_API_KEY',  'd1c62fa32aecd46014aba56a0bdc39f5');
define('SYNC_TOKEN',      'pL9mK2xQ7nR4wB8vT3');
define('PRICE_MARKUP',    1.20);
define('NAIRA_RATE',      1600);
define('DEFAULT_ICON',    'fas fa-store');

header('Content-Type: application/json');

$token = $_GET['token'] ?? $_POST['token'] ?? '';
if (!hash_equals(SYNC_TOKEN, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

require_once __DIR__ . '/config.php';

function hstock_call(array $params): array
{
    $params['key'] = HSTOCK_API_KEY;
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => HSTOCK_API_URL,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($params),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/x-www-form-urlencoded',
            'User-Agent: Pointly/1.0',
        ],
    ]);
    $response = curl_exec($ch);
    $error    = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($error)        return ['error' => 'cURL error: ' . $error];
    if ($httpCode !== 200) return ['error' => 'HTTP ' . $httpCode . ': ' . $response];
    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) return ['error' => 'Invalid JSON: ' . $response];
    return $decoded ?? [];
}

function getOrCreateCategory(mysqli $conn, string $categoryName): int
{
    $iconMap = [
        'instagram' => 'fab fa-instagram',
        'facebook'  => 'fab fa-facebook',
        'twitter'   => 'fab fa-twitter',
        'tiktok'    => 'fab fa-tiktok',
        'youtube'   => 'fab fa-youtube',
        'telegram'  => 'fab fa-telegram',
        'whatsapp'  => 'fab fa-whatsapp',
        'snapchat'  => 'fab fa-snapchat',
        'linkedin'  => 'fab fa-linkedin',
        'spotify'   => 'fab fa-spotify',
        'discord'   => 'fab fa-discord',
        'reddit'    => 'fab fa-reddit',
        'pinterest' => 'fab fa-pinterest',
        'twitch'    => 'fab fa-twitch',
        'kick'      => 'fas fa-play-circle',
        'apple'     => 'fab fa-apple',
        'vpn'       => 'fas fa-shield-alt',
        'email'     => 'fas fa-envelope',
        'gmail'     => 'fas fa-envelope',
        'outlook'   => 'fas fa-envelope',
        'hotmail'   => 'fas fa-envelope',
        'sms'       => 'fas fa-sms',
        'accounts'  => 'fas fa-user-circle',
        'gaming'    => 'fas fa-gamepad',
    ];

    $colorMap = [
        'instagram' => '#E1306C',
        'facebook'  => '#1877F2',
        'twitter'   => '#1DA1F2',
        'tiktok'    => '#000000',
        'youtube'   => '#FF0000',
        'telegram'  => '#0088CC',
        'whatsapp'  => '#25D366',
        'snapchat'  => '#FFFC00',
        'linkedin'  => '#0A66C2',
        'spotify'   => '#1DB954',
        'discord'   => '#5865F2',
        'reddit'    => '#FF4500',
        'twitch'    => '#9146FF',
        'kick'      => '#53FC18',
        'apple'     => '#555555',
        'pinterest' => '#E60023',
        'default'   => '#6C757D',
    ];

    $lowerName = strtolower($categoryName);
    $icon  = DEFAULT_ICON;
    $color = $colorMap['default'];
    foreach ($iconMap  as $key => $val) { if (str_contains($lowerName, $key)) { $icon  = $val; break; } }
    foreach ($colorMap as $key => $val) { if ($key === 'default') continue; if (str_contains($lowerName, $key)) { $color = $val; break; } }

    $check = $conn->prepare("SELECT id FROM social_categories WHERE hstock_category = ? LIMIT 1");
    $check->bind_param('s', $categoryName);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();
    $check->close();
    if ($existing) return (int) $existing['id'];

    $checkName = $conn->prepare("SELECT id FROM social_categories WHERE name = ? LIMIT 1");
    $checkName->bind_param('s', $categoryName);
    $checkName->execute();
    $existingName = $checkName->get_result()->fetch_assoc();
    $checkName->close();
    if ($existingName) {
        $upd = $conn->prepare("UPDATE social_categories SET hstock_category = ?, source = 'hstockplus' WHERE id = ?");
        $upd->bind_param('si', $categoryName, $existingName['id']);
        $upd->execute();
        $upd->close();
        return (int) $existingName['id'];
    }

    $ins = $conn->prepare("INSERT INTO social_categories (name, icon, color, source, hstock_category) VALUES (?, ?, ?, 'hstockplus', ?)");
    $ins->bind_param('ssss', $categoryName, $icon, $color, $categoryName);
    $ins->execute();
    $newId = $conn->insert_id;
    $ins->close();
    return (int) $newId;
}

// ── True SMM services to block (bulk engagement, not accounts) ──────────────
function isSmmService(string $categoryName, string $name): bool
{
    $haystack = strtolower($categoryName . ' ' . $name);

    $smmPatterns = [
        'followers', 'likes', 'views', 'subscribers', 'comments',
        'retweets', 'impressions', 'reactions', 'shares', 'plays',
        'streams', 'reposts', 'saves', 'story views', 'reel views',
        'smm', 'growth service', 'boost service',
    ];

    foreach ($smmPatterns as $pattern) {
        // Only match as standalone word/phrase, not substring of "account"
        if (preg_match('/\b' . preg_quote($pattern, '/') . '\b/i', $haystack)) {
            return true;
        }
    }
    return false;
}

$stats = [
    'verified_shops_found' => 0,
    'products_fetched'     => 0,
    'products_inserted'    => 0,
    'products_updated'     => 0,
    'products_skipped'     => 0,
    'categories_created'   => 0,
    'errors'               => [],
];

// ── Step 1: Fetch all products paginated (primary strategy) ──────────────────
$items   = [];
$seenIds = [];
$perPage = 200;

for ($page = 1; $page <= 30; $page++) {
    if ($page > 1) sleep(2); // respect rate limit between pages

    $pageResponse = hstock_call([
        'action'     => 'services',
        'entityType' => 'product',
        'limit'      => $perPage,
        'page'       => $page,
    ]);

    if (isset($pageResponse['error'])) {
        $stats['errors'][] = 'Page ' . $page . ': ' . $pageResponse['error'];
        // On rate limit, wait longer and retry once
        if (stripos($pageResponse['error'], 'rate') !== false || stripos($pageResponse['error'], 'limit') !== false) {
            sleep(5);
            $retry = hstock_call([
                'action'     => 'services',
                'entityType' => 'product',
                'limit'      => $perPage,
                'page'       => $page,
            ]);
            if (isset($retry['error'])) break; // give up on this page
            $pageResponse = $retry;
            array_pop($stats['errors']); // remove the error since retry worked
        } else {
            break;
        }
    }

    $fetched = $pageResponse['services']
            ?? $pageResponse['products']
            ?? $pageResponse['data']
            ?? [];

    if (empty($fetched)) break;

    foreach ($fetched as $p) {
        $pid = (string) ($p['id'] ?? '');
        if ($pid !== '' && !isset($seenIds[$pid])) {
            $seenIds[$pid] = true;
            $items[]       = $p;
        }
    }

    if (count($fetched) < $perPage) break; // last page
    if (count($items) >= 6000)      break; // hard ceiling
}

// ── Step 2: Supplement with verified-shop products ───────────────────────────
$shopsResponse = hstock_call(['action' => 'shops']);
$shops = [];
if (!isset($shopsResponse['error'])) {
    $shops = $shopsResponse['shops'] ?? $shopsResponse ?? [];
}

$verifiedShopIds = [];
foreach ($shops as $shop) {
    $rating   = (float)  ($shop['rating']      ?? $shop['avg_rating']  ?? 0);
    $sales    = (int)    ($shop['total_sales']  ?? $shop['sales']       ?? 0);
    $verified = (bool)   ($shop['verified']     ?? $shop['is_verified'] ?? false);
    $shopId   = (string) ($shop['id']           ?? $shop['shop_id']     ?? '');
    if (!empty($shopId) && ($verified || ($rating >= 4.5 && $sales >= 10))) {
        $verifiedShopIds[] = $shopId;
    }
}
$stats['verified_shops_found'] = count($verifiedShopIds);

foreach ($verifiedShopIds as $shopId) {
    if (count($items) >= 2000) break;

    for ($sp = 1; $sp <= 5; $sp++) {
        sleep(2); // rate limit
        $shopResponse = hstock_call([
            'action'     => 'services',
            'entityType' => 'product',
            'shopId'     => $shopId,
            'limit'      => 100,
            'page'       => $sp,
        ]);
        if (isset($shopResponse['error'])) break;

        $fetched = $shopResponse['services'] ?? $shopResponse['products'] ?? [];
        if (empty($fetched)) break;

        foreach ($fetched as $p) {
            $pid = (string) ($p['id'] ?? '');
            if ($pid !== '' && !isset($seenIds[$pid])) {
                $seenIds[$pid]   = true;
                $p['_shop_id']   = $shopId;
                $items[]         = $p;
            }
        }
        if (count($fetched) < 100)  break;
        if (count($items)   >= 6000) break;
    }
}

$stats['products_fetched'] = count($items);

// ── Step 3: Process each item ────────────────────────────────────────────────
foreach ($items as $item) {
    try {
        $hstock_id     = (string) ($item['id']          ?? '');
        $service_num   = (string) ($item['service']     ?? '');
        $name          = trim((string) ($item['name']   ?? ''));
        $description   = strip_tags((string) ($item['description'] ?? ''));
        $description   = html_entity_decode($description, ENT_QUOTES, 'UTF-8');
        $description   = trim(preg_replace('/\s+/', ' ', $description));
        $category_name = trim((string) ($item['category'] ?? 'General'));
        $image_url     = (string) ($item['imageUrl']  ?? $item['image']     ?? $item['image_url'] ?? $item['img'] ?? '');
        $rate          = (float)  ($item['rate']       ?? 0);

        // Skip only truly invalid items
        if ($hstock_id === '' || $rate <= 0 || $name === '') {
            $stats['products_skipped']++;
            continue;
        }

        // Skip pure SMM bulk-engagement services (not accounts)
        if (isSmmService($category_name, $name)) {
            $stats['products_skipped']++;
            continue;
        }

        $price_per_unit_usd = $rate / 1000;
        $original_price     = round($price_per_unit_usd * NAIRA_RATE, 2);
        $price              = round($original_price * PRICE_MARKUP, 2);
        $original_price     = max(0.01, min(99999.00, $original_price));
        $price              = max(0.01, min(99999.00, $price));

        $category_id = getOrCreateCategory($conn, $category_name);
        $tags        = strtolower($category_name);

        $exists = $conn->prepare("SELECT id FROM social_accounts WHERE hstock_id = ? LIMIT 1");
        $exists->bind_param('s', $hstock_id);
        $exists->execute();
        $existing = $exists->get_result()->fetch_assoc();
        $exists->close();

        if ($existing) {
            $checkPrice = $conn->prepare("SELECT price, original_price FROM social_accounts WHERE hstock_id = ? LIMIT 1");
            $checkPrice->bind_param('s', $hstock_id);
            $checkPrice->execute();
            $priceRow = $checkPrice->get_result()->fetch_assoc();
            $checkPrice->close();

            $currentPrice   = (float) ($priceRow['price']          ?? 0);
            $storedOriginal = (float) ($priceRow['original_price'] ?? 0);
            $expectedPrice  = round($storedOriginal * PRICE_MARKUP, 2);
            $adminModified  = $storedOriginal > 0 && abs($currentPrice - $expectedPrice) > 1.00;

            if ($adminModified) {
                $upd = $conn->prepare("
                    UPDATE social_accounts
                    SET title=?, description=?, original_price=?, category_id=?, image=?, tags=?,
                        hstock_service_num=?, source='hstockplus', status='available'
                    WHERE hstock_id=? AND source='hstockplus'
                ");
                $upd->bind_param('ssdiisss', $name, $description, $original_price, $category_id, $image_url, $tags, $service_num, $hstock_id);
            } else {
                $upd = $conn->prepare("
                    UPDATE social_accounts
                    SET title=?, description=?, price=?, original_price=?, category_id=?, image=?, tags=?,
                        hstock_service_num=?, source='hstockplus', status='available'
                    WHERE hstock_id=? AND source='hstockplus'
                ");
                $upd->bind_param('ssddiisss', $name, $description, $price, $original_price, $category_id, $image_url, $tags, $service_num, $hstock_id);
            }
            $upd->execute();
            $upd->close();
            $stats['products_updated']++;
        } else {
            $ins = $conn->prepare("
                INSERT INTO social_accounts
                    (title, description, price, original_price, category_id, image, tags,
                     status, source, hstock_id, hstock_service_num)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'available', 'hstockplus', ?, ?)
            ");
            $ins->bind_param('ssddissss', $name, $description, $price, $original_price, $category_id, $image_url, $tags, $hstock_id, $service_num);
            $ins->execute();
            $ins->close();
            $stats['products_inserted']++;
        }

    } catch (Throwable $e) {
        $stats['errors'][] = 'Item ' . ($item['id'] ?? '?') . ': ' . $e->getMessage();
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Sync complete.',
    'stats'   => $stats,
], JSON_PRETTY_PRINT);

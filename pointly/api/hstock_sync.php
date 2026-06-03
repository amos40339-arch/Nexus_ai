<?php
// ============================================================
// POINTLY — hstockplus Product Sync (category-by-category)
// File: /public_html/api/hstock_sync.php
// ============================================================

declare(strict_types=1);

set_time_limit(1800);
ini_set('max_execution_time', '1800');

define('HSTOCK_API_URL',  'https://hstockplus.com/api/v2');
define('HSTOCK_API_KEY',  'd1c62fa32aecd46014aba56a0bdc39f5');
define('SYNC_TOKEN',      'pL9mK2xQ7nR4wB8vT3');
define('PRICE_MARKUP',    1.20);
define('NAIRA_RATE',      1600);
define('DEFAULT_ICON',    'fas fa-store');
define('PER_PAGE',        200);
define('MAX_PAGES_PER_CAT', 50); // up to 10 000 per category

header('Content-Type: application/json');

$token = $_GET['token'] ?? $_POST['token'] ?? '';
if (!hash_equals(SYNC_TOKEN, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

require_once __DIR__ . '/config.php';

// ── Single-category mode: ?token=...&category=Gmail ──────────────────────────
// Use this to sync one category at a time and avoid timeouts on shared hosting.
// Run each category separately, e.g. via cron or manually.
$singleCategory = trim($_GET['category'] ?? $_POST['category'] ?? '');

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    if ($error)             return ['error' => 'cURL error: ' . $error];
    if ($httpCode !== 200)  return ['error' => 'HTTP ' . $httpCode . ': ' . $response];
    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) return ['error' => 'Invalid JSON: ' . $response];
    return $decoded ?? [];
}

/**
 * Fetch all products for one category, paginating until exhausted.
 */
function fetchCategory(string $categoryName): array
{
    $items   = [];
    $seenIds = [];

    for ($page = 1; $page <= MAX_PAGES_PER_CAT; $page++) {
        if ($page > 1) sleep(2);

        $res = hstock_call([
            'action'     => 'services',
            'entityType' => 'product',
            'category'   => $categoryName,
            'limit'      => PER_PAGE,
            'page'       => $page,
        ]);

        // Rate-limit retry
        if (isset($res['error'])) {
            if (stripos($res['error'], 'rate') !== false || stripos($res['error'], 'limit') !== false) {
                sleep(8);
                $res = hstock_call([
                    'action'     => 'services',
                    'entityType' => 'product',
                    'category'   => $categoryName,
                    'limit'      => PER_PAGE,
                    'page'       => $page,
                ]);
            }
            if (isset($res['error'])) break;
        }

        $fetched = $res['services'] ?? $res['products'] ?? $res['data'] ?? [];
        if (empty($fetched)) break;

        foreach ($fetched as $p) {
            $pid = (string) ($p['id'] ?? '');
            if ($pid !== '' && !isset($seenIds[$pid])) {
                $seenIds[$pid] = true;
                $items[]       = $p;
            }
        }

        if (count($fetched) < PER_PAGE) break; // last page for this category
    }

    return $items;
}

function getOrCreateCategory(mysqli $conn, string $categoryName): int
{
    static $cache = [];
    if (isset($cache[$categoryName])) return $cache[$categoryName];

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
        'threads'   => 'fab fa-instagram',
        'vkontakte' => 'fab fa-vk',
        'vk'        => 'fab fa-vk',
        'dating'    => 'fas fa-heart',
        'netflix'   => 'fas fa-film',
        'amazon'    => 'fab fa-amazon',
        'microsoft' => 'fab fa-microsoft',
        'github'    => 'fab fa-github',
        'paypal'    => 'fab fa-paypal',
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
        'threads'   => '#000000',
        'vkontakte' => '#4680C2',
        'vk'        => '#4680C2',
        'dating'    => '#FF6B6B',
        'netflix'   => '#E50914',
        'amazon'    => '#FF9900',
        'microsoft' => '#00A4EF',
        'github'    => '#24292E',
        'paypal'    => '#003087',
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
    if ($existing) { $cache[$categoryName] = (int)$existing['id']; return $cache[$categoryName]; }

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
        $cache[$categoryName] = (int)$existingName['id'];
        return $cache[$categoryName];
    }

    $ins = $conn->prepare("INSERT INTO social_categories (name, icon, color, source, hstock_category) VALUES (?, ?, ?, 'hstockplus', ?)");
    $ins->bind_param('ssss', $categoryName, $icon, $color, $categoryName);
    $ins->execute();
    $newId = $conn->insert_id;
    $ins->close();
    $cache[$categoryName] = (int)$newId;
    return $cache[$categoryName];
}

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
        if (preg_match('/\b' . preg_quote($pattern, '/') . '\b/i', $haystack)) return true;
    }
    return false;
}

function processItem(mysqli $conn, array $item, array &$stats): void
{
    $hstock_id     = (string) ($item['id']          ?? '');
    $service_num   = (string) ($item['service']     ?? '');
    $name          = trim((string) ($item['name']   ?? ''));
    $description   = strip_tags((string) ($item['description'] ?? ''));
    $description   = html_entity_decode($description, ENT_QUOTES, 'UTF-8');
    $description   = trim(preg_replace('/\s+/', ' ', $description));
    $category_name = trim((string) ($item['category'] ?? 'General'));
    $image_url     = (string) ($item['imageUrl'] ?? $item['image'] ?? $item['image_url'] ?? $item['img'] ?? '');
    $rate          = (float)  ($item['rate'] ?? 0);

    if ($hstock_id === '' || $rate <= 0 || $name === '') {
        $stats['products_skipped']++;
        return;
    }
    if (isSmmService($category_name, $name)) {
        $stats['products_skipped']++;
        return;
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
}

// ── Main ──────────────────────────────────────────────────────────────────────

$stats = [
    'categories_found'  => 0,
    'products_fetched'  => 0,
    'products_inserted' => 0,
    'products_updated'  => 0,
    'products_skipped'  => 0,
    'per_category'      => [],
    'errors'            => [],
];

// ── Single-category shortcut ─────────────────────────────────────────────────
// Usage: ?token=...&category=Gmail
if ($singleCategory !== '') {
    $globalSeen = [];
    $catItems   = fetchCategory($singleCategory);
    foreach ($catItems as $p) {
        $pid = (string) ($p['id'] ?? '');
        if ($pid === '' || isset($globalSeen[$pid])) continue;
        $globalSeen[$pid] = true;
        $stats['products_fetched']++;
        try { processItem($conn, $p, $stats); } catch (Throwable $e) { $stats['errors'][] = $e->getMessage(); }
    }
    $stats['per_category'][$singleCategory] = $stats['products_fetched'];
    echo json_encode(['success' => true, 'message' => 'Single-category sync complete: ' . $singleCategory, 'stats' => $stats], JSON_PRETTY_PRINT);
    exit;
}

// ── List-categories mode: ?token=...&list_categories=1 ───────────────────────
// Returns parsed subcategory list — what will actually be synced
if (!empty($_GET['list_categories'])) {
    $catResponse = hstock_call(['action' => 'categories', 'entityType' => 'product']);
    $parsed = []; $blocked = [];
    $rawCats = $catResponse['categories'] ?? $catResponse['data'] ?? $catResponse ?? [];
    foreach ($rawCats as $group) {
        if (!is_array($group)) continue;
        $parentName = (string) ($group['category'] ?? $group['name'] ?? '');
        if ($parentName === '') continue;
        if (isBlockedParentCat($parentName)) { $blocked[] = $parentName; continue; }
        $parsed[] = $parentName;
    }
    echo json_encode([
        'success'            => true,
        'total_to_sync'      => count(array_unique($parsed)),
        'categories_to_sync' => array_values(array_unique($parsed)),
        'blocked_parents'    => $blocked,
        'raw_response'       => $catResponse,
    ], JSON_PRETTY_PRINT);
    exit;
}

// ── Parent categories to skip entirely (SMM / ad tools, not accounts) ────────
$BLOCKED_PARENT_CATS = [
    'ad & marketing',
    'smm',
    'followers',
    'likes',
    'views',
    'boost',
    'growth',
    'promotion',
    'traffic',
];

function isBlockedParentCat(string $catName): bool {
    global $BLOCKED_PARENT_CATS;
    $lower = strtolower($catName);
    foreach ($BLOCKED_PARENT_CATS as $blocked) {
        if (str_contains($lower, $blocked)) return true;
    }
    return false;
}

// ── Step 1: Fetch all available categories from hstock ───────────────────────
// hstock returns: {"categories":[{"category":"Accounts","subcategories":["Instagram","Facebook",...]},...]}}
// We need to extract the SUBCATEGORY names — those are what we pass as &category= when fetching products.
$catResponse      = hstock_call(['action' => 'categories', 'entityType' => 'product']);
$hstockCategories = [];

if (!isset($catResponse['error'])) {
    $rawCats = $catResponse['categories'] ?? $catResponse['data'] ?? $catResponse ?? [];
    foreach ($rawCats as $group) {
        if (!is_array($group)) continue;

        $parentName = (string) ($group['category'] ?? $group['name'] ?? '');
        if ($parentName === '') continue;

        // Skip entire SMM / ad-tool parent categories
        if (isBlockedParentCat($parentName)) continue;

        // Add parent category name
        $hstockCategories[] = $parentName;

        // Also add each subcategory name — they often return additional products
        $subs = $group['subcategories'] ?? $group['sub_categories'] ?? [];
        if (!empty($subs) && is_array($subs)) {
            foreach ($subs as $sub) {
                $subName = is_string($sub) ? $sub : (string)($sub['name'] ?? $sub['category'] ?? '');
                if ($subName !== '') $hstockCategories[] = $subName;
            }
        }
    }
    $hstockCategories = array_values(array_unique($hstockCategories));
}

// ── Fallback: discover categories via general paginated fetch ────────────────
if (empty($hstockCategories)) {
    $stats['errors'][] = 'categories endpoint empty — discovering via general listing';

    $discoveredCats = [];
    $globalSeen     = [];

    for ($page = 1; $page <= 30; $page++) {
        if ($page > 1) sleep(2);
        $res = hstock_call(['action' => 'services', 'entityType' => 'product', 'limit' => PER_PAGE, 'page' => $page]);
        if (isset($res['error'])) { $stats['errors'][] = 'General page ' . $page . ': ' . $res['error']; break; }
        $fetched = $res['services'] ?? $res['products'] ?? $res['data'] ?? [];
        if (empty($fetched)) break;
        foreach ($fetched as $p) {
            $pid = (string) ($p['id'] ?? '');
            $cat = trim((string) ($p['category'] ?? ''));
            if ($pid !== '' && !isset($globalSeen[$pid])) {
                $globalSeen[$pid] = true;
                if ($cat !== '') $discoveredCats[$cat] = true;
                $stats['products_fetched']++;
                try { processItem($conn, $p, $stats); } catch (Throwable $e) { $stats['errors'][] = $e->getMessage(); }
            }
        }
        if (count($fetched) < PER_PAGE) break;
    }

    // Drain each discovered category for remaining products
    foreach (array_keys($discoveredCats) as $catName) {
        sleep(1);
        $catItems = fetchCategory($catName);
        $catNew   = 0;
        foreach ($catItems as $p) {
            $pid = (string) ($p['id'] ?? '');
            if ($pid !== '' && !isset($globalSeen[$pid])) {
                $globalSeen[$pid] = true;
                $stats['products_fetched']++;
                $catNew++;
                try { processItem($conn, $p, $stats); } catch (Throwable $e) { $stats['errors'][] = $e->getMessage(); }
            }
        }
        $stats['per_category'][$catName] = $catNew;
    }

    $stats['categories_found'] = count($discoveredCats);
    echo json_encode(['success' => true, 'message' => 'Sync complete (fallback mode).', 'stats' => $stats], JSON_PRETTY_PRINT);
    exit;
}

// ── Step 2: Batch mode — sync N categories per run ───────────────────────────
// Usage: ?token=...&batch=50&offset=0   → categories 0-49
//        ?token=...&batch=50&offset=50  → categories 50-99
//        ?token=...                     → all (may timeout if >3000 categories)
$batchSize  = max(1, (int) ($_GET['batch']  ?? 0));
$offset     = max(0, (int) ($_GET['offset'] ?? 0));

$stats['categories_found'] = count($hstockCategories);
$stats['batch_total']      = count($hstockCategories);
$stats['batch_offset']     = $offset;
$stats['batch_size']       = $batchSize ?: count($hstockCategories);

// Slice the category list for this batch
$categoriesToProcess = $batchSize > 0
    ? array_slice($hstockCategories, $offset, $batchSize)
    : $hstockCategories;

$nextOffset = $offset + count($categoriesToProcess);
$stats['next_offset'] = $nextOffset < count($hstockCategories) ? $nextOffset : null;
$stats['next_url']    = $stats['next_offset'] !== null
    ? '?token=' . SYNC_TOKEN . '&batch=' . ($batchSize ?: 50) . '&offset=' . $stats['next_offset']
    : null;

$globalSeen = [];

foreach ($categoriesToProcess as $catName) {
    sleep(1);
    $catItems = fetchCategory($catName);
    $catNew   = 0;

    foreach ($catItems as $p) {
        $pid = (string) ($p['id'] ?? '');
        if ($pid === '' || isset($globalSeen[$pid])) continue;
        $globalSeen[$pid] = true;
        $stats['products_fetched']++;
        $catNew++;
        try {
            processItem($conn, $p, $stats);
        } catch (Throwable $e) {
            $stats['errors'][] = 'Cat=' . $catName . ' id=' . ($p['id'] ?? '?') . ': ' . $e->getMessage();
        }
    }

    $stats['per_category'][$catName] = $catNew;
}

echo json_encode([
    'success' => true,
    'message' => 'Sync complete.',
    'stats'   => $stats,
], JSON_PRETTY_PRINT);

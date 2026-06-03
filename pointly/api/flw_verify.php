<?php
// ============================================================
// ClassicSwift — Flutterwave Payment Verification Proxy
// File: /public_html/api/flw_verify.php
// Called by ClassicSwift admin panel to verify FLW payments
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

define('FLW_SECRET_KEY', 'FLWSECK-5aa71e30fe9004ceba5249b9e8f44deb-19e8c589d31vt-X');
define('PROXY_TOKEN',    'pL9mK2xQ7nR4wB8vT3');

$token = $_GET['token'] ?? $_POST['token'] ?? '';
if (!hash_equals(PROXY_TOKEN, $token)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$transactionId = trim($_GET['transaction_id'] ?? $_POST['transaction_id'] ?? '');
$txRef         = trim($_GET['tx_ref']         ?? $_POST['tx_ref']         ?? '');

if ($transactionId === '' && $txRef === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'transaction_id or tx_ref is required']);
    exit;
}

// If tx_ref provided, search by reference first to get the transaction ID
if ($transactionId === '' && $txRef !== '') {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => 'https://api.flutterwave.com/v3/transactions?tx_ref=' . urlencode($txRef),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . FLW_SECRET_KEY,
            'Content-Type: application/json',
        ],
    ]);
    $res  = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) { http_response_code(500); echo json_encode(['status'=>'error','message'=>'cURL error: '.$err]); exit; }

    $decoded = json_decode($res, true);
    $txData  = $decoded['data'][0] ?? null;
    if (!$txData) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'No transaction found for reference: ' . $txRef]);
        exit;
    }
    $transactionId = (string) $txData['id'];
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => 'https://api.flutterwave.com/v3/transactions/' . urlencode($transactionId) . '/verify',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . FLW_SECRET_KEY,
        'Content-Type: application/json',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'cURL error: ' . $error]);
    exit;
}

http_response_code($httpCode);
echo $response;

<?php
// VTU Proxy — forwards requests to Pointly VTU API
// Allows classicswift-admin.onrender.com to fetch networks/data-plans
// Upload to: /public_html/api/vtu_proxy.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

define('POINTLY_API_BASE', 'https://www.pointly.com.ng/api/v2');
define('POINTLY_API_KEY',  '24c5fdb22b9a94a3f50c95dd4fa59c28a8ed79384ec78b7df933e192ee1b767e');

$action = $_GET['action'] ?? '';

if ($action === 'networks') {
    $url = POINTLY_API_BASE . '/vtu/networks';
} elseif ($action === 'data-plans') {
    $network_id = intval($_GET['network_id'] ?? 0);
    if (!$network_id) { echo json_encode(['success'=>false,'message'=>'network_id required']); exit; }
    $url = POINTLY_API_BASE . '/vtu/data-plans?network_id=' . $network_id . '&limit=200';
} else {
    echo json_encode(['success'=>false,'message'=>'Invalid action']); exit;
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => ['X-API-Key: ' . POINTLY_API_KEY],
    CURLOPT_SSL_VERIFYPEER => true,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success'=>false,'message'=>'Failed to reach Pointly API']);
} else {
    http_response_code($httpCode);
    echo $response;
}

<?php
// ---- login.php ----
// POST { "password": "..." }  -> 200 OK if correct, sets PHP session

require_once __DIR__ . '/config.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (in_array('*', $CORS_ORIGINS, true) || in_array($origin, $CORS_ORIGINS, true))) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = [];

$pass = $data['password'] ?? '';
if (!is_string($pass)) $pass = '';

if (hash_equals($ADMIN_PASSWORD, $pass)) {
  $_SESSION['authed'] = true;
  echo json_encode(['ok' => true]);
} else {
  http_response_code(401);
  echo json_encode(['error' => 'Invalid password']);
}

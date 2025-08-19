<?php
// ---- upload.php ----
// POST multipart/form-data with "file" field
// Optional header: x-admin-pass: <password>  (used if session not present)

require_once __DIR__ . '/config.php';
session_start();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (in_array('*', $CORS_ORIGINS, true) || in_array($origin, $CORS_ORIGINS, true))) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Pass');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

// Auth: either existing session OR correct x-admin-pass header
$headerPass = '';
foreach ($_SERVER as $key => $value) {
  if (strtoupper($key) === 'HTTP_X_ADMIN_PASS') {
    $headerPass = $value;
    break;
  }
}

$authed = !empty($_SESSION['authed']) || (is_string($headerPass) && $headerPass !== '' && hash_equals($ADMIN_PASSWORD, $headerPass));
if (!$authed) {
  http_response_code(401);
  echo json_encode(['error' => 'Unauthorized']);
  exit;
}

// Validate file
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['error' => 'No file or upload error']);
  exit;
}

$f = $_FILES['file'];
$allowed = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
  'image/gif'  => 'gif',
];

$mime = mime_content_type($f['tmp_name']);
$ext  = $allowed[$mime] ?? null;
if (!$ext) {
  http_response_code(400);
  echo json_encode(['error' => 'Unsupported file type']);
  exit;
}

$filename = uniqid('img_', true) . '.' . $ext;
$path = rtrim($UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($f['tmp_name'], $path)) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to move upload']);
  exit;
}

// Lock down permissions a bit
@chmod($path, 0644);

// Build public URL
$url = rtrim($UPLOAD_BASE_URL, '/') . '/' . rawurlencode($filename);
echo json_encode(['url' => $url]);

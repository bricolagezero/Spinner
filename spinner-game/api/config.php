<?php
// PRODUCTION config (for GoDaddy under /public_html/spinner/api)
$ADMIN_PASS = '+p0ZHMN@s^(B';
$BASE_DIR   = dirname(__DIR__);               // -> /public_html/spinner
$DATA_DIR   = $BASE_DIR . '/data/games';      // JSON storage
$UPLOAD_DIR = $BASE_DIR . '/uploads';         // image uploads

if (!is_dir($DATA_DIR))   @mkdir($DATA_DIR, 0755, true);
if (!is_dir($UPLOAD_DIR)) @mkdir($UPLOAD_DIR, 0755, true);

function cors() {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: Content-Type, X-Admin-Pass');
  header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
  if ($_SERVER['REQUEST_METHOD']==='OPTIONS') { http_response_code(200); exit; }
}
cors();
header('Content-Type: application/json');

function require_admin($ADMIN_PASS) {
  $pass = $_SERVER['HTTP_X_ADMIN_PASS'] ?? '';
  if ($pass !== $ADMIN_PASS) { http_response_code(403); echo json_encode(['error'=>'Forbidden']); exit; }
}

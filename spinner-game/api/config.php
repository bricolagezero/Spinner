<?php
// ---- config.php ----

// GLOBAL ADMIN PASSWORD - CHANGE THIS!
$ADMIN_PASSWORD = 'CH1Spinner2024!';  // TODO: Change this to a secure password

// Directories
$DATA_DIR   = __DIR__ . '/data';
$UPLOAD_DIR = __DIR__ . '/uploads';
$CORS_ORIGINS = ['https://digital.ch1-consulting.com', '*']; // tighten later
$UPLOAD_BASE_URL = '/spinner/api/uploads';

// Ensure dirs exist
if (!is_dir($DATA_DIR))   { @mkdir($DATA_DIR, 0755, true); }
if (!is_dir($UPLOAD_DIR)) { @mkdir($UPLOAD_DIR, 0755, true); }

// Sessions: give PHP a writable place for session files
$SESSION_DIR = __DIR__ . '/.sessions';
if (!is_dir($SESSION_DIR)) { @mkdir($SESSION_DIR, 0755, true); }
ini_set('session.save_path', $SESSION_DIR);

// Error handling: log to file, never break JSON output
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

// Helper to set CORS consistently
function set_cors_headers() {
  global $CORS_ORIGINS;
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin && (in_array('*', $CORS_ORIGINS, true) || in_array($origin, $CORS_ORIGINS, true))) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
  }
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type, X-Admin-Pass');
  header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
}

// Helpers
function json_ok($data)   { http_response_code(200); header('Content-Type: application/json'); echo json_encode($data); exit; }
function json_err($code, $msg, $ex=null) {
  http_response_code($code);
  header('Content-Type: application/json');
  $out = ['error'=>$msg];
  if ($ex) { $out['message']=$ex->getMessage(); $out['file']=$ex->getFile(); $out['line']=$ex->getLine(); }
  echo json_encode($out); exit;
}

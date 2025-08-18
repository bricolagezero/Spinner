<?php
// ---- games.php ----
// Router via query string: ?path=<segments>
// Supported:
//   GET    /games                    -> list all
//   GET    /games/{slug}             -> get one
//   POST   /games                    -> create (body: { settings })
//   PUT    /games/{slug}             -> update (body: { settings })
//   POST   /games/{slug}/duplicate   -> duplicate entry

require_once __DIR__ . '/config.php';
session_start();

function send_json($status, $payload) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload);
  exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (in_array('*', $CORS_ORIGINS, true) || in_array($origin, $CORS_ORIGINS, true))) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Pass');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// Helpers
function slugify($s) {
  $s = strtolower(trim($s));
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  $s = trim($s, '-');
  if ($s === '') $s = 'spinner';
  return $s . '-' . substr(uniqid('', true), -6);
}

function game_path($slug) {
  global $DATA_DIR;
  return rtrim($DATA_DIR, '/\\') . DIRECTORY_SEPARATOR . $slug . '.json';
}

function require_admin() {
  global $ADMIN_PASSWORD;
  $headerPass = $_SERVER['HTTP_X_ADMIN_PASS'] ?? '';
  if (!empty($_SESSION['authed'])) return;
  if (is_string($headerPass) && hash_equals($ADMIN_PASSWORD, $headerPass)) return;
  send_json(401, ['error' => 'Unauthorized']);
}

$path = $_GET['path'] ?? '';
$path = trim($path, '/');
$parts = $path === '' ? [] : explode('/', $path);

// Basic routing
$method = $_SERVER['REQUEST_METHOD'];

// GET /games
if ($method === 'GET' && count($parts) === 1 && $parts[0] === 'games') {
  $files = glob(game_path('*'));
  $list = [];
  foreach ($files as $file) {
    $slug = basename($file, '.json');
    $mtime = @filemtime($file);
    $list[] = ['slug' => $slug, 'updated_at' => $mtime ? date('c', $mtime) : null];
  }
  usort($list, function($a,$b){ return strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? ''); });
  send_json(200, ['games' => $list]);
}

// GET /games/{slug}
if ($method === 'GET' && count($parts) === 2 && $parts[0] === 'games') {
  $slug = $parts[1];
  $file = game_path($slug);
  if (!is_file($file)) send_json(404, ['error' => 'Not found']);
  $json = @file_get_contents($file);
  if ($json === false) send_json(500, ['error' => 'Read error']);
  $data = json_decode($json, true);
  if (!is_array($data)) send_json(500, ['error' => 'Corrupt file']);
  send_json(200, $data);
}

// POST /games       -> create
if ($method === 'POST' && count($parts) === 1 && $parts[0] === 'games') {
  require_admin();
  $raw = file_get_contents('php://input');
  $body = json_decode($raw, true);
  if (!is_array($body)) $body = [];
  $settings = $body['settings'] ?? null;
  if (!is_array($settings)) send_json(400, ['error' => 'Missing settings']);

  $title = isset($settings['title']) ? (string)$settings['title'] : 'Spinner';
  $slug = slugify($title);
  $file = game_path($slug);

  $payload = [
    'slug' => $slug,
    'settings' => $settings,
    'updated_at' => date('c'),
  ];
  if (@file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    send_json(500, ['error' => 'Write error']);
  }
  send_json(200, ['slug' => $slug]);
}

// PUT /games/{slug} -> update
if ($method === 'PUT' && count($parts) === 2 && $parts[0] === 'games') {
  require_admin();
  $slug = $parts[1];
  $file = game_path($slug);
  if (!is_file($file)) send_json(404, ['error' => 'Not found']);

  $raw = file_get_contents('php://input');
  $body = json_decode($raw, true);
  if (!is_array($body)) $body = [];
  $settings = $body['settings'] ?? null;
  if (!is_array($settings)) send_json(400, ['error' => 'Missing settings']);

  $payload = [
    'slug' => $slug,
    'settings' => $settings,
    'updated_at' => date('c'),
  ];
  if (@file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    send_json(500, ['error' => 'Write error']);
  }
  send_json(200, ['ok' => true]);
}

// POST /games/{slug}/duplicate
if ($method === 'POST' && count($parts) === 3 && $parts[0] === 'games' && $parts[2] === 'duplicate') {
  require_admin();
  $slug = $parts[1];
  $file = game_path($slug);
  if (!is_file($file)) send_json(404, ['error' => 'Not found'});

  $json = @file_get_contents($file);
  if ($json === false) send_json(500, ['error' => 'Read error']);
  $data = json_decode($json, true);
  if (!is_array($data)) send_json(500, ['error' => 'Corrupt file']);

  // clone with new slug
  $newSlug = slugify(($data['settings']['title'] ?? 'Spinner') . ' Copy');
  $newFile = game_path($newSlug);
  $data['slug'] = $newSlug;
  $data['updated_at'] = date('c');

  if (@file_put_contents($newFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    send_json(500, ['error' => 'Write error']);
  }
  send_json(200, ['slug' => $newSlug]);
}

// Fallback
send_json(404, ['error' => 'Route not found']);

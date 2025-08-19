<?php
require_once __DIR__ . '/config.php';
session_start();
set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

try {
  header('Content-Type: application/json; charset=utf-8');

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
  function authed() {
    global $ADMIN_PASSWORD;
    if (!empty($_SESSION['authed'])) return true;
    
    // Check various header formats (case-insensitive)
    $headerPass = '';
    foreach ($_SERVER as $key => $value) {
      if (strtoupper($key) === 'HTTP_X_ADMIN_PASS') {
        $headerPass = $value;
        break;
      }
    }
    
    return is_string($headerPass) && $headerPass !== '' && hash_equals($ADMIN_PASSWORD, $headerPass);
  }
  function require_admin() {
    if (!authed()) json_err(401, 'Unauthorized');
  }

  $path = $_GET['path'] ?? '';
  $path = trim($path, '/');
  $parts = $path === '' ? [] : explode('/', $path);
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
    usort($list, fn($a,$b) => strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? ''));
    json_ok(['games' => $list]);
  }

  // GET /games/{slug}
  if ($method === 'GET' && count($parts) === 2 && $parts[0] === 'games') {
    $slug = $parts[1];
    $file = game_path($slug);
    if (!is_file($file)) json_err(404, 'Not found');
    $json = @file_get_contents($file);
    if ($json === false) json_err(500, 'Read error');
    $data = json_decode($json, true);
    if (!is_array($data)) json_err(500, 'Corrupt file');
    json_ok($data);
  }

  // POST /games
  if ($method === 'POST' && count($parts) === 1 && $parts[0] === 'games') {
    require_admin();
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
    $settings = $body['settings'] ?? null;
    if (!is_array($settings)) json_err(400, 'Missing settings');

    $title = (string)($settings['title'] ?? 'Spinner');
    $slug  = slugify($title);
    $file  = game_path($slug);

    $payload = ['slug'=>$slug, 'settings'=>$settings, 'updated_at'=>date('c')];
    if (@file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)) === false) {
      json_err(500, 'Write error');
    }
    json_ok(['slug' => $slug]);
  }

  // PUT /games/{slug}
  if ($method === 'PUT' && count($parts) === 2 && $parts[0] === 'games') {
    require_admin();
    $slug = $parts[1];
    $file = game_path($slug);
    if (!is_file($file)) json_err(404, 'Not found');

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
    $settings = $body['settings'] ?? null;
    if (!is_array($settings)) json_err(400, 'Missing settings');

    $payload = ['slug'=>$slug, 'settings'=>$settings, 'updated_at'=>date('c')];
    if (@file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)) === false) {
      json_err(500, 'Write error');
    }
    json_ok(['ok' => true]);
  }

  // POST /games/{slug}/duplicate
  if ($method === 'POST' && count($parts) === 3 && $parts[0] === 'games' && $parts[2] === 'duplicate') {
    require_admin();
    $slug = $parts[1];
    $file = game_path($slug);
    if (!is_file($file)) json_err(404, 'Not found');

    $json = @file_get_contents($file);
    if ($json === false) json_err(500, 'Read error');
    $data = json_decode($json, true);
    if (!is_array($data)) json_err(500, 'Corrupt file');

    $newSlug = slugify(($data['settings']['title'] ?? 'Spinner') . ' Copy');
    $newFile = game_path($newSlug);
    $data['slug'] = $newSlug;
    $data['updated_at'] = date('c');

    if (@file_put_contents($newFile, json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)) === false) {
      json_err(500, 'Write error');
    }
    json_ok(['slug' => $newSlug]);
  }

  json_err(404, 'Route not found');

} catch (Throwable $e) {
  json_err(500, 'Server error', $e);
}

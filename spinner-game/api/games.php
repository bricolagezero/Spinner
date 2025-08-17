<?php
require __DIR__.'/config.php';

$path = $_SERVER['PATH_INFO'] ?? ''; // e.g. /slug or /slug/duplicate
$method = $_SERVER['REQUEST_METHOD'];

function slugify($s) {
  $s = strtolower(preg_replace('/[^a-z0-9-]+/','-', $s));
  $s = trim($s,'-');
  return $s ?: substr(bin2hex(random_bytes(4)),0,8);
}

function game_file($slug) { global $DATA_DIR; return $DATA_DIR.'/'.basename($slug).'.json'; }

if ($method === 'GET' && ($path === '' || $path === '/')) {
  // List (admin only)
  require_admin($GLOBALS['ADMIN_PASS']);
  $out = [];
  foreach (glob($GLOBALS['DATA_DIR'].'/*.json') as $f) {
    $slug = basename($f, '.json');
    $out[] = ['slug'=>$slug, 'updated_at'=>date('c', filemtime($f))];
  }
  echo json_encode(['games'=>$out]); exit;
}

if ($method === 'GET' && $path !== '') {
  // Fetch single (public)
  $slug = trim($path,'/');
  $f = game_file($slug);
  if (!file_exists($f)) { http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
  $json = json_decode(file_get_contents($f), true);
  echo json_encode($json); exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST' && ($path === '' || $path === '/')) {
  // Create
  require_admin($GLOBALS['ADMIN_PASS']);
  $settings = $input['settings'] ?? null;
  if (!$settings) { http_response_code(400); echo json_encode(['error'=>'Missing settings']); exit; }
  $slug = slugify($settings['title'] ?? 'game');
  $f = game_file($slug);
  $i = 2;
  while (file_exists($f) && $i < 1000) { $f = game_file($slug.'-'.$i); $i++; }
  if ($i>2) $slug = $slug.'-'.($i-1);
  file_put_contents($f, json_encode(['settings'=>$settings], JSON_PRETTY_PRINT));
  echo json_encode(['slug'=>$slug]); exit;
}

if ($method === 'PUT' && $path !== '') {
  // Update
  require_admin($GLOBALS['ADMIN_PASS']);
  $slug = trim($path,'/');
  $settings = $input['settings'] ?? null;
  if (!$settings) { http_response_code(400); echo json_encode(['error'=>'Missing settings']); exit; }
  $f = game_file($slug);
  if (!file_exists($f)) { http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
  file_put_contents($f, json_encode(['settings'=>$settings], JSON_PRETTY_PRINT));
  echo json_encode(['ok'=>true]); exit;
}

if ($method === 'POST' && preg_match('#^/(.+)/duplicate$#', $path, $m)) {
  // Duplicate
  require_admin($GLOBALS['ADMIN_PASS']);
  $slug = $m[1];
  $f = game_file($slug);
  if (!file_exists($f)) { http_response_code(404); echo json_encode(['error'=>'Not found']); exit; }
  $data = json_decode(file_get_contents($f), true);
  $base = $slug.'-copy';
  $i=2; $new = $base;
  while (file_exists(game_file($new))) { $new = $base.'-'.$i; $i++; }
  file_put_contents(game_file($new), json_encode($data, JSON_PRETTY_PRINT));
  echo json_encode(['slug'=>$new]); exit;
}

http_response_code(405);
echo json_encode(['error'=>'Method not allowed']);

<?php
require __DIR__.'/config.php';
require_admin($ADMIN_PASS);

if (!isset($_FILES['file'])) { http_response_code(400); echo json_encode(['error'=>'No file']); exit; }

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['error'=>'Upload error']); exit; }

$allowed = ['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp','image/gif'=>'gif'];
$mime = mime_content_type($f['tmp_name']);
if (!isset($allowed[$mime])) { http_response_code(400); echo json_encode(['error'=>'Invalid file type']); exit; }

$ext = $allowed[$mime];
$name = bin2hex(random_bytes(8)).'.'.$ext;
$dest = $UPLOAD_DIR.'/'.$name;
if (!move_uploaded_file($f['tmp_name'], $dest)) { http_response_code(500); echo json_encode(['error'=>'Move failed']); exit; }

$public = dirname(dirname($_SERVER['SCRIPT_NAME'])); // /spinner/api -> /spinner
$url = abs_url($public.'/uploads/'.$name);
echo json_encode(['url'=>$url]);

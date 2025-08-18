<?php
// ---- config.php ----
// Place this file in: public_html/spinner/api/config.php (adjust as needed)

// A single global admin password (set this to your secret):
$ADMIN_PASSWORD = 'REPLACE_ME_WITH_A_STRONG_PASSWORD';

// Where JSON "game" files are stored
$DATA_DIR   = __DIR__ . '/data';

// Where uploaded images are stored
$UPLOAD_DIR = __DIR__ . '/uploads';

// Base URL for uploaded files (adjust if your hosting path differs)
$UPLOAD_BASE_URL = '/spinner/api/uploads';

// CORS for your front-end origin(s)
$CORS_ORIGINS = [
  // e.g. 'https://digital.ch1-consulting.com',
  '*', // dev permissive; lock this down in production
];

// Ensure required directories exist
if (!is_dir($DATA_DIR))   { @mkdir($DATA_DIR, 0755, true); }
if (!is_dir($UPLOAD_DIR)) { @mkdir($UPLOAD_DIR, 0755, true); }

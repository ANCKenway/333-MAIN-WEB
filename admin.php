<?php
// Proxy sécurisé pour l'admin (protège sans dépendre de .htaccess)
header('Referrer-Policy: same-origin');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
@include __DIR__ . '/api/config.php';

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
if(function_exists('session_set_cookie_params')){
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict'
  ]);
}
if(session_status()===PHP_SESSION_NONE){ session_start(); }

if(empty($_SESSION['admin'])){
  header('Location: /admin-login.html');
  exit;
}

// Une fois authentifié, servir admin.html
$admin = __DIR__ . '/admin.html';
if(is_file($admin)){
  header('Content-Type: text/html; charset=utf-8');
  readfile($admin);
  exit;
}
http_response_code(404); echo 'Admin introuvable';

<?php
// Front Gate 2FA pour 333.FM — protège tout le site par session + MDP/TOTP
// Placez ce fichier à la racine et activez la réécriture via .htaccess

header('Referrer-Policy: same-origin');
header('X-Content-Type-Options: nosniff');
header('Permissions-Policy: interest-cohort=()');
header('Cache-Control: no-store');

$DOC = __DIR__;
@include __DIR__ . '/api/config.php';

// Si le verrou global n'est pas activé, laisser passer la requête originale
if(!defined('FRONTGATE_LOCK') || FRONTGATE_LOCK !== true){
  // Servir directement le fichier demandé (fallback)
  $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
  $full = realpath($DOC . $path);
  if(!$full || strpos($full, $DOC) !== 0){ http_response_code(404); echo '404'; exit; }
  if(is_dir($full)){
    if(file_exists($full . '/index.php')){ require $full . '/index.php'; exit; }
    if(file_exists($full . '/index.html')){ header('Content-Type: text/html; charset=utf-8'); readfile($full . '/index.html'); exit; }
  }
  $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
  if($ext === 'php'){ require $full; exit; }
  $mime = mime_content_type($full) ?: 'application/octet-stream';
  header('Content-Type: ' . $mime);
  readfile($full); exit;
}

// Sessions sécurisées (mêmes paramètres que l'API)
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

// Utilitaires auth
function fg_need_password(){ return defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH; }
function fg_need_totp(){ return defined('ADMIN_TOTP_SECRET_HEX') && ADMIN_TOTP_SECRET_HEX; }
function fg_check_password($code){
  $code = trim((string)$code);
  if($code==='') return false;
  if(!fg_need_password()) return true;
  return password_verify($code, ADMIN_PASSWORD_HASH) === true;
}
function fg_check_totp($otp){
  $otp = trim((string)$otp);
  if($otp==='') return false;
  if(!fg_need_totp()) return true;
  $period = defined('ADMIN_TOTP_PERIOD') ? ADMIN_TOTP_PERIOD : 30;
  $digits = defined('ADMIN_TOTP_DIGITS') ? ADMIN_TOTP_DIGITS : 6;
  $secret = @hex2bin(ADMIN_TOTP_SECRET_HEX);
  if(!$secret) return false;
  $ts = time();
  for($i=-1; $i<=1; $i++){
    $t = floor($ts / $period) + $i;
    $binTime = pack('N*', 0) . pack('N*', $t);
    $hmac = hash_hmac('sha1', $binTime, $secret, true);
    $offset = ord(substr($hmac, -1)) & 0x0F;
    $part = substr($hmac, $offset, 4);
    $int = unpack('N', $part)[1] & 0x7fffffff;
    $tok = str_pad((string)($int % pow(10, $digits)), $digits, '0', STR_PAD_LEFT);
    if(hash_equals($tok, $otp)) return true;
  }
  return false;
}

// Limiter par IP si souhaité
if(defined('ADMIN_IPS') && is_array(ADMIN_IPS)){
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  if(!in_array($ip, ADMIN_IPS, true)){
    // Option: afficher un 403 avant même le formulaire
    http_response_code(403);
    echo '<!doctype html><meta charset="utf-8"><title>403</title><body style="background:#0d0d0d;color:#fff;font:14px system-ui"><div style="max-width:520px;margin:20vh auto;padding:1rem;border:1px solid #333;border-radius:12px;background:#111"><h1>Accès interdit</h1><p>Votre adresse IP n\'est pas autorisée.</p></div></body>';
    exit;
  }
}

// Déconnexion
if(isset($_GET['__logout'])){
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
  }
  session_destroy();
  header('Location: /');
  exit;
}

$requested = isset($_GET['fg_path']) ? '/' . ltrim((string)$_GET['fg_path'], '/') : '/';
if($requested === '/'){
  // Laisser Apache/SPA décider de index.* plus tard côté lecture
}

// Authentification
$authed = !empty($_SESSION['admin']);

// Traitement du POST login
if(!$authed && ($_SERVER['REQUEST_METHOD'] === 'POST')){
  // Anti brute-force
  $_SESSION['fg_auth_log'] = $_SESSION['fg_auth_log'] ?? [];
  $now = time();
  $_SESSION['fg_auth_log'] = array_values(array_filter($_SESSION['fg_auth_log'], function($t) use ($now){ return ($now - $t) < 300; })); // 5 min
  if(count($_SESSION['fg_auth_log']) >= 10){
    http_response_code(429);
    $err = 'Trop d\'essais. Réessayez plus tard.';
  } else {
    $_SESSION['fg_auth_log'][] = $now;
    $code = $_POST['code'] ?? '';
    $otp  = $_POST['otp']  ?? '';
    $needPwd = fg_need_password();
    $needOtp = fg_need_totp();
    $okPwd = !$needPwd || fg_check_password($code);
    $okOtp = !$needOtp || fg_check_totp($otp);
    if($okPwd && $okOtp){
      $_SESSION['admin'] = true;
      if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
      header('Location: ' . ($requested ?: '/'));
      exit;
    } else {
      $err = 'Identifiants invalides.';
    }
  }
} else { $err = ''; }

// Si pas authentifié, afficher le formulaire minimaliste (inline, sans assets externes)
if(empty($_SESSION['admin'])){
  $needPwd = fg_need_password();
  $needOtp = fg_need_totp();
  // Si aucune méthode n'est configurée, refuser l'accès
  if(!$needPwd && !$needOtp){
    http_response_code(503);
    echo '<!doctype html><meta charset="utf-8"><title>Sécurité non configurée</title><body style="background:#0d0d0d;color:#fff;font:14px system-ui"><div style="max-width:560px;margin:20vh auto;padding:1rem;border:1px solid #333;border-radius:12px;background:#111"><h1>Configuration requise</h1><p>Définissez ADMIN_PASSWORD_HASH et/ou ADMIN_TOTP_SECRET_HEX dans api/config.php.</p></div></body>';
    exit;
  }
  echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connexion — 333FM</title><style>
    body{margin:0;background:#0d0d0d;color:#fff;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial}
    .wrap{max-width:460px;margin:12vh auto;padding:1rem}
    .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:1rem;box-shadow:0 10px 30px rgba(0,0,0,.4)}
    h1{font-size:1.2rem;margin:0 0 1rem}
    label{display:block;margin:.6rem 0 .2rem}
    input{width:100%;padding:.6rem .7rem;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:#fff}
    .btn{display:inline-flex;justify-content:center;align-items:center;width:100%;margin-top:.8rem;padding:.6rem .9rem;border:0;border-radius:10px;background:#fff;color:#111;font-weight:700;cursor:pointer}
    .muted{color:#c8c8c8}
    .err{color:#ff5e5e}
  </style></head><body><div class="wrap"><h1>Connexion requise</h1><div class="card">
    <p class="muted">Veuillez vous authentifier pour accéder au site.</p>
    <form method="post"><input type="hidden" name="__keep" value="1">';
  if($needPwd){ echo '<label for="code">Mot de passe</label><input id="code" name="code" type="password" placeholder="Mot de passe" required>';} 
  if($needOtp){ echo '<label for="otp">Code OTP</label><input id="otp" name="otp" inputmode="numeric" pattern="[0-9]*" placeholder="123456" ' . ($needOtp?'required':'') . '>';} 
  if(!empty($err)){ echo '<p class="err">'.htmlspecialchars($err, ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</p>'; }
  echo '<button class="btn" type="submit">Se connecter</button>
    <p class="muted" style="margin-top:.6rem"><a href="?__logout=1" style="color:#fff;text-decoration:none;opacity:.7">Déconnexion</a></p>
    </form></div></div></body></html>';
  exit;
}

// Auth OK → desservir la ressource demandée
$path = $requested;
$path = '/' . ltrim($path, '/');
$full = realpath($DOC . $path);
if(!$full || strpos($full, $DOC) !== 0){ http_response_code(404); echo '404'; exit; }
if(is_dir($full)){
  if(file_exists($full . '/index.php')){ require $full . '/index.php'; exit; }
  if(file_exists($full . '/index.html')){ header('Content-Type: text/html; charset=utf-8'); readfile($full . '/index.html'); exit; }
}
$ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
if($ext === 'php'){
  require $full; exit;
}
$mime = mime_content_type($full) ?: 'application/octet-stream';
header('Content-Type: ' . $mime);
readfile($full); exit;

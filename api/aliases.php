<?php
// 333.FM Aliases API (minimal) — à durcir avant prod
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: interest-cohort=()');

// Configuration de base
$DATA_FILE = __DIR__ . '/../data/aliases.json';
@include __DIR__ . '/config.php';

// Sessions sécurisées
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

function read_json($file){
  if(!file_exists($file)) return [];
  $raw = file_get_contents($file);
  $j = json_decode($raw, true);
  return is_array($j)? $j : [];
}
function write_json($file, $data){
  $dir = dirname($file);
  if(!is_dir($dir)) mkdir($dir, 0775, true);
  $tmp = $file . '.tmp';
  $json = json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
  if($json===false) return false;
  $fp = fopen($tmp, 'c+'); if(!$fp) return false;
  // verrou d'écriture
  if(!flock($fp, LOCK_EX)){ fclose($fp); return false; }
  ftruncate($fp, 0); fwrite($fp, $json); fflush($fp); flock($fp, LOCK_UN); fclose($fp);
  return rename($tmp, $file);
}

// Helper: réponse JSON
function ok($data=[]){ echo json_encode(['ok'=>true,'data'=>$data]); exit; }
function ko($msg='error', $code=400){ http_response_code($code); echo json_encode(['ok'=>false,'error'=>$msg]); exit; }

$action = $_GET['action'] ?? ($_POST['action'] ?? null);
if($_SERVER['REQUEST_METHOD']==='GET' && !$action){
  // GET public: retourne la map d’alias
  ok(read_json($DATA_FILE));
}

// Endpoint statut (session)
if($action==='me'){
  if(!empty($_SESSION['admin'])){
    $csrf = $_SESSION['csrf'] ?? '';
    ok(['admin'=>true,'csrf'=>$csrf]);
  } else {
    ko('unauthorized', 401);
  }
}
if($action==='logout'){
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
  }
  session_destroy();
  ok();
}

// Vérification code (TOTP basé sur SECRET_HEX si dispo)
function check_code($code){
  $code = trim((string)$code);
  if($code==='') return false;
  // Option 1: mot de passe hashé (bcrypt/argon2)
  if(defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH){
    return password_verify($code, ADMIN_PASSWORD_HASH) === true;
  }
  // Option 2: TOTP basé sur un secret hexadécimal
  if(defined('ADMIN_TOTP_SECRET_HEX') && ADMIN_TOTP_SECRET_HEX){
    $period = defined('ADMIN_TOTP_PERIOD') ? ADMIN_TOTP_PERIOD : 30;
    $digits = defined('ADMIN_TOTP_DIGITS') ? ADMIN_TOTP_DIGITS : 6;
    $secret = hex2bin(ADMIN_TOTP_SECRET_HEX);
    if(!$secret) return false;
    $ts = time();
    // fenêtre +/- 1 période pour tolérance de décalage
    for($i=-1; $i<=1; $i++){
      $t = floor($ts / $period) + $i;
      $binTime = pack('N*', 0) . pack('N*', $t);
      $hmac = hash_hmac('sha1', $binTime, $secret, true);
      $offset = ord(substr($hmac, -1)) & 0x0F;
      $part = substr($hmac, $offset, 4);
      $int = unpack('N', $part)[1] & 0x7fffffff;
      $tok = str_pad((string)($int % pow(10, $digits)), $digits, '0', STR_PAD_LEFT);
      if(hash_equals($tok, $code)) return true;
    }
    return false;
  }
  // Par défaut (pas de config): refuser
  return false;
}

// Auth
if($action==='auth'){
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $code = $body['code'] ?? '';
  // Anti brute-force simple
  $_SESSION['auth_log'] = $_SESSION['auth_log'] ?? [];
  $now = time();
  $_SESSION['auth_log'] = array_values(array_filter($_SESSION['auth_log'], function($t) use ($now){ return ($now - $t) < 300; })); // 5 min
  if(count($_SESSION['auth_log']) >= 10) ko('rate_limited', 429);
  $_SESSION['auth_log'][] = $now;
  if(check_code($code)){
    $_SESSION['admin'] = true;
    if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    ok(['csrf'=>$_SESSION['csrf']]);
  } else ko('invalid', 401);
}

// Save aliases
if($action==='save'){
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $data = $body['data'] ?? null;
  // Vérifier session et CSRF
  $csrf = $_SERVER['HTTP_X_CSRF'] ?? '';
  if(empty($_SESSION['admin']) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], (string)$csrf)) ko('unauthorized', 401);
  if(!is_array($data)) ko('bad data');
  // Sanitize keys/values simples
  $out = [];
  foreach($data as $k=>$v){
    if(!is_string($k) || !is_string($v)) continue;
    $k = trim($k);
    $v = trim($v);
    // clé: a-z, 0-9, -, _, . uniquement
    if($k==='' || !preg_match('/^[a-z0-9._-]{1,64}$/i', $k)) continue;
    // URL: http(s)://... ou chemin relatif commençant par /
    if(!(preg_match('#^https?://#i', $v) || preg_match('#^/[A-Za-z0-9/_\-.,%~:+]*$#', $v))){ continue; }
    $out[$k] = $v;
  }
  if(write_json($DATA_FILE, $out)) ok();
  else ko('write failed', 500);
}

ko('unknown', 404);

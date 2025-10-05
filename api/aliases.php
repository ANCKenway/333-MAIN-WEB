<?php
// 333.FM Aliases API (minimal) — à durcir avant prod
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: interest-cohort=()');

// Configuration de base
$DATA_FILE = __DIR__ . '/../data/aliases.json';
$SECURE_FILE = __DIR__ . '/secure.json';
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

// Gestion du secret TOTP dynamique (stocké côté serveur)
function get_dynamic_totp_secret_hex(){
  // Priorité à la constante si définie
  if(defined('ADMIN_TOTP_SECRET_HEX') && ADMIN_TOTP_SECRET_HEX){ return ADMIN_TOTP_SECRET_HEX; }
  global $SECURE_FILE;
  if(file_exists($SECURE_FILE)){
    $j = json_decode(@file_get_contents($SECURE_FILE), true);
    if(is_array($j) && !empty($j['totp_secret_hex'])) return (string)$j['totp_secret_hex'];
  }
  return '';
}
function set_dynamic_totp_secret_hex($hex){
  global $SECURE_FILE;
  $hex = strtolower(preg_replace('/[^0-9a-f]/i','',$hex));
  if($hex==='') return false;
  $cur = [];
  if(file_exists($SECURE_FILE)){
    $j = json_decode(@file_get_contents($SECURE_FILE), true);
    if(is_array($j)) $cur = $j;
  }
  $cur['totp_secret_hex'] = $hex;
  return write_json($SECURE_FILE, $cur);
}

// Base32 encoder (RFC 4648) pour URI otpauth
function b32_encode($bin){
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $bits = '';
  for($i=0,$l=strlen($bin); $i<$l; $i++){
    $bits .= str_pad(decbin(ord($bin[$i])), 8, '0', STR_PAD_LEFT);
  }
  $out='';
  for($i=0,$l=strlen($bits); $i<$l; $i+=5){
    $chunk = substr($bits, $i, 5);
    if(strlen($chunk) < 5){ $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT); }
    $out .= $alphabet[bindec($chunk)];
  }
  // Pas de padding '=' (beaucoup d'apps acceptent sans)
  return $out;
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
// Étape courante (enrôlement ou OTP en attente)
if($action==='stage'){
  $stage = [];
  if(!empty($_SESSION['enroll']['pwd_ok'])) $stage['enroll'] = true;
  if(!empty($_SESSION['otp_pending'])) $stage['otp'] = true;
  ok($stage);
}
// Exigences d'auth (découverte côté client)
if($action==='requirements'){
  $req = [
    'password' => (defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH) ? true : false,
    'totp' => (get_dynamic_totp_secret_hex() !== '') ? true : false
  ];
  ok($req);
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

// Vérifications séparées
function check_password($code){
  $code = trim((string)$code);
  if($code==='') return false;
  if(defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH){
    return password_verify($code, ADMIN_PASSWORD_HASH) === true;
  }
  return false;
}
function check_totp($otp){
  $otp = trim((string)$otp);
  if($otp==='') return false;
  $hex = get_dynamic_totp_secret_hex();
  if($hex){
    $period = defined('ADMIN_TOTP_PERIOD') ? ADMIN_TOTP_PERIOD : 30;
    $digits = defined('ADMIN_TOTP_DIGITS') ? ADMIN_TOTP_DIGITS : 6;
    $secret = @hex2bin($hex);
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
  return false;
}

// Auth
if($action==='auth'){
  // Si une liste d'IP est définie, limiter l'auth à celles-ci
  if(defined('ADMIN_IPS') && is_array(ADMIN_IPS) && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ADMIN_IPS, true)){
    ko('forbidden', 403);
  }
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $code = $body['code'] ?? '';
  $otp = $body['otp'] ?? '';
  // Anti brute-force simple
  $_SESSION['auth_log'] = $_SESSION['auth_log'] ?? [];
  $now = time();
  $_SESSION['auth_log'] = array_values(array_filter($_SESSION['auth_log'], function($t) use ($now){ return ($now - $t) < 300; })); // 5 min
  if(count($_SESSION['auth_log']) >= 10) ko('rate_limited', 429);
  $_SESSION['auth_log'][] = $now;
  // Exiger tous les facteurs configurés
  $needPassword = (defined('ADMIN_PASSWORD_HASH') && ADMIN_PASSWORD_HASH);
  $needTotp = (get_dynamic_totp_secret_hex() !== '');
  $okPwd = !$needPassword || check_password($code);
  $okTotp = !$needTotp || check_totp($otp);
  if($needPassword && !$okPwd){ ko('invalid', 401); }
  // Cas: mot de passe OK mais TOTP pas encore configuré -> proposer enrôlement
  if($needPassword && !$needTotp && $okPwd){
    // Préparer une session temporaire d'enrôlement
    $_SESSION['enroll'] = ['pwd_ok'=>true, 'ts'=>time()];
    if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    ok(['enroll'=>true, 'csrf'=>$_SESSION['csrf']]);
  }
  // Cas: TOTP requis et mot de passe OK, mais OTP manquant/incorrect -> mettre en attente OTP
  if($needTotp && $okPwd && !$okTotp){
    $_SESSION['otp_pending'] = true;
    if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    ok(['otp'=>true]);
  }
  if($okPwd && $okTotp){
    $_SESSION['admin'] = true;
    unset($_SESSION['otp_pending']);
    if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
    ok(['csrf'=>$_SESSION['csrf']]);
  } else ko('invalid', 401);
}

// Provisionner un secret TOTP (après MDP OK, avant validation OTP)
if($action==='totp_provision'){
  // nécessite session d'enrôlement
  if(empty($_SESSION['enroll']['pwd_ok'])) ko('unauthorized', 401);
  // CSRF facultatif ici, déjà en session; on peut l'exiger si nécessaire
  $existing = get_dynamic_totp_secret_hex();
  if(!$existing){
    $bin = random_bytes(20);
    $hex = bin2hex($bin);
    if(!set_dynamic_totp_secret_hex($hex)) ko('persist_failed', 500);
  } else {
    $bin = hex2bin($existing);
  }
  $issuer = '333FM';
  $account = 'admin';
  $label = rawurlencode($issuer . ':' . $account);
  $secretB32 = b32_encode($bin);
  $period = defined('ADMIN_TOTP_PERIOD') ? ADMIN_TOTP_PERIOD : 30;
  $digits = defined('ADMIN_TOTP_DIGITS') ? ADMIN_TOTP_DIGITS : 6;
  $uri = 'otpauth://totp/' . $label . '?secret=' . $secretB32 . '&issuer=' . rawurlencode($issuer) . '&period=' . intval($period) . '&digits=' . intval($digits);
  ok(['uri'=>$uri, 'secretBase32'=>$secretB32, 'issuer'=>$issuer, 'account'=>$account]);
}

// Vérifier le code OTP d'enrôlement et finaliser la session admin
if($action==='totp_verify'){
  if(empty($_SESSION['enroll']['pwd_ok'])) ko('unauthorized', 401);
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $otp = $body['otp'] ?? '';
  if(!check_totp($otp)) ko('invalid', 401);
  unset($_SESSION['enroll']);
  unset($_SESSION['otp_pending']);
  $_SESSION['admin'] = true;
  if(empty($_SESSION['csrf'])){ $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
  ok(['csrf'=>$_SESSION['csrf']]);
}

// Save aliases
if($action==='save'){
  // Si une liste d'IP est définie, limiter l'opération à celles-ci
  if(defined('ADMIN_IPS') && is_array(ADMIN_IPS) && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ADMIN_IPS, true)){
    ko('forbidden', 403);
  }
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

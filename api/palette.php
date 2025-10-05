<?php
// Simple palette extractor using GD (no Imagick required)
// GET /api/palette.php?img=assets/img/cover.jpg&k=5
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: interest-cohort=()');

$img = isset($_GET['img']) ? $_GET['img'] : 'assets/img/cover.jpg';
$k = isset($_GET['k']) ? intval($_GET['k']) : 5;
$k = max(2, min(8, $k));

$path = __DIR__ . '/../' . $img;
if (!file_exists($path)) {
  // fallback to root cover.jpg if moved not yet
  $fallback = __DIR__ . '/../cover.jpg';
  if (file_exists($fallback)) {
    $path = $fallback;
  } else {
    http_response_code(404);
    echo json_encode(['error' => 'image_not_found']);
    exit;
  }
}

$info = getimagesize($path);
if (!$info) { http_response_code(400); echo json_encode(['error'=>'invalid_image']); exit; }
$type = $info[2];

switch ($type) {
  case IMAGETYPE_JPEG: $im = imagecreatefromjpeg($path); break;
  case IMAGETYPE_PNG:  $im = imagecreatefrompng($path);  break;
  case IMAGETYPE_GIF:  $im = imagecreatefromgif($path);  break;
  default: http_response_code(400); echo json_encode(['error'=>'unsupported_type']); exit;
}

$w = imagesx($im); $h = imagesy($im);
$tw = 128; $th = 128;
$tmp = imagecreatetruecolor($tw, $th);
imagecopyresampled($tmp, $im, 0,0,0,0, $tw, $th, $w, $h);

$colors = [];
for ($y=0; $y<$th; $y+=2){
  for ($x=0; $x<$tw; $x+=2){
    $rgb = imagecolorat($tmp, $x, $y);
    $r = ($rgb >> 16) & 0xFF; $g = ($rgb >> 8) & 0xFF; $b = $rgb & 0xFF;
    // quantize
    $rq = intdiv($r, 16); $gq = intdiv($g, 16); $bq = intdiv($b, 16);
    $key = $rq.'-'.$gq.'-'.$bq;
    if (!isset($colors[$key])) $colors[$key] = 0;
    $colors[$key]++;
  }
}
arsort($colors);
$top = array_slice(array_keys($colors), 0, $k);
$palette = [];
foreach ($top as $key){
  list($rq,$gq,$bq) = array_map('intval', explode('-', $key));
  $palette[] = [min(255,$rq*16), min(255,$gq*16), min(255,$bq*16)];
}

// choose main and secondary by simple heuristics
$main = $palette[0];
$secondary = isset($palette[1]) ? $palette[1] : $palette[0];

echo json_encode([
  'main' => $main,
  'secondary' => $secondary,
  'palette' => $palette,
]);
?>

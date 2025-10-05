<?php
// Dynamic icon generator from cover image
// Usage: /api/icon.php?size=192
// Output: image/png square icon, center-cropped from assets/img/cover.jpg

header('Content-Type: image/png');
header('Cache-Control: public, max-age=604800, immutable');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: interest-cohort=()');

$size = isset($_GET['size']) ? intval($_GET['size']) : 192;
$size = max(16, min(1024, $size));

$rel = 'assets/img/cover.jpg';
$path = __DIR__ . '/../' . $rel;
if (!file_exists($path)) {
  $fallback = __DIR__ . '/../cover.jpg';
  if (file_exists($fallback)) { $path = $fallback; }
}
if (!file_exists($path)) {
  // transparent 1x1 as last resort
  $im = imagecreatetruecolor(1,1);
  imagesavealpha($im, true);
  $trans = imagecolorallocatealpha($im, 0,0,0, 127);
  imagefill($im, 0,0, $trans);
  imagepng($im);
  imagedestroy($im);
  exit;
}

$info = getimagesize($path);
if (!$info) { http_response_code(400); exit; }
$type = $info[2];
switch ($type) {
  case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($path); break;
  case IMAGETYPE_PNG:  $src = imagecreatefrompng($path); break;
  case IMAGETYPE_GIF:  $src = imagecreatefromgif($path); break;
  default: $src = imagecreatefromstring(file_get_contents($path)); break;
}
$w = imagesx($src); $h = imagesy($src);
// center-crop square
$side = min($w, $h);
$sx = (int)(($w - $side)/2); $sy = (int)(($h - $side)/2);

$dst = imagecreatetruecolor($size, $size);
imagesavealpha($dst, true);
$trans = imagecolorallocatealpha($dst, 0,0,0, 127);
imagefill($dst, 0,0, $trans);
imagecopyresampled($dst, $src, 0,0, $sx,$sy, $size,$size, $side,$side);

imagepng($dst, null, 9);
imagedestroy($dst);
imagedestroy($src);
?>

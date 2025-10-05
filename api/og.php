<?php
// Generate a 1200x630 OG image from cover with brand overlay
// GET /api/og.php
header('Content-Type: image/png');
header('Cache-Control: public, max-age=604800, immutable');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: interest-cohort=()');

$W = 1200; $H = 630;
$coverRel = 'assets/img/cover.jpg';
$coverPath = __DIR__ . '/../' . $coverRel;
if (!file_exists($coverPath)){
  $fb = __DIR__ . '/../cover.jpg';
  if(file_exists($fb)) $coverPath = $fb;
}

// base canvas
$im = imagecreatetruecolor($W,$H);
imagesavealpha($im,true);
$black = imagecolorallocate($im, 0,0,0);
imagefill($im,0,0,$black);

// background from cover (cover-fit)
if(file_exists($coverPath)){
  $info = getimagesize($coverPath);
  $type = $info ? $info[2] : null;
  switch($type){
    case IMAGETYPE_JPEG: $src = imagecreatefromjpeg($coverPath); break;
    case IMAGETYPE_PNG:  $src = imagecreatefrompng($coverPath); break;
    case IMAGETYPE_GIF:  $src = imagecreatefromgif($coverPath); break;
    default: $src = imagecreatefromstring(file_get_contents($coverPath));
  }
  $sw = imagesx($src); $sh = imagesy($src);
  // cover-fit to 1200x630
  $scale = max($W/$sw, $H/$sh);
  $nw = (int)($sw*$scale); $nh = (int)($sh*$scale);
  $ox = (int)(($W - $nw)/2); $oy = (int)(($H - $nh)/2);
  imagecopyresampled($im, $src, $ox,$oy, 0,0, $nw,$nh, $sw,$sh);
  // simple blur passes
  for($i=0;$i<8;$i++) imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);
  // darken and warm tint
  imagefilter($im, IMG_FILTER_BRIGHTNESS, -15);
  imagefilter($im, IMG_FILTER_COLORIZE, 30, 10, 0);
  imagedestroy($src);
}

// vignette gradient
$overlay = imagecreatetruecolor($W,$H);
imagesavealpha($overlay,true);
$trans = imagecolorallocatealpha($overlay,0,0,0,127);
imagefill($overlay,0,0,$trans);
$red = imagecolorallocatealpha($overlay, 198,2,2, 110);
$orang = imagecolorallocatealpha($overlay, 246,127,65, 115);
// top-left to bottom-right gradient strips
for($y=0;$y<$H;$y++){
  $a = (int)(max(0, min(127, 127 - ($y/$H)*90)));
  $col = imagecolorallocatealpha($overlay, 0,0,0, $a);
  imageline($overlay, 0,$y, $W,$y, $col);
}
imagecopy($im, $overlay, 0,0, 0,0, $W,$H);
imagedestroy($overlay);

// center badge from cover as small square
if(file_exists($coverPath)){
  $src2 = imagecreatefromstring(file_get_contents($coverPath));
  $sw2 = imagesx($src2); $sh2 = imagesy($src2);
  $side = min($sw2,$sh2);
  $sx = (int)(($sw2-$side)/2); $sy=(int)(($sh2-$side)/2);
  $logoW = 460; $logoH = 460; // square
  $dst2 = imagecreatetruecolor($logoW,$logoH);
  imagesavealpha($dst2,true);
  $alpha = imagecolorallocatealpha($dst2,0,0,0,127);
  imagefill($dst2,0,0,$alpha);
  imagecopyresampled($dst2,$src2,0,0,$sx,$sy,$logoW,$logoH,$side,$side);
  // glow behind
  $glow = imagecreatetruecolor($logoW+80,$logoH+80);
  imagesavealpha($glow,true);
  $alpha2 = imagecolorallocatealpha($glow,0,0,0,127); imagefill($glow,0,0,$alpha2);
  imagecopy($glow,$dst2,40,40,0,0,$logoW,$logoH);
  for($i=0;$i<8;$i++) imagefilter($glow, IMG_FILTER_GAUSSIAN_BLUR);
  imagecopy($im, $glow, (int)(($W-$logoW-80)/2), (int)(($H-$logoH-80)/2), 0,0,$logoW+80,$logoH+80);
  imagedestroy($glow);
  imagecopy($im, $dst2, (int)(($W-$logoW)/2), (int)(($H-$logoH)/2), 0,0,$logoW,$logoH);
  imagedestroy($dst2); imagedestroy($src2);
}

imagepng($im, null, 9);
imagedestroy($im);
?>

<?php
// Index PHP pour forcer le passage par le frontgate lorsque FRONTGATE_LOCK est actif
@include __DIR__ . '/api/config.php';
if(defined('FRONTGATE_LOCK') && FRONTGATE_LOCK === true){
  require __DIR__ . '/frontgate.php';
  exit;
}
// Si pas de lock global, servir l'index HTML normal
if(file_exists(__DIR__ . '/index.html')){
  header('Content-Type: text/html; charset=utf-8');
  readfile(__DIR__ . '/index.html');
  exit;
}
http_response_code(404);
echo 'Not Found';

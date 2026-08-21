<?php
/**
 * تنزيل إجباري لملف PDF من مجلد exam-reviews
 * مثال: /uploads/exam-reviews/download.php?f=stored.pdf&name=مراجعة.pdf
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$stored = basename((string) ($_GET['f'] ?? ''));
if ($stored === '' || !preg_match('/^[a-zA-Z0-9._-]+\.pdf$/i', $stored)) {
  http_response_code(400);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'INVALID_FILE']);
  exit;
}

$path = __DIR__ . DIRECTORY_SEPARATOR . $stored;
if (!is_file($path)) {
  http_response_code(404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'NOT_FOUND']);
  exit;
}

$downloadName = basename((string) ($_GET['name'] ?? $stored));
if ($downloadName === '' || !str_ends_with(strtolower($downloadName), '.pdf')) {
  $downloadName = $stored;
}

header('Content-Type: application/pdf');
header('Content-Length: ' . (string) filesize($path));
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $downloadName) . '"; filename*=UTF-8\'\'' . rawurlencode($downloadName));
header('Cache-Control: private, max-age=0, must-revalidate');
header('X-Content-Type-Options: nosniff');

readfile($path);
exit;

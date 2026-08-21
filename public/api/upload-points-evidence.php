<?php
/**
 * رفع شواهد المنح (صور/PDF) إلى Hostinger — يُحفظ الملف محلياً ويُرجع الرابط العام.
 * ضع الملف على السيرفر: public_html/api/upload-points-evidence.php
 * وأنشئ مجلد: public_html/uploads/points-evidence/ بصلاحية الكتابة.
 *
 * الأمان: UPLOAD_TOKEN يجب أن يطابق VITE_HOSTINGER_UPLOAD_TOKEN (نفس رمز مراجعات PDF)
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);
  exit;
}

/** غيّر هذا الرمز — نفس القيمة في VITE_HOSTINGER_UPLOAD_TOKEN و upload-exam-review.php */
const UPLOAD_TOKEN = 'fd4ee3ba40fb4305f6908c3770a0c30d';

$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? ($_POST['token'] ?? '');
if (!is_string($token) || !hash_equals(UPLOAD_TOKEN, $token)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'UNAUTHORIZED']);
  exit;
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'NO_FILE']);
  exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'UPLOAD_ERROR', 'code' => $file['error']]);
  exit;
}

$maxBytes = 10 * 1024 * 1024; // 10MB
if (($file['size'] ?? 0) <= 0 || $file['size'] > $maxBytes) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'FILE_TOO_LARGE']);
  exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: ($file['type'] ?? '');
$origName = (string) ($file['name'] ?? 'evidence');
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

$mimeToExt = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'image/webp' => 'webp',
  'image/gif' => 'gif',
  'application/pdf' => 'pdf',
  'application/x-pdf' => 'pdf',
];

$allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
$resolvedExt = $mimeToExt[$mime] ?? null;
if ($resolvedExt === null) {
  if (in_array($ext, $allowedExt, true)) {
    $resolvedExt = $ext === 'jpeg' ? 'jpg' : $ext;
  }
}

if ($resolvedExt === null) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'TYPE_NOT_ALLOWED', 'mime' => $mime]);
  exit;
}

$userId = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_POST['user_id'] ?? 'unknown')) ?: 'unknown';
$safeBase = preg_replace('/[^a-zA-Z0-9._-]+/', '_', pathinfo($origName, PATHINFO_FILENAME)) ?: 'evidence';
$safeBase = substr($safeBase, 0, 80);
$filename = $userId . '_' . date('Ymd_His') . '_' . $safeBase . '.' . $resolvedExt;

$root = dirname(__DIR__); // public_html
$uploadDir = $root . '/uploads/points-evidence';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'MKDIR_FAILED']);
  exit;
}

$dest = $uploadDir . '/' . $filename;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'MOVE_FAILED']);
  exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$publicUrl = $scheme . '://' . $host . '/uploads/points-evidence/' . rawurlencode($filename);

if ($resolvedExt === 'jpg' || $resolvedExt === 'jpeg') {
  $outMime = 'image/jpeg';
} elseif ($resolvedExt === 'png') {
  $outMime = 'image/png';
} elseif ($resolvedExt === 'webp') {
  $outMime = 'image/webp';
} elseif ($resolvedExt === 'gif') {
  $outMime = 'image/gif';
} else {
  $outMime = 'application/pdf';
}

echo json_encode([
  'ok' => true,
  'url' => $publicUrl,
  'file_name' => $origName,
  'stored_name' => $filename,
  'mime' => $outMime,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

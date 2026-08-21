<?php
/**
 * رفع ملفات مراجعات PDF إلى Hostinger — يُحفظ الملف محلياً ويُرجع الرابط العام.
 * ضع هذا الملف على السيرفر (مثلاً public_html/api/upload-exam-review.php)
 * وأنشئ مجلد: public_html/uploads/exam-reviews/ بصلاحية الكتابة.
 *
 * الأمان: غيّر UPLOAD_TOKEN ليطابق VITE_HOSTINGER_UPLOAD_TOKEN في .env
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

/** غيّر هذا الرمز — نفس القيمة في VITE_HOSTINGER_UPLOAD_TOKEN */
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

$maxBytes = 25 * 1024 * 1024; // 25MB
if (($file['size'] ?? 0) <= 0 || $file['size'] > $maxBytes) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'FILE_TOO_LARGE']);
  exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: ($file['type'] ?? '');
$allowed = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];
$origName = (string) ($file['name'] ?? 'review.pdf');
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if ($ext !== 'pdf' && !in_array($mime, $allowed, true)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'PDF_ONLY', 'mime' => $mime]);
  exit;
}

$teacherId = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_POST['teacher_id'] ?? 'unknown')) ?: 'unknown';
$safeBase = preg_replace('/[^a-zA-Z0-9._-]+/', '_', pathinfo($origName, PATHINFO_FILENAME)) ?: 'review';
$safeBase = substr($safeBase, 0, 80);
$filename = $teacherId . '_' . date('Ymd_His') . '_' . $safeBase . '.pdf';

$root = dirname(__DIR__); // public_html
$uploadDir = $root . '/uploads/exam-reviews';
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
$publicUrl = $scheme . '://' . $host . '/uploads/exam-reviews/' . rawurlencode($filename);

echo json_encode([
  'ok' => true,
  'url' => $publicUrl,
  'file_name' => $origName,
  'stored_name' => $filename,
  'mime' => 'application/pdf',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

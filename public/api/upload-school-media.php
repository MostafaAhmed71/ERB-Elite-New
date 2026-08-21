<?php
/**
 * رفع صور الطلاب/الفصول إلى Hostinger — الملف محلياً والرابط فقط في Supabase.
 * ضع الملف: public_html/api/upload-school-media.php
 * وأنشئ مجلد: public_html/uploads/school-media/ بصلاحية الكتابة.
 *
 * الأمان: UPLOAD_TOKEN = VITE_HOSTINGER_UPLOAD_TOKEN (نفس رمز باقي الرفوعات)
 *
 * الحقول: file, token, kind (class|student), key (معرف ASCII آمن)
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

/** غيّر هذا الرمز — نفس القيمة في VITE_HOSTINGER_UPLOAD_TOKEN وملفات الرفع الأخرى */
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

$maxBytes = 3 * 1024 * 1024; // 3MB
if (($file['size'] ?? 0) <= 0 || $file['size'] > $maxBytes) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'FILE_TOO_LARGE']);
  exit;
}

$kind = strtolower(trim((string) ($_POST['kind'] ?? '')));
if (!in_array($kind, ['class', 'student'], true)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'INVALID_KIND']);
  exit;
}

$key = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_POST['key'] ?? '')) ?: '';
if ($key === '' || strlen($key) > 120) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'INVALID_KEY']);
  exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: ($file['type'] ?? '');
$origName = (string) ($file['name'] ?? 'photo.jpg');
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

$mimeToExt = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'image/webp' => 'webp',
  'image/gif' => 'gif',
];

$allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$resolvedExt = $mimeToExt[$mime] ?? null;
if ($resolvedExt === null && in_array($ext, $allowedExt, true)) {
  $resolvedExt = $ext === 'jpeg' ? 'jpg' : $ext;
}

if ($resolvedExt === null) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'TYPE_NOT_ALLOWED', 'mime' => $mime]);
  exit;
}

// اسم ثابت لاستبدال الصورة السابقة لنفس الفصل/الطالب
$filename = $kind . '_' . $key . '.' . $resolvedExt;

$root = dirname(__DIR__); // public_html
$uploadDir = $root . '/uploads/school-media';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'MKDIR_FAILED']);
  exit;
}

// احذف امتدادات قديمة لنفس المفتاح حتى لا تبقى صور متعددة
foreach (['jpg', 'jpeg', 'png', 'webp', 'gif'] as $oldExt) {
  $old = $uploadDir . '/' . $kind . '_' . $key . '.' . $oldExt;
  if (is_file($old) && $old !== $uploadDir . '/' . $filename) {
    @unlink($old);
  }
}

$dest = $uploadDir . '/' . $filename;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'MOVE_FAILED']);
  exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$publicUrl = $scheme . '://' . $host . '/uploads/school-media/' . rawurlencode($filename);

$outMime = [
  'jpg' => 'image/jpeg',
  'png' => 'image/png',
  'webp' => 'image/webp',
  'gif' => 'image/gif',
][$resolvedExt] ?? 'image/jpeg';

echo json_encode([
  'ok' => true,
  'url' => $publicUrl,
  'file_name' => $origName,
  'stored_name' => $filename,
  'mime' => $outMime,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

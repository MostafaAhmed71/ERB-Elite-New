<?php
/**
 * احتياطي Hostinger: إن وُجّهت الطلبات إلى PHP بدل الملفات الثابتة.
 * عادةً يكفي .htaccess → index.html. هذا الملف يخدم نفس الغرض.
 */
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Content-Type: text/html; charset=UTF-8');
readfile(__DIR__ . '/index.html');

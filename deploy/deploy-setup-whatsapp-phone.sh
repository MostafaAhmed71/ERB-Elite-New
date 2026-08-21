#!/usr/bin/env bash
# نشر دالة إعداد واتساب بعد أول دخول
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase functions deploy setup-whatsapp-phone --project-ref "${SUPABASE_PROJECT_REF:-gjgezdbbnezsvsmygpcd}" --no-verify-jwt
echo "OK: setup-whatsapp-phone deployed"
echo "ملاحظة: حدّث whatsapp-server.js على الـ VPS لدعم POST /check-number"

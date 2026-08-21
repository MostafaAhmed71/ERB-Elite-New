#!/usr/bin/env bash
# نشر دوال OTP على مشروع Supabase
# الاستخدام:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # من https://supabase.com/dashboard/account/tokens
#   ./deploy/deploy-auth-phone-otp.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-gjgezdbbnezsvsmygpcd}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ثبّت Supabase CLI أولاً:"
  echo "  npm i -g supabase"
  echo "أو من: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ضع SUPABASE_ACCESS_TOKEN (Access Token من حساب Supabase) ثم أعد التشغيل."
  exit 1
fi

echo "→ ربط المشروع $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo "→ نشر auth-phone-otp"
supabase functions deploy auth-phone-otp --project-ref "$PROJECT_REF" --no-verify-jwt

echo "→ نشر register-user"
supabase functions deploy register-user --project-ref "$PROJECT_REF"

echo "✓ تم. اختبر من: /login/staff"
echo "تذكير: طبّق SQL 111 و 112 من SQL Editor إن لم تُطبَّقا."

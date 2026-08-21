#!/usr/bin/env bash
# تثبيت CLI محلياً في المشروع ثم نشر auth-phone-otp
# شغّل من مجلد المشروع:
#   bash deploy/install-and-deploy-otp.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ تثبيت supabase كـ devDependency في المشروع..."
npm install supabase --save-dev --no-fund --no-audit

CLI=(npx supabase)

echo "→ إصدار CLI:"
"${CLI[@]}" --version

PROJECT_REF="${SUPABASE_PROJECT_REF:-gjgezdbbnezsvsmygpcd}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo ""
  echo "أنشئ Access Token من:"
  echo "  https://supabase.com/dashboard/account/tokens"
  echo "ثم:"
  echo "  export SUPABASE_ACCESS_TOKEN=sbp_xxxx"
  echo "  bash deploy/install-and-deploy-otp.sh"
  exit 1
fi

echo "→ نشر auth-phone-otp على $PROJECT_REF"
"${CLI[@]}" functions deploy auth-phone-otp --project-ref "$PROJECT_REF" --no-verify-jwt

echo "→ نشر register-user"
"${CLI[@]}" functions deploy register-user --project-ref "$PROJECT_REF"

echo "✓ تم النشر"

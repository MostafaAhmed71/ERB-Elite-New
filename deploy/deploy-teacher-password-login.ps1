param([string]$ProjectRef = 'gjgezdbbnezsvsmygpcd')
$ErrorActionPreference = 'Stop'
$TaskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $TaskRoot
Write-Host 'Apply supabase/migrations/147_teacher_password_login.sql in the project SQL Editor first.'
Write-Host 'Deploying teacher-password-auth (uses existing Supabase Auth accounts).'
& npx --yes supabase functions deploy teacher-password-auth --project-ref $ProjectRef --no-verify-jwt
if ($LASTEXITCODE -ne 0) { throw 'Function deployment failed. Sign in to Supabase CLI and retry.' }
Write-Host 'Function deployed. Publish the root app build after the SQL migration is applied.'

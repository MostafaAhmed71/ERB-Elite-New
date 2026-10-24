# Teacher phone/password login

Current activation mode: one shared school code for all active registered teachers, as explicitly requested by the owner. The value is not embedded in the frontend or repository; only its user-normalized SHA-256 hash is stored in Supabase secret `TEACHER_SHARED_ACTIVATION_HASH`.

## Teacher flow

1. Enter the registered phone at `/login/staff`.
2. If the account has not completed setup, enter the shared activation code, a new password of at least eight characters, and confirmation.
3. The code can configure a password only once for that account. Subsequent visits use phone and password. There is no per-teacher code issuance step.

Only active teacher profiles with a unique registered phone are eligible. Passwords remain in Supabase Auth. Existing accounts, roles, tracking and Google login are preserved. A configured account cannot be reopened by the shared code; password recovery is handled by authorized administration or the existing recovery flow.

A shared code does not independently verify identity. Anyone who knows it and a teacher phone can activate an account that has not been configured yet. The owner chose this tradeoff after it was explained.

## Backend

Migration `147_teacher_password_login.sql` is applied and function `teacher-password-auth` is deployed to project `gjgezdbbnezsvsmygpcd`. Code verification happens server-side before the per-account claim is made. Claims and completed setup state are private, protected with RLS and service-role-only access. Atomic per-phone rate limits remain enabled.

If the shared-code secret is absent, the function retains the earlier individual activation-code mode. Changing the shared-code secret affects only accounts that have not completed setup; it does not reset passwords.

## Deployment and validation

The frontend was built locally and remains to be uploaded to the VPS; SSH host-key verification currently prevents automated publication. Do not assume backend deployment changes the published login page.

Ten backend logic tests and browser checks across 320, 360, 375, 390, 412 and 430 px passed. Live wrong-code activation returns HTTP 401. No live teacher password was changed during testing.

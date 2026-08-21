-- =============================================================
-- 055a: Add deputy role ONLY — run this FIRST, then run 055
-- Supabase SQL Editor runs one transaction; enum values must
-- commit before use in policies. Run this alone, wait for success,
-- then run 055_academic_staff_module.sql (skip line 7 if deputy exists).
-- =============================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'deputy';

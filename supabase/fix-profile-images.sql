-- شغّل في Supabase → SQL Editor (نفس migrations/038_profile_images.sql)

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS public.class_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  class_name text NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade, class_name)
);

CREATE INDEX IF NOT EXISTS idx_class_profiles_grade_class
  ON public.class_profiles(grade, class_name);

ALTER TABLE public.class_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_class_profiles" ON public.class_profiles;
CREATE POLICY "staff_manage_class_profiles" ON public.class_profiles
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'activity_leader', 'principal'))
  WITH CHECK (public.get_my_role() IN ('admin', 'activity_leader', 'principal'));

DROP POLICY IF EXISTS "everyone_read_class_profiles" ON public.class_profiles;
CREATE POLICY "everyone_read_class_profiles" ON public.class_profiles
  FOR SELECT USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-media',
  'school-media',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "school_media_public_read" ON storage.objects;
CREATE POLICY "school_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-media');

DROP POLICY IF EXISTS "school_media_staff_insert" ON storage.objects;
CREATE POLICY "school_media_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  );

DROP POLICY IF EXISTS "school_media_staff_update" ON storage.objects;
CREATE POLICY "school_media_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  );

DROP POLICY IF EXISTS "school_media_staff_delete" ON storage.objects;
CREATE POLICY "school_media_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'school-media'
    AND public.get_my_role() IN ('admin', 'activity_leader', 'principal')
  );

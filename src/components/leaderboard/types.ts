/** أنواع مشتركة للوحة المتصدرين — الطلاب والفصول مستقلان */

export type StudentRankEntry = {
  id: string;
  full_name: string;
  grade: string;
  class_name: string;
  photo_url?: string | null;
  /** @deprecated استخدم photo_url */
  avatar_url?: string | null;
  total_points: number;
  rank: number;
};

export type ClassRankEntry = {
  id: string;
  grade: string;
  class_name: string;
  total_points: number;
  rank: number;
  student_count?: number;
  grant_count?: number;
  photo_url?: string | null;
};

export type LeaderboardTab = 'students' | 'classes';

import { AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { RewardsStorePage } from './RewardsStorePage';
import { TapHandLoader } from '../../components/ui';

export function StudentRewardsPage() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student', 'rewards-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, class_name')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <TapHandLoader label="جاري التحميل..." fullScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 glass-card text-white" dir="rtl">
        <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
        <h2 className="text-white font-bold text-lg">لم يتم العثور على ملف الطالب</h2>
      </div>
    );
  }

  return (
    <RewardsStorePage
      studentId={profile.id}
      studentName={profile.full_name}
    />
  );
}

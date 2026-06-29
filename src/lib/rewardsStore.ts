import { supabase } from './supabase';

import { saveSchoolSetting } from './schoolConfig';

export type RewardItem = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  stock: number | null;
  is_active: boolean;
};

export type RewardRedemption = {
  id: string;
  student_id: string;
  reward_id: string;
  points_cost: number;
  status: string;
  created_at: string;
  reward_items?: { name: string } | null;
  students?: { full_name: string; grade: string; class_name: string } | null;
};

export type RewardsStoreConfig = {
  enabled: boolean;
};

export async function fetchRewardsStoreConfig(): Promise<RewardsStoreConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'rewards_store')
    .maybeSingle();
  if (error) throw error;
  const v = data?.value as { enabled?: boolean } | null;
  return { enabled: Boolean(v?.enabled) };
}

export async function saveRewardsStoreConfig(enabled: boolean): Promise<void> {
  await saveSchoolSetting('rewards_store', { enabled });
}

export async function fetchActiveRewards(): Promise<RewardItem[]> {
  const { data, error } = await supabase
    .from('reward_items')
    .select('*')
    .eq('is_active', true)
    .order('points_cost', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RewardItem[];
}

export async function fetchAllRewards(): Promise<RewardItem[]> {
  const { data, error } = await supabase
    .from('reward_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RewardItem[];
}

export async function fetchPendingRedemptions(): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(`
      *,
      reward_items (name),
      students (full_name, grade, class_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RewardRedemption[];
}

export async function redeemReward(rewardId: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
  if (error) throw mapRewardError(error.message);
}

export async function processRedemption(
  redemptionId: string,
  action: 'approve' | 'reject',
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('process_reward_redemption', {
    p_redemption_id: redemptionId,
    p_action: action,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}

function mapRewardError(message: string): Error {
  if (message.includes('STORE_DISABLED')) return new Error('متجر المكافآت غير مفعّل حالياً');
  if (message.includes('INSUFFICIENT_POINTS')) return new Error('رصيدك غير كافٍ لهذه المكافأة');
  if (message.includes('OUT_OF_STOCK')) return new Error('نفدت كمية هذه المكافأة');
  return new Error(message);
}

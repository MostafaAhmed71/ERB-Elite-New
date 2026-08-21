import type { NavItem, UserRole } from '../types';
import { ROLE_NAV } from '../types';
import { DEV_NAV } from './devNav';

/** مسارات رائد النشاط (admin + activity_leader الموحّد) */
export const ADMIN_NAV: NavItem[] = ROLE_NAV.admin;

export function getNavForRole(role: UserRole | null): NavItem[] {
  if (!role) return [];
  if (role === 'platform_developer') return DEV_NAV;
  if (role === 'activity_leader' || role === 'admin') return ADMIN_NAV;
  return ROLE_NAV[role] ?? [];
}

export function isAdminLikeRole(role: UserRole | null): boolean {
  return role === 'admin' || role === 'activity_leader';
}

export function isPlatformDeveloper(role: UserRole | null): boolean {
  return role === 'platform_developer';
}

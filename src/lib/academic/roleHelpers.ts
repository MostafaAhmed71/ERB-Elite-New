import type { UserRole } from '../../types';

export function isAcademicTeacher(role: UserRole | null | undefined) {
  return role === 'teacher';
}

export function isAcademicSupervisorView(role: UserRole | null | undefined) {
  return role === 'supervisor';
}

export function canExportAcademicTemplates(role: UserRole | null | undefined) {
  return role === 'deputy' || role === 'principal';
}

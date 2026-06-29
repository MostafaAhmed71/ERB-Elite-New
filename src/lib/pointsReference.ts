export const AXES_LABELS = {
  activity: 'محور النشاط (40%)',
  behavior: 'محور السلوك (30%)',
  achievement: 'محور الإنجاز (20%)',
  initiative: 'محور المبادرة (10%)',
};

export const AXES_KEYS = {
  activity: 'النشاط',
  behavior: 'السلوك',
  achievement: 'الإنجاز',
  initiative: 'المبادرة',
  attendance: 'الحضور',
};

/** محاور رصد النقاط — للفلترة في مركز إدارة النقاط */
export const POINT_AXIS_OPTIONS = [
  { key: 'activity', label: 'النشاط' },
  { key: 'behavior', label: 'السلوك' },
  { key: 'achievement', label: 'الإنجاز' },
  { key: 'initiative', label: 'المبادرة' },
  { key: 'attendance', label: 'الحضور' },
] as const;

export type PointAxisKey = (typeof POINT_AXIS_OPTIONS)[number]['key'];

export const ROLE_LABELS_OLYMPIAD = {
  admin: 'رائد النشاط',
  student: 'الطالب',
  teacher: 'المعلم',
  supervisor: 'المشرف التربوي',
  parent: 'ولي الأمر',
  principal: 'مدير المدرسة',
};

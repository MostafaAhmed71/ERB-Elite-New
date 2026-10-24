/** هل عنصر القائمة نشط مع مراعاة query string (مثل /points/grant?bulk=1) */
export function isNavItemActive(
  itemPath: string,
  pathname: string,
  search: string,
  allItemPaths: string[] = [],
): boolean {
  const current = `${pathname}${search}`;

  if (itemPath.includes('?')) {
    return current === itemPath;
  }

  const pathMatches =
    pathname === itemPath
    || (itemPath !== '/' && pathname.startsWith(`${itemPath}/`));

  if (!pathMatches) return false;

  // لا نفعّل العنصر بدون query إذا كان رابط حالي يطابق عنصراً بنفس المسار مع query
  const querySiblingOwnsCurrent = allItemPaths.some(
    (p) => p !== itemPath && p.startsWith(`${itemPath}?`) && current === p,
  );
  if (querySiblingOwnsCurrent) return false;

  // المسار الأطول يملك التمييز (مثل /parent/academic/reviews مقابل /parent/academic)
  const moreSpecificOwnsCurrent = allItemPaths.some((p) => {
    if (p === itemPath || p.includes('?')) return false;
    const pMatches = pathname === p || pathname.startsWith(`${p}/`);
    return pMatches && p.length > itemPath.length;
  });
  return !moreSpecificOwnsCurrent;
}

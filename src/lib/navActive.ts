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
  return !querySiblingOwnsCurrent;
}

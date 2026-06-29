export function getStudentQRUrl(studentId: string, qrToken?: string | null): string {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  if (qrToken) return `${appUrl}/card/t/${qrToken}`;
  return `${appUrl}/card/${studentId}`;
}

export function parseStudentQRUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    // Check if path is /card/:id
    const cardIndex = pathParts.indexOf('card');
    if (cardIndex !== -1 && pathParts[cardIndex + 1]) {
      return pathParts[cardIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

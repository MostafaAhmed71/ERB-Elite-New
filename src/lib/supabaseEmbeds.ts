/** Supabase embeds may be returned as a single object or an array. */
export type Embed<T> = T | T[] | null | undefined;

export function embedOne<T>(value: Embed<T>): T | null {
  if (value == null) return null;
  return (Array.isArray(value) ? value[0] ?? null : value) as T | null;
}

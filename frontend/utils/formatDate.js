/** "2026-11-22T11:04:52Z" -> "Nov 22, 2026" (same helper as the old util.js). */
export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

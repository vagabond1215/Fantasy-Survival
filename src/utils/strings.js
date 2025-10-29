/**
 * Create a URL and identifier safe slug from an arbitrary value.
 *
 * @param {string | number | undefined | null} value
 * @param {{ fallback?: string }} [options]
 * @returns {string}
 */
export function slugify(value = '', { fallback = '' } = {}) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (text) return text;
  return fallback;
}


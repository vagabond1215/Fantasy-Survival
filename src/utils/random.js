/**
 * @param {string | number | undefined} seed
 * @returns {number}
 */
export function hashSeed(seed) {
  const text = typeof seed === 'string' ? seed : String(seed ?? '');
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string | number | undefined} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  if (seed === undefined) {
    return Math.random;
  }
  const hashed = hashSeed(seed) || 1;
  return mulberry32(hashed);
}

// src/world/seed.js

/**
 * @typedef {Object} CanonicalSeed
 * @property {string} raw The original, user-entered seed string (unmodified).
 * @property {string} normalized Normalized + trimmed string used for hashing (NFC).
 * @property {string} hex Lowercase hex SHA-256 of normalized.
 * @property {[number, number, number, number, number, number, number, number]} lanes Eight 32-bit unsigned lanes derived from the hash.
 */

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 * @param {ArrayBuffer} ab
 * @returns {string}
 */
function toHex(ab) {
  const bytes = new Uint8Array(ab);
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, "0");
    s += h;
  }
  return s;
}

/**
 * Derive eight 32-bit lanes from a 32-byte SHA-256.
 * lanes[i] = u32 from bytes[i*4..i*4+3], big-endian.
 * @param {ArrayBuffer} hash
 * @returns {[number, number, number, number, number, number, number, number]}
 */
function lanesFromHash(hash) {
  const v = new DataView(hash);
  const lanes = [];
  for (let i = 0; i < 8; i++) {
    lanes.push(v.getUint32(i * 4, false)); // big-endian
  }
  return /** @type {[number, number, number, number, number, number, number, number]} */ (lanes);
}

/**
 * Compute SHA-256 in browser (Web Crypto). Assumes modern browsers (GH Pages).
 * @param {string} s
 * @returns {Promise<ArrayBuffer>}
 */
async function sha256String(s) {
  const enc = new TextEncoder();
  const data = enc.encode(s);
  return crypto.subtle.digest("SHA-256", data);
}

/**
 * Canonicalize the user's seed string to a stable 256-bit hash and 8 lanes.
 * - Trim whitespace
 * - Unicode normalize (NFC)
 * - SHA-256
 * - Extract 8x u32 lanes (big-endian)
 * @param {string} seedString
 * @returns {Promise<CanonicalSeed>}
 */
export async function canonicalizeSeed(seedString) {
  const normalized = (seedString ?? "").trim().normalize("NFC");
  const hash = await sha256String(normalized);
  const hex = toHex(hash);
  const lanes = lanesFromHash(hash);
  return {
    raw: seedString,
    normalized,
    hex,
    lanes,
  };
}

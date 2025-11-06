// src/world/seed.ts
export type CanonicalSeed = {
  /** The original, user-entered seed string (unmodified). */
  readonly raw: string;
  /** Normalized + trimmed string used for hashing (NFC). */
  readonly normalized: string;
  /** Lowercase hex SHA-256 of normalized. */
  readonly hex: string;
  /** Eight 32-bit unsigned lanes derived from the hash. */
  readonly lanes: readonly [number, number, number, number, number, number, number, number];
};

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function toHex(ab: ArrayBuffer): string {
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
 */
function lanesFromHash(hash: ArrayBuffer): [number, number, number, number, number, number, number, number] {
  const v = new DataView(hash);
  const lanes: number[] = [];
  for (let i = 0; i < 8; i++) {
    lanes.push(v.getUint32(i * 4, false)); // big-endian
  }
  return lanes as any;
}

/**
 * Compute SHA-256 in browser (Web Crypto). Assumes modern browsers (GH Pages).
 */
async function sha256String(s: string): Promise<ArrayBuffer> {
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
 */
export async function canonicalizeSeed(seedString: string): Promise<CanonicalSeed> {
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

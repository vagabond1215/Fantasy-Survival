import { canonicalizeSeed as canonicalizeSeedJs } from './seed.js';

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

export const canonicalizeSeed = canonicalizeSeedJs as (
  seedString: string,
) => Promise<CanonicalSeed>;

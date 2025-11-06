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
 * Canonicalize the user's seed string to a stable 256-bit hash and 8 lanes.
 */
export declare function canonicalizeSeed(seedString: string): Promise<CanonicalSeed>;

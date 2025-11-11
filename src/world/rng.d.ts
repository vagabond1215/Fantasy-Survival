import type { CanonicalSeed } from "./seed.js";
export type XorShift128Plus = {
    /** Next 64-bit unsigned integer as BigInt in [0, 2^64). */
    next64: () => bigint;
    /** Get a float in [0,1). */
    nextFloat01: () => number;
    /** Clone the RNG (pure copy of state). */
    clone: () => XorShift128Plus;
};
/**
 * Core xorshift128+ implementation (BigInt), as per Vigna.
 * State is two 64-bit unsigned integers (s0, s1), neither all-zero together.
 */
export declare function xorshift128plus(seed0: bigint, seed1: bigint): XorShift128Plus;
/**
 * Build two 64-bit seeds from canonical lanes:
 * s0 = (lane0 << 32) | lane1
 * s1 = (lane2 << 32) | lane3
 */
export declare function fromCanonicalSeed(seed: CanonicalSeed): XorShift128Plus;
/**
 * Convenience: one-off float in [0,1).
 */
export declare function float01(rng: XorShift128Plus): number;
/**
 * Optional: fork a substream by mixing remaining lanes.
 */
export declare function fork(rng: XorShift128Plus, seed: CanonicalSeed): XorShift128Plus;

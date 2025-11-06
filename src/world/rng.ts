// src/world/rng.ts
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
export function xorshift128plus(seed0: bigint, seed1: bigint): XorShift128Plus {
  let s0 = seed0 & ((1n << 64n) - 1n);
  let s1 = seed1 & ((1n << 64n) - 1n);
  if (s0 === 0n && s1 === 0n) s1 = 1n;

  const mask64 = (1n << 64n) - 1n;

  function next64(): bigint {
    // xorshift128+ step
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= (x << 23n) & mask64;
    s1 = (x ^ y ^ (x >> 17n) ^ (y >> 26n)) & mask64;
    const result = (s1 + y) & mask64;
    return result;
  }

  function nextFloat01(): number {
    // Take the top 53 bits to construct a JS double in [0,1)
    const n = next64();
    const mantissa = Number(n >> 11n); // 64-11 = 53 bits
    return mantissa / 2 ** 53; // 2^53
  }

  function clone(): XorShift128Plus {
    // capture current state by generating a cheap fork
    // We simulate snapshot by creating a new generator with identical state.
    const s0copy = s0;
    const s1copy = s1;
    return xorshift128plus(s0copy, s1copy);
  }

  return { next64, nextFloat01, clone };
}

/**
 * Build two 64-bit seeds from canonical lanes:
 * s0 = (lane0 << 32) | lane1
 * s1 = (lane2 << 32) | lane3
 */
export function fromCanonicalSeed(seed: CanonicalSeed): XorShift128Plus {
  const to64 = (hi: number, lo: number) => ((BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0)) & ((1n << 64n) - 1n);
  let s0 = to64(seed.lanes[0], seed.lanes[1]);
  let s1 = to64(seed.lanes[2], seed.lanes[3]);
  if (s0 === 0n && s1 === 0n) s1 = 1n;
  return xorshift128plus(s0, s1);
}

/**
 * Convenience: one-off float in [0,1).
 */
export function float01(rng: XorShift128Plus): number {
  return rng.nextFloat01();
}

/**
 * Optional: fork a substream by mixing remaining lanes.
 */
export function fork(rng: XorShift128Plus, seed: CanonicalSeed): XorShift128Plus {
  // Mix lanes[4..7] to perturb state via XorShift stepping.
  const mix64 = ((BigInt(seed.lanes[4]) << 32n) | BigInt(seed.lanes[5])) ^ ((BigInt(seed.lanes[6]) << 32n) | BigInt(seed.lanes[7]));
  const snap = rng.clone();
  // consume a couple of values and XOR in mix
  const a = snap.next64() ^ mix64;
  const b = snap.next64() ^ ((mix64 << 13n) | (mix64 >> 51n));
  return xorshift128plus(a, b);
}

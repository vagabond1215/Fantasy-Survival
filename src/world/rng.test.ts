import { describe, it, expect } from "vitest";
import { canonicalizeSeed } from "./seed.js";
import { fromCanonicalSeed } from "./rng";

describe("xorshift128plus", () => {
  it("is deterministic for identical seed strings", async () => {
    const canonA = await canonicalizeSeed("  Café  ");
    const canonB = await canonicalizeSeed("Cafe\u0301");

    const rngA = fromCanonicalSeed(canonA);
    const rngB = fromCanonicalSeed(canonB);

    const seqA = Array.from({ length: 8 }, () => rngA.nextFloat01());
    const seqB = Array.from({ length: 8 }, () => rngB.nextFloat01());
    expect(seqA).toEqual(seqB);
    for (const x of seqA) expect(x).toBeGreaterThanOrEqual(0);
    for (const x of seqA) expect(x).toBeLessThan(1);
  });
});

import { describe, it, expect } from "vitest";
import { canonicalizeSeed } from "./seed";

describe("canonicalizeSeed", () => {
  it("normalizes NFC and trims", async () => {
    const a = await canonicalizeSeed("  Café  ");
    const b = await canonicalizeSeed("Cafe\u0301"); // 'e' + combining acute
    expect(a.normalized).toBe("Café");
    expect(b.normalized).toBe("Café");
    expect(a.hex).toBe(b.hex);
    expect(a.lanes).toEqual(b.lanes);
  });

  it("produces 8 lanes", async () => {
    const c = await canonicalizeSeed("seed");
    expect(c.lanes).toHaveLength(8);
    for (const lane of c.lanes) {
      expect(Number.isInteger(lane)).toBe(true);
      expect(lane >>> 0).toBe(lane);
    }
  });
});

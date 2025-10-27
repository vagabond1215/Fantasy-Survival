import { describe, expect, it } from 'vitest';
import { buildWorld, habitatProfilesById } from '../../src/worldgen';

describe('buildWorld', () => {
  it('defaults to the balanced frontier profile on normal difficulty', () => {
    const result = buildWorld();
    expect(result.difficulty).toBe('normal');
    expect(result.profile).toBe(habitatProfilesById['balanced-frontier']);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('produces deterministic output for the same seed and difficulty', () => {
    const first = buildWorld({ difficulty: 'hard', seed: 'spec-seed' });
    const second = buildWorld({ difficulty: 'hard', seed: 'spec-seed' });

    expect(second.profile).toBe(first.profile);
    expect(second.parameters).toEqual(first.parameters);
    expect(second.metrics).toEqual(first.metrics);
    expect(second.breakdown).toEqual(first.breakdown);
    expect(second.score).toBe(first.score);
  });

  it('respects explicit profile selection even when difficulty differs', () => {
    const result = buildWorld({ difficulty: 'easy', profileId: 'harsh-wilds', seed: 17 });
    expect(result.profile).toBe(habitatProfilesById['harsh-wilds']);
    expect(result.difficulty).toBe('easy');
  });
});

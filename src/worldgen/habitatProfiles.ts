import { defaultWorldParameters } from '../difficulty.js';
import { HabitatProfile, ObjectiveTarget, ParameterVector } from './solver/types';
import { cloneParameters, mergeParameterOverrides } from './utils/parameters';

const baseSeed: ParameterVector = (() => {
  const cloned = structuredClone(defaultWorldParameters) as Record<string, unknown>;
  delete cloned.mapType;
  return cloneParameters(cloned as ParameterVector);
})();

function createSeed(overrides: Partial<ParameterVector> = {}): ParameterVector {
  return mergeParameterOverrides(baseSeed, overrides);
}

const fertileValley: HabitatProfile = {
  id: 'fertile-valley',
  name: 'Fertile Valley',
  description: 'Gentle landscape with abundant water and fertile soils.',
  seed: createSeed({
    oreDensity: 52,
    waterTable: 66,
    rainfall: 64,
    temperature: 58,
    mountains: 42,
    rivers100: 62,
    lakes100: 60,
    streams100: 58,
    ponds100: 54,
    marshSwamp: 60,
    bogFen: 52,
    advanced: {
      vegetationScale: 68,
      waterGuaranteeRadius: 66,
      waterFlowMultiplier: 48
    }
  }),
  objectives: [
    { metric: 'rainfall', target: 70, weight: 1.2, tolerance: 3 },
    { metric: 'waterTable', target: 68, weight: 1.1, tolerance: 4 },
    { metric: 'temperature', target: 58, weight: 0.8, tolerance: 4 },
    { metric: 'rivers100', target: 66, weight: 0.9, tolerance: 5 },
    { metric: 'lakes100', target: 62, weight: 0.7, tolerance: 5 },
    { metric: 'streams100', target: 60, weight: 0.8, tolerance: 6 },
    { metric: 'ponds100', target: 56, weight: 0.7, tolerance: 6 },
    { metric: 'marshSwamp', target: 62, weight: 0.8, tolerance: 6 },
    { metric: 'bogFen', target: 54, weight: 0.7, tolerance: 6 },
    { metric: 'mountains', target: 38, weight: 0.6, tolerance: 6 },
    { metric: 'advanced.vegetationScale', target: 70, weight: 1.0, tolerance: 5 },
    { metric: 'advanced.waterGuaranteeRadius', target: 68, weight: 0.9, tolerance: 4 },
    { metric: 'advanced.waterFlowMultiplier', target: 46, weight: 0.7, tolerance: 6 },
    { metric: 'oreDensity', target: 52, weight: 0.5, tolerance: 6 }
  ]
};

const balancedFrontier: HabitatProfile = {
  id: 'balanced-frontier',
  name: 'Balanced Frontier',
  description: 'A resilient mix of terrain with steady access to water and ore.',
  seed: createSeed({
    oreDensity: 55,
    waterTable: 50,
    rainfall: 52,
    temperature: 50,
    mountains: 52,
    rivers100: 48,
    lakes100: 34,
    streams100: 44,
    ponds100: 32,
    marshSwamp: 30,
    bogFen: 26,
    advanced: {
      elevationVariance: 56,
      elevationScale: 54,
      vegetationScale: 54,
      oreNoiseScale: 54,
      oreThresholdOffset: 50,
      waterGuaranteeRadius: 50,
      waterFlowMultiplier: 52
    }
  }),
  objectives: [
    { metric: 'oreDensity', target: 56, weight: 0.9, tolerance: 5 },
    { metric: 'waterTable', target: 52, weight: 0.8, tolerance: 4 },
    { metric: 'rainfall', target: 54, weight: 0.8, tolerance: 4 },
    { metric: 'temperature', target: 50, weight: 0.7, tolerance: 5 },
    { metric: 'mountains', target: 54, weight: 0.8, tolerance: 6 },
    { metric: 'rivers100', target: 50, weight: 0.6, tolerance: 5 },
    { metric: 'lakes100', target: 36, weight: 0.5, tolerance: 6 },
    { metric: 'streams100', target: 46, weight: 0.6, tolerance: 6 },
    { metric: 'ponds100', target: 34, weight: 0.5, tolerance: 6 },
    { metric: 'marshSwamp', target: 32, weight: 0.6, tolerance: 6 },
    { metric: 'bogFen', target: 28, weight: 0.5, tolerance: 6 },
    { metric: 'advanced.elevationVariance', target: 58, weight: 0.7, tolerance: 5 },
    { metric: 'advanced.elevationScale', target: 56, weight: 0.6, tolerance: 5 },
    { metric: 'advanced.oreNoiseScale', target: 56, weight: 0.6, tolerance: 4 },
    { metric: 'advanced.oreThresholdOffset', target: 48, weight: 0.6, tolerance: 4 },
    { metric: 'advanced.waterFlowMultiplier', target: 54, weight: 0.5, tolerance: 5 }
  ]
};

const harshWilds: HabitatProfile = {
  id: 'harsh-wilds',
  name: 'Harsh Wilds',
  description: 'Severe terrain that tests settlers with sparse water and jagged cliffs.',
  seed: createSeed({
    oreDensity: 40,
    waterTable: 38,
    rainfall: 36,
    temperature: 42,
    mountains: 70,
    rivers100: 34,
    lakes100: 28,
    streams100: 28,
    ponds100: 20,
    marshSwamp: 18,
    bogFen: 16,
    advanced: {
      elevationVariance: 70,
      elevationScale: 66,
      vegetationScale: 40,
      oreNoiseScale: 64,
      oreThresholdOffset: 38,
      waterGuaranteeRadius: 34,
      waterFlowMultiplier: 64
    }
  }),
  objectives: [
    { metric: 'oreDensity', target: 42, weight: 0.8, tolerance: 5 },
    { metric: 'waterTable', target: 36, weight: 1.1, tolerance: 4 },
    { metric: 'rainfall', target: 34, weight: 1.1, tolerance: 4 },
    { metric: 'temperature', target: 44, weight: 0.6, tolerance: 6 },
    { metric: 'mountains', target: 72, weight: 1.2, tolerance: 5 },
    { metric: 'rivers100', target: 30, weight: 0.7, tolerance: 4 },
    { metric: 'lakes100', target: 26, weight: 0.6, tolerance: 4 },
    { metric: 'streams100', target: 32, weight: 0.7, tolerance: 5 },
    { metric: 'ponds100', target: 22, weight: 0.6, tolerance: 5 },
    { metric: 'marshSwamp', target: 20, weight: 0.7, tolerance: 4 },
    { metric: 'bogFen', target: 18, weight: 0.6, tolerance: 4 },
    { metric: 'advanced.elevationVariance', target: 72, weight: 0.9, tolerance: 4 },
    { metric: 'advanced.elevationScale', target: 68, weight: 0.8, tolerance: 4 },
    { metric: 'advanced.oreNoiseScale', target: 66, weight: 0.8, tolerance: 4 },
    { metric: 'advanced.oreThresholdOffset', target: 36, weight: 0.7, tolerance: 4 },
    { metric: 'advanced.waterGuaranteeRadius', target: 32, weight: 0.7, tolerance: 4 },
    { metric: 'advanced.waterFlowMultiplier', target: 66, weight: 0.6, tolerance: 5 }
  ]
};

export const habitatProfiles: HabitatProfile[] = [fertileValley, balancedFrontier, harshWilds];

export const habitatProfilesById: Record<string, HabitatProfile> = Object.fromEntries(
  habitatProfiles.map(profile => [profile.id, profile])
);

export const difficultyToTargets: Record<string, HabitatProfile> = {
  easy: habitatProfilesById['fertile-valley'],
  normal: habitatProfilesById['balanced-frontier'],
  hard: habitatProfilesById['harsh-wilds'],
  custom: habitatProfilesById['balanced-frontier']
};

export function objectivesForDifficulty(difficulty: string): ObjectiveTarget[] {
  const profile = difficultyToTargets[difficulty] || habitatProfilesById['balanced-frontier'];
  return profile.objectives;
}

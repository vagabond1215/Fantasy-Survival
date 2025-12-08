import { resolveWorldParameters } from '../difficulty.js';
import { createSeededRng } from '../utils/random.js';
import { AdjustmentSolver } from './solver/AdjustmentSolver';
import {
  BuildWorldOptions,
  BuildWorldResult,
  MetricDefinition,
  ObjectiveTarget,
  ParameterDefinition,
  ParameterVector
} from './solver/types';
import { difficultyToTargets, habitatProfilesById } from './habitatProfiles';
import {
  cloneParameters,
  getParameterValue,
  jitterParameterVector,
  mergeParameterOverrides
} from './utils/parameters';
import { scoreObjectives } from './utils/objectives';

const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  { key: 'oreDensity', min: 0, max: 100, step: 1 },
  { key: 'waterTable', min: 0, max: 100, step: 1 },
  { key: 'temperature', min: 0, max: 100, step: 1 },
  { key: 'rainfall', min: 0, max: 100, step: 1 },
  { key: 'mountains', min: 0, max: 100, step: 1 },
  { key: 'rivers100', min: 0, max: 100, step: 1 },
  { key: 'lakes100', min: 0, max: 100, step: 1 },
  { key: 'streams100', min: 0, max: 100, step: 1 },
  { key: 'ponds100', min: 0, max: 100, step: 1 },
  { key: 'marshSwamp', min: 0, max: 100, step: 1 },
  { key: 'bogFen', min: 0, max: 100, step: 1 },
  { key: 'advanced.elevationVariance', min: 0, max: 100, step: 1 },
  { key: 'advanced.elevationScale', min: 0, max: 100, step: 1 },
  { key: 'advanced.vegetationScale', min: 0, max: 100, step: 1 },
  { key: 'advanced.oreNoiseScale', min: 0, max: 100, step: 1 },
  { key: 'advanced.oreThresholdOffset', min: 0, max: 100, step: 1 },
  { key: 'advanced.waterGuaranteeRadius', min: 0, max: 100, step: 1 },
  { key: 'advanced.waterFlowMultiplier', min: 0, max: 100, step: 1 }
];

const METRIC_DEFINITIONS: MetricDefinition[] = dedupeMetrics(
  PARAMETER_DEFINITIONS.map(definition => definition.key)
).map(key => ({
  key,
  compute: (parameters: ParameterVector) => getParameterValue(parameters, key)
}));

function dedupeMetrics(keys: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of keys) {
    if (!seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
}

export function buildWorld(options: BuildWorldOptions = {}): BuildWorldResult {
  const difficulty = (options.difficulty || 'normal').toLowerCase();
  const fallbackProfile = difficultyToTargets.normal;
  const selectedProfile =
    (options.profileId && habitatProfilesById[options.profileId]) ||
    difficultyToTargets[difficulty] ||
    fallbackProfile;

  const rng = createSeededRng(options.seed);
  const objectives = (options.objectives || selectedProfile.objectives).map(objective => ({ ...objective }));

  const baseSeed = selectedProfile.seed;
  const seeded = mergeParameterOverrides(baseSeed, options.overrides);
  const resolvedSeed = resolveWorldParameters(seeded as any);
  const parameterSeed = cloneParameters(resolvedSeed as ParameterVector);
  const initial = jitterParameterVector(parameterSeed, PARAMETER_DEFINITIONS, rng, 4);

  const solver = new AdjustmentSolver({
    parameters: PARAMETER_DEFINITIONS,
    metrics: METRIC_DEFINITIONS,
    objectives,
    rng,
    maxIterations: 220,
    stagnationLimit: 10,
    maxRegenerations: 6
  });

  const result = solver.solve(initial, {
    onRegeneration: context =>
      jitterParameterVector(context.best, PARAMETER_DEFINITIONS, rng, 8)
  });

  const normalized = resolveWorldParameters(result.parameters as any);
  const finalParameters = cloneParameters(normalized as ParameterVector);
  const metrics: Record<string, number | string> = {};
  for (const metric of METRIC_DEFINITIONS) {
    metrics[metric.key] = metric.compute(finalParameters);
  }
  if ('mapType' in finalParameters) {
    metrics.mapType = (finalParameters as any).mapType as string;
  }
  const { breakdown, score } = scoreObjectives(metrics, objectives);

  return {
    difficulty,
    profile: selectedProfile,
    parameters: finalParameters,
    metrics,
    breakdown,
    score,
    iterations: result.iterations,
    regenerations: result.regenerations
  };
}

export const parameterDefinitions = PARAMETER_DEFINITIONS;
export const metricDefinitions = METRIC_DEFINITIONS;

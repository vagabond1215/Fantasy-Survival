import { resolveWorldParameters } from '../difficulty.js';
import { getBiome } from '../biomes.js';
import { resolveWaterRules } from '../map/generation/waterRules.js';
import { createSeededRng } from '../utils/random.js';
import { AdjustmentSolver } from './solver/AdjustmentSolver';
import {
  BiomeDescriptor,
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

function resolveBiome(input?: string | BiomeDescriptor) {
  if (!input) return undefined;
  if (typeof input === 'string') {
    return getBiome(input) ?? { id: input };
  }
  if (input.id) {
    return getBiome(input.id) ?? input;
  }
  return input;
}

function resolveHydrologyMetrics(parameters: ParameterVector, biome?: any) {
  const resolved = resolveWorldParameters(parameters as any);
  const hydrology = resolveHydrologySnapshot(biome, resolved);
  const wetlandWeights = hydrology?.wetlandWeights ?? {};
  const marshWeight = Number(wetlandWeights.marsh ?? 0);
  const bogWeight = Number(wetlandWeights.bog ?? 0);
  const swampWeight = Number(wetlandWeights.swamp ?? 0);
  const marineEdge = hydrology?.marineEdgeWeights ?? {};
  let estuaryWeight = Math.round((marineEdge.estuary ?? 0) * 1000) / 10;
  if (isCoastalBiome(biome)) {
    estuaryWeight = estuaryWeight * 1.2 + 4;
  }

  return {
    'hydrology.marshiness': Math.round((hydrology?.marshiness ?? 0) * 1000) / 10,
    'hydrology.wetlandShare': Math.round((marshWeight + swampWeight) * 1000) / 10,
    'hydrology.bogToMarshRatio': Math.round((bogWeight / Math.max(0.01, marshWeight)) * 1000) / 10,
    'hydrology.lakeMinArea': Math.round(hydrology?.lakeMinArea ?? 0),
    'hydrology.lakeMinDepth': Math.round((hydrology?.lakeMinDepth ?? 0) * 1000) / 10,
    'hydrology.marineEdge.estuary': estuaryWeight,
    'hydrology.latitudeBias': Math.round((hydrology?.latitudeBias ?? 0) * 1000) / 10,
    'hydrology.elevationBias': Math.round((hydrology?.elevationBias ?? 0) * 1000) / 10
  } as Record<string, number>;
}

function resolveHydrologySnapshot(biome: any, parameters: ParameterVector) {
  // Align with defaults used by the hydrology system when sizing map tiles.
  const width = 64;
  const height = 64;
  return resolveWaterRules(biome, parameters, width, height);
}

function createHydrologyMetricDefinitions(biome?: any): MetricDefinition[] {
  const baseKeys = [
    'hydrology.marshiness',
    'hydrology.wetlandShare',
    'hydrology.bogToMarshRatio',
    'hydrology.lakeMinArea',
    'hydrology.lakeMinDepth',
    'hydrology.marineEdge.estuary',
    'hydrology.latitudeBias',
    'hydrology.elevationBias'
  ];

  return baseKeys.map(key => ({
    key,
    compute: (parameters: ParameterVector) => resolveHydrologyMetrics(parameters, biome)[key]
  }));
}

function createMetricDefinitions(biome?: any): MetricDefinition[] {
  const base = dedupeMetrics(PARAMETER_DEFINITIONS.map(definition => definition.key)).map(key => ({
    key,
    compute: (parameters: ParameterVector) => getParameterValue(parameters, key)
  }));
  return [...base, ...createHydrologyMetricDefinitions(biome)];
}

function createHydrologyObjectives(
  biome: any,
  parameters: ParameterVector,
  weights: Partial<Record<string, Pick<ObjectiveTarget, 'weight' | 'tolerance'>>> = {}
): ObjectiveTarget[] {
  if (!biome) return [];
  const hydrologyMetrics = resolveHydrologyMetrics(parameters, biome);
  const adjustedMetrics: Record<string, number> = { ...hydrologyMetrics };

  if (isWetlandBiome(biome)) {
    adjustedMetrics['hydrology.marshiness'] = Math.min(100, (adjustedMetrics['hydrology.marshiness'] ?? 0) * 1.15);
    adjustedMetrics['hydrology.bogToMarshRatio'] = Math.max(5, (adjustedMetrics['hydrology.bogToMarshRatio'] ?? 0) * 0.65);
  }

  if (isCoastalBiome(biome)) {
    adjustedMetrics['hydrology.marineEdge.estuary'] =
      (adjustedMetrics['hydrology.marineEdge.estuary'] ?? 0) * 2 + 12;
  }
  const template: Record<string, { weight: number; tolerance: number }> = {
    'hydrology.marshiness': { weight: 0.9, tolerance: 8 },
    'hydrology.wetlandShare': { weight: 0.85, tolerance: 10 },
    'hydrology.bogToMarshRatio': { weight: 0.75, tolerance: 16 },
    'hydrology.lakeMinArea': { weight: 0.6, tolerance: 5 },
    'hydrology.lakeMinDepth': { weight: 0.65, tolerance: 8 },
    'hydrology.marineEdge.estuary': { weight: 1.05, tolerance: 10 },
    'hydrology.latitudeBias': { weight: 0.5, tolerance: 12 },
    'hydrology.elevationBias': { weight: 0.5, tolerance: 12 }
  };

  const resolvedWeights = { ...template, ...weights };
  const objectives: ObjectiveTarget[] = [];
  for (const [metric, config] of Object.entries(resolvedWeights)) {
    const value = adjustedMetrics[metric] ?? hydrologyMetrics[metric];
    if (!Number.isFinite(value)) continue;
    objectives.push({
      metric,
      target: value,
      weight: config.weight,
      tolerance: config.tolerance
    });
  }
  return objectives;
}

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

function isWetlandBiome(biome: any): boolean {
  const category = typeof biome?.category === 'string' ? biome.category.toLowerCase() : '';
  if (category.includes('wetland')) return true;
  const terrain = typeof biome?.openTerrainId === 'string' ? biome.openTerrainId.toLowerCase() : '';
  if (terrain.includes('wetland')) return true;
  const features: string[] = Array.isArray(biome?.features) ? biome.features : [];
  return features.some(feature => /marsh|bog|fen|swamp|delta|mangrove/i.test(feature));
}

function isCoastalBiome(biome: any): boolean {
  const category = typeof biome?.category === 'string' ? biome.category.toLowerCase() : '';
  const terrain = typeof biome?.openTerrainId === 'string' ? biome.openTerrainId.toLowerCase() : '';
  if (category.includes('coastal') || terrain.includes('coast')) return true;
  const features: string[] = Array.isArray(biome?.features) ? biome.features : [];
  return features.some(feature => /coast|shore|estuary|beach|reef|mangrove/i.test(feature));
}

export function buildWorld(options: BuildWorldOptions = {}): BuildWorldResult {
  const difficulty = (options.difficulty || 'normal').toLowerCase();
  const fallbackProfile = difficultyToTargets.normal;
  const selectedProfile =
    (options.profileId && habitatProfilesById[options.profileId]) ||
    difficultyToTargets[difficulty] ||
    fallbackProfile;

  const biome = resolveBiome(options.biome);
  const metricsForRun = createMetricDefinitions(biome);

  const rng = createSeededRng(options.seed);
  const baseObjectives = (options.objectives || selectedProfile.objectives).map(objective => ({ ...objective }));

  const baseSeed = selectedProfile.seed;
  const seeded = mergeParameterOverrides(baseSeed, options.overrides);
  const resolvedSeed = resolveWorldParameters(seeded as any);
  const biomeObjectives = createHydrologyObjectives(biome, resolvedSeed as ParameterVector);
  const objectives = [...baseObjectives, ...biomeObjectives];
  const parameterSeed = cloneParameters(resolvedSeed as ParameterVector);
  const initial = jitterParameterVector(parameterSeed, PARAMETER_DEFINITIONS, rng, 4);

  const solver = new AdjustmentSolver({
    parameters: PARAMETER_DEFINITIONS,
    metrics: metricsForRun,
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
  for (const metric of metricsForRun) {
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
export const metricDefinitions = createMetricDefinitions();

import { getBiome } from '../../biomes.js';
import type { TileClimate, BiomeClassification } from '../types';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

type BiomeContext = {
  readonly climate: TileClimate;
  readonly elevation: number;
  readonly temperature: number;
  readonly moisture: number;
  readonly runoff: number;
};

type BiomeRule = {
  readonly id: string;
  readonly test: (context: BiomeContext) => boolean;
  readonly score: (context: BiomeContext) => number;
  readonly reason: string;
};

const BIOME_RULES: readonly BiomeRule[] = [
  {
    id: 'mountain-alpine',
    reason: 'high elevation alpine conditions',
    test: ctx => ctx.elevation >= 0.78 && (ctx.climate.temperature === 'frigid' || ctx.climate.temperature === 'cold'),
    score: ctx => ctx.elevation,
  },
  {
    id: 'mountain-cloudforest',
    reason: 'warm, humid highlands',
    test: ctx => ctx.elevation >= 0.62 && ctx.climate.moisture !== 'arid' && (ctx.climate.temperature === 'warm' || ctx.climate.temperature === 'hot'),
    score: ctx => (ctx.elevation + ctx.moisture) * 0.5,
  },
  {
    id: 'wetland-floodplain',
    reason: 'saturated lowlands with persistent runoff',
    test: ctx => ctx.elevation <= 0.35 && ctx.runoff >= 0.6 && (ctx.climate.moisture === 'humid' || ctx.climate.moisture === 'wet'),
    score: ctx => (1 - ctx.elevation) * 0.6 + ctx.runoff * 0.4,
  },
  {
    id: 'coastal-mangrove',
    reason: 'warm wetlands near sea level',
    test: ctx => ctx.elevation <= 0.18 && (ctx.climate.temperature === 'warm' || ctx.climate.temperature === 'hot') && ctx.climate.moisture === 'wet',
    score: ctx => (1 - ctx.elevation) * 0.5 + ctx.moisture * 0.5,
  },
  {
    id: 'temperate-coastal-rainforest',
    reason: 'cool, very wet regions',
    test: ctx => (ctx.climate.temperature === 'cool' || ctx.climate.temperature === 'mild') && ctx.climate.moisture === 'wet',
    score: ctx => ctx.moisture,
  },
  {
    id: 'equatorial-rainforest',
    reason: 'hot and perennially wet climates',
    test: ctx => ctx.climate.temperature === 'hot' && ctx.climate.moisture === 'wet',
    score: ctx => ctx.moisture,
  },
  {
    id: 'tropical-monsoon-forest',
    reason: 'hot, humid regions with seasonal runoff',
    test: ctx => ctx.climate.temperature === 'hot' && (ctx.climate.moisture === 'humid' || ctx.climate.moisture === 'wet'),
    score: ctx => ctx.moisture * 0.6 + ctx.runoff * 0.4,
  },
  {
    id: 'tropical-savanna',
    reason: 'warm climates with moderate moisture',
    test: ctx => (ctx.climate.temperature === 'warm' || ctx.climate.temperature === 'hot') && (ctx.climate.moisture === 'moderate' || ctx.climate.moisture === 'semi-arid'),
    score: ctx => ctx.temperature,
  },
  {
    id: 'mediterranean-scrub',
    reason: 'mild, dry regions',
    test: ctx => (ctx.climate.temperature === 'mild' || ctx.climate.temperature === 'warm') && (ctx.climate.moisture === 'semi-arid' || ctx.climate.moisture === 'arid'),
    score: ctx => 1 - ctx.moisture,
  },
  {
    id: 'temperate-maritime',
    reason: 'cool coasts with steady moisture',
    test: ctx => (ctx.climate.temperature === 'cool' || ctx.climate.temperature === 'mild') && ctx.climate.moisture === 'humid',
    score: ctx => ctx.moisture,
  },
  {
    id: 'temperate-broadleaf',
    reason: 'temperate climates with balanced moisture',
    test: ctx => ctx.climate.temperature === 'mild' && ctx.climate.moisture === 'moderate',
    score: ctx => 1 - Math.abs(0.5 - ctx.temperature),
  },
  {
    id: 'boreal-conifer',
    reason: 'cold climates with moderate moisture',
    test: ctx => (ctx.climate.temperature === 'cold' || ctx.climate.temperature === 'frigid') && ctx.climate.moisture !== 'arid',
    score: ctx => 1 - ctx.temperature,
  },
];

const CLIMATE_TABLE: Record<string, Record<string, string>> = {
  frigid: {
    'arid': 'mountain-alpine',
    'semi-arid': 'mountain-alpine',
    moderate: 'boreal-conifer',
    humid: 'boreal-conifer',
    wet: 'mountain-alpine',
  },
  cold: {
    'arid': 'mediterranean-scrub',
    'semi-arid': 'mediterranean-scrub',
    moderate: 'boreal-conifer',
    humid: 'temperate-broadleaf',
    wet: 'temperate-coastal-rainforest',
  },
  cool: {
    'arid': 'mediterranean-scrub',
    'semi-arid': 'temperate-broadleaf',
    moderate: 'temperate-broadleaf',
    humid: 'temperate-maritime',
    wet: 'temperate-coastal-rainforest',
  },
  mild: {
    'arid': 'mediterranean-scrub',
    'semi-arid': 'temperate-broadleaf',
    moderate: 'temperate-broadleaf',
    humid: 'temperate-maritime',
    wet: 'wetland-floodplain',
  },
  warm: {
    'arid': 'tropical-savanna',
    'semi-arid': 'tropical-savanna',
    moderate: 'tropical-savanna',
    humid: 'tropical-monsoon-forest',
    wet: 'wetland-floodplain',
  },
  hot: {
    'arid': 'tropical-savanna',
    'semi-arid': 'tropical-savanna',
    moderate: 'tropical-monsoon-forest',
    humid: 'equatorial-rainforest',
    wet: 'coastal-mangrove',
  },
};

function fallbackBiomeId(climate: TileClimate): string {
  const tempRow = CLIMATE_TABLE[climate.temperature];
  if (!tempRow) return 'temperate-broadleaf';
  return tempRow[climate.moisture] || 'temperate-broadleaf';
}

export function classifyBiome(context: BiomeContext): BiomeClassification {
  let best: BiomeClassification | null = null;
  for (const rule of BIOME_RULES) {
    if (!rule.test(context)) continue;
    const score = clamp01(rule.score(context));
    if (!best || score > best.score) {
      best = {
        id: rule.id,
        score,
        reason: rule.reason,
      };
    }
  }

  const selected = best ?? {
    id: fallbackBiomeId(context.climate),
    score: 0.35,
    reason: 'fallback climate lookup',
  };

  const biome = getBiome(selected.id);
  if (!biome) {
    return {
      id: 'temperate-broadleaf',
      score: selected.score,
      reason: `${selected.reason} (defaulted to temperate-broadleaf)`,
    };
  }

  return selected;
}

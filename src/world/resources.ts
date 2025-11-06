import { getBiome } from '../biomes.js';
import type { TileClimate, TileResourceSummary } from './types';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

type ResourceContext = {
  readonly elevation: number;
  readonly temperature: number;
  readonly moisture: number;
  readonly runoff: number;
  readonly biomeId: string;
  readonly climate: TileClimate;
};

function vegetationDensity(context: ResourceContext): number {
  const { temperature, moisture, elevation, biomeId } = context;
  const biome = getBiome(biomeId);
  const woodMod = biome?.woodMod ?? 1;
  const openLand = clamp01(biome?.openLand ?? 0.5);
  const tempSuitability = 1 - Math.abs(temperature - 0.58);
  const moistureSuitability = clamp01(moisture * 0.75 + context.runoff * 0.25);
  const elevationPenalty = Math.max(0, elevation - 0.78) * 2;
  const density = clamp01((tempSuitability * 0.6 + moistureSuitability * 0.4) * (1 - elevationPenalty));
  return clamp01(density * (0.8 + woodMod * 0.4) * (0.6 + openLand * 0.4));
}

function orePotential(context: ResourceContext): number {
  const { elevation, moisture, biomeId } = context;
  const biome = getBiome(biomeId);
  const variance = biome?.elevation?.variance ?? 0.2;
  const base = clamp01(0.35 + elevation * 0.45 + variance * 0.3 - moisture * 0.2);
  return base;
}

function freshwaterScore(context: ResourceContext): number {
  const { runoff, moisture, biomeId } = context;
  const biome = getBiome(biomeId);
  const freshwater = biome?.freshwater;
  const freshwaterPresence = freshwater
    ? (freshwater.streams + freshwater.springs + freshwater.lakes + freshwater.wetlands) / 20
    : 0.2;
  return clamp01(runoff * 0.6 + moisture * 0.25 + freshwaterPresence * 0.4);
}

function foragePotential(context: ResourceContext, vegetation: number): number {
  const { climate } = context;
  const temperatureMod = climate.temperature === 'frigid' ? 0.3 : climate.temperature === 'cold' ? 0.5 : 1;
  const moistureMod = climate.moisture === 'arid' ? 0.35 : climate.moisture === 'semi-arid' ? 0.6 : 1;
  return clamp01(vegetation * 0.8 * temperatureMod * moistureMod + context.moisture * 0.2);
}

function fertilityScore(context: ResourceContext, vegetation: number): number {
  const { moisture, temperature, elevation } = context;
  const moistureSuitability = clamp01(moisture * 0.8 + vegetation * 0.2);
  const temperatureSuitability = 1 - Math.abs(temperature - 0.55);
  const elevationPenalty = Math.max(0, elevation - 0.65) * 1.4;
  return clamp01((moistureSuitability * 0.6 + temperatureSuitability * 0.4) * (1 - elevationPenalty));
}

export function calculateTileResources(context: ResourceContext): TileResourceSummary {
  const vegetation = vegetationDensity(context);
  const wood = clamp01(vegetation * 0.85);
  const forage = foragePotential(context, vegetation);
  const ore = orePotential(context);
  const freshWater = freshwaterScore(context);
  const fertility = fertilityScore(context, vegetation);

  return Object.freeze({ vegetation, wood, forage, ore, freshWater, fertility });
}

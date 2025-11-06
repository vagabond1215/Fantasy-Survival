import type { CanonicalSeed } from './seed.js';
import type { XorShift128Plus } from './rng.js';

export type WorldDimensions = {
  readonly width: number;
  readonly height: number;
  readonly size: number;
};

export type WorldLayer = Float32Array;

export type WorldLayers = {
  readonly elevation: WorldLayer;
  readonly temperature: WorldLayer;
  readonly moisture: WorldLayer;
  readonly runoff: WorldLayer;
};

export type TemperatureBand =
  | 'frigid'
  | 'cold'
  | 'cool'
  | 'mild'
  | 'warm'
  | 'hot';

export type MoistureBand = 'arid' | 'semi-arid' | 'moderate' | 'humid' | 'wet';

export type RunoffLevel = 'minimal' | 'seasonal' | 'perennial';

export type TileClimate = {
  readonly temperature: TemperatureBand;
  readonly moisture: MoistureBand;
  readonly runoff: RunoffLevel;
  readonly frostRisk: number;
};

export type BiomeClassification = {
  readonly id: string;
  readonly score: number;
  readonly reason: string;
};

export type TileResourceSummary = {
  readonly vegetation: number;
  readonly wood: number;
  readonly forage: number;
  readonly ore: number;
  readonly freshWater: number;
  readonly fertility: number;
};

export type WorldTileData = {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly temperature: number;
  readonly moisture: number;
  readonly runoff: number;
  readonly climate: TileClimate;
  readonly biome: BiomeClassification;
  readonly resources: TileResourceSummary;
};

export type WorldGenerationOptions = {
  readonly width?: number;
  readonly height?: number;
  readonly seed?: CanonicalSeed;
  readonly rng?: XorShift128Plus;
};

export type WorldGenerationResult = {
  readonly dimensions: WorldDimensions;
  readonly layers: WorldLayers;
  readonly tiles: readonly WorldTileData[];
};

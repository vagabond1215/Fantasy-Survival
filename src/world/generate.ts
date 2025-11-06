import { xorshift128plus, fromCanonicalSeed } from './rng.js';
import type { CanonicalSeed } from './seed.js';
import { classifyClimate } from './climate';
import { classifyBiome } from './biome/classifier';
import { calculateTileResources } from './resources';
import type {
  WorldGenerationOptions,
  WorldGenerationResult,
  WorldTileData,
  TileClimate,
} from './types';

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

const DEFAULT_LANES: readonly number[] = [
  0x6d2b79f5,
  0x1b873593,
  0x85ebca6b,
  0xc2b2ae35,
  0x27d4eb2d,
  0x165667b1,
  0xd3a2646c,
  0xfd7046c5,
];

function ensureSeedLanes(seed: CanonicalSeed | undefined): readonly number[] {
  if (seed?.lanes && seed.lanes.length >= 8) {
    return seed.lanes.map(lane => lane >>> 0);
  }
  return DEFAULT_LANES;
}

function makeNoiseSeed(lanes: readonly number[], jitter: number, laneA: number, laneB: number, salt: number): number {
  const a = lanes[laneA % lanes.length] >>> 0;
  const b = lanes[laneB % lanes.length] >>> 0;
  let h = (a ^ ((b << 7) | (b >>> 25)) ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35) >>> 0;
  h = (h + jitter) >>> 0;
  return h >>> 0;
}

function hash2d(x: number, y: number, seed: number): number {
  const xi = Math.trunc(x);
  const yi = Math.trunc(y);
  let h = Math.imul(xi ^ seed, 0x27d4eb2d) ^ Math.imul(yi ^ (seed >>> 1), 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x27d4eb2d) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 0xffffffff;
}

function fractalNoise(x: number, y: number, seed: number): number {
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let norm = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    const sampleX = (x * frequency * 8192) + octave * 4096;
    const sampleY = (y * frequency * 8192) + octave * 2048;
    const noise = hash2d(sampleX, sampleY, seed ^ (octave * 0x9e3779b1));
    total += noise * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return norm > 0 ? total / norm : 0;
}

function normalized(value: number, max: number): number {
  if (max <= 1) return 0;
  return value / (max - 1);
}

function computeSlope(index: number, elevation: Float32Array, width: number, height: number): number {
  const x = index % width;
  const y = Math.trunc(index / width);
  const center = elevation[index];
  const left = x > 0 ? elevation[index - 1] : center;
  const right = x + 1 < width ? elevation[index + 1] : center;
  const up = y > 0 ? elevation[index - width] : center;
  const down = y + 1 < height ? elevation[index + width] : center;
  const slope =
    Math.abs(center - left) +
    Math.abs(center - right) +
    Math.abs(center - up) +
    Math.abs(center - down);
  return clamp01(slope * 0.5);
}

function selectRng(options: WorldGenerationOptions): ReturnType<typeof fromCanonicalSeed> {
  if (options.rng) return options.rng;
  if (options.seed) return fromCanonicalSeed(options.seed);
  return xorshift128plus(0x12345678n, 0x9abcdef0n);
}

export function generateWorld(options: WorldGenerationOptions = {}): WorldGenerationResult {
  const width = Math.max(1, Math.trunc(options.width ?? 128));
  const height = Math.max(1, Math.trunc(options.height ?? 128));
  const size = width * height;

  const rng = selectRng(options);
  const jitter = Math.floor(rng.nextFloat01() * 0xffffffff) >>> 0;
  const lanes = ensureSeedLanes(options.seed);

  const seeds = {
    elevation: makeNoiseSeed(lanes, jitter, 0, 4, 0x52dce729),
    secondaryElevation: makeNoiseSeed(lanes, jitter, 1, 5, 0x7f4a7c15),
    temperature: makeNoiseSeed(lanes, jitter, 2, 6, 0x1b873593),
    moisture: makeNoiseSeed(lanes, jitter, 3, 7, 0x85ebca6b),
  };

  const elevation = new Float32Array(size);
  const temperature = new Float32Array(size);
  const moisture = new Float32Array(size);
  const runoff = new Float32Array(size);

  for (let y = 0; y < height; y += 1) {
    const ny = normalized(y, height);
    const latDistance = Math.abs(ny - 0.5);
    for (let x = 0; x < width; x += 1) {
      const nx = normalized(x, width);
      const idx = y * width + x;
      const radial = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
      const continentalMask = clamp01(1 - Math.pow(radial * 1.3, 1.35));

      const baseElev = fractalNoise(nx * 1.1, ny * 1.1, seeds.elevation);
      const ridge = fractalNoise(nx * 2.4, ny * 2.4, seeds.secondaryElevation);
      const rawElevation = clamp01(baseElev * 0.65 + ridge * 0.35);
      const elevationValue = clamp01(rawElevation * 0.75 + continentalMask * 0.55 - 0.2);

      const tempNoise = fractalNoise(nx * 1.7 + rawElevation * 0.15, ny * 1.3, seeds.temperature);
      const latFactor = clamp01(1 - latDistance * 1.28);
      const elevationChill = elevationValue * 0.35;
      const temperatureValue = clamp01(latFactor * 0.72 + tempNoise * 0.28 - elevationChill + 0.05);

      const moistureNoise = fractalNoise(nx * 2.3, ny * 2.1, seeds.moisture);
      const oceanMoisture = clamp01((1 - elevationValue) * 0.45);
      const equatorialMoisture = clamp01((1 - latDistance) * 0.15);
      const moistureValue = clamp01(moistureNoise * 0.65 + oceanMoisture + equatorialMoisture - 0.05);

      elevation[idx] = elevationValue;
      temperature[idx] = temperatureValue;
      moisture[idx] = moistureValue;
    }
  }

  for (let i = 0; i < size; i += 1) {
    const slope = computeSlope(i, elevation, width, height);
    const runoffValue = clamp01(moisture[i] * 0.45 + (1 - elevation[i]) * 0.25 + slope * 0.5);
    runoff[i] = runoffValue;
  }

  const tiles: WorldTileData[] = new Array(size);

  for (let i = 0; i < size; i += 1) {
    const x = i % width;
    const y = Math.trunc(i / width);
    const elev = elevation[i];
    const temp = temperature[i];
    const moist = moisture[i];
    const run = runoff[i];
    const climate: TileClimate = classifyClimate(temp, moist, run);
    const biome = classifyBiome({ climate, elevation: elev, temperature: temp, moisture: moist, runoff: run });
    const resources = calculateTileResources({
      elevation: elev,
      temperature: temp,
      moisture: moist,
      runoff: run,
      biomeId: biome.id,
      climate,
    });

    tiles[i] = Object.freeze({
      index: i,
      x,
      y,
      elevation: elev,
      temperature: temp,
      moisture: moist,
      runoff: run,
      climate,
      biome,
      resources,
    });
  }

  return {
    dimensions: Object.freeze({ width, height, size }),
    layers: Object.freeze({ elevation, temperature, moisture, runoff }),
    tiles: Object.freeze(tiles),
  };
}

import { getBiome } from '../biomes.js';
import { canonicalizeSeed } from './seed.js';
import { xorshift128plus } from './rng.js';
const DEFAULT_LANES = [
    0x6d2b79f5,
    0x1b873593,
    0x85ebca6b,
    0xc2b2ae35,
    0x27d4eb2d,
    0x165667b1,
    0xd3a2646c,
    0xfd7046c5,
];
const FRACTAL_OCTAVES = 5;
const FRACTAL_SCALE = 8192;
const TemperatureBandLabels = ['frigid', 'cold', 'cool', 'mild', 'warm', 'hot'];
export const TemperatureBandCode = {
    Frigid: 0,
    Cold: 1,
    Cool: 2,
    Mild: 3,
    Warm: 4,
    Hot: 5,
};
const MoistureBandLabels = ['arid', 'semi-arid', 'moderate', 'humid', 'wet'];
export const MoistureBandCode = {
    Arid: 0,
    SemiArid: 1,
    Moderate: 2,
    Humid: 3,
    Wet: 4,
};
const RunoffLevelLabels = ['minimal', 'seasonal', 'perennial'];
export const RunoffLevelCode = {
    Minimal: 0,
    Seasonal: 1,
    Perennial: 2,
};
const BiomeIds = [
    'mountain-alpine',
    'mountain-cloudforest',
    'wetland-floodplain',
    'coastal-mangrove',
    'temperate-coastal-rainforest',
    'equatorial-rainforest',
    'tropical-monsoon-forest',
    'tropical-savanna',
    'mediterranean-scrub',
    'temperate-maritime',
    'temperate-broadleaf',
    'boreal-conifer',
];
export const BiomeCode = {
    MountainAlpine: 0,
    MountainCloudforest: 1,
    WetlandFloodplain: 2,
    CoastalMangrove: 3,
    TemperateCoastalRainforest: 4,
    EquatorialRainforest: 5,
    TropicalMonsoonForest: 6,
    TropicalSavanna: 7,
    MediterraneanScrub: 8,
    TemperateMaritime: 9,
    TemperateBroadleaf: 10,
    BorealConifer: 11,
};
const BiomeCodeFromId = BiomeIds.reduce((acc, id, index) => {
    acc[id] = index;
    return acc;
}, {});
export function biomeCodeToId(code) {
    return BiomeIds[code] ?? 'temperate-broadleaf';
}
export function biomeIdToCode(id) {
    return BiomeCodeFromId[id] ?? BiomeCode.TemperateBroadleaf;
}
const BiomeReasonLabels = [
    'high elevation alpine conditions',
    'warm, humid highlands',
    'saturated lowlands with persistent runoff',
    'warm wetlands near sea level',
    'cool, very wet regions',
    'hot and perennially wet climates',
    'hot, humid regions with seasonal runoff',
    'warm climates with moderate moisture',
    'mild, dry regions',
    'cool coasts with steady moisture',
    'temperate climates with balanced moisture',
    'cold climates with moderate moisture',
    'fallback climate lookup',
];
const biomeResourceCoefficients = BiomeIds.map(id => {
    const biome = getBiome(id);
    return {
        woodMod: biome?.woodMod ?? 1,
        openLand: clamp01(biome?.openLand ?? 0.5),
        freshwaterPresence: biome?.freshwater
            ? (biome.freshwater.streams + biome.freshwater.springs + biome.freshwater.lakes + biome.freshwater.wetlands) / 20
            : 0.2,
        elevationVariance: biome?.elevation?.variance ?? 0.2,
    };
});
const floatScratch = new Float32Array(1);
const uintScratch = new Uint32Array(floatScratch.buffer);
function floatToUint32(value) {
    floatScratch[0] = value;
    return uintScratch[0] >>> 0;
}
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    if (value <= 0)
        return 0;
    if (value >= 1)
        return 1;
    return value;
}
function normalizeDimension(value, fallback) {
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(1, Math.trunc(value));
}
function sanitizeBias(value, maxMagnitude) {
    if (!Number.isFinite(value))
        return 0;
    const limited = Math.max(-maxMagnitude, Math.min(maxMagnitude, value));
    return Math.fround(limited);
}
function sanitizeConfig(params) {
    const width = normalizeDimension(params.width, 128);
    const height = normalizeDimension(params.height, 128);
    const tuning = params.params ?? {};
    const elevationBias = sanitizeBias(tuning.elevationBias, 0.45);
    const temperatureBias = sanitizeBias(tuning.temperatureBias, 0.45);
    const moistureBias = sanitizeBias(tuning.moistureBias, 0.45);
    const baselineSuggestions = Math.max(16, Math.min(256, Math.floor((width * height) / 64)));
    const desiredSuggestions = Math.trunc(tuning.spawnSuggestionCount ?? baselineSuggestions);
    const spawnSuggestionCount = Math.max(8, Math.min(width * height, desiredSuggestions));
    return { width, height, elevationBias, temperatureBias, moistureBias, spawnSuggestionCount };
}
function fingerprintConfig(config) {
    let hash = 0x811c9dc5;
    hash = mix32(hash, config.width >>> 0);
    hash = mix32(hash, config.height >>> 0);
    hash = mix32(hash, floatToUint32(config.elevationBias));
    hash = mix32(hash, floatToUint32(config.temperatureBias));
    hash = mix32(hash, floatToUint32(config.moistureBias));
    hash = mix32(hash, config.spawnSuggestionCount >>> 0);
    return hash >>> 0;
}
function ensureSeedLanes(seed) {
    if (seed?.lanes && seed.lanes.length >= 8) {
        return seed.lanes.map(lane => lane >>> 0);
    }
    return DEFAULT_LANES;
}
function mix32(value, salt) {
    let h = (value ^ salt) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
}
function makeNoiseSeed(lanes, jitter, laneA, laneB, salt, mix) {
    const a = (lanes[laneA % lanes.length] ^ mix) >>> 0;
    const b = (lanes[laneB % lanes.length] ^ (mix >>> 1)) >>> 0;
    let h = (a ^ ((b << 7) | (b >>> 25)) ^ salt ^ jitter) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35) >>> 0;
    return h >>> 0;
}
function hash2d(x, y, seed) {
    const xi = Math.trunc(x);
    const yi = Math.trunc(y);
    let h = Math.imul(xi ^ seed, 0x27d4eb2d) ^ Math.imul(yi ^ (seed >>> 1), 0x165667b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x27d4eb2d) >>> 0;
    h ^= h >>> 13;
    return (h >>> 0) / 0xffffffff;
}
function fractalNoise(x, y, seed) {
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    let norm = 0;
    for (let octave = 0; octave < FRACTAL_OCTAVES; octave += 1) {
        const sampleX = (x * frequency * FRACTAL_SCALE) + octave * 4096;
        const sampleY = (y * frequency * FRACTAL_SCALE) + octave * 2048;
        const noise = hash2d(sampleX, sampleY, seed ^ (octave * 0x9e3779b1));
        total += noise * amplitude;
        norm += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return norm > 0 ? total / norm : 0;
}
function normalized(index, max) {
    if (max <= 1)
        return 0;
    return index / (max - 1);
}
function computeSlope(index, elevation, width, height) {
    const x = index % width;
    const y = Math.trunc(index / width);
    const center = elevation[index];
    const left = x > 0 ? elevation[index - 1] : center;
    const right = x + 1 < width ? elevation[index + 1] : center;
    const up = y > 0 ? elevation[index - width] : center;
    const down = y + 1 < height ? elevation[index + width] : center;
    const slope = Math.abs(center - left) +
        Math.abs(center - right) +
        Math.abs(center - up) +
        Math.abs(center - down);
    return clamp01(slope * 0.5);
}
function resolveTemperatureBand(value) {
    const v = clamp01(value);
    if (v < 0.18)
        return TemperatureBandCode.Frigid;
    if (v < 0.32)
        return TemperatureBandCode.Cold;
    if (v < 0.46)
        return TemperatureBandCode.Cool;
    if (v < 0.63)
        return TemperatureBandCode.Mild;
    if (v < 0.8)
        return TemperatureBandCode.Warm;
    return TemperatureBandCode.Hot;
}
function resolveMoistureBand(value) {
    const v = clamp01(value);
    if (v < 0.18)
        return MoistureBandCode.Arid;
    if (v < 0.35)
        return MoistureBandCode.SemiArid;
    if (v < 0.55)
        return MoistureBandCode.Moderate;
    if (v < 0.75)
        return MoistureBandCode.Humid;
    return MoistureBandCode.Wet;
}
function resolveRunoffLevel(value) {
    const v = clamp01(value);
    if (v < 0.22)
        return RunoffLevelCode.Minimal;
    if (v < 0.55)
        return RunoffLevelCode.Seasonal;
    return RunoffLevelCode.Perennial;
}
function frostRisk(temperature, runoff) {
    const tempPenalty = Math.max(0, 0.4 - clamp01(temperature));
    const runoffPenalty = clamp01(runoff) * 0.25;
    return clamp01(tempPenalty * 1.6 + runoffPenalty);
}
function vegetationDensity(temperature, moisture, elevation, runoff, coeff) {
    const tempSuitability = 1 - Math.abs(temperature - 0.58);
    const moistureSuitability = clamp01(moisture * 0.75 + runoff * 0.25);
    const elevationPenalty = Math.max(0, elevation - 0.78) * 2;
    const density = clamp01((tempSuitability * 0.6 + moistureSuitability * 0.4) * (1 - elevationPenalty));
    return clamp01(density * (0.8 + coeff.woodMod * 0.4) * (0.6 + coeff.openLand * 0.4));
}
function orePotential(elevation, moisture, coeff) {
    return clamp01(0.35 + elevation * 0.45 + coeff.elevationVariance * 0.3 - moisture * 0.2);
}
function waterPotential(runoff, moisture, coeff) {
    return clamp01(runoff * 0.6 + moisture * 0.25 + coeff.freshwaterPresence * 0.4);
}
function fertilityPotential(moisture, temperature, elevation, vegetation) {
    const moistureSuitability = clamp01(moisture * 0.8 + vegetation * 0.2);
    const temperatureSuitability = 1 - Math.abs(temperature - 0.55);
    const elevationPenalty = Math.max(0, elevation - 0.65) * 1.4;
    return clamp01((moistureSuitability * 0.6 + temperatureSuitability * 0.4) * (1 - elevationPenalty));
}
function stonePotential(elevation, runoff, vegetation, coeff) {
    const base = clamp01(0.35 + elevation * 0.5 + coeff.elevationVariance * 0.25);
    const runoffBoost = clamp01(runoff * 0.2);
    const vegetationPenalty = vegetation * 0.5;
    return clamp01(base + runoffBoost - vegetationPenalty);
}
function foragePotential(tempBand, moistureBand, vegetation, moisture) {
    const temperatureMod = tempBand === TemperatureBandCode.Frigid ? 0.3 : tempBand === TemperatureBandCode.Cold ? 0.5 : 1;
    const moistureMod = moistureBand === MoistureBandCode.Arid ? 0.35 : moistureBand === MoistureBandCode.SemiArid ? 0.6 : 1;
    return clamp01(vegetation * 0.8 * temperatureMod * moistureMod + moisture * 0.2);
}
function spawnSuitability(elevation, temperature, moisture, runoff, ore, stone, water, fertility, wood, forage, vegetation) {
    const comfortTemperature = 1 - Math.abs(temperature - 0.55);
    const comfortMoisture = clamp01(moisture * 0.7 + runoff * 0.3);
    const comfort = clamp01(comfortTemperature * 0.6 + comfortMoisture * 0.4);
    const resourceScore = fertility * 0.3 +
        water * 0.2 +
        wood * 0.15 +
        forage * 0.1 +
        ore * 0.15 +
        stone * 0.1 +
        vegetation * 0.1;
    const hazardPenalty = clamp01(Math.abs(elevation - 0.45) * 0.2 + runoff * 0.1);
    return clamp01(resourceScore * 0.7 + comfort * 0.3 - hazardPenalty);
}
function prepareSpawnSuggestions(scores, count) {
    const size = scores.length;
    const order = new Array(size);
    for (let i = 0; i < size; i += 1) {
        order[i] = i;
    }
    order.sort((a, b) => {
        const diff = scores[b] - scores[a];
        if (diff !== 0) {
            return diff > 0 ? 1 : -1;
        }
        return a - b;
    });
    const slice = order.slice(0, Math.min(count, size));
    return Uint32Array.from(slice);
}
function selectBiome(elevation, temperature, moisture, runoff, temperatureBand, moistureBand) {
    let best = null;
    function consider(code, valid, score, reason) {
        if (!valid)
            return;
        if (!best || score > best.score) {
            best = { code, score: clamp01(score), reason };
        }
    }
    consider(BiomeCode.MountainAlpine, elevation >= 0.78 && (temperatureBand === TemperatureBandCode.Frigid || temperatureBand === TemperatureBandCode.Cold), elevation, 0);
    consider(BiomeCode.MountainCloudforest, elevation >= 0.62 && moistureBand !== MoistureBandCode.Arid &&
        (temperatureBand === TemperatureBandCode.Warm || temperatureBand === TemperatureBandCode.Hot), (elevation + moisture) * 0.5, 1);
    consider(BiomeCode.WetlandFloodplain, elevation <= 0.35 && runoff >= 0.6 && (moistureBand === MoistureBandCode.Humid || moistureBand === MoistureBandCode.Wet), (1 - elevation) * 0.6 + runoff * 0.4, 2);
    consider(BiomeCode.CoastalMangrove, elevation <= 0.18 &&
        (temperatureBand === TemperatureBandCode.Warm || temperatureBand === TemperatureBandCode.Hot) &&
        moistureBand === MoistureBandCode.Wet, (1 - elevation) * 0.5 + moisture * 0.5, 3);
    consider(BiomeCode.TemperateCoastalRainforest, (temperatureBand === TemperatureBandCode.Cool || temperatureBand === TemperatureBandCode.Mild) && moistureBand === MoistureBandCode.Wet, moisture, 4);
    consider(BiomeCode.EquatorialRainforest, temperatureBand === TemperatureBandCode.Hot && moistureBand === MoistureBandCode.Wet, moisture, 5);
    consider(BiomeCode.TropicalMonsoonForest, temperatureBand === TemperatureBandCode.Hot &&
        (moistureBand === MoistureBandCode.Humid || moistureBand === MoistureBandCode.Wet), moisture * 0.6 + runoff * 0.4, 6);
    consider(BiomeCode.TropicalSavanna, (temperatureBand === TemperatureBandCode.Warm || temperatureBand === TemperatureBandCode.Hot) &&
        (moistureBand === MoistureBandCode.Moderate || moistureBand === MoistureBandCode.SemiArid), temperature, 7);
    consider(BiomeCode.MediterraneanScrub, (temperatureBand === TemperatureBandCode.Mild || temperatureBand === TemperatureBandCode.Warm) &&
        (moistureBand === MoistureBandCode.SemiArid || moistureBand === MoistureBandCode.Arid), 1 - moisture, 8);
    consider(BiomeCode.TemperateMaritime, (temperatureBand === TemperatureBandCode.Cool || temperatureBand === TemperatureBandCode.Mild) && moistureBand === MoistureBandCode.Humid, moisture, 9);
    consider(BiomeCode.TemperateBroadleaf, temperatureBand === TemperatureBandCode.Mild && moistureBand === MoistureBandCode.Moderate, 1 - Math.abs(0.5 - temperature), 10);
    consider(BiomeCode.BorealConifer, (temperatureBand === TemperatureBandCode.Cold || temperatureBand === TemperatureBandCode.Frigid) && moistureBand !== MoistureBandCode.Arid, 1 - temperature, 11);
    if (best) {
        return best;
    }
    const fallbackTable = {
        frigid: {
            'arid': BiomeCode.MountainAlpine,
            'semi-arid': BiomeCode.MountainAlpine,
            moderate: BiomeCode.BorealConifer,
            humid: BiomeCode.BorealConifer,
            wet: BiomeCode.MountainAlpine,
        },
        cold: {
            'arid': BiomeCode.MediterraneanScrub,
            'semi-arid': BiomeCode.MediterraneanScrub,
            moderate: BiomeCode.BorealConifer,
            humid: BiomeCode.TemperateBroadleaf,
            wet: BiomeCode.TemperateCoastalRainforest,
        },
        cool: {
            'arid': BiomeCode.MediterraneanScrub,
            'semi-arid': BiomeCode.TemperateBroadleaf,
            moderate: BiomeCode.TemperateBroadleaf,
            humid: BiomeCode.TemperateMaritime,
            wet: BiomeCode.TemperateCoastalRainforest,
        },
        mild: {
            'arid': BiomeCode.MediterraneanScrub,
            'semi-arid': BiomeCode.TemperateBroadleaf,
            moderate: BiomeCode.TemperateBroadleaf,
            humid: BiomeCode.TemperateMaritime,
            wet: BiomeCode.WetlandFloodplain,
        },
        warm: {
            'arid': BiomeCode.TropicalSavanna,
            'semi-arid': BiomeCode.TropicalSavanna,
            moderate: BiomeCode.TropicalSavanna,
            humid: BiomeCode.TropicalMonsoonForest,
            wet: BiomeCode.WetlandFloodplain,
        },
        hot: {
            'arid': BiomeCode.TropicalSavanna,
            'semi-arid': BiomeCode.TropicalSavanna,
            moderate: BiomeCode.TropicalMonsoonForest,
            humid: BiomeCode.EquatorialRainforest,
            wet: BiomeCode.CoastalMangrove,
        },
    };
    const tempLabel = TemperatureBandLabels[temperatureBand];
    const moistLabel = MoistureBandLabels[moistureBand];
    const fallbackRow = fallbackTable[tempLabel];
    const fallbackCode = fallbackRow?.[moistLabel] ?? BiomeCode.TemperateBroadleaf;
    return { code: fallbackCode, score: 0.35, reason: 12 };
}
function makeBaseRng(seed, config) {
    const lanes = ensureSeedLanes(seed);
    const mix = fingerprintConfig(config);
    const s0 = ((BigInt(lanes[0] ^ mix) << 32n) | BigInt(lanes[1] ^ (mix >>> 1))) & ((1n << 64n) - 1n);
    const s1 = ((BigInt(lanes[2] ^ (config.width << 1)) << 32n) | BigInt(lanes[3] ^ (config.height << 1))) & ((1n << 64n) - 1n);
    return xorshift128plus(s0, s1);
}
function generateWorldArtifact(seed, config) {
    const lanes = ensureSeedLanes(seed);
    const rng = makeBaseRng(seed, config);
    const jitter = Number(rng.next64() & 0xffffffffn) >>> 0;
    const mix = mix32(fingerprintConfig(config), jitter ^ mix32(config.width, config.height));
    const seeds = {
        elevation: makeNoiseSeed(lanes, jitter, 0, 4, 0x52dce729, mix),
        secondaryElevation: makeNoiseSeed(lanes, jitter, 1, 5, 0x7f4a7c15, mix ^ 0x1b873593),
        temperature: makeNoiseSeed(lanes, jitter, 2, 6, 0x1b873593, mix ^ 0x85ebca6b),
        moisture: makeNoiseSeed(lanes, jitter, 3, 7, 0x85ebca6b, mix ^ 0xc2b2ae35),
    };
    const { width, height } = config;
    const size = width * height;
    const elevation = new Float32Array(size);
    const temperature = new Float32Array(size);
    const moisture = new Float32Array(size);
    const runoff = new Float32Array(size);
    const biome = new Uint8Array(size);
    const ore = new Float32Array(size);
    const stone = new Float32Array(size);
    const water = new Float32Array(size);
    const fertility = new Float32Array(size);
    const vegetation = new Float32Array(size);
    const wood = new Float32Array(size);
    const forage = new Float32Array(size);
    const climateTemperatureCodes = new Uint8Array(size);
    const climateMoistureCodes = new Uint8Array(size);
    const climateRunoffCodes = new Uint8Array(size);
    const biomeScores = new Float32Array(size);
    const biomeReasonCodes = new Uint8Array(size);
    const spawnScores = new Float32Array(size);
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
            const elevationValue = clamp01(rawElevation * 0.75 + continentalMask * 0.55 - 0.2 + config.elevationBias * 0.15);
            const tempNoise = fractalNoise(nx * 1.7 + rawElevation * 0.15, ny * 1.3, seeds.temperature);
            const latFactor = clamp01(1 - latDistance * 1.28);
            const elevationChill = elevationValue * 0.35;
            const temperatureValue = clamp01(latFactor * 0.72 + tempNoise * 0.28 - elevationChill + 0.05 + config.temperatureBias * 0.2);
            const moistureNoise = fractalNoise(nx * 2.3, ny * 2.1, seeds.moisture);
            const oceanMoisture = clamp01((1 - elevationValue) * 0.45);
            const equatorialMoisture = clamp01((1 - latDistance) * 0.15);
            const moistureValue = clamp01(moistureNoise * 0.65 + oceanMoisture + equatorialMoisture - 0.05 + config.moistureBias * 0.2);
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
    for (let i = 0; i < size; i += 1) {
        const elev = elevation[i];
        const temp = temperature[i];
        const moist = moisture[i];
        const run = runoff[i];
        const tempBand = resolveTemperatureBand(temp);
        const moistBand = resolveMoistureBand(moist);
        const runBand = resolveRunoffLevel(run);
        climateTemperatureCodes[i] = tempBand;
        climateMoistureCodes[i] = moistBand;
        climateRunoffCodes[i] = runBand;
        const selection = selectBiome(elev, temp, moist, run, tempBand, moistBand);
        const coeff = biomeResourceCoefficients[selection.code] ?? biomeResourceCoefficients[BiomeCode.TemperateBroadleaf];
        const vegetationValue = vegetationDensity(temp, moist, elev, run, coeff);
        const oreValue = orePotential(elev, moist, coeff);
        const waterValue = waterPotential(run, moist, coeff);
        const fertilityValue = fertilityPotential(moist, temp, elev, vegetationValue);
        const stoneValue = stonePotential(elev, run, vegetationValue, coeff);
        const woodValue = clamp01(vegetationValue * 0.85);
        const forageValue = foragePotential(tempBand, moistBand, vegetationValue, moist);
        biome[i] = selection.code;
        biomeScores[i] = selection.score;
        biomeReasonCodes[i] = selection.reason;
        vegetation[i] = vegetationValue;
        ore[i] = oreValue;
        water[i] = waterValue;
        fertility[i] = fertilityValue;
        stone[i] = stoneValue;
        wood[i] = woodValue;
        forage[i] = forageValue;
        spawnScores[i] = spawnSuitability(elev, temp, moist, run, oreValue, stoneValue, waterValue, fertilityValue, woodValue, forageValue, vegetationValue);
    }
    const spawnSuggestions = prepareSpawnSuggestions(spawnScores, config.spawnSuggestionCount);
    const tiles = new Array(size);
    for (let i = 0; i < size; i += 1) {
        const climate = Object.freeze({
            temperature: TemperatureBandLabels[climateTemperatureCodes[i]],
            moisture: MoistureBandLabels[climateMoistureCodes[i]],
            runoff: RunoffLevelLabels[climateRunoffCodes[i]],
            frostRisk: frostRisk(temperature[i], runoff[i]),
        });
        const resources = Object.freeze({
            vegetation: vegetation[i],
            wood: wood[i],
            forage: forage[i],
            ore: ore[i],
            freshWater: water[i],
            fertility: fertility[i],
        });
        const biomeData = Object.freeze({
            id: biomeCodeToId(biome[i]),
            score: clamp01(biomeScores[i]),
            reason: BiomeReasonLabels[biomeReasonCodes[i]] ?? 'fallback climate lookup',
        });
        tiles[i] = Object.freeze({
            index: i,
            x: i % width,
            y: Math.trunc(i / width),
            elevation: elevation[i],
            temperature: temperature[i],
            moisture: moisture[i],
            runoff: runoff[i],
            climate,
            biome: biomeData,
            resources,
        });
    }
    const dimensions = Object.freeze({ width, height, size });
    const layers = Object.freeze({ elevation, temperature, moisture, runoff, biome, ore, stone, water, fertility });
    return Object.freeze({
        seed,
        params: Object.freeze(config),
        dimensions,
        layers,
        tiles: Object.freeze(tiles),
        spawnSuggestions,
    });
}
export function generateWorld(params) {
    const config = sanitizeConfig(params);
    if (params.seed) {
        const artifact = generateWorldArtifact(params.seed, config);
        const hybrid = Object.assign(Promise.resolve(artifact), artifact);
        return hybrid;
    }
    const seedString = params.seedString ?? '';
    const pending = canonicalizeSeed(seedString).then(seed => generateWorldArtifact(seed, config));
    const hybrid = pending;
    pending.then(artifact => Object.assign(hybrid, artifact));
    return hybrid;
}

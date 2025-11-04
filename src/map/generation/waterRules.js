import { LANDMASS_PRESETS, DEFAULT_LANDMASS_TYPE } from '../landmassPresets/index.js';

function clamp(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}
function normalizePercent(value, fallback) {
    if (!Number.isFinite(value))
        return fallback;
    return clamp(Math.round(value), 0, 100);
}
function resolveFlowMultiplier(raw) {
    const normalized = clamp(Number.isFinite(raw) ? raw : 50, 0, 100);
    // Map 0..100 slider to 0.25..1.75, centered at 1.0 for 50.
    return 0.25 + (normalized / 100) * 1.5;
}
function biomeSuggestsWetlands(biome) {
    const hint = biome?.features?.join(' ').toLowerCase() ?? '';
    return /marsh|bog|swamp|delta|mangrove|wetland|flood/i.test(hint);
}
const HYDROLOGY_PRESETS = {
    continent: {
        seaLevelOffset: -0.005,
        riverDensityScale: 1.05,
        riverDensityOffset: 0,
        lakeAreaScale: 1.03,
        marshinessBias: 0.03,
        estuaryScale: 1.03,
        estuaryFlowScale: 1,
        distributaryBias: 0.15
    },
    coastal: {
        seaLevelOffset: 0.01,
        riverDensityScale: 0.95,
        riverDensityOffset: 0,
        lakeAreaScale: 0.95,
        marshinessBias: 0.03,
        estuaryScale: 1.05,
        estuaryFlowScale: 1.05,
        distributaryBias: 0.1
    },
    island: {
        seaLevelOffset: 0.04,
        riverDensityScale: 0.75,
        riverDensityOffset: 0,
        lakeAreaScale: 0.85,
        marshinessBias: 0.02,
        estuaryScale: 0.85,
        estuaryFlowScale: 0.9,
        distributaryBias: -0.4
    },
    archipelago: {
        seaLevelOffset: 0.06,
        riverDensityScale: 0.65,
        riverDensityOffset: 0,
        lakeAreaScale: 0.75,
        marshinessBias: 0.06,
        estuaryScale: 0.8,
        estuaryFlowScale: 0.85,
        distributaryBias: -0.5
    },
    pangea: {
        seaLevelOffset: 0,
        riverDensityScale: 1,
        riverDensityOffset: 0,
        lakeAreaScale: 1,
        marshinessBias: 0,
        estuaryScale: 1,
        estuaryFlowScale: 1,
        distributaryBias: 0
    },
    inland: {
        seaLevelOffset: -0.025,
        riverDensityScale: 1.08,
        riverDensityOffset: 0.00008,
        lakeAreaScale: 1.12,
        marshinessBias: 0.07,
        estuaryScale: 0.95,
        estuaryFlowScale: 0.95,
        distributaryBias: -0.1
    }
};
const DEFAULT_HYDROLOGY_PRESET = Object.freeze({
    seaLevelOffset: 0,
    riverDensityScale: 1,
    riverDensityOffset: 0,
    lakeAreaScale: 1,
    marshinessBias: 0,
    estuaryScale: 1,
    estuaryFlowScale: 1,
    distributaryBias: 0
});
function resolveHydrologyPreset(mapType) {
    const normalized = typeof mapType === 'string' ? mapType : DEFAULT_LANDMASS_TYPE;
    if (Object.prototype.hasOwnProperty.call(HYDROLOGY_PRESETS, normalized)) {
        return HYDROLOGY_PRESETS[normalized];
    }
    if (Object.prototype.hasOwnProperty.call(LANDMASS_PRESETS, normalized)) {
        return HYDROLOGY_PRESETS[DEFAULT_LANDMASS_TYPE] ?? DEFAULT_HYDROLOGY_PRESET;
    }
    return DEFAULT_HYDROLOGY_PRESET;
}
export function resolveWaterRules(biome, world, width, height) {
    const rainfall = normalizePercent(world?.rainfall, 50);
    const waterTable = normalizePercent(world?.waterTable, 50);
    const mountains = normalizePercent(world?.mountains, 50);
    const rivers = normalizePercent(world?.rivers100, 45);
    const lakes = normalizePercent(world?.lakes100, 35);
    const rainfallBias = (rainfall - 50) / 100;
    const waterBias = (waterTable - 50) / 100;
    const mountainBias = (mountains - 50) / 100;
    const riversBias = (rivers - 50) / 100;
    const lakesBias = (lakes - 50) / 100;
    const hydrologyPreset = resolveHydrologyPreset(world?.mapType);
    const seaBase = biome?.elevation?.waterLevel ?? 0.28;
    const baseSeaLevel = clamp(seaBase + waterBias * 0.1 + rainfallBias * 0.06 - mountainBias * 0.08, 0.04, 0.8);
    const adjustedSeaLevel = clamp(baseSeaLevel + hydrologyPreset.seaLevelOffset, 0.02, 0.82);
    const flowMultiplier = resolveFlowMultiplier(world?.advanced?.waterFlowMultiplier);
    const area = Math.max(16, width * height);
    const densityBias = clamp(riversBias * 0.45 + rainfallBias * 0.35 + waterBias * 0.25, -0.6, 0.9);
    const baseRiverDensity = clamp(0.0025 + densityBias * 0.0018, 0.0012, 0.0075);
    const riverDensity = clamp(baseRiverDensity * hydrologyPreset.riverDensityScale + hydrologyPreset.riverDensityOffset, 0.0008, 0.012);
    const targetRiverCells = area * riverDensity;
    const riverFlowThreshold = Math.max(12, targetRiverCells / flowMultiplier);
    const tributaryThreshold = Math.max(6, riverFlowThreshold * 0.45);
    const mouthExpansionThreshold = riverFlowThreshold * (1.35 * hydrologyPreset.estuaryFlowScale);
    const wetlandBias = biomeSuggestsWetlands(biome) ? 0.4 : 0;
    const marshiness = clamp(rainfallBias * 0.5 + lakesBias * 0.35 + wetlandBias + hydrologyPreset.marshinessBias, 0, 1);
    const marshRingWidth = marshiness > 0.35 ? 2 : 1;
    const lakeDepthBase = clamp(0.03 + rainfallBias * 0.03 + lakesBias * 0.02, 0.01, 0.16);
    const lakeMinDepth = lakeDepthBase / Math.max(0.75, flowMultiplier * 0.85);
    const lakeAreaBias = clamp(lakesBias + rainfallBias * 0.4, -0.5, 1.2);
    const baseLakeMinArea = Math.max(4, Math.round(6 + lakeAreaBias * 8));
    const lakeMinArea = Math.max(4, Math.round(baseLakeMinArea * hydrologyPreset.lakeAreaScale));
    const maxSingletonFraction = clamp(0.0005 + lakesBias * 0.00015, 0.0002, 0.001);
    const estuaryRadiusBase = clamp(Math.round(4 + (waterBias + rainfallBias) * 6), 3, 12);
    const estuaryRadius = clamp(Math.round(estuaryRadiusBase * hydrologyPreset.estuaryScale), 2, 14);
    const distributaryBase = clamp(Math.round(2 + riversBias * 1.2 + rainfallBias * 0.8), 2, 4);
    const distributaryMin = clamp(Math.max(1, Math.round(distributaryBase + hydrologyPreset.distributaryBias)), 1, 6);
    const distributaryBonus = hydrologyPreset.distributaryBias > 0 ? Math.round(hydrologyPreset.distributaryBias * 0.5) : 0;
    const distributaryMax = clamp(distributaryMin + 1 + Math.round(wetlandBias * 2) + distributaryBonus, distributaryMin, 6);
    const estuaryWideningDepthBase = clamp(0.04 + rainfallBias * 0.03 + waterBias * 0.04, 0.02, 0.12);
    const estuaryWideningDepth = clamp(estuaryWideningDepthBase * hydrologyPreset.estuaryFlowScale, 0.02, 0.16);
    const confluenceRadiusBase = clamp(Math.round(estuaryRadiusBase * 0.6 + riversBias * 2), 2, estuaryRadiusBase);
    const confluenceRadius = clamp(Math.round(confluenceRadiusBase * hydrologyPreset.estuaryScale), 2, estuaryRadius);
    return {
        seaLevel: adjustedSeaLevel,
        flowMultiplier,
        riverFlowThreshold,
        tributaryThreshold,
        mouthExpansionThreshold,
        lakeMinDepth,
        lakeMinArea,
        marshRingWidth,
        marshiness,
        maxSingletonFraction,
        estuaryRadius,
        distributaryMin,
        distributaryMax,
        estuaryWideningDepth,
        confluenceRadius
    };
}

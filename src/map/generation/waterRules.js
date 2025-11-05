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
function resolveLatitudeCenter(biome) {
    const range = biome?.latitudeRange;
    if (!range)
        return null;
    const min = Number.isFinite(range?.min) ? range.min : null;
    const max = Number.isFinite(range?.max) ? range.max : null;
    if (min !== null && max !== null)
        return (min + max) / 2;
    if (min !== null)
        return clamp(min + 10, -90, 90);
    if (max !== null)
        return clamp(max - 10, -90, 90);
    return null;
}
function resolveLatitudeBias(biome) {
    const center = resolveLatitudeCenter(biome);
    if (!Number.isFinite(center))
        return 0;
    return clamp((center - 45) / 45, -1, 1);
}
function resolveElevationBias(biome) {
    const range = biome?.elevationRange;
    if (!range)
        return 0;
    const min = Number.isFinite(range?.min) ? range.min : null;
    const max = Number.isFinite(range?.max) ? range.max : null;
    const center = min !== null && max !== null ? (min + max) / 2 : min ?? max;
    if (!Number.isFinite(center))
        return 0;
    return clamp((center - 0.35) / 0.35, -1, 1);
}
function resolveTransitionHints(biome) {
    const transitions = biome?.transitions;
    if (!transitions)
        return new Set();
    const values = [];
    const pushAll = (list) => {
        if (!Array.isArray(list))
            return;
        for (const item of list) {
            if (typeof item === 'string' && item)
                values.push(item.toLowerCase());
        }
    };
    pushAll(transitions.upslope);
    pushAll(transitions.downslope);
    pushAll(transitions.lateral);
    return new Set(values);
}
function normalizeWeights(weights) {
    const entries = Object.entries(weights);
    const sum = entries.reduce((acc, [, value]) => acc + Math.max(0, value), 0);
    if (sum <= 1e-6)
        return { ...weights };
    const normalized = {};
    for (const [key, value] of entries) {
        const safe = Math.max(0, value);
        normalized[key] = safe / sum;
    }
    return normalized;
}
function resolveFreshwaterPresence(biome) {
    const freshwater = biome?.freshwater ?? {};
    const normalize = (value, max = 5) => clamp(Number.isFinite(value) ? value / max : 0, 0, 1);
    const springs = normalize(freshwater.springs ?? freshwater.springsPer100 ?? freshwater.spring);
    const streams = normalize(freshwater.streams ?? freshwater.rivers ?? freshwater.stream);
    const lakes = normalize(freshwater.lakes ?? freshwater.ponds ?? freshwater.lake);
    const wetlands = normalize(freshwater.wetlands ?? freshwater.marshes ?? freshwater.swamp);
    const combined = clamp((springs + streams + lakes + wetlands) / 4, 0, 1);
    return {
        springs,
        streams,
        lakes,
        wetlands,
        combined
    };
}
function resolveWetlandProfile({ freshwaterPresence, rainfallBias, waterBias, latitudeBias, elevationBias, transitionHints }) {
    const climateWetness = clamp(0.4 + rainfallBias * 0.35 + waterBias * 0.25, 0, 1);
    const wetlandBase = clamp(freshwaterPresence.wetlands * 0.7 + freshwaterPresence.lakes * 0.35 + climateWetness * 0.6, 0, 1.5);
    const tropicalBias = clamp(0.6 - Math.abs(latitudeBias) * 0.6, 0, 0.6);
    const borealBias = clamp(Math.max(0, latitudeBias) * 0.6 + Math.max(0, elevationBias) * 0.3, 0, 0.9);
    const bogLean = clamp(freshwaterPresence.lakes * 0.45 + freshwaterPresence.wetlands * 0.5 + borealBias * 0.6, 0, 1.4);
    const fenLean = clamp(freshwaterPresence.springs * 0.6 + freshwaterPresence.streams * 0.4 + climateWetness * 0.4, 0, 1.2);
    let swampLean = clamp(freshwaterPresence.streams * 0.5 + tropicalBias * 0.8 + climateWetness * 0.4, 0, 1.4);
    if (transitionHints.has('coastal-mangrove')) {
        swampLean += 0.45;
    }
    const marshLean = clamp(wetlandBase + rainfallBias * 0.4 + waterBias * 0.2, 0.2, 1.6);
    const weights = normalizeWeights({
        marsh: marshLean,
        swamp: swampLean,
        bog: bogLean,
        fen: fenLean
    });
    const peatlandPreference = clamp((weights.bog + weights.fen) * 0.9 + borealBias * 0.2, 0, 1);
    const fenPreference = clamp(weights.fen / Math.max(1e-6, weights.fen + weights.bog), 0, 1);
    return {
        weights,
        peatlandPreference,
        fenPreference
    };
}
function resolveMarineEdgeWeights({ freshwaterPresence, rainfallBias, riversBias, latitudeBias, transitionHints, mountainBias }) {
    const nearShoreWetness = clamp(freshwaterPresence.wetlands * 0.6 + rainfallBias * 0.5 + riversBias * 0.3, 0, 1.5);
    const tropicalBias = clamp(0.6 - Math.abs(latitudeBias) * 0.6, 0, 0.8);
    const temperateBias = clamp(0.6 - Math.abs(latitudeBias - 0.15) * 0.6, 0, 0.8);
    const polarBias = clamp(Math.max(0, latitudeBias), 0, 1);
    const estuaryWeight = clamp(0.5 + riversBias * 0.4 + nearShoreWetness * 0.5, 0.2, 2.5);
    let deltaWeight = clamp(nearShoreWetness * 0.9 + riversBias * 0.8, 0, 2.2);
    const mangroveWeight = clamp(tropicalBias * (0.4 + nearShoreWetness * 0.6), 0, 1.4);
    let kelpWeight = clamp(temperateBias * (0.4 + rainfallBias * 0.2), 0, 1.1);
    let coralWeight = clamp(tropicalBias * (0.6 + Math.max(0, 0.2 - rainfallBias) * 0.4), 0, 1.2);
    const polarWeight = clamp(polarBias * (0.7 + Math.max(0, -rainfallBias) * 0.1), 0, 1.3);
    const openOceanWeight = clamp(0.8 + Math.max(0, -rainfallBias) * 0.3 + Math.max(0, -riversBias) * 0.2, 0.2, 2.5);
    const abyssalWeight = clamp(0.4 + Math.max(0, -mountainBias) * 0.4 + Math.max(0, -rainfallBias) * 0.3, 0, 1.5);
    const seamountWeight = clamp(Math.max(0, mountainBias) * 0.8, 0, 1.2);
    if (transitionHints.has('coral-sea')) {
        coralWeight += 0.6;
    }
    if (transitionHints.has('temperate-coastal-rainforest')) {
        kelpWeight += 0.3;
    }
    if (transitionHints.has('coastal-mangrove')) {
        deltaWeight += 0.3;
    }
    const weights = normalizeWeights({
        estuary: estuaryWeight,
        delta: deltaWeight,
        mangrove_forest: mangroveWeight,
        kelp_forest: kelpWeight,
        coral_reef: coralWeight,
        polar_sea: polarWeight,
        open_ocean: openOceanWeight,
        abyssal_deep: abyssalWeight,
        seamount: seamountWeight
    });
    return weights;
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
    const latitudeBias = resolveLatitudeBias(biome);
    const elevationBias = resolveElevationBias(biome);
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
    const transitionHints = resolveTransitionHints(biome);
    const freshwaterPresence = resolveFreshwaterPresence(biome);
    const wetlandProfile = resolveWetlandProfile({
        freshwaterPresence,
        rainfallBias,
        waterBias,
        latitudeBias,
        elevationBias,
        transitionHints
    });
    const streamFlowThreshold = Math.max(4, riverFlowThreshold * 0.32 * (1 - freshwaterPresence.streams * 0.15));
    const streamTributaryThreshold = Math.max(2, tributaryThreshold * 0.6);
    const pondMaxArea = Math.max(3, Math.round(lakeMinArea * (0.5 + freshwaterPresence.lakes * 0.45)));
    const pondMaxDepth = clamp(lakeMinDepth * (0.55 + freshwaterPresence.lakes * 0.35), 0.006, lakeMinDepth * 0.95);
    const peatlandFlowThreshold = Math.max(2, streamFlowThreshold * (0.55 + freshwaterPresence.streams * 0.15));
    const marineEdgeWeights = resolveMarineEdgeWeights({
        freshwaterPresence,
        rainfallBias,
        riversBias,
        latitudeBias,
        transitionHints,
        mountainBias
    });
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
        confluenceRadius,
        freshwaterPresence,
        latitudeBias,
        elevationBias,
        streamFlowThreshold,
        streamTributaryThreshold,
        pondMaxArea,
        pondMaxDepth,
        peatlandFlowThreshold,
        wetlandWeights: wetlandProfile.weights,
        peatlandPreference: wetlandProfile.peatlandPreference,
        fenPreference: wetlandProfile.fenPreference,
        marineEdgeWeights,
        transitionHints: Array.from(transitionHints)
    };
}

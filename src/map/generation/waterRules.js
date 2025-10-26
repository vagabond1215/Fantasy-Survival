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
    const seaBase = biome?.elevation?.waterLevel ?? 0.28;
    const baseSeaLevel = clamp(seaBase + waterBias * 0.1 + rainfallBias * 0.06 - mountainBias * 0.08, 0.04, 0.8);
    const flowMultiplier = resolveFlowMultiplier(world?.advanced?.waterFlowMultiplier);
    const area = Math.max(16, width * height);
    const densityBias = clamp(riversBias * 0.45 + rainfallBias * 0.35 + waterBias * 0.25, -0.6, 0.9);
    const targetRiverCells = area * clamp(0.0025 + densityBias * 0.0018, 0.0012, 0.0075);
    const riverFlowThreshold = Math.max(12, targetRiverCells / flowMultiplier);
    const tributaryThreshold = Math.max(6, riverFlowThreshold * 0.45);
    const mouthExpansionThreshold = riverFlowThreshold * 1.35;
    const wetlandBias = biomeSuggestsWetlands(biome) ? 0.4 : 0;
    const marshiness = clamp(rainfallBias * 0.5 + lakesBias * 0.35 + wetlandBias, 0, 1);
    const marshRingWidth = marshiness > 0.35 ? 2 : 1;
    const lakeDepthBase = clamp(0.03 + rainfallBias * 0.03 + lakesBias * 0.02, 0.01, 0.16);
    const lakeMinDepth = lakeDepthBase / Math.max(0.75, flowMultiplier * 0.85);
    const lakeAreaBias = clamp(lakesBias + rainfallBias * 0.4, -0.5, 1.2);
    const lakeMinArea = Math.max(4, Math.round(6 + lakeAreaBias * 8));
    const maxSingletonFraction = clamp(0.0005 + lakesBias * 0.00015, 0.0002, 0.001);
    const estuaryRadius = clamp(Math.round(4 + (waterBias + rainfallBias) * 6), 3, 12);
    const distributaryMin = clamp(Math.round(2 + riversBias * 1.2 + rainfallBias * 0.8), 2, 4);
    const distributaryMax = clamp(distributaryMin + 1 + Math.round(wetlandBias * 2), distributaryMin, 6);
    const estuaryWideningDepth = clamp(0.04 + rainfallBias * 0.03 + waterBias * 0.04, 0.02, 0.12);
    const confluenceRadius = clamp(Math.round(estuaryRadius * 0.6 + riversBias * 2), 2, estuaryRadius);
    return {
        seaLevel: baseSeaLevel,
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

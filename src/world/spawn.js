import { isWaterTerrainType } from './mapAdapter.js';

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function scanRadius(
  terrainTypes,
  startX,
  startY,
  centerX = 0,
  centerY = 0,
  radius = 100,
) {
  if (!Array.isArray(terrainTypes) || terrainTypes.length === 0) {
    return {
      total: 0,
      land: 0,
      water: 0,
      ore: 0,
      usable: 0,
    };
  }

  const radiusSq = radius * radius;
  const stats = { total: 0, land: 0, water: 0, ore: 0, usable: 0 };

  for (let row = 0; row < terrainTypes.length; row += 1) {
    const rowData = terrainTypes[row];
    if (!rowData) continue;
    const worldY = startY + row;
    const dy = worldY - centerY;
    if (dy * dy > radiusSq) continue;
    for (let col = 0; col < rowData.length; col += 1) {
      const type = rowData[col];
      if (!type) continue;
      const worldX = startX + col;
      const dx = worldX - centerX;
      if (dx * dx + dy * dy > radiusSq) continue;
      stats.total += 1;
      if (isWaterTerrainType(type)) {
        stats.water += 1;
        continue;
      }
      stats.land += 1;
      if (type === 'ore') {
        stats.ore += 1;
      } else {
        stats.usable += 1;
      }
    }
  }

  return stats;
}

export function validateStartingArea(
  terrainTypes,
  startX,
  startY,
  centerX = 0,
  centerY = 0,
  radius = 100,
  thresholds = { minLand: 0.5, maxOre: 0.4 },
) {
  const stats = scanRadius(terrainTypes, startX, startY, centerX, centerY, radius);
  const total = Math.max(1, stats.total);
  const usableLand = Math.max(1, stats.usable);
  const landRatio = clamp(stats.land / total, 0, 1);
  const oreRatio = clamp(stats.ore / usableLand, 0, 1);
  const minLand = Number.isFinite(thresholds?.minLand) ? thresholds.minLand : 0.5;
  const maxOre = Number.isFinite(thresholds?.maxOre) ? thresholds.maxOre : 0.4;
  return {
    stats,
    landRatio,
    oreRatio,
    meetsLand: landRatio >= minLand,
    meetsOre: oreRatio <= maxOre,
  };
}

export function findValidSpawn(
  terrainTypes,
  startX,
  startY,
  radius = 100,
  thresholds = { minLand: 0.5, maxOre: 0.4 },
  options = {},
) {
  if (!Array.isArray(terrainTypes) || terrainTypes.length === 0) return null;
  const centerX = options?.centerX ?? 0;
  const centerY = options?.centerY ?? 0;
  const limit = clamp(Math.trunc(options?.limit ?? 200), 1, 2000);
  const candidates = [];

  for (let row = 0; row < terrainTypes.length; row += 1) {
    const rowData = terrainTypes[row];
    if (!rowData) continue;
    for (let col = 0; col < rowData.length; col += 1) {
      const type = rowData[col];
      if (!type || isWaterTerrainType(type)) continue;
      const worldX = startX + col;
      const worldY = startY + row;
      const distance = Math.hypot(worldX - centerX, worldY - centerY);
      candidates.push({ row, col, worldX, worldY, distance });
    }
  }

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.worldY !== b.worldY) return a.worldY - b.worldY;
    return a.worldX - b.worldX;
  });

  let best = null;
  const capped = Math.min(limit, candidates.length);
  for (let index = 0; index < capped; index += 1) {
    const candidate = candidates[index];
    const validation = validateStartingArea(
      terrainTypes,
      startX,
      startY,
      candidate.worldX,
      candidate.worldY,
      radius,
      thresholds,
    );
    const score = validation.landRatio - validation.oreRatio * 0.2;
    const entry = { ...candidate, validation, score };
    if (validation.meetsLand && validation.meetsOre) {
      return entry;
    }
    if (!best || entry.score > best.score) {
      best = entry;
    }
  }

  return best;
}

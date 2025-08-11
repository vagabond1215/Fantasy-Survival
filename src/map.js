import { getBiome } from './biomes.js';

export const FEATURE_COLORS = {
  water: '#1E90FF', // blue
  open: '#7CFC00', // light green
  forest: '#228B22', // forest green
  ore: '#B87333' // coppery brown for ore deposits
};

function hasWaterFeature(features = []) {
  return features.some(f => /(water|river|lake|shore|beach|lagoon|reef|marsh|bog|swamp|delta|stream|tide|coast)/i.test(f));
}

export function generateColorMap(biomeId) {
  const size = 200; // base map dimensions
  const biome = getBiome(biomeId);
  const openLand = biome?.openLand ?? 0.5;
  const waterFeature = biome && hasWaterFeature(biome.features);
  const oreChance = 0.02; // rare ore deposits

  // --- Base terrain generation (open land vs forest) ---
  let terrain = Array.from({ length: size }, () => Array(size).fill('forest'));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      terrain[y][x] = Math.random() < openLand ? 'open' : 'forest';
    }
  }
  // Smooth the terrain to create more contiguous regions
  for (let iter = 0; iter < 3; iter++) {
    const next = terrain.map(arr => [...arr]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let openCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < size && nx >= 0 && nx < size && terrain[ny][nx] === 'open') openCount++;
          }
        }
        if (openCount > 4) next[y][x] = 'open';
        else if (openCount < 4) next[y][x] = 'forest';
      }
    }
    terrain = next;
  }

  // --- Water features: rivers and lakes ---
  const riverStart = Math.floor(Math.random() * size);
  let riverY = riverStart;
  for (let x = 0; x < size; x++) {
    for (let w = -1; w <= 1; w++) {
      const yy = riverY + w;
      if (yy >= 0 && yy < size) terrain[yy][x] = 'water';
    }
    riverY += Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    riverY = Math.max(1, Math.min(size - 2, riverY));
  }

  const lakeCount = waterFeature ? 5 : 2;
  for (let i = 0; i < lakeCount; i++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    const radius = 3 + Math.floor(Math.random() * 6);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) terrain[ny][nx] = 'water';
        }
      }
    }
  }

  // --- Ore deposits ---
  const oreDeposits = Math.floor(size * oreChance);
  for (let i = 0; i < oreDeposits; i++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.5) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) terrain[ny][nx] = 'ore';
        }
      }
    }
  }

  // Convert terrain types to color values
  const pixels = terrain.map(row => row.map(cell => FEATURE_COLORS[cell]));
  return { scale: 100, pixels };
}

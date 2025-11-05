export const OPEN_TERRAIN_TYPES = Object.freeze([
  'open',
  'grassland',
  'plains',
  'savanna',
  'tundra',
  'taiga',
  'desert',
  'sand',
  'wetland',
  'coast',
  'temperate',
  'tropical',
  'rainforest',
  'jungle',
  'alpine'
]);

const OPEN_TERRAIN_SET = new Set(OPEN_TERRAIN_TYPES);

const CATEGORY_TERRAIN_FALLBACK = Object.freeze({
  mountain: 'alpine',
  'subpolar-forest': 'taiga',
  'coastal-temperate': 'coast',
  'coastal-tropical': 'coast',
  wetland: 'wetland',
  mediterranean: 'grassland',
  'mountain-forest': 'alpine',
  'tropical-grassland': 'savanna',
  'temperate-forest': 'plains',
  'tropical-forest': 'rainforest',
  special: 'temperate'
});

export function isOpenTerrain(type) {
  if (!type) return false;
  return OPEN_TERRAIN_SET.has(String(type).toLowerCase());
}

export function resolveBiomeOpenTerrain(biome) {
  if (!biome) return 'open';
  const candidate = typeof biome.openTerrainId === 'string' ? biome.openTerrainId.toLowerCase() : '';
  if (candidate && isOpenTerrain(candidate)) {
    return candidate;
  }
  if (Array.isArray(biome.openTerrainHints)) {
    for (const hint of biome.openTerrainHints) {
      const normalized = typeof hint === 'string' ? hint.toLowerCase() : '';
      if (normalized && isOpenTerrain(normalized)) {
        return normalized;
      }
    }
  }
  if (typeof biome.category === 'string') {
    const category = biome.category.toLowerCase();
    const mapped = CATEGORY_TERRAIN_FALLBACK[category];
    if (mapped && isOpenTerrain(mapped)) {
      return mapped;
    }
  }
  return 'open';
}

export function expandOpenTerrainTags(tags = []) {
  if (!Array.isArray(tags) || !tags.length) return tags;
  const normalized = tags.map(tag => String(tag || '').toLowerCase());
  if (!normalized.includes('open')) return tags;
  const extras = OPEN_TERRAIN_TYPES.filter(type => type !== 'open');
  const expanded = new Set();
  normalized.forEach(tag => {
    if (tag && tag !== 'open') {
      expanded.add(tag);
    }
  });
  extras.forEach(tag => expanded.add(tag));
  expanded.add('open');
  return Array.from(expanded);
}

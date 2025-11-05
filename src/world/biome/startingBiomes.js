import { biomes } from '../../biomes.js';

export const BIOME_STARTER_OPTIONS = biomes.map(biome => ({
  id: biome.id,
  label: biome.name,
  description: biome.description || '',
  color: biome.color || null
}));

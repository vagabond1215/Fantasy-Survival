export const biomes = [
  { id: 'desert', name: 'Desert', features: ['dunes', 'oasis', 'mesa'], woodMod: 0.2 },
  { id: 'taiga', name: 'Taiga', features: ['pine forest', 'bog', 'hills'], woodMod: 1.0 },
  { id: 'tundra', name: 'Tundra', features: ['permafrost', 'ice field', 'rocky plain'], woodMod: 0.5 },
  { id: 'plains', name: 'Plains', features: ['grassland', 'river', 'cliff'], woodMod: 0.8 },
  {
    id: 'tropical-rainforest',
    name: 'Tropical Rainforest',
    features: ['dense jungle', 'river', 'waterfall'],
    woodMod: 1.2,
    description: 'Dense, humid forests near the equator with year-round warmth and rainfall.',
    resources: [
      { name: 'Hardwood (mahogany)', type: 'wood', icon: '🌳', rarityTier: 'Common', rarityPerKm2: 65, abundance: 'Large' },
      { name: 'Cotton', type: 'textile', icon: '🧵', rarityTier: 'Uncommon', rarityPerKm2: 25, abundance: 'Medium' },
      { name: 'Basalt', type: 'stone', icon: '🪨', rarityTier: 'Uncommon', rarityPerKm2: 20, abundance: 'Large' },
      { name: 'Bananas', type: 'food', icon: '🍌', rarityTier: 'Common', rarityPerKm2: 55, abundance: 'Medium' },
      { name: 'Wild game', type: 'food', icon: '🍖', rarityTier: 'Uncommon', rarityPerKm2: 30, abundance: 'Small' },
      { name: 'Tubers', type: 'food', icon: '🥔', rarityTier: 'Common', rarityPerKm2: 45, abundance: 'Small' },
      { name: 'Spices', type: 'luxury', icon: '🧂', rarityTier: 'Rare', rarityPerKm2: 10, abundance: 'Small' },
      { name: 'Medicinal herbs', type: 'luxury', icon: '🌿', rarityTier: 'Uncommon', rarityPerKm2: 25, abundance: 'Small' }
    ],
    weather: 'Hot (25–30°C), very humid, daily rain year-round',
    geography: 'River networks, dense forest canopies, rolling terrain',
    openLandPercent: 10,
    survivability: 'Difficult'
  },
  {
    id: 'temperate-rainforest',
    name: 'Temperate Rainforest',
    features: ['coastal forest', 'mossy undergrowth', 'hills'],
    woodMod: 1.1,
    description: 'Cool, wet forests typically along coastlines; lush with moss and ferns.',
    resources: [
      { name: 'Softwood (fir)', type: 'wood', icon: '🌲', rarityTier: 'Common', rarityPerKm2: 60, abundance: 'Large' },
      { name: 'Wool', type: 'textile', icon: '🐑', rarityTier: 'Uncommon', rarityPerKm2: 25, abundance: 'Medium' },
      { name: 'Granite', type: 'stone', icon: '🪨', rarityTier: 'Uncommon', rarityPerKm2: 20, abundance: 'Large' },
      { name: 'Berries', type: 'food', icon: '🫐', rarityTier: 'Common', rarityPerKm2: 50, abundance: 'Small' },
      { name: 'Fish', type: 'food', icon: '🐟', rarityTier: 'Common', rarityPerKm2: 55, abundance: 'Medium' },
      { name: 'Mushrooms', type: 'food', icon: '🍄', rarityTier: 'Uncommon', rarityPerKm2: 30, abundance: 'Small' },
      { name: 'Amber', type: 'luxury', icon: '🪙', rarityTier: 'Rare', rarityPerKm2: 8, abundance: 'Small' },
      { name: 'Medicinal herbs', type: 'luxury', icon: '🌿', rarityTier: 'Uncommon', rarityPerKm2: 20, abundance: 'Small' }
    ],
    weather: 'Mild summers (10–20°C), cool winters (0–10°C), high rainfall',
    geography: 'Hills, rivers, waterfalls, thick forest undergrowth',
    openLandPercent: 20,
    survivability: 'Average'
  },
  {
    id: 'boreal-forest',
    name: 'Boreal Forest',
    features: ['conifer forest', 'lakes', 'bog'],
    woodMod: 1.0,
    description: 'Cold coniferous forest with long winters and short summers.',
    resources: [
      { name: 'Softwood (pine)', type: 'wood', icon: '🌲', rarityTier: 'Common', rarityPerKm2: 55, abundance: 'Large' },
      { name: 'Fur', type: 'textile', icon: '🦣', rarityTier: 'Uncommon', rarityPerKm2: 25, abundance: 'Small' },
      { name: 'Slate', type: 'stone', icon: '🪨', rarityTier: 'Uncommon', rarityPerKm2: 20, abundance: 'Large' },
      { name: 'Fish', type: 'food', icon: '🐟', rarityTier: 'Common', rarityPerKm2: 50, abundance: 'Medium' },
      { name: 'Berries', type: 'food', icon: '🫐', rarityTier: 'Uncommon', rarityPerKm2: 30, abundance: 'Small' },
      { name: 'Small game', type: 'food', icon: '🐇', rarityTier: 'Uncommon', rarityPerKm2: 25, abundance: 'Small' },
      { name: 'Resin', type: 'luxury', icon: '🧴', rarityTier: 'Uncommon', rarityPerKm2: 20, abundance: 'Small' },
      { name: 'Pitch', type: 'luxury', icon: '🧯', rarityTier: 'Uncommon', rarityPerKm2: 18, abundance: 'Small' }
    ],
    weather: 'Cold winters (-20°C), mild summers (10–15°C), moderate precipitation',
    geography: 'Flat to rolling, lakes, permafrost',
    openLandPercent: 20,
    survivability: 'Difficult'
  }
];

export function getBiome(id) {
  return biomes.find(b => b.id === id);
}


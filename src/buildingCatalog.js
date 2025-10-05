export const buildingCatalog = [
  {
    id: 'lean-to',
    name: 'Lean-to Shelter',
    icon: '⛺',
    category: 'Shelter',
    description: 'A quick shelter made from flexible saplings and a sloped roof. Offers basic protection from the elements.',
    allowMultiple: true,
    unlock: { always: true },
    requirements: {
      minBuilders: 1,
      locationTags: ['forest', 'grove'],
      site: {
        category: 'forest',
        dimensions: { width: 3.6, depth: 2.1 },
        accessClearance: { front: 2.4, back: 0.6, left: 0.6, right: 0.6 }
      },
      craftedGoods: { cord: 8 }
    },
    effects: {
      occupancy: 2,
      comfort: 1,
      survivability: 1,
      demand: { firewood: -0.1 }
    },
    components: [
      {
        id: 'foundation',
        name: 'Ground Preparation',
        description: 'Clear debris and level the sleeping surface, laying a base of small stones for drainage.',
        laborHours: 4,
        minBuilders: 1,
        resources: { 'small stones': 12, pebbles: 20 }
      },
      {
        id: 'main-supports',
        name: 'Ridge Frame & Lashings',
        description: 'Raise forked poles and lash the ridge beam that anchors the shelter.',
        laborHours: 6,
        minBuilders: 1,
        isCore: true,
        resources: { firewood: 28, 'plant fibers': 12, cord: 4 }
      },
      {
        id: 'roof',
        name: 'Weather Shed Cover',
        description: 'Lay overlapping boughs down the leeward slope and extend a front overhang for access.',
        laborHours: 5,
        minBuilders: 1,
        resources: { firewood: 18, 'plant fibers': 16, cord: 4 }
      }
    ],
    addons: [
      {
        id: 'windbreak',
        name: 'Windbreak Walls',
        description: 'Add woven branch walls to shield against prevailing winds.',
        effects: { comfort: 1, demand: { firewood: -0.05 } },
        laborHours: 3,
        minBuilders: 1,
        resources: { firewood: 12, 'plant fibers': 8, cord: 2 }
      },
      {
        id: 'raised-bed',
        name: 'Raised Sleeping Platform',
        description: 'Lift sleepers off damp ground using a lashed frame.',
        effects: { comfort: 1 },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 10, 'plant fibers': 6, cord: 2, 'crafted goods': 1 }
      }
    ]
  },
  {
    id: 'fire-pit',
    name: 'Stone Fire Pit',
    icon: '🔥',
    category: 'Utility',
    description: 'Central hearth used for cooking and warmth. Concentrates heat and reduces smoke drift.',
    allowMultiple: false,
    unlock: { always: true },
    requirements: {
      minBuilders: 1,
      locationTags: ['forest', 'grove', 'meadow', 'open'],
      site: {
        categories: ['forest', 'cleared'],
        dimensions: { width: 1.8, depth: 1.8 },
        accessClearance: { front: 1.8, back: 1.8, left: 1.8, right: 1.8 }
      },
      craftedGoods: { 'crafted goods': 2 }
    },
    effects: {
      comfort: 1,
      supply: { cookedMeals: 2 },
      demand: { food: -0.5 },
      survivability: 1
    },
    components: [
      {
        id: 'foundation',
        name: 'Fire Ring Base',
        description: 'Excavate a shallow basin and line it with gravel for drainage.',
        laborHours: 3,
        minBuilders: 1,
        isCore: true,
        resources: { pebbles: 30 }
      },
      {
        id: 'walls',
        name: 'Stone Ring',
        description: 'Stack fist-sized stones to contain the fire.',
        laborHours: 4,
        minBuilders: 1,
        resources: { 'small stones': 40 }
      },
      {
        id: 'fireplace',
        name: 'Cooking Grate',
        description: 'Fashion a simple grate for pots and skewers.',
        laborHours: 2,
        minBuilders: 1,
        resources: { 'crafted goods': 2 }
      }
    ],
    addons: [
      {
        id: 'smoke-hood',
        name: 'Smoke Hood',
        description: 'Channel smoke upward using lashed poles and hides.',
        effects: { comfort: 1 },
        laborHours: 3,
        minBuilders: 1,
        resources: { firewood: 12, 'plant fibers': 6, cord: 2, hides: 1 }
      },
      {
        id: 'stone-benches',
        name: 'Stone Benches',
        description: 'Arrange stone seats around the fire for gathering.',
        effects: { appeal: 1 },
        laborHours: 2,
        minBuilders: 1,
        resources: { 'small stones': 16 }
      }
    ]
  },
  {
    id: 'drying-rack',
    name: 'Drying Rack',
    icon: '🪵',
    category: 'Production',
    description: 'Elevated framework to dry hides, herbs, and meat, reducing spoilage.',
    allowMultiple: true,
    unlock: {
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 1,
      locationTags: ['meadow', 'shore', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 3, depth: 1.8 },
        accessClearance: { front: 1.2, back: 1.2, left: 1, right: 1 }
      },
      craftedGoods: { cord: 9, 'crafted goods': 1 }
    },
    effects: {
      supply: { preservedFood: 1, hides: 0.5 },
      demand: { food: -0.2 },
      capacity: { storage: 40 }
    },
    components: [
      {
        id: 'stilts',
        name: 'Support Stilts',
        description: 'Set four sturdy posts to lift the rack clear of pests.',
        laborHours: 4,
        minBuilders: 1,
        isCore: true,
        resources: { firewood: 22, 'plant fibers': 8, cord: 3 }
      },
      {
        id: 'crossbeams',
        name: 'Crossbeams & Lashings',
        description: 'Lash horizontal beams and lattice for hanging materials.',
        laborHours: 5,
        minBuilders: 1,
        resources: { firewood: 16, 'plant fibers': 12, cord: 4, 'crafted goods': 1 }
      },
      {
        id: 'roof',
        name: 'Rain Cover',
        description: 'Stretch hides or woven mats as a simple roof.',
        laborHours: 3,
        minBuilders: 1,
        resources: { hides: 1, firewood: 6, 'plant fibers': 10, cord: 2 }
      }
    ],
    addons: [
      {
        id: 'smoke-channel',
        name: 'Smoke Channel',
        description: 'Direct smoke from a nearby fire to improve preservation.',
        effects: { supply: { preservedFood: 0.5 } },
        laborHours: 2,
        minBuilders: 1,
        resources: { firewood: 8, 'plant fibers': 6, cord: 2, 'crafted goods': 1 }
      }
    ]
  },
  {
    id: 'hunter-blind',
    name: "Hunter's Blind",
    icon: '🏹',
    category: 'Production',
    description: 'Concealed elevated post to improve hunting success and safety.',
    allowMultiple: true,
    unlock: {
      technologies: ['basic-tools'],
      buildings: [{ id: 'lean-to', count: 1 }]
    },
    requirements: {
      minBuilders: 2,
      locationTags: ['forest'],
      site: {
        category: 'forest',
        dimensions: { width: 2.4, depth: 2.4 },
        accessClearance: { front: 1.8, back: 1.2, left: 1.5, right: 1.5 }
      },
      craftedGoods: { cord: 14, 'crafted goods': 2 }
    },
    effects: {
      supply: { food: 1.5, hides: 0.5 },
      survivability: 1,
      appeal: 1
    },
    components: [
      {
        id: 'foundation',
        name: 'Footings & Bracing',
        description: 'Drive support poles deep and brace against sway.',
        laborHours: 6,
        minBuilders: 2,
        isCore: true,
        resources: { firewood: 36, 'small stones': 12, 'plant fibers': 10, cord: 4 }
      },
      {
        id: 'floor',
        name: 'Platform Floor',
        description: 'Lay planks and lashings to create a stable perch.',
        laborHours: 5,
        minBuilders: 2,
        resources: { firewood: 24, 'plant fibers': 12, cord: 4, 'crafted goods': 2 }
      },
      {
        id: 'walls',
        name: 'Camouflaged Walls',
        description: 'Weave brush and hides for concealment.',
        laborHours: 4,
        minBuilders: 1,
        resources: { hides: 1, firewood: 12, 'plant fibers': 14, cord: 4 }
      },
      {
        id: 'roof',
        name: 'Weatherproof Roof',
        description: 'Slope the roof to shed rain and snow.',
        laborHours: 3,
        minBuilders: 1,
        resources: { firewood: 10, 'plant fibers': 8, cord: 2 }
      }
    ],
    addons: [
      {
        id: 'ladder',
        name: 'Reinforced Ladder',
        description: 'Add a safer, sturdier ladder for quick access.',
        effects: { safety: 1 },
        laborHours: 2,
        minBuilders: 1,
        resources: { firewood: 10, 'plant fibers': 6, cord: 2 }
      }
    ]
  },
  {
    id: 'workshop',
    name: 'Crafter\'s Workshop',
    icon: '🛠️',
    category: 'Production',
    description: 'Covered workspace with benches and tool storage that boosts crafting output.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'fire-pit', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['meadow', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 6, depth: 8 },
        accessClearance: { front: 2.5, back: 2, left: 1.5, right: 1.5 }
      },
      craftedGoods: { cord: 16, 'crafted goods': 7 }
    },
    effects: {
      supply: { 'crafted goods': 2 },
      comfort: 1,
      maxWorkers: 2
    },
    components: [
      {
        id: 'foundation',
        name: 'Leveled Pad',
        description: 'Lay compacted earth and stone to level the workspace.',
        laborHours: 6,
        minBuilders: 2,
        isCore: true,
        resources: { 'small stones': 30, pebbles: 40 }
      },
      {
        id: 'main-supports',
        name: 'Timber Frame',
        description: 'Raise sturdy posts and beams to support the roof.',
        laborHours: 8,
        minBuilders: 3,
        resources: { firewood: 70, 'plant fibers': 24, cord: 6, 'crafted goods': 4 }
      },
      {
        id: 'walls',
        name: 'Half Walls & Storage',
        description: 'Add waist-high walls with shelving and tool pegs.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 48, 'plant fibers': 20, cord: 6, 'crafted goods': 3 }
      },
      {
        id: 'roof',
        name: 'Shingled Roof',
        description: 'Install a plank and bark roof to keep workers dry.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 36, 'plant fibers': 16, cord: 4 }
      }
    ],
    addons: [
      {
        id: 'forge',
        name: 'Charcoal Forge',
        description: 'Adds a clay-lined forge for metalworking research.',
        effects: { unlocks: ['metalworking-basics'], supply: { 'crafted goods': 1 } },
        laborHours: 6,
        minBuilders: 2,
        resources: { 'small stones': 24, firewood: 36, 'plant fibers': 10, cord: 4, 'crafted goods': 3 }
      }
    ]
  },
  {
    id: 'smokehouse',
    name: 'Smokehouse',
    icon: '🍖',
    category: 'Production',
    description: 'Enclosed smoking hut that preserves large batches of meat and fish.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'drying-rack', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['river', 'lake', 'shore', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 4.2, depth: 4.2 },
        accessClearance: { front: 3, back: 1.5, left: 1.5, right: 1.5 }
      },
      craftedGoods: { cord: 15, 'crafted goods': 4 }
    },
    effects: {
      supply: { preservedFood: 4 },
      demand: { food: -1, firewood: 0.5 },
      comfort: 1
    },
    components: [
      {
        id: 'foundation',
        name: 'Stone Footing',
        description: 'Create a sealed stone base to contain smoke.',
        laborHours: 8,
        minBuilders: 3,
        isCore: true,
        resources: { 'small stones': 60, pebbles: 60 }
      },
      {
        id: 'walls',
        name: 'Log Walls',
        description: 'Stack logs and seal gaps with mud and moss.',
        laborHours: 9,
        minBuilders: 3,
        resources: { firewood: 140, 'plant fibers': 30, cord: 8 }
      },
      {
        id: 'roof',
        name: 'Conical Vent Roof',
        description: 'Construct a vented roof to draw smoke upward.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 46, 'plant fibers': 20, cord: 4 }
      },
      {
        id: 'fireplace',
        name: 'Fire Chamber & Racks',
        description: 'Build a separate fire chamber and install hanging racks.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 24, 'plant fibers': 10, cord: 3, 'crafted goods': 4 }
      }
    ],
    addons: [
      {
        id: 'salt-bins',
        name: 'Salt Storage Bins',
        description: 'Add sealed bins for brining meats before smoking.',
        effects: { supply: { preservedFood: 1 }, storage: { salt: 50 } },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 16, 'plant fibers': 8, cord: 2, 'crafted goods': 1 }
      }
    ]
  },
  {
    id: 'longhouse',
    name: 'Longhouse',
    icon: '🏠',
    category: 'Shelter',
    description: 'Large communal dwelling with raised bunks, central hearth, and smoke vents.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'lean-to', count: 2 }, { id: 'fire-pit', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 4,
      locationTags: ['meadow', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 8, depth: 24 },
        accessClearance: { front: 3, back: 3, left: 2.5, right: 2.5 }
      },
      craftedGoods: { cord: 66, 'crafted goods': 13 }
    },
    effects: {
      occupancy: 12,
      comfort: 3,
      survivability: 2,
      demand: { firewood: -0.5 },
      maxWorkers: 2
    },
    components: [
      {
        id: 'foundation',
        name: 'Raised Timber Floor',
        description: 'Set heavy sills on stone footings to lift the structure.',
        laborHours: 12,
        minBuilders: 4,
        isCore: true,
        resources: { firewood: 200, 'small stones': 40, 'plant fibers': 40, cord: 12 }
      },
      {
        id: 'main-supports',
        name: 'Central Beams & Arches',
        description: 'Erect tall arches and ridge poles for the expansive roof.',
        laborHours: 14,
        minBuilders: 4,
        resources: { firewood: 240, 'plant fibers': 60, cord: 16, 'crafted goods': 6 }
      },
      {
        id: 'walls',
        name: 'Planked Walls & Doors',
        description: 'Install plank walls, smoke shutters, and wide doors.',
        laborHours: 12,
        minBuilders: 3,
        resources: { firewood: 180, 'plant fibers': 55, cord: 14, 'crafted goods': 4 }
      },
      {
        id: 'roof',
        name: 'Thatch & Beam Roof',
        description: 'Layer thatch over beams with adjustable smoke vents.',
        laborHours: 11,
        minBuilders: 3,
        resources: { firewood: 120, 'plant fibers': 80, cord: 20, 'crafted goods': 3 }
      },
      {
        id: 'fireplace',
        name: 'Central Hearths',
        description: 'Construct two large hearths with stone surrounds.',
        laborHours: 8,
        minBuilders: 2,
        resources: { 'small stones': 80, pebbles: 120, firewood: 40, 'plant fibers': 10, cord: 4 }
      }
    ],
    addons: [
      {
        id: 'privacy-screens',
        name: 'Privacy Screens',
        description: 'Hang woven partitions for family spaces.',
        effects: { comfort: 1, appeal: 1 },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 24, 'plant fibers': 36, cord: 10, 'crafted goods': 2 }
      },
      {
        id: 'insulated-roof',
        name: 'Insulated Roof Layer',
        description: 'Add moss and hides above the rafters to retain heat.',
        effects: { survivability: 1, demand: { firewood: -0.5 } },
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 40, hides: 3, 'plant fibers': 20, cord: 6 }
      }
    ]
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    icon: '🛡️',
    category: 'Defense',
    description: 'Tall lookout tower providing advance warning of threats.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'workshop', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['cliff', 'ridge', 'hill', 'high'],
      site: {
        category: 'cleared',
        dimensions: { width: 4, depth: 4 },
        accessClearance: { front: 3, back: 3, left: 3, right: 3 }
      },
      craftedGoods: { cord: 38, 'crafted goods': 8 }
    },
    effects: {
      survivability: 3,
      appeal: 1,
      unlocks: ['defense-drills']
    },
    components: [
      {
        id: 'foundation',
        name: 'Anchored Footings',
        description: 'Dig deep footings and backfill with stone for stability.',
        laborHours: 10,
        minBuilders: 3,
        isCore: true,
        resources: { 'small stones': 70, pebbles: 80, firewood: 60, 'plant fibers': 20, cord: 6 }
      },
      {
        id: 'main-supports',
        name: 'Tapered Supports',
        description: 'Raise heavy supports braced with diagonal timbers.',
        laborHours: 12,
        minBuilders: 3,
        resources: { firewood: 180, 'plant fibers': 50, cord: 14, 'crafted goods': 4 }
      },
      {
        id: 'floor',
        name: 'Observation Deck',
        description: 'Lay planked flooring with railing.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 80, 'plant fibers': 24, cord: 6, 'crafted goods': 2 }
      },
      {
        id: 'roof',
        name: 'Lookout Roof',
        description: 'Add a small roof and signal brazier platform.',
        laborHours: 5,
        minBuilders: 2,
        resources: { firewood: 45, 'plant fibers': 18, cord: 4 }
      },
      {
        id: 'access',
        name: 'Spiral Stairs',
        description: 'Construct a spiral stair for rapid ascent.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 90, 'plant fibers': 26, cord: 8, 'crafted goods': 2 }
      }
    ],
    addons: [
      {
        id: 'signal-braziers',
        name: 'Signal Braziers',
        description: 'Install braziers for signaling neighboring settlements.',
        effects: { unlocks: ['regional-alliance'] },
        laborHours: 3,
        minBuilders: 1,
        resources: { 'small stones': 20, firewood: 24, 'plant fibers': 8, cord: 2 }
      }
    ]
  }
];

export default buildingCatalog;

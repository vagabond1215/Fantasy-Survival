import { expandOpenTerrainTags } from './terrainTypes.js';

const baseBuildingCatalog = [
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
    id: 'crop-field',
    name: 'Tended Crop Field',
    icon: '🌾',
    category: 'Agriculture',
    description:
      'Tilled plots bordered by windbreaks and irrigation furrows that turn open ground into dependable harvests.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'fire-pit', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['meadow', 'grassland', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 12, depth: 18 },
        accessClearance: { front: 3, back: 2, left: 2, right: 2 }
      },
      craftedGoods: { cord: 18, 'crafted goods': 4 }
    },
    effects: {
      supply: { grain: 6, 'root vegetables': 4, herbs: 1 },
      demand: { 'crafted goods': 0.6 },
      jobs: { farm: 3 }
    },
    components: [
      {
        id: 'clearing',
        name: 'Brush Clearing & Stumping',
        description: 'Pull stones, roots, and brush then mound field borders against erosion.',
        laborHours: 10,
        minBuilders: 3,
        isCore: true,
        resources: { firewood: 80, 'small stones': 40, pebbles: 60, 'plant fibers': 24, cord: 8 }
      },
      {
        id: 'furrows',
        name: 'Tilling & Furrows',
        description: 'Turn the topsoil, lay drainage trenches, and stake crop rows.',
        laborHours: 9,
        minBuilders: 2,
        resources: { firewood: 36, pebbles: 30, 'plant fibers': 20, cord: 6, 'crafted goods': 2 }
      },
      {
        id: 'irrigation',
        name: 'Irrigation Channels',
        description: 'Line feeder ditches with stone and wattle spillways for steady watering.',
        laborHours: 8,
        minBuilders: 2,
        resources: { 'small stones': 50, pebbles: 70, firewood: 24, 'plant fibers': 18, cord: 4 }
      },
      {
        id: 'windbreaks',
        name: 'Windbreak Fencing',
        description: 'Plant woven hurdles and saplings along the prevailing wind edge.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 48, 'plant fibers': 22, cord: 6 }
      }
    ],
    addons: [
      {
        id: 'seed-house',
        name: 'Seed Shelter',
        description: 'Add a small covered bin to keep seed stores dry and pest free.',
        effects: { storage: { grain: 80, seeds: 40 } },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 24, 'small stones': 20, 'plant fibers': 12, cord: 4, 'crafted goods': 1 }
      }
    ]
  },
  {
    id: 'animal-pen',
    name: 'Timber Animal Pen',
    icon: '🐑',
    category: 'Agriculture',
    description: 'Fenced paddock with troughs and lean-tos for managing herds or work beasts.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'crop-field', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['meadow', 'grassland', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 10, depth: 14 },
        accessClearance: { front: 3, back: 2, left: 2, right: 2 }
      },
      craftedGoods: { cord: 22, 'crafted goods': 3 }
    },
    effects: {
      supply: { food: 3, hides: 0.8, 'animal fat': 0.4 },
      demand: { grain: 1.5, water: 2 },
      jobs: { herd: 2 }
    },
    components: [
      {
        id: 'postholes',
        name: 'Postholes & Stone Footings',
        description: 'Auger postholes and tamp stone collars to keep the fence upright.',
        laborHours: 8,
        minBuilders: 3,
        isCore: true,
        resources: { 'small stones': 60, pebbles: 70, firewood: 40, 'plant fibers': 16, cord: 6 }
      },
      {
        id: 'fencing',
        name: 'Woven Fencing',
        description: 'Weave rails and saplings into tight hurdles and double gates.',
        laborHours: 9,
        minBuilders: 2,
        resources: { firewood: 96, 'plant fibers': 40, cord: 12 }
      },
      {
        id: 'shelters',
        name: 'Lean-to Shelters',
        description: 'Raise timber sheds with thatched roofs for sick bays and shade.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 84, 'plant fibers': 32, cord: 10, 'crafted goods': 2 }
      },
      {
        id: 'watering',
        name: 'Troughs & Drainage',
        description: 'Carve log troughs, stone the muddiest ground, and drain wallows.',
        laborHours: 5,
        minBuilders: 1,
        resources: { firewood: 24, 'small stones': 30, pebbles: 40, 'crafted goods': 1 }
      }
    ],
    addons: [
      {
        id: 'milking-bay',
        name: 'Milking Bay',
        description: 'Build a narrow chute and stanchions for safer milking.',
        effects: { supply: { food: 1, milk: 1 } },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 28, 'plant fibers': 14, cord: 4, 'crafted goods': 1 }
      }
    ]
  },
  {
    id: 'granary',
    name: 'Raised Granary',
    icon: '🏚️',
    category: 'Storage',
    description: 'Elevated grain house with ventilation floors that guards stores from damp and vermin.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'crop-field', count: 2 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['meadow', 'hill', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 6, depth: 8 },
        accessClearance: { front: 2.5, back: 2, left: 2, right: 2 }
      },
      craftedGoods: { cord: 20, 'crafted goods': 5 }
    },
    effects: {
      survivability: 2,
      demand: { 'crafted goods': 0.3 },
      storage: { grain: 400, food: 120, seeds: 80 }
    },
    components: [
      {
        id: 'footings',
        name: 'Stone Piers',
        description: 'Set squat stone pillars and pad stones to lift the floor clear of pests.',
        laborHours: 7,
        minBuilders: 3,
        isCore: true,
        resources: { 'small stones': 90, pebbles: 100, 'crafted goods': 1 }
      },
      {
        id: 'floor',
        name: 'Slatted Subfloor',
        description: 'Lay tight slats and woven reed mats that breathe without spilling grain.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 70, 'plant fibers': 34, cord: 10, 'crafted goods': 2 }
      },
      {
        id: 'walls',
        name: 'Boarded Walls',
        description: 'Raise plank walls with rat guards and shingled ventilation shutters.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 90, 'plant fibers': 28, cord: 8, 'crafted goods': 1 }
      },
      {
        id: 'roof',
        name: 'Steep Thatch Roof',
        description: 'Build a steep pitch roof and ridge vent to shed rain and heat.',
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 60, 'plant fibers': 40, cord: 8 }
      }
    ],
    addons: [
      {
        id: 'drying-floor',
        name: 'Drying Loft',
        description: 'Suspend removable lattice floors for drying herbs and seed heads.',
        effects: { supply: { preservedFood: 1 }, storage: { herbs: 60 } },
        laborHours: 4,
        minBuilders: 1,
        resources: { firewood: 32, 'plant fibers': 18, cord: 4 }
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
      supply: {
        cookedMeals: 1.5,
        'hearty meal': 1,
        'bone broth': 0.5,
        'comfort meal': 0.5
      },
      demand: { food: -0.5, grain: -0.2, 'root vegetables': -0.2, salt: -0.1, spices: -0.05 },
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
      supply: {
        preservedFood: 1,
        hides: 0.5,
        'smoked provisions': 1,
        'preserved vegetables': 0.5,
        'herbal poultice': 0.3,
        'aromatic sachet': 0.2
      },
      demand: { food: -0.2, salt: -0.2, spices: -0.1, herbs: -0.1 },
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
    id: 'cookhouse',
    name: 'Communal Cookhouse',
    icon: '🍲',
    category: 'Food Production',
    description: 'Ventilated kitchen with racks, smoke flues, and work tables for preserving harvests at scale.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'fire-pit', count: 1 }, { id: 'drying-rack', count: 1 }],
      technologies: ['basic-tools']
    },
    requirements: {
      minBuilders: 3,
      locationTags: ['river', 'lake', 'shore', 'meadow', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 6, depth: 10 },
        accessClearance: { front: 3, back: 2, left: 2, right: 2 }
      },
      craftedGoods: { cord: 26, 'crafted goods': 6 }
    },
    effects: {
      supply: { cookedMeals: 4, 'hearty meal': 2, 'comfort meal': 1, preservedFood: 1 },
      demand: { food: 6, firewood: 3, herbs: 1, salt: 0.6, spices: 0.3 },
      jobs: { cook: 2 }
    },
    components: [
      {
        id: 'foundation',
        name: 'Stone Hearth Floor',
        description: 'Lay a mortared stone pad with drainage trenches to contain spills.',
        laborHours: 8,
        minBuilders: 3,
        isCore: true,
        resources: { 'small stones': 120, pebbles: 120, clay: 30 }
      },
      {
        id: 'smokehall',
        name: 'Smoke Hall Framing',
        description: 'Raise stout posts and beams with smoke baffles and storage lofts.',
        laborHours: 9,
        minBuilders: 3,
        resources: { firewood: 140, 'plant fibers': 48, cord: 12, 'crafted goods': 3 }
      },
      {
        id: 'prep-benches',
        name: 'Prep Benches & Racks',
        description: 'Install butcher blocks, hanging hooks, and sloped drying racks.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 80, 'plant fibers': 26, cord: 6, 'crafted goods': 2 }
      },
      {
        id: 'chimney',
        name: 'Chimney & Ventilation',
        description: 'Build a clay flue, smoke hoods, and shutters to control draft.',
        laborHours: 6,
        minBuilders: 2,
        resources: { clay: 24, 'small stones': 60, pebbles: 80, 'crafted goods': 2 }
      }
    ],
    addons: [
      {
        id: 'cellar',
        name: 'Cold Cellar',
        description: 'Dig a root cellar with plank shelving beneath the cookhouse.',
        effects: { storage: { food: 160, preservedFood: 120 }, survivability: 1 },
        laborHours: 6,
        minBuilders: 2,
        resources: { 'small stones': 90, pebbles: 100, firewood: 40, 'crafted goods': 2 }
      }
    ]
  },
  {
    id: 'smithy',
    name: 'Charcoal Smithy',
    icon: '⚒️',
    category: 'Production',
    description: 'Forge house with bellows, anvils, and quenching troughs for shaping bronze and iron.',
    allowMultiple: true,
    unlock: {
      buildings: [{ id: 'workshop', count: 1 }],
      technologies: ['metalworking-basics']
    },
    requirements: {
      minBuilders: 4,
      locationTags: ['stone', 'ore', 'cliff', 'ridge'],
      site: {
        category: 'cleared',
        dimensions: { width: 7, depth: 9 },
        accessClearance: { front: 3, back: 2.5, left: 2, right: 2 }
      },
      craftedGoods: { cord: 28, 'crafted goods': 8 }
    },
    effects: {
      supply: { 'crafted goods': 3, 'bronze ingot': 1 },
      demand: { 'raw ore': 2, charcoal: 2, firewood: 1 },
      jobs: { smith: 2 },
      storage: { 'raw ore': 160, charcoal: 120 }
    },
    components: [
      {
        id: 'foundation',
        name: 'Stone Forge Pad',
        description: 'Excavate and lay a heatproof stone slab with drainage and slag pit.',
        laborHours: 9,
        minBuilders: 4,
        isCore: true,
        resources: { 'small stones': 140, pebbles: 160, clay: 40 }
      },
      {
        id: 'forge',
        name: 'Forge & Chimney',
        description: 'Brick a double forge, install tuyères, and build a high draft chimney.',
        laborHours: 10,
        minBuilders: 3,
        resources: { clay: 60, 'small stones': 80, pebbles: 120, charcoal: 40, 'crafted goods': 4 }
      },
      {
        id: 'workbay',
        name: 'Work Bays & Anvils',
        description: 'Set heavy timbers, hanging racks, quench troughs, and tool chests.',
        laborHours: 8,
        minBuilders: 3,
        resources: { firewood: 120, 'plant fibers': 36, cord: 10, 'crafted goods': 4 }
      },
      {
        id: 'roof',
        name: 'Ventilated Roof',
        description: 'Raise a steep roof with smoke shutters and weatherproof shakes.',
        laborHours: 7,
        minBuilders: 2,
        resources: { firewood: 90, 'plant fibers': 30, cord: 8 }
      }
    ],
    addons: [
      {
        id: 'bellows',
        name: 'Twin Bellows',
        description: 'Install counterweighted bellows and crank shafts for constant airflow.',
        effects: { supply: { 'crafted goods': 1 } },
        laborHours: 5,
        minBuilders: 2,
        resources: { firewood: 36, 'plant fibers': 18, cord: 6, 'crafted goods': 2 }
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
  },
  {
    id: 'palisade',
    name: 'Perimeter Palisade',
    icon: '🪵',
    category: 'Defense',
    description: 'Encircling wall of sharpened logs with fighting walkways and a reinforced gate.',
    allowMultiple: false,
    unlock: {
      buildings: [{ id: 'watchtower', count: 1 }],
      technologies: ['defense-drills']
    },
    requirements: {
      minBuilders: 5,
      locationTags: ['meadow', 'forest', 'open'],
      site: {
        category: 'cleared',
        dimensions: { width: 24, depth: 24 },
        accessClearance: { front: 4, back: 4, left: 4, right: 4 }
      },
      craftedGoods: { cord: 60, 'crafted goods': 10 }
    },
    effects: {
      survivability: 4,
      safety: 3,
      demand: { firewood: 2, 'crafted goods': 1 }
    },
    components: [
      {
        id: 'ditch',
        name: 'Ditch & Berm',
        description: 'Excavate an outer ditch and throw up an inner berm for the log curtain.',
        laborHours: 16,
        minBuilders: 5,
        isCore: true,
        resources: { pebbles: 260, 'small stones': 160, firewood: 120 }
      },
      {
        id: 'walls',
        name: 'Log Curtain',
        description: 'Set sharpened trunks shoulder to shoulder and bind them with heavy wales.',
        laborHours: 18,
        minBuilders: 4,
        resources: { firewood: 420, 'plant fibers': 120, cord: 36, 'crafted goods': 6 }
      },
      {
        id: 'walkway',
        name: 'Fighting Walkway',
        description: 'Lay interior catwalks with railing and ladder access for sentries.',
        laborHours: 12,
        minBuilders: 3,
        resources: { firewood: 180, 'plant fibers': 48, cord: 12, 'crafted goods': 4 }
      },
      {
        id: 'gate',
        name: 'Reinforced Gatehouse',
        description: 'Build a double-door gate with drop bar, murder holes, and flanking platforms.',
        laborHours: 14,
        minBuilders: 3,
        resources: { firewood: 220, 'plant fibers': 60, cord: 18, 'small stones': 80, 'crafted goods': 6 }
      }
    ],
    addons: [
      {
        id: 'chevaux-de-frise',
        name: 'Chevaux-de-frise',
        description: 'Deploy portable spiked barriers outside the gate to break charges.',
        effects: { safety: 1 },
        laborHours: 6,
        minBuilders: 2,
        resources: { firewood: 120, 'plant fibers': 40, cord: 12 }
      }
    ]
  }
];

export const buildingCatalog = baseBuildingCatalog.map(entry => {
  if (!entry?.requirements?.locationTags) {
    return entry;
  }
  const expanded = expandOpenTerrainTags(entry.requirements.locationTags);
  if (expanded === entry.requirements.locationTags) {
    return entry;
  }
  return {
    ...entry,
    requirements: {
      ...entry.requirements,
      locationTags: expanded
    }
  };
});

export default buildingCatalog;

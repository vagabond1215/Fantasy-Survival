function createMode(base, overrides = {}) {
  const { effect: effectOverrides = {}, ...restOverrides } = overrides || {};
  const baseEffect = base.effect || {};
  const effect = {
    inputMultiplier: effectOverrides.inputMultiplier ?? baseEffect.inputMultiplier ?? 1,
    outputMultiplier: effectOverrides.outputMultiplier ?? baseEffect.outputMultiplier ?? 1,
    laborMultiplier: effectOverrides.laborMultiplier ?? baseEffect.laborMultiplier ?? 1,
    timeMultiplier: effectOverrides.timeMultiplier ?? baseEffect.timeMultiplier ?? 1,
    batchBonus: effectOverrides.batchBonus ?? baseEffect.batchBonus ?? 0
  };
  return {
    ...base,
    ...restOverrides,
    effect
  };
}

const MODES = {
  handCraft: overrides =>
    createMode(
      {
        id: 'manual',
        label: 'Hand Crafting',
        type: 'manual',
        priority: 0,
        effect: { inputMultiplier: 1, outputMultiplier: 0.75, laborMultiplier: 1.25, timeMultiplier: 1.15, batchBonus: 0 }
      },
      overrides
    ),
  handCook: overrides =>
    createMode(
      {
        id: 'manual-cook',
        label: 'Improvised Cooking',
        type: 'manual',
        priority: 0,
        effect: { inputMultiplier: 1, outputMultiplier: 0.65, laborMultiplier: 1.3, timeMultiplier: 1.25, batchBonus: 0 }
      },
      overrides
    ),
  workshopBench: overrides =>
    createMode(
      {
        id: 'workshop-bench',
        label: "Workshop Benches",
        type: 'building',
        building: 'workshop',
        priority: 18,
        effect: { inputMultiplier: 1, outputMultiplier: 1.15, laborMultiplier: 0.85, timeMultiplier: 0.9, batchBonus: 0 }
      },
      overrides
    ),
  workshopForge: overrides =>
    createMode(
      {
        id: 'workshop-forge',
        label: 'Workshop Forge',
        type: 'building',
        building: 'workshop',
        priority: 22,
        effect: { inputMultiplier: 1, outputMultiplier: 1.2, laborMultiplier: 0.8, timeMultiplier: 0.85, batchBonus: 0 }
      },
      overrides
    ),
  steelForge: overrides =>
    createMode(
      {
        id: 'steel-forge',
        label: 'Refined Forge',
        type: 'building',
        building: 'workshop',
        priority: 24,
        effect: { inputMultiplier: 1, outputMultiplier: 1.25, laborMultiplier: 0.75, timeMultiplier: 0.85, batchBonus: 0 }
      },
      overrides
    ),
  firePit: overrides =>
    createMode(
      {
        id: 'fire-pit',
        label: 'Fire Pit Hearth',
        type: 'building',
        building: 'fire-pit',
        priority: 20,
        effect: { inputMultiplier: 1, outputMultiplier: 1.25, laborMultiplier: 0.9, timeMultiplier: 0.8, batchBonus: 0 }
      },
      overrides
    ),
  longhouseHearth: overrides =>
    createMode(
      {
        id: 'longhouse-hearth',
        label: 'Longhouse Hearth',
        type: 'building',
        building: 'longhouse',
        priority: 16,
        effect: { inputMultiplier: 1, outputMultiplier: 1.18, laborMultiplier: 0.9, timeMultiplier: 0.85, batchBonus: 0 }
      },
      overrides
    ),
  dryingRack: overrides =>
    createMode(
      {
        id: 'drying-rack',
        label: 'Drying Rack',
        type: 'building',
        building: 'drying-rack',
        priority: 14,
        effect: { inputMultiplier: 0.95, outputMultiplier: 1.1, laborMultiplier: 0.95, timeMultiplier: 0.85, batchBonus: 0 }
      },
      overrides
    ),
  smokehouse: overrides =>
    createMode(
      {
        id: 'smokehouse',
        label: 'Smokehouse',
        type: 'building',
        building: 'smokehouse',
        priority: 22,
        effect: { inputMultiplier: 0.9, outputMultiplier: 1.35, laborMultiplier: 0.85, timeMultiplier: 0.9, batchBonus: 0 }
      },
      overrides
    )
};

export const recipeGroups = [
  {
    id: 'intermediate',
    label: 'Intermediate Materials',
    recipes: [
      {
        id: 'cord',
        name: 'Cord',
        icon: '🪢',
        description: 'Twist pliable fibers into sturdy cord for lashings and traps.',
        category: 'intermediate',
        inputs: { 'plant fibers': 3 },
        outputs: { cord: 1 },
        laborHours: 0.5,
        timeHours: 0.5,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 5, label: 'lengths' },
        production: [MODES.handCraft(), MODES.workshopBench()]
      },
      {
        id: 'sharpened-stone',
        name: 'Sharpened Stone',
        icon: '🗡️',
        description: 'Shape a keen stone edge for scraping hides or cutting cords.',
        category: 'intermediate',
        inputs: { 'small stones': 1 },
        outputs: { 'sharpened stone': 1 },
        laborHours: 0.25,
        timeHours: 0.25,
        tools: ['wooden hammer'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 6, label: 'blanks' },
        production: [MODES.handCraft(), MODES.workshopBench()]
      },
      {
        id: 'prepared-hides',
        name: 'Prepared Hides',
        icon: '🧵',
        description: 'Scrape, cure, and soften hides for armor and advanced crafting.',
        category: 'intermediate',
        inputs: { hides: 1, herbs: 1, 'plant fibers': 1 },
        outputs: { 'prepared hides': 1 },
        laborHours: 2.5,
        timeHours: 6,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 2, label: 'hides' },
        production: [MODES.handCraft(), MODES.dryingRack()]
      },
      {
        id: 'seasoned-wood',
        name: 'Seasoned Wood',
        icon: '🪑',
        description: 'Air-dry select timber into balanced hafts and bow staves.',
        category: 'intermediate',
        inputs: { firewood: 3 },
        outputs: { 'seasoned wood': 1 },
        laborHours: 1,
        timeHours: 24,
        tools: ['stone hand axe'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'bundles' },
        production: [MODES.handCraft({ label: 'Open-Air Seasoning', effect: { outputMultiplier: 0.7, laborMultiplier: 1.3 } }), MODES.workshopBench({ label: 'Workshop Racks' })]
      },
      {
        id: 'rendered-tallow',
        name: 'Rendered Tallow',
        icon: '🕯️',
        description: 'Slowly clarify animal fats into clean-burning tallow cakes.',
        category: 'intermediate',
        inputs: { 'animal fat': 3, firewood: 1, salt: 1 },
        outputs: { 'rendered tallow': 2 },
        laborHours: 1.5,
        timeHours: 4,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'batches' },
        production: [
          MODES.handCook({ label: 'Camp Rendering', effect: { outputMultiplier: 0.7, laborMultiplier: 1.25, timeMultiplier: 1.2 } }),
          MODES.firePit()
        ]
      },
      {
        id: 'grain-flour',
        name: 'Ground Flour',
        icon: '🥣',
        description: 'Crush grains into coarse flour suitable for breads and porridges.',
        category: 'intermediate',
        inputs: { grain: 3, 'small stones': 1 },
        outputs: { 'ground flour': 3 },
        laborHours: 1,
        timeHours: 1,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 4, label: 'sacks' },
        production: [MODES.handCraft({ label: 'Hand Milling', effect: { outputMultiplier: 0.8, laborMultiplier: 1.2 } }), MODES.workshopBench({ label: 'Quern Bench' })]
      },
      {
        id: 'bronze-ingot',
        name: 'Smelt Bronze Ingot',
        icon: '🔶',
        description: 'Smelt raw ore in clay crucibles to pour balanced bronze ingots.',
        category: 'intermediate',
        inputs: { 'raw ore': 3, firewood: 2 },
        outputs: { 'bronze ingot': 1 },
        laborHours: 6,
        timeHours: 8,
        tools: ['wooden hammer'],
        unlock: { technologies: ['bronze-smithing'] },
        batch: { defaultSize: 1, maxSize: 2, label: 'ingots' },
        production: [MODES.workshopForge()]
      },
      {
        id: 'iron-ingot',
        name: 'Smelt Iron Ingot',
        icon: '⛓️',
        description: 'Roast ore and hammer blooms into workable iron ingots.',
        category: 'intermediate',
        inputs: { 'raw ore': 4, firewood: 3 },
        outputs: { 'iron ingot': 1 },
        laborHours: 8,
        timeHours: 12,
        tools: ['wooden hammer'],
        unlock: { technologies: ['iron-smithing'] },
        batch: { defaultSize: 1, maxSize: 2, label: 'ingots' },
        production: [MODES.workshopForge({ label: 'Bloomery Forge', effect: { outputMultiplier: 1.22, laborMultiplier: 0.78 } })]
      },
      {
        id: 'steel-ingot',
        name: 'Forge Steel Ingot',
        icon: '⚙️',
        description: 'Carburize iron with additional ore to forge high-grade steel.',
        category: 'intermediate',
        inputs: { 'iron ingot': 1, 'raw ore': 3, 'seasoned wood': 1 },
        outputs: { 'steel ingot': 1 },
        laborHours: 10,
        timeHours: 16,
        tools: ['wooden hammer'],
        unlock: { technologies: ['steel-smithing'] },
        batch: { defaultSize: 1, maxSize: 2, label: 'ingots' },
        production: [MODES.steelForge()]
      }
    ]
  },
  {
    id: 'meals',
    label: 'Cooked Meals',
    recipes: [
      {
        id: 'hearty-stew',
        name: 'Hearty Stew',
        icon: '🍲',
        description: 'Simmer grains, vegetables, and meat into a filling communal stew.',
        category: 'meals',
        inputs: { grain: 2, 'root vegetables': 3, food: 2, herbs: 1, salt: 1 },
        outputs: { 'hearty meal': 3, 'bone broth': 1 },
        laborHours: 2.5,
        timeHours: 3,
        tools: ['stone knife', 'wooden hammer'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 2, maxSize: 4, label: 'pots' },
        production: [MODES.handCook({ effect: { outputMultiplier: 0.6, laborMultiplier: 1.35 } }), MODES.firePit(), MODES.longhouseHearth({ label: 'Longhouse Cauldrons', effect: { outputMultiplier: 1.35, laborMultiplier: 0.8, timeMultiplier: 0.75 } })]
      },
      {
        id: 'traveler-flatbread',
        name: 'Traveler Flatbread',
        icon: '🥖',
        description: 'Bake dense flatbreads that travel well for scouting parties.',
        category: 'meals',
        inputs: { 'ground flour': 3, salt: 1, 'rendered tallow': 1 },
        outputs: { "traveler's bread": 4 },
        laborHours: 1.5,
        timeHours: 2,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 2, maxSize: 4, label: 'rounds' },
        production: [MODES.handCook({ label: 'Hearthstones', effect: { outputMultiplier: 0.7, laborMultiplier: 1.25 } }), MODES.firePit()]
      },
      {
        id: 'herbal-porridge',
        name: 'Herbal Porridge',
        icon: '🥣',
        description: 'Blend grains, berries, and herbs into a soothing morning porridge.',
        category: 'meals',
        inputs: { grain: 2, berries: 2, herbs: 1, spices: 1 },
        outputs: { 'comfort meal': 3 },
        laborHours: 1,
        timeHours: 1.5,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 2, maxSize: 4, label: 'bowls' },
        production: [MODES.handCook({ effect: { outputMultiplier: 0.7 } }), MODES.firePit()]
      }
    ]
  },
  {
    id: 'preserves',
    label: 'Preserves & Stores',
    recipes: [
      {
        id: 'smoke-cured-provisions',
        name: 'Smoke-cured Provisions',
        icon: '🥩',
        description: 'Salt and smoke cuts of meat for durable expedition rations.',
        category: 'preserves',
        inputs: { food: 4, salt: 2, spices: 1, firewood: 2 },
        outputs: { 'smoked provisions': 3 },
        laborHours: 3,
        timeHours: 6,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 2, maxSize: 4, label: 'hooks' },
        production: [
          MODES.handCook({ label: 'Makeshift Smoke', effect: { outputMultiplier: 0.6, laborMultiplier: 1.4 } }),
          MODES.dryingRack(),
          MODES.smokehouse()
        ]
      },
      {
        id: 'pickled-vegetables',
        name: 'Pickled Vegetables',
        icon: '🥬',
        description: 'Pack roots with herbs and salt into lasting pickled stores.',
        category: 'preserves',
        inputs: { 'root vegetables': 4, salt: 1, herbs: 1, 'crafted goods': 1 },
        outputs: { 'preserved vegetables': 4 },
        laborHours: 2,
        timeHours: 4,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 2, maxSize: 4, label: 'jars' },
        production: [MODES.handCraft({ label: 'Earthen Crocks', effect: { outputMultiplier: 0.8, laborMultiplier: 1.2 } }), MODES.workshopBench({ label: 'Workshop Brining' })]
      },
      {
        id: 'aromatic-sachets',
        name: 'Aromatic Sachets',
        icon: '🪷',
        description: 'Dry herbs and spices into sachets that deter pests from stores.',
        category: 'preserves',
        inputs: { herbs: 3, spices: 2, 'plant fibers': 2 },
        outputs: { 'aromatic sachet': 3 },
        laborHours: 1,
        timeHours: 2,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 4, label: 'sachets' },
        production: [MODES.handCraft({ label: 'Sun-dried Bundles' }), MODES.dryingRack(), MODES.workshopBench({ label: 'Workshop Infusers', effect: { outputMultiplier: 1.2, laborMultiplier: 0.8 } })]
      }
    ]
  },
  {
    id: 'remedies',
    label: 'Herbal Remedies',
    recipes: [
      {
        id: 'herbal-poultice',
        name: 'Herbal Poultice',
        icon: '🩹',
        description: 'Mash herbs into soothing poultices that speed recovery.',
        category: 'remedies',
        inputs: { herbs: 3, 'plant fibers': 2, 'animal fat': 1 },
        outputs: { 'herbal poultice': 2 },
        laborHours: 1.5,
        timeHours: 2,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'wraps' },
        production: [MODES.handCraft({ label: 'Field Dressing' }), MODES.dryingRack(), MODES.workshopBench({ label: 'Workshop Apothecary', effect: { outputMultiplier: 1.25, laborMultiplier: 0.85 } })]
      },
      {
        id: 'restorative-tonic',
        name: 'Restorative Tonic',
        icon: '🧪',
        description: 'Brew concentrated herbal tonics to bolster the infirm.',
        category: 'remedies',
        inputs: { herbs: 2, berries: 2, spices: 1, salt: 1 },
        outputs: { 'restorative tonic': 2 },
        laborHours: 2,
        timeHours: 3,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'bottles' },
        production: [MODES.handCook({ label: 'Camp Brew', effect: { outputMultiplier: 0.7 } }), MODES.firePit({ label: 'Hearth Decoction' }), MODES.workshopBench({ label: 'Workshop Still', effect: { outputMultiplier: 1.25, laborMultiplier: 0.85 } })]
      },
      {
        id: 'soothing-salve',
        name: 'Soothing Salve',
        icon: '💧',
        description: 'Blend tallow and herbs into salves that stave off infection.',
        category: 'remedies',
        inputs: { 'rendered tallow': 2, herbs: 2, spices: 1 },
        outputs: { 'soothing salve': 3 },
        laborHours: 1.5,
        timeHours: 2,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'pots' },
        production: [MODES.handCraft({ label: 'Palm Mixing' }), MODES.workshopBench({ label: 'Workshop Mortars', effect: { outputMultiplier: 1.2, laborMultiplier: 0.85 } })]
      }
    ]
  },
  {
    id: 'ammunition',
    label: 'Ammunition & Weaponry',
    recipes: [
      {
        id: 'arrow-bundle',
        name: 'Arrow Bundle',
        icon: '🏹',
        description: 'Carve, fletch, and bundle arrows for ranged hunters.',
        category: 'ammunition',
        inputs: { 'seasoned wood': 1, 'plant fibers': 2, 'sharpened stone': 2, feathers: 4 },
        outputs: { 'wooden arrow': 6 },
        laborHours: 2,
        timeHours: 2,
        tools: ['stone knife'],
        unlock: { technologies: ['basic-tools'] },
        batch: { defaultSize: 1, maxSize: 3, label: 'bundles' },
        production: [MODES.handCraft({ label: 'Trail Fletching', effect: { outputMultiplier: 0.8, laborMultiplier: 1.2 } }), MODES.workshopBench({ label: 'Workshop Fletching Table', effect: { outputMultiplier: 1.2, laborMultiplier: 0.85 } })]
      }
    ]
  },
  {
    id: 'equipment',
    label: 'Crafted Equipment',
    recipes: [
      {
        id: 'stone-hand-axe',
        name: 'Stone Hand Axe',
        icon: '🪓',
        description: 'Haft a sharpened stone blade onto a seasoned branch for chopping timber.',
        category: 'equipment',
        inputs: {
          cord: 1,
          'sharpened stone': 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'stone hand axe': 1 },
        laborHours: 2,
        timeHours: 2,
        tools: ['stone knife', 'wooden hammer'],
        unlock: { technologies: ['basic-tools'] },
        production: [MODES.handCraft({ label: 'Camp Assembly', effect: { outputMultiplier: 0.85, laborMultiplier: 1.15 } }), MODES.workshopBench({ label: 'Workshop Assembly' })]
      },
      {
        id: 'stone-pick',
        name: 'Stone Pick',
        icon: '⛏️',
        description: 'Chip a pointed stone and lash it to a haft for prying ore from seams.',
        category: 'equipment',
        inputs: {
          cord: 1,
          'sharpened stone': 2,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'stone pick': 1 },
        laborHours: 2.5,
        timeHours: 2.5,
        tools: ['stone knife', 'wooden hammer'],
        unlock: { technologies: ['basic-tools'] },
        production: [MODES.handCraft({ label: 'Trail Forging', effect: { outputMultiplier: 0.85, laborMultiplier: 1.2 } }), MODES.workshopBench({ label: 'Workshop Toolbench' })]
      },
      {
        id: 'bronze-axe',
        name: 'Bronze Axe',
        icon: '🪓',
        description: 'Forge a bronze axe head and bind it to a resilient haft for advanced lumbering.',
        category: 'equipment',
        inputs: {
          'bronze ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'bronze axe': 1 },
        laborHours: 6,
        timeHours: 6,
        tools: ['wooden hammer'],
        unlock: { technologies: ['bronze-smithing'] },
        production: [MODES.workshopForge({ label: 'Bronze Forge Bay' })]
      },
      {
        id: 'bronze-pick',
        name: 'Bronze Pick',
        icon: '⛏️',
        description: 'Cast and temper a bronze pick for sturdier mining expeditions.',
        category: 'equipment',
        inputs: {
          'bronze ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'bronze pick': 1 },
        laborHours: 6,
        timeHours: 6,
        tools: ['wooden hammer'],
        unlock: { technologies: ['bronze-smithing'] },
        production: [MODES.workshopForge({ label: 'Bronze Forge Bay' })]
      },
      {
        id: 'iron-axe',
        name: 'Iron Axe',
        icon: '🪓',
        description: 'Shape wrought iron into a balanced axe capable of felling great trees.',
        category: 'equipment',
        inputs: {
          'iron ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'iron axe': 1 },
        laborHours: 8,
        timeHours: 8,
        tools: ['wooden hammer'],
        unlock: { technologies: ['iron-smithing'] },
        production: [MODES.workshopForge({ label: 'Iron Forge Bay', effect: { outputMultiplier: 1.25, laborMultiplier: 0.78 } })]
      },
      {
        id: 'iron-pick',
        name: 'Iron Pick',
        icon: '⛏️',
        description: 'Forge an iron pickaxe able to bite through dense stone and ore.',
        category: 'equipment',
        inputs: {
          'iron ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'iron pick': 1 },
        laborHours: 8,
        timeHours: 8,
        tools: ['wooden hammer'],
        unlock: { technologies: ['iron-smithing'] },
        production: [MODES.workshopForge({ label: 'Iron Forge Bay', effect: { outputMultiplier: 1.25, laborMultiplier: 0.78 } })]
      },
      {
        id: 'steel-axe',
        name: 'Steel Axe',
        icon: '🪓',
        description: 'Quench a steel axe head and mount it for master-level forestry.',
        category: 'equipment',
        inputs: {
          'steel ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'steel axe': 1 },
        laborHours: 12,
        timeHours: 12,
        tools: ['wooden hammer'],
        unlock: { technologies: ['steel-smithing'] },
        production: [MODES.steelForge({ label: 'Steel Forge Bay' })]
      },
      {
        id: 'steel-pick',
        name: 'Steel Pick',
        icon: '⛏️',
        description: 'Temper a steel pick to shatter the hardest stone without dulling.',
        category: 'equipment',
        inputs: {
          'steel ingot': 2,
          cord: 1,
          'sturdy haft stick': { label: 'sturdy haft stick', dynamicOptions: 'sturdy-stick', quantity: 1 }
        },
        outputs: { 'steel pick': 1 },
        laborHours: 12,
        timeHours: 12,
        tools: ['wooden hammer'],
        unlock: { technologies: ['steel-smithing'] },
        production: [MODES.steelForge({ label: 'Steel Forge Bay' })]
      }
    ]
  }
];

export default recipeGroups;

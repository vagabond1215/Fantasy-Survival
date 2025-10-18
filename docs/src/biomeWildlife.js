export const biomeWildlifeData = {
  'alpine': {
    animals: [
      {
        name: 'Snow Hare',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Snares', 'Small Bow'],
        notes: 'Common in alpine meadows; white coat blends with snow so ranged tools help ensure a catch.'
      },
      {
        name: 'Ptarmigan',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Throwing Nets', 'Snares'],
        notes: 'Ground-nesting bird that flushes in flocks; light nets or snares near nests work well.'
      },
      {
        name: 'Mountain Goat',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Spears', 'Shortbow'],
        notes: 'Sure-footed on cliffs; best ambushed along narrow ledges with ranged weapons.'
      },
      {
        name: 'Alpine Ibex',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Composite Bow', 'Spears'],
        notes: 'Will defend itself with horns if cornered; high ground advantage needed.'
      },
      {
        name: 'Snow Leopard',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Heavy Spear', 'Pit Traps'],
        notes: 'Solitary apex predator; trap lines and heavy spears required to safely harvest.'
      },
      {
        name: 'Golden Eagle',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Lure Traps', 'Weighted Nets'],
        notes: 'Powerful raptor that defends nest sites; requires distraction lures and weighted nets to subdue.'
      },
      {
        name: 'Alpine Marmot',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Deadfall Traps', 'Snares'],
        notes: 'Lives in colonies among rock slides; small deadfalls near burrow entrances are effective.'
      }
    ],
    plants: [
      {
        name: 'Alpine Sorrel',
        edibleParts: 'Leaves and flowers eaten fresh or brewed for vitamin-rich tea.',
        poisonousParts: 'High oxalic acid can irritate stomach if consumed in excess.',
        usefulParts: 'Leaves for salads, drying for travel rations.'
      },
      {
        name: 'Dwarf Willow',
        edibleParts: 'Young shoots can be chewed for mild sweetness.',
        poisonousParts: 'None when harvested young.',
        usefulParts: 'Flexible stems for basketry and bindings; bark contains salicin for pain relief.'
      },
      {
        name: 'Edelweiss',
        edibleParts: 'Not typically eaten but petals steep into medicinal tea.',
        poisonousParts: 'None known.',
        usefulParts: 'Leaves and flowers prized for poultices against altitude sickness.'
      },
      {
        name: 'Reindeer Lichen',
        edibleParts: 'Edible after boiling or soaking to remove bitterness; used as survival ration.',
        poisonousParts: 'Raw lichen contains bitter acids that upset stomach.',
        usefulParts: 'Dried mats used as insulation in bedding and shelters.'
      },
      {
        name: 'Glacier Moss',
        edibleParts: 'Limited nutrition; boiled to thicken soups.',
        poisonousParts: 'None known.',
        usefulParts: 'Absorbent clumps for bandages and water filtration.'
      },
      {
        name: 'Mountain Cranberry',
        edibleParts: 'Berries eaten raw or preserved as tart relishes.',
        poisonousParts: 'Leaves slightly astringent; avoid heavy brews.',
        usefulParts: 'Berries rich in vitamin C; stems woven into small cordage.'
      },
      {
        name: 'Arnica',
        edibleParts: 'Not edible, but petals can be infused for external salves only.',
        poisonousParts: 'Toxic if ingested; restrict to topical uses.',
        usefulParts: 'Flowers and leaves used in poultices for bruises and muscle aches.'
      }
    ]
  },
  'boreal-taiga': {
    animals: [
      {
        name: 'Snowshoe Hare',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Snares'],
        notes: 'Abundant along willow thickets; simple loop snares suffice.'
      },
      {
        name: 'Moose',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Long Spears', 'Heavy Bow'],
        notes: 'Massive size and temper mean only experienced parties with heavy weapons should attempt.'
      },
      {
        name: 'Wolf',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Spears', 'Longbow'],
        notes: 'Pack hunter; lure into traps or take from distance to avoid being surrounded.'
      },
      {
        name: 'Caribou',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Spears', 'Shortbow'],
        notes: 'Migratory herds; stalking near feeding grounds is effective.'
      },
      {
        name: 'Lynx',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Deadfall Traps', 'Small Spears'],
        notes: 'Solitary but fierce; deadfalls baited with hare carcasses recommended.'
      },
      {
        name: 'Brown Bear',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Heavy Spears', 'Reinforced Pit Traps'],
        notes: 'Drawn to berry patches and fish runs; only approach with heavy weapons and strong trap works.'
      },
      {
        name: 'Pine Marten',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Tree Snares', 'Cage Traps'],
        notes: 'Agile climber that raids camps; suspend snares from branches to capture without damaging pelt.'
      }
    ],
    plants: [
      {
        name: 'Cloudberry',
        edibleParts: 'Golden berries eaten fresh or preserved.',
        poisonousParts: 'Leaves mildly laxative if brewed strong.',
        usefulParts: 'Berries provide vitamin C; leaves for light teas.'
      },
      {
        name: 'Fireweed',
        edibleParts: 'Young shoots and flowers edible raw or steamed.',
        poisonousParts: 'Older stems tough but not poisonous.',
        usefulParts: 'Fibers from stems for cordage; flowers for soothing salves.'
      },
      {
        name: 'Labrador Tea',
        edibleParts: 'Leaves brewed into aromatic tea.',
        poisonousParts: 'Large doses cause dizziness; avoid concentrated brews.',
        usefulParts: 'Medicinal tea for colds; leaves as insect repellent when crushed.'
      },
      {
        name: 'Bog Cranberry',
        edibleParts: 'Tart berries eaten or dried.',
        poisonousParts: 'Leaves mildly toxic if ingested.',
        usefulParts: 'Berries for preserves; vines woven into mats.'
      },
      {
        name: 'Chaga Fungus',
        edibleParts: 'Not directly edible but brewed into immune-boosting tea.',
        poisonousParts: 'Inedible raw chunks are indigestible.',
        usefulParts: 'Dried fungus used as tinder and medicinal decoctions.'
      },
      {
        name: 'Bunchberry',
        edibleParts: 'Bright red berries eaten fresh or mashed into cakes.',
        poisonousParts: 'None known though leaves are bland.',
        usefulParts: 'Leafy mats used for bedding insulation; berries for dyes.'
      },
      {
        name: 'Spruce Resin',
        edibleParts: 'Not edible, but chewed for antiseptic qualities.',
        poisonousParts: 'Ingesting large globs upsets stomach.',
        usefulParts: 'Resin boiled into pitch for sealing canoes, waterproofing gear, and torch fuel.'
      }
    ]
  },
  'coastal-temperate': {
    animals: [
      {
        name: 'Harbor Seal',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Harpoons', 'Nets'],
        notes: 'Hauled-out seals can be approached quietly; harpoons and nets needed to secure catch.'
      },
      {
        name: 'Rockfish',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Fishing Spears', 'Hook and Line'],
        notes: 'Shallow tidal pools teem with rockfish accessible at low tide.'
      },
      {
        name: 'Black-tailed Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Spears'],
        notes: 'Feeds along forest edge; silent stalking works best.'
      },
      {
        name: 'River Otter',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Piscivore',
        tools: ['Deadfall Traps', 'Nets'],
        notes: 'Playful but defensive; trap near slides or dens.'
      },
      {
        name: 'Wild Boar',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Boar Spear', 'Pit Traps'],
        notes: 'Charges when startled; heavy spears or pits required.'
      },
      {
        name: 'Steller Sea Lion',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Harpoons', 'Heavy Nets'],
        notes: 'Large bulls defend harems aggressively; coordinated harpooning from boats is safest.'
      },
      {
        name: 'Giant Pacific Octopus',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Barbed Spears', 'Weighted Traps'],
        notes: 'Hides in tidal caves; require weighted traps or barbed spears to pry from lairs.'
      }
    ],
    plants: [
      {
        name: 'Sea Lettuce',
        edibleParts: 'Fronds eaten raw or dried for soups.',
        poisonousParts: 'Spoils quickly when stranded; inspect for rot.',
        usefulParts: 'Dried seaweed used as salt substitute and fertilizer.'
      },
      {
        name: 'Coastal Sage',
        edibleParts: 'Leaves used sparingly to season food.',
        poisonousParts: 'Concentrated oils can irritate skin.',
        usefulParts: 'Leaves for herbal medicine and insect repellent smudge.'
      },
      {
        name: 'Salmonberry',
        edibleParts: 'Sweet berries and spring shoots edible.',
        poisonousParts: 'None, though leaves are bitter.',
        usefulParts: 'Canes woven into light baskets; berries for dye.'
      },
      {
        name: 'Kelp',
        edibleParts: 'Blades sliced and boiled; stipes pickled.',
        poisonousParts: 'None when harvested fresh.',
        usefulParts: 'Dried strips for rope reinforcement and shelter waterproofing.'
      },
      {
        name: 'Sitka Spruce',
        edibleParts: 'Vitamin-rich new tips chewed raw.',
        poisonousParts: 'None.',
        usefulParts: 'Resin for pitch, bark for tanning, wood for construction.'
      },
      {
        name: 'Thimbleberry',
        edibleParts: 'Soft berries eaten fresh; young shoots steamed.',
        poisonousParts: 'Leaves have fine hairs that irritate if eaten raw.',
        usefulParts: 'Leaves used as natural plates; canes for lightweight basket frames.'
      },
      {
        name: 'Devil\'s Club',
        edibleParts: 'Inner cambium can be dried and powdered as survival flour.',
        poisonousParts: 'Spines cause infection if not handled carefully; berries toxic.',
        usefulParts: 'Roots and bark brewed into medicinal wash; stems for protective hedges.'
      }
    ]
  },
  'coastal-tropical': {
    animals: [
      {
        name: 'Green Sea Turtle',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Nets', 'Harpoons'],
        notes: 'Nesting beaches offer chances to capture with nets.'
      },
      {
        name: 'Reef Shark',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Heavy Spear', 'Shark Hook'],
        notes: 'Requires boat support and sturdy gear; dangerous in shallow lagoons.'
      },
      {
        name: 'Parrotfish',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Spearfishing Gear'],
        notes: 'Colorful reef fish; spearfishing in clear water is effective.'
      },
      {
        name: 'Iguana',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Throwing Net'],
        notes: 'Basks on rocks; quick with nets or long poles.'
      },
      {
        name: 'Wild Pig',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Boar Spear', 'Pit Trap'],
        notes: 'Introduced populations can be aggressive; traps reduce risk.'
      },
      {
        name: 'Great Barracuda',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Barbed Spears', 'Strong Fishing Line'],
        notes: 'Fast reef predator attracted to shiny lures; requires barbed gear and caution near teeth.'
      },
      {
        name: 'Coconut Crab',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Hand Nets', 'Baited Traps'],
        notes: 'Powerful claws can injure; baited ground traps or nets at night are effective.'
      }
    ],
    plants: [
      {
        name: 'Coconut Palm',
        edibleParts: 'Coconut water, flesh, and young shoots.',
        poisonousParts: 'Falling coconuts pose hazard but plant is non-toxic.',
        usefulParts: 'Fibers for rope, fronds for roofing, shells for bowls.'
      },
      {
        name: 'Breadfruit',
        edibleParts: 'Starchy fruits baked or roasted.',
        poisonousParts: 'Latex sap mildly irritating to skin.',
        usefulParts: 'Wood for light construction; leaves for wrapping food.'
      },
      {
        name: 'Mangrove Oyster Mushroom',
        edibleParts: 'Caps sautéed or dried.',
        poisonousParts: 'Stems woody but not toxic.',
        usefulParts: 'Cultured on driftwood for ongoing harvests.'
      },
      {
        name: 'Noni',
        edibleParts: 'Fruit edible though pungent; used medicinally.',
        poisonousParts: 'Seeds hard but non-toxic.',
        usefulParts: 'Leaves for poultices; bark for dyes.'
      },
      {
        name: 'Sea Grape',
        edibleParts: 'Clusters of grapes eaten fresh or made into preserves.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves large enough for makeshift plates; bark for tannins.'
      },
      {
        name: 'Pandanus',
        edibleParts: 'Fruit segments roasted; young leaves flavor dishes.',
        poisonousParts: 'Leaf edges serrated; handle carefully to avoid cuts.',
        usefulParts: 'Leaves woven into mats, sails, and baskets; aerial roots for cordage.'
      },
      {
        name: 'Beach Morning Glory',
        edibleParts: 'Leaves boiled as emergency greens.',
        poisonousParts: 'Raw leaves mildly laxative.',
        usefulParts: 'Vines stabilize sand for camp foundations; flowers attract pollinators for gardens.'
      }
    ]
  },
  'flooded-grasslands': {
    animals: [
      {
        name: 'Capybara',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Nets', 'Spears'],
        notes: 'Semi-aquatic rodents; ambush near water entries with nets.'
      },
      {
        name: 'Marsh Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Spears'],
        notes: 'Tracks follow reed beds; wading hunters need tall stilts or boats.'
      },
      {
        name: 'Caiman',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Harpoons', 'Heavy Spears'],
        notes: 'Ambush predator; secure with lines and dispatch from shore.'
      },
      {
        name: 'Snapping Turtle',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Hook and Line', 'Snares'],
        notes: 'Powerful bite; use baited hooks or snares on logs.'
      },
      {
        name: 'Ibis',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Throwing Net'],
        notes: 'Feeds in shallow pools; nets or sling stones adequate.'
      },
      {
        name: 'Water Buffalo',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Heavy Spears', 'Pit Traps'],
        notes: 'Massive bovines that defend herds fiercely; only attempt with reinforced pits or coordinated spear lines.'
      },
      {
        name: 'Anaconda',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Weighted Nets', 'Machetes'],
        notes: 'Ambushes from flooded burrows; weighted nets prevent constriction while dispatching with blades.'
      }
    ],
    plants: [
      {
        name: 'Cattail',
        edibleParts: 'Rhizomes roasted, young shoots eaten raw.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves woven into mats; fluff for insulation and tinder.'
      },
      {
        name: 'Lotus',
        edibleParts: 'Seeds and rhizomes edible when cooked.',
        poisonousParts: 'Raw tubers slightly bitter.',
        usefulParts: 'Leaves used as wraps; stems for teas calming nerves.'
      },
      {
        name: 'Water Hyacinth',
        edibleParts: 'Young leaves edible cooked in moderation.',
        poisonousParts: 'Older parts accumulate toxins from water.',
        usefulParts: 'Fibrous stems for cordage; roots filter water when dried.'
      },
      {
        name: 'Swamp Cranberry',
        edibleParts: 'Tart berries eaten or dried.',
        poisonousParts: 'Leaves mildly toxic.',
        usefulParts: 'Berries for dye; vines for basket weaving.'
      },
      {
        name: 'Marsh Marigold',
        edibleParts: 'Young leaves edible after boiling.',
        poisonousParts: 'Raw plant contains protoanemonin which irritates skin and gut.',
        usefulParts: 'Bright blossoms for dyes and ceremonial garlands.'
      },
      {
        name: 'Water Chestnut',
        edibleParts: 'Crunchy nuts peeled and eaten raw or roasted.',
        poisonousParts: 'Shell spines sharp; handle with care to avoid punctures.',
        usefulParts: 'Dried shells ground for abrasive scrub; nut flour for thickening stews.'
      },
      {
        name: 'Papyrus',
        edibleParts: 'Young shoots chewed for moisture and mild sweetness.',
        poisonousParts: 'None when harvested fresh.',
        usefulParts: 'Stems split into fibers for writing sheets, mats, and lightweight rafts.'
      }
    ]
  },
  'island-temperate': {
    animals: [
      {
        name: 'Puffin',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Landing Nets', 'Cliff Ropes'],
        notes: 'Nest on cliffs; requires rope access and nets.'
      },
      {
        name: 'Red Fox',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Foot Snares', 'Short Spear'],
        notes: 'Skittish yet will bite; best taken with baited snares.'
      },
      {
        name: 'Sea Bass',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Hook and Line', 'Fish Traps'],
        notes: 'Common around rocky shoals; simple traps work.'
      },
      {
        name: 'Fallow Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Spears'],
        notes: 'Graze in forest glades; stalking at dawn yields success.'
      },
      {
        name: 'Cormorant',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Throwing Net'],
        notes: 'Fishes near surf; nets or bolas effective.'
      },
      {
        name: 'Grey Seal',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Piscivore',
        tools: ['Harpoons', 'Club'],
        notes: 'Hauls out on quiet beaches; adults defend pups fiercely so coordinated approach required.'
      },
      {
        name: 'Storm Petrel',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Fine Nets', 'Sling'],
        notes: 'Small seabirds returning to burrows at dusk; fine mesh nets gather them without damage.'
      }
    ],
    plants: [
      {
        name: 'Sea Beet',
        edibleParts: 'Leaves and roots edible cooked.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves as greens; roots for dye extraction.'
      },
      {
        name: 'Heather',
        edibleParts: 'Flowers for tea.',
        poisonousParts: 'None.',
        usefulParts: 'Stems for thatching; flowers for dye and medicine.'
      },
      {
        name: 'Rowan',
        edibleParts: 'Berries edible when cooked into jams.',
        poisonousParts: 'Raw berries cause stomach upset.',
        usefulParts: 'Wood for tool handles; leaves ward insects.'
      },
      {
        name: 'Sea Buckthorn',
        edibleParts: 'Bright berries packed with vitamins.',
        poisonousParts: 'Thorns scratch but plant non-toxic.',
        usefulParts: 'Oil from berries for salves; branches for hedging.'
      },
      {
        name: 'Bog Myrtle',
        edibleParts: 'Leaves brewed into fragrant tea.',
        poisonousParts: 'Large doses mildly narcotic.',
        usefulParts: 'Leaves repel insects; used in tanning hides.'
      },
      {
        name: 'Sea Kale',
        edibleParts: 'Blanched shoots and leaves eaten like cabbage.',
        poisonousParts: 'None, though raw leaves can be bitter.',
        usefulParts: 'Roots stabilize dunes near camps; leaves preserved as salted greens.'
      },
      {
        name: 'Wild Angelica',
        edibleParts: 'Stems and seeds flavor broths and breads.',
        poisonousParts: 'Sap may cause photosensitivity; handle with gloves in sunlight.',
        usefulParts: 'Hollow stems for blowpipes and whistles; aromatic seeds for medicinal tonics.'
      }
    ]
  },
  'island-tropical': {
    animals: [
      {
        name: 'Flying Fox',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Net Traps'],
        notes: 'Roosts in fruit groves; nets set at dusk catch returning bats.'
      },
      {
        name: 'Mahi-Mahi',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Piscivore',
        tools: ['Harpoons', 'Heavy Line'],
        notes: 'Strong open-water fish requiring stout tackle from boats.'
      },
      {
        name: 'Land Crab',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Hand Nets', 'Baskets'],
        notes: 'Nocturnal forager; easily collected with baskets.'
      },
      {
        name: 'Monitor Lizard',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Spears', 'Snares'],
        notes: 'Powerful tail and bite; heavy spears advised.'
      },
      {
        name: 'Triggerfish',
        difficulty: 'Easy',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Spearfishing Gear'],
        notes: 'Territorial around reef; spear quickly before they bite tools.'
      },
      {
        name: 'Hammerhead Shark',
        difficulty: 'Very Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Reinforced Harpoons', 'Heavy Line'],
        notes: 'Powerful open-water predator; only tackle with boats, multiple lines, and barbed harpoons.'
      },
      {
        name: 'Sooty Tern',
        difficulty: 'Easy',
        aggressive: true,
        diet: 'Piscivore',
        tools: ['Fine Nets', 'Climbing Hooks'],
        notes: 'Breeds in vast colonies and dive-bombs intruders; collect quickly with nets at nesting ledges.'
      }
    ],
    plants: [
      {
        name: 'Breadnut',
        edibleParts: 'Seeds roasted or ground into flour.',
        poisonousParts: 'Raw seeds mildly toxic.',
        usefulParts: 'Wood for carvings; leaves as fodder.'
      },
      {
        name: 'Taro',
        edibleParts: 'Corms and leaves edible when thoroughly cooked.',
        poisonousParts: 'Raw plant contains calcium oxalate crystals.',
        usefulParts: 'Leaves as wraps; fibers for cordage.'
      },
      {
        name: 'Pandanus',
        edibleParts: 'Fruit segments chewed or boiled.',
        poisonousParts: 'Sharp leaves irritate skin.',
        usefulParts: 'Leaves woven into mats; prop roots for scaffolding.'
      },
      {
        name: 'Turmeric',
        edibleParts: 'Rhizomes ground into spice.',
        poisonousParts: 'None.',
        usefulParts: 'Rhizome for dye and medicine; leaves for wrapping food.'
      },
      {
        name: 'Island Morel',
        edibleParts: 'Caps edible when cooked.',
        poisonousParts: 'Raw morels cause digestive upset.',
        usefulParts: 'Dried mushrooms store well for trade.'
      },
      {
        name: 'Jackfruit',
        edibleParts: 'Sweet bulbs and seeds eaten cooked or dried.',
        poisonousParts: 'Latex sap sticky but non-toxic.',
        usefulParts: 'Wood resistant to rot; fibrous rags from inner bark.'
      },
      {
        name: 'Beach Almond',
        edibleParts: 'Seeds roasted; young leaves eaten as tart greens.',
        poisonousParts: 'Fallen fruit ferments quickly; discard if sour.',
        usefulParts: 'Leaves yield brown dye; timber dense and salt-resistant for tools.'
      }
    ]
  },
  'mangrove': {
    animals: [
      {
        name: 'Mud Crab',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Hand Nets', 'Baskets'],
        notes: 'Hide in burrows; dig or bait with fish scraps.'
      },
      {
        name: 'Mangrove Snapper',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Hook and Line', 'Spear'],
        notes: 'Caught around submerged roots; use baited hooks or pole spears.'
      },
      {
        name: 'Saltwater Crocodile',
        difficulty: 'Very Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Heavy Harpoons', 'Pit Traps'],
        notes: 'Extremely dangerous; only attempt with reinforced traps and teams.'
      },
      {
        name: 'Mudskipper',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Hand Nets'],
        notes: 'Easily scooped from mudflats during low tide.'
      },
      {
        name: 'Egret',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Throwing Net', 'Slings'],
        notes: 'Feeds along shallows; quick net toss secures prey.'
      },
      {
        name: 'Fishing Cat',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Cage Traps', 'Spears'],
        notes: 'Stalks fish along mangrove roots; cage traps near game trails prevent escape.'
      },
      {
        name: 'Moray Eel',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Hooked Spears', 'Basket Traps'],
        notes: 'Hides within submerged roots; use hooked spears or baited baskets to avoid bites.'
      }
    ],
    plants: [
      {
        name: 'Red Mangrove',
        edibleParts: 'Propagules edible after soaking to remove tannins.',
        poisonousParts: 'Raw bark extremely tannic and astringent.',
        usefulParts: 'Roots stabilize banks; bark rich in tannins for leather.'
      },
      {
        name: 'Black Mangrove',
        edibleParts: 'Nectar collected by bees; leaves salty but edible in small amounts.',
        poisonousParts: 'Concentrated leaf salt irritates if eaten raw in quantity.',
        usefulParts: 'Wood for charcoal; pneumatophores used as fish trap stakes.'
      },
      {
        name: 'Mangrove Fern',
        edibleParts: 'Young fronds cooked like greens.',
        poisonousParts: 'Raw fronds bitter but not toxic.',
        usefulParts: 'Fronds woven for shade mats; spores for ritual powders.'
      },
      {
        name: 'Sea Purslane',
        edibleParts: 'Succulent leaves eaten raw or pickled.',
        poisonousParts: 'None.',
        usefulParts: 'Salt-tolerant plant good for erosion control; leaves as poultice.'
      },
      {
        name: 'Buttonwood',
        edibleParts: 'Not edible.',
        poisonousParts: 'Sap mildly irritating.',
        usefulParts: 'Hardwood excellent for tool handles and firewood.'
      },
      {
        name: 'Nipa Palm',
        edibleParts: 'Sap tapped for sweet syrup; young seeds eaten soft.',
        poisonousParts: 'Fermented sap intoxicating; consume moderately.',
        usefulParts: 'Leaves for thatching boats and roofs; ribs woven into baskets.'
      },
      {
        name: 'Mangrove Apple',
        edibleParts: 'Fruits eaten raw or cooked after soaking to remove bitterness.',
        poisonousParts: 'Unsoaked fruits astringent; may upset stomach.',
        usefulParts: 'Wood resilient to rot; bark yields dye for nets.'
      }
    ]
  },
  'mediterranean-woodland': {
    animals: [
      {
        name: 'Wild Goat',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Snares'],
        notes: 'Browsers among scrub; snares along trails effective.'
      },
      {
        name: 'Wild Boar',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Boar Spear', 'Hunting Dogs'],
        notes: 'Thick hide and tusks require heavy spear and support.'
      },
      {
        name: 'Red Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Longbow', 'Spears'],
        notes: 'Stalk near watering holes at dusk.'
      },
      {
        name: 'Golden Jackal',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Foot Traps', 'Spears'],
        notes: 'Scavenger that may attack livestock; traps keep hunters safe.'
      },
      {
        name: 'European Hare',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Snares'],
        notes: 'Abundant; loop snares along runs yield steady meat.'
      },
      {
        name: 'Eurasian Badger',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Pit Traps', 'Short Spears'],
        notes: 'Burrower with fierce bite; smoking dens and using pit traps keep hunters safe.'
      },
      {
        name: 'Barbary Partridge',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Throw Nets', 'Sling'],
        notes: 'Ground bird flushes in coveys; nets or slings capture without damaging meat.'
      }
    ],
    plants: [
      {
        name: 'Olive',
        edibleParts: 'Fruits edible after brining.',
        poisonousParts: 'Raw olives very bitter.',
        usefulParts: 'Oil from fruits; wood dense for carving.'
      },
      {
        name: 'Thyme',
        edibleParts: 'Leaves used fresh or dried.',
        poisonousParts: 'None.',
        usefulParts: 'Aromatic herb for medicine and insect repellent.'
      },
      {
        name: 'Cork Oak',
        edibleParts: 'Acorns edible when leached.',
        poisonousParts: 'Raw acorns high in tannins.',
        usefulParts: 'Bark harvested for cork; wood durable for tools.'
      },
      {
        name: 'Mastic Shrub',
        edibleParts: 'Resin chewed like gum.',
        poisonousParts: 'None.',
        usefulParts: 'Resin for varnish, incense, and sealant.'
      },
      {
        name: 'Rockrose',
        edibleParts: 'Petals for tea.',
        poisonousParts: 'None.',
        usefulParts: 'Resin (labdanum) used in perfumes and waterproofing.'
      },
      {
        name: 'Bay Laurel',
        edibleParts: 'Leaves flavor stews and preserves.',
        poisonousParts: 'Seeds mildly toxic if eaten raw.',
        usefulParts: 'Leaves for fumigation; wood aromatic for carving utensils.'
      },
      {
        name: 'Carob',
        edibleParts: 'Pods ground into sweet flour.',
        poisonousParts: 'None.',
        usefulParts: 'Seeds used as beads and weights; wood for durable handles.'
      }
    ]
  },
  'montane-cloud': {
    animals: [
      {
        name: 'Spectacled Bear',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Heavy Spear', 'Pit Traps'],
        notes: 'Large and strong; trapping is safer than open combat.'
      },
      {
        name: 'Mountain Tapir',
        difficulty: 'Challenging',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Spears', 'Bolas'],
        notes: 'Shy yet powerful; bolas slow them for finishing spear strike.'
      },
      {
        name: 'Andean Guan',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Slings', 'Shortbow'],
        notes: 'Ground bird often in flocks; simple ranged tools suffice.'
      },
      {
        name: 'Ocelot',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Box Traps', 'Short Spears'],
        notes: 'Stealthy predator; baited traps recommended.'
      },
      {
        name: 'Tree Porcupine',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Long Poles', 'Nets'],
        notes: 'Quills deter predators; knock from branches with poles into nets.'
      },
      {
        name: 'Andean Condor',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Baited Traps', 'Weighted Nets'],
        notes: 'Massive soaring scavenger; bait high cliffs and drop weighted nets to subdue safely.'
      },
      {
        name: 'Woolly Monkey',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Blowguns', 'Climbing Nets'],
        notes: 'Social primates throw debris at intruders; use ranged darts and canopy nets.'
      }
    ],
    plants: [
      {
        name: 'Tree Fern',
        edibleParts: 'Fiddleheads edible when steamed.',
        poisonousParts: 'Older fronds fibrous but non-toxic.',
        usefulParts: 'Fronds for thatching; pith used in poultices.'
      },
      {
        name: 'Cinchona',
        edibleParts: 'Bark not edible but brewed for medicine.',
        poisonousParts: 'Excessive bark tea causes nausea.',
        usefulParts: 'Bark rich in quinine for fever treatment.'
      },
      {
        name: 'Passionflower Vine',
        edibleParts: 'Fruit edible fresh.',
        poisonousParts: 'Leaves mildly sedative but safe as tea.',
        usefulParts: 'Vines for rope; flowers calming in infusions.'
      },
      {
        name: 'Bromeliad',
        edibleParts: 'Central cups store potable water; some species edible fruit.',
        poisonousParts: 'Leaf edges serrated but not toxic.',
        usefulParts: 'Leaves woven for mats; water reservoirs harbor frogs for bait.'
      },
      {
        name: 'Moss Blanket',
        edibleParts: 'Not edible.',
        poisonousParts: 'None.',
        usefulParts: 'Thick mats absorb moisture; used for bedding and wound packing.'
      },
      {
        name: 'Giant Orchid',
        edibleParts: 'Not edible but petals produce calming infusion.',
        poisonousParts: 'None.',
        usefulParts: 'Blooms valued for trade and ceremonial garlands; aerial roots woven into delicate cord.'
      },
      {
        name: 'Tree Tomato',
        edibleParts: 'Fruits eaten fresh or stewed into sauces.',
        poisonousParts: 'Leaves and stems bitter; avoid ingestion.',
        usefulParts: 'Fruits rich in vitamins; skins yield crimson dye.'
      }
    ]
  },
  'savanna': {
    animals: [
      {
        name: 'Thomson Gazelle',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Throwing Spear'],
        notes: 'Fast runners; requires coordinated drives or ranged weapons.'
      },
      {
        name: 'Plains Zebra',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Long Spears', 'Pit Traps'],
        notes: 'Kicks and bites when cornered; pits or strong spears recommended.'
      },
      {
        name: 'Warthog',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Boar Spear', 'Pit Trap'],
        notes: 'Charges when threatened; take from cover.'
      },
      {
        name: 'Nile Tilapia',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Fish Traps', 'Nets'],
        notes: 'Abundant in water holes; baskets or nets gather many.'
      },
      {
        name: 'Lion',
        difficulty: 'Very Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Heavy Spear', 'Fire-hardened Stakes'],
        notes: 'Apex predator; only attempt with prepared defenses and group tactics.'
      },
      {
        name: 'African Wild Dog',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Long Spears', 'Baited Pits'],
        notes: 'Coordinated pack hunters; lure into baited pits or deter with fire-hardened spears.'
      },
      {
        name: 'Ostrich',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Bolas', 'Long Spears'],
        notes: 'Fast runners deliver powerful kicks; bolas trip them before closing with spears.'
      }
    ],
    plants: [
      {
        name: 'Baobab',
        edibleParts: 'Fruit pulp and seeds edible.',
        poisonousParts: 'None.',
        usefulParts: 'Bark fibers for rope; hollow trunks store water.'
      },
      {
        name: 'Sorghum',
        edibleParts: 'Seeds ground into flour.',
        poisonousParts: 'Sprouts contain cyanogenic compounds if not leached.',
        usefulParts: 'Stalks for weaving and fodder.'
      },
      {
        name: 'Acacia Gum',
        edibleParts: 'Sap chewed as sweet gum.',
        poisonousParts: 'Thorns puncture skin but plant non-toxic.',
        usefulParts: 'Gum as binder for inks and medicines; wood for fuel.'
      },
      {
        name: "Devil's Claw",
        edibleParts: 'Roots edible when roasted.',
        poisonousParts: 'Raw roots bitter.',
        usefulParts: 'Roots for anti-inflammatory medicine; dried pods for tools.'
      },
      {
        name: 'Elephant Grass',
        edibleParts: 'Young shoots edible.',
        poisonousParts: 'Older leaves sharp but non-toxic.',
        usefulParts: 'Tall stalks for thatching and fences.'
      },
      {
        name: 'Marula',
        edibleParts: 'Sweet fruits and nuts edible raw or fermented.',
        poisonousParts: 'Fermented fruit intoxicating; consume responsibly.',
        usefulParts: 'Kernels yield rich oil for skin; bark used in tonics.'
      },
      {
        name: 'Shea Tree',
        edibleParts: 'Nuts processed into butter for cooking.',
        poisonousParts: 'Raw kernels bitter; roast before eating.',
        usefulParts: 'Butter used for preservation and skin care; wood carved into utensils.'
      }
    ]
  },
  'temperate-deciduous': {
    animals: [
      {
        name: 'White-tailed Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Longbow', 'Spears'],
        notes: 'Abundant browse lines; silent approach essential.'
      },
      {
        name: 'Black Bear',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Heavy Spear', 'Crossbow'],
        notes: 'Generally shy but dangerous when provoked; ranged weapons plus spears.'
      },
      {
        name: 'Wild Turkey',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Slings', 'Snares'],
        notes: 'Flocks roost in trees; use snares on trails or stones from slings.'
      },
      {
        name: 'Beaver',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Deadfall Traps', 'Spears'],
        notes: 'Protect territories fiercely; trap near dams.'
      },
      {
        name: 'Brook Trout',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Fishing Line', 'Weirs'],
        notes: 'Cold streams support trout; simple weirs yield steady food.'
      },
      {
        name: 'Bobcat',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Box Traps', 'Short Spear'],
        notes: 'Solitary hunter; baited box traps capture it without damaging hide.'
      },
      {
        name: 'Raccoon',
        difficulty: 'Easy',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Cage Traps', 'Snares'],
        notes: 'Clever scavenger prone to raiding stores; secure bait with sturdy cage traps.'
      }
    ],
    plants: [
      {
        name: 'Maple',
        edibleParts: 'Sap boiled into syrup.',
        poisonousParts: 'Wilted leaves toxic to livestock but safe when fresh.',
        usefulParts: 'Wood for building; sap for sugar.'
      },
      {
        name: 'Morel Mushroom',
        edibleParts: 'Caps edible when cooked.',
        poisonousParts: 'Raw morels cause cramps.',
        usefulParts: 'Dried morels valuable trade good.'
      },
      {
        name: 'Blackberry',
        edibleParts: 'Berries eaten fresh; young shoots edible.',
        poisonousParts: 'None though thorns sharp.',
        usefulParts: 'Canes for cordage; leaves for tea.'
      },
      {
        name: 'Wild Leek',
        edibleParts: 'Bulbs and leaves edible; strong onion flavor.',
        poisonousParts: 'None.',
        usefulParts: 'Flavoring agent; leaves for medicinal poultices.'
      },
      {
        name: 'Oak',
        edibleParts: 'Acorns edible after leaching tannins.',
        poisonousParts: 'Raw acorns high in tannins causing stomach upset.',
        usefulParts: 'Wood for construction; bark for tanning.'
      },
      {
        name: 'Ramp',
        edibleParts: 'Bulbs and leaves edible raw or cooked with pungent flavor.',
        poisonousParts: 'Overharvesting weakens patches; take sparingly.',
        usefulParts: 'Leaves fermented for condiments; bulbs ward pests when hung in stores.'
      },
      {
        name: 'Spicebush',
        edibleParts: 'Berries and twigs brewed into warming teas.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves repel insects; berries ground as allspice substitute for curing meat.'
      }
    ]
  },
  'temperate-rainforest': {
    animals: [
      {
        name: 'Roosevelt Elk',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Longbow', 'Heavy Spear'],
        notes: 'Massive animals requiring coordinated hunts and sturdy weapons.'
      },
      {
        name: 'Black-tailed Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Spears'],
        notes: 'Edge habitats provide clear shots.'
      },
      {
        name: 'Salmon',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Piscivore',
        tools: ['Fish Weirs', 'Spears'],
        notes: 'Seasonal runs fill rivers; weirs or spears at rapids harvest easily.'
      },
      {
        name: 'Black Bear',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Heavy Spear', 'Crossbow'],
        notes: 'Feasts on salmon; similar strategy to deciduous forests.'
      },
      {
        name: 'Pacific Marten',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Box Traps'],
        notes: 'Valuable pelt; baited traps near fallen logs work best.'
      },
      {
        name: 'Cougar',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Long Spears', 'Hunting Dogs'],
        notes: 'Stealthy predator that ambushes prey; flush with dogs and confront using long spears.'
      },
      {
        name: 'Common Raven',
        difficulty: 'Easy',
        aggressive: true,
        diet: 'Omnivore',
        tools: ['Slings', 'Nets'],
        notes: 'Intelligent scavenger raids camps; capture with baited nets or deter using slings.'
      }
    ],
    plants: [
      {
        name: "Devil's Club",
        edibleParts: 'Spring shoots edible after peeling.',
        poisonousParts: 'Spines irritate skin; bark tea strong and purgative.',
        usefulParts: 'Inner bark for medicinal tea; spines used in talismans.'
      },
      {
        name: 'Licorice Fern',
        edibleParts: 'Rhizomes taste sweet raw.',
        poisonousParts: 'None.',
        usefulParts: 'Rhizomes for cough remedies; fronds for bedding.'
      },
      {
        name: 'Salal',
        edibleParts: 'Berries eaten fresh or dried.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves for tea and to line storage baskets.'
      },
      {
        name: 'Western Red Cedar',
        edibleParts: 'Not edible.',
        poisonousParts: 'Needles aromatic but not for consumption.',
        usefulParts: 'Wood rot-resistant for housing; bark strips for weaving.'
      },
      {
        name: 'Oyster Mushroom',
        edibleParts: 'Caps edible when cooked.',
        poisonousParts: 'None if correctly identified.',
        usefulParts: 'Cultivable on logs; good protein source.'
      },
      {
        name: 'Skunk Cabbage',
        edibleParts: 'Roots edible only after extensive drying and cooking.',
        poisonousParts: 'Raw plant causes severe irritation due to calcium oxalate.',
        usefulParts: 'Leaves wrap foods for steaming; roots pounded into poultices for bruises.'
      },
      {
        name: 'Sitka Valerian',
        edibleParts: 'Roots simmered into calming tea.',
        poisonousParts: 'Large doses sedative; use moderately.',
        usefulParts: 'Roots valued for sleep draughts; leaves attract pollinators to gardens.'
      }
    ]
  },
  'tropical-monsoon': {
    animals: [
      {
        name: 'Water Buffalo',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Heavy Spears', 'Pit Traps'],
        notes: 'Massive horns and strength; safest with traps and teams.'
      },
      {
        name: 'Spotted Deer',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Shortbow', 'Spears'],
        notes: 'Feeds at forest edges; ambush near watering holes.'
      },
      {
        name: 'Monitor Lizard',
        difficulty: 'Challenging',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Spears', 'Noose Poles'],
        notes: 'Strong tail; subdue with noose poles before finishing.'
      },
      {
        name: 'Giant River Catfish',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Carnivore',
        tools: ['Hook and Line', 'Nets'],
        notes: 'Flooded rivers harbor large catfish; stout lines necessary.'
      },
      {
        name: 'Peafowl',
        difficulty: 'Easy',
        aggressive: false,
        diet: 'Omnivore',
        tools: ['Throwing Net', 'Sling'],
        notes: 'Vocal birds easy to locate; nets catch roosting birds.'
      },
      {
        name: 'Smooth-coated Otter',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Piscivore',
        tools: ['Nets', 'Cage Traps'],
        notes: 'Hunts in family groups along flooded channels; cage traps baited with fish prevent escape.'
      },
      {
        name: 'King Cobra',
        difficulty: 'Very Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Snake Hooks', 'Long Spears'],
        notes: 'Highly venomous; requires skilled handlers using hooks and long spears for dispatch.'
      }
    ],
    plants: [
      {
        name: 'Bamboo',
        edibleParts: 'Young shoots edible after boiling.',
        poisonousParts: 'Raw shoots contain cyanogenic glycosides.',
        usefulParts: 'Culms for construction, tools, and containers.'
      },
      {
        name: 'Rice',
        edibleParts: 'Grains harvested and husked for staple food.',
        poisonousParts: 'None.',
        usefulParts: 'Straw for thatching and mats.'
      },
      {
        name: 'Jackfruit',
        edibleParts: 'Sweet bulbs and seeds edible cooked.',
        poisonousParts: 'Latex sticky but non-toxic.',
        usefulParts: 'Wood for furniture; leaves for fodder.'
      },
      {
        name: 'Betel Leaf',
        edibleParts: 'Leaves chewed with lime and areca nut.',
        poisonousParts: 'Excessive chewing stains teeth and can irritate mouth.',
        usefulParts: 'Leaves as natural wrapping and antiseptic poultice.'
      },
      {
        name: 'Lotus',
        edibleParts: 'Seeds, tubers, and leaves edible when cooked.',
        poisonousParts: 'Raw tubers slightly astringent.',
        usefulParts: 'Fibers from stems woven into cloth; seeds for medicinal use.'
      },
      {
        name: 'Areca Palm',
        edibleParts: 'Nuts chewed with betel leaf; heart eaten as vegetable.',
        poisonousParts: 'Overuse of nuts can stain teeth and upset stomach.',
        usefulParts: 'Trunk for light construction; fronds for thatching and fans.'
      },
      {
        name: 'Turmeric',
        edibleParts: 'Rhizomes dried and ground into spice.',
        poisonousParts: 'None.',
        usefulParts: 'Powerful dye and antiseptic; leaves used to wrap fish before steaming.'
      }
    ]
  },
  'tropical-rainforest': {
    animals: [
      {
        name: 'Tapir',
        difficulty: 'Challenging',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Spears', 'Pit Traps'],
        notes: 'Shy but heavy; pits along trails effective.'
      },
      {
        name: 'Jaguar',
        difficulty: 'Very Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Heavy Spear', 'Pit Traps'],
        notes: 'Stealthy predator; avoid direct confrontation.'
      },
      {
        name: 'Capybara',
        difficulty: 'Moderate',
        aggressive: false,
        diet: 'Herbivore',
        tools: ['Nets', 'Spears'],
        notes: 'Semi-aquatic; intercept near riverbanks.'
      },
      {
        name: 'Howler Monkey',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Herbivore',
        tools: ['Blowgun', 'Nets'],
        notes: 'High canopy dwellers; blowguns with darts or nets when sleeping.'
      },
      {
        name: 'Piranha',
        difficulty: 'Easy',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Nets', 'Fish Traps'],
        notes: 'Schools quickly fill basket traps baited with meat.'
      },
      {
        name: 'Harpy Eagle',
        difficulty: 'Hard',
        aggressive: true,
        diet: 'Carnivore',
        tools: ['Weighted Nets', 'Climbing Gear'],
        notes: 'Apex canopy raptor guarding nests fiercely; use climbing lines and drop nets over perches.'
      },
      {
        name: 'Giant Anteater',
        difficulty: 'Moderate',
        aggressive: true,
        diet: 'Insectivore',
        tools: ['Long Spears', 'Bolas'],
        notes: 'Powerful claws defend termite mounds; bolas entangle before finishing with spears.'
      }
    ],
    plants: [
      {
        name: 'Cassava',
        edibleParts: 'Roots edible after peeling and thorough cooking.',
        poisonousParts: 'Raw roots contain cyanide compounds.',
        usefulParts: 'Leaves used as cooked greens; fibers from stems for rope.'
      },
      {
        name: 'Banana',
        edibleParts: 'Fruits and heart edible.',
        poisonousParts: 'None.',
        usefulParts: 'Leaves for wrapping; trunk fibers for rope.'
      },
      {
        name: 'Rattan',
        edibleParts: 'Young shoots edible lightly cooked.',
        poisonousParts: 'Spines cause injury but not toxic.',
        usefulParts: 'Vines for weaving, bindings, and climbing.'
      },
      {
        name: 'Cacao',
        edibleParts: 'Seeds processed into cacao; pulp edible fresh.',
        poisonousParts: 'Raw seeds bitter but not toxic.',
        usefulParts: 'Butter from seeds for cooking; husks for mulch.'
      },
      {
        name: 'Jungle Pepper',
        edibleParts: 'Spicy berries dried or used fresh.',
        poisonousParts: 'None.',
        usefulParts: 'Seeds ground for spice and medicinal rubs.'
      },
      {
        name: 'Guarana Vine',
        edibleParts: 'Seeds roasted and ground into stimulating paste.',
        poisonousParts: 'High caffeine content; avoid excessive consumption.',
        usefulParts: 'Seeds traded for energy tonics; vines used for light cordage.'
      },
      {
        name: 'Balsa Tree',
        edibleParts: 'Not edible.',
        poisonousParts: 'None.',
        usefulParts: 'Extremely light wood ideal for rafts, floatation devices, and quick shelters.'
      }
    ]
  }
};

export function getBiomeWildlife(id) {
  return biomeWildlifeData[id] || { animals: [], plants: [] };
}


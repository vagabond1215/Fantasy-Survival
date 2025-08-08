export const shelterTypes = [
  {
    id: 'open-fire',
    name: 'Open Fire',
    description: 'An open fire with minimal or no shelter. Provides warmth and cooking but little protection. Can accommodate up to two people at a time and is not effective in extremely cold or wet climates. No benefit to mood. Not scalable to larger sizes.',
    capacity: 2,
    mood: 'none',
    scalable: false,
    notes: 'Not effective in extremely cold or wet climates.'
  },
  {
    id: 'shelter',
    name: 'Shelter',
    description: 'Partially covered shelter and fire such as a lean-to or other partially walled shelter. Can accommodate a maximum of two people at a time and is not effective in extremely cold or wet climates. No benefit to mood. Not scalable to larger sizes.',
    capacity: 2,
    mood: 'none',
    scalable: false,
    notes: 'Not effective in extremely cold or wet climates.'
  },
  {
    id: 'dwelling',
    name: 'Dwelling',
    description: 'A temporary covered shelter made from thin materials such as leather with uncovered wall or ceiling penetrations. Can accommodate up to four people, not ideal for cold or wet temperatures with no floor and little insulation but survivable in less extreme climates during the winter with adequate firewood. Minor benefit to mood in spring and fall, no benefit during other seasons. Can be scaled to a large variant such as a long house with a negative effect on mood due to tight quarters but can house up to twelve people.',
    capacity: 4,
    mood: {
      spring: 'minor',
      fall: 'minor',
      other: 'none',
      largeVariant: 'negative'
    },
    scalable: {
      large: true,
      capacity: 12
    }
  },
  {
    id: 'cabin',
    name: 'Cabin',
    description: 'Made from a mixture of rough wood and organic materials with minor insulating value such as rough wooden walls, wooden, thatch or leaf ceilings, a raised floor and a fireplace though often drafty with minor leaks. Can accommodate four people and is effective in all seasons, though less so in winter. Minor benefit to mood in all seasons. Not scalable for larger sizes.',
    capacity: 4,
    mood: 'minor',
    scalable: false
  },
  {
    id: 'lodge',
    name: 'Lodge',
    description: 'Made from debarked logs and insulated with pitch, clay or other sealants with window and door closures resulting in little to no leaking and comfortable with a fire even at more extreme temperatures. Can accommodate up to four people per floor, scalable up to two floors and can be scaled into a large variant if large lumber is available. A large fine cabin can house six people per floor up to two floors.',
    capacityPerFloor: 4,
    floors: 1,
    mood: 'moderate',
    scalable: {
      floors: 2,
      largeVariant: {
        capacityPerFloor: 6
      }
    }
  },
  {
    id: 'small-house',
    name: 'Small House',
    description: 'Made from milled lumber from large logs with complete windows, doors and floors. Has one floor and comfortably houses four with a moderate effect on mood in all seasons.',
    capacity: 4,
    floors: 1,
    mood: 'moderate',
    scalable: false
  },
  {
    id: 'medium-house',
    name: 'Medium House',
    description: 'Made from milled lumber from large logs with complete windows, doors and floors. Has two stories and houses up to six people with a decent effect on mood.',
    capacity: 6,
    floors: 2,
    mood: 'decent',
    scalable: false
  },
  {
    id: 'large-house',
    name: 'Large House',
    description: 'Made from milled lumber from large logs with complete windows, doors and floors. Has up to three stories and houses eight people with a great effect on mood.',
    capacity: 8,
    floors: 3,
    mood: 'great',
    scalable: false
  },
  {
    id: 'apartment',
    name: 'Apartment',
    description: 'High density housing made from milled lumber that can be easily scaled up for areas with limited open land. They can have a maximum of six units per level with four levels, each unit accommodating four people.',
    capacityPerUnit: 4,
    unitsPerLevel: 6,
    levels: 4,
    mood: 'moderate',
    scalable: true
  }
];

export default shelterTypes;

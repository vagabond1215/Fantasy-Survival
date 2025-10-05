# Fantasy-Survival

Initial scaffold for a fantasy survival text-based builder. The project is
structured into modular core functions that share a central data store to avoid
duplicate or inconsistent data. Modules currently include:

- **buildings** – available building types, constructed buildings and buildable
  options tied to unlocked technology.
- **population** – procedurally generates the starting settlers, maintains
  biographies, and coordinates job assignments based on proficiencies.
- **people** – population details and aggregate statistics.
- **inventory** – resources with quantity, forecast supply, and demand tracking.
- **location** – geographical generation based on biome.
- **map** – generates 100×100 pixel color maps scaled to 100 m per tile (`GRID_DISTANCE_METERS`).
- **movement** – converts tile distance and terrain into travel time.
- **proficiencies** – character skills with diminishing returns and task metadata support.
- **technology** – unlocked technologies which gate other features.
- **time** – day and season progression.

The application is a static site and can be served locally via any HTTP server
that supports ES modules. The default entry point is `index.html` which loads
`src/main.js`.

## Gameplay systems

### Travel distance and time

Each map tile represents `GRID_DISTANCE_METERS` metres (currently 100 m). Movement between
tiles factors in terrain and obstacles via `calculateTravelTime` in `src/movement.js`:

- Open ground assumes a base pace of ~4.2 km/h.
- Forest and rocky (`ore`) tiles slow movement with higher multipliers.
- Water tiles require swimming skill; insufficient proficiency blocks movement and higher
  skill reduces the water penalty.

Diagonal moves automatically scale travel distance using the tile hypotenuse. Whenever a
move succeeds, the game advances time by the computed duration and logs the distance,
duration, and any additional difficulty messages.

### Inventory forecasting

The inventory view is now accessed from the floating menu (`🎒`). The popup lists:

- **Item** – resource name with icon when available.
- **#** – on-hand quantity.
- **Supply (+)** – projected production from active/pending orders.
- **Demand (-)** – projected consumption.

`updateInventoryFlows` in `src/gameUI.js` keeps inventory records synchronised by calling
`setItemFlow` for every known resource. When adding new orders, ensure the associated
`metadata` describes the resource effects so that forecasting stays accurate.

### Proficiency system

`src/proficiencies.js` maintains settlement skills (hunting, tracking, fishing,
smithing, weaving, agriculture, construction, combat, and more). Each proficiency
stores a level between 1 and 100 and gains are awarded via `rewardOrderProficiency`
when orders complete. The expanded list covers every major craft and gathering role,
including smithing, smelting, pottery, leatherworking, carpentry, masonry, cooking,
and other settlement essentials.

Task metadata should include:

- `proficiencyId` – which skill receives experience.
- `taskComplexity` – 1–100 rating describing the difficulty of the task.
- `effortHours` – total worker-hours invested.
- Optional `activity` and `taskId` strings for future analytics.

Simple tasks grant diminishing returns: repeatedly finishing low-complexity work (for
example cutting saplings) yields very small gains once a character outgrows the challenge.
To progress, queue harder work (such as felling massive trees or complex constructions).

Existing orders populate these fields automatically:

- Manual orders from the Jobs board use `createOrderMetadata` to infer proficiency and
  complexity from the type, worker count, hours, and optional notes (keywords like
  “forage” or “sapling” tailor the skill).
- Construction orders derive complexity from total labour and required resources inside
  `beginConstruction`.

Future features should follow the same pattern: define a `metadata` object when calling
`queueOrder` so that proficiencies and inventory projections remain accurate.

### Population generation and assignments

`src/population.js` produces the starting settlement roster. On a new game the module:

- Seeds a pseudo-random generator (optionally with the setup seed) and assembles
  family households.
- Ensures every settler is between 14 and 45 years of age with a mix of men and women.
- Assigns names, backstories, interests, talents (skill strengths), deficiencies
  (skill weaknesses), and family relationships (parents, children, spouses).
- Stores a skill profile that prefers relevant settlers for each job type.

`initializePopulation(size, { seed })` resets `store.people` with the generated roster.
`syncJobAssignments(store.jobs, listJobDefinitions())` (invoked automatically via
`getJobOverview` and `setJob`) ranks settlers for each job based on the preferred skill
list on every job definition, their talents/interests, and experience. The chosen
workers are surfaced on the job assignment screen so future updates can consult a
single source of truth instead of duplicating tracking logic.

## Development

Install dependencies (none yet) and run the placeholder test script:

```bash
npm install
npm test
```

This repository is intended to be hosted on GitHub Pages.

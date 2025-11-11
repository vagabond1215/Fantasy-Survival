# Fantasy-Survival

Initial scaffold for a fantasy survival text-based builder. The project is
structured into modular core functions that share a central data store to avoid
duplicate or inconsistent data. Source files live under the shared `src/`
directory. Run `npm run sync-docs` whenever `src/` changes so the documentation
site stays in lockstep: the script invokes Vite to build a fresh production
bundle, then copies `index.html`, the optional `biomes.html`, the generated
`assets/` folder, and the mirrored `styles/` directory into `docs/`. Commit the
regenerated `docs/` output to satisfy `scripts/check-docs-sync.cjs`.
The in-game “New Settlement” experience now guides players through a multi-step
Game Creation flow. A progress header surfaces each step—selecting the seed and
biome, defining starting settlers, and tuning challenge settings—so players can
see where they are and what remains. Difficulty presets sit alongside an
“Advanced parameters” drawer that exposes granular world-generation options
(threat escalation rate, resource richness, weather severity, and similar
modifiers). Configure these sliders before confirming the final step to carry
your preferred difficulty rules into the new world.

Modules currently include:

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

Shared data definitions—such as equipment specs and crafting recipes—now live in
`src/data/`. Keeping these resources in a central folder ensures UI components,
gameplay logic, and the documentation mirror all pull from the same records.

The application is a static site and can be served locally via any HTTP server
that supports ES modules. The default entry point is `index.html` which loads
`src/main.js`.

## Gameplay systems

### World generation solver

The procedural world builder lives under `src/worldgen/` and exposes a
`buildWorld` helper that seeds parameters, iteratively tunes them with the
`AdjustmentSolver`, and returns the scored parameter vector plus breakdown
metrics. Habitat profiles in `src/worldgen/habitatProfiles.ts` define curated
starting seeds and objective targets for each difficulty tier. The solver
adjusts ore, rainfall, elevation, and hydrology parameters to minimise weighted
deviation from those objectives while respecting the configured bounds and step
sizes in `parameterDefinitions`.

```ts
import { buildWorld } from './src/worldgen';

const result = buildWorld({ difficulty: 'hard', seed: 'weekly-challenge' });
console.log(result.parameters.oreDensity, result.metrics['advanced.elevationScale']);
```

Pass a `profileId` to lock a specific habitat template or supply
`overrides`/custom `objectives` to steer the solver toward bespoke targets. The
API is deterministic when called with the same `seed`, making it safe for
tests and reproducible scenarios. When tweaking solver behaviour, regenerate
the published site with `npm run sync-docs` so the `docs/` bundle stays
synchronised.

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

### Crafting workstations and hand production

Crafting recipes are organised in `src/data/recipes.js`. Each entry now declares a
`production` array that lists the supported workstations for that recipe. Hand crafting modes
(`id: manual`) remain available for simple goods and improvised meals, but they impose
efficiency penalties (lower output and slower labour). Building-backed stations—such as the
fire pit, drying rack, workshop benches, or forge bays—provide improved multipliers once the
relevant structure is completed. `src/crafting.js` evaluates the player’s unlocked buildings
and automatically applies the best available production mode, while surfacing any missing
requirements when a recipe is gated. This keeps equipment, meals, and remedies tied directly
to the infrastructure that enables them.

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

### Equipment catalog and supply chains

Equipment definitions now live in `src/data/equipment.js`. Each entry captures the
category, tier, durability, icon, and crafting materials for the weapon, armor, or tool so
that UI components and crafting logic can reference a single source of truth. Icon helpers
(`src/icons.js`) automatically surface these entries alongside dedicated resource icons for
supporting materials such as straight branches, seasoned wood, and prepared hides.

To keep every recipe ingredient attainable, new gathering and crafting loops fill the gaps:

- A sapling gathering prospect yields **straight branches** for tool shafts.
- Leatherworkers can cure **prepared hides** from raw hides, herbs, and plant fibers.
- Woodcutters can season timber into **seasoned wood** for bows and handles.
- Smelting recipes transform **raw ore** and fuel into bronze, iron, and steel ingots.

All new recipes live in `src/crafting.js` and obey the same unlock rules as the
equipment tiers they support. After modifying any `src/` file, run `npm run
sync-docs` to regenerate the `docs/` bundle so GitHub Pages publishes the
updated build. This ensures higher-tier equipment and armor can be produced
without requiring placeholder resources or manual inventory edits.

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
Use `npm run sync-docs` (powered by `scripts/sync-docs.js`) to run the Vite
build and refresh `docs/index.html`, `docs/assets/`, any generated
`docs/biomes.html`, and the mirrored `docs/styles/` directory after code or data
changes. New files should be added under `src/` so they are automatically
captured by the build—check existing modules for
reusable helpers before creating new ones to comply with the project’s “reuse
before creating” policy.

### Hydrology tuning CLI

Run `npm run hydrology:tune` to inspect how landmass presets and world
parameters influence the standalone hydrology pipeline. The script generates a
synthetic elevation field, calls `generateHydrology`, and reports aggregate
metrics (total water coverage, lake count, river density, and similar signals)
for each requested scenario. By default every landmass preset is paired with the
`normal` world settings and displayed as a summary table.

Common flags:

- `--map-type=<type|all>` – choose a specific landmass preset or run every
  preset.
- `--difficulty=<id|all>` – select world parameter sets by difficulty id.
- `--set key=value` – override individual world sliders (dot notation such as
  `advanced.waterFlowMultiplier=60` is supported).
- `--format=json` – emit the raw metrics as JSON instead of a table.
- `--list` – print available landmass presets, biomes, and difficulty ids.

Example usage:

```bash
npm run hydrology:tune -- \
  --map-type=archipelago \
  --difficulty=hard \
  --set rainfall=68 \
  --format=json
```

The command can also load additional world presets from disk via
`--world-file=path/to/world.json`, enabling quick comparisons against
experimentally tuned parameter sets. Because the tool is deterministic for a
given seed, the JSON output is stable and can be fed into downstream analytics
or regression dashboards.

import archipelago from './archipelago.js';
import coastal from './coastal.js';
import continent from './continent.js';
import inland from './inland.js';
import island from './island.js';
import pangea from './pangea.js';

const modules = {
  archipelago,
  coastal,
  continent,
  inland,
  island,
  pangea
};

/**
 * @typedef {Readonly<{
 *   maskStrength: number;
 *   maskBias: number;
 *   worldScaleFactor: number;
 *   waterCoverageTarget: number;
 *   minOceanFraction: number;
 *   openLandBias: number;
 * }>} LandmassPreset
 */

/** @type {Array<[string, LandmassPreset]>} */
const entries = Object.entries(modules)
  .map(([name, config]) => {
    if (!config || typeof config !== 'object') {
      throw new TypeError(`Landmass preset "${name}" must export an object.`);
    }
    return /** @type {[string, LandmassPreset]} */ ([
      name,
      /** @type {LandmassPreset} */ (config)
    ]);
  })
  .sort(([a], [b]) => a.localeCompare(b));

export const LANDMASS_PRESETS = Object.freeze(
  /** @type {Record<string, LandmassPreset>} */ (Object.fromEntries(entries))
);

export const DEFAULT_LANDMASS_TYPE = 'continent';

export function resolveLandmassPreset(type) {
  if (!type || typeof type !== 'string') {
    return LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE];
  }

  return (
    LANDMASS_PRESETS[type] || LANDMASS_PRESETS[DEFAULT_LANDMASS_TYPE]
  );
}

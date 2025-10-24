import store from './state.js';
import { refreshStats } from './people.js';
import { computeCenteredStart, DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, generateColorMap } from './map.js';
import { refreshBuildingUnlocks } from './buildings.js';
import { initializeTechnologyRegistry } from './technology.js';

const SAVE_KEY = 'fantasy-survival-save';

// Save current game state to localStorage.
export function saveGame() {
  try {
    const data = store.serialize();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save game', err);
  }
}

// Load game state from localStorage.
// Returns true if a save was loaded.
export function loadGame() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return false;
    store.deserialize(JSON.parse(data));
    initializeTechnologyRegistry();
    for (const loc of store.locations.values()) {
      let storedWorld = loc.worldSettings;
      if (!storedWorld && loc.map?.worldSettings) {
        storedWorld = loc.map.worldSettings;
      }

      if (!loc.map || !loc.map.tiles) {
        loc.map = generateColorMap(
          loc.biome,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          store.time.season,
          undefined,
          undefined,
          storedWorld
        );
        if (loc.map?.worldSettings && !loc.worldSettings) {
          loc.worldSettings = loc.map.worldSettings;
        }
        continue;
      }

      if (!loc.map.seed) loc.map.seed = Date.now();

      const width = loc.map.tiles?.[0]?.length || DEFAULT_MAP_WIDTH;
      const height = loc.map.tiles?.length || DEFAULT_MAP_HEIGHT;
      const { xStart: centeredX, yStart: centeredY } = computeCenteredStart(width, height);

      if (!Number.isFinite(loc.map.xStart)) loc.map.xStart = centeredX;
      if (!Number.isFinite(loc.map.yStart)) loc.map.yStart = centeredY;

      const needsRecentering = loc.map.xStart === 0 && loc.map.yStart === 0;

      if (!loc.map.types || needsRecentering) {
        // Regenerate map if terrain types are missing (legacy saves) or if the
        // map still uses the legacy origin placement.
        loc.map = generateColorMap(
          loc.biome,
          loc.map.seed,
          needsRecentering ? centeredX : loc.map.xStart,
          needsRecentering ? centeredY : loc.map.yStart,
          width,
          height,
          loc.map.season ?? store.time.season,
          loc.map.waterLevel,
          loc.map.viewport,
          storedWorld
        );
      }

      if (!loc.worldSettings && loc.map?.worldSettings) {
        loc.worldSettings = loc.map.worldSettings;
      }
    }
    refreshStats();
    refreshBuildingUnlocks();
    return true;
  } catch (err) {
    console.error('Failed to load game', err);
    return false;
  }
}

// Remove any saved game data.
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved game data.', err);
  }
}


import store from './state.js';
import { refreshStats } from './people.js';
import {
  computeCenteredStart,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  generateWorldMap,
  adaptWorldToMapData
} from './map.js';
import { refreshBuildingUnlocks } from './buildings.js';
import { initializeTechnologyRegistry } from './technology.js';
import { getStorageItem, removeStorageItem, setStorageItem } from './safeStorage.js';
import { canonicalizeSeed } from './world/seed.js';

export const SAVE_KEY = 'fantasy-survival-save';

// Save current game state to localStorage.
export function saveGame() {
  try {
    const data = store.serialize();
    setStorageItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save game', err);
  }
}

// Load game state from localStorage.
// Returns true if a save was loaded.
async function migrateLocations(locations, topLevelWorld) {
  if (!locations) return { changed: false, primarySeed: null };

  const entries = Array.isArray(locations)
    ? locations
    : typeof locations === 'object'
      ? Object.entries(locations)
      : [];

  let changed = false;
  let primarySeed = null;

  await Promise.all(
    entries.map(async entry => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const [, location] = entry;
      if (!location || typeof location !== 'object') return;

      const map = location.map && typeof location.map === 'object' ? location.map : null;
      let worldSettings;
      if (location.worldSettings && typeof location.worldSettings === 'object') {
        worldSettings = location.worldSettings;
      } else if (map && map.worldSettings && typeof map.worldSettings === 'object') {
        worldSettings = map.worldSettings;
        location.worldSettings = worldSettings;
        changed = true;
      } else {
        worldSettings = {};
        location.worldSettings = worldSettings;
        changed = true;
      }

      const existingSeed =
        (map && map.seed !== undefined ? map.seed : undefined) ??
        (worldSettings && worldSettings.seed !== undefined ? worldSettings.seed : undefined) ??
        (topLevelWorld && topLevelWorld.seed !== undefined ? topLevelWorld.seed : undefined) ??
        '';
      const seedString = typeof existingSeed === 'string' ? existingSeed : String(existingSeed ?? '');

      const canonical = await canonicalizeSeed(seedString);

      if (map) {
        if (map.seed === undefined) {
          map.seed = existingSeed;
          changed = true;
        }
        if (map.seedHash !== canonical.hex) {
          map.seedHash = canonical.hex;
          changed = true;
        }
        if (!Array.isArray(map.seedLanes) || map.seedLanes.length !== 8) {
          map.seedLanes = Array.from(canonical.lanes);
          changed = true;
        }
      }

      if (!worldSettings.seed || worldSettings.seed !== map?.seed) {
        worldSettings.seed = map?.seed ?? existingSeed ?? canonical.raw;
        changed = true;
      }
      if (worldSettings.seedHash !== canonical.hex) {
        worldSettings.seedHash = canonical.hex;
        changed = true;
      }
      if (!Array.isArray(worldSettings.seedLanes) || worldSettings.seedLanes.length !== 8) {
        worldSettings.seedLanes = Array.from(canonical.lanes);
        changed = true;
      }

      const startingBiome = location.startingBiomeId || worldSettings.startingBiomeId || location.biome || null;
      if (startingBiome && worldSettings.startingBiomeId !== startingBiome) {
        worldSettings.startingBiomeId = startingBiome;
        changed = true;
      }
      if (startingBiome && location.startingBiomeId !== startingBiome) {
        location.startingBiomeId = startingBiome;
        changed = true;
      }

      if (!primarySeed) {
        primarySeed = {
          seed: map?.seed ?? existingSeed ?? canonical.raw,
          canonical,
          startingBiome
        };
      }

      if (map && (!map.worldSettings || typeof map.worldSettings !== 'object')) {
        map.worldSettings = { ...worldSettings };
        changed = true;
      } else if (map) {
        const mapWorld = map.worldSettings;
        let mapChanged = false;
        if (mapWorld.seedHash !== worldSettings.seedHash) {
          mapWorld.seedHash = worldSettings.seedHash;
          mapChanged = true;
        }
        if (!Array.isArray(mapWorld.seedLanes) || mapWorld.seedLanes.length !== 8) {
          mapWorld.seedLanes = Array.from(canonical.lanes);
          mapChanged = true;
        }
        if (worldSettings.seed !== undefined && mapWorld.seed !== worldSettings.seed) {
          mapWorld.seed = worldSettings.seed;
          mapChanged = true;
        }
        if (startingBiome && mapWorld.startingBiomeId !== startingBiome) {
          mapWorld.startingBiomeId = startingBiome;
          mapChanged = true;
        }
        if (mapChanged) {
          changed = true;
        }
      }
    })
  );

  return { changed, primarySeed };
}

async function migrateSaveData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { data: parsed, changed: false };
  }

  const worldSettings =
    parsed.worldSettings && typeof parsed.worldSettings === 'object' ? parsed.worldSettings : null;

  const { changed: locationChanged, primarySeed } = await migrateLocations(parsed.locations, worldSettings);
  let changed = locationChanged;

  if (primarySeed && worldSettings) {
    if (worldSettings.seed !== primarySeed.seed) {
      worldSettings.seed = primarySeed.seed;
      changed = true;
    }
    if (worldSettings.seedHash !== primarySeed.canonical.hex) {
      worldSettings.seedHash = primarySeed.canonical.hex;
      changed = true;
    }
    if (!Array.isArray(worldSettings.seedLanes) || worldSettings.seedLanes.length !== 8) {
      worldSettings.seedLanes = Array.from(primarySeed.canonical.lanes);
      changed = true;
    }
    if (primarySeed.startingBiome && worldSettings.startingBiomeId !== primarySeed.startingBiome) {
      worldSettings.startingBiomeId = primarySeed.startingBiome;
      changed = true;
    }
  }

  return { data: parsed, changed };
}

export async function loadGame() {
  try {
    const data = getStorageItem(SAVE_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);
    const { data: migrated, changed } = await migrateSaveData(parsed);
    if (changed) {
      try {
        setStorageItem(SAVE_KEY, JSON.stringify(migrated));
      } catch (persistError) {
        console.warn('Failed to persist migrated save data', persistError);
      }
    }
    store.deserialize(migrated);
    initializeTechnologyRegistry();
    let locationUpdated = false;
    for (const loc of store.locations.values()) {
      const mapState = loc.map && typeof loc.map === 'object' ? loc.map : {};
      const storedWorldSettings =
        loc.worldSettings || mapState.worldSettings || store.worldSettings || null;

      const worldDimensions = loc.world?.dimensions || {};
      const width = Math.max(
        1,
        Math.trunc(
          worldDimensions.width ?? mapState.width ?? mapState.tiles?.[0]?.length ?? DEFAULT_MAP_WIDTH
        )
      );
      const height = Math.max(
        1,
        Math.trunc(
          worldDimensions.height ?? mapState.height ?? mapState.tiles?.length ?? DEFAULT_MAP_HEIGHT
        )
      );
      const { xStart: centeredX, yStart: centeredY } = computeCenteredStart(width, height);

      const seedSource =
        (mapState.seed !== undefined ? mapState.seed : undefined) ??
        (storedWorldSettings && storedWorldSettings.seed !== undefined ? storedWorldSettings.seed : undefined) ??
        (loc.world?.seed?.raw ?? null);
      const seedString =
        typeof seedSource === 'string' ? seedSource : seedSource != null ? String(seedSource) : '';

      let canonicalSeed = mapState.seedInfo;
      if (!canonicalSeed || !Array.isArray(canonicalSeed.lanes) || canonicalSeed.lanes.length < 8) {
        canonicalSeed = await canonicalizeSeed(seedString);
        mapState.seedInfo = canonicalSeed;
        locationUpdated = true;
      }

      let worldArtifact = loc.world;
      if (!worldArtifact && mapState.world) {
        worldArtifact = mapState.world;
        loc.world = worldArtifact;
      }

      const normalizedXStart = Number.isFinite(mapState.xStart) ? Math.trunc(mapState.xStart) : centeredX;
      const normalizedYStart = Number.isFinite(mapState.yStart) ? Math.trunc(mapState.yStart) : centeredY;
      const viewport = mapState.viewport || null;
      const mapSeason = mapState.season ?? store.time.season;

      if (!worldArtifact) {
        const { world, map: regenerated } = generateWorldMap({
          width,
          height,
          seed: canonicalSeed,
          season: mapSeason,
          xStart: normalizedXStart,
          yStart: normalizedYStart,
          viewport,
          worldSettings: storedWorldSettings,
          startingBiomeId: loc.biome ?? null
        });
        worldArtifact = world;
        loc.world = worldArtifact;
        loc.map = {
          ...regenerated,
          waterLevel: mapState?.waterLevel ?? regenerated.waterLevel ?? null
        };
        locationUpdated = true;
      } else if (!mapState.tiles || !mapState.types) {
        const adapted = adaptWorldToMapData(worldArtifact, {
          seedInfo: canonicalSeed,
          seedString,
          season: mapSeason,
          xStart: normalizedXStart,
          yStart: normalizedYStart,
          viewport,
          worldSettings: storedWorldSettings
        });
        loc.map = {
          ...mapState,
          ...adapted,
          waterLevel: mapState?.waterLevel ?? adapted.waterLevel ?? null
        };
        locationUpdated = true;
      } else {
        loc.map.world = worldArtifact;
        if (!loc.map.seedInfo && canonicalSeed) {
          loc.map.seedInfo = canonicalSeed;
          locationUpdated = true;
        }
      }

      if (!loc.map.seed) {
        loc.map.seed = seedString || String(Date.now());
        locationUpdated = true;
      }

      if (!loc.worldSettings && loc.map?.worldSettings) {
        loc.worldSettings = loc.map.worldSettings;
        locationUpdated = true;
      }

      if (!store.worldSettings && storedWorldSettings) {
        store.worldSettings = storedWorldSettings;
      }
    }
    if (locationUpdated) {
      try {
        saveGame();
      } catch (persistError) {
        console.warn('Failed to persist regenerated world data', persistError);
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
    removeStorageItem(SAVE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved game data.', err);
  }
}


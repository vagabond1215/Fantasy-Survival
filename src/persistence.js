import store from './state.js';
import { refreshStats } from './people.js';
import { generateColorMap } from './map.js';

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
    for (const loc of store.locations.values()) {
      if (!loc.map || !loc.map.pixels) {
        loc.map = generateColorMap(loc.biome);
      }
    }
    refreshStats();
    return true;
  } catch (err) {
    console.error('Failed to load game', err);
    return false;
  }
}

// Remove any saved game data.
export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}


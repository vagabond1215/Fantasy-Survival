const DEFAULT_PLAYER_JOB = 'survey';

function coerceTechnologyTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTechnologyStateRecord(id, value) {
  const base = value && typeof value === 'object' ? value : {};
  const normalizedId = id || base.id ? String(id || base.id) : null;
  if (!normalizedId) return null;
  const unlocked = base.unlocked === true || base.status === 'unlocked' || (!('unlocked' in base) && Boolean(base.discovered || base.name));
  const discovered = base.discovered === true || unlocked;
  const progress = Number.isFinite(base.progress) ? Math.min(1, Math.max(0, base.progress)) : unlocked ? 1 : 0;
  const label = base.label || base.name || normalizedId;
  const unlockedAt = coerceTechnologyTimestamp(base.unlockedAt ?? base.completedAt ?? null);
  const notes = typeof base.notes === 'string' && base.notes.trim() ? base.notes : null;
  return {
    id: normalizedId,
    unlocked,
    discovered,
    progress,
    unlockedAt,
    label,
    notes
  };
}

class DataStore {
  constructor() {
    this.buildings = new Map();
    this.people = new Map();
    this.inventory = new Map();
    this.craftTargets = new Map();
    this.locations = new Map();
    this.technologies = new Map();
    this.proficiencies = new Map();
    this.player = { locationId: null, x: 0, y: 0, jobId: DEFAULT_PLAYER_JOB };
    this.time = { day: 1, month: 1, year: 410, hour: 6, season: 'Thawbound', weather: 'Clear' };
    this.difficulty = 'normal';
    this.jobs = {};
    this.orders = [];
    this.eventLog = [];
    this.orderSeq = 0;
    this.unlockedBuildings = new Set();
    this.research = new Set();
    this.buildingSeq = 0;
    this.gatherNodes = new Map();
    this.discoveredFauna = new Map();
    this.discoveredFlora = new Map();
    this.jobSettings = {};
    this.jobDaily = {};
    this.buildQueue = 0;
    this.haulQueue = 0;
    this.worldSettings = null;
  }

  addItem(collection, item) {
    const id = item.id;
    if (!id) {
      console.warn(`Missing id for ${collection} item`, item);
      return;
    }
    if (!this[collection].has(id)) {
      this[collection].set(id, item);
    } else {
      console.warn(`Duplicate ${collection} id ${id} ignored.`);
    }
  }

  updateItem(collection, item) {
    const id = item.id;
    if (this[collection].has(id)) {
      const current = this[collection].get(id);
      this[collection].set(id, { ...current, ...item });
    } else {
      console.warn(`Cannot update missing ${collection} id ${id}.`);
    }
  }

  getItem(collection, id) {
    return this[collection].get(id);
  }

  // Serialize store to plain object for saving.
  serialize() {
    const technologies = [...this.technologies.entries()]
      .map(([id, value]) => {
        const normalized = normalizeTechnologyStateRecord(id, value);
        return normalized ? [normalized.id, normalized] : null;
      })
      .filter(Boolean);
    return {
      buildings: [...this.buildings.entries()],
      people: [...this.people.entries()],
      inventory: [...this.inventory.entries()],
      craftTargets: [...this.craftTargets.entries()],
      locations: [...this.locations.entries()],
      technologies,
      proficiencies: [...this.proficiencies.entries()],
      player: { ...this.player },
      time: this.time,
      difficulty: this.difficulty,
      jobs: this.jobs,
      orders: this.orders,
      eventLog: this.eventLog,
      orderSeq: this.orderSeq,
      unlockedBuildings: [...this.unlockedBuildings],
      research: [...this.research],
      buildingSeq: this.buildingSeq,
      gatherNodes: [...this.gatherNodes.entries()],
      discoveredFauna: [...this.discoveredFauna.entries()].map(([biomeId, entries]) => [
        biomeId,
        [...entries]
      ]),
      discoveredFlora: [...this.discoveredFlora.entries()].map(([biomeId, entries]) => [
        biomeId,
        [...entries]
      ]),
      jobSettings: this.jobSettings,
      jobDaily: this.jobDaily,
      worldSettings: this.worldSettings
    };
  }

  // Load store from serialized data.
  deserialize(data) {
    this.buildings = new Map(data.buildings || []);
    this.people = new Map(data.people || []);
    this.inventory = new Map(data.inventory || []);
    this.craftTargets = new Map(data.craftTargets || []);
    this.locations = new Map(data.locations || []);
    const rawTechnologies = Array.isArray(data.technologies)
      ? data.technologies
      : data.technologies && typeof data.technologies === 'object'
        ? Object.entries(data.technologies)
        : [];
    const technologyEntries = rawTechnologies
      .map(entry => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const normalized = normalizeTechnologyStateRecord(entry[0], entry[1]);
          return normalized ? [normalized.id, normalized] : null;
        }
        if (entry && typeof entry === 'object') {
          const normalized = normalizeTechnologyStateRecord(entry.id, entry);
          return normalized ? [normalized.id, normalized] : null;
        }
        return null;
      })
      .filter(Boolean);
    this.technologies = new Map(technologyEntries);
    this.proficiencies = new Map(data.proficiencies || []);
    const savedPlayer = data.player || {};
    this.player = {
      locationId: savedPlayer.locationId ?? null,
      x: Number.isFinite(savedPlayer.x) ? Math.trunc(savedPlayer.x) : 0,
      y: Number.isFinite(savedPlayer.y) ? Math.trunc(savedPlayer.y) : 0,
      jobId: typeof savedPlayer.jobId === 'string' && savedPlayer.jobId ? savedPlayer.jobId : DEFAULT_PLAYER_JOB
    };
    const savedTime = data.time || {};
    this.time = {
      day: 1,
      month: 1,
      year: 410,
      hour: 6,
      season: 'Thawbound',
      weather: 'Clear',
      ...savedTime
    };
    this.difficulty = data.difficulty || 'normal';
    this.jobs = data.jobs || {};
    this.orders = data.orders || [];
    this.eventLog = data.eventLog || [];
    this.orderSeq = data.orderSeq || 0;
    this.unlockedBuildings = new Set(data.unlockedBuildings || []);
    this.research = new Set(data.research || []);
    this.buildingSeq = data.buildingSeq || 0;
    this.gatherNodes = new Map(data.gatherNodes || []);
    this.jobSettings = data.jobSettings || {};
    this.jobDaily = data.jobDaily || {};
    this.worldSettings = data.worldSettings || null;
    const faunaEntries = Array.isArray(data.discoveredFauna)
      ? data.discoveredFauna
      : Object.entries(data.discoveredFauna || {});
    this.discoveredFauna = new Map(
      faunaEntries.map(entry => {
        const [biomeId, items] = entry || [];
        return [biomeId, new Set(items || [])];
      })
    );
    const floraEntries = Array.isArray(data.discoveredFlora)
      ? data.discoveredFlora
      : Object.entries(data.discoveredFlora || {});
    this.discoveredFlora = new Map(
      floraEntries.map(entry => {
        const [biomeId, items] = entry || [];
        return [biomeId, new Set(items || [])];
      })
    );
  }
}

const store = new DataStore();
export default store;

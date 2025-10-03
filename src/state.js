class DataStore {
  constructor() {
    this.buildings = new Map();
    this.people = new Map();
    this.inventory = new Map();
    this.locations = new Map();
    this.technologies = new Map();
    this.player = { locationId: null, x: 0, y: 0 };
    this.time = { day: 1, month: 1, year: 410, hour: 6, season: 'Thawbound', weather: 'Clear' };
    this.difficulty = 'normal';
    this.jobs = {};
    this.orders = [];
    this.eventLog = [];
    this.orderSeq = 0;
    this.unlockedBuildings = new Set();
    this.research = new Set();
    this.buildingSeq = 0;
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
    return {
      buildings: [...this.buildings.entries()],
      people: [...this.people.entries()],
      inventory: [...this.inventory.entries()],
      locations: [...this.locations.entries()],
      technologies: [...this.technologies.entries()],
      player: { ...this.player },
      time: this.time,
      difficulty: this.difficulty,
      jobs: this.jobs,
      orders: this.orders,
      eventLog: this.eventLog,
      orderSeq: this.orderSeq,
      unlockedBuildings: [...this.unlockedBuildings],
      research: [...this.research],
      buildingSeq: this.buildingSeq
    };
  }

  // Load store from serialized data.
  deserialize(data) {
    this.buildings = new Map(data.buildings || []);
    this.people = new Map(data.people || []);
    this.inventory = new Map(data.inventory || []);
    this.locations = new Map(data.locations || []);
    this.technologies = new Map(data.technologies || []);
    const savedPlayer = data.player || {};
    this.player = {
      locationId: savedPlayer.locationId ?? null,
      x: Number.isFinite(savedPlayer.x) ? Math.trunc(savedPlayer.x) : 0,
      y: Number.isFinite(savedPlayer.y) ? Math.trunc(savedPlayer.y) : 0
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
  }
}

const store = new DataStore();
export default store;

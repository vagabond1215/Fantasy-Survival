class DataStore {
  constructor() {
    this.buildings = new Map();
    this.people = new Map();
    this.inventory = new Map();
    this.locations = new Map();
    this.technologies = new Map();
    this.time = { day: 0, season: 'Spring' };
    this.difficulty = 'normal';
    this.jobs = {};
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
      time: this.time,
      difficulty: this.difficulty,
      jobs: this.jobs
    };
  }

  // Load store from serialized data.
  deserialize(data) {
    this.buildings = new Map(data.buildings || []);
    this.people = new Map(data.people || []);
    this.inventory = new Map(data.inventory || []);
    this.locations = new Map(data.locations || []);
    this.technologies = new Map(data.technologies || []);
    this.time = data.time || { day: 0, season: 'Spring' };
    this.difficulty = data.difficulty || 'normal';
    this.jobs = data.jobs || {};
  }
}

const store = new DataStore();
export default store;

class DataStore {
  constructor() {
    this.buildings = new Map();
    this.people = new Map();
    this.inventory = new Map();
    this.locations = new Map();
    this.technologies = new Map();
    this.time = { day: 0, season: 'Spring' };
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
}

const store = new DataStore();
export default store;

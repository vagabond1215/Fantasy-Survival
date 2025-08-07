import store from './state.js';
import { hasTechnology } from './technology.js';

const buildingTypes = new Map();

export function registerBuildingType(type) {
  // type: { id, name, requiresTech }
  if (buildingTypes.has(type.id)) {
    console.warn(`Duplicate building type ${type.id} ignored.`);
    return;
  }
  buildingTypes.set(type.id, type);
}

export function build(building) {
  // building: { id, typeId, status }
  store.addItem('buildings', building);
}

export function getBuildableTypes() {
  return [...buildingTypes.values()].filter(type => !type.requiresTech || hasTechnology(type.requiresTech));
}

export function allBuildings() {
  return [...store.buildings.values()];
}

export { buildingTypes };

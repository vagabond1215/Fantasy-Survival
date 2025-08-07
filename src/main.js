import store from './state.js';
import { addPerson, stats as peopleStats } from './people.js';
import { addItem, getItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { registerBuildingType, getBuildableTypes } from './buildings.js';
import { unlockTechnology } from './technology.js';
import { generateLocation } from './location.js';

function bootstrap() {
  addPerson({ id: 'p1', age: 30, sex: 'M', job: null, home: null, family: [] });
  addItem('food', 100);
  generateLocation('loc1', 'plains');
  registerBuildingType({ id: 'hut', name: 'Hut' });
  unlockTechnology({ id: 'basic-tools', name: 'Basic Tools' });

  advanceDay();

  const output = {
    people: peopleStats(),
    inventory: getItem('food'),
    time: timeInfo(),
    buildable: getBuildableTypes(),
    locations: store.locations.size
  };
  document.getElementById('output').textContent = JSON.stringify(output, null, 2);
}

bootstrap();

// expose for debugging
window.Game = { store };

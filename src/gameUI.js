import { stats as peopleStats } from './people.js';
import { getItem, addItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { getJobs, setJob } from './jobs.js';
import store from './state.js';

function computeChanges() {
  const adults = peopleStats().total;
  const jobs = getJobs();
  let laborers = jobs.laborer || 0;

  // Prioritize building then hauling
  const buildingTasks = store.buildQueue || 0;
  const haulingTasks = store.haulQueue || 0;

  const buildingWorkers = Math.min(laborers, buildingTasks);
  laborers -= buildingWorkers;
  const haulingWorkers = Math.min(laborers, haulingTasks);
  laborers -= haulingWorkers;

  // Remaining laborers gather firewood and food evenly
  const firewoodWorkers = Math.floor(laborers / 2);
  const foodWorkers = laborers - firewoodWorkers;

  return {
    food: { quantity: getItem('food').quantity, supply: foodWorkers, demand: adults },
    firewood: { quantity: getItem('firewood').quantity, supply: firewoodWorkers, demand: adults }
  };
}

function render() {
  const container = document.getElementById('game');
  if (!container) return;

  const t = timeInfo();
  const turn = container.querySelector('#turn');
  if (turn) turn.textContent = `Day ${t.day} - ${t.season}`;

  const changes = computeChanges();
  const inv = container.querySelector('#inventory');
  if (inv) {
    inv.innerHTML = '<h3>Inventory</h3>';
    const table = document.createElement('table');
    const header = document.createElement('tr');
    header.innerHTML = '<th>Item</th><th>Qty</th><th>Δ/turn</th>';
    table.appendChild(header);
    Object.entries(changes).forEach(([name, data]) => {
      const tr = document.createElement('tr');
      const net = data.supply - data.demand;
      tr.innerHTML = `<td>${name}</td><td>${data.quantity}</td><td>${net}</td>`;
      table.appendChild(tr);
    });
    inv.appendChild(table);
  }
}

function processTurn() {
  const changes = computeChanges();
  Object.entries(changes).forEach(([name, data]) => {
    const net = data.supply - data.demand;
    addItem(name, net);
  });
  advanceDay();
  render();
}

function showJobs() {
  const adults = peopleStats().total;
  const jobs = getJobs();
  const current = jobs.laborer || 0;
  const input = prompt(`Assign laborers (0-${adults})`, current);
  const num = parseInt(input, 10);
  if (!isNaN(num)) {
    setJob('laborer', num);
    render();
  }
}

export function initGameUI() {
  const container = document.getElementById('game');
  if (!container) return;
  container.innerHTML = '';

  const turn = document.createElement('div');
  turn.id = 'turn';

  const next = document.createElement('button');
  next.textContent = 'Next Turn';
  next.addEventListener('click', processTurn);

  const jobsBtn = document.createElement('button');
  jobsBtn.textContent = 'Jobs';
  jobsBtn.addEventListener('click', showJobs);

  const inv = document.createElement('div');
  inv.id = 'inventory';

  container.appendChild(turn);
  container.appendChild(next);
  container.appendChild(jobsBtn);
  container.appendChild(inv);

  container.style.display = 'block';
  render();
}

export function updateGameUI() {
  render();
}

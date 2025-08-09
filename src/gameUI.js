import { stats as peopleStats } from './people.js';
import { getItem, addItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { getJobs, setJob } from './jobs.js';
import store from './state.js';

function computeChanges() {
  const stats = peopleStats();
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
    food: { quantity: getItem('food').quantity, supply: foodWorkers, demand: stats.total },
    firewood: { quantity: getItem('firewood').quantity, supply: firewoodWorkers, demand: stats.total }
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

let jobsPopup = null;

function closeJobs() {
  if (jobsPopup) {
    jobsPopup.remove();
    jobsPopup = null;
  }
}

function renderJobs() {
  closeJobs();
  const stats = peopleStats();
  const jobs = getJobs();
  jobsPopup = document.createElement('div');
  jobsPopup.id = 'jobs-popup';
  Object.assign(jobsPopup.style, {
    position: 'fixed',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    background: '#fff',
    border: '1px solid #000',
    padding: '10px',
    overflow: 'auto'
  });

  const close = document.createElement('span');
  close.textContent = 'X';
  close.style.float = 'right';
  close.style.cursor = 'pointer';
  close.addEventListener('click', closeJobs);
  jobsPopup.appendChild(close);

  const heading = document.createElement('div');
  heading.textContent = `Pop: ${stats.total} | Adults: ${stats.adults} | Children: ${stats.children}`;
  jobsPopup.appendChild(heading);

  const list = document.createElement('div');
  const unlocked = Object.keys(store.jobs || {});
  unlocked.forEach(name => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '4px';

    const label = document.createElement('span');
    label.textContent = name;

    const down = document.createElement('button');
    down.textContent = '↓';
    down.addEventListener('click', () => {
      setJob(name, (jobs[name] || 0) - 1);
      render();
      renderJobs();
    });

    const count = document.createElement('span');
    count.textContent = jobs[name] || 0;

    const up = document.createElement('button');
    up.textContent = '↑';
    up.addEventListener('click', () => {
      setJob(name, (jobs[name] || 0) + 1);
      render();
      renderJobs();
    });

    row.appendChild(label);
    row.appendChild(down);
    row.appendChild(count);
    row.appendChild(up);
    list.appendChild(row);
  });

  const laborRow = document.createElement('div');
  laborRow.style.marginTop = '10px';
  laborRow.textContent = `Laborers: ${jobs.laborer}`;
  list.appendChild(laborRow);

  jobsPopup.appendChild(list);
  document.body.appendChild(jobsPopup);
}

function showJobs() {
  renderJobs();
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

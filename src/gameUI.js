import { stats as peopleStats } from './people.js';
import { getItem, addItem } from './inventory.js';
import { advanceDay, info as timeInfo } from './time.js';
import { getJobs, setJob } from './jobs.js';
import store from './state.js';
import { scavengeResources } from './resources.js';
import { showBackButton } from './menu.js';
import { allLocations } from './location.js';

// Keep a reference to the scavenge count element so the display can
// be refreshed whenever the UI rerenders.
let scavengeDisplay = null;

function computeChanges() {
  const stats = peopleStats();
  const jobs = getJobs();
  let laborers = jobs.laborer || 0;

  // Workers explicitly assigned to scavenge gather resources before
  // any remaining laborers are split between other tasks.
  const scavengeWorkers = jobs.scavenge || 0;
  const scavengeTotals = scavengeResources(scavengeWorkers);

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
    food: {
      quantity: getItem('food').quantity,
      supply: foodWorkers + scavengeTotals.food,
      demand: stats.total
    },
    firewood: {
      quantity: getItem('firewood').quantity,
      supply: firewoodWorkers + scavengeTotals.firewood,
      demand: stats.total
    },
    'small stones': {
      quantity: getItem('small stones').quantity,
      supply: scavengeTotals['small stones'],
      demand: 0
    },
    pebbles: {
      quantity: getItem('pebbles').quantity,
      supply: scavengeTotals.pebbles,
      demand: 0
    }
  };
}

function render() {
  const container = document.getElementById('game');
  if (!container) return;

  const t = timeInfo();
  const turn = container.querySelector('#turn');
  if (turn) turn.textContent = `Day ${t.day} - ${t.season}`;

  const changes = computeChanges();
  const jobs = getJobs();
  if (scavengeDisplay) scavengeDisplay.textContent = jobs.scavenge || 0;
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

export function closeJobs() {
  if (jobsPopup) {
    jobsPopup.remove();
    jobsPopup = null;
  }
  showBackButton(false);
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

export function showJobs() {
  showBackButton(true);
  renderJobs();
}

export function initGameUI() {
  const container = document.getElementById('game');
  if (!container) return;
  container.innerHTML = '';

  const loc = allLocations()[0];
  if (loc?.map?.pixels) {
    const mapWrapper = document.createElement('div');
    mapWrapper.style.display = 'flex';
    mapWrapper.style.justifyContent = 'center';
    mapWrapper.style.marginTop = '10px';
    const canvas = document.createElement('canvas');
    const pixels = loc.map.pixels;
    canvas.width = pixels[0].length;
    canvas.height = pixels.length;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const color = pixels[y][x];
        const idx = (y * canvas.width + x) * 4;
        imgData.data[idx] = parseInt(color.slice(1, 3), 16);
        imgData.data[idx + 1] = parseInt(color.slice(3, 5), 16);
        imgData.data[idx + 2] = parseInt(color.slice(5, 7), 16);
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    canvas.style.imageRendering = 'pixelated';
    canvas.style.width = '300px';
    canvas.style.height = '300px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    mapWrapper.appendChild(canvas);
    container.appendChild(mapWrapper);
  }

  const turn = document.createElement('div');
  turn.id = 'turn';

  const next = document.createElement('button');
  next.textContent = 'Next Turn';
  next.addEventListener('click', processTurn);

  // Direct scavenge controls on the main UI
  const scavengeRow = document.createElement('div');
  const scavengeLabel = document.createElement('span');
  scavengeLabel.textContent = 'Scavenge';
  const scavengeDown = document.createElement('button');
  scavengeDown.textContent = '↓';
  scavengeDown.addEventListener('click', () => {
    const jobs = getJobs();
    setJob('scavenge', (jobs.scavenge || 0) - 1);
    render();
  });
  scavengeDisplay = document.createElement('span');
  scavengeDisplay.id = 'scavenge-count';
  scavengeDisplay.textContent = '0';
  const scavengeUp = document.createElement('button');
  scavengeUp.textContent = '↑';
  scavengeUp.addEventListener('click', () => {
    const jobs = getJobs();
    setJob('scavenge', (jobs.scavenge || 0) + 1);
    render();
  });
  scavengeRow.appendChild(scavengeLabel);
  scavengeRow.appendChild(scavengeDown);
  scavengeRow.appendChild(scavengeDisplay);
  scavengeRow.appendChild(scavengeUp);

  const inv = document.createElement('div');
  inv.id = 'inventory';

  container.appendChild(turn);
  container.appendChild(next);
  container.appendChild(scavengeRow);
  container.appendChild(inv);

  container.style.display = 'block';
  render();
}

export function updateGameUI() {
  render();
}

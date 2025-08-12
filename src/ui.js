// Temporary UI module to set up initial game parameters.
// Provides a basic form to select biome, starting season, and difficulty.
// This module is standalone so the UI can be redesigned or replaced
// without affecting the rest of the game logic.

import { biomes, getBiome } from './biomes.js';
import { difficulties, difficultySettings } from './difficulty.js';
import { generateColorMap, FEATURE_COLORS, getBiomeBorderColor } from './map.js';

const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

/**
 * Create a temporary setup form and call the provided callback when submitted.
 * @param {Function} onStart - callback receiving { biome, season, difficulty }
 */
export function initSetupUI(onStart) {
  const container = document.getElementById('setup') || document.body;

  const form = document.createElement('form');
  form.id = 'setup-form';

  const makeSelect = (labelText, options, name) => {
    const label = document.createElement('label');
    label.textContent = labelText + ': ';

    const select = document.createElement('select');
    select.name = name;
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.id || opt;
      option.textContent = opt.name || opt;
      select.appendChild(option);
    });

    label.appendChild(select);
    return { label, select };
  };

  const biomeSelect = makeSelect('Biome', biomes, 'biome');
  const seasonSelect = makeSelect('Season', seasons, 'season');
  const diffSelect = makeSelect('Difficulty', difficulties, 'difficulty');

  [biomeSelect, seasonSelect, diffSelect].forEach(({ label }) => {
    form.appendChild(label);
    form.appendChild(document.createElement('br'));
  });

    const biomeInfo = document.createElement('p');
    const diffInfo = document.createElement('p');
    form.appendChild(biomeInfo);
    form.appendChild(diffInfo);

    // Map preview section
    const MAP_DISPLAY_SIZE = 600;
    const DEFAULT_MAP_SCALE = 100;
    let mapScale = DEFAULT_MAP_SCALE;
    let mapCanvas = null;
    let mapOffsetX = 0;
    let mapOffsetY = 0;
    let scaleDisplay = null;
    let mapData = null;

    const mapWrapper = document.createElement('div');
    mapWrapper.style.display = 'flex';
    mapWrapper.style.justifyContent = 'center';
    mapWrapper.style.alignItems = 'flex-start';
    mapWrapper.style.marginTop = '10px';

    const viewport = document.createElement('div');
    viewport.style.width = `${MAP_DISPLAY_SIZE}px`;
    viewport.style.height = `${MAP_DISPLAY_SIZE}px`;
    viewport.style.overflow = 'hidden';
    viewport.style.position = 'relative';
    viewport.style.border = `4px solid ${getBiomeBorderColor(biomeSelect.select.value)}`;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    mapCanvas = canvas;
    viewport.appendChild(canvas);
    mapWrapper.appendChild(viewport);

    const legend = document.createElement('div');
    legend.style.marginLeft = '20px';
    const title = document.createElement('h3');
    title.textContent = getBiome(biomeSelect.select.value)?.name || biomeSelect.select.value;
    legend.appendChild(title);
    const list = document.createElement('ul');
    const labels = {
      water: 'Bodies of Water',
      open: 'Open Land',
      forest: 'Forest',
      ore: 'Ore Deposits'
    };
    Object.entries(FEATURE_COLORS).forEach(([key, color]) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.style.display = 'inline-block';
      swatch.style.width = '12px';
      swatch.style.height = '12px';
      swatch.style.backgroundColor = color;
      swatch.style.marginRight = '6px';
      li.appendChild(swatch);
      li.appendChild(document.createTextNode(labels[key] || key));
      list.appendChild(li);
    });
    legend.appendChild(list);
    mapWrapper.appendChild(legend);
    form.appendChild(mapWrapper);

    // Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.style.textAlign = 'center';
    zoomControls.style.marginTop = '5px';
    zoomControls.style.display = 'flex';
    zoomControls.style.justifyContent = 'center';
    zoomControls.style.alignItems = 'center';

    const BTN_SIZE = '30px';

    const centerBtn = document.createElement('button');
    centerBtn.type = 'button';
    centerBtn.textContent = '🏠';
    centerBtn.style.width = BTN_SIZE;
    centerBtn.style.height = BTN_SIZE;
    centerBtn.style.padding = '0';
    centerBtn.style.lineHeight = BTN_SIZE;
    centerBtn.style.boxSizing = 'border-box';

    const zoomOut = document.createElement('button');
    zoomOut.type = 'button';
    zoomOut.textContent = '-';
    zoomOut.style.width = BTN_SIZE;
    zoomOut.style.height = BTN_SIZE;
    zoomOut.style.padding = '0';
    zoomOut.style.lineHeight = BTN_SIZE;
    zoomOut.style.boxSizing = 'border-box';

    scaleDisplay = document.createElement('button');
    scaleDisplay.type = 'button';
    scaleDisplay.style.margin = '0 5px';
    scaleDisplay.style.height = BTN_SIZE;
    scaleDisplay.style.lineHeight = BTN_SIZE;
    scaleDisplay.style.padding = '0 5px';
    scaleDisplay.style.boxSizing = 'border-box';

    const zoomIn = document.createElement('button');
    zoomIn.type = 'button';
    zoomIn.textContent = '+';
    zoomIn.style.width = BTN_SIZE;
    zoomIn.style.height = BTN_SIZE;
    zoomIn.style.padding = '0';
    zoomIn.style.lineHeight = BTN_SIZE;
    zoomIn.style.boxSizing = 'border-box';

    const regenBtn = document.createElement('button');
    regenBtn.type = 'button';
    regenBtn.textContent = 'Regenerate';

    zoomControls.appendChild(regenBtn);
    zoomControls.appendChild(centerBtn);
    zoomControls.appendChild(zoomOut);
    zoomControls.appendChild(scaleDisplay);
    zoomControls.appendChild(zoomIn);
    form.appendChild(zoomControls);

    const startBtn = document.createElement('button');
    startBtn.type = 'submit';
    startBtn.textContent = 'Start';
    form.appendChild(startBtn);

    // Map interaction helpers
    const renderMap = () => {
      if (!mapCanvas || !mapData) return;
      const pixels = mapData.pixels;
      mapCanvas.width = pixels[0].length;
      mapCanvas.height = pixels.length;
      mapCanvas.style.width = `${mapCanvas.width}px`;
      mapCanvas.style.height = `${mapCanvas.height}px`;
      const ctx = mapCanvas.getContext('2d');
      const imgData = ctx.createImageData(mapCanvas.width, mapCanvas.height);
      for (let y = 0; y < mapCanvas.height; y++) {
        for (let x = 0; x < mapCanvas.width; x++) {
          const color = pixels[y][x];
          const idx = (y * mapCanvas.width + x) * 4;
          imgData.data[idx] = parseInt(color.slice(1, 3), 16);
          imgData.data[idx + 1] = parseInt(color.slice(3, 5), 16);
          imgData.data[idx + 2] = parseInt(color.slice(5, 7), 16);
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    const centerMap = () => {
      if (!mapData) return;
      const zoomFactor = DEFAULT_MAP_SCALE / mapScale;
      const centerX = MAP_DISPLAY_SIZE / 2;
      const centerY = MAP_DISPLAY_SIZE / 2;
      const startPixelX = -mapData.xStart;
      const startPixelY = -mapData.yStart;
      mapOffsetX = centerX - startPixelX * zoomFactor;
      mapOffsetY = centerY - startPixelY * zoomFactor;
    };

    const updateMapDisplay = () => {
      if (mapCanvas) {
        const zoomFactor = DEFAULT_MAP_SCALE / mapScale;
        mapCanvas.style.transform = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${zoomFactor})`;
        mapCanvas.style.transformOrigin = '0 0';
      }
      if (scaleDisplay) scaleDisplay.textContent = `${mapScale}m`;
    };

    const zoomMap = delta => {
      mapScale = Math.max(10, mapScale + delta);
      updateMapDisplay();
    };

    const generatePreview = () => {
      const biomeId = biomeSelect.select.value;
      mapData = generateColorMap(
        biomeId,
        Date.now(),
        -MAP_DISPLAY_SIZE / 2,
        -MAP_DISPLAY_SIZE / 2,
        MAP_DISPLAY_SIZE,
        MAP_DISPLAY_SIZE
      );
      renderMap();
      centerMap();
      updateMapDisplay();
      viewport.style.border = `4px solid ${getBiomeBorderColor(biomeId)}`;
      title.textContent = getBiome(biomeId)?.name || biomeId;
    };

    centerBtn.addEventListener('click', () => {
      centerMap();
      updateMapDisplay();
    });
    zoomOut.addEventListener('click', () => zoomMap(10));
    zoomIn.addEventListener('click', () => zoomMap(-10));
    scaleDisplay.addEventListener('click', () => {
      mapScale = DEFAULT_MAP_SCALE;
      updateMapDisplay();
    });
    regenBtn.addEventListener('click', generatePreview);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const startDrag = (x, y) => { dragging = true; lastX = x; lastY = y; };
    const moveDrag = (x, y) => {
      if (!dragging) return;
      mapOffsetX += x - lastX;
      mapOffsetY += y - lastY;
      lastX = x;
      lastY = y;
      updateMapDisplay();
    };
    const endDrag = () => { dragging = false; };
    canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); e.preventDefault(); });
    document.addEventListener('touchmove', e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); e.preventDefault(); });
    document.addEventListener('touchend', endDrag);

  const formatDays = d => (d >= 7 ? `${d / 7} week${d >= 14 ? 's' : ''}` : `${d} day${d !== 1 ? 's' : ''}`);

  const updateBiomeInfo = () => {
    const b = biomes.find(x => x.id === biomeSelect.select.value);
    if (!b) {
      biomeInfo.textContent = '';
      return;
    }
    biomeInfo.innerHTML = `<strong>${b.name}</strong>: ${b.description}<br>Open land: ${b.openLand}<br>Food resources: ${b.food}`;
  };

  const updateDiffInfo = () => {
    const id = diffSelect.select.value;
    const cfg = difficultySettings[id];
    const name = diffSelect.select.options[diffSelect.select.selectedIndex].textContent;
    const tools = Object.entries(cfg.tools)
      .map(([t, q]) => `${q} ${t}`)
      .join(', ') || 'None';
    diffInfo.innerHTML = `<strong>Difficulty:</strong> ${name}<br>Starting people: ${cfg.people}<br>Food: ${formatDays(cfg.foodDays)} stock<br>Firewood: ${formatDays(cfg.firewoodDays)} stock<br>Tools: ${tools}`;
  };

    biomeSelect.select.addEventListener('change', () => {
      updateBiomeInfo();
      generatePreview();
    });
  diffSelect.select.addEventListener('change', updateDiffInfo);
    updateBiomeInfo();
    updateDiffInfo();
    generatePreview();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const settings = {
      biome: biomeSelect.select.value,
      season: seasonSelect.select.value,
      difficulty: diffSelect.select.value
    };
    form.remove();
    if (typeof onStart === 'function') onStart(settings);
  });

  container.appendChild(form);
}


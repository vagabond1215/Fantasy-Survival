// @ts-check
import { biomes, getBiome } from './src/biomes.js';
import { getPointsOfInterest } from './src/pointsOfInterest.js';
import { getBiomeWildlife } from './src/biomeWildlife.js';

// DOM Elements
const selectorEl = /** @type {HTMLSelectElement | null} */ (
  document.getElementById('biomeSelector')
);
const outputEl = /** @type {HTMLDivElement | null} */ (
  document.getElementById('biomeDisplay')
);
const descriptionEl = /** @type {HTMLParagraphElement | null} */ (
  document.getElementById('biomeDescription')
);
const imageEl = /** @type {HTMLImageElement | null} */ (
  document.getElementById('biomeImage')
);

if (!selectorEl || !outputEl || !descriptionEl || !imageEl) {
  throw new Error('Biome explorer markup is missing expected elements.');
}

const selector = selectorEl;
const output = outputEl;
const description = descriptionEl;
const image = imageEl;

// Populate Selector with complete biome list
biomes.forEach(b => {
  const option = document.createElement('option');
  option.value = b.id;
  option.textContent = b.name;
  selector.appendChild(option);
});

// Display Biome Info
function formatTools(tools = []) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return 'None';
  }
  return tools.join(', ');
}

function buildAnimalTable(animals = []) {
  if (!animals.length) {
    return '<p>No notable huntable animals recorded.</p>';
  }
  const rows = animals
    .map(
      animal => `
        <tr>
          <td>${animal.name}</td>
          <td>${animal.difficulty}</td>
          <td>${animal.aggressive ? 'Yes' : 'No'}</td>
          <td>${animal.diet}</td>
          <td>${formatTools(animal.tools)}</td>
          <td>${animal.notes || ''}</td>
        </tr>
      `
    )
    .join('');
  return `
    <table class="biome-table">
      <thead>
        <tr>
          <th>Animal</th>
          <th>Difficulty</th>
          <th>Aggressive</th>
          <th>Diet</th>
          <th>Recommended Tools</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildPlantTable(plants = []) {
  if (!plants.length) {
    return '<p>No gatherable flora recorded.</p>';
  }
  const rows = plants
    .map(
      plant => `
        <tr>
          <td>${plant.name}</td>
          <td>${plant.edibleParts || 'None'}</td>
          <td>${plant.poisonousParts || 'None'}</td>
          <td>${plant.usefulParts || 'None'}</td>
        </tr>
      `
    )
    .join('');
  return `
    <table class="biome-table">
      <thead>
        <tr>
          <th>Plant / Fungus</th>
          <th>Edible Parts</th>
          <th>Poisonous or Caution</th>
          <th>Useful Parts & Applications</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

selector.addEventListener('change', () => {
  const biome = getBiome(selector.value);
  if (!biome) {
    output.textContent = '';
    description.textContent = '';
    image.src = '';
    return;
  }
  const pois = getPointsOfInterest(selector.value);
  const wildlife = getBiomeWildlife(selector.value);
  output.innerHTML = `
    <h2>${biome.name}</h2>
    <p><strong>Features:</strong> ${biome.features.join(', ')}</p>
    <p><strong>Points of Interest:</strong> ${pois.join(', ')}</p>
    <p><strong>Wood Modifier:</strong> ${biome.woodMod}</p>
    <section>
      <h3>Huntable Wildlife</h3>
      ${buildAnimalTable(wildlife.animals)}
    </section>
    <section>
      <h3>Harvestable Flora</h3>
      ${buildPlantTable(wildlife.plants)}
    </section>
  `;
  description.textContent = biome.description;
  image.src = `images/${biome.id}.jpg`;
  image.alt = biome.name;
});

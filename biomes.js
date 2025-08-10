import { biomes, getBiome } from './src/biomes.js';
import { getPointsOfInterest } from './src/pointsOfInterest.js';

// DOM Elements
const selector = document.getElementById('biomeSelector');
const output = document.getElementById('biomeDisplay');
const description = document.getElementById('biomeDescription');
const image = document.getElementById('biomeImage');

// Populate Selector with complete biome list
biomes.forEach(b => {
  const option = document.createElement('option');
  option.value = b.id;
  option.textContent = b.name;
  selector.appendChild(option);
});

// Display Biome Info
selector.addEventListener('change', () => {
  const biome = getBiome(selector.value);
  if (!biome) {
    output.textContent = '';
    description.textContent = '';
    image.src = '';
    return;
  }
  const pois = getPointsOfInterest(selector.value);
  output.innerHTML = `
    <h2>${biome.name}</h2>
    <p><strong>Features:</strong> ${biome.features.join(', ')}</p>
    <p><strong>Points of Interest:</strong> ${pois.join(', ')}</p>
    <p><strong>Wood Modifier:</strong> ${biome.woodMod}</p>
  `;
  description.textContent = biome.description;
  image.src = `images/${biome.id}.jpg`;
  image.alt = biome.name;
});

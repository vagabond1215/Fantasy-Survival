import { biomes, getBiome } from './src/biomes.js';

// DOM Elements
const selector = document.getElementById('biomeSelector');
const output = document.getElementById('biomeDisplay');

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
    return;
  }
  output.innerHTML = `
    <h2>${biome.name}</h2>
    <p><strong>Features:</strong> ${biome.features.join(', ')}</p>
    <p><strong>Wood Modifier:</strong> ${biome.woodMod}</p>
  `;
});

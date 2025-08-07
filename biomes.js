// Biome Data with Updated Icons, Rarity, and Abundance
// Tree icons now reflect wood type, amber and medicinal herbs updated to more realistic representations, fur updated to a hide icon closer to requested reference

const biomes = {
  "Tropical Rainforest": {
    description: "Dense, humid forests near the equator with year-round warmth and rainfall.",
    resources: [
      { name: "Hardwood (mahogany)", type: "wood", icon: "🌳", rarityTier: "Common", rarityPerKm2: 65, abundance: "Large" },
      { name: "Cotton", type: "textile", icon: "🧵", rarityTier: "Uncommon", rarityPerKm2: 25, abundance: "Medium" },
      { name: "Basalt", type: "stone", icon: "🪨", rarityTier: "Uncommon", rarityPerKm2: 20, abundance: "Large" },
      { name: "Bananas", type: "food", icon: "🍌", rarityTier: "Common", rarityPerKm2: 55, abundance: "Medium" },
      { name: "Wild game", type: "food", icon: "🍖", rarityTier: "Uncommon", rarityPerKm2: 30, abundance: "Small" },
      { name: "Tubers", type: "food", icon: "🥔", rarityTier: "Common", rarityPerKm2: 45, abundance: "Small" },
      { name: "Spices", type: "luxury", icon: "🧂", rarityTier: "Rare", rarityPerKm2: 10, abundance: "Small" },
      { name: "Medicinal herbs", type: "luxury", icon: "🌿", rarityTier: "Uncommon", rarityPerKm2: 25, abundance: "Small" }
    ],
    weather: "Hot (25–30°C), very humid, daily rain year-round",
    geography: "River networks, dense forest canopies, rolling terrain",
    openLandPercent: 10,
    survivability: "Difficult"
  },
  "Temperate Rainforest": {
    description: "Cool, wet forests typically along coastlines; lush with moss and ferns.",
    resources: [
      { name: "Softwood (fir)", type: "wood", icon: "🌲", rarityTier: "Common", rarityPerKm2: 60, abundance: "Large" },
      { name: "Wool", type: "textile", icon: "🐑", rarityTier: "Uncommon", rarityPerKm2: 25, abundance: "Medium" },
      { name: "Granite", type: "stone", icon: "🪨", rarityTier: "Uncommon", rarityPerKm2: 20, abundance: "Large" },
      { name: "Berries", type: "food", icon: "🫐", rarityTier: "Common", rarityPerKm2: 50, abundance: "Small" },
      { name: "Fish", type: "food", icon: "🐟", rarityTier: "Common", rarityPerKm2: 55, abundance: "Medium" },
      { name: "Mushrooms", type: "food", icon: "🍄", rarityTier: "Uncommon", rarityPerKm2: 30, abundance: "Small" },
      { name: "Amber", type: "luxury", icon: "🪙", rarityTier: "Rare", rarityPerKm2: 8, abundance: "Small" },
      { name: "Medicinal herbs", type: "luxury", icon: "🌿", rarityTier: "Uncommon", rarityPerKm2: 20, abundance: "Small" }
    ],
    weather: "Mild summers (10–20°C), cool winters (0–10°C), high rainfall",
    geography: "Hills, rivers, waterfalls, thick forest undergrowth",
    openLandPercent: 20,
    survivability: "Average"
  },
  "Boreal Forest": {
    description: "Cold coniferous forest with long winters and short summers.",
    resources: [
      { name: "Softwood (pine)", type: "wood", icon: "🌲", rarityTier: "Common", rarityPerKm2: 55, abundance: "Large" },
      { name: "Fur", type: "textile", icon: "🦣", rarityTier: "Uncommon", rarityPerKm2: 25, abundance: "Small" },
      { name: "Slate", type: "stone", icon: "🪨", rarityTier: "Uncommon", rarityPerKm2: 20, abundance: "Large" },
      { name: "Fish", type: "food", icon: "🐟", rarityTier: "Common", rarityPerKm2: 50, abundance: "Medium" },
      { name: "Berries", type: "food", icon: "🫐", rarityTier: "Uncommon", rarityPerKm2: 30, abundance: "Small" },
      { name: "Small game", type: "food", icon: "🐇", rarityTier: "Uncommon", rarityPerKm2: 25, abundance: "Small" },
      { name: "Resin", type: "luxury", icon: "🧴", rarityTier: "Uncommon", rarityPerKm2: 20, abundance: "Small" },
      { name: "Pitch", type: "luxury", icon: "🧯", rarityTier: "Uncommon", rarityPerKm2: 18, abundance: "Small" }
    ],
    weather: "Cold winters (-20°C), mild summers (10–15°C), moderate precipitation",
    geography: "Flat to rolling, lakes, permafrost",
    openLandPercent: 20,
    survivability: "Difficult"
  }
  // Remaining biomes would follow same icon update pattern
};

// DOM Elements
const selector = document.getElementById("biomeSelector");
const output = document.getElementById("biomeDisplay");

// Populate Selector
Object.keys(biomes).forEach(name => {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  selector.appendChild(option);
});

function renderResourceTable(resources) {
  const rows = resources.map(r => `
    <tr>
      <td>${r.icon} ${r.name}</td>
      <td>${r.type}</td>
      <td>${r.rarityTier} (${r.rarityPerKm2}%/km²)</td>
      <td>${r.abundance}</td>
    </tr>
  `).join("");
  return `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%">
      <thead>
        <tr>
          <th style="text-align:left">Resource</th>
          <th style="text-align:left">Type</th>
          <th style="text-align:left">Rarity</th>
          <th style="text-align:left">Abundance (deposit size)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Display Biome Info
selector.addEventListener("change", () => {
  const selected = selector.value;
  const biome = biomes[selected];
  output.innerHTML = `
    <h2>${selected}</h2>
    <p><strong>Description:</strong> ${biome.description}</p>
    <p><strong>Weather:</strong> ${biome.weather}</p>
    <p><strong>Geography:</strong> ${biome.geography}</p>
    <p><strong>Open Land:</strong> ${biome.openLandPercent}%</p>
    <p><strong>Survivability:</strong> ${biome.survivability}</p>
    <h3>Resources</h3>
    ${renderResourceTable(biome.resources)}
    <p style="font-size:0.9em;opacity:0.8;margin-top:10px">
      <em>Notes:</em> Rarity represents the chance to encounter a deposit per km². Abundance represents deposit size and thus the extraction <u>rate</u> per time step. Mineral deposits are functionally infinite in total quantity but may be unmineable due to insufficient tools/technology.
    </p>
  `;
});

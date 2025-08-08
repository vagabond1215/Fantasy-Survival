// Firewood requirements data and lookup helper.
// Data: biome|season|avgTempC|shelter|occupancy|heatingEfficiency|windPenalty|wetPenalty|survivalKgPerDay|comfortKgPerDay
const rawData = `
Alpine|Winter|-10|Cabin (Rough wood, drafty)|4|0.3|0.35|0.1|48.6|97.3
Alpine|Winter|-10|Dwelling (Teepee / Thin walls)|4|0.2|0.35|0.1|58.9|110.4
Alpine|Winter|-10|Large House (3 floors)|8|0.6|0.35|0.1|44.6|100.4
Alpine|Winter|-10|Lodge (Log, sealed)|4|0.45|0.35|0.1|27.8|58.5
Alpine|Winter|-10|Medium House (2 floors)|6|0.55|0.35|0.1|34|74.2
Alpine|Winter|-10|Open Fire|2|0.12|0.35|0.1|59.5|91.7
Alpine|Winter|-10|Shelter (Lean-to / Partial)|2|0.15|0.35|0.1|41|63.6
Alpine|Winter|-10|Small House (1 floor)|4|0.55|0.35|0.1|20.8|45.8
Alpine|Spring|0|Cabin (Rough wood, drafty)|4|0.3|0.2|0.05|9.8|55.2
Alpine|Spring|0|Dwelling (Teepee / Thin walls)|4|0.2|0.2|0.05|9.8|56.5
Alpine|Spring|0|Large House (3 floors)|8|0.6|0.2|0.05|9.5|64.1
Alpine|Spring|0|Lodge (Log, sealed)|4|0.45|0.2|0.05|5.5|35
Alpine|Spring|0|Medium House (2 floors)|6|0.55|0.2|0.05|6.8|45.9
Alpine|Spring|0|Open Fire|2|0.12|0.2|0.05|10.3|38.1
Alpine|Spring|0|Shelter (Lean-to / Partial)|2|0.15|0.2|0.05|6.7|26.7
Alpine|Spring|0|Small House (1 floor)|4|0.55|0.2|0.05|3.9|28.2
Alpine|Summer|10|Cabin (Rough wood, drafty)|4|0.3|0.15|0.05|0|19.8
Alpine|Summer|10|Dwelling (Teepee / Thin walls)|4|0.2|0.15|0.05|0|13.4
Alpine|Summer|10|Large House (3 floors)|8|0.6|0.15|0.05|0|29.8
Alpine|Summer|10|Lodge (Log, sealed)|4|0.45|0.15|0.05|0|13.7
Alpine|Summer|10|Medium House (2 floors)|6|0.55|0.15|0.05|0|19.6
Alpine|Summer|10|Open Fire|2|0.12|0.15|0.05|0|0
Alpine|Summer|10|Shelter (Lean-to / Partial)|2|0.15|0.15|0.05|0|0
Alpine|Summer|10|Small House (1 floor)|4|0.55|0.15|0.05|0|11.9
Alpine|Fall|0|Cabin (Rough wood, drafty)|4|0.3|0.25|0.05|10.2|56.4
Alpine|Fall|0|Dwelling (Teepee / Thin walls)|4|0.2|0.25|0.05|10.3|58.2
Alpine|Fall|0|Large House (3 floors)|8|0.6|0.25|0.05|9.5|64.5
Alpine|Fall|0|Lodge (Log, sealed)|4|0.45|0.25|0.05|5.6|35.4
Alpine|Fall|0|Medium House (2 floors)|6|0.55|0.25|0.05|6.9|46.2
Alpine|Fall|0|Open Fire|2|0.12|0.25|0.05|11.1|40
Alpine|Fall|0|Shelter (Lean-to / Partial)|2|0.15|0.25|0.05|7.1|27.8
Alpine|Fall|0|Small House (1 floor)|4|0.55|0.25|0.05|4|28.4
`;

const entries = rawData.trim().split('\n').map(line => {
  const [biome, season, avgTempC, shelter, occupancy, heatingEfficiency, windPenalty, wetPenalty, survival, comfort] = line.split('|');
  return {
    biome,
    season,
    avgTempC: Number(avgTempC),
    shelter,
    occupancy: Number(occupancy),
    heatingEfficiency: Number(heatingEfficiency),
    windPenalty: Number(windPenalty),
    wetPenalty: Number(wetPenalty),
    survivalKgPerDay: Number(survival),
    comfortKgPerDay: Number(comfort)
  };
});

const firewoodMap = new Map();
for (const e of entries) {
  firewoodMap.set(`${e.biome}|${e.season}|${e.shelter}`, e);
}

export function getFirewoodRequirements(biome, season, shelter) {
  return firewoodMap.get(`${biome}|${season}|${shelter}`);
}

export { entries as firewoodData };

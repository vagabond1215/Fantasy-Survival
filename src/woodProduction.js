// Wood production data for Lumberjack / Wood Gatherer job.
// Data format:
// Biome|Tool Level|Crew Size|Firewood_kg|Poles_kg|Logs_kg|Common Examples|Avg Mature Height|Avg Mature Above-Ground Weight|Tree Density (per ha)|Regrowth Time (Full Maturity)|Avg Harvest Age|Avg Yield per Tree (m3)|Rarity|Abundance|Notes
const rawData = `
Alpine|No Tools|1|6|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|2|12|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|3|17|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|No Tools|4|21|0|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|1|8|10|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|2|16|20|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|3|22|28|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Basic Tools|4|28|35|0|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|1|8|15|25|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|2|16|30|60|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|3|22|42|100|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Alpine|Advanced Tools|4|28|52|150|Dwarf pine, krummholz spruce|2-10 m|0.1-1 t|100-200|40-60 yrs|25-40 yrs|0.3-1|Rare|Small|Twisted, slow-growing.
Boreal (Taiga)|No Tools|1|10|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|2|20|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|3|28|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|No Tools|4|35|0|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|1|15|20|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|2|30|40|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|3|42|56|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Basic Tools|4|52|70|0|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|1|15|30|60|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|2|30|60|144|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|3|42|84|240|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Boreal (Taiga)|Advanced Tools|4|52|105|360|Black spruce, Scots pine, fir, larch|10-20 m|1-3 t|200-300|50-80 yrs|35-50 yrs|1-3|Common|Medium|Short growing season limits yield.
Coastal (Temperate)|No Tools|1|10|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|2|20|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|3|28|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|No Tools|4|35|0|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|1|15|20|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|2|30|40|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|3|42|56|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Basic Tools|4|52|70|0|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|1|15|30|55|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|2|30|60|132|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|3|42|84|220|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Temperate)|Advanced Tools|4|52|105|330|Sitka spruce, shore pine, alder, willow|10-25 m|1-5 t|200-350|25-50 yrs|15-25 yrs|1-4|Common|Medium|Driftwood common; trees wind-shaped.
Coastal (Tropical)|No Tools|1|12|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|2|24|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|3|34|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|No Tools|4|42|0|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|1|15|18|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|2|30|36|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|3|42|50|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Basic Tools|4|52|63|0|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|1|15|25|45|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|2|30|50|108|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|3|42|70|180|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Coastal (Tropical)|Advanced Tools|4|52|88|270|Mangrove, sea almond, casuarina, coconut palm|5-20 m|0.5-3 t|200-500|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Salt-tolerant; driftwood & bamboo supplement.
Flooded Grasslands / Swamp|No Tools|1|8|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|2|16|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|3|22|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|No Tools|4|28|0|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|1|10|15|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|2|20|30|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|3|28|42|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Basic Tools|4|35|52|0|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|1|10|25|50|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|2|20|50|120|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|3|28|70|200|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Flooded Grasslands / Swamp|Advanced Tools|4|35|88|300|Bald cypress, tupelo, swamp mahogany|15-30 m|3-6 t|200-300|30-50 yrs|20-30 yrs|2-4|Uncommon|Medium|Dense, water-resistant hardwoods.
Island (Temperate)|No Tools|1|8|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|2|16|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|3|22|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|No Tools|4|28|0|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|1|10|15|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|2|20|30|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|3|28|42|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Basic Tools|4|35|52|0|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|1|10|25|45|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|2|20|50|108|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|3|28|70|180|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Temperate)|Advanced Tools|4|35|88|270|Monterey pine, Norfolk Island pine, pohutukawa|8-20 m|1-4 t|100-250|20-40 yrs|12-20 yrs|1-3|Uncommon|Small|Coastal wind limits height.
Island (Tropical)|No Tools|1|8|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|2|16|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|3|22|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|No Tools|4|28|0|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|1|10|12|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|2|20|24|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|3|28|34|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Basic Tools|4|35|42|0|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|1|10|20|35|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|2|20|40|84|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|3|28|56|140|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Island (Tropical)|Advanced Tools|4|35|70|210|Coconut palm, breadfruit, pandanus, ironwood|10-25 m|0.5-3 t|100-300|10-30 yrs|7-15 yrs|0.5-2|Common|Small|Palm wood light; ironwood heavy & slow.
Mangrove|No Tools|1|12|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|2|24|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|3|34|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|No Tools|4|42|0|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|1|15|20|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|2|30|40|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|3|42|56|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Basic Tools|4|52|70|0|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|1|15|30|50|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|2|30|60|120|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|3|42|84|200|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mangrove|Advanced Tools|4|52|105|300|Red mangrove, black mangrove, white mangrove|5-15 m|0.5-2 t|500-1,000|15-25 yrs|8-15 yrs|0.5-1.5|Common|Medium|Salt-tolerant; dense, rot-resistant.
Mediterranean Woodland|No Tools|1|8|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|2|16|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|3|22|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|No Tools|4|28|0|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|1|12|15|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|2|24|30|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|3|34|42|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Basic Tools|4|42|52|0|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|1|12|25|40|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|2|24|50|96|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|3|34|70|160|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Mediterranean Woodland|Advanced Tools|4|42|88|240|Olive, cork oak, carob|5-15 m|0.5-2 t|150-250|20-40 yrs|15-25 yrs|0.5-2|Uncommon|Small|Smaller trees; mixed wood/shrub harvesting.
Montane / Cloud|No Tools|1|10|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|2|20|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|3|28|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|No Tools|4|35|0|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|1|12|15|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|2|24|30|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|3|34|42|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Basic Tools|4|42|52|0|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|1|12|25|50|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|2|24|50|120|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|3|34|70|200|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Montane / Cloud|Advanced Tools|4|42|88|300|Podocarpus, tree ferns, high-altitude oaks|10-25 m|1-4 t|200-300|30-50 yrs|20-35 yrs|1-3|Uncommon|Medium|Slow growth due to cooler temps.
Savanna|No Tools|1|8|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|2|16|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|3|22|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|No Tools|4|28|0|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|1|10|15|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|2|20|30|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|3|28|42|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Basic Tools|4|35|52|0|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|1|10|25|40|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|2|20|50|96|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|3|28|70|160|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Savanna|Advanced Tools|4|35|88|240|Acacia, baobab, shea tree|8-20 m|1-4 t|50-150|15-30 yrs|10-20 yrs|1-3|Uncommon|Small|Sparse canopy; dense wood.
Temperate Deciduous|No Tools|1|12|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|2|24|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|3|34|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|No Tools|4|42|0|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|1|20|25|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|2|40|50|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|3|56|70|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Basic Tools|4|70|88|0|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|1|20|40|70|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|2|40|80|168|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|3|56|112|280|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Deciduous|Advanced Tools|4|70|140|420|Oak, maple, beech, hickory, chestnut|20-30 m|3-5 t (old growth 6-12 t)|250-400|40-70 yrs|30-40 yrs|2-5|Common|Medium|Hardwoods slower to harvest but high-value timber.
Temperate Rainforest|No Tools|1|10|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|2|20|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|3|28|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|No Tools|4|35|0|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|1|15|20|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|2|30|40|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|3|42|56|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Basic Tools|4|52|70|0|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|1|15|30|80|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|2|30|60|192|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|3|42|84|320|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Temperate Rainforest|Advanced Tools|4|52|105|480|Sitka spruce, western red cedar, Douglas fir, coastal redwood|30-60 m (giants 80-100+ m)|8-12 t (giants 30-100+ t)|300-500|40-80 yrs|25-40 yrs|4-8|Uncommon|Large|Very high yield for large conifers.
Tropical Monsoon|No Tools|1|12|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|2|24|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|3|34|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|No Tools|4|42|0|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|1|15|20|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|2|30|40|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|3|42|56|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Basic Tools|4|52|70|0|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|1|15|30|60|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|2|30|60|144|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|3|42|84|240|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Monsoon|Advanced Tools|4|52|105|360|Teak, rosewood, sal|20-30 m|4-7 t|300-500|25-50 yrs|15-25 yrs|2-5|Uncommon|Medium|Valuable timber species.
Tropical Rainforest|No Tools|1|15|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|2|30|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|3|42|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|No Tools|4|52|0|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|1|20|25|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|2|40|50|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|3|56|70|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Basic Tools|4|70|88|0|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|1|20|40|60|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|2|40|80|144|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|3|56|112|240|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
Tropical Rainforest|Advanced Tools|4|70|140|360|Kapok, mahogany, balsa, Brazil nut|25-45 m (emergents up to 60 m)|5-8 t (emergents 15-30+ t)|400-600|20-40 yrs (balsa 5-7 yrs)|10-20 yrs|2-4|Common|Large|Extremely high biomass; hardwood density varies greatly.
`;

const entries = rawData.trim().split('\n').map(line => {
  const [biome, toolLevel, crewSize, firewoodKg, polesKg, logsKg, commonExamples, avgMatureHeight, avgMatureAboveGroundWeight, treeDensityPerHa, regrowthTime, avgHarvestAge, avgYieldPerTree, rarity, abundance, notes] = line.split('|');
  return {
    biome,
    toolLevel,
    crewSize: Number(crewSize),
    firewoodKg: Number(firewoodKg),
    polesKg: Number(polesKg),
    logsKg: Number(logsKg),
    commonExamples,
    avgMatureHeight,
    avgMatureAboveGroundWeight,
    treeDensityPerHa,
    regrowthTime,
    avgHarvestAge,
    avgYieldPerTree,
    rarity,
    abundance,
    notes
  };
});

const woodProductionMap = new Map();
for (const e of entries) {
  woodProductionMap.set(`${e.biome}|${e.toolLevel}|${e.crewSize}`, e);
}

export function getWoodProduction(biome, toolLevel, crewSize) {
  return woodProductionMap.get(`${biome}|${toolLevel}|${crewSize}`);
}

export { entries as woodProductionData };

